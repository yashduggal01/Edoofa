import { Clock, Gavel, Lock, Radio, Sparkles } from 'lucide-react';
import { dateTime, money } from '../utils/format';

function iconFor(type) {
  if (type === 'AUCTION_CREATED') return Sparkles;
  if (type === 'TIME_EXTENDED') return Clock;
  if (type === 'AUCTION_FORCE_CLOSED') return Lock;
  if (type === 'AUCTION_CLOSED') return Gavel;
  return Radio;
}

function titleFor(event) {
  if (event.type === 'AUCTION_CREATED') return 'Auction created';
  if (event.type === 'TIME_EXTENDED') return 'Close time extended';
  if (event.type === 'AUCTION_FORCE_CLOSED') return 'Forced close reached';
  if (event.type === 'AUCTION_CLOSED') return 'Auction closed';
  return `${event.supplier_name || 'Supplier'} submitted ${event.bid_price ? money(event.bid_price) : 'a bid'}`;
}

export default function ActivityLog({ events }) {
  if (!events || events.length === 0) {
    return (
      <div className="empty-state compact">
        <Radio size={30} />
        <h3>No activity</h3>
      </div>
    );
  }

  return (
    <div className="activity-list">
      {events.map((event) => {
        const Icon = iconFor(event.type);
        return (
          <article className="activity-item" key={event.id}>
            <span className={`activity-icon ${event.type.toLowerCase()}`}>
              <Icon size={15} />
            </span>
            <div>
              <strong>{titleFor(event)}</strong>
              <small>
                {event.type === 'AUCTION_CREATED' && event.reason
                  ? event.reason
                  : event.type === 'TIME_EXTENDED' && event.old_close_time && event.new_close_time
                    ? `${dateTime(event.old_close_time)} to ${dateTime(event.new_close_time)}`
                    : event.reason || 'Recorded'}
              </small>
            </div>
            <time>{dateTime(event.timestamp)}</time>
          </article>
        );
      })}
    </div>
  );
}
