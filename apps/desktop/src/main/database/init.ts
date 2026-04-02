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
  `)
}

export function closeDatabase() {
  if (db) {
    db.close()
  }
}
