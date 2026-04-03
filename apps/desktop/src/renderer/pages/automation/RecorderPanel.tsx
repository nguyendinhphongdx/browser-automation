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
  const { activeWorkflow, createWorkflow, fetchWorkflows, setActiveWorkflow, updateNodes, updateEdges } = useWorkflowStore()
  const [recording, setRecording] = useState(false)
  const [actions, setActions] = useState<RecordedAction[]>([])
  const [profileId, setProfileId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleStart = async () => {
    if (!profileId) {
      setError('Chọn profile đã mở browser')
      return
    }
    setError('')
    try {
      await window.api.startRecording(profileId)
      setRecording(true)
      setActions([])
      const interval = setInterval(async () => {
        try {
          const status = await window.api.getRecorderStatus()
          if (!status.recording) { clearInterval(interval); return }
          setActions(status.actions || [])
        } catch { clearInterval(interval) }
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

  const handleSave = async () => {
    if (actions.length === 0) return
    setSaving(true)
    try {
      const { nodes: newNodes, edges: newEdges } = await window.api.actionsToWorkflow(actions)

      if (activeWorkflow) {
        const existingNodes = activeWorkflow.nodes
        const existingEdges = activeWorkflow.edges
        const sources = new Set(existingEdges.map(e => e.source))
        const lastNode = existingNodes.filter(n => !sources.has(n.id)).pop()

        const offsetX = lastNode ? lastNode.position.x + 250 : 80
        const offsetY = lastNode ? lastNode.position.y : 200
        const offsetNodes = newNodes.map((n, i) => ({
          ...n,
          position: { x: offsetX + i * 250, y: offsetY }
        }))

        const bridgeEdges = []
        if (lastNode && offsetNodes.length > 0) {
          bridgeEdges.push({
            id: `e-bridge-${Date.now()}`,
            source: lastNode.id,
            target: offsetNodes[0].id,
          })
        }

        updateNodes([...existingNodes, ...offsetNodes])
        updateEdges([...existingEdges, ...bridgeEdges, ...newEdges])
      } else {
        const workflow = await createWorkflow({
          name: `Recorded ${new Date().toLocaleString('vi-VN')}`,
          mode: 'visual',
        })
        await window.api.updateWorkflow(workflow.id, { nodes: newNodes, edges: newEdges, status: 'ready' })
        await fetchWorkflows()
        await setActiveWorkflow(workflow.id)
      }
      setActions([])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const hasActions = actions.length > 0 && !recording

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Ghi thao tác</h3>

      {/* Profile selector */}
      <select
        value={profileId}
        onChange={(e) => setProfileId(e.target.value)}
        disabled={recording}
        className="w-full px-2 py-1.5 border rounded-lg bg-background text-[11px] focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">Chọn profile...</option>
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      {/* Record / Stop button */}
      {recording ? (
        <button onClick={handleStop}
          className="w-full flex items-center justify-center gap-2 px-2 py-2 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors">
          <Square className="h-3 w-3" /> Dừng ghi
          <span className="relative flex h-2 w-2 ml-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </span>
        </button>
      ) : (
        <button onClick={handleStart}
          className="w-full flex items-center justify-center gap-2 px-2 py-2 border-2 border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors">
          <Circle className="h-3 w-3 fill-current" /> Bắt đầu ghi
        </button>
      )}

      {/* Save / Clear buttons */}
      {hasActions && (
        <div className="flex gap-1.5">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-primary text-primary-foreground rounded-lg text-[11px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
            <Save className="h-3 w-3" />
            {saving ? 'Lưu...' : `Lưu (${actions.length})`}
          </button>
          <button onClick={() => setActions([])}
            className="px-2 py-1.5 border rounded-lg hover:bg-accent transition-colors" title="Xoá">
            <Trash2 className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Error */}
      {error && <p className="text-[10px] text-destructive px-1">{error}</p>}

      {/* Actions count while recording */}
      {recording && actions.length > 0 && (
        <div className="text-[10px] text-muted-foreground text-center">
          {actions.length} thao tác đã ghi
        </div>
      )}

      {/* Mini action list */}
      {hasActions && (
        <div className="max-h-32 overflow-auto border rounded-lg divide-y">
          {actions.map((action, i) => {
            const Icon = ACTION_ICONS[action.type] || MousePointer
            return (
              <div key={i} className="flex items-center gap-1.5 px-2 py-1 text-[10px]">
                <span className="text-muted-foreground font-mono w-3 text-right shrink-0">{i + 1}</span>
                <Icon className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                <span className="truncate">{action.description}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
