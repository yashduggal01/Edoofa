/**
 * SQLite database bootstrap and tiny query adapter.
 *
 * The original route layer was written with mysql2-style calls
 * (`pool.getConnection().query(...)`).  This adapter preserves that shape while
 * using a local SQLite file so the assignment can run without external services.
 */

require('dotenv').config();
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const configuredDbPath = process.env.DB_PATH || path.join(__dirname, 'auction.db');
const DB_PATH = path.isAbsolute(configuredDbPath)
  ? configuredDbPath
  : path.join(__dirname, '..', configuredDbPath);
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db;
let pool;

function normalizeParams(params) {
  if (params === undefined) return [];
  return Array.isArray(params) ? params : [params];
}

function normalizeRows(rows) {
  return rows.map((row) => {
    if (!row || typeof row !== 'object') return row;

    const normalized = { ...row };
    for (const key of Object.keys(normalized)) {
      if (key.endsWith('_bid') || ['price', 'freight', 'origin', 'destination', 'carbon_kg'].includes(key)) {
        normalized[key] = normalized[key] === null ? null : Number(normalized[key]);
      }
    }
    return normalized;
  });
}

class SqliteConnection {
  query(sql, params = []) {
    const statement = db.prepare(sql);
    const values = normalizeParams(params);

    if (statement.reader) {
      return [normalizeRows(statement.all(values))];
    }

    const result = statement.run(values);
    return [{
      insertId: Number(result.lastInsertRowid || 0),
      affectedRows: result.changes,
    }];
  }

  release() {
    return undefined;
  }
}

function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name);
  if (!columns.includes(column)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
}

function getTableSql(table) {
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?").get(table);
  return row ? row.sql : null;
}

function rebuildEventsTableIfNeeded() {
  const tableSql = getTableSql('events');
  if (!tableSql || tableSql.includes('AUCTION_CREATED')) {
    return;
  }

  const migrate = db.transaction(() => {
    db.exec(`
      DROP TABLE IF EXISTS events_backup;
      ALTER TABLE events RENAME TO events_backup;
      CREATE TABLE events (
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
      INSERT INTO events (id, rfq_id, type, reason, old_close_time, new_close_time, bid_id, details, timestamp)
      SELECT id, rfq_id, type, reason, old_close_time, new_close_time, bid_id, details, timestamp
      FROM events_backup;
      DROP TABLE events_backup;
      CREATE INDEX IF NOT EXISTS idx_events_rfq_id ON events(rfq_id, timestamp DESC);
    `);
  });

  try {
    db.exec('PRAGMA foreign_keys = OFF');
    migrate();
  } finally {
    db.exec('PRAGMA foreign_keys = ON');
  }
}

function runMigrations() {
  ensureColumn('rfqs', 'lane_origin', "TEXT DEFAULT ''");
  ensureColumn('rfqs', 'lane_destination', "TEXT DEFAULT ''");
  ensureColumn('rfqs', 'cargo_type', "TEXT DEFAULT ''");
  ensureColumn('rfqs', 'estimated_volume', "TEXT DEFAULT ''");
  ensureColumn('rfqs', 'budget', 'REAL DEFAULT 0');

  ensureColumn('bids', 'service_score', 'INTEGER DEFAULT 75');
  ensureColumn('bids', 'carbon_kg', 'REAL DEFAULT 0');
  ensureColumn('bids', 'remarks', "TEXT DEFAULT ''");

  rebuildEventsTableIfNeeded();
}

function createPool() {
  return {
    async getConnection() {
      return new SqliteConnection();
    },
  };
}

async function initializePool() {
  if (pool) return pool;

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');

  pool = createPool();
  console.log(`[DB] SQLite database initialized at ${DB_PATH}`);
  return pool;
}

async function initializeDatabase() {
  if (!db) {
    await initializePool();
  }

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schema);
  runMigrations();
  console.log('[DB] Database schema ready');
}

async function getDb() {
  if (!pool) {
    await initializePool();
    await initializeDatabase();
  }
  return pool;
}

function getRawDb() {
  if (!db) {
    throw new Error('Database has not been initialized yet');
  }
  return db;
}

module.exports = {
  getDb,
  getRawDb,
  initializePool,
  initializeDatabase,
};
