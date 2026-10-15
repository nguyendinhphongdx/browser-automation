import crypto from 'crypto'
import { v4 as uuid } from 'uuid'
import { getDatabase } from '../database/init'
import type {
  Workflow, CreateWorkflowInput, UpdateWorkflowInput, WorkflowLog, WorkflowVersion
} from '../../shared/types'

interface WorkflowRow {
  id: string
  name: string
  description: string | null
  version: string | null
  mode: string | null
  nodes: string | null
  edges: string | null
  code: string | null
  variables: string | null
  status: string | null
  created_at: string
  updated_at: string
}

interface WorkflowLogRow {
  id: string
  workflow_id: string
  profile_id: string
  status: string
  logs: string | null
  started_at: string
  finished_at: string | null
}

function rowToWorkflow(row: WorkflowRow): Workflow {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    version: row.version || '1.0.0',
    mode: (row.mode || 'visual') as Workflow['mode'],
    nodes: JSON.parse(row.nodes || '[]'),
    edges: JSON.parse(row.edges || '[]'),
    code: row.code || '',
    variables: JSON.parse(row.variables || '[]'),
    status: (row.status || 'draft') as Workflow['status'],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function rowToLog(row: WorkflowLogRow): WorkflowLog {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    profileId: row.profile_id,
    status: row.status as WorkflowLog['status'],
    logs: row.logs || '[]',
    startedAt: row.started_at,
    finishedAt: row.finished_at || undefined
  }
}

export function getAllWorkflows(): Workflow[] {
  const db = getDatabase()
  return (db.prepare('SELECT * FROM workflows ORDER BY updated_at DESC').all() as WorkflowRow[]).map(rowToWorkflow)
}

export function getWorkflowById(id: string): Workflow | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM workflows WHERE id = ?').get(id) as WorkflowRow | undefined
  return row ? rowToWorkflow(row) : null
}

export function createWorkflow(input: CreateWorkflowInput): Workflow {
  const db = getDatabase()
  const id = uuid()
  const now = new Date().toISOString()

  db.prepare(`
    INSERT INTO workflows (id, name, description, mode, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, input.name, input.description || '', input.mode, now, now)

  return getWorkflowById(id)!
}

function contentHash(workflow: Workflow): string {
  const content = JSON.stringify({
    nodes: workflow.nodes,
    edges: workflow.edges,
    code: workflow.code,
    variables: workflow.variables,
  })
  return crypto.createHash('md5').update(content).digest('hex')
}

export function updateWorkflow(id: string, input: UpdateWorkflowInput): Workflow | null {
  const db = getDatabase()
  const existing = getWorkflowById(id)
  if (!existing) return null

  // Auto-version: snapshot current state before overwriting if content changed
  const newContent = {
    nodes: input.nodes ?? existing.nodes,
    edges: input.edges ?? existing.edges,
    code: input.code ?? existing.code,
    variables: input.variables ?? existing.variables,
  }
  const oldHash = contentHash(existing)
  const newHash = crypto.createHash('md5').update(JSON.stringify(newContent)).digest('hex')

  if (oldHash !== newHash) {
    const lastVersion = db.prepare(
      'SELECT MAX(version_number) as maxV FROM workflow_versions WHERE workflow_id = ?'
    ).get(id) as { maxV: number | null } | undefined
    const nextVersion = (lastVersion?.maxV || 0) + 1

    db.prepare(`
      INSERT INTO workflow_versions (id, workflow_id, version_number, nodes, edges, code, variables)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuid(),
      id,
      nextVersion,
      JSON.stringify(existing.nodes),
      JSON.stringify(existing.edges),
      existing.code,
      JSON.stringify(existing.variables)
    )
  }

  const now = new Date().toISOString()

  db.prepare(`
    UPDATE workflows SET
      name = ?, description = ?, mode = ?,
      nodes = ?, edges = ?, code = ?,
      variables = ?, status = ?, updated_at = ?
    WHERE id = ?
  `).run(
    input.name ?? existing.name,
    input.description ?? existing.description,
    input.mode ?? existing.mode,
    JSON.stringify(input.nodes ?? existing.nodes),
    JSON.stringify(input.edges ?? existing.edges),
    input.code ?? existing.code,
    JSON.stringify(input.variables ?? existing.variables),
    input.status ?? existing.status,
    now,
    id
  )

  return getWorkflowById(id)
}

export function deleteWorkflow(id: string): boolean {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM workflows WHERE id = ?').run(id)
  return result.changes > 0
}

// ── Workflow Logs ───────────────────────────────────

export function createWorkflowLog(workflowId: string, profileId: string): WorkflowLog {
  const db = getDatabase()
  const id = uuid()
  const now = new Date().toISOString()

  db.prepare(`
    INSERT INTO workflow_logs (id, workflow_id, profile_id, status, started_at)
    VALUES (?, ?, ?, 'running', ?)
  `).run(id, workflowId, profileId, now)

  return rowToLog(db.prepare('SELECT * FROM workflow_logs WHERE id = ?').get(id) as WorkflowLogRow)
}

export function updateWorkflowLog(
  id: string,
  status: 'completed' | 'error',
  logs: string
): void {
  const db = getDatabase()
  const now = new Date().toISOString()
  db.prepare(
    'UPDATE workflow_logs SET status = ?, logs = ?, finished_at = ? WHERE id = ?'
  ).run(status, logs, now, id)
}

export function getWorkflowLogs(workflowId: string): WorkflowLog[] {
  const db = getDatabase()
  return (db.prepare(
    'SELECT * FROM workflow_logs WHERE workflow_id = ? ORDER BY started_at DESC LIMIT 50'
  ).all(workflowId) as WorkflowLogRow[]).map(rowToLog)
}

// ── Export / Import ─────────────────────────────────

export function exportWorkflow(id: string): string | null {
  const workflow = getWorkflowById(id)
  if (!workflow) return null

  return JSON.stringify({
    _format: 'browser-automation-workflow',
    _version: '1.0',
    name: workflow.name,
    description: workflow.description,
    version: workflow.version,
    mode: workflow.mode,
    nodes: workflow.nodes,
    edges: workflow.edges,
    code: workflow.code,
    variables: workflow.variables
  }, null, 2)
}

interface WorkflowExportFile {
  _format: string
  name?: string
  description?: string
  mode?: Workflow['mode']
  nodes?: Workflow['nodes']
  edges?: Workflow['edges']
  code?: string
  variables?: Workflow['variables']
}

export function importWorkflow(jsonContent: string): Workflow {
  let data: WorkflowExportFile
  try {
    data = JSON.parse(jsonContent)
  } catch {
    throw new Error('Invalid JSON format')
  }

  if (data._format !== 'browser-automation-workflow') {
    throw new Error('Not a valid workflow file')
  }

  const wf = createWorkflow({
    name: data.name || 'Imported Workflow',
    description: data.description || '',
    mode: data.mode || 'visual'
  })

  return updateWorkflow(wf.id, {
    nodes: data.nodes || [],
    edges: data.edges || [],
    code: data.code || '',
    variables: data.variables || []
  })!
}

// ── Workflow Versions ──────────────────────────────

interface WorkflowVersionRow {
  id: string
  workflow_id: string
  version_number: number
  label: string | null
  nodes: string | null
  edges: string | null
  code: string | null
  variables: string | null
  created_at: string
}

function rowToVersion(row: WorkflowVersionRow): WorkflowVersion {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    versionNumber: row.version_number,
    label: row.label || '',
    nodes: JSON.parse(row.nodes || '[]'),
    edges: JSON.parse(row.edges || '[]'),
    code: row.code || '',
    variables: JSON.parse(row.variables || '[]'),
    createdAt: row.created_at,
  }
}

export function getWorkflowVersions(workflowId: string): WorkflowVersion[] {
  const db = getDatabase()
  return (db
    .prepare('SELECT * FROM workflow_versions WHERE workflow_id = ? ORDER BY version_number DESC LIMIT 50')
    .all(workflowId) as WorkflowVersionRow[])
    .map(rowToVersion)
}

export function getWorkflowVersion(versionId: string): WorkflowVersion | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM workflow_versions WHERE id = ?').get(versionId) as WorkflowVersionRow | undefined
  return row ? rowToVersion(row) : null
}

export function rollbackWorkflow(workflowId: string, versionId: string): Workflow | null {
  const version = getWorkflowVersion(versionId)
  if (!version || version.workflowId !== workflowId) return null

  return updateWorkflow(workflowId, {
    nodes: version.nodes,
    edges: version.edges,
    code: version.code,
    variables: version.variables,
  })
}

export function labelWorkflowVersion(versionId: string, label: string): void {
  const db = getDatabase()
  db.prepare('UPDATE workflow_versions SET label = ? WHERE id = ?').run(label, versionId)
}

export function duplicateWorkflow(id: string): Workflow | null {
  const original = getWorkflowById(id)
  if (!original) return null

  const copy = createWorkflow({
    name: `${original.name} (copy)`,
    description: original.description,
    mode: original.mode
  })

  return updateWorkflow(copy.id, {
    nodes: original.nodes,
    edges: original.edges,
    code: original.code,
    variables: original.variables
  })
}
