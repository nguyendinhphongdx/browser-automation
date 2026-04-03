import { v4 as uuid } from 'uuid'
import { getDatabase } from '../database/init'
import { generateFingerprint } from '../browser/fingerprint'
import type { BrowserProfile, CreateProfileInput, UpdateProfileInput } from '../../shared/types'

function rowToProfile(row: any): BrowserProfile {
  return {
    id: row.id,
    name: row.name,
    tags: JSON.parse(row.tags || '[]'),
    folder: row.folder || '',
    color: row.color || '#3B82F6',
    browserType: row.browser_type || 'chrome',
    browserVersion: row.browser_version || 'latest',
    browserExecutablePath: row.browser_executable_path || undefined,
    fingerprint: JSON.parse(row.fingerprint || '{}'),
    proxyId: row.proxy_id || null,
    notes: row.notes || '',
    lastUsed: row.last_used,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function getAllProfiles(): BrowserProfile[] {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM profiles ORDER BY updated_at DESC').all()
  return rows.map(rowToProfile)
}

export function getProfileById(id: string): BrowserProfile | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM profiles WHERE id = ?').get(id)
  return row ? rowToProfile(row) : null
}

export function createProfile(input: CreateProfileInput): BrowserProfile {
  const db = getDatabase()
  const id = uuid()
  const now = new Date().toISOString()

  const fingerprint = generateFingerprint(input.browserType, input.fingerprint)

  const stmt = db.prepare(`
    INSERT INTO profiles (id, name, tags, folder, color, browser_type, browser_version, browser_executable_path, fingerprint, proxy_id, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  stmt.run(
    id,
    input.name,
    JSON.stringify(input.tags || []),
    input.folder || '',
    input.color || '#3B82F6',
    input.browserType,
    input.browserVersion || 'latest',
    input.browserExecutablePath || null,
    JSON.stringify(fingerprint),
    input.proxyId || null,
    input.notes || '',
    now,
    now
  )

  return getProfileById(id)!
}

export function updateProfile(id: string, input: UpdateProfileInput): BrowserProfile | null {
  const db = getDatabase()
  const existing = getProfileById(id)
  if (!existing) return null

  const now = new Date().toISOString()

  // Nếu đổi loại trình duyệt, tạo lại fingerprint
  let fingerprint = existing.fingerprint
  if (input.browserType && input.browserType !== existing.browserType) {
    fingerprint = generateFingerprint(input.browserType, input.fingerprint)
  } else if (input.fingerprint) {
    fingerprint = { ...existing.fingerprint, ...input.fingerprint }
  }

  const stmt = db.prepare(`
    UPDATE profiles SET
      name = ?,
      tags = ?,
      folder = ?,
      color = ?,
      browser_type = ?,
      browser_version = ?,
      browser_executable_path = ?,
      fingerprint = ?,
      proxy_id = ?,
      notes = ?,
      updated_at = ?
    WHERE id = ?
  `)

  stmt.run(
    input.name ?? existing.name,
    JSON.stringify(input.tags ?? existing.tags),
    input.folder ?? existing.folder,
    input.color ?? existing.color,
    input.browserType ?? existing.browserType,
    input.browserVersion ?? existing.browserVersion,
    input.browserExecutablePath ?? existing.browserExecutablePath ?? null,
    JSON.stringify(fingerprint),
    input.proxyId !== undefined ? input.proxyId : existing.proxyId,
    input.notes ?? existing.notes,
    now,
    id
  )

  return getProfileById(id)
}

export function deleteProfile(id: string): boolean {
  if (id === 'default-browser') return false
  const db = getDatabase()
  const result = db.prepare('DELETE FROM profiles WHERE id = ?').run(id)
  return result.changes > 0
}

export function duplicateProfile(id: string): BrowserProfile | null {
  const original = getProfileById(id)
  if (!original) return null

  return createProfile({
    name: `${original.name} (copy)`,
    browserType: original.browserType,
    browserVersion: original.browserVersion,
    browserExecutablePath: original.browserExecutablePath,
    tags: original.tags,
    folder: original.folder,
    color: original.color,
    notes: original.notes,
    proxyId: original.proxyId
  })
}

export function updateLastUsed(id: string): void {
  const db = getDatabase()
  const now = new Date().toISOString()
  db.prepare('UPDATE profiles SET last_used = ? WHERE id = ?').run(now, id)
}
