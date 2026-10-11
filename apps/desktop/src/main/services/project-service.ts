import { v4 as uuid } from 'uuid'
import { getDatabase } from '../database/init'
import { createFolder, isDescendantOf } from './library-service'
import type {
  Project, CreateProjectInput, UpdateProjectInput,
  Task, CreateTaskInput, UpdateTaskInput, TaskStatus
} from '../../shared/types'

// row: any — better-sqlite3's .get()/.all() return unknown/{}, not a typed
// row; casting at every call site would just relocate the same escape hatch,
// not remove it. Matches every other rowToX() mapper in this codebase
// (campaign-service.ts, library-service.ts, ...).
function rowToProject(row: any): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    libraryFolderId: row.library_folder_id,
    notebookResourceId: row.notebook_resource_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function rowToTask(row: any): Task {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    status: row.status,
    parentTaskId: row.parent_task_id || null,
    sequence: row.sequence,
    outputFolderId: row.output_folder_id || null,
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function getAllProjects(): Project[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM projects ORDER BY updated_at DESC').all().map(rowToProject)
}

export function getProjectById(id: string): Project | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id)
  return row ? rowToProject(row) : null
}

/** Tạo project MỚI kèm luôn folder gốc trong Thư viện — 1 project luôn gắn đúng 1 folder, không có project "mồ côi" folder. */
export function createProject(input: CreateProjectInput): Project {
  const db = getDatabase()
  const id = uuid()
  const now = new Date().toISOString()
  const folder = createFolder(input.name, null, 'manual')

  db.prepare(`
    INSERT INTO projects (id, name, description, library_folder_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, input.name, input.description || '', folder.id, now, now)

  return getProjectById(id)!
}

export function updateProject(id: string, input: UpdateProjectInput): Project | null {
  const db = getDatabase()
  const existing = getProjectById(id)
  if (!existing) return null

  const now = new Date().toISOString()
  db.prepare(`
    UPDATE projects SET name = ?, description = ?, notebook_resource_id = ?, updated_at = ? WHERE id = ?
  `).run(
    input.name ?? existing.name,
    input.description ?? existing.description,
    input.notebookResourceId !== undefined ? input.notebookResourceId : existing.notebookResourceId,
    now,
    id
  )

  return getProjectById(id)
}

export function deleteProject(id: string): boolean {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM projects WHERE id = ?').run(id)
  return result.changes > 0
}

// ── Task ─────────────────────────────────────────────

export function getTasksByProject(projectId: string): Task[] {
  const db = getDatabase()
  return db.prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY sequence ASC, created_at ASC')
    .all(projectId).map(rowToTask)
}

export function getTaskById(id: string): Task | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)
  return row ? rowToTask(row) : null
}

export function createTask(input: CreateTaskInput): Task {
  const db = getDatabase()
  const id = uuid()
  const now = new Date().toISOString()

  db.prepare(`
    INSERT INTO tasks (id, project_id, title, parent_task_id, sequence, output_folder_id, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.projectId,
    input.title,
    input.parentTaskId ?? null,
    input.sequence ?? 0,
    input.outputFolderId ?? null,
    input.notes || '',
    now,
    now
  )

  return getTaskById(id)!
}

/**
 * Sửa 1 task — nếu đổi parentTaskId, chặn tạo cycle (đưa task vào chính
 * con/cháu của nó) bằng đúng isDescendantOf đã có cho cây resources, không
 * viết lại logic duyệt cây lần thứ 2.
 */
export function updateTask(id: string, input: UpdateTaskInput): Task | null {
  const db = getDatabase()
  const existing = getTaskById(id)
  if (!existing) return null

  if (input.parentTaskId && isDescendantOf(id, input.parentTaskId, (taskId) => {
    const t = getTaskById(taskId)
    return t ? { parentId: t.parentTaskId } : null
  })) {
    throw new Error('Không thể đưa 1 task vào chính con/cháu của nó')
  }

  const now = new Date().toISOString()
  db.prepare(`
    UPDATE tasks SET
      title = ?, status = ?, parent_task_id = ?, sequence = ?, output_folder_id = ?, notes = ?, updated_at = ?
    WHERE id = ?
  `).run(
    input.title ?? existing.title,
    input.status ?? existing.status,
    input.parentTaskId !== undefined ? input.parentTaskId : existing.parentTaskId,
    input.sequence ?? existing.sequence,
    input.outputFolderId !== undefined ? input.outputFolderId : existing.outputFolderId,
    input.notes ?? existing.notes,
    now,
    id
  )

  return getTaskById(id)
}

export function updateTaskStatus(id: string, status: TaskStatus): Task | null {
  return updateTask(id, { status })
}

export function deleteTask(id: string): boolean {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
  return result.changes > 0
}

/** Folder output thật sự dùng cho 1 task — outputFolderId riêng nếu có, không thì về gốc project. */
export function resolveTaskOutputFolderId(task: Task): string | null {
  if (task.outputFolderId) return task.outputFolderId
  const project = getProjectById(task.projectId)
  return project?.libraryFolderId ?? null
}
