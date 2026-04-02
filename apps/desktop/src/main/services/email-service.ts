import { v4 as uuid } from 'uuid'
import { getDatabase } from '../database/init'
import { encrypt, decrypt } from './encryption'
import type { EmailAccount, CreateEmailInput, UpdateEmailInput } from '../../shared/types'

function rowToEmail(row: any): EmailAccount {
  return {
    id: row.id,
    email: row.email,
    password: decrypt(row.password),
    recoveryEmail: row.recovery_email || undefined,
    phone: row.phone || undefined,
    provider: row.provider || 'other',
    status: row.status || 'unknown',
    notes: row.notes || '',
    profileId: row.profile_id || null,
    createdAt: row.created_at
  }
}

function detectProvider(email: string): EmailAccount['provider'] {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return 'other'
  if (domain.includes('gmail') || domain.includes('google')) return 'gmail'
  if (domain.includes('outlook') || domain.includes('hotmail') || domain.includes('live')) return 'outlook'
  if (domain.includes('yahoo')) return 'yahoo'
  return 'other'
}

export function getAllEmails(): EmailAccount[] {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM emails ORDER BY created_at DESC').all()
  return rows.map(rowToEmail)
}

export function getEmailById(id: string): EmailAccount | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM emails WHERE id = ?').get(id)
  return row ? rowToEmail(row) : null
}

export function createEmail(input: CreateEmailInput): EmailAccount {
  const db = getDatabase()
  const id = uuid()
  const now = new Date().toISOString()
  const provider = input.provider || detectProvider(input.email)

  db.prepare(`
    INSERT INTO emails (id, email, password, recovery_email, phone, provider, status, notes, profile_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, input.email, encrypt(input.password),
    input.recoveryEmail || null, input.phone || null,
    provider, input.status || 'unknown',
    input.notes || '', input.profileId || null, now
  )

  return getEmailById(id)!
}

export function updateEmail(id: string, input: UpdateEmailInput): EmailAccount | null {
  const db = getDatabase()
  const existing = getEmailById(id)
  if (!existing) return null

  db.prepare(`
    UPDATE emails SET
      email = ?, password = ?, recovery_email = ?, phone = ?,
      provider = ?, status = ?, notes = ?, profile_id = ?
    WHERE id = ?
  `).run(
    input.email ?? existing.email,
    encrypt(input.password ?? existing.password),
    input.recoveryEmail !== undefined ? input.recoveryEmail : existing.recoveryEmail ?? null,
    input.phone !== undefined ? input.phone : existing.phone ?? null,
    input.provider ?? existing.provider,
    input.status ?? existing.status,
    input.notes ?? existing.notes,
    input.profileId !== undefined ? input.profileId : existing.profileId ?? null,
    id
  )

  return getEmailById(id)
}

export function deleteEmail(id: string): boolean {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM emails WHERE id = ?').run(id)
  return result.changes > 0
}

export function importEmailsFromCSV(csvContent: string): EmailAccount[] {
  const results: EmailAccount[] = []
  const lines = csvContent.split('\n').filter(l => l.trim())
  if (lines.length === 0) return results

  // Detect if first line is a header
  const firstLine = lines[0].toLowerCase()
  const startIdx = (firstLine.includes('email') || firstLine.includes('mail')) ? 1 : 0

  for (let i = startIdx; i < lines.length; i++) {
    const parts = lines[i].split(',').map(p => p.trim())
    if (parts.length < 2) continue

    const email = parts[0]
    const password = parts[1]
    if (!email || !password || !email.includes('@')) continue

    const account = createEmail({
      email,
      password,
      recoveryEmail: parts[2] || undefined,
      phone: parts[3] || undefined,
      notes: parts[4] || undefined
    })
    results.push(account)
  }

  return results
}
