const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { updateAllStatuses, updateRfqStatus } = require('../services/statusManager');
const { getRankedBids } = require('../services/rankingEngine');
const { buildRfqAnalytics, simulateBid } = require('../services/auctionAnalytics');

router.get('/dashboard', async (req, res) => {
  const pool = await getDb();
  const connection = await pool.getConnection();

  try {
    await updateAllStatuses();

    const [rfqs] = await connection.query('SELECT * FROM rfqs ORDER BY created_at DESC, id DESC');
    const rfqCards = [];
    const lanes = new Map();
    let totalSavings = 0;
    let activeAuctions = 0;
    let totalBids = 0;
    let atRisk = 0;

    for (const rfq of rfqs) {
      const [bids] = await connection.query(`
        SELECT * FROM bids
        WHERE rfq_id = ?
        ORDER BY price ASC, created_at ASC, id ASC
      `, [rfq.id]);
      const [events] = await connection.query('SELECT * FROM events WHERE rfq_id = ? ORDER BY timestamp DESC', [rfq.id]);
      const analytics = buildRfqAnalytics(rfq, bids, events);
      totalSavings += analytics.savings;
      totalBids += bids.length;
      if (analytics.phase === 'LIVE') activeAuctions += 1;
      if (analytics.risk_level === 'HIGH') atRisk += 1;

      const laneKey = `${rfq.lane_origin || 'Origin'} -> ${rfq.lane_destination || 'Destination'}`;
      const lane = lanes.get(laneKey) || { lane: laneKey, auctions: 0, bids: 0, savings: 0 };
      lane.auctions += 1;
      lane.bids += bids.length;
      lane.savings += analytics.savings;
      lanes.set(laneKey, lane);

      rfqCards.push({
        id: rfq.id,
        name: rfq.name,
        lane_origin: rfq.lane_origin,
        lane_destination: rfq.lane_destination,
        phase: analytics.phase,
        risk_level: analytics.risk_level,
        recommendation: analytics.recommendation,
        lowest_bid: analytics.lowest_bid,
        lowest_bidder: analytics.lowest_bidder,
        savings: analytics.savings,
        savings_rate: analytics.savings_rate,
        supplier_count: analytics.supplier_count,
        extension_count: analytics.extension_count,
        minutes_to_close: analytics.minutes_to_close,
      });
    }

    const [recentEvents] = await connection.query(`
      SELECT e.*, r.name AS rfq_name, b.supplier_name, b.price AS bid_price
      FROM events e
      JOIN rfqs r ON r.id = e.rfq_id
      LEFT JOIN bids b ON b.id = e.bid_id
      ORDER BY e.timestamp DESC, e.id DESC
      LIMIT 12
    `);

    res.json({
      summary: {
        total_auctions: rfqs.length,
        active_auctions: activeAuctions,
        total_bids: totalBids,
        total_savings: totalSavings,
        at_risk: atRisk,
        average_bids_per_rfq: rfqs.length ? Math.round((totalBids / rfqs.length) * 10) / 10 : 0,
      },
      rfqs: rfqCards,
      lanes: [...lanes.values()].sort((a, b) => b.savings - a.savings).slice(0, 6),
      recent_events: recentEvents,
    });
  } catch (err) {
    console.error('[INSIGHTS DASHBOARD]', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

router.post('/rfq/:id/simulate', async (req, res) => {
  const pool = await getDb();
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;
    const price = Number(req.body.price);

    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ error: 'A positive price is required for simulation.' });
    }

    await updateRfqStatus(id);

    const [rfqRows] = await connection.query('SELECT * FROM rfqs WHERE id = ?', [id]);
    if (!rfqRows || rfqRows.length === 0) {
      return res.status(404).json({ error: 'RFQ not found' });
    }

    const bids = await getRankedBids(id);
    const simulation = simulateBid(rfqRows[0], bids, price, req.body);
    res.json({ simulation });
  } catch (err) {
    console.error('[BID SIMULATION]', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

module.exports = router;
