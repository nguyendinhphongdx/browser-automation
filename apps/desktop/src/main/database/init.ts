import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'
import { detectInstalledBrowsers } from '../browser/detect'

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

    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      profile_ids TEXT DEFAULT '[]',
      workflow_ids TEXT DEFAULT '[]',
      execution TEXT DEFAULT '{}',
      status TEXT DEFAULT 'draft',
      last_run_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS campaign_runs (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running',
      profile_results TEXT DEFAULT '[]',
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      finished_at TEXT,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'cron',
      target_type TEXT NOT NULL DEFAULT 'workflow',
      target_id TEXT NOT NULL,
      profile_id TEXT,
      cron_expression TEXT,
      webhook_secret TEXT,
      chain_source_id TEXT,
      chain_on_status TEXT DEFAULT 'completed',
      enabled INTEGER NOT NULL DEFAULT 1,
      last_triggered_at TEXT,
      next_run_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS node_metrics (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      workflow_log_id TEXT,
      node_id TEXT NOT NULL,
      node_type TEXT NOT NULL,
      node_label TEXT DEFAULT '',
      execution_time_ms INTEGER NOT NULL DEFAULT 0,
      success INTEGER NOT NULL DEFAULT 1,
      error_message TEXT,
      screenshot_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_node_metrics_workflow ON node_metrics(workflow_id, node_type);
    CREATE INDEX IF NOT EXISTS idx_node_metrics_created ON node_metrics(created_at);

    CREATE TABLE IF NOT EXISTS workflow_versions (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      version_number INTEGER NOT NULL DEFAULT 1,
      label TEXT DEFAULT '',
      nodes TEXT DEFAULT '[]',
      edges TEXT DEFAULT '[]',
      code TEXT DEFAULT '',
      variables TEXT DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
    );
  `)

  // Tạo Default Browser profile nếu chưa có
  ensureDefaultProfile(db)
}

export const DEFAULT_PROFILE_ID = 'default-browser'

function ensureDefaultProfile(db: Database.Database) {
  const exists = db.prepare('SELECT id FROM profiles WHERE id = ?').get(DEFAULT_PROFILE_ID)
  if (exists) return

  const browsers = detectInstalledBrowsers()
  const chrome = browsers.find((b: any) => b.type === 'chrome' || b.type === 'chromium') || browsers[0]

  db.prepare(`
    INSERT INTO profiles (id, name, color, browser_type, browser_executable_path, fingerprint, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(
    DEFAULT_PROFILE_ID,
    'Default Browser',
    '#6B7280',
    chrome?.type || 'chrome',
    chrome?.executablePath || '',
    JSON.stringify({
      userAgent: '',
      screenResolution: { width: 1920, height: 1080 },
      locale: 'vi-VN',
      timezone: 'Asia/Ho_Chi_Minh',
      platform: 'Linux',
      language: 'vi-VN',
      hardwareConcurrency: 4,
      deviceMemory: 8,
      colorDepth: 24,
      doNotTrack: false,
      webrtc: { enabled: true },
      canvas: { noise: false },
      webgl: { noise: false }
    }),
    'Profile mặc định — không thể xóa'
  )
}

export function closeDatabase() {
  if (db) {
    db.close()
  }
}
