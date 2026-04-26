import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Clock3,
  IndianRupee,
  Plus,
  Radar,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  StarOff,
  TrendingDown,
  Users,
} from 'lucide-react';
import { getDashboardInsights, listRfqs, simulateBid } from '../api';
import StatusBadge from '../components/StatusBadge';
import { dateTime, minutesLabel, money, number } from '../utils/format';

const WATCHLIST_STORAGE_KEY = 'gocomet.rfq.watchlist.v1';

function readWatchlist() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((value) => Number(value)).filter((value) => Number.isFinite(value)) : [];
  } catch {
    return [];
  }
}

function saveWatchlist(watchlist) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
}

function KpiCard({ icon: Icon, label, value, tone = '' }) {
  return (
    <article className={`kpi-card ${tone}`}>
      <span className="kpi-icon"><Icon size={18} /></span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function riskClass(level) {
  if (level === 'HIGH') return 'risk high';
  if (level === 'MEDIUM') return 'risk medium';
  if (level === 'LOW') return 'risk low';
  return 'risk';
}

function deriveSummary(rfqs) {
  return rfqs.reduce((summary, rfq) => {
    const phase = rfq.phase || rfq.status;
    const savings = Number(rfq.savings || 0);
    summary.total_auctions += 1;
    summary.total_bids += Number(rfq.bid_count || 0);
    summary.total_savings += savings;
    summary.active_auctions += phase === 'LIVE' ? 1 : 0;
    summary.at_risk += rfq.risk_level === 'HIGH' ? 1 : 0;
    return summary;
  }, {
    total_auctions: 0,
    active_auctions: 0,
    total_bids: 0,
    total_savings: 0,
    at_risk: 0,
  });
}

function deriveLanes(rfqs) {
  const lanes = new Map();

  for (const rfq of rfqs) {
    const laneLabel = `${rfq.lane_origin || 'Origin'} -> ${rfq.lane_destination || 'Destination'}`;
    const current = lanes.get(laneLabel) || {
      lane: laneLabel,
      auctions: 0,
      bids: 0,
      savings: 0,
    };

    current.auctions += 1;
    current.bids += Number(rfq.bid_count || 0);
    current.savings += Number(rfq.savings || 0);
    lanes.set(laneLabel, current);
  }

  return [...lanes.values()].sort((a, b) => b.savings - a.savings);
}

function ScenarioBadge({ label, value, tone = '' }) {
  return (
    <article className={`scenario-badge ${tone}`}>
      <small>{label}</small>
      <strong>{value}</strong>
    </article>
  );
}

export default function ListingPage() {
  const [rfqs, setRfqs] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [watchlist, setWatchlist] = useState(() => readWatchlist());
  const [selectedRfqId, setSelectedRfqId] = useState('');
  const [scenarioPrice, setScenarioPrice] = useState('');
  const [scenarioSupplier, setScenarioSupplier] = useState('Strategy Desk');
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [scenarioError, setScenarioError] = useState('');
  const [scenario, setScenario] = useState(null);

  const load = useCallback(async () => {
    try {
      const [listResult, dashboardResult] = await Promise.allSettled([
        listRfqs(),
        getDashboardInsights(),
      ]);

      if (listResult.status === 'fulfilled') {
        const nextRfqs = listResult.value.rfqs || [];
        setRfqs(nextRfqs);
        setError('');
        if (!selectedRfqId && nextRfqs.length > 0) {
          const preferred = nextRfqs.find((rfq) => rfq.phase === 'LIVE') || nextRfqs[0];
          setSelectedRfqId(String(preferred.id));
          setScenarioPrice(preferred.lowest_bid ? String(Math.max(1, Number(preferred.lowest_bid) - 100)) : '');
          setScenarioSupplier(preferred.lowest_bidder ? `${preferred.lowest_bidder} challenger` : 'Strategy Desk');
        }
      } else {
        throw new Error(listResult.reason?.message || 'Failed to load RFQs');
      }

      if (dashboardResult.status === 'fulfilled') {
        setInsights(dashboardResult.value);
        setNotice('');
      } else {
        setInsights(null);
        setNotice('Live insights are temporarily unavailable. Showing the RFQ control tower with local aggregates.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedRfqId]);

  useEffect(() => {
    const initial = setTimeout(load, 0);
    const id = setInterval(load, 10000);
    return () => {
      clearTimeout(initial);
      clearInterval(id);
    };
  }, [load]);

  useEffect(() => {
    saveWatchlist(watchlist);
  }, [watchlist]);

  const dashboardRfqs = insights?.rfqs || rfqs;
  const dashboardSummary = insights?.summary || deriveSummary(rfqs);
  const dashboardLanes = insights?.lanes || deriveLanes(rfqs);
  const recentEvents = insights?.recent_events || [];
  const selectedRfq = useMemo(
    () => rfqs.find((rfq) => String(rfq.id) === String(selectedRfqId)) || null,
    [rfqs, selectedRfqId],
  );

  const filteredRfqs = useMemo(() => {
    const text = query.trim().toLowerCase();
    return rfqs.filter((rfq) => {
      const matchesText = !text
        || rfq.name?.toLowerCase().includes(text)
        || rfq.lane_origin?.toLowerCase().includes(text)
        || rfq.lane_destination?.toLowerCase().includes(text)
        || rfq.lowest_bidder?.toLowerCase().includes(text);

      const matchesStatus = statusFilter === 'ALL' || (rfq.phase || rfq.status) === statusFilter;
      return matchesText && matchesStatus;
    });
  }, [rfqs, query, statusFilter]);

  const watchlistRfqs = useMemo(
    () => rfqs.filter((rfq) => watchlist.includes(Number(rfq.id))),
    [rfqs, watchlist],
  );

  const hotRfqs = dashboardRfqs.filter((rfq) => rfq.risk_level === 'HIGH').slice(0, 3);

  const watchlistStats = useMemo(() => ({
    total: watchlistRfqs.length,
    live: watchlistRfqs.filter((rfq) => (rfq.phase || rfq.status) === 'LIVE').length,
    nextClose: watchlistRfqs
      .map((rfq) => Number(new Date(rfq.current_close_time).getTime()))
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b)[0] || null,
  }), [watchlistRfqs]);

  function toggleWatchlist(rfqId) {
    const numericId = Number(rfqId);
    setWatchlist((current) => {
      const next = current.includes(numericId)
        ? current.filter((value) => value !== numericId)
        : [...current, numericId];
      return next;
    });
  }

  function handleScenarioRfqChange(event) {
    const nextId = event.target.value;
    setSelectedRfqId(nextId);
    const nextRfq = rfqs.find((rfq) => String(rfq.id) === String(nextId));
    if (nextRfq) {
      setScenarioPrice(nextRfq.lowest_bid ? String(Math.max(1, Number(nextRfq.lowest_bid) - 100)) : '');
      setScenarioSupplier(nextRfq.lowest_bidder ? `${nextRfq.lowest_bidder} challenger` : 'Strategy Desk');
      setScenario(null);
      setScenarioError('');
    }
  }

  async function handleScenarioSubmit(event) {
    event.preventDefault();
    setScenarioError('');
    setScenario(null);

    if (!selectedRfqId) {
      return setScenarioError('Choose an RFQ to simulate.');
    }

    const price = Number(scenarioPrice);
    if (!Number.isFinite(price) || price <= 0) {
      return setScenarioError('Enter a valid hypothetical bid price.');
    }

    setScenarioLoading(true);
    try {
      const result = await simulateBid(selectedRfqId, {
        price,
        supplier_name: scenarioSupplier || 'Strategy Desk',
        service_score: 75,
        carbon_kg: 0,
      });
      setScenario(result.simulation);
    } catch (err) {
      setScenarioError(err.message);
    } finally {
      setScenarioLoading(false);
    }
  }

  const nextWatchlistClose = watchlistStats.nextClose
    ? new Date(watchlistStats.nextClose).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '-';

  return (
    <main className="page">
      <section className="dashboard-header">
        <div>
          <span className="eyebrow">Procurement command center</span>
          <h1>British auction dashboard</h1>
          <p className="hero-copy">
            Live reverse-auction control tower with savings intelligence, risk alerts, watchlists, and bid scenario simulation.
          </p>
        </div>
        <Link to="/create" className="btn btn-primary">
          <Plus size={17} />
          New RFQ
        </Link>
      </section>

      {(error || notice) && (
        <div className={`callout ${error ? 'danger' : 'neutral'}`}>
          {error || notice}
        </div>
      )}

      <section className="kpi-grid">
        <KpiCard icon={BarChart3} label="Total auctions" value={number(dashboardSummary.total_auctions ?? rfqs.length)} />
        <KpiCard icon={Clock3} label="Live auctions" value={number(dashboardSummary.active_auctions ?? rfqs.filter((r) => r.phase === 'LIVE').length)} tone="teal" />
        <KpiCard icon={IndianRupee} label="Tracked savings" value={money(dashboardSummary.total_savings || 0)} tone="green" />
        <KpiCard icon={AlertTriangle} label="At risk" value={number(dashboardSummary.at_risk || 0)} tone="amber" />
      </section>

      <section className="insight-grid">
        <div className="panel">
          <div className="panel-title">
            <span><ShieldCheck size={17} /> Control tower</span>
            <small>{number(dashboardSummary.average_bids_per_rfq || 0)} avg bids / RFQ</small>
          </div>

          <div className="control-list">
            {hotRfqs.length === 0 ? (
              <article>
                <strong>All active auctions are stable</strong>
                <small>No RFQ currently requires urgent intervention.</small>
              </article>
            ) : hotRfqs.map((rfq) => (
              <Link to={`/rfq/${rfq.id}`} key={rfq.id} className="control-item">
                <span className={riskClass(rfq.risk_level)}>{rfq.risk_level}</span>
                <div>
                  <strong>{rfq.name}</strong>
                  <small>{rfq.recommendation} • {minutesLabel(rfq.minutes_to_close)}</small>
                </div>
                <ArrowRight size={15} />
              </Link>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">
            <span><TrendingDown size={17} /> Lane savings</span>
            <small>Top corridors by tracked value</small>
          </div>
          <div className="lane-list">
            {dashboardLanes.slice(0, 5).map((lane) => (
              <article key={lane.lane}>
                <div>
                  <strong>{lane.lane}</strong>
                  <small>{number(lane.bids)} bids across {number(lane.auctions)} RFQs</small>
                </div>
                <span>{money(lane.savings)}</span>
              </article>
            ))}
            {dashboardLanes.length === 0 && <span className="muted">No lane data yet.</span>}
          </div>
        </div>
      </section>

      <section className="insight-grid secondary-grid">
        <div className="panel">
          <div className="panel-title">
            <span><Star size={17} /> Watchlist</span>
            <small>{watchlistStats.total} saved, {watchlistStats.live} live</small>
          </div>

          <div className="watchlist-summary">
            <ScenarioBadge label="Saved RFQs" value={number(watchlistStats.total)} tone="blue" />
            <ScenarioBadge label="Live now" value={number(watchlistStats.live)} tone="green" />
            <ScenarioBadge label="Next close" value={nextWatchlistClose} tone="amber" />
          </div>

          <div className="watchlist-list">
            {watchlistRfqs.length === 0 ? (
              <article className="watchlist-empty">
                <Sparkles size={18} />
                <div>
                  <strong>Pin auctions you want to monitor closely.</strong>
                  <small>Use the star action in the table to keep them in your saved watchlist.</small>
                </div>
              </article>
            ) : watchlistRfqs.map((rfq) => (
              <article className="watchlist-item" key={rfq.id}>
                <span className={riskClass(rfq.risk_level)}>{rfq.risk_level || 'NORMAL'}</span>
                <div>
                  <strong>{rfq.name}</strong>
                  <small>{rfq.lane_origin || 'Origin'} → {rfq.lane_destination || 'Destination'}</small>
                </div>
                <div className="watchlist-meta">
                  <small>{rfq.lowest_bidder || 'No L1 yet'}</small>
                  <strong>{money(rfq.lowest_bid)}</strong>
                </div>
                <button
                  type="button"
                  className="icon-button active"
                  onClick={() => toggleWatchlist(rfq.id)}
                  aria-label={`Remove ${rfq.name} from watchlist`}
                >
                  <Star size={16} fill="currentColor" />
                </button>
                <Link className="icon-button" to={`/rfq/${rfq.id}`} aria-label={`Open ${rfq.name}`}>
                  <ArrowRight size={16} />
                </Link>
              </article>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">
            <span><Radar size={17} /> Scenario lab</span>
            <small>What-if simulation for L1, rank movement, and extension impact</small>
          </div>

          <form className="stack-form" onSubmit={handleScenarioSubmit}>
            <div className="form-grid two">
              <label className="full">
                RFQ to simulate
                <select value={selectedRfqId} onChange={handleScenarioRfqChange}>
                  <option value="">Select an auction</option>
                  {rfqs.map((rfq) => (
                    <option key={rfq.id} value={rfq.id}>
                      {rfq.name} — {rfq.lowest_bidder || 'No L1'}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Hypothetical carrier
                <input value={scenarioSupplier} onChange={(e) => setScenarioSupplier(e.target.value)} placeholder="Strategy Desk" />
              </label>
              <label>
                Hypothetical bid
                <input type="number" min="0" step="0.01" value={scenarioPrice} onChange={(e) => setScenarioPrice(e.target.value)} placeholder="Enter a price" />
              </label>
            </div>

            {selectedRfq ? (
              <div className="scenario-quick">
                <ScenarioBadge label="Current L1" value={money(selectedRfq.lowest_bid)} tone="blue" />
                <ScenarioBadge label="Lead carrier" value={selectedRfq.lowest_bidder || 'None'} tone="green" />
                <ScenarioBadge label="Close pressure" value={minutesLabel(selectedRfq.minutes_to_close)} tone="amber" />
              </div>
            ) : null}

            {scenarioError && <div className="callout danger">{scenarioError}</div>}

            {scenario && (
              <div className={`simulation-card ${scenario.valid ? 'valid' : 'invalid'}`}>
                <Sparkles size={16} />
                <div className="simulation-copy">
                  <strong>{scenario.valid ? `${scenario.rank_label} preview` : 'Not a qualifying bid'}</strong>
                  <span>
                    {scenario.would_extend
                      ? `Would extend close to ${new Date(scenario.simulated_close_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : `Savings delta ${money(scenario.savings_delta)}`}
                  </span>
                </div>
              </div>
            )}

            <button className="btn btn-primary full" type="submit" disabled={scenarioLoading || !selectedRfqId}>
              <RefreshCcw size={16} />
              {scenarioLoading ? 'Simulating' : 'Run scenario'}
            </button>
          </form>
        </div>
      </section>

      <section className="panel table-panel">
        <div className="toolbar">
          <div>
            <h2>RFQ auctions</h2>
            <span>{number(filteredRfqs.length)} visible</span>
          </div>
          <div className="toolbar-actions">
            <label className="search-box">
              <Search size={16} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search RFQ, lane, carrier" />
            </label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All phases</option>
              <option value="LIVE">Live</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="CLOSED">Closed</option>
              <option value="FORCE_CLOSED">Force closed</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading-row">Loading auctions</div>
        ) : filteredRfqs.length === 0 ? (
          <div className="empty-state">
            <BarChart3 size={36} />
            <h3>No RFQs found</h3>
          </div>
        ) : (
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>RFQ</th>
                  <th>Phase</th>
                  <th>Lane</th>
                  <th>L1 bid</th>
                  <th>Suppliers</th>
                  <th>Close</th>
                  <th>Risk</th>
                  <th>Save</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredRfqs.map((rfq) => {
                  const saved = watchlist.includes(Number(rfq.id));

                  return (
                    <tr key={rfq.id}>
                      <td>
                        <strong>{rfq.name}</strong>
                        <small>RFQ #{rfq.id} • {rfq.trigger_type}</small>
                      </td>
                      <td><StatusBadge status={rfq.status} phase={rfq.phase} /></td>
                      <td>
                        <span>{rfq.lane_origin || '-'}</span>
                        <small>{rfq.lane_destination || '-'}</small>
                      </td>
                      <td>
                        <strong className="money-text">{money(rfq.lowest_bid)}</strong>
                        <small>{rfq.lowest_bidder || 'No L1'}</small>
                      </td>
                      <td>
                        <span className="inline-metric"><Users size={14} /> {number(rfq.supplier_count || 0)}</span>
                        <small>{number(rfq.bid_count || 0)} bids</small>
                      </td>
                      <td>
                        <span>{dateTime(rfq.current_close_time)}</span>
                        <small>{minutesLabel(rfq.minutes_to_close)}</small>
                      </td>
                      <td><span className={riskClass(rfq.risk_level)}>{rfq.risk_level || 'NORMAL'}</span></td>
                      <td>
                        <button
                          type="button"
                          className={`icon-button ${saved ? 'active' : ''}`}
                          onClick={() => toggleWatchlist(rfq.id)}
                          aria-label={`${saved ? 'Remove from' : 'Add to'} watchlist for ${rfq.name}`}
                        >
                          {saved ? <Star size={16} fill="currentColor" /> : <StarOff size={16} />}
                        </button>
                      </td>
                      <td>
                        <Link className="icon-button" to={`/rfq/${rfq.id}`} aria-label={`Open ${rfq.name}`}>
                          <ArrowRight size={17} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {recentEvents.length > 0 && (
        <section className="panel">
          <div className="panel-title">
            <span><RefreshCcw size={17} /> Recent signals</span>
            <small>Latest operational events from the auction network</small>
          </div>
          <div className="recent-signals">
            {recentEvents.slice(0, 4).map((event) => (
              <article key={event.id}>
                <span className={`signal-dot ${event.type.toLowerCase()}`} />
                <div>
                  <strong>{event.rfq_name || 'RFQ event'}</strong>
                  <small>{event.type} • {event.reason || 'Recorded'}</small>
                </div>
                <time>{dateTime(event.timestamp)}</time>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
