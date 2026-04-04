import { v4 as uuid } from 'uuid'
import { getDatabase } from '../database/init'

export interface NodeMetric {
  id: string
  workflowId: string
  workflowLogId?: string
  nodeId: string
  nodeType: string
  nodeLabel: string
  executionTimeMs: number
  success: boolean
  errorMessage?: string
  screenshotPath?: string
  createdAt: string
}

export interface NodeStats {
  nodeType: string
  totalRuns: number
  successCount: number
  failCount: number
  successRate: number
  avgTimeMs: number
  p95TimeMs: number
  lastRunAt: string
}

export interface ExecutionHistoryItem {
  id: string
  workflowId: string
  workflowName: string
  profileId: string
  status: string
  startedAt: string
  finishedAt?: string
  nodeCount: number
  failedNodes: number
  totalTimeMs: number
}

// ── Record ────────────────────────────────────

export function recordNodeMetric(data: {
  workflowId: string
  workflowLogId?: string
  nodeId: string
  nodeType: string
  nodeLabel: string
  executionTimeMs: number
  success: boolean
  errorMessage?: string
  screenshotPath?: string
}): void {
  const db = getDatabase()
  db.prepare(`
    INSERT INTO node_metrics (id, workflow_id, workflow_log_id, node_id, node_type, node_label, execution_time_ms, success, error_message, screenshot_path)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    uuid(),
    data.workflowId,
    data.workflowLogId || null,
    data.nodeId,
    data.nodeType,
    data.nodeLabel,
    data.executionTimeMs,
    data.success ? 1 : 0,
    data.errorMessage || null,
    data.screenshotPath || null
  )
}

// ── Query: per-node stats ─────────────────────

export function getNodeStats(workflowId: string): NodeStats[] {
  const db = getDatabase()
  const rows = db.prepare(`
    SELECT
      node_type,
      COUNT(*) as total_runs,
      SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success_count,
      SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as fail_count,
      AVG(execution_time_ms) as avg_time,
      MAX(created_at) as last_run_at
    FROM node_metrics
    WHERE workflow_id = ?
    GROUP BY node_type
    ORDER BY total_runs DESC
  `).all(workflowId) as any[]

  return rows.map(r => {
    // Calculate p95 separately
    const times = db.prepare(
      'SELECT execution_time_ms FROM node_metrics WHERE workflow_id = ? AND node_type = ? ORDER BY execution_time_ms ASC'
    ).all(workflowId, r.node_type) as any[]
    const p95Index = Math.floor(times.length * 0.95)
    const p95 = times[p95Index]?.execution_time_ms || 0

    return {
      nodeType: r.node_type,
      totalRuns: r.total_runs,
      successCount: r.success_count,
      failCount: r.fail_count,
      successRate: r.total_runs > 0 ? r.success_count / r.total_runs : 0,
      avgTimeMs: Math.round(r.avg_time || 0),
      p95TimeMs: p95,
      lastRunAt: r.last_run_at,
    }
  })
}

// ── Query: per-node-instance stats (for a specific nodeId) ──

export function getNodeInstanceStats(workflowId: string, nodeId: string) {
  const db = getDatabase()
  const rows = db.prepare(`
    SELECT execution_time_ms, success, error_message, screenshot_path, created_at
    FROM node_metrics
    WHERE workflow_id = ? AND node_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `).all(workflowId, nodeId) as any[]

  const total = rows.length
  const successCount = rows.filter((r: any) => r.success).length
  const avgTime = total > 0 ? Math.round(rows.reduce((s: number, r: any) => s + r.execution_time_ms, 0) / total) : 0

  return {
    runs: rows.map((r: any) => ({
      executionTimeMs: r.execution_time_ms,
      success: !!r.success,
      errorMessage: r.error_message,
      screenshotPath: r.screenshot_path,
      createdAt: r.created_at,
    })),
    total,
    successCount,
    failCount: total - successCount,
    successRate: total > 0 ? successCount / total : 0,
    avgTimeMs: avgTime,
  }
}

// ── Query: execution history ──────────────────

export function getExecutionHistory(opts?: {
  workflowId?: string
  status?: string
  limit?: number
  offset?: number
}): { items: ExecutionHistoryItem[]; total: number } {
  const db = getDatabase()
  const conditions: string[] = []
  const params: any[] = []

  if (opts?.workflowId) {
    conditions.push('wl.workflow_id = ?')
    params.push(opts.workflowId)
  }
  if (opts?.status) {
    conditions.push('wl.status = ?')
    params.push(opts.status)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const limit = Math.min(opts?.limit || 50, 100)
  const offset = opts?.offset || 0

  const total = (db.prepare(
    `SELECT COUNT(*) as cnt FROM workflow_logs wl ${where}`
  ).get(...params) as any).cnt

  const rows = db.prepare(`
    SELECT
      wl.id, wl.workflow_id, w.name as workflow_name, wl.profile_id,
      wl.status, wl.started_at, wl.finished_at
    FROM workflow_logs wl
    LEFT JOIN workflows w ON w.id = wl.workflow_id
    ${where}
    ORDER BY wl.started_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as any[]

  const items = rows.map(r => {
    // Get node metrics summary for this log
    const metrics = db.prepare(
      'SELECT COUNT(*) as cnt, SUM(CASE WHEN success=0 THEN 1 ELSE 0 END) as fails, SUM(execution_time_ms) as total_ms FROM node_metrics WHERE workflow_log_id = ?'
    ).get(r.id) as any

    return {
      id: r.id,
      workflowId: r.workflow_id,
      workflowName: r.workflow_name || 'Unknown',
      profileId: r.profile_id,
      status: r.status,
      startedAt: r.started_at,
      finishedAt: r.finished_at,
      nodeCount: metrics?.cnt || 0,
      failedNodes: metrics?.fails || 0,
      totalTimeMs: metrics?.total_ms || 0,
    }
  })

  return { items, total }
}

// ── Cleanup ───────────────────────────────────

export function cleanupOldMetrics(retentionDays = 30): number {
  const db = getDatabase()
  const cutoff = new Date(Date.now() - retentionDays * 86400000).toISOString()
  const result = db.prepare('DELETE FROM node_metrics WHERE created_at < ?').run(cutoff)
  return result.changes
}
