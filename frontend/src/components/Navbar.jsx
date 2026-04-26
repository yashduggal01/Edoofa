import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Plus, ShipWheel } from 'lucide-react';

export default function Navbar() {
  const { pathname } = useLocation();

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand">
          <span className="brand-mark"><ShipWheel size={19} /></span>
          <span>
            GoComet
            <small>RFQ Auction Control</small>
          </span>
        </Link>

        <div className="nav-actions">
          <Link to="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>
            <LayoutDashboard size={16} />
            Auctions
          </Link>
          <Link to="/create" className="btn btn-primary">
            <Plus size={16} />
            New RFQ
          </Link>
        </div>
      </div>
    </nav>
  );
}
