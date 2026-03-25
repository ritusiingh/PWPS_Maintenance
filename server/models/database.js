/**
 * Universal Database Adapter
 * - LOCAL: uses sql.js (file-based SQLite) \u2014 only loaded when needed
 * - VERCEL/CLOUD: uses @libsql/client (Turso) \u2014 no WASM, no filesystem
 *
 * All methods are ASYNC.
 */

const path = require('path');
const fs = require('fs');

let _mode = null;    // 'turso' or 'local'
let _client = null;  // libsql client (Turso)
let _localDb = null; // sql.js instance (local only)
let _saveTimer = null;

const DB_DIR = path.join(__dirname, '..', '..', 'data');
const DB_PATH = process.env.DB_PATH || path.join(DB_DIR, 'maintenance.db');

// ======== Async API ========

const db = {
  async all(sql, ...params) {
    const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    if (_mode === 'turso') {
      const result = await _client.execute({ sql, args: flat });
      return result.rows.map(r => ({ ...r }));
    }
    return _localAll(sql, flat);
  },

  async get(sql, ...params) {
    const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    if (_mode === 'turso') {
      const result = await _client.execute({ sql, args: flat });
      return result.rows.length > 0 ? { ...result.rows[0] } : undefined;
    }
    return _localGet(sql, flat);
  },

  async run(sql, ...params) {
    const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    if (_mode === 'turso') {
      const result = await _client.execute({ sql, args: flat });
      return { changes: result.rowsAffected, lastInsertRowid: Number(result.lastInsertRowid) };
    }
    return _localRun(sql, flat);
  },

  async exec(sql) {
    if (_mode === 'turso') {
      const stmts = sql.split(';').map(s => s.trim()).filter(Boolean);
      for (const s of stmts) { await _client.execute(s); }
    } else {
      _localDb.run(sql);
      _debouncedSave();
    }
  },

  async transaction(fn) {
    if (_mode === 'turso') {
      const tx = await _client.transaction('write');
      try {
        const txDb = {
          async all(sql, ...p) { const f=p.length===1&&Array.isArray(p[0])?p[0]:p; const r=await tx.execute({sql,args:f}); return r.rows.map(r=>({...r})); },
          async get(sql, ...p) { const f=p.length===1&&Array.isArray(p[0])?p[0]:p; const r=await tx.execute({sql,args:f}); return r.rows.length>0?{...r.rows[0]}:undefined; },
          async run(sql, ...p) { const f=p.length===1&&Array.isArray(p[0])?p[0]:p; const r=await tx.execute({sql,args:f}); return {changes:r.rowsAffected,lastInsertRowid:Number(r.lastInsertRowid)}; },
        };
        const result = await fn(txDb);
        await tx.commit();
        return result;
      } catch (err) { await tx.rollback(); throw err; }
    } else {
      _localDb.run('BEGIN TRANSACTION');
      try {
        const result = await fn(db);
        _localDb.run('COMMIT');
        _saveToDisk();
        return result;
      } catch (err) { _localDb.run('ROLLBACK'); throw err; }
    }
  }
};

// ======== Local sql.js helpers ========

function _localAll(sql, params) {
  let stmt;
  try {
    stmt = _localDb.prepare(sql);
    if (params.length) stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
      const cols = stmt.getColumnNames(); const vals = stmt.get();
      const row = {}; cols.forEach((c, i) => { row[c] = vals[i]; }); rows.push(row);
    }
    return rows;
  } finally { if (stmt) stmt.free(); }
}

function _localGet(sql, params) {
  let stmt;
  try {
    stmt = _localDb.prepare(sql);
    if (params.length) stmt.bind(params);
    if (stmt.step()) {
      const cols = stmt.getColumnNames(); const vals = stmt.get();
      const row = {}; cols.forEach((c, i) => { row[c] = vals[i]; }); return row;
    }
    return undefined;
  } finally { if (stmt) stmt.free(); }
}

function _localRun(sql, params) {
  _localDb.run(sql, params);
  const changes = _localDb.getRowsModified();
  let stmt;
  try {
    stmt = _localDb.prepare('SELECT last_insert_rowid() as id');
    stmt.step();
    const lastInsertRowid = stmt.get()[0];
    _debouncedSave();
    return { changes, lastInsertRowid };
  } finally { if (stmt) stmt.free(); }
}

function _saveToDisk() {
  if (!_localDb) return;
  fs.writeFileSync(DB_PATH, Buffer.from(_localDb.export()));
}

function _debouncedSave() {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(_saveToDisk, 500);
}

// ======== Schema ========

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, name TEXT NOT NULL, phone TEXT, role TEXT DEFAULT 'resident', flat_id INTEGER, is_active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS flats (id INTEGER PRIMARY KEY AUTOINCREMENT, flat_number TEXT UNIQUE NOT NULL, block TEXT, floor INTEGER, bhk_type TEXT NOT NULL, carpet_area_sqft REAL NOT NULL, super_buildup_sqft REAL, uds_area_sqft REAL NOT NULL, owner_name TEXT NOT NULL, owner_email TEXT, owner_phone TEXT, is_occupied INTEGER DEFAULT 1, tenant_name TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS service_charges (id INTEGER PRIMARY KEY AUTOINCREMENT, service_name TEXT NOT NULL, description TEXT, monthly_total_cost REAL NOT NULL, is_active INTEGER DEFAULT 1, category TEXT DEFAULT 'amenity', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS maintenance_bills (id INTEGER PRIMARY KEY AUTOINCREMENT, flat_id INTEGER NOT NULL, bill_month TEXT NOT NULL, bill_year INTEGER NOT NULL, bill_date DATE NOT NULL, due_date DATE NOT NULL, calculation_method TEXT NOT NULL, base_amount REAL NOT NULL, tax_amount REAL DEFAULT 0, total_amount REAL NOT NULL, status TEXT DEFAULT 'pending', bill_details TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS payments (id INTEGER PRIMARY KEY AUTOINCREMENT, bill_id INTEGER NOT NULL, flat_id INTEGER NOT NULL, amount REAL NOT NULL, payment_date DATE NOT NULL, payment_mode TEXT DEFAULT 'offline', transaction_id TEXT, reference_number TEXT, remarks TEXT, recorded_by INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL, description TEXT NOT NULL, amount REAL NOT NULL, expense_date DATE NOT NULL, vendor_name TEXT, bill_reference TEXT, recorded_by INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS email_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, flat_id INTEGER, email_to TEXT NOT NULL, subject TEXT NOT NULL, body TEXT, status TEXT DEFAULT 'pending', sent_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT UNIQUE NOT NULL, value TEXT NOT NULL, description TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS calculation_snapshots (id INTEGER PRIMARY KEY AUTOINCREMENT, flat_id INTEGER NOT NULL, month TEXT NOT NULL, year INTEGER NOT NULL, sqft_amount REAL NOT NULL, uds_amount REAL NOT NULL, hybrid_amount REAL NOT NULL, breakdown_json TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE INDEX IF NOT EXISTS idx_flats_number ON flats(flat_number)`,
  `CREATE INDEX IF NOT EXISTS idx_bills_flat ON maintenance_bills(flat_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bills_month ON maintenance_bills(bill_month, bill_year)`,
  `CREATE INDEX IF NOT EXISTS idx_payments_bill ON payments(bill_id)`,
  `CREATE INDEX IF NOT EXISTS idx_payments_flat ON payments(flat_id)`,
  `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
];

// ======== Initialization ========

async function initializeAsync() {
  if (_mode) return; // Already initialized

  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  if (tursoUrl && tursoUrl.startsWith('libsql://')) {
    // ---- TURSO / CLOUD MODE ----
    try {
      const { createClient } = require('@libsql/client');
      _client = createClient({
        url: tursoUrl,
        authToken: tursoToken,
      });
      // Test the connection
      await _client.execute('SELECT 1');
      _mode = 'turso';
      console.log('\u2705 Database: Turso (cloud) -', tursoUrl);
    } catch (err) {
      console.error('\u274c Turso connection failed:', err.message);
      throw new Error('Turso database connection failed: ' + err.message);
    }
  } else {
    // ---- LOCAL sql.js MODE (never used on Vercel) ----
    try {
      const initSqlJs = require('sql.js');
      const SQL = await initSqlJs();
      if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
      if (fs.existsSync(DB_PATH)) {
        _localDb = new SQL.Database(fs.readFileSync(DB_PATH));
      } else {
        _localDb = new SQL.Database();
      }
      _localDb.run('PRAGMA foreign_keys = ON');
      _mode = 'local';
      console.log('\u2705 Database: Local SQLite (sql.js)');
    } catch (err) {
      console.error('\u274c Local SQLite failed:', err.message);
      throw new Error('Local database initialization failed: ' + err.message);
    }
  }

  // Run schema
  for (const stmt of SCHEMA_STATEMENTS) {
    try {
      await db.exec(stmt);
    } catch (err) {
      // Ignore "already exists" errors
      if (!err.message?.includes('already exists')) {
        console.error('Schema error:', stmt.substring(0, 50), err.message);
      }
    }
  }

  if (_mode === 'local') _saveToDisk();
  console.log('\u2705 Schema ready');
}

module.exports = { db, initializeAsync };
