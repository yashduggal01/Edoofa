import { Award, Leaf, ShieldCheck } from 'lucide-react';
import { dateTime, money, number } from '../utils/format';

function rankClass(rank) {
  if (rank === 1) return 'rank-chip l1';
  if (rank === 2) return 'rank-chip l2';
  return 'rank-chip';
}

export default function BidTable({ bids }) {
  if (!bids || bids.length === 0) {
    return (
      <div className="empty-state compact">
        <Award size={34} />
        <h3>No bids received</h3>
        <p>Supplier rankings will appear after the first valid quote.</p>
      </div>
    );
  }

  return (
    <div className="table-shell">
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Carrier</th>
            <th>Total bid</th>
            <th>Freight</th>
            <th>Origin</th>
            <th>Destination</th>
            <th>Service</th>
            <th>Carbon</th>
            <th>Transit</th>
            <th>Submitted</th>
          </tr>
        </thead>
        <tbody>
          {bids.map((bid) => (
            <tr key={bid.id} className={bid.rank === 1 ? 'winner-row' : ''}>
              <td><span className={rankClass(bid.rank)}>{bid.rank_label}</span></td>
              <td>
                <strong>{bid.supplier_name}</strong>
                <small>{bid.validity || 'Validity not set'}</small>
              </td>
              <td className="price-cell">{money(bid.price)}</td>
              <td>{money(bid.freight)}</td>
              <td>{money(bid.origin)}</td>
              <td>{money(bid.destination)}</td>
              <td>
                <span className="inline-metric">
                  <ShieldCheck size={14} />
                  {number(bid.service_score || 75)}
                </span>
              </td>
              <td>
                <span className="inline-metric">
                  <Leaf size={14} />
                  {number(bid.carbon_kg || 0)} kg
                </span>
              </td>
              <td>{bid.transit_time || '-'}</td>
              <td>{dateTime(bid.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
