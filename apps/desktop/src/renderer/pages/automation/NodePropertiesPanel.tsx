import { useState, useEffect, useCallback } from 'react'
import { Trash2, ChevronDown, ChevronRight, BarChart3 } from 'lucide-react'
import { useWorkflowStore } from '@/stores/workflow-store'
import { Drawer } from './Drawer'
import { ICON_MAP, CATEGORY_COLORS } from './NodePalette'
import { KeyRecorderInput } from '@/components/KeyRecorderInput'
import { Zap } from 'lucide-react'
import type { NodeRetryConfig, Workflow } from '@shared/types'

export function NodePropertiesPanel() {
  const { activeWorkflow, selectedNodeId, setSelectedNode, updateNodes, nodeDefinitions } = useWorkflowStore()
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [retryOpen, setRetryOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const [nodeStats, setNodeStats] = useState<any>(null)

  // Load workflows for workflow-select field
  useEffect(() => {
    window.api.getWorkflows?.()?.then?.((wfs: Workflow[]) => setWorkflows(wfs || []))?.catch?.(() => {})
  }, [selectedNodeId])

  // Load node performance stats
  const loadNodeStats = useCallback(async () => {
    if (!activeWorkflow || !selectedNodeId) return
    try {
      const stats = await window.api.getNodeInstanceStats(activeWorkflow.id, selectedNodeId)
      setNodeStats(stats)
    } catch { setNodeStats(null) }
  }, [activeWorkflow?.id, selectedNodeId])

  useEffect(() => {
    if (statsOpen) loadNodeStats()
  }, [statsOpen, loadNodeStats])

  const open = !!(activeWorkflow && selectedNodeId)
  const node = activeWorkflow?.nodes.find(n => n.id === selectedNodeId)
  const nodeType = node ? ((node.data as any).nodeType || node.type) : ''
  const definition = nodeDefinitions.find((d: any) => d.type === nodeType)
  const config = node?.data.config || {}
  const color = CATEGORY_COLORS[node?.data.category || ''] || '#6B7280'
  const Icon = ICON_MAP[(node?.data as any)?.icon || definition?.icon] || Zap

  const updateConfig = (key: string, value: any) => {
    if (!activeWorkflow || !selectedNodeId) return
    const updatedNodes = activeWorkflow.nodes.map(n => {
      if (n.id !== selectedNodeId) return n
      return {
        ...n,
        data: {
          ...n.data,
          config: { ...n.data.config, [key]: value }
        }
      }
    })
    updateNodes(updatedNodes)
  }

  const retryConfig: NodeRetryConfig = node?.data.retryConfig || {
    maxRetries: 0, backoffStrategy: 'fixed', backoffBaseMs: 1000, backoffMaxMs: 30000
  }

  const updateRetryConfig = (key: keyof NodeRetryConfig, value: any) => {
    if (!activeWorkflow || !selectedNodeId) return
    const updatedNodes = activeWorkflow.nodes.map(n => {
      if (n.id !== selectedNodeId) return n
      return {
        ...n,
        data: {
          ...n.data,
          retryConfig: { ...retryConfig, [key]: value }
        }
      }
    })
    updateNodes(updatedNodes)
  }

  const deleteNode = () => {
    if (!activeWorkflow || !selectedNodeId) return
    const updatedNodes = activeWorkflow.nodes.filter(n => n.id !== selectedNodeId)
    const updatedEdges = activeWorkflow.edges.filter(
      e => e.source !== selectedNodeId && e.target !== selectedNodeId
    )
    updateNodes(updatedNodes)
    useWorkflowStore.getState().updateEdges(updatedEdges)
    setSelectedNode(null)
  }

  const headerContent = node ? (
    <div className="flex items-center gap-3 px-4 h-12 border-b shrink-0">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: color + '15' }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{node.data.label}</div>
      </div>
    </div>
  ) : null

  return (
    <Drawer open={open} onClose={() => setSelectedNode(null)} width={380}>
      {/* Custom header */}
      {headerContent}

      {node && (
        <div className="p-4 space-y-5">
          {/* Description */}
          {definition?.description && (
            <div className="text-xs text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2">
              {definition.description}
            </div>
          )}

          {/* Config fields */}
          {(definition?.configSchema || []).map((field: any) => (
            <div key={field.key}>
              <label className="block text-xs font-medium mb-1.5 text-foreground">
                {field.label}
                {field.required && <span className="text-destructive ml-0.5">*</span>}
              </label>

              {field.type === 'keyrecorder' ? (
                <KeyRecorderInput
                  value={config[field.key] || ''}
                  onChange={v => updateConfig(field.key, v)}
                  placeholder={field.placeholder}
                />
              ) : field.type === 'text' || field.type === 'selector' ? (
                <input
                  type="text"
                  value={config[field.key] || ''}
                  onChange={e => updateConfig(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 border rounded-lg bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                />
              ) : field.type === 'number' ? (
                <input
                  type="number"
                  value={config[field.key] ?? field.defaultValue ?? ''}
                  onChange={e => updateConfig(field.key, Number(e.target.value))}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 border rounded-lg bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                />
              ) : field.type === 'select' ? (
                <select
                  value={config[field.key] ?? field.defaultValue ?? ''}
                  onChange={e => updateConfig(field.key, e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                >
                  {(field.options || []).map((opt: any) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : field.type === 'boolean' ? (
                <label className="flex items-center gap-2.5 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={config[field.key] ?? field.defaultValue ?? false}
                    onChange={e => updateConfig(field.key, e.target.checked)}
                    className="rounded border-border w-4 h-4"
                  />
                  <span className="text-xs text-muted-foreground">{field.label}</span>
                </label>
              ) : field.type === 'code' ? (
                <textarea
                  value={config[field.key] || ''}
                  onChange={e => updateConfig(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring resize-none transition-shadow"
                />
              ) : field.type === 'workflow-select' ? (
                <select
                  value={config[field.key] || ''}
                  onChange={e => updateConfig(field.key, e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                >
                  <option value="">-- Chọn workflow --</option>
                  {workflows
                    .filter(w => w.id !== activeWorkflow?.id) // prevent self-reference
                    .map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                </select>
              ) : field.type === 'variable-mapping' ? (
                <textarea
                  value={
                    typeof config[field.key] === 'object'
                      ? Object.entries(config[field.key] || {}).map(([k, v]) => `${k}:${v}`).join('\n')
                      : config[field.key] || ''
                  }
                  onChange={e => {
                    const mapping: Record<string, string> = {}
                    e.target.value.split('\n').filter(Boolean).forEach(line => {
                      const [left, right] = line.split(':').map(s => s.trim())
                      if (left && right) mapping[left] = right
                    })
                    updateConfig(field.key, mapping)
                  }}
                  placeholder={field.placeholder || 'parentVar:childVar (mỗi dòng 1 cặp)'}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring resize-none transition-shadow"
                />
              ) : null}
            </div>
          ))}

          {/* Retry / Error Handling */}
          <div className="border rounded-lg">
            <button
              onClick={() => setRetryOpen(!retryOpen)}
              className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Retry / Error Handling</span>
              {retryOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
            {retryOpen && (
              <div className="px-3 pb-3 space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Số lần retry</label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={retryConfig.maxRetries}
                    onChange={e => updateRetryConfig('maxRetries', Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                  />
                </div>
                {retryConfig.maxRetries > 0 && (
                  <>
                    <div>
                      <label className="block text-xs font-medium mb-1">Backoff strategy</label>
                      <select
                        value={retryConfig.backoffStrategy}
                        onChange={e => updateRetryConfig('backoffStrategy', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                      >
                        <option value="fixed">Fixed</option>
                        <option value="linear">Linear</option>
                        <option value="exponential">Exponential</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Delay cơ bản (ms)</label>
                      <input
                        type="number"
                        min={100}
                        value={retryConfig.backoffBaseMs}
                        onChange={e => updateRetryConfig('backoffBaseMs', Number(e.target.value))}
                        className="w-full px-3 py-2 border rounded-lg bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Delay tối đa (ms)</label>
                      <input
                        type="number"
                        min={1000}
                        value={retryConfig.backoffMaxMs}
                        onChange={e => updateRetryConfig('backoffMaxMs', Number(e.target.value))}
                        className="w-full px-3 py-2 border rounded-lg bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Performance Stats */}
          <div className="border rounded-lg">
            <button
              onClick={() => setStatsOpen(!statsOpen)}
              className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-1.5"><BarChart3 className="h-3 w-3" /> Performance</span>
              {statsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
            {statsOpen && nodeStats && (
              <div className="px-3 pb-3 space-y-2">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-secondary/50 rounded-md px-2 py-1.5">
                    <div className="text-[10px] text-muted-foreground">Runs</div>
                    <div className="text-xs font-semibold">{nodeStats.total}</div>
                  </div>
                  <div className="bg-secondary/50 rounded-md px-2 py-1.5">
                    <div className="text-[10px] text-muted-foreground">Success</div>
                    <div className="text-xs font-semibold text-green-600">
                      {nodeStats.total > 0 ? Math.round(nodeStats.successRate * 100) : 0}%
                    </div>
                  </div>
                  <div className="bg-secondary/50 rounded-md px-2 py-1.5">
                    <div className="text-[10px] text-muted-foreground">Avg</div>
                    <div className="text-xs font-semibold">{nodeStats.avgTimeMs}ms</div>
                  </div>
                </div>
                {nodeStats.runs?.length > 0 && (
                  <div className="space-y-1 max-h-32 overflow-auto">
                    <div className="text-[10px] text-muted-foreground font-medium">Recent runs:</div>
                    {nodeStats.runs.slice(0, 8).map((r: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-[10px]">
                        <span className={r.success ? 'text-green-600' : 'text-red-500'}>
                          {r.success ? 'OK' : 'FAIL'}
                        </span>
                        <span className="text-muted-foreground">{r.executionTimeMs}ms</span>
                        <span className="text-muted-foreground">
                          {new Date(r.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {nodeStats.total === 0 && (
                  <div className="text-[10px] text-muted-foreground text-center py-1">Chưa có dữ liệu</div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pt-3 border-t space-y-2">
            <div className="text-[10px] text-muted-foreground font-mono">
              ID: {node.id}
            </div>
            <button
              onClick={deleteNode}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 border border-destructive/30 text-destructive rounded-lg text-xs font-medium hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              Xoá node này
            </button>
          </div>
        </div>
      )}
    </Drawer>
  )
}
