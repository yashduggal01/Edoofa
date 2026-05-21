const { getDb } = require('../db');

async function getRankedBids(rfqId) {
  const pool = await getDb();
  const connection = await pool.getConnection();

  try {
    const [bids] = await connection.query(`
      SELECT * FROM bids
      WHERE rfq_id = ?
      ORDER BY price ASC, created_at ASC, id ASC
    `, [rfqId]);

    return bids.map((bid, index) => ({
      ...bid,
      rank: index + 1,
      rank_label: `L${index + 1}`,
    }));
  } finally {
    connection.release();
  }
}

function detectRankChanges(oldRankedBids, newRankedBids) {
  const result = {
    anyRankChange: false,
    l1Changed: false,
    previousL1: oldRankedBids.length > 0 ? oldRankedBids[0] : null,
    currentL1: newRankedBids.length > 0 ? newRankedBids[0] : null,
  };

  if (result.previousL1 && result.currentL1) {
    result.l1Changed = result.previousL1.id !== result.currentL1.id;
  } else if (!result.previousL1 && result.currentL1) {
    result.l1Changed = true;
  }

  if (oldRankedBids.length !== newRankedBids.length) {
    result.anyRankChange = true;
  } else {
    result.anyRankChange = oldRankedBids.some((bid, index) => bid.id !== newRankedBids[index].id);
  }

  return result;
}

module.exports = { getRankedBids, detectRankChanges };
