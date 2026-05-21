const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { updateRfqStatus, updateAllStatuses } = require('../services/statusManager');
const { getRankedBids } = require('../services/rankingEngine');
const { buildRfqAnalytics } = require('../services/auctionAnalytics');
const { formatDbDateTime, formatDbDate } = require('../utils/date');

router.post('/create', async (req, res) => {
  const pool = await getDb();
  const connection = await pool.getConnection();

  try {
    const {
      name,
      bid_start_time,
      bid_close_time,
      forced_close_time,
      pickup_date,
      trigger_window = 5,
      extension_duration = 3,
      trigger_type = 'BID_RECEIVED',
      lane_origin = '',
      lane_destination = '',
      cargo_type = '',
      estimated_volume = '',
      budget = 0,
    } = req.body;

    if (!name || !bid_start_time || !bid_close_time || !forced_close_time) {
      return res.status(400).json({
        error: 'Missing required fields: name, bid_start_time, bid_close_time, forced_close_time',
      });
    }

    if (new Date(bid_close_time) <= new Date(bid_start_time)) {
      return res.status(400).json({ error: 'bid_close_time must be greater than bid_start_time' });
    }

    if (new Date(forced_close_time) <= new Date(bid_close_time)) {
      return res.status(400).json({
        error: 'forced_close_time must be greater than bid_close_time',
      });
    }

    const validTriggers = ['BID_RECEIVED', 'ANY_RANK_CHANGE', 'L1_CHANGE_ONLY'];
    if (!validTriggers.includes(trigger_type)) {
      return res.status(400).json({
        error: `trigger_type must be one of: ${validTriggers.join(', ')}`,
      });
    }

    const triggerWindow = Number(trigger_window);
    const extensionDuration = Number(extension_duration);
    const targetBudget = Number(budget) || 0;

    if (triggerWindow <= 0 || extensionDuration <= 0) {
      return res.status(400).json({
        error: 'trigger_window and extension_duration must be positive numbers',
      });
    }

    const createdAt = formatDbDateTime(new Date());

    const [result] = await connection.query(`
      INSERT INTO rfqs (
        name, bid_start_time, bid_close_time, forced_close_time,
        current_close_time, pickup_date, trigger_window, extension_duration,
        trigger_type, status, lane_origin, lane_destination, cargo_type,
        estimated_volume, budget
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?)
    `, [
      name.trim(),
      formatDbDateTime(bid_start_time),
      formatDbDateTime(bid_close_time),
      formatDbDateTime(forced_close_time),
      formatDbDateTime(bid_close_time),
      pickup_date ? formatDbDate(pickup_date) : null,
      triggerWindow,
      extensionDuration,
      trigger_type,
      lane_origin.trim(),
      lane_destination.trim(),
      cargo_type.trim(),
      estimated_volume.trim(),
      targetBudget,
    ]);

    await connection.query(`
      INSERT INTO events (rfq_id, type, reason, details, timestamp)
      VALUES (?, 'AUCTION_CREATED', 'RFQ_CREATED', ?, ?)
    `, [
      result.insertId,
      JSON.stringify({
        name: name.trim(),
        lane_origin: lane_origin.trim(),
        lane_destination: lane_destination.trim(),
        cargo_type: cargo_type.trim(),
        estimated_volume: estimated_volume.trim(),
        budget: targetBudget,
        trigger_window: triggerWindow,
        extension_duration: extensionDuration,
        trigger_type,
      }),
      createdAt,
    ]);

    const [rfqRows] = await connection.query('SELECT * FROM rfqs WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, rfq: rfqRows[0] });
  } catch (err) {
    console.error('[RFQ CREATE]', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

router.get('/', async (req, res) => {
  const pool = await getDb();
  const connection = await pool.getConnection();

  try {
    await updateAllStatuses();

    const [rfqs] = await connection.query('SELECT * FROM rfqs ORDER BY created_at DESC, id DESC');
    const enriched = await Promise.all(rfqs.map(async (rfq) => {
      const [bids] = await connection.query(`
        SELECT * FROM bids
        WHERE rfq_id = ?
        ORDER BY price ASC, created_at ASC, id ASC
      `, [rfq.id]);
      const [events] = await connection.query('SELECT * FROM events WHERE rfq_id = ? ORDER BY timestamp DESC', [rfq.id]);
      const analytics = buildRfqAnalytics(rfq, bids, events);

      return {
        ...rfq,
        lowest_bid: analytics.lowest_bid,
        lowest_bidder: analytics.lowest_bidder,
        bid_count: bids.length,
        phase: analytics.phase,
        supplier_count: analytics.supplier_count,
        extension_count: analytics.extension_count,
        savings: analytics.savings,
        savings_rate: analytics.savings_rate,
        risk_level: analytics.risk_level,
        recommendation: analytics.recommendation,
        minutes_to_close: analytics.minutes_to_close,
      };
    }));

    res.json({ rfqs: enriched });
  } catch (err) {
    console.error('[RFQ LIST]', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

router.get('/:id', async (req, res) => {
  const pool = await getDb();
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;
    await updateRfqStatus(id);

    const [rfqRows] = await connection.query('SELECT * FROM rfqs WHERE id = ?', [id]);
    if (!rfqRows || rfqRows.length === 0) {
      return res.status(404).json({ error: 'RFQ not found' });
    }

    const rfq = rfqRows[0];
    const rankedBids = await getRankedBids(id);
    const [events] = await connection.query('SELECT * FROM events WHERE rfq_id = ? ORDER BY timestamp DESC', [id]);
    const analytics = buildRfqAnalytics(rfq, rankedBids, events);

    res.json({
      rfq,
      bids: analytics.bids.map((bid, index) => ({
        ...bid,
        rank: index + 1,
        rank_label: `L${index + 1}`,
      })),
      events,
      analytics: {
        phase: analytics.phase,
        lowest_bid: analytics.lowest_bid,
        lowest_bidder: analytics.lowest_bidder,
        supplier_count: analytics.supplier_count,
        extension_count: analytics.extension_count,
        savings: analytics.savings,
        savings_rate: analytics.savings_rate,
        spread_to_l2: analytics.spread_to_l2,
        minutes_to_close: analytics.minutes_to_close,
        risk_level: analytics.risk_level,
        recommendation: analytics.recommendation,
        next_best_bid: analytics.next_best_bid,
      },
    });
  } catch (err) {
    console.error('[RFQ DETAIL]', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

module.exports = router;
