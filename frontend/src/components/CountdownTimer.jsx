import { useEffect, useMemo, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { fullDateTime } from '../utils/format';

function getDiff(target, now) {
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return null;
  const total = Math.floor(diff / 1000);
  return {
    total,
    hours: Math.floor(total / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

function pad(value) {
  return String(value).padStart(2, '0');
}

export default function CountdownTimer({ closeTime, forcedCloseTime, status, phase }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = getDiff(closeTime, now);
  const state = phase || status;
  const isLive = state === 'LIVE' || (!phase && status === 'ACTIVE');
  const urgent = diff && diff.total <= 300;
  const progress = useMemo(() => {
    const close = new Date(closeTime).getTime();
    const forced = new Date(forcedCloseTime || closeTime).getTime();
    if (!forcedCloseTime || forced <= close) return 0;
    return Math.max(0, Math.min(100, ((now - close) / (forced - close)) * 100));
  }, [closeTime, forcedCloseTime, now]);

  return (
    <section className={`timer-panel ${urgent ? 'urgent' : ''}`}>
      <div className="timer-heading">
        <Clock3 size={18} />
        <span>Current close</span>
      </div>
      {isLive && diff ? (
        <div className="timer-digits" aria-label="Time remaining">
          <strong>{pad(diff.hours)}</strong>
          <span>:</span>
          <strong>{pad(diff.minutes)}</strong>
          <span>:</span>
          <strong>{pad(diff.seconds)}</strong>
        </div>
      ) : (
        <div className="timer-closed">{state === 'SCHEDULED' ? 'Scheduled' : 'Closed'}</div>
      )}
      <div className="timer-meta">
        <span>{fullDateTime(closeTime)}</span>
        {forcedCloseTime && <span>Forced: {fullDateTime(forcedCloseTime)}</span>}
      </div>
      {forcedCloseTime && (
        <div className="forced-track">
          <span style={{ width: `${progress}%` }} />
        </div>
      )}
    </section>
  );
}
