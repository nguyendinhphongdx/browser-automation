import { useState, useMemo } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { useVideoStudioStore } from '@/stores/video-studio-store'
import type { VideoNodeDefinition } from '@shared/types'
import { VIDEO_NODE_ICON_MAP } from './VideoStudioNode'

const CATEGORY_LABELS: Record<string, string> = {
  input: 'Đầu vào',
  generate: 'Tạo nội dung',
  post: 'Xử lý/ghép',
  output: 'Đầu ra'
}

interface Props {
  open: boolean
  onClose: () => void
  onAddNode: (nodeType: string, def: VideoNodeDefinition) => void
}

export function VideoNodePalette({ open, onClose, onAddNode }: Props) {
  const nodeDefinitions = useVideoStudioStore((s) => s.nodeDefinitions)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return nodeDefinitions
    const q = search.toLowerCase()
    return nodeDefinitions.filter((d) => d.label.toLowerCase().includes(q) || d.description.toLowerCase().includes(q))
  }, [search, nodeDefinitions])

  const grouped = useMemo(() => {
    const groups: Record<string, VideoNodeDefinition[]> = {}
    for (const def of filtered) {
      groups[def.category] = groups[def.category] || []
      groups[def.category].push(def)
    }
    return groups
  }, [filtered])

  if (!open) return null

  return (
    <div className="absolute top-0 right-0 z-30 h-full w-72 border-l bg-card shadow-xl flex flex-col">
      <div className="flex items-center justify-between px-3 py-2.5 border-b">
        <h3 className="text-sm font-semibold">Thêm node</h3>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-accent transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="px-3 py-2 border-b">
        <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm node..."
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>
      </div>
      <div className="flex-1 overflow-auto p-2 space-y-3">
        {Object.entries(grouped).map(([category, defs]) => (
          <div key={category}>
            <div className="px-2 py-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              {CATEGORY_LABELS[category] || category}
            </div>
            <div className="space-y-0.5">
              {defs.map((def) => {
                const Icon = VIDEO_NODE_ICON_MAP[def.icon] || Plus
                return (
                  <div
                    key={def.type}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/video-studio-node', def.type)
                      e.dataTransfer.effectAllowed = 'move'
                      onClose()
                    }}
                    onClick={() => {
                      onAddNode(def.type, def)
                      onClose()
                    }}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-grab hover:bg-accent transition-colors active:cursor-grabbing"
                    title={def.description}
                  >
                    <div className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center shrink-0">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{def.label}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{def.description}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
