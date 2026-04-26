const { getDb } = require('../db');
const { formatDbDateTime } = require('../utils/date');

async function processExtension(rfq, bid, rankChanges) {
  const pool = await getDb();
  const connection = await pool.getConnection();

  try {
    let triggered = false;
    let reason = '';

    switch (rfq.trigger_type) {
      case 'BID_RECEIVED':
        triggered = true;
        reason = 'BID_RECEIVED';
        break;
      case 'ANY_RANK_CHANGE':
        triggered = rankChanges.anyRankChange;
        reason = 'RANK_CHANGE';
        break;
      case 'L1_CHANGE_ONLY':
        triggered = rankChanges.l1Changed;
        reason = 'L1_CHANGE';
        break;
      default:
        triggered = false;
    }

    if (!triggered) return null;

    const bidTime = new Date(bid.created_at).getTime();
    const currentCloseTime = new Date(rfq.current_close_time).getTime();
    const windowStart = currentCloseTime - Number(rfq.trigger_window) * 60 * 1000;

    if (bidTime < windowStart) return null;

    const extensionMs = Number(rfq.extension_duration) * 60 * 1000;
    const forcedCloseTime = new Date(rfq.forced_close_time).getTime();
    const newCloseTime = formatDbDateTime(new Date(Math.min(currentCloseTime + extensionMs, forcedCloseTime)));
    const oldCloseTime = rfq.current_close_time;

    if (newCloseTime === oldCloseTime) {
      return {
        extended: false,
        reason,
        old_close_time: oldCloseTime,
        new_close_time: newCloseTime,
        capped_by_forced_close: true,
      };
    }

    await connection.query('UPDATE rfqs SET current_close_time = ? WHERE id = ?', [newCloseTime, rfq.id]);
    await connection.query(`
      INSERT INTO events (rfq_id, type, reason, old_close_time, new_close_time, bid_id, timestamp)
      VALUES (?, 'TIME_EXTENDED', ?, ?, ?, ?, ?)
    `, [rfq.id, reason, oldCloseTime, newCloseTime, bid.id, formatDbDateTime(new Date())]);

    return {
      extended: true,
      reason,
      old_close_time: oldCloseTime,
      new_close_time: newCloseTime,
    };
  } finally {
    connection.release();
  }
}

module.exports = { processExtension };
