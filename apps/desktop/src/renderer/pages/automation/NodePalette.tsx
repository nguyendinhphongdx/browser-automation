import { useState, useMemo, useRef, useEffect } from 'react'
import { useWorkflowStore } from '@/stores/workflow-store'
import { Drawer } from './Drawer'
import {
  Plus, Search,
  Globe, ArrowLeftRight, PanelTop, ArrowRightLeft, PanelTopClose, Camera, Maximize, Power,
  MousePointerClick, MousePointer2, Keyboard, Command, ArrowDownUp, Hand, ListFilter,
  CheckSquare, Upload, GripVertical,
  Type, Code2, Link, Heading, Hash, Variable, FileCode, Table,
  GitBranch, Repeat, ListOrdered, Clock, Timer, ShieldAlert, LogOut, HelpCircle,
  Send, Cookie, Database, Bell, FileText, Zap
} from 'lucide-react'

export const ICON_MAP: Record<string, any> = {
  Globe, ArrowLeftRight, PanelTop, ArrowRightLeft, PanelTopClose, Camera, Maximize, Power,
  MousePointerClick, MousePointer2, Keyboard, Command, ArrowDownUp, Hand, ListFilter,
  CheckSquare, Upload, GripVertical,
  Type, Code2, Link, Heading, Hash, Variable, FileCode, Table,
  GitBranch, Repeat, ListOrdered, Clock, Timer, ShieldAlert, LogOut, HelpCircle,
  Send, Cookie, Database, Bell, FileText, Zap
}

export const CATEGORY_COLORS: Record<string, string> = {
  browser: '#3B82F6',
  interaction: '#10B981',
  data: '#F59E0B',
  flow: '#8B5CF6',
  integration: '#EF4444'
}

const CATEGORY_BG: Record<string, string> = {
  browser: 'bg-blue-50 dark:bg-blue-950/30',
  interaction: 'bg-emerald-50 dark:bg-emerald-950/30',
  data: 'bg-amber-50 dark:bg-amber-950/30',
  flow: 'bg-violet-50 dark:bg-violet-950/30',
  integration: 'bg-red-50 dark:bg-red-950/30'
}

interface NodeDrawerProps {
  open: boolean
  onClose: () => void
  onAddNode: (nodeType: string, nodeDef: any) => void
}

export function NodeDrawer({ open, onClose, onAddNode }: NodeDrawerProps) {
  const { nodeDefinitions, nodeCategories } = useWorkflowStore()
  const [search, setSearch] = useState('')
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setSearch('')
      setExpandedCategory(null)
      setTimeout(() => searchRef.current?.focus(), 300)
    }
  }, [open])

  const filtered = useMemo(() => {
    if (!search.trim()) return null
    const q = search.toLowerCase()
    return nodeDefinitions.filter((n: any) =>
      n.label.toLowerCase().includes(q) ||
      n.description.toLowerCase().includes(q) ||
      n.type.toLowerCase().includes(q)
    )
  }, [search, nodeDefinitions])

  const handleDragStart = (event: React.DragEvent, nodeType: string, nodeDef: any) => {
    event.dataTransfer.setData('application/automation-node', nodeType)
    event.dataTransfer.setData('application/automation-node-data', JSON.stringify({
      label: nodeDef.label,
      category: nodeDef.category
    }))
    event.dataTransfer.effectAllowed = 'move'
    onClose()
  }

  const handleNodeClick = (nodeType: string, nodeDef: any) => {
    onAddNode(nodeType, nodeDef)
    onClose()
  }

  return (
    <Drawer open={open} onClose={onClose} title="Thêm node">
      {/* Search */}
      <div className="px-3 py-2 border-b">
        <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm node..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-2">
        {filtered ? (
          filtered.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Không tìm thấy node nào
            </div>
          ) : (
            <div className="space-y-0.5">
              {filtered.map((node: any) => (
                <NodeItem
                  key={node.type}
                  node={node}
                  onDragStart={handleDragStart}
                  onClick={handleNodeClick}
                />
              ))}
            </div>
          )
        ) : (
          <div className="space-y-1">
            {nodeCategories.map((cat: any) => {
              const categoryNodes = nodeDefinitions.filter((n: any) => n.category === cat.key)
              if (categoryNodes.length === 0) return null
              const isExpanded = expandedCategory === cat.key
              const CatIcon = ICON_MAP[cat.icon] || Zap

              return (
                <div key={cat.key}>
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : cat.key)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: cat.color + '15' }}>
                      <CatIcon className="h-4.5 w-4.5" style={{ color: cat.color }} />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium">{cat.label}</div>
                      <div className="text-xs text-muted-foreground">{categoryNodes.length} node</div>
                    </div>
                    <svg
                      className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className={`ml-2 mr-1 mb-1 rounded-lg ${CATEGORY_BG[cat.key] || ''} p-1.5 space-y-0.5`}>
                      {categoryNodes.map((node: any) => (
                        <NodeItem
                          key={node.type}
                          node={node}
                          onDragStart={handleDragStart}
                          onClick={handleNodeClick}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Drawer>
  )
}

function NodeItem({ node, onDragStart, onClick }: {
  node: any
  onDragStart: (e: React.DragEvent, type: string, def: any) => void
  onClick: (type: string, def: any) => void
}) {
  const Icon = ICON_MAP[node.icon] || Zap
  const color = CATEGORY_COLORS[node.category] || '#6B7280'

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, node.type, node)}
      onClick={() => onClick(node.type, node)}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-grab hover:bg-accent/80 transition-colors active:cursor-grabbing group"
      title={node.description}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: color + '12', border: `1px solid ${color}25` }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium leading-tight">{node.label}</div>
        <div className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">{node.description}</div>
      </div>
      <Plus className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </div>
  )
}

export function AddNodeButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute top-3 right-3 z-30 w-10 h-10 rounded-xl bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105 flex items-center justify-center"
      title="Thêm node"
    >
      <Plus className="h-5 w-5" />
    </button>
  )
}

export function AIButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute top-16 right-3 z-30 w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center group"
      title="AI Assistant"
    >
      <svg className="h-5 w-5 text-purple-500 group-hover:text-purple-600 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
        <path d="M20 3v4" />
        <path d="M22 5h-4" />
      </svg>
    </button>
  )
}
