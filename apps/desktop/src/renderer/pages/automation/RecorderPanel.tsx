import { useState } from 'react'
import { Circle, Square, Save, Trash2, MousePointer, Type, Globe, Loader2 } from 'lucide-react'
import { useProfileStore } from '@/stores/profile-store'
import { useWorkflowStore } from '@/stores/workflow-store'

interface RecordedAction {
  type: string
  timestamp: number
  selector?: string
  value?: string
  url?: string
  description: string
}

const ACTION_ICONS: Record<string, typeof MousePointer> = {
  click: MousePointer,
  type: Type,
  navigate: Globe,
  select: MousePointer,
  scroll: MousePointer,
  wait: Loader2,
}

export function RecorderPanel() {
  const { profiles } = useProfileStore()
  const { createWorkflow, fetchWorkflows } = useWorkflowStore()
  const [recording, setRecording] = useState(false)
  const [actions, setActions] = useState<RecordedAction[]>([])
  const [profileId, setProfileId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleStart = async () => {
    if (!profileId) {
      setError('Chọn profile đã mở browser trước')
      return
    }
    setError('')
    try {
      await window.api.startRecording(profileId)
      setRecording(true)
      setActions([])

      // Poll actions mỗi 1s
      const interval = setInterval(async () => {
        try {
          const status = await window.api.getRecorderStatus()
          if (!status.recording) {
            clearInterval(interval)
            return
          }
          setActions(status.actions || [])
        } catch {
          clearInterval(interval)
        }
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleStop = async () => {
    try {
      const result = await window.api.stopRecording()
      setRecording(false)
      setActions(result.actions || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleSaveAsWorkflow = async () => {
    if (actions.length === 0) return
    setSaving(true)
    try {
      const { nodes, edges } = await window.api.actionsToWorkflow(actions)
      const workflow = await createWorkflow({
        name: `Recorded ${new Date().toLocaleString('vi-VN')}`,
        mode: 'visual',
      })
      // Cập nhật workflow với nodes/edges từ recording
      await window.api.updateWorkflow(workflow.id, { nodes, edges, status: 'ready' })
      await fetchWorkflows()
      setActions([])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border rounded-xl bg-card">
      <div className="p-4 border-b">
        <h3 className="text-sm font-semibold mb-3">Ghi lại thao tác</h3>

        {/* Profile selector */}
        <div className="flex items-center gap-2 mb-3">
          <select
            value={profileId}
            onChange={(e) => setProfileId(e.target.value)}
            disabled={recording}
            className="flex-1 px-2 py-1.5 border rounded-lg bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Chọn profile (browser đang mở)...</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {recording ? (
            <button
              onClick={handleStop}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-destructive text-destructive-foreground rounded-lg text-xs font-medium hover:bg-destructive/90 transition-colors"
            >
              <Square className="h-3 w-3" />
              Dừng ghi
            </button>
          ) : (
            <button
              onClick={handleStart}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors"
            >
              <Circle className="h-3 w-3 fill-current" />
              Bắt đầu ghi
            </button>
          )}

          {actions.length > 0 && !recording && (
            <>
              <button
                onClick={handleSaveAsWorkflow}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Save className="h-3 w-3" />
                {saving ? 'Đang lưu...' : 'Lưu workflow'}
              </button>
              <button
                onClick={() => setActions([])}
                className="p-2 border rounded-lg hover:bg-accent transition-colors"
                title="Xoá"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </>
          )}
        </div>

        {error && (
          <p className="mt-2 text-xs text-destructive">{error}</p>
        )}

        {recording && (
          <div className="mt-2 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span className="text-xs text-red-500 font-medium">
              Đang ghi... Thao tác trên browser sẽ được ghi lại
            </span>
          </div>
        )}
      </div>

      {/* Recorded actions list */}
      {actions.length > 0 && (
        <div className="max-h-60 overflow-auto p-2 space-y-1">
          {actions.map((action, i) => {
            const Icon = ACTION_ICONS[action.type] || MousePointer
            return (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-xs"
              >
                <span className="text-muted-foreground font-mono w-5 text-right">{i + 1}</span>
                <Icon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{action.description}</span>
              </div>
            )
          })}
        </div>
      )}

      {actions.length === 0 && !recording && (
        <div className="p-6 text-center text-xs text-muted-foreground">
          Nhấn "Bắt đầu ghi" rồi thao tác trên browser. Các hành động sẽ hiện ở đây.
        </div>
      )}
    </div>
  )
}
