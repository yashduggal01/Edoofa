import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Boxes,
  CalendarClock,
  GanttChartSquare,
  IndianRupee,
  Route,
  Sparkles,
  TrendingDown,
  Users,
} from 'lucide-react';
import { getRfq } from '../api';
import ActivityLog from '../components/ActivityLog';
import BidForm from '../components/BidForm';
import BidTable from '../components/BidTable';
import CountdownTimer from '../components/CountdownTimer';
import StatusBadge from '../components/StatusBadge';
import { fullDateTime, minutesLabel, money, number } from '../utils/format';

function Metric({ icon: Icon, label, value, sub }) {
  return (
    <article className="metric-card">
      <span><Icon size={18} /></span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        {sub && <em>{sub}</em>}
      </div>
    </article>
  );
}

function BidLadder({ bids }) {
  const max = Math.max(...bids.map((bid) => Number(bid.price || 0)), 1);
  return (
    <div className="bid-ladder">
      {bids.slice(0, 5).map((bid) => (
        <article key={bid.id}>
          <span>{bid.rank_label}</span>
          <div>
            <strong>{bid.supplier_name}</strong>
            <small>{money(bid.price)}</small>
          </div>
          <i style={{ width: `${Math.max(8, (Number(bid.price) / max) * 100)}%` }} />
        </article>
      ))}
    </div>
  );
}

export default function DetailsPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await getRfq(id);
      setData(res);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const initial = setTimeout(load, 0);
    const interval = setInterval(load, 5000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [load]);

  const rfq = data?.rfq;
  const bids = data?.bids || [];
  const events = data?.events || [];
  const analytics = data?.analytics || {};
  const currentLowest = bids.length ? Number(bids[0].price) : null;

  const lane = useMemo(() => {
    if (!rfq) return '-';
    return `${rfq.lane_origin || 'Origin'} -> ${rfq.lane_destination || 'Destination'}`;
  }, [rfq]);

  if (loading) return <main className="page"><div className="loading-row">Loading auction</div></main>;
  if (error) return <main className="page"><div className="callout danger">{error}</div></main>;
  if (!rfq) return null;

  return (
    <main className="page">
      <section className="detail-header">
        <div>
          <Link to="/" className="back-link"><ArrowLeft size={16} /> Auctions</Link>
          <h1>{rfq.name}</h1>
          <div className="header-meta">
            <StatusBadge status={rfq.status} phase={analytics.phase} />
            <span>{lane}</span>
            <span>RFQ #{rfq.id}</span>
          </div>
        </div>
      </section>

      <section className="metric-grid">
        <Metric icon={IndianRupee} label="Current L1" value={money(currentLowest)} sub={analytics.lowest_bidder || 'No supplier'} />
        <Metric icon={TrendingDown} label="Savings" value={money(analytics.savings || 0)} sub={`${analytics.savings_rate || 0}%`} />
        <Metric icon={Users} label="Suppliers" value={number(analytics.supplier_count || 0)} sub={`${number(bids.length)} bids`} />
        <Metric icon={CalendarClock} label="Close pressure" value={minutesLabel(analytics.minutes_to_close)} sub={analytics.recommendation} />
      </section>

      <CountdownTimer
        closeTime={rfq.current_close_time}
        forcedCloseTime={rfq.forced_close_time}
        status={rfq.status}
        phase={analytics.phase}
      />

      <section className="detail-grid">
        <div className="detail-main">
          <section className="panel">
            <div className="panel-title">
              <span><GanttChartSquare size={17} /> Live bid rankings</span>
              <small>Ranked by price, timestamp, bid ID</small>
            </div>
            <BidTable bids={bids} />
          </section>

          <section className="panel split-panel">
            <div>
              <div className="panel-title">
                <span><Sparkles size={17} /> Auction intelligence</span>
              </div>
              <div className="intelligence-grid">
                <article>
                  <small>Next aggressive bid</small>
                  <strong>{money(analytics.next_best_bid)}</strong>
                </article>
                <article>
                  <small>L1 to L2 spread</small>
                  <strong>{money(analytics.spread_to_l2 || 0)}</strong>
                </article>
                <article>
                  <small>Extensions</small>
                  <strong>{number(analytics.extension_count || 0)}</strong>
                </article>
                <article>
                  <small>Risk</small>
                  <strong>{analytics.risk_level || 'NORMAL'}</strong>
                </article>
              </div>
            </div>
            {bids.length > 0 && <BidLadder bids={bids} />}
          </section>

          <section className="panel">
            <div className="panel-title">
              <span><Boxes size={17} /> Activity log</span>
            </div>
            <ActivityLog events={events} />
          </section>
        </div>

        <aside className="detail-side">
          <BidForm
            rfqId={rfq.id}
            currentLowest={currentLowest}
            status={rfq.status}
            phase={analytics.phase}
            onBidPlaced={load}
          />

          <section className="panel">
            <div className="panel-title">
              <span><Route size={17} /> RFQ profile</span>
            </div>
            <dl className="profile-list">
              <div><dt>Lane</dt><dd>{lane}</dd></div>
              <div><dt>Cargo</dt><dd>{rfq.cargo_type || '-'}</dd></div>
              <div><dt>Volume</dt><dd>{rfq.estimated_volume || '-'}</dd></div>
              <div><dt>Budget</dt><dd>{money(rfq.budget)}</dd></div>
              <div><dt>Pickup</dt><dd>{rfq.pickup_date ? fullDateTime(rfq.pickup_date) : '-'}</dd></div>
              <div><dt>Bid start</dt><dd>{fullDateTime(rfq.bid_start_time)}</dd></div>
              <div><dt>Initial close</dt><dd>{fullDateTime(rfq.bid_close_time)}</dd></div>
              <div><dt>Current close</dt><dd>{fullDateTime(rfq.current_close_time)}</dd></div>
              <div><dt>Forced close</dt><dd>{fullDateTime(rfq.forced_close_time)}</dd></div>
              <div><dt>Trigger</dt><dd>{rfq.trigger_type}</dd></div>
              <div><dt>Window</dt><dd>{rfq.trigger_window}m / +{rfq.extension_duration}m</dd></div>
            </dl>
          </section>
        </aside>
      </section>
    </main>
  );
}
