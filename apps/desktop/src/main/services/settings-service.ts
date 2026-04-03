import { getDatabase } from '../database/init'
import { encrypt, decrypt } from './encryption'

// Keys that contain sensitive data — will be encrypted
const SENSITIVE_KEYS = ['auth.token', 'auth.refreshToken', 'api.secret']

export interface AppSettings {
  // Server / API
  'api.url': string
  'api.timeout': string
  // Auth
  'auth.token': string
  'auth.refreshToken': string
  'auth.userId': string
  'auth.email': string
  'auth.name': string
  // Sync
  'sync.enabled': string
  'sync.autoSync': string
  'sync.lastSyncAt': string
  // Browser
  'browser.defaultType': string
  'browser.launchTimeout': string
  'browser.headless': string
  // General
  'general.startMinimized': string
  'general.closeToTray': string
  'general.autoStart': string
  'general.maxConcurrentBrowsers': string
  // Any other key
  [key: string]: string
}

const DEFAULTS: Partial<AppSettings> = {
  'api.url': 'http://localhost:3000',
  'api.timeout': '30000',
  'sync.enabled': 'false',
  'sync.autoSync': 'false',
  'browser.defaultType': 'chrome',
  'browser.launchTimeout': '30000',
  'browser.headless': 'false',
  'general.startMinimized': 'false',
  'general.closeToTray': 'false',
  'general.autoStart': 'false',
  'general.maxConcurrentBrowsers': '5',
}

export function getSetting(key: string): string | null {
  const db = getDatabase()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as any
  if (!row) return DEFAULTS[key] ?? null

  if (SENSITIVE_KEYS.includes(key)) {
    return decrypt(row.value)
  }
  return row.value
}

export function setSetting(key: string, value: string): void {
  const db = getDatabase()
  const now = new Date().toISOString()
  const stored = SENSITIVE_KEYS.includes(key) ? encrypt(value) : value

  db.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?
  `).run(key, stored, now, stored, now)
}

export function deleteSetting(key: string): void {
  const db = getDatabase()
  db.prepare('DELETE FROM settings WHERE key = ?').run(key)
}

export function getAllSettings(): Record<string, string> {
  const db = getDatabase()
  const rows = db.prepare('SELECT key, value FROM settings').all() as any[]
  const result: Record<string, string> = { ...DEFAULTS } as Record<string, string>

  for (const row of rows) {
    result[row.key] = SENSITIVE_KEYS.includes(row.key)
      ? decrypt(row.value)
      : row.value
  }

  return result
}

export function getSettingsBatch(keys: string[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (const key of keys) {
    result[key] = getSetting(key) ?? ''
  }
  return result
}

export function setSettingsBatch(settings: Record<string, string>): void {
  for (const [key, value] of Object.entries(settings)) {
    setSetting(key, value)
  }
}
