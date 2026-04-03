import { Trash2 } from 'lucide-react'
import { useWorkflowStore } from '@/stores/workflow-store'
import { Drawer } from './Drawer'
import { ICON_MAP, CATEGORY_COLORS } from './NodePalette'
import { KeyRecorderInput } from '@/components/KeyRecorderInput'
import { Zap } from 'lucide-react'

export function NodePropertiesPanel() {
  const { activeWorkflow, selectedNodeId, setSelectedNode, updateNodes, nodeDefinitions } = useWorkflowStore()

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
              ) : null}
            </div>
          ))}

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
