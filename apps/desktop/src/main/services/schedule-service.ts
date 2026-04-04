import crypto from 'crypto'
import { v4 as uuid } from 'uuid'
import { getDatabase } from '../database/init'
import type { Schedule, CreateScheduleInput } from '../../shared/types'

function rowToSchedule(row: any): Schedule {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    targetType: row.target_type,
    targetId: row.target_id,
    profileId: row.profile_id || undefined,
    cronExpression: row.cron_expression || undefined,
    webhookSecret: row.webhook_secret || undefined,
    chainSourceId: row.chain_source_id || undefined,
    chainOnStatus: row.chain_on_status || 'completed',
    enabled: !!row.enabled,
    lastTriggeredAt: row.last_triggered_at || undefined,
    nextRunAt: row.next_run_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function getAllSchedules(): Schedule[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM schedules ORDER BY created_at DESC').all().map(rowToSchedule)
}

export function getScheduleById(id: string): Schedule | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id)
  return row ? rowToSchedule(row) : null
}

export function createSchedule(input: CreateScheduleInput): Schedule {
  const db = getDatabase()
  const id = uuid()
  const now = new Date().toISOString()
  const webhookSecret = input.type === 'webhook' ? crypto.randomBytes(24).toString('hex') : null
  const nextRunAt = input.type === 'cron' && input.cronExpression
    ? calculateNextRun(input.cronExpression)
    : null

  db.prepare(`
    INSERT INTO schedules (id, name, type, target_type, target_id, profile_id, cron_expression, webhook_secret, chain_source_id, chain_on_status, next_run_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, input.name, input.type, input.targetType, input.targetId,
    input.profileId || null, input.cronExpression || null,
    webhookSecret, input.chainSourceId || null,
    input.chainOnStatus || 'completed', nextRunAt, now, now
  )

  return getScheduleById(id)!
}

export function updateSchedule(id: string, input: Partial<CreateScheduleInput> & { enabled?: boolean }): Schedule | null {
  const existing = getScheduleById(id)
  if (!existing) return null

  const db = getDatabase()
  const now = new Date().toISOString()
  const cronExpr = input.cronExpression ?? existing.cronExpression
  const nextRunAt = cronExpr ? calculateNextRun(cronExpr) : null

  db.prepare(`
    UPDATE schedules SET
      name = ?, type = ?, target_type = ?, target_id = ?, profile_id = ?,
      cron_expression = ?, chain_source_id = ?, chain_on_status = ?,
      enabled = ?, next_run_at = ?, updated_at = ?
    WHERE id = ?
  `).run(
    input.name ?? existing.name,
    input.type ?? existing.type,
    input.targetType ?? existing.targetType,
    input.targetId ?? existing.targetId,
    input.profileId ?? existing.profileId ?? null,
    cronExpr ?? null,
    input.chainSourceId ?? existing.chainSourceId ?? null,
    input.chainOnStatus ?? existing.chainOnStatus ?? 'completed',
    input.enabled !== undefined ? (input.enabled ? 1 : 0) : (existing.enabled ? 1 : 0),
    nextRunAt,
    now,
    id
  )

  return getScheduleById(id)
}

export function deleteSchedule(id: string): boolean {
  const db = getDatabase()
  return db.prepare('DELETE FROM schedules WHERE id = ?').run(id).changes > 0
}

export function markTriggered(id: string): void {
  const db = getDatabase()
  const now = new Date().toISOString()
  const schedule = getScheduleById(id)
  const nextRunAt = schedule?.cronExpression ? calculateNextRun(schedule.cronExpression) : null

  db.prepare(
    'UPDATE schedules SET last_triggered_at = ?, next_run_at = ?, updated_at = ? WHERE id = ?'
  ).run(now, nextRunAt, now, id)
}

export function getEnabledCronSchedules(): Schedule[] {
  const db = getDatabase()
  return db.prepare(
    "SELECT * FROM schedules WHERE type = 'cron' AND enabled = 1"
  ).all().map(rowToSchedule)
}

export function getChainSchedules(sourceId: string, status: string): Schedule[] {
  const db = getDatabase()
  return db.prepare(
    "SELECT * FROM schedules WHERE type = 'chain' AND enabled = 1 AND chain_source_id = ? AND (chain_on_status = ? OR chain_on_status = 'any')"
  ).all(sourceId, status).map(rowToSchedule)
}

export function getScheduleByWebhookSecret(secret: string): Schedule | null {
  const db = getDatabase()
  const row = db.prepare(
    "SELECT * FROM schedules WHERE type = 'webhook' AND enabled = 1 AND webhook_secret = ?"
  ).get(secret)
  return row ? rowToSchedule(row) : null
}

// ── Cron parsing (simple subset) ──────────────

/**
 * Calculate next run time from a cron expression.
 * Supports: minute hour day month weekday
 * Simple implementation — checks next 1440 minutes (24h).
 */
export function calculateNextRun(cronExpr: string): string | null {
  try {
    const parts = cronExpr.trim().split(/\s+/)
    if (parts.length < 5) return null

    const [minExpr, hourExpr, dayExpr, monthExpr, weekdayExpr] = parts
    const now = new Date()

    for (let offset = 1; offset <= 1440 * 7; offset++) {
      const candidate = new Date(now.getTime() + offset * 60000)
      if (
        matchesCronField(minExpr, candidate.getMinutes()) &&
        matchesCronField(hourExpr, candidate.getHours()) &&
        matchesCronField(dayExpr, candidate.getDate()) &&
        matchesCronField(monthExpr, candidate.getMonth() + 1) &&
        matchesCronField(weekdayExpr, candidate.getDay())
      ) {
        candidate.setSeconds(0, 0)
        return candidate.toISOString()
      }
    }
    return null
  } catch {
    return null
  }
}

function matchesCronField(expr: string, value: number): boolean {
  if (expr === '*') return true

  // */n (step)
  if (expr.startsWith('*/')) {
    const step = parseInt(expr.slice(2))
    return step > 0 && value % step === 0
  }

  // Comma-separated values
  const values = expr.split(',').map(s => parseInt(s.trim()))
  return values.includes(value)
}
