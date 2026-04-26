import { useEffect, useMemo, useState } from 'react';
import { Calculator, Send, Sparkles } from 'lucide-react';
import { simulateBid, submitBid } from '../api';
import { money } from '../utils/format';

const emptyForm = {
  supplier_name: '',
  price: '',
  freight: '',
  origin: '',
  destination: '',
  transit_time: '',
  validity: '',
  service_score: 75,
  carbon_kg: '',
  remarks: '',
};

function numeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function BidForm({ rfqId, currentLowest, status, phase, onBidPlaced }) {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [simulation, setSimulation] = useState(null);

  const isDisabled = status !== 'ACTIVE' || (phase && phase !== 'LIVE');
  const derivedTotal = useMemo(() => (
    numeric(form.freight) + numeric(form.origin) + numeric(form.destination)
  ), [form.freight, form.origin, form.destination]);
  const effectivePrice = numeric(form.price) || derivedTotal;

  useEffect(() => {
    if (!rfqId || isDisabled || effectivePrice <= 0) {
      return undefined;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await simulateBid(rfqId, {
          price: effectivePrice,
          supplier_name: form.supplier_name || 'Simulated Supplier',
          service_score: Number(form.service_score),
          carbon_kg: numeric(form.carbon_kg),
        });
        setSimulation(res.simulation);
      } catch {
        setSimulation(null);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [rfqId, isDisabled, effectivePrice, form.supplier_name, form.service_score, form.carbon_kg]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((current) => ({ ...current, [name]: value }));
    setSimulation(null);
    setError('');
    setSuccess('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.supplier_name.trim()) return setError('Carrier name is required.');
    if (effectivePrice <= 0) return setError('Enter a positive total bid.');
    if (currentLowest !== null && effectivePrice >= Number(currentLowest)) {
      return setError(`Bid must be lower than ${money(currentLowest)}.`);
    }

    setLoading(true);
    try {
      const res = await submitBid(rfqId, {
        ...form,
        price: effectivePrice,
        freight: numeric(form.freight),
        origin: numeric(form.origin),
        destination: numeric(form.destination),
        service_score: Number(form.service_score),
        carbon_kg: numeric(form.carbon_kg),
      });

      setSuccess(`Bid accepted at ${res.bid.rank_label}${res.extension?.extended ? ' with close extension' : ''}.`);
      setForm(emptyForm);
      setSimulation(null);
      onBidPlaced?.(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel bid-panel">
      <div className="panel-title">
        <span><Send size={17} /> Submit quote</span>
      </div>

      {currentLowest !== null && (
        <div className="callout neutral">
          Current L1 <strong>{money(currentLowest)}</strong>
        </div>
      )}
      {isDisabled && <div className="callout warning">Bidding window is not live.</div>}
      {error && <div className="callout danger">{error}</div>}
      {success && <div className="callout success">{success}</div>}

      <form onSubmit={handleSubmit} className="stack-form">
        <label>
          Carrier name
          <input name="supplier_name" value={form.supplier_name} onChange={onChange} disabled={isDisabled} required />
        </label>

        <div className="form-grid two">
          <label>
            Total bid
            <input name="price" type="number" min="0" step="0.01" value={form.price} onChange={onChange} placeholder={derivedTotal ? String(derivedTotal) : '0'} disabled={isDisabled} />
          </label>
          <label>
            Service score
            <input name="service_score" type="range" min="0" max="100" value={form.service_score} onChange={onChange} disabled={isDisabled} />
            <span className="range-value">{form.service_score}/100</span>
          </label>
        </div>

        <div className="form-grid three">
          <label>
            Freight
            <input name="freight" type="number" min="0" step="0.01" value={form.freight} onChange={onChange} disabled={isDisabled} />
          </label>
          <label>
            Origin
            <input name="origin" type="number" min="0" step="0.01" value={form.origin} onChange={onChange} disabled={isDisabled} />
          </label>
          <label>
            Destination
            <input name="destination" type="number" min="0" step="0.01" value={form.destination} onChange={onChange} disabled={isDisabled} />
          </label>
        </div>

        <div className="form-grid two">
          <label>
            Transit time
            <input name="transit_time" value={form.transit_time} onChange={onChange} placeholder="3-5 days" disabled={isDisabled} />
          </label>
          <label>
            Quote validity
            <input name="validity" value={form.validity} onChange={onChange} placeholder="30 days" disabled={isDisabled} />
          </label>
        </div>

        <div className="form-grid two">
          <label>
            Carbon kg
            <input name="carbon_kg" type="number" min="0" step="0.1" value={form.carbon_kg} onChange={onChange} disabled={isDisabled} />
          </label>
          <label>
            Remarks
            <input name="remarks" value={form.remarks} onChange={onChange} disabled={isDisabled} />
          </label>
        </div>

        <div className="quote-preview">
          <Calculator size={16} />
          <span>Component total</span>
          <strong>{money(derivedTotal)}</strong>
        </div>

        {simulation && (
          <div className={`simulation-card ${simulation.valid ? 'valid' : 'invalid'}`}>
            <Sparkles size={16} />
            <div>
              <strong>{simulation.valid ? `${simulation.rank_label} preview` : 'Not a qualifying bid'}</strong>
              <span>
                {simulation.would_extend
                  ? `Would extend close to ${new Date(simulation.simulated_close_time).toLocaleTimeString()}`
                  : `Savings delta ${money(simulation.savings_delta)}`}
              </span>
            </div>
          </div>
        )}

        <button className="btn btn-success full" type="submit" disabled={isDisabled || loading}>
          <Send size={16} />
          {loading ? 'Submitting' : 'Submit bid'}
        </button>
      </form>
    </section>
  );
}
