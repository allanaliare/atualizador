import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
export function openDatabase(databasePath) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new Database(databasePath);
  db.pragma('journal_mode = WAL'); db.pragma('busy_timeout = 5000'); db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS product(id INTEGER PRIMARY KEY AUTOINCREMENT,code TEXT NOT NULL UNIQUE,name TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS client(id INTEGER PRIMARY KEY AUTOINCREMENT,external_id TEXT NOT NULL UNIQUE,name TEXT NOT NULL,document TEXT,first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS terminal(id INTEGER PRIMARY KEY AUTOINCREMENT,external_id TEXT NOT NULL UNIQUE,client_id INTEGER NOT NULL,name TEXT NOT NULL,computer_name TEXT,product_code TEXT NOT NULL,channel TEXT NOT NULL DEFAULT 'production',current_version TEXT NOT NULL DEFAULT '0.0.0',os_version TEXT,first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(client_id) REFERENCES client(id));
    CREATE TABLE IF NOT EXISTS release(id INTEGER PRIMARY KEY AUTOINCREMENT,product_id INTEGER NOT NULL,version TEXT NOT NULL,channel TEXT NOT NULL CHECK(channel IN ('test','beta','production')),file_path TEXT NOT NULL,sha256 TEXT NOT NULL,size_bytes INTEGER NOT NULL,mandatory INTEGER NOT NULL DEFAULT 0,minimum_version TEXT,notes TEXT,active INTEGER NOT NULL DEFAULT 1,published_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(product_id) REFERENCES product(id),UNIQUE(product_id,version,channel));
    CREATE TABLE IF NOT EXISTS release_target(id INTEGER PRIMARY KEY AUTOINCREMENT,release_id INTEGER NOT NULL,target_type TEXT NOT NULL CHECK(target_type IN ('all','client')),client_id INTEGER,FOREIGN KEY(release_id) REFERENCES release(id) ON DELETE CASCADE,FOREIGN KEY(client_id) REFERENCES client(id),CHECK((target_type='all' AND client_id IS NULL) OR (target_type='client' AND client_id IS NOT NULL)),UNIQUE(release_id,client_id));
    CREATE TABLE IF NOT EXISTS terminal_event(id INTEGER PRIMARY KEY AUTOINCREMENT,terminal_id INTEGER,previous_version TEXT,target_version TEXT,status TEXT NOT NULL,message TEXT,ip TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(terminal_id) REFERENCES terminal(id));
    CREATE TABLE IF NOT EXISTS app_user(id INTEGER PRIMARY KEY AUTOINCREMENT,username TEXT NOT NULL UNIQUE,name TEXT NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'operator' CHECK(role IN ('admin','operator')),active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS user_product(user_id INTEGER NOT NULL,product_id INTEGER NOT NULL,PRIMARY KEY(user_id,product_id),FOREIGN KEY(user_id) REFERENCES app_user(id) ON DELETE CASCADE,FOREIGN KEY(product_id) REFERENCES product(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS user_channel(user_id INTEGER NOT NULL,channel TEXT NOT NULL CHECK(channel IN ('test','beta','production')),PRIMARY KEY(user_id,channel),FOREIGN KEY(user_id) REFERENCES app_user(id) ON DELETE CASCADE);
    CREATE INDEX IF NOT EXISTS idx_release_lookup ON release(product_id,channel,active,published_at DESC);
    CREATE INDEX IF NOT EXISTS idx_terminal_client ON terminal(client_id,last_seen_at DESC);
    CREATE INDEX IF NOT EXISTS idx_event_terminal ON terminal_event(terminal_id,created_at DESC);
  `);

  ensureColumn(db, 'release', 'artifact_type', "TEXT NOT NULL DEFAULT 'package'");
  ensureColumn(db, 'release', 'original_name', 'TEXT');
  ensureColumn(db, 'release', 'deadline_at', 'TEXT');
  ensureColumn(db, 'terminal_event', 'release_id', 'INTEGER');
  ensureColumn(db, 'release', 'blocked', 'INTEGER NOT NULL DEFAULT 0');
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_event_created_at ON terminal_event(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_event_release ON terminal_event(release_id,created_at DESC);
  `);
  db.pragma('optimize');
  return db;
}

function ensureColumn(db, table, column, definition) {
  const exists = db.prepare(`PRAGMA table_info(${table})`).all()
    .some(item => item.name === column);
  if (!exists) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}
