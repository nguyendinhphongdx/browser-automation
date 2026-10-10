import { v4 as uuid } from 'uuid'
import { getDatabase } from '../database/init'
import type { VideoPipeline, VideoNode, VideoEdge } from '../../shared/types'

function rowToPipeline(row: any): VideoPipeline {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    nodes: JSON.parse(row.nodes || '[]'),
    edges: JSON.parse(row.edges || '[]'),
    status: row.status || 'draft',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function getAllVideoPipelines(): VideoPipeline[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM video_pipelines ORDER BY updated_at DESC').all().map(rowToPipeline)
}

export function getVideoPipelineById(id: string): VideoPipeline | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM video_pipelines WHERE id = ?').get(id)
  return row ? rowToPipeline(row) : null
}

export function createVideoPipeline(input: { name: string; description?: string }): VideoPipeline {
  const db = getDatabase()
  const id = uuid()
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO video_pipelines (id, name, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, input.name, input.description || '', now, now)
  return getVideoPipelineById(id)!
}

export interface UpdateVideoPipelineInput {
  name?: string
  description?: string
  nodes?: VideoNode[]
  edges?: VideoEdge[]
  status?: VideoPipeline['status']
}

export function updateVideoPipeline(id: string, input: UpdateVideoPipelineInput): VideoPipeline | null {
  const db = getDatabase()
  const existing = getVideoPipelineById(id)
  if (!existing) return null

  const now = new Date().toISOString()
  db.prepare(`
    UPDATE video_pipelines SET name = ?, description = ?, nodes = ?, edges = ?, status = ?, updated_at = ?
    WHERE id = ?
  `).run(
    input.name ?? existing.name,
    input.description ?? existing.description,
    JSON.stringify(input.nodes ?? existing.nodes),
    JSON.stringify(input.edges ?? existing.edges),
    input.status ?? existing.status,
    now,
    id
  )
  return getVideoPipelineById(id)
}

export function deleteVideoPipeline(id: string): boolean {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM video_pipelines WHERE id = ?').run(id)
  return result.changes > 0
}
