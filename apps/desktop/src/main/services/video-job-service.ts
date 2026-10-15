import { v4 as uuid } from 'uuid'
import { getDatabase } from '../database/init'
import type { VideoPipelineRun, VideoJob, VideoJobKind, VideoJobStatus } from '../../shared/types'

interface VideoPipelineRunRow {
  id: string
  pipeline_id: string
  status: string
  logs: string | null
  started_at: string
  finished_at: string | null
}

interface VideoJobRow {
  id: string
  run_id: string
  node_id: string
  job_kind: string
  provider: string
  provider_job_id: string | null
  status: string
  params: string | null
  output_resource_id: string | null
  error_message: string | null
  cost_estimate: number | null
  created_at: string
  updated_at: string
}

function rowToRun(row: VideoPipelineRunRow): VideoPipelineRun {
  return {
    id: row.id,
    pipelineId: row.pipeline_id,
    status: row.status as VideoPipelineRun['status'],
    logs: row.logs || '[]',
    startedAt: row.started_at,
    finishedAt: row.finished_at || undefined
  }
}

function rowToJob(row: VideoJobRow): VideoJob {
  return {
    id: row.id,
    runId: row.run_id,
    nodeId: row.node_id,
    jobKind: row.job_kind as VideoJobKind,
    provider: row.provider,
    providerJobId: row.provider_job_id || null,
    status: row.status as VideoJobStatus,
    params: row.params || '{}',
    outputResourceId: row.output_resource_id || null,
    errorMessage: row.error_message || null,
    costEstimate: row.cost_estimate ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function createVideoPipelineRun(pipelineId: string): VideoPipelineRun {
  const db = getDatabase()
  const id = uuid()
  db.prepare(`
    INSERT INTO video_pipeline_runs (id, pipeline_id, status) VALUES (?, ?, 'running')
  `).run(id, pipelineId)
  return rowToRun(db.prepare('SELECT * FROM video_pipeline_runs WHERE id = ?').get(id) as VideoPipelineRunRow)
}

export function updateVideoPipelineRun(
  id: string,
  status: VideoPipelineRun['status'],
  logs: string,
  finishedAt?: string
): void {
  const db = getDatabase()
  db.prepare('UPDATE video_pipeline_runs SET status = ?, logs = ?, finished_at = ? WHERE id = ?').run(
    status,
    logs,
    finishedAt || null,
    id
  )
}

export function getVideoPipelineRuns(pipelineId: string): VideoPipelineRun[] {
  const db = getDatabase()
  return (db
    .prepare('SELECT * FROM video_pipeline_runs WHERE pipeline_id = ? ORDER BY started_at DESC LIMIT 50')
    .all(pipelineId) as VideoPipelineRunRow[])
    .map(rowToRun)
}

export function createVideoJob(input: {
  runId: string
  nodeId: string
  jobKind: VideoJobKind
  provider: string
  params?: Record<string, unknown>
}): VideoJob {
  const db = getDatabase()
  const id = uuid()
  db.prepare(`
    INSERT INTO video_jobs (id, run_id, node_id, job_kind, provider, params)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, input.runId, input.nodeId, input.jobKind, input.provider, JSON.stringify(input.params || {}))
  return rowToJob(db.prepare('SELECT * FROM video_jobs WHERE id = ?').get(id) as VideoJobRow)
}

export function updateVideoJob(
  id: string,
  input: {
    providerJobId?: string
    status?: VideoJobStatus
    outputResourceId?: string
    errorMessage?: string
    costEstimate?: number
  }
): VideoJob | null {
  const db = getDatabase()
  const existing = db.prepare('SELECT * FROM video_jobs WHERE id = ?').get(id) as VideoJobRow | undefined
  if (!existing) return null
  const current = rowToJob(existing)
  const now = new Date().toISOString()

  db.prepare(`
    UPDATE video_jobs SET provider_job_id = ?, status = ?, output_resource_id = ?, error_message = ?, cost_estimate = ?, updated_at = ?
    WHERE id = ?
  `).run(
    input.providerJobId ?? current.providerJobId,
    input.status ?? current.status,
    input.outputResourceId ?? current.outputResourceId,
    input.errorMessage ?? current.errorMessage,
    input.costEstimate ?? current.costEstimate,
    now,
    id
  )
  return rowToJob(db.prepare('SELECT * FROM video_jobs WHERE id = ?').get(id) as VideoJobRow)
}

export function getVideoJobsByRun(runId: string): VideoJob[] {
  const db = getDatabase()
  return (db.prepare('SELECT * FROM video_jobs WHERE run_id = ? ORDER BY created_at ASC').all(runId) as VideoJobRow[]).map(rowToJob)
}
