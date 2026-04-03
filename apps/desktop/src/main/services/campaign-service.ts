import { v4 as uuid } from 'uuid'
import { getDatabase } from '../database/init'
import type {
  Campaign, CreateCampaignInput, UpdateCampaignInput, CampaignRun, CampaignStatus, CampaignProfileResult
} from '../../shared/types'

function rowToCampaign(row: any): Campaign {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    profileIds: JSON.parse(row.profile_ids || '[]'),
    workflowIds: JSON.parse(row.workflow_ids || '[]'),
    execution: JSON.parse(row.execution || '{}'),
    status: row.status || 'draft',
    lastRunAt: row.last_run_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function rowToCampaignRun(row: any): CampaignRun {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    status: row.status,
    profileResults: JSON.parse(row.profile_results || '[]'),
    startedAt: row.started_at,
    finishedAt: row.finished_at || undefined
  }
}

export function getAllCampaigns(): Campaign[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM campaigns ORDER BY updated_at DESC').all().map(rowToCampaign)
}

export function getCampaignById(id: string): Campaign | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id)
  return row ? rowToCampaign(row) : null
}

export function createCampaign(input: CreateCampaignInput): Campaign {
  const db = getDatabase()
  const id = uuid()
  const now = new Date().toISOString()

  db.prepare(`
    INSERT INTO campaigns (id, name, description, profile_ids, workflow_ids, execution, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.name,
    input.description || '',
    JSON.stringify(input.profileIds),
    JSON.stringify(input.workflowIds),
    JSON.stringify(input.execution),
    now,
    now
  )

  return getCampaignById(id)!
}

export function updateCampaign(id: string, input: UpdateCampaignInput): Campaign | null {
  const db = getDatabase()
  const existing = getCampaignById(id)
  if (!existing) return null

  const now = new Date().toISOString()

  db.prepare(`
    UPDATE campaigns SET
      name = ?, description = ?,
      profile_ids = ?, workflow_ids = ?,
      execution = ?, status = ?, updated_at = ?
    WHERE id = ?
  `).run(
    input.name ?? existing.name,
    input.description ?? existing.description,
    JSON.stringify(input.profileIds ?? existing.profileIds),
    JSON.stringify(input.workflowIds ?? existing.workflowIds),
    JSON.stringify(input.execution ?? existing.execution),
    input.status ?? existing.status,
    now,
    id
  )

  return getCampaignById(id)
}

export function deleteCampaign(id: string): boolean {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM campaigns WHERE id = ?').run(id)
  return result.changes > 0
}

export function duplicateCampaign(id: string): Campaign | null {
  const original = getCampaignById(id)
  if (!original) return null

  return createCampaign({
    name: `${original.name} (copy)`,
    description: original.description,
    profileIds: original.profileIds,
    workflowIds: original.workflowIds,
    execution: original.execution
  })
}

// ── Campaign Runs ───────────────────────────────────

export function createCampaignRun(campaignId: string): CampaignRun {
  const db = getDatabase()
  const id = uuid()
  const now = new Date().toISOString()

  db.prepare(`
    INSERT INTO campaign_runs (id, campaign_id, status, started_at)
    VALUES (?, ?, 'running', ?)
  `).run(id, campaignId, now)

  // Update campaign last_run_at
  db.prepare('UPDATE campaigns SET last_run_at = ?, updated_at = ? WHERE id = ?').run(now, now, campaignId)

  return rowToCampaignRun(db.prepare('SELECT * FROM campaign_runs WHERE id = ?').get(id))
}

export function updateCampaignRun(
  id: string,
  status: CampaignStatus,
  profileResults: CampaignProfileResult[]
): void {
  const db = getDatabase()
  const now = new Date().toISOString()
  db.prepare(
    'UPDATE campaign_runs SET status = ?, profile_results = ?, finished_at = ? WHERE id = ?'
  ).run(status, JSON.stringify(profileResults), now, id)
}

export function getCampaignRuns(campaignId: string): CampaignRun[] {
  const db = getDatabase()
  return db.prepare(
    'SELECT * FROM campaign_runs WHERE campaign_id = ? ORDER BY started_at DESC LIMIT 50'
  ).all(campaignId).map(rowToCampaignRun)
}
