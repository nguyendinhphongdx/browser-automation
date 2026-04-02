import { useCallback, useMemo } from 'react'
import ReactFlow, {
  addEdge, applyNodeChanges, applyEdgeChanges,
  Background, Controls, MiniMap,
  type Node, type Edge, type Connection, type NodeChange, type EdgeChange,
  Handle, Position
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useWorkflowStore } from '@/stores/workflow-store'
import { NodePalette } from './NodePalette'
import { NodePropertiesPanel } from './NodePropertiesPanel'

const CATEGORY_COLORS: Record<string, string> = {
  browser: '#3B82F6',
  interaction: '#10B981',
  data: '#F59E0B',
  flow: '#8B5CF6',
  integration: '#EF4444'
}

// Custom node component
function AutomationNode({ data, selected }: { data: any; selected: boolean }) {
  const color = CATEGORY_COLORS[data.category] || '#6B7280'

  return (
    <div className={`
      px-3 py-2 rounded-lg border-2 bg-card shadow-sm min-w-[140px]
      ${selected ? 'ring-2 ring-primary' : ''}
    `} style={{ borderColor: color }}>
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white" />
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-xs font-medium">{data.label}</span>
      </div>
      {data.config?.url && (
        <div className="text-[10px] text-muted-foreground mt-1 truncate max-w-[160px]">
          {data.config.url}
        </div>
      )}
      {data.config?.selector && (
        <div className="text-[10px] text-muted-foreground mt-1 truncate max-w-[160px] font-mono">
          {data.config.selector}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white" />
      {/* Extra handles for if-else and loop */}
      {data.category === 'flow' && data.label === 'If / Else' && (
        <>
          <Handle type="source" position={Position.Left} id="true"
            className="!w-3 !h-3 !bg-green-500 !border-2 !border-white" style={{ top: '50%' }} />
          <Handle type="source" position={Position.Right} id="false"
            className="!w-3 !h-3 !bg-red-500 !border-2 !border-white" style={{ top: '50%' }} />
        </>
      )}
      {data.category === 'flow' && data.label === 'Vòng lặp' && (
        <>
          <Handle type="source" position={Position.Left} id="body"
            className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white" style={{ top: '50%' }} />
          <Handle type="source" position={Position.Right} id="done"
            className="!w-3 !h-3 !bg-gray-500 !border-2 !border-white" style={{ top: '50%' }} />
        </>
      )}
    </div>
  )
}

const nodeTypes = { automationNode: AutomationNode }

export function VisualEditor() {
  const { activeWorkflow, updateNodes, updateEdges, selectedNodeId, setSelectedNode } = useWorkflowStore()

  const nodes: Node[] = useMemo(() =>
    (activeWorkflow?.nodes || []).map(n => ({
      id: n.id,
      type: 'automationNode',
      position: n.position,
      data: n.data,
      selected: n.id === selectedNodeId
    })),
    [activeWorkflow?.nodes, selectedNodeId]
  )

  const edges: Edge[] = useMemo(() =>
    (activeWorkflow?.edges || []).map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      animated: true,
      style: { strokeWidth: 2 }
    })),
    [activeWorkflow?.edges]
  )

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    if (!activeWorkflow) return
    const updated = applyNodeChanges(changes, nodes)
    updateNodes(updated.map(n => ({
      id: n.id,
      type: (n as any).data?.category === 'flow' ? n.type! : n.type!,
      position: n.position!,
      data: (n as any).data
    })))
  }, [activeWorkflow, nodes, updateNodes])

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    if (!activeWorkflow) return
    const updated = applyEdgeChanges(changes, edges)
    updateEdges(updated.map(e => ({
      id: e.id,
      source: (e as any).source,
      target: (e as any).target,
      sourceHandle: (e as any).sourceHandle,
      targetHandle: (e as any).targetHandle
    })))
  }, [activeWorkflow, edges, updateEdges])

  const onConnect = useCallback((connection: Connection) => {
    if (!activeWorkflow) return
    const newEdges = addEdge({
      ...connection,
      id: `e-${Date.now()}`,
      animated: true,
      style: { strokeWidth: 2 }
    }, edges)
    updateEdges(newEdges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle || undefined,
      targetHandle: e.targetHandle || undefined
    })))
  }, [activeWorkflow, edges, updateEdges])

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node.id)
  }, [setSelectedNode])

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [setSelectedNode])

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    const type = event.dataTransfer.getData('application/automation-node')
    if (!type || !activeWorkflow) return

    const reactFlowBounds = (event.target as HTMLElement).closest('.react-flow')?.getBoundingClientRect()
    if (!reactFlowBounds) return

    const position = {
      x: event.clientX - reactFlowBounds.left - 70,
      y: event.clientY - reactFlowBounds.top - 20
    }

    // Parse node definition from drag data
    const nodeData = JSON.parse(event.dataTransfer.getData('application/automation-node-data') || '{}')

    const newNode = {
      id: `node-${Date.now()}`,
      type: type,
      position,
      data: {
        label: nodeData.label || type,
        category: nodeData.category || 'browser',
        config: {}
      }
    }

    updateNodes([...activeWorkflow.nodes, newNode])
  }, [activeWorkflow, updateNodes])

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  return (
    <div className="flex h-full">
      {/* Node Palette */}
      <NodePalette />

      {/* Flow Canvas */}
      <div className="flex-1" onDrop={onDrop} onDragOver={onDragOver}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
        >
          <Background gap={15} size={1} />
          <Controls />
          <MiniMap nodeStrokeWidth={3} />
        </ReactFlow>
      </div>

      {/* Properties Panel */}
      {selectedNodeId && <NodePropertiesPanel />}
    </div>
  )
}
