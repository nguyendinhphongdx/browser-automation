import { useEffect, useState } from 'react'
import { Plus, Play, Square, Save, Trash2, Code, GitBranch, FileText, Circle, History, Activity, CalendarClock } from 'lucide-react'
import { useWorkflowStore } from '@/stores/workflow-store'
import { useProfileStore } from '@/stores/profile-store'
import { cn } from '@/lib/utils'
import { VisualEditor } from './VisualEditor'
import { CodeEditor } from './CodeEditor'
import { ExecutionPanel } from './ExecutionPanel'
import { VersionHistory } from './VersionHistory'
import { ExecutionHistory } from './ExecutionHistory'
import { SchedulePanel } from './SchedulePanel'
import { RecorderPanel } from './RecorderPanel'
import type { WorkflowMode } from '@shared/types'

function CreateWorkflowDialog({ onClose }: { onClose: () => void }) {
  const { createWorkflow } = useWorkflowStore()
  const [name, setName] = useState('')
  const [mode, setMode] = useState<WorkflowMode>('visual')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      await createWorkflow({ name: name.trim(), mode })
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
          <h2 className="text-lg font-semibold">Tạo Workflow mới</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-accent transition-colors text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Tên workflow <span className="text-destructive">*</span></label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="VD: Auto login Facebook"
              required className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Chế độ</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setMode('visual')}
                className={cn('flex flex-col items-center gap-2 p-4 rounded-lg border text-sm font-medium transition-colors',
                  mode === 'visual' ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:bg-accent')}>
                <GitBranch className="h-6 w-6" />
                Kéo thả
              </button>
              <button type="button" onClick={() => setMode('code')}
                className={cn('flex flex-col items-center gap-2 p-4 rounded-lg border text-sm font-medium transition-colors',
                  mode === 'code' ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:bg-accent')}>
                <Code className="h-6 w-6" />
                Viết code
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-accent transition-colors">Huỷ</button>
            <button type="submit" disabled={loading || !name.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {loading ? 'Đang tạo...' : 'Tạo Workflow'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function AutomationPage() {
  const {
    workflows, activeWorkflow, isRunning, loading,
    fetchWorkflows, fetchNodeDefinitions, setActiveWorkflow,
    saveWorkflow, deleteWorkflow, runWorkflow, stopWorkflow
  } = useWorkflowStore()
  const { profiles, fetchProfiles } = useProfileStore()
  const [showCreate, setShowCreate] = useState(false)
  const [selectedProfileId, setSelectedProfileId] = useState<string>('')
  const [showLogs, setShowLogs] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showSchedules, setShowSchedules] = useState(false)

  useEffect(() => {
    fetchWorkflows()
    fetchNodeDefinitions()
    fetchProfiles()
  }, [])

  const handleSave = async () => {
    if (!activeWorkflow) return
    await saveWorkflow({
      nodes: activeWorkflow.nodes,
      edges: activeWorkflow.edges,
      code: activeWorkflow.code
    })
  }

  const handleRun = async () => {
    await runWorkflow(selectedProfileId || '')
  }

  const handleDelete = async () => {
    if (!activeWorkflow) return
    if (confirm(`Xoá workflow "${activeWorkflow.name}"?`)) {
      await deleteWorkflow(activeWorkflow.id)
    }
  }

  return (
    <div className="flex h-full">
      {/* Sidebar: Workflow List */}
      <div className="w-64 border-r bg-card flex flex-col">
        <div className="p-3 border-b">
          <button onClick={() => setShowCreate(true)}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> Tạo Workflow
          </button>
        </div>
        <div className="flex-1 overflow-auto p-2 space-y-1">
          {workflows.map(wf => (
            <button key={wf.id} onClick={() => setActiveWorkflow(wf.id)}
              className={cn(
                'w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors',
                activeWorkflow?.id === wf.id
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-accent'
              )}>
              <div className="flex items-center gap-2">
                {wf.mode === 'visual' ? <GitBranch className="h-3.5 w-3.5" /> : <Code className="h-3.5 w-3.5" />}
                <span className="truncate">{wf.name}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 ml-5.5">
                {wf.mode === 'visual' ? 'Kéo thả' : 'Code'} · {wf.nodes.length} node
              </div>
            </button>
          ))}
          {workflows.length === 0 && !loading && (
            <div className="text-center text-muted-foreground text-sm py-8">
              Chưa có workflow
            </div>
          )}
        </div>

        {/* Recorder */}
        <div className="p-2 border-t">
          <RecorderPanel />
        </div>

        {/* Schedules toggle */}
        <div className="p-2 border-t">
          <button
            onClick={() => setShowSchedules(!showSchedules)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
              showSchedules ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'
            )}
          >
            <CalendarClock className="h-3.5 w-3.5" />
            Schedules
          </button>
        </div>
      </div>

      {/* Schedules side panel */}
      {showSchedules && (
        <div className="w-80 border-r bg-card overflow-auto">
          <SchedulePanel />
        </div>
      )}

      {/* Main Area */}
      {activeWorkflow ? (
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="h-12 border-b flex items-center justify-between px-4 bg-card">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold">{activeWorkflow.name}</h2>
              <span className="text-xs text-muted-foreground px-2 py-0.5 bg-secondary rounded">
                {activeWorkflow.mode === 'visual' ? 'Visual' : 'Code'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Profile selector */}
              <select value={selectedProfileId} onChange={e => setSelectedProfileId(e.target.value)}
                className="px-2 py-1.5 border rounded-lg bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring min-w-[150px]">
                <option value="">Default browser</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              {isRunning ? (
                <button onClick={stopWorkflow}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-destructive text-destructive-foreground rounded-lg text-xs font-medium hover:bg-destructive/90 transition-colors">
                  <Square className="h-3 w-3" /> Dừng
                </button>
              ) : (
                <button onClick={handleRun}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors">
                  <Play className="h-3 w-3" /> Chạy
                </button>
              )}

              <button onClick={handleSave}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium hover:bg-accent transition-colors">
                <Save className="h-3 w-3" /> Lưu
              </button>

              <button onClick={() => setShowLogs(!showLogs)}
                className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors",
                  showLogs ? 'bg-primary/10 text-primary' : 'hover:bg-accent')}>
                <FileText className="h-3 w-3" /> Logs
              </button>

              <button onClick={() => setShowVersions(!showVersions)}
                className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors",
                  showVersions ? 'bg-primary/10 text-primary' : 'hover:bg-accent')}>
                <History className="h-3 w-3" /> Versions
              </button>

              <button onClick={() => setShowHistory(!showHistory)}
                className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors",
                  showHistory ? 'bg-primary/10 text-primary' : 'hover:bg-accent')}>
                <Activity className="h-3 w-3" /> History
              </button>

              <button onClick={handleDelete}
                className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Editor Area */}
          <div className="flex-1 relative overflow-hidden">
            {activeWorkflow.mode === 'visual' ? (
              <VisualEditor />
            ) : (
              <CodeEditor />
            )}

            {/* Logs drawer */}
            <ExecutionPanel open={showLogs} onClose={() => setShowLogs(false)} />

            {/* Version history drawer */}
            {showVersions && (
              <div className="absolute right-0 top-0 bottom-0 w-80 bg-card border-l shadow-lg z-20 overflow-auto">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <span className="text-sm font-semibold">Lịch sử phiên bản</span>
                  <button onClick={() => setShowVersions(false)} className="text-lg hover:text-foreground text-muted-foreground">&times;</button>
                </div>
                <VersionHistory />
              </div>
            )}

            {/* Execution history drawer */}
            {showHistory && (
              <div className="absolute right-0 top-0 bottom-0 w-96 bg-card border-l shadow-lg z-20 overflow-auto">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <span className="text-sm font-semibold">Lịch sử chạy</span>
                  <button onClick={() => setShowHistory(false)} className="text-lg hover:text-foreground text-muted-foreground">&times;</button>
                </div>
                <ExecutionHistory workflowId={activeWorkflow.id} />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <GitBranch className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <h2 className="text-xl font-semibold text-foreground">Automation Builder</h2>
            <p className="text-sm mt-2">Chọn workflow từ danh sách hoặc tạo mới</p>
          </div>
        </div>
      )}

      {showCreate && <CreateWorkflowDialog onClose={() => setShowCreate(false)} />}
    </div>
  )
}
