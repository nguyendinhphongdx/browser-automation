import { useState, useEffect, useCallback } from 'react'
import { History, RotateCcw, Tag, ChevronDown, ChevronRight } from 'lucide-react'
import { useWorkflowStore } from '@/stores/workflow-store'
import type { WorkflowVersion } from '@shared/types'

export function VersionHistory() {
  const { activeWorkflow } = useWorkflowStore()
  const [versions, setVersions] = useState<WorkflowVersion[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const loadVersions = useCallback(async () => {
    if (!activeWorkflow) return
    setLoading(true)
    try {
      const result = await window.api.getWorkflowVersions(activeWorkflow.id)
      setVersions(result || [])
    } catch {
      setVersions([])
    } finally {
      setLoading(false)
    }
  }, [activeWorkflow?.id])

  useEffect(() => {
    loadVersions()
  }, [loadVersions])

  const handleRollback = async (versionId: string) => {
    if (!activeWorkflow) return
    if (!confirm('Rollback về version này? (Version hiện tại sẽ được lưu lại)')) return

    try {
      await window.api.rollbackWorkflow(activeWorkflow.id, versionId)
      // Refresh the active workflow in store
      await useWorkflowStore.getState().setActiveWorkflow(activeWorkflow.id)
      await loadVersions()
    } catch (err) {
      alert('Rollback thất bại: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  const handleLabel = async (versionId: string) => {
    const label = prompt('Nhập nhãn cho version này:')
    if (label === null) return
    await window.api.labelWorkflowVersion(versionId, label)
    await loadVersions()
  }

  if (!activeWorkflow) return null

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <History className="h-4 w-4" />
        Lịch sử phiên bản
      </div>

      {loading && <div className="text-xs text-muted-foreground">Đang tải...</div>}

      {!loading && versions.length === 0 && (
        <div className="text-xs text-muted-foreground py-4 text-center">
          Chưa có lịch sử. Các phiên bản sẽ được tạo tự động khi bạn sửa workflow.
        </div>
      )}

      <div className="space-y-1">
        {versions.map(v => {
          const isExpanded = expanded === v.id
          const nodeCount = v.nodes.length
          const edgeCount = v.edges.length
          const date = new Date(v.createdAt)
          const timeStr = date.toLocaleString('vi-VN', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
          })

          return (
            <div key={v.id} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => setExpanded(isExpanded ? null : v.id)}
                className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-accent/50 transition-colors"
              >
                {isExpanded
                  ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium">
                    v{v.versionNumber}
                    {v.label && (
                      <span className="ml-1.5 text-muted-foreground font-normal">— {v.label}</span>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {timeStr} · {nodeCount} nodes · {edgeCount} edges
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="px-3 pb-2 flex gap-1.5">
                  <button
                    onClick={() => handleRollback(v.id)}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium border rounded-md hover:bg-accent transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Rollback
                  </button>
                  <button
                    onClick={() => handleLabel(v.id)}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium border rounded-md hover:bg-accent transition-colors"
                  >
                    <Tag className="h-3 w-3" />
                    {v.label ? 'Sửa nhãn' : 'Gán nhãn'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
