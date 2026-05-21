const { getDb } = require('../db');
const { formatDbDateTime } = require('../utils/date');

async function updateRfqStatus(rfqId) {
  const pool = await getDb();
  const connection = await pool.getConnection();

  try {
    const now = new Date();
    const [rfqRows] = await connection.query('SELECT * FROM rfqs WHERE id = ?', [rfqId]);
    if (!rfqRows || rfqRows.length === 0) return null;

    const rfq = rfqRows[0];
    let newStatus = rfq.status;

    if (now >= new Date(rfq.forced_close_time)) {
      newStatus = 'FORCE_CLOSED';
    } else if (now > new Date(rfq.current_close_time)) {
      newStatus = 'CLOSED';
    } else {
      newStatus = 'ACTIVE';
    }

    if (newStatus !== rfq.status) {
      await connection.query('UPDATE rfqs SET status = ? WHERE id = ?', [newStatus, rfqId]);
      const eventType = newStatus === 'FORCE_CLOSED' ? 'AUCTION_FORCE_CLOSED' : 'AUCTION_CLOSED';
      await connection.query(`
        INSERT INTO events (rfq_id, type, reason, timestamp)
        VALUES (?, ?, ?, ?)
      `, [rfqId, eventType, `Status changed to ${newStatus}`, formatDbDateTime(now)]);
      rfq.status = newStatus;
    }

    return rfq;
  } finally {
    connection.release();
  }
}

async function updateAllStatuses() {
  const pool = await getDb();
  const connection = await pool.getConnection();

  try {
    const [rfqs] = await connection.query("SELECT id FROM rfqs WHERE status IN ('ACTIVE', 'CLOSED')");
    for (const rfq of rfqs) {
      await updateRfqStatus(rfq.id);
    }
  } finally {
    connection.release();
  }
}

module.exports = { updateRfqStatus, updateAllStatuses };
