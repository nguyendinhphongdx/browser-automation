import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { v4 as uuid } from 'uuid'
import { getDatabase } from '../database/init'
import type { LibraryResource, LibraryResourceKind, LibraryResourceObjectType } from '../../shared/types'

const EXTENSION_TO_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  json: 'application/json',
  csv: 'text/csv',
  txt: 'text/plain',
  md: 'text/plain'
}

export function mimeTypeForExtension(extension: string): string {
  return EXTENSION_TO_MIME[extension.toLowerCase().replace(/^\./, '')] || 'application/octet-stream'
}

const DEFAULT_EXTENSION_BY_KIND: Record<LibraryResourceKind, string> = {
  folder: '',
  image: 'png',
  'prompt-template': 'txt',
  'data-export': 'json',
  file: 'bin'
}

export function defaultExtensionForKind(kind: LibraryResourceKind): string {
  return DEFAULT_EXTENSION_BY_KIND[kind] || 'bin'
}

function rowToResource(row: any): LibraryResource {
  let tags: string[] = []
  try {
    tags = JSON.parse(row.tags || '[]')
  } catch {
    tags = []
  }
  return {
    id: row.id,
    parentId: row.parent_id || null,
    name: row.name,
    kind: row.kind,
    mimeType: row.mime_type,
    originalFilename: row.original_filename || null,
    extension: row.extension || '',
    sizeBytes: row.size_bytes || 0,
    tags,
    category: row.category || '',
    objectType: row.object_type,
    objectId: row.object_id || null,
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function resourceFilePath(id: string, extension: string): string {
  const dir = path.join(app.getPath('userData'), 'resources')
  return path.join(dir, extension ? `${id}.${extension}` : id)
}

export function getAllResources(): LibraryResource[] {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM resources ORDER BY kind != \'folder\', updated_at DESC').all()
  return rows.map(rowToResource)
}

export function getResourceById(id: string): LibraryResource | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM resources WHERE id = ?').get(id)
  return row ? rowToResource(row) : null
}

export function getResourcesByKind(kind: LibraryResourceKind): LibraryResource[] {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM resources WHERE kind = ? ORDER BY updated_at DESC').all(kind)
  return rows.map(rowToResource)
}

/** Danh sách con trực tiếp của 1 folder — dùng cho điều hướng dạng cây. `parentId: null` = gốc thư viện. */
export function getChildren(parentId: string | null): LibraryResource[] {
  const db = getDatabase()
  const rows = parentId
    ? db.prepare('SELECT * FROM resources WHERE parent_id = ? ORDER BY kind != \'folder\', name COLLATE NOCASE').all(parentId)
    : db.prepare('SELECT * FROM resources WHERE parent_id IS NULL ORDER BY kind != \'folder\', name COLLATE NOCASE').all()
  return rows.map(rowToResource)
}

/** Tìm xuyên suốt cả cây theo tên/tag, bỏ qua cấu trúc folder. */
export function searchResources(query: string): LibraryResource[] {
  const db = getDatabase()
  const like = `%${query}%`
  const rows = db
    .prepare('SELECT * FROM resources WHERE kind != \'folder\' AND (name LIKE ? OR tags LIKE ?) ORDER BY updated_at DESC')
    .all(like, like)
  return rows.map(rowToResource)
}

export function createFolder(name: string, parentId: string | null = null): LibraryResource {
  const db = getDatabase()
  const id = uuid()
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO resources (id, parent_id, name, kind, mime_type, extension, object_type, created_at, updated_at)
    VALUES (?, ?, ?, 'folder', 'inode/directory', '', 'manual', ?, ?)
  `).run(id, parentId, name, now, now)
  return getResourceById(id)!
}

export interface CreateResourceFromBufferInput {
  name: string
  kind: LibraryResourceKind
  mimeType?: string
  originalFilename?: string | null
  extension: string
  buffer: Buffer
  parentId?: string | null
  tags?: string[]
  category?: string
  objectType?: LibraryResourceObjectType
  objectId?: string | null
  notes?: string
}

export function createResourceFromBuffer(input: CreateResourceFromBufferInput): LibraryResource {
  const db = getDatabase()
  const id = uuid()
  const now = new Date().toISOString()
  const extension = input.extension.replace(/^\./, '')
  const mimeType = input.mimeType || mimeTypeForExtension(extension)

  const dir = path.join(app.getPath('userData'), 'resources')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(resourceFilePath(id, extension), input.buffer)

  db.prepare(`
    INSERT INTO resources (
      id, parent_id, name, kind, mime_type, original_filename, extension, size_bytes,
      tags, category, object_type, object_id, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.parentId ?? null,
    input.name,
    input.kind,
    mimeType,
    input.originalFilename ?? null,
    extension,
    input.buffer.byteLength,
    JSON.stringify(input.tags || []),
    input.category || '',
    input.objectType || 'manual',
    input.objectId ?? null,
    input.notes || '',
    now,
    now
  )

  return getResourceById(id)!
}

export function createResourceFromText(
  input: Omit<CreateResourceFromBufferInput, 'buffer'> & { text: string }
): LibraryResource {
  const { text, ...rest } = input
  return createResourceFromBuffer({ ...rest, buffer: Buffer.from(text, 'utf-8') })
}

export interface UpdateResourceMetadataInput {
  name?: string
  tags?: string[]
  category?: string
  notes?: string
}

export function updateResourceMetadata(id: string, input: UpdateResourceMetadataInput): LibraryResource | null {
  const db = getDatabase()
  const existing = getResourceById(id)
  if (!existing) return null

  const now = new Date().toISOString()
  db.prepare(`
    UPDATE resources SET name = ?, tags = ?, category = ?, notes = ?, updated_at = ? WHERE id = ?
  `).run(
    input.name ?? existing.name,
    JSON.stringify(input.tags ?? existing.tags),
    input.category ?? existing.category,
    input.notes ?? existing.notes,
    now,
    id
  )

  return getResourceById(id)
}

export function moveResource(id: string, newParentId: string | null): LibraryResource | null {
  const db = getDatabase()
  const existing = getResourceById(id)
  if (!existing) return null
  const now = new Date().toISOString()
  db.prepare('UPDATE resources SET parent_id = ?, updated_at = ? WHERE id = ?').run(newParentId, now, id)
  return getResourceById(id)
}

/** Xoá 1 resource. Chặn xoá nếu là folder còn con — an toàn hơn xoá đệ quy âm thầm; người dùng/AI phải dọn/di chuyển con trước. */
export function deleteResource(id: string): boolean {
  const db = getDatabase()
  const existing = getResourceById(id)
  if (!existing) return false

  if (existing.kind === 'folder') {
    const childCount = (db.prepare('SELECT COUNT(*) as c FROM resources WHERE parent_id = ?').get(id) as { c: number }).c
    if (childCount > 0) {
      throw new Error('Thư mục còn chứa tài nguyên bên trong — hãy xoá hoặc di chuyển chúng trước')
    }
  } else {
    try {
      fs.unlinkSync(resourceFilePath(existing.id, existing.extension))
    } catch {
      // File đã mất sẵn (ENOENT) hoặc không đọc được — vẫn tiếp tục xoá row.
    }
  }

  const result = db.prepare('DELETE FROM resources WHERE id = ?').run(id)
  return result.changes > 0
}

export function getResourceFileBuffer(id: string): Buffer | null {
  const resource = getResourceById(id)
  if (!resource || resource.kind === 'folder') return null
  try {
    return fs.readFileSync(resourceFilePath(resource.id, resource.extension))
  } catch {
    return null
  }
}

export function getResourceTextContent(id: string): string | null {
  const buffer = getResourceFileBuffer(id)
  return buffer ? buffer.toString('utf-8') : null
}

export function getResourceDataUrl(id: string): string | null {
  const resource = getResourceById(id)
  const buffer = getResourceFileBuffer(id)
  if (!resource || !buffer) return null
  return `data:${resource.mimeType};base64,${buffer.toString('base64')}`
}
