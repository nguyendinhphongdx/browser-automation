import { v4 as uuid } from 'uuid'
import { getDatabase } from '../database/init'
import type { CookieEntry, CreateCookieInput, UpdateCookieInput } from '../../shared/types'

function rowToCookie(row: any): CookieEntry {
  return {
    id: row.id,
    name: row.name,
    profileId: row.profile_id || null,
    domain: row.domain,
    cookies: row.cookies || '[]',
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function getAllCookies(): CookieEntry[] {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM cookies ORDER BY updated_at DESC').all()
  return rows.map(rowToCookie)
}

export function getCookieById(id: string): CookieEntry | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM cookies WHERE id = ?').get(id)
  return row ? rowToCookie(row) : null
}

export function getCookiesByProfileId(profileId: string): CookieEntry[] {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM cookies WHERE profile_id = ? ORDER BY updated_at DESC').all(profileId)
  return rows.map(rowToCookie)
}

export function createCookie(input: CreateCookieInput): CookieEntry {
  const db = getDatabase()
  const id = uuid()
  const now = new Date().toISOString()

  // Validate JSON
  try {
    JSON.parse(input.cookies)
  } catch {
    throw new Error('Invalid cookie JSON format')
  }

  db.prepare(`
    INSERT INTO cookies (id, name, profile_id, domain, cookies, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, input.name, input.profileId || null, input.domain, input.cookies, input.notes || '', now, now)

  return getCookieById(id)!
}

export function updateCookie(id: string, input: UpdateCookieInput): CookieEntry | null {
  const db = getDatabase()
  const existing = getCookieById(id)
  if (!existing) return null

  if (input.cookies) {
    try {
      JSON.parse(input.cookies)
    } catch {
      throw new Error('Invalid cookie JSON format')
    }
  }

  const now = new Date().toISOString()

  db.prepare(`
    UPDATE cookies SET
      name = ?, profile_id = ?, domain = ?, cookies = ?, notes = ?, updated_at = ?
    WHERE id = ?
  `).run(
    input.name ?? existing.name,
    input.profileId !== undefined ? input.profileId : existing.profileId,
    input.domain ?? existing.domain,
    input.cookies ?? existing.cookies,
    input.notes ?? existing.notes,
    now,
    id
  )

  return getCookieById(id)
}

export function deleteCookie(id: string): boolean {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM cookies WHERE id = ?').run(id)
  return result.changes > 0
}

export function importCookiesJSON(jsonContent: string, name: string, profileId?: string): CookieEntry {
  // Parse and validate
  let parsed: any
  try {
    parsed = JSON.parse(jsonContent)
  } catch {
    throw new Error('Invalid JSON content')
  }

  // Extract domain from cookies
  const cookieArray = Array.isArray(parsed) ? parsed : (parsed.cookies || [parsed])
  const domain = cookieArray[0]?.domain || cookieArray[0]?.Domain || 'unknown'

  return createCookie({
    name,
    profileId: profileId || null,
    domain: domain.replace(/^\./, ''),
    cookies: JSON.stringify(cookieArray),
    notes: ''
  })
}

export function exportCookiesJSON(id: string): string | null {
  const entry = getCookieById(id)
  if (!entry) return null
  return entry.cookies
}
