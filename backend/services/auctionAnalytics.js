const { formatDbDateTime } = require('../utils/date');

function asNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function minutesBetween(from, to) {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000);
}

function getAuctionPhase(rfq, now = new Date()) {
  const start = new Date(rfq.bid_start_time);
  const close = new Date(rfq.current_close_time);
  const forced = new Date(rfq.forced_close_time);

  if (now >= forced) return 'FORCE_CLOSED';
  if (now > close) return 'CLOSED';
  if (now < start) return 'SCHEDULED';
  return 'LIVE';
}

function calculateValueScore(bid, lowestPrice) {
  const price = asNumber(bid.price);
  const serviceScore = asNumber(bid.service_score, 75);
  const carbonKg = asNumber(bid.carbon_kg);
  const priceScore = lowestPrice > 0 && price > 0 ? Math.min(100, (lowestPrice / price) * 100) : 100;
  const carbonScore = carbonKg > 0 ? Math.max(0, 100 - Math.min(80, carbonKg / 10)) : 85;
  return Math.round((priceScore * 0.68) + (serviceScore * 0.22) + (carbonScore * 0.1));
}

function enrichBids(bids = []) {
  const lowestPrice = bids.length ? asNumber(bids[0].price) : 0;
  return bids.map((bid) => ({
    ...bid,
    total_charges: asNumber(bid.freight) + asNumber(bid.origin) + asNumber(bid.destination),
    value_score: calculateValueScore(bid, lowestPrice),
  }));
}

function buildRfqAnalytics(rfq, bids = [], events = [], now = new Date()) {
  const enrichedBids = enrichBids(bids);
  const phase = getAuctionPhase(rfq, now);
  const lowestBid = enrichedBids.length ? asNumber(enrichedBids[0].price) : null;
  const secondBid = enrichedBids.length > 1 ? asNumber(enrichedBids[1].price) : null;
  const firstBid = enrichedBids.length ? asNumber([...enrichedBids].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0].price) : null;
  const budget = asNumber(rfq.budget);
  const baseline = budget > 0 ? budget : firstBid;
  const savings = baseline && lowestBid !== null ? Math.max(0, baseline - lowestBid) : 0;
  const savingsRate = baseline && lowestBid !== null ? Math.round((savings / baseline) * 1000) / 10 : 0;
  const spreadToL2 = lowestBid !== null && secondBid !== null ? Math.max(0, secondBid - lowestBid) : 0;
  const minutesToClose = minutesBetween(now, rfq.current_close_time);
  const extensionCount = events.filter((event) => event.type === 'TIME_EXTENDED').length;
  const supplierCount = new Set(enrichedBids.map((bid) => bid.supplier_name)).size;

  let riskLevel = 'NORMAL';
  let recommendation = 'Monitor';

  if (phase === 'SCHEDULED') {
    riskLevel = 'LOW';
    recommendation = 'Await start';
  } else if (phase === 'LIVE' && enrichedBids.length === 0) {
    riskLevel = 'HIGH';
    recommendation = 'Invite suppliers';
  } else if (phase === 'LIVE' && minutesToClose <= asNumber(rfq.trigger_window, 5)) {
    riskLevel = 'HIGH';
    recommendation = 'Final-window watch';
  } else if (budget > 0 && lowestBid !== null && lowestBid > budget) {
    riskLevel = 'MEDIUM';
    recommendation = 'Above target';
  } else if (supplierCount >= 3 && savingsRate >= 5) {
    riskLevel = 'LOW';
    recommendation = 'Competitive';
  }

  return {
    phase,
    lowest_bid: lowestBid,
    lowest_bidder: enrichedBids.length ? enrichedBids[0].supplier_name : null,
    supplier_count: supplierCount,
    extension_count: extensionCount,
    savings,
    savings_rate: savingsRate,
    spread_to_l2: spreadToL2,
    minutes_to_close: minutesToClose,
    risk_level: riskLevel,
    recommendation,
    next_best_bid: lowestBid ? Math.max(1, Math.floor(lowestBid * 0.98)) : (budget || null),
    bids: enrichedBids,
  };
}

function simulateBid(rfq, bids, price, options = {}, now = new Date()) {
  const candidate = {
    id: Number.MAX_SAFE_INTEGER,
    rfq_id: rfq.id,
    supplier_name: options.supplier_name || 'Simulated Supplier',
    price: asNumber(price),
    service_score: asNumber(options.service_score, 75),
    carbon_kg: asNumber(options.carbon_kg),
    created_at: formatDbDateTime(now),
  };

  const ranked = [...bids, candidate]
    .sort((a, b) => asNumber(a.price) - asNumber(b.price)
      || new Date(a.created_at) - new Date(b.created_at)
      || asNumber(a.id) - asNumber(b.id))
    .map((bid, index) => ({
      ...bid,
      rank: index + 1,
      rank_label: `L${index + 1}`,
      simulated: bid.id === candidate.id,
    }));

  const currentLowest = bids.length ? asNumber(bids[0].price) : null;
  const candidateRank = ranked.find((bid) => bid.simulated);
  const validLowerBid = currentLowest === null || asNumber(price) < currentLowest;
  const bidTime = now.getTime();
  const closeTime = new Date(rfq.current_close_time).getTime();
  const forcedCloseTime = new Date(rfq.forced_close_time).getTime();
  const windowStart = closeTime - asNumber(rfq.trigger_window, 5) * 60 * 1000;

  let triggerMatched = false;
  if (rfq.trigger_type === 'BID_RECEIVED') triggerMatched = true;
  if (rfq.trigger_type === 'ANY_RANK_CHANGE') triggerMatched = bids.length === 0 || candidateRank.rank !== ranked.length;
  if (rfq.trigger_type === 'L1_CHANGE_ONLY') triggerMatched = candidateRank.rank === 1;

  const wouldExtend = validLowerBid
    && bidTime >= windowStart
    && bidTime <= closeTime
    && bidTime < forcedCloseTime
    && triggerMatched;

  const extensionMs = asNumber(rfq.extension_duration, 3) * 60 * 1000;
  const simulatedClose = wouldExtend
    ? formatDbDateTime(new Date(Math.min(closeTime + extensionMs, forcedCloseTime)))
    : rfq.current_close_time;

  return {
    valid: validLowerBid,
    rank: candidateRank.rank,
    rank_label: candidateRank.rank_label,
    would_extend: wouldExtend && simulatedClose !== rfq.current_close_time,
    simulated_close_time: simulatedClose,
    required_to_lead: currentLowest === null ? null : Math.max(1, Math.floor(currentLowest - 1)),
    savings_delta: currentLowest === null ? 0 : Math.max(0, currentLowest - asNumber(price)),
    trigger_matched: triggerMatched,
  };
}

module.exports = {
  buildRfqAnalytics,
  enrichBids,
  getAuctionPhase,
  simulateBid,
};
