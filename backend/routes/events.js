const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { updateRfqStatus } = require('../services/statusManager');

router.get('/:id/events', async (req, res) => {
  const pool = await getDb();
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;
    await updateRfqStatus(id);

    const [rfqRows] = await connection.query('SELECT id FROM rfqs WHERE id = ?', [id]);
    if (!rfqRows || rfqRows.length === 0) {
      return res.status(404).json({ error: 'RFQ not found' });
    }

    const [events] = await connection.query(`
      SELECT e.*, b.supplier_name, b.price AS bid_price
      FROM events e
      LEFT JOIN bids b ON e.bid_id = b.id
      WHERE e.rfq_id = ?
      ORDER BY e.timestamp DESC, e.id DESC
    `, [id]);

    res.json({ events });
  } catch (err) {
    console.error('[EVENTS LIST]', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

module.exports = router;
