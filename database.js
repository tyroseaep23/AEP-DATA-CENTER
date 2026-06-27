const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = process.env.DATABASE_PATH || './aep_data.db';

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initDatabase() {
  const db = getDb();

  // Teams table
  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      team TEXT,
      tenure_months INTEGER DEFAULT 0,
      role TEXT DEFAULT 'agent',
      approved INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      approved_at TEXT,
      last_login TEXT,
      instagram TEXT
    );
  `);

  // Submissions table (one per user per day)
  db.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      calls INTEGER DEFAULT 0,
      appointments INTEGER DEFAULT 0,
      presentations INTEGER DEFAULT 0,
      sales INTEGER DEFAULT 0,
      production REAL DEFAULT 0,
      lead_spend REAL DEFAULT 0,
      deposits REAL DEFAULT 0,
      recruits INTEGER DEFAULT 0,
      kpi_faith INTEGER DEFAULT 0,
      kpi_physical INTEGER DEFAULT 0,
      kpi_reel INTEGER DEFAULT 0,
      kpi_sale_or_pres INTEGER DEFAULT 0,
      submitted_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, date)
    );
  `);

  // Matchups table
  db.exec(`
    CREATE TABLE IF NOT EXISTS matchups (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      user1_id TEXT NOT NULL,
      user2_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user1_id) REFERENCES users(id),
      FOREIGN KEY (user2_id) REFERENCES users(id)
    );
  `);

  // Incentives table
  db.exec(`
    CREATE TABLE IF NOT EXISTS incentives (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      created_by TEXT,
      expires_at TEXT
    );
  `);

  // Site settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Seed default teams
  const defaultTeams = [
    { id: uuidv4(), name: 'Atlas', is_default: 1 },
    { id: uuidv4(), name: 'Crown', is_default: 1 },
    { id: uuidv4(), name: 'RoadMap', is_default: 1 },
    { id: uuidv4(), name: 'AEP ATL', is_default: 1 },
    { id: uuidv4(), name: 'IEP', is_default: 1 },
    { id: uuidv4(), name: 'Direct Agent to AEP', is_default: 1 },
  ];

  const insertTeam = db.prepare(`
    INSERT OR IGNORE INTO teams (id, name, is_default) VALUES (?, ?, ?)
  `);
  for (const t of defaultTeams) {
    insertTeam.run(t.id, t.name, t.is_default);
  }

  // Default site settings
  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
  `);
  insertSetting.run('site_password', process.env.SITE_PASSWORD || 'AEP1');
  insertSetting.run('site_name', 'AEP KPI AND DATA TRACKING');

  // Seed admin account (Ty Rose) if not exists
  const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('tyroseeip@gmail.com');
  if (!adminExists) {
    const hash = bcrypt.hashSync('AEPAdmin2024!', 10);
    db.prepare(`
      INSERT INTO users (id, name, email, phone, team, tenure_months, role, approved, active, password_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'Ty Rose',
      'tyroseeip@gmail.com',
      '(859) 693-7600',
      null,
      null,
      'admin',
      1,
      1,
      hash
    );
    console.log('✅ Admin account created: tyroseeip@gmail.com / AEPAdmin2024!');
    console.log('   >>> IMPORTANT: Change this password after first login! <<<');
  }

  // Seed co-owner account (Jared Hammill) if not exists
  const coOwnerExists = db.prepare('SELECT id FROM users WHERE email = ?').get('jaredhammill@icloud.com');
  if (!coOwnerExists) {
    const hash = bcrypt.hashSync('AEPJared2024!', 10);
    db.prepare(`
      INSERT INTO users (id, name, email, phone, team, tenure_months, role, approved, active, password_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      'Jared Hammill',
      'jaredhammill@icloud.com',
      '(813) 455-2121',
      null,
      null,
      'co-owner',
      1,
      1,
      hash
    );
    console.log('✅ Co-owner account created: jaredhammill@icloud.com / AEPJared2024!');
  }

  console.log('✅ Database initialized successfully');
}

module.exports = { getDb, initDatabase };
