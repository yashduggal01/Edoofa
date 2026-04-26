PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS rfqs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  bid_start_time TEXT NOT NULL,
  bid_close_time TEXT NOT NULL,
  forced_close_time TEXT NOT NULL,
  current_close_time TEXT NOT NULL,
  pickup_date TEXT,
  trigger_window INTEGER NOT NULL DEFAULT 5 CHECK(trigger_window > 0),
  extension_duration INTEGER NOT NULL DEFAULT 3 CHECK(extension_duration > 0),
  trigger_type TEXT NOT NULL DEFAULT 'BID_RECEIVED'
    CHECK(trigger_type IN ('BID_RECEIVED', 'ANY_RANK_CHANGE', 'L1_CHANGE_ONLY')),
  status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK(status IN ('ACTIVE', 'CLOSED', 'FORCE_CLOSED')),
  lane_origin TEXT DEFAULT '',
  lane_destination TEXT DEFAULT '',
  cargo_type TEXT DEFAULT '',
  estimated_volume TEXT DEFAULT '',
  budget REAL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS bids (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rfq_id INTEGER NOT NULL,
  supplier_name TEXT NOT NULL,
  price REAL NOT NULL CHECK(price > 0),
  freight REAL DEFAULT 0,
  origin REAL DEFAULT 0,
  destination REAL DEFAULT 0,
  transit_time TEXT,
  validity TEXT,
  service_score INTEGER DEFAULT 75 CHECK(service_score >= 0 AND service_score <= 100),
  carbon_kg REAL DEFAULT 0,
  remarks TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (rfq_id) REFERENCES rfqs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rfq_id INTEGER NOT NULL,
  type TEXT NOT NULL
    CHECK(type IN ('BID_SUBMITTED', 'TIME_EXTENDED', 'AUCTION_CLOSED', 'AUCTION_FORCE_CLOSED', 'AUCTION_CREATED')),
  reason TEXT,
  old_close_time TEXT,
  new_close_time TEXT,
  bid_id INTEGER,
  details TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (rfq_id) REFERENCES rfqs(id) ON DELETE CASCADE,
  FOREIGN KEY (bid_id) REFERENCES bids(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_rfqs_status ON rfqs(status);
CREATE INDEX IF NOT EXISTS idx_rfqs_current_close ON rfqs(current_close_time);
CREATE INDEX IF NOT EXISTS idx_bids_rfq_id ON bids(rfq_id);
CREATE INDEX IF NOT EXISTS idx_bids_price ON bids(rfq_id, price ASC, created_at ASC, id ASC);
CREATE INDEX IF NOT EXISTS idx_events_rfq_id ON events(rfq_id, timestamp DESC);
