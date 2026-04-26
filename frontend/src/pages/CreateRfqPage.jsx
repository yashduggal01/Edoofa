import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarClock, Plus, Route, Settings2 } from 'lucide-react';
import { createRfq } from '../api';
import { money } from '../utils/format';

function localDateTime(minutesFromNow) {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutesFromNow);
  date.setSeconds(0, 0);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

const initialForm = {
  name: '',
  lane_origin: '',
  lane_destination: '',
  cargo_type: '',
  estimated_volume: '',
  budget: '',
  bid_start_time: localDateTime(0),
  bid_close_time: localDateTime(30),
  forced_close_time: localDateTime(75),
  pickup_date: '',
  trigger_window: 5,
  extension_duration: 3,
  trigger_type: 'BID_RECEIVED',
};

export default function CreateRfqPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const windowStart = useMemo(() => {
    const close = new Date(form.bid_close_time);
    close.setMinutes(close.getMinutes() - Number(form.trigger_window || 0));
    return close;
  }, [form.bid_close_time, form.trigger_window]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (new Date(form.bid_close_time) <= new Date(form.bid_start_time)) {
      return setError('Bid close must be after bid start.');
    }
    if (new Date(form.forced_close_time) <= new Date(form.bid_close_time)) {
      return setError('Forced close must be after bid close.');
    }

    setLoading(true);
    try {
      const res = await createRfq({
        ...form,
        trigger_window: Number(form.trigger_window),
        extension_duration: Number(form.extension_duration),
        budget: Number(form.budget) || 0,
      });
      navigate(`/rfq/${res.rfq.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <section className="form-header">
        <button type="button" className="back-link button-link" onClick={() => navigate('/')}>
          <ArrowLeft size={16} />
          Auctions
        </button>
        <div>
          <span className="eyebrow">Auction setup</span>
          <h1>Create RFQ</h1>
        </div>
      </section>

      {error && <div className="callout danger">{error}</div>}

      <form className="create-layout" onSubmit={handleSubmit}>
        <section className="panel">
          <div className="panel-title">
            <span><Route size={17} /> Lane and cargo</span>
          </div>
          <div className="form-grid two">
            <label className="full">
              RFQ name
              <input name="name" value={form.name} onChange={onChange} required placeholder="Mumbai to Dubai ocean freight" />
            </label>
            <label>
              Origin
              <input name="lane_origin" value={form.lane_origin} onChange={onChange} placeholder="Mumbai" />
            </label>
            <label>
              Destination
              <input name="lane_destination" value={form.lane_destination} onChange={onChange} placeholder="Dubai" />
            </label>
            <label>
              Cargo type
              <input name="cargo_type" value={form.cargo_type} onChange={onChange} placeholder="Electronics" />
            </label>
            <label>
              Estimated volume
              <input name="estimated_volume" value={form.estimated_volume} onChange={onChange} placeholder="2 x 40ft containers" />
            </label>
            <label>
              Target budget
              <input name="budget" type="number" min="0" step="0.01" value={form.budget} onChange={onChange} placeholder="0" />
            </label>
            <label>
              Pickup date
              <input name="pickup_date" type="date" value={form.pickup_date} onChange={onChange} />
            </label>
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">
            <span><CalendarClock size={17} /> Auction window</span>
          </div>
          <div className="form-grid two">
            <label>
              Bid start
              <input name="bid_start_time" type="datetime-local" value={form.bid_start_time} onChange={onChange} required />
            </label>
            <label>
              Bid close
              <input name="bid_close_time" type="datetime-local" value={form.bid_close_time} onChange={onChange} required />
            </label>
            <label className="full">
              Forced close
              <input name="forced_close_time" type="datetime-local" value={form.forced_close_time} onChange={onChange} required />
            </label>
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">
            <span><Settings2 size={17} /> Extension controls</span>
          </div>
          <div className="form-grid two">
            <label>
              Trigger window
              <input name="trigger_window" type="number" min="1" max="120" value={form.trigger_window} onChange={onChange} required />
            </label>
            <label>
              Extension duration
              <input name="extension_duration" type="number" min="1" max="120" value={form.extension_duration} onChange={onChange} required />
            </label>
            <label className="full">
              Trigger type
              <select name="trigger_type" value={form.trigger_type} onChange={onChange}>
                <option value="BID_RECEIVED">BID_RECEIVED</option>
                <option value="ANY_RANK_CHANGE">ANY_RANK_CHANGE</option>
                <option value="L1_CHANGE_ONLY">L1_CHANGE_ONLY</option>
              </select>
            </label>
          </div>
        </section>

        <aside className="panel create-summary">
          <div className="panel-title">
            <span>Preview</span>
          </div>
          <dl className="profile-list">
            <div><dt>Lane</dt><dd>{form.lane_origin || 'Origin'} {'->'} {form.lane_destination || 'Destination'}</dd></div>
            <div><dt>Budget</dt><dd>{money(form.budget || 0)}</dd></div>
            <div><dt>Trigger starts</dt><dd>{windowStart.toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</dd></div>
            <div><dt>Formula</dt><dd>min(current + {form.extension_duration}m, forced)</dd></div>
          </dl>
          <button className="btn btn-primary full" disabled={loading} type="submit">
            <Plus size={17} />
            {loading ? 'Creating' : 'Create RFQ'}
          </button>
        </aside>
      </form>
    </main>
  );
}
