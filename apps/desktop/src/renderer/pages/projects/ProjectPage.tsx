import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Trash2, FolderKanban, FolderOpen, Circle, Loader2, CheckCircle2,
  Pencil, X, BookOpen, Save, Sparkles, FileText, Image, Clapperboard, Play,
  Paperclip, Upload, Send, MessageSquare, Package
} from 'lucide-react'
import { useProjectStore } from '@/stores/project-store'
import { useLibraryStore } from '@/stores/library-store'
import { ResourcePicker } from '@/components/library/ResourcePicker'
import { LibraryGridCard } from '@/components/library/LibraryGridCard'
import { AgentChatPanel } from '@/components/agent/AgentChatPanel'
import { Drawer } from '@/components/Drawer'
import { cn } from '@/lib/utils'
import type { Project, Task, TaskStatus, TaskKind, LibraryResource } from '@shared/types'

const PROJECT_AGENT_SUGGESTIONS = [
  'Tạo task mới "Viết kịch bản tập 3"',
  'Tóm tắt lại nhân vật và mạch truyện đã có vào sổ tay dự án',
  'Liệt kê các task đang "Đang làm"'
]

// Tool nào trong buildProjectToolset (ADR-0005) thật sự làm thay đổi dữ
// liệu project/task — sau khi gọi xong, refetch lại store để UI đồng bộ
// (AI tự sửa DB qua tool, không đi qua action của project-store).
const PROJECT_MUTATING_TOOLS = new Set([
  'create_task',
  'update_task_status',
  'move_task',
  'update_project_notebook',
  'create_project'
])

const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; icon: any }> = {
  'todo': { label: 'Chưa làm', color: 'text-gray-500 bg-gray-100', icon: Circle },
  'in-progress': { label: 'Đang làm', color: 'text-blue-600 bg-blue-100', icon: Loader2 },
  'done': { label: 'Xong', color: 'text-green-600 bg-green-100', icon: CheckCircle2 }
}

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  'todo': 'in-progress',
  'in-progress': 'done',
  'done': 'todo'
}

// Bản chất công việc của 1 task (ADR-0009) — icon riêng để nhìn là biết loại
// việc mà không cần đọc title, "other" không hiện icon (mặc định, không cần
// nhấn mạnh).
const TASK_KIND_CONFIG: Record<TaskKind, { label: string; icon: any } | null> = {
  script: { label: 'Kịch bản', icon: FileText },
  image: { label: 'Hình ảnh', icon: Image },
  video: { label: 'Video', icon: Clapperboard },
  automation: { label: 'Automation', icon: Play },
  other: null
}

function CreateProjectDialog({ onClose }: { onClose: () => void }) {
  const { createProject } = useProjectStore()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      await createProject({ name: name.trim(), description: description.trim() })
      onClose()
    } catch (err) {
      alert(`Lỗi: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Tạo project mới</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-accent transition-colors text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Tên project <span className="text-destructive">*</span></label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="VD: Phim hoạt hình Tí Sún"
              required autoFocus
              className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Mô tả</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-accent transition-colors">Huỷ</button>
            <button type="submit" disabled={loading || !name.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {loading ? 'Đang tạo...' : 'Tạo project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TaskDialog({ projectId, parentTaskId, task, onClose }: {
  projectId: string
  parentTaskId: string | null
  task?: Task | null
  onClose: () => void
}) {
  const { createTask, updateTask } = useProjectStore()
  const [title, setTitle] = useState(task?.title ?? '')
  const [kind, setKind] = useState<TaskKind>(task?.kind ?? 'other')
  const [sequence, setSequence] = useState(task?.sequence ?? 0)
  const [notes, setNotes] = useState(task?.notes ?? '')
  const [outputFolder, setOutputFolder] = useState<{ id: string; name: string } | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (task?.outputFolderId) {
      window.api.getLibraryResource(task.outputFolderId).then((r: LibraryResource | null) => {
        if (r) setOutputFolder({ id: r.id, name: r.name })
      })
    }
  }, [task?.outputFolderId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    try {
      if (task) {
        await updateTask(task.id, {
          title: title.trim(), kind, sequence, notes,
          outputFolderId: outputFolder ? outputFolder.id : null
        })
      } else {
        await createTask({
          projectId, parentTaskId, title: title.trim(), kind, sequence, notes,
          outputFolderId: outputFolder?.id
        })
      }
      onClose()
    } catch (err) {
      alert(`Lỗi: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">{task ? 'Sửa task' : 'Task mới'}</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-accent transition-colors"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Tên task <span className="text-destructive">*</span></label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="VD: Viết kịch bản tập 3"
              required autoFocus
              className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Loại việc</label>
            <select value={kind} onChange={e => setKind(e.target.value as TaskKind)}
              className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="other">Khác</option>
              <option value="script">Kịch bản</option>
              <option value="image">Hình ảnh</option>
              <option value="video">Video</option>
              <option value="automation">Automation</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Thứ tự</label>
            <input type="number" value={sequence} onChange={e => setSequence(Number(e.target.value) || 0)}
              className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Ghi chú</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Thư mục output</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 border rounded-lg bg-background text-sm text-muted-foreground truncate">
                {outputFolder ? outputFolder.name : 'Dùng gốc project'}
              </div>
              <button type="button" onClick={() => setPickerOpen(true)}
                className="px-3 py-2 border rounded-lg text-sm font-medium hover:bg-accent transition-colors shrink-0">Chọn</button>
              {outputFolder && (
                <button type="button" onClick={() => setOutputFolder(null)}
                  className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors shrink-0" title="Bỏ chọn">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-accent transition-colors">Huỷ</button>
            <button type="submit" disabled={loading || !title.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {loading ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>

      <ResourcePicker open={pickerOpen} onClose={() => setPickerOpen(false)}
        onSelect={(r) => setOutputFolder({ id: r.id, name: r.name })} filterKind="folder" />
    </div>
  )
}

function TaskNode({ task, allTasks, depth, onAddChild, onEdit, onDelete, onCycleStatus, onOpenDetail }: {
  task: Task
  allTasks: Task[]
  depth: number
  onAddChild: (parentId: string) => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  onCycleStatus: (task: Task) => void
  onOpenDetail: (task: Task) => void
}) {
  const children = allTasks.filter(t => t.parentTaskId === task.id)
  const statusCfg = TASK_STATUS_CONFIG[task.status]
  const StatusIcon = statusCfg.icon
  const kindCfg = TASK_KIND_CONFIG[task.kind]
  const KindIcon = kindCfg?.icon

  return (
    <div>
      <div className="flex items-center gap-2 py-2 group" style={{ paddingLeft: depth * 24 }}>
        <button onClick={() => onCycleStatus(task)} title={`Đổi trạng thái (hiện: ${statusCfg.label})`}
          className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium shrink-0', statusCfg.color)}>
          <StatusIcon className={cn('h-3 w-3', task.status === 'in-progress' && 'animate-spin')} />
          {statusCfg.label}
        </button>
        {kindCfg && KindIcon && (
          <span title={kindCfg.label} className="inline-flex items-center justify-center p-1 rounded-md bg-accent text-muted-foreground shrink-0">
            <KindIcon className="h-3 w-3" />
          </span>
        )}
        <button onClick={() => onOpenDetail(task)} className="text-sm flex-1 truncate text-left hover:underline">{task.title}</button>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={() => onAddChild(task.id)} title="Thêm task con"
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors"><Plus className="h-3.5 w-3.5" /></button>
          <button onClick={() => onEdit(task)} title="Sửa"
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
          <button onClick={() => onDelete(task)} title="Xoá"
            className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      {children.map(child => (
        <TaskNode key={child.id} task={child} allTasks={allTasks} depth={depth + 1}
          onAddChild={onAddChild} onEdit={onEdit} onDelete={onDelete} onCycleStatus={onCycleStatus} onOpenDetail={onOpenDetail} />
      ))}
    </div>
  )
}

/** Chi tiết 1 task kiểu Jira (ADR-0010) — mô tả/đính kèm/output/comment. */
function TaskDetailDrawer({ task, project, onClose, onEdit, onAskAI }: {
  task: Task
  project: Project
  onClose: () => void
  onEdit: (task: Task) => void
  onAskAI: (message: string) => void
}) {
  const {
    taskAttachments, taskComments, setActiveTask, attachResourceToTask, detachResourceFromTask,
    addTaskComment, updateTask, updateTaskStatus, deleteTask
  } = useProjectStore()
  const [notes, setNotes] = useState(task.notes)
  const [notesDirty, setNotesDirty] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const [outputResources, setOutputResources] = useState<LibraryResource[]>([])
  const [loadingOutput, setLoadingOutput] = useState(false)

  useEffect(() => {
    setActiveTask(task.id)
    setNotes(task.notes)
    setNotesDirty(false)
  }, [task.id])

  useEffect(() => {
    // Task CHƯA có outputFolderId riêng — KHÔNG fallback hiện cả thư mục gốc
    // project (chứa lẫn resource của mọi task khác + sổ tay/kịch bản), vì
    // trông như "output của task này" nhưng thực ra không phải. Chỉ hiện khi
    // task đã có folder riêng thật sự.
    if (!task.outputFolderId) {
      setOutputResources([])
      setLoadingOutput(false)
      return
    }
    setLoadingOutput(true)
    window.api.getLibraryChildren(task.outputFolderId).then((rows: LibraryResource[]) => {
      setOutputResources(rows)
      setLoadingOutput(false)
    })
  }, [task.outputFolderId])

  const handleSaveNotes = async () => {
    setSavingNotes(true)
    try {
      await updateTask(task.id, { notes })
      setNotesDirty(false)
    } finally {
      setSavingNotes(false)
    }
  }

  const handleUpload = async () => {
    setUploading(true)
    try {
      const resource = await window.api.uploadLibraryResource({ parentId: task.outputFolderId ?? project.libraryFolderId })
      if (resource) await attachResourceToTask(resource.id)
    } finally {
      setUploading(false)
    }
  }

  const handleSendComment = async () => {
    if (!commentText.trim()) return
    setSendingComment(true)
    try {
      await addTaskComment(commentText.trim())
      setCommentText('')
    } finally {
      setSendingComment(false)
    }
  }

  const handleDelete = async () => {
    if (confirm(`Xoá task "${task.title}"?`)) {
      await deleteTask(task.id)
      onClose()
    }
  }

  const statusCfg = TASK_STATUS_CONFIG[task.status]
  const StatusIcon = statusCfg.icon
  const kindCfg = TASK_KIND_CONFIG[task.kind]
  const KindIcon = kindCfg?.icon

  // Lối tắt "Nhờ AI làm" — mở panel AI của project VÀ gửi luôn (không chờ
  // người dùng gõ lại) 1 tin nhắn mô tả đúng task đang xem. AI đã có đủ
  // instructions (ADR-0009) để tự quyết định cách làm theo đúng "kind".
  const handleAskAI = () => {
    const kindNote = kindCfg ? ` (loại: ${kindCfg.label})` : ''
    const notesNote = task.notes.trim() ? `\nMô tả: ${task.notes.trim()}` : ''
    onAskAI(`Làm task "${task.title}"${kindNote} trong project này.${notesNote}`)
  }

  return (
    <Drawer open onClose={onClose} width={440}>
      <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
        <h3 className="text-sm font-semibold truncate flex-1">{task.title}</h3>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onEdit(task)} title="Sửa"
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors"><Pencil className="h-4 w-4" /></button>
          <button onClick={handleDelete} title="Xoá"
            className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-accent transition-colors"><X className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-5">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => updateTaskStatus(task.id, NEXT_STATUS[task.status])}
            className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', statusCfg.color)}>
            <StatusIcon className={cn('h-3 w-3', task.status === 'in-progress' && 'animate-spin')} />
            {statusCfg.label}
          </button>
          {kindCfg && KindIcon && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-accent text-muted-foreground">
              <KindIcon className="h-3 w-3" /> {kindCfg.label}
            </span>
          )}
          <button onClick={handleAskAI}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-purple-200 text-purple-600 hover:bg-purple-50 transition-colors ml-auto">
            <Sparkles className="h-3 w-3" /> Nhờ AI làm
          </button>
        </div>

        {/* Mô tả */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <h4 className="text-sm font-semibold">Mô tả</h4>
            <button onClick={handleSaveNotes} disabled={!notesDirty || savingNotes}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              <Save className="h-3 w-3" /> {savingNotes ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
          <textarea value={notes} onChange={e => { setNotes(e.target.value); setNotesDirty(true) }} rows={4}
            placeholder="Chưa có mô tả..."
            className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
        </div>

        {/* Đính kèm */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <h4 className="text-sm font-semibold flex items-center gap-1.5"><Paperclip className="h-3.5 w-3.5" /> Đính kèm</h4>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPickerOpen(true)}
                className="px-2.5 py-1 border rounded-lg text-xs font-medium hover:bg-accent transition-colors">Chọn từ Thư viện</button>
              <button onClick={handleUpload} disabled={uploading}
                className="inline-flex items-center gap-1 px-2.5 py-1 border rounded-lg text-xs font-medium hover:bg-accent transition-colors disabled:opacity-50">
                <Upload className="h-3 w-3" /> {uploading ? 'Đang tải...' : 'Tải lên'}
              </button>
            </div>
          </div>
          {taskAttachments.length === 0 ? (
            <div className="text-center text-muted-foreground text-xs py-4 border border-dashed rounded-lg">Chưa có đính kèm</div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2">
              {taskAttachments.map(r => (
                <div key={r.id} className="relative group">
                  <LibraryGridCard resource={r} onOpenFolder={() => {}} onSelect={() => {}} />
                  <button onClick={() => detachResourceFromTask(r.id)} title="Gỡ đính kèm"
                    className="absolute top-1 right-1 p-1 rounded-md bg-background/90 border opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-opacity">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Output */}
        <div>
          <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-1.5"><Package className="h-3.5 w-3.5" /> Output</h4>
          {loadingOutput ? (
            <div className="text-center text-muted-foreground text-xs py-4">Đang tải...</div>
          ) : outputResources.length === 0 ? (
            <div className="text-center text-muted-foreground text-xs py-4 border border-dashed rounded-lg">
              {task.outputFolderId ? 'Chưa có output' : 'Task chưa có thư mục Output riêng — nhấn ✏️ Sửa để gán 1 thư mục trong Thư viện'}
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2">
              {outputResources.map(r => (
                <LibraryGridCard key={r.id} resource={r} onOpenFolder={() => {}} onSelect={() => {}} />
              ))}
            </div>
          )}
        </div>

        {/* Comment */}
        <div>
          <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-1.5"><MessageSquare className="h-3.5 w-3.5" /> Comment</h4>
          <div className="space-y-2 mb-2">
            {taskComments.map(c => (
              <div key={c.id} className="text-xs border rounded-lg px-3 py-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{c.author === 'ai' ? 'AI' : 'Bạn'}</span>
                  <span className="text-muted-foreground">{new Date(c.createdAt).toLocaleString('vi-VN')}</span>
                </div>
                <p className="whitespace-pre-wrap">{c.text}</p>
              </div>
            ))}
            {taskComments.length === 0 && (
              <div className="text-center text-muted-foreground text-xs py-4 border border-dashed rounded-lg">Chưa có comment</div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input type="text" value={commentText} onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSendComment() }}
              placeholder="Viết comment..."
              className="flex-1 px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <button onClick={handleSendComment} disabled={!commentText.trim() || sendingComment}
              className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <ResourcePicker open={pickerOpen} onClose={() => setPickerOpen(false)}
        onSelect={(r) => attachResourceToTask(r.id)} />
    </Drawer>
  )
}

function ProjectNotebook({ project }: { project: Project }) {
  const { updateProject } = useProjectStore()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setDirty(false)
    if (!project.notebookResourceId) {
      setContent('')
      return
    }
    setLoading(true)
    window.api.getLibraryResourceText(project.notebookResourceId).then((text: string | null) => {
      setContent(text ?? '')
      setLoading(false)
    })
  }, [project.notebookResourceId])

  const handleCreate = async () => {
    setSaving(true)
    try {
      const resource = await window.api.createPromptTemplate('Sổ tay dự án', '', { parentId: project.libraryFolderId })
      await updateProject(project.id, { notebookResourceId: resource.id })
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    if (!project.notebookResourceId) return
    setSaving(true)
    try {
      await window.api.updateLibraryResourceContent(project.notebookResourceId, content)
      setDirty(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold flex items-center gap-1.5"><BookOpen className="h-4 w-4" /> Sổ tay dự án</h3>
        {project.notebookResourceId && (
          <button onClick={handleSave} disabled={!dirty || saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
            <Save className="h-3.5 w-3.5" /> {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-2">Nhân vật, mạch truyện, văn phong — AI đọc trước khi làm task mới, và tự cập nhật sau mỗi task quan trọng.</p>
      {project.notebookResourceId ? (
        <textarea value={content} disabled={loading} onChange={e => { setContent(e.target.value); setDirty(true) }}
          rows={8} placeholder="Chưa có nội dung..."
          className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none font-mono" />
      ) : (
        <button onClick={handleCreate} disabled={saving}
          className="px-3 py-2 border rounded-lg text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50">
          {saving ? 'Đang tạo...' : 'Tạo sổ tay'}
        </button>
      )}
    </div>
  )
}

export function ProjectPage() {
  const { projects, activeProject, tasks, loading, fetchProjects, setProject, deleteProject, updateTaskStatus, deleteTask } = useProjectStore()
  const [showCreate, setShowCreate] = useState(false)
  const [taskDialog, setTaskDialog] = useState<{ parentTaskId: string | null; task: Task | null } | null>(null)
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null)
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [pendingAIMessage, setPendingAIMessage] = useState<string | null>(null)
  const navigate = useNavigate()

  // "Nhờ AI làm" từ TaskDetailDrawer — mở panel AI VÀ đặt sẵn tin nhắn để
  // AgentChatPanel tự gửi ngay (xem initialMessage/onInitialMessageSent).
  // Đóng luôn Task Detail — cả 2 đều là Drawer neo bên phải cùng 1 khung,
  // mở đồng thời sẽ chồng lên nhau.
  const handleAskAIFromTask = (message: string) => {
    setPendingAIMessage(message)
    setShowAIPanel(true)
    setDetailTaskId(null)
  }

  useEffect(() => { fetchProjects() }, [])

  const handleDeleteProject = async () => {
    if (!activeProject) return
    if (confirm(`Xoá project "${activeProject.name}"? Mọi task bên trong cũng sẽ bị xoá.`)) {
      await deleteProject(activeProject.id)
    }
  }

  // AI tự sửa project/task qua tool (ADR-0005's domain 'project') — không đi
  // qua action của store, nên refetch lại để UI khớp với DB sau khi 1 tool
  // mutating thật sự thành công.
  const handleAgentToolResult = (toolName: string, _resultText: string, ok: boolean) => {
    if (!ok || !activeProject || !PROJECT_MUTATING_TOOLS.has(toolName)) return
    if (toolName === 'create_project') {
      fetchProjects()
      return
    }
    useProjectStore.getState().fetchTasks(activeProject.id)
    if (toolName === 'update_project_notebook') {
      useProjectStore.getState().setProject(activeProject.id)
    }
  }

  const handleDeleteTask = async (task: Task) => {
    if (confirm(`Xoá task "${task.title}"?`)) {
      await deleteTask(task.id)
    }
  }

  const openInLibrary = () => {
    if (!activeProject) return
    useLibraryStore.getState().setCurrentFolderId(activeProject.libraryFolderId)
    navigate('/library')
  }

  const rootTasks = tasks.filter(t => !t.parentTaskId)
  const detailTask = tasks.find(t => t.id === detailTaskId) ?? null

  return (
    <div className="flex h-full">
      {/* Sidebar — Project List */}
      <div className="w-72 border-r bg-card flex flex-col">
        <div className="p-3 border-b">
          <button onClick={() => setShowCreate(true)}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> Tạo project
          </button>
        </div>

        <div className="flex-1 overflow-auto p-2 space-y-1">
          {projects.map(p => (
            <button key={p.id} onClick={() => setProject(p.id)}
              className={cn(
                'w-full text-left px-3 py-3 rounded-lg text-sm transition-colors',
                activeProject?.id === p.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'
              )}>
              <div className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4 shrink-0" />
                <span className="font-medium truncate flex-1">{p.name}</span>
              </div>
            </button>
          ))}

          {projects.length === 0 && !loading && (
            <div className="text-center text-muted-foreground text-sm py-12">
              <FolderKanban className="h-10 w-10 mx-auto mb-3 opacity-30" />
              Chưa có project
            </div>
          )}
        </div>
      </div>

      {/* Main Area */}
      {activeProject ? (
        <div className="flex-1 relative flex flex-col overflow-auto">
          <div className="h-14 border-b flex items-center justify-between px-5 bg-card shrink-0">
            <h2 className="text-base font-semibold">{activeProject.name}</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowAIPanel((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium hover:bg-accent transition-colors text-purple-600 border-purple-200">
                <Sparkles className="h-3.5 w-3.5" /> AI
              </button>
              <button onClick={openInLibrary}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium hover:bg-accent transition-colors">
                <FolderOpen className="h-3.5 w-3.5" /> Mở trong Thư viện
              </button>
              <button onClick={handleDeleteProject}
                className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Xoá">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {activeProject.description && (
              <p className="text-sm text-muted-foreground">{activeProject.description}</p>
            )}

            <ProjectNotebook project={activeProject} />

            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">Task</h3>
                <button onClick={() => setTaskDialog({ parentTaskId: null, task: null })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors">
                  <Plus className="h-3.5 w-3.5" /> Task mới
                </button>
              </div>

              {rootTasks.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">Chưa có task nào</div>
              ) : (
                <div>
                  {rootTasks.map(task => (
                    <TaskNode key={task.id} task={task} allTasks={tasks} depth={0}
                      onAddChild={(parentId) => setTaskDialog({ parentTaskId: parentId, task: null })}
                      onEdit={(task) => setTaskDialog({ parentTaskId: task.parentTaskId, task })}
                      onDelete={handleDeleteTask}
                      onCycleStatus={(task) => updateTaskStatus(task.id, NEXT_STATUS[task.status])}
                      onOpenDetail={(task) => setDetailTaskId(task.id)} />
                  ))}
                </div>
              )}
            </div>
          </div>

          <AgentChatPanel
            domain="project"
            open={showAIPanel}
            onClose={() => setShowAIPanel(false)}
            buildRunContext={() => ({ projectId: activeProject.id })}
            onToolResult={handleAgentToolResult}
            title="AI dự án"
            description="Luôn đọc sổ tay + cây thư mục + task trước khi làm gì — hỏi AI viết kịch bản tập mới, tạo task, hoặc tóm tắt lại ngữ cảnh dự án."
            suggestions={PROJECT_AGENT_SUGGESTIONS}
            placeholder="Yêu cầu AI về project này..."
            initialMessage={pendingAIMessage}
            onInitialMessageSent={() => setPendingAIMessage(null)}
          />

          {detailTask && (
            <TaskDetailDrawer task={detailTask} project={activeProject}
              onClose={() => setDetailTaskId(null)}
              onEdit={(task) => setTaskDialog({ parentTaskId: task.parentTaskId, task })}
              onAskAI={handleAskAIFromTask} />
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <FolderKanban className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <h2 className="text-xl font-semibold text-foreground">Project</h2>
            <p className="text-sm mt-2">Theo dõi tiến độ sản phẩm dài hơi nhiều phần, giữ AI nhất quán xuyên suốt</p>
            <button onClick={() => setShowCreate(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              <Plus className="h-4 w-4" /> Tạo project đầu tiên
            </button>
          </div>
        </div>
      )}

      {showCreate && <CreateProjectDialog onClose={() => setShowCreate(false)} />}
      {taskDialog && activeProject && (
        <TaskDialog projectId={activeProject.id} parentTaskId={taskDialog.parentTaskId} task={taskDialog.task}
          onClose={() => setTaskDialog(null)} />
      )}
    </div>
  )
}
