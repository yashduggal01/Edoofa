const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { updateRfqStatus } = require('../services/statusManager');
const { getRankedBids, detectRankChanges } = require('../services/rankingEngine');
const { processExtension } = require('../services/extensionEngine');
const { formatDbDateTime } = require('../utils/date');

function toMoney(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

router.post('/:id/bid', async (req, res) => {
  const pool = await getDb();
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;
    const {
      supplier_name,
      price,
      freight = 0,
      origin = 0,
      destination = 0,
      transit_time = '',
      validity = '',
      service_score = 75,
      carbon_kg = 0,
      remarks = '',
    } = req.body;

    await updateRfqStatus(id);

    const [rfqRows] = await connection.query('SELECT * FROM rfqs WHERE id = ?', [id]);
    if (!rfqRows || rfqRows.length === 0) {
      return res.status(404).json({ error: 'RFQ not found' });
    }

    const rfq = rfqRows[0];
    const now = new Date();

    if (rfq.status !== 'ACTIVE') {
      return res.status(400).json({
        error: `Auction is ${rfq.status}. Bids are accepted only while the auction is active.`,
      });
    }

    if (now < new Date(rfq.bid_start_time)) {
      return res.status(400).json({ error: 'Bidding has not started yet for this RFQ.' });
    }

    if (now > new Date(rfq.current_close_time)) {
      return res.status(400).json({ error: 'Bid time exceeds current close time.' });
    }

    if (now >= new Date(rfq.forced_close_time)) {
      return res.status(400).json({ error: 'No bids are allowed after forced close time.' });
    }

    if (!supplier_name || !String(supplier_name).trim()) {
      return res.status(400).json({ error: 'supplier_name is required' });
    }

    const freightValue = toMoney(freight);
    const originValue = toMoney(origin);
    const destinationValue = toMoney(destination);
    const derivedPrice = freightValue + originValue + destinationValue;
    const bidPrice = price === undefined || price === null || price === ''
      ? derivedPrice
      : toMoney(price, NaN);

    if (!Number.isFinite(bidPrice) || bidPrice <= 0) {
      return res.status(400).json({ error: 'Price must be a positive number' });
    }

    const supplierScore = Math.max(0, Math.min(100, Math.round(toMoney(service_score, 75))));
    const carbonKg = Math.max(0, toMoney(carbon_kg));

    const [currentLowestRows] = await connection.query(`
      SELECT price FROM bids
      WHERE rfq_id = ?
      ORDER BY price ASC, created_at ASC, id ASC
      LIMIT 1
    `, [id]);

    if (currentLowestRows.length > 0 && bidPrice >= Number(currentLowestRows[0].price)) {
      return res.status(400).json({
        error: `Bid price (${bidPrice}) must be lower than current lowest bid (${currentLowestRows[0].price})`,
      });
    }

    const oldRankedBids = await getRankedBids(id);
    const bidTime = formatDbDateTime(now);

    const [result] = await connection.query(`
      INSERT INTO bids (
        rfq_id, supplier_name, price, freight, origin, destination,
        transit_time, validity, service_score, carbon_kg, remarks, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      String(supplier_name).trim(),
      bidPrice,
      freightValue,
      originValue,
      destinationValue,
      String(transit_time).trim(),
      String(validity).trim(),
      supplierScore,
      carbonKg,
      String(remarks).trim(),
      bidTime,
    ]);

    const [newBidRows] = await connection.query('SELECT * FROM bids WHERE id = ?', [result.insertId]);
    const newBid = newBidRows[0];

    await connection.query(`
      INSERT INTO events (rfq_id, type, reason, bid_id, details, timestamp)
      VALUES (?, 'BID_SUBMITTED', 'BID_RECEIVED', ?, ?, ?)
    `, [
      id,
      newBid.id,
      JSON.stringify({
        supplier: supplier_name,
        price: bidPrice,
        freight: freightValue,
        origin: originValue,
        destination: destinationValue,
      }),
      bidTime,
    ]);

    const newRankedBids = await getRankedBids(id);
    const rankChanges = detectRankChanges(oldRankedBids, newRankedBids);
    const extensionResult = await processExtension(rfq, newBid, rankChanges);

    const [updatedRfqRows] = await connection.query('SELECT * FROM rfqs WHERE id = ?', [id]);
    const bidRank = newRankedBids.find((bid) => bid.id === newBid.id);

    res.status(201).json({
      success: true,
      bid: {
        ...newBid,
        rank: bidRank ? bidRank.rank : null,
        rank_label: bidRank ? bidRank.rank_label : null,
      },
      extension: extensionResult,
      rfq: updatedRfqRows[0],
      rankings: newRankedBids,
    });
  } catch (err) {
    console.error('[BID SUBMIT]', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

router.get('/:id/bids', async (req, res) => {
  try {
    const { id } = req.params;
    await updateRfqStatus(id);
    const rankedBids = await getRankedBids(id);
    res.json({ bids: rankedBids });
  } catch (err) {
    console.error('[BIDS LIST]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
