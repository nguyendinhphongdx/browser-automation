import { useWorkflowStore } from '@/stores/workflow-store'
import { Globe, MousePointer, Database, GitBranch, Zap } from 'lucide-react'

const CATEGORY_ICONS: Record<string, any> = {
  browser: Globe,
  interaction: MousePointer,
  data: Database,
  flow: GitBranch,
  integration: Zap
}

const CATEGORY_COLORS: Record<string, string> = {
  browser: '#3B82F6',
  interaction: '#10B981',
  data: '#F59E0B',
  flow: '#8B5CF6',
  integration: '#EF4444'
}

export function NodePalette() {
  const { nodeDefinitions, nodeCategories } = useWorkflowStore()

  const onDragStart = (event: React.DragEvent, nodeType: string, nodeDef: any) => {
    event.dataTransfer.setData('application/automation-node', nodeType)
    event.dataTransfer.setData('application/automation-node-data', JSON.stringify({
      label: nodeDef.label,
      category: nodeDef.category
    }))
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className="w-52 border-r bg-card overflow-auto">
      <div className="p-3 border-b">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nodes</h3>
      </div>
      <div className="p-2 space-y-3">
        {nodeCategories.map((cat: any) => {
          const Icon = CATEGORY_ICONS[cat.key] || Zap
          const categoryNodes = nodeDefinitions.filter((n: any) => n.category === cat.key)
          if (categoryNodes.length === 0) return null

          return (
            <div key={cat.key}>
              <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-muted-foreground">
                <Icon className="h-3 w-3" style={{ color: cat.color }} />
                {cat.label}
              </div>
              <div className="space-y-0.5">
                {categoryNodes.map((node: any) => (
                  <div
                    key={node.type}
                    draggable
                    onDragStart={e => onDragStart(e, node.type, node)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-grab hover:bg-accent transition-colors active:cursor-grabbing"
                    title={node.description}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[node.category] }} />
                    {node.label}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
