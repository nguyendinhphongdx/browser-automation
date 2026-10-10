import { useEffect, useState } from 'react'
import { Trash2, X, Link as LinkIcon } from 'lucide-react'
import { useVideoStudioStore } from '@/stores/video-studio-store'
import type { LibraryResource, ConfigField } from '@shared/types'

export function VideoNodePropertiesPanel() {
  const { activePipeline, selectedNodeId, setSelectedNode, updateNodes, nodeDefinitions } = useVideoStudioStore()
  const [resources, setResources] = useState<LibraryResource[]>([])

  useEffect(() => {
    window.api.getLibraryResources?.()?.then?.((rs: LibraryResource[]) => setResources(rs || []))?.catch?.(() => {})
  }, [selectedNodeId])

  const node = activePipeline?.nodes.find((n) => n.id === selectedNodeId)
  if (!node) return null

  const definition = nodeDefinitions.find((d) => d.type === node.data.nodeType)
  const config = node.data.config || {}

  const updateConfig = (key: string, value: unknown) => {
    if (!activePipeline) return
    const updatedNodes = activePipeline.nodes.map((n) =>
      n.id === node.id ? { ...n, data: { ...n.data, config: { ...n.data.config, [key]: value } } } : n
    )
    updateNodes(updatedNodes)
  }

  const deleteNode = () => {
    if (!activePipeline) return
    updateNodes(activePipeline.nodes.filter((n) => n.id !== node.id))
    setSelectedNode(null)
  }

  const isSocketConnected = (fieldKey: string) =>
    (activePipeline?.edges || []).some((e) => e.target === node.id && e.targetHandle === fieldKey)

  const sourceLabelFor = (fieldKey: string) => {
    const edge = activePipeline?.edges.find((e) => e.target === node.id && e.targetHandle === fieldKey)
    if (!edge) return ''
    return activePipeline?.nodes.find((n) => n.id === edge.source)?.data.label || edge.source
  }

  return (
    <div className="absolute top-0 right-0 z-30 h-full w-80 border-l bg-card shadow-xl flex flex-col">
      <div className="flex items-center justify-between px-3 py-2.5 border-b">
        <h3 className="text-sm font-semibold truncate">{node.data.label}</h3>
        <button onClick={() => setSelectedNode(null)} className="p-1 rounded-md hover:bg-accent transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-4">
        {definition?.description && (
          <p className="text-xs text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2">{definition.description}</p>
        )}

        {(definition?.configSchema || []).map((field: ConfigField) => {
          const connected = isSocketConnected(field.key)

          return (
            <div key={field.key}>
              <label className="block text-xs font-medium mb-1.5">
                {field.label}
                {field.required && <span className="text-destructive ml-0.5">*</span>}
              </label>

              {connected ? (
                <div className="flex items-center gap-1.5 px-3 py-2 border border-dashed rounded-lg bg-secondary/30 text-xs text-muted-foreground">
                  <LinkIcon className="h-3 w-3 shrink-0" />
                  Đang nối từ &quot;{sourceLabelFor(field.key)}&quot;
                </div>
              ) : field.type === 'text' ? (
                <input
                  type="text"
                  value={config[field.key] || ''}
                  onChange={(e) => updateConfig(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 border rounded-lg bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                />
              ) : field.type === 'number' ? (
                <input
                  type="number"
                  value={config[field.key] ?? field.defaultValue ?? ''}
                  onChange={(e) => updateConfig(field.key, Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                />
              ) : field.type === 'select' ? (
                <select
                  value={config[field.key] ?? field.defaultValue ?? ''}
                  onChange={(e) => updateConfig(field.key, e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {(field.options || []).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : field.type === 'resource-select' ? (
                <select
                  value={config[field.key] || ''}
                  onChange={(e) => updateConfig(field.key, e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">-- Chọn tài nguyên --</option>
                  {resources
                    .filter((r) => r.kind !== 'folder' && (!field.resourceKind || r.kind === field.resourceKind))
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </select>
              ) : null}
            </div>
          )
        })}
      </div>

      <div className="p-3 border-t">
        <button
          onClick={deleteNode}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 border border-destructive/30 text-destructive rounded-lg text-xs font-medium hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="h-3 w-3" />
          Xoá node này
        </button>
      </div>
    </div>
  )
}
