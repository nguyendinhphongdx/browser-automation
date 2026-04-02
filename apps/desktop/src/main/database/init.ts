import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'

let db: Database.Database

export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = path.join(app.getPath('userData'), 'browser-automation.db')
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
  }
  return db
}

export function initDatabase() {
  const db = getDatabase()

  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      tags TEXT DEFAULT '[]',
      folder TEXT DEFAULT '',
      color TEXT DEFAULT '#3B82F6',
      browser_type TEXT NOT NULL DEFAULT 'chrome',
      browser_version TEXT DEFAULT 'latest',
      browser_executable_path TEXT,
      fingerprint TEXT NOT NULL DEFAULT '{}',
      proxy_id TEXT,
      notes TEXT DEFAULT '',
      last_used TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS proxies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'http',
      host TEXT NOT NULL,
      port INTEGER NOT NULL,
      username TEXT,
      password TEXT,
      country TEXT,
      status TEXT DEFAULT 'unknown',
      speed INTEGER,
      last_checked TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS emails (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      password TEXT NOT NULL,
      recovery_email TEXT,
      phone TEXT,
      provider TEXT NOT NULL DEFAULT 'other',
      status TEXT NOT NULL DEFAULT 'unknown',
      notes TEXT DEFAULT '',
      profile_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS cookies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      profile_id TEXT,
      domain TEXT NOT NULL,
      cookies TEXT NOT NULL DEFAULT '[]',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      version TEXT DEFAULT '1.0.0',
      mode TEXT NOT NULL DEFAULT 'visual',
      nodes TEXT DEFAULT '[]',
      edges TEXT DEFAULT '[]',
      code TEXT DEFAULT '',
      variables TEXT DEFAULT '[]',
      status TEXT DEFAULT 'draft',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS workflow_logs (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      profile_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running',
      logs TEXT DEFAULT '[]',
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      finished_at TEXT,
      FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );
  `)
}

export function closeDatabase() {
  if (db) {
    db.close()
  }
}
