import { X } from 'lucide-react'
import { useWorkflowStore } from '@/stores/workflow-store'

export function NodePropertiesPanel() {
  const { activeWorkflow, selectedNodeId, setSelectedNode, updateNodes, nodeDefinitions } = useWorkflowStore()

  if (!activeWorkflow || !selectedNodeId) return null

  const node = activeWorkflow.nodes.find(n => n.id === selectedNodeId)
  if (!node) return null

  const definition = nodeDefinitions.find((d: any) => d.type === node.type)
  const config = node.data.config || {}

  const updateConfig = (key: string, value: any) => {
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
    const updatedNodes = activeWorkflow.nodes.filter(n => n.id !== selectedNodeId)
    const updatedEdges = activeWorkflow.edges.filter(
      e => e.source !== selectedNodeId && e.target !== selectedNodeId
    )
    updateNodes(updatedNodes)
    // Also update edges through the store
    const store = useWorkflowStore.getState()
    store.updateEdges(updatedEdges)
    setSelectedNode(null)
  }

  return (
    <div className="w-72 border-l bg-card overflow-auto">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="text-sm font-semibold">{node.data.label}</h3>
        <button onClick={() => setSelectedNode(null)} className="p-1 rounded-md hover:bg-accent transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-3 space-y-4">
        {/* Node info */}
        <div className="text-xs text-muted-foreground">
          {definition?.description || 'Node configuration'}
        </div>

        {/* Config fields */}
        {(definition?.configSchema || []).map((field: any) => (
          <div key={field.key}>
            <label className="block text-xs font-medium mb-1">
              {field.label}
              {field.required && <span className="text-destructive"> *</span>}
            </label>

            {field.type === 'text' || field.type === 'selector' ? (
              <input
                type="text"
                value={config[field.key] || ''}
                onChange={e => updateConfig(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full px-2 py-1.5 border rounded-md bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              />
            ) : field.type === 'number' ? (
              <input
                type="number"
                value={config[field.key] ?? field.defaultValue ?? ''}
                onChange={e => updateConfig(field.key, Number(e.target.value))}
                placeholder={field.placeholder}
                className="w-full px-2 py-1.5 border rounded-md bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              />
            ) : field.type === 'select' ? (
              <select
                value={config[field.key] ?? field.defaultValue ?? ''}
                onChange={e => updateConfig(field.key, e.target.value)}
                className="w-full px-2 py-1.5 border rounded-md bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {(field.options || []).map((opt: any) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : field.type === 'boolean' ? (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config[field.key] ?? field.defaultValue ?? false}
                  onChange={e => updateConfig(field.key, e.target.checked)}
                  className="rounded border-border"
                />
                <span className="text-xs text-muted-foreground">{field.label}</span>
              </label>
            ) : field.type === 'code' ? (
              <textarea
                value={config[field.key] || ''}
                onChange={e => updateConfig(field.key, e.target.value)}
                placeholder={field.placeholder}
                rows={3}
                className="w-full px-2 py-1.5 border rounded-md bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            ) : null}
          </div>
        ))}

        {/* Delete button */}
        <div className="pt-2 border-t">
          <button onClick={deleteNode}
            className="w-full px-3 py-2 border border-destructive/30 text-destructive rounded-lg text-xs font-medium hover:bg-destructive/10 transition-colors">
            Xoá node này
          </button>
        </div>
      </div>
    </div>
  )
}
