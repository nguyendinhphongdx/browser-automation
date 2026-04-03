import { useCallback, useRef, useMemo, useState } from 'react'
import ReactFlow, {
  addEdge, applyNodeChanges, applyEdgeChanges,
  Background, Controls, MiniMap, ReactFlowProvider, useReactFlow,
  type Node, type Edge, type Connection, type NodeChange, type EdgeChange,
  Handle, Position, ConnectionLineType, MarkerType, BackgroundVariant, Panel
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useWorkflowStore } from '@/stores/workflow-store'
import { NodeDrawer, AddNodeButton, AIButton, ICON_MAP, CATEGORY_COLORS } from './NodePalette'
import { NodePropertiesPanel } from './NodePropertiesPanel'
import { AIChatPanel } from './AIChatPanel'
import { LayoutGrid, Zap, Loader2, CheckCircle2, XCircle, Plus } from 'lucide-react'

// Lấy subtitle hiển thị trên node
function getNodeSubtitle(data: any): string | null {
  const c = data.config
  if (!c) return null
  if (c.url) return c.url.length > 30 ? c.url.slice(0, 30) + '...' : c.url
  if (c.selector) return c.selector.length > 25 ? c.selector.slice(0, 25) + '...' : c.selector
  if (c.text) return c.text.length > 25 ? c.text.slice(0, 25) + '...' : c.text
  if (c.key) return c.key
  if (c.code) return c.code.split('\n')[0].slice(0, 25)
  return null
}

// Global callback để AutomationNode gọi khi click "+"
let onAddAfterNode: ((nodeId: string) => void) | null = null
export function setOnAddAfterNode(fn: ((nodeId: string) => void) | null) {
  onAddAfterNode = fn
}

function AutomationNode({ id, data, selected }: { id: string; data: any; selected: boolean }) {
  const color = CATEGORY_COLORS[data.category] || '#6B7280'
  const Icon = ICON_MAP[data.icon] || Zap
  const subtitle = getNodeSubtitle(data)
  const nodeProgress = useWorkflowStore(s => s.nodeProgress)
  const edges = useWorkflowStore(s => s.activeWorkflow?.edges || [])
  const status = nodeProgress[id]
  const isFlowBranch = data.category === 'flow' && (
    data.label === 'If / Else' || data.label === 'Vòng lặp' ||
    data.label === 'Lặp danh sách' || data.label === 'Try / Catch' ||
    data.label === 'Phần tử tồn tại?'
  )
  // Kiểm tra node này có edge ra không (nếu không → là node cuối)
  const hasOutgoingEdge = edges.some(e => e.source === id)

  const borderColor = status === 'running'
    ? '#f59e0b'
    : status === 'done'
    ? '#22c55e'
    : status === 'error'
    ? '#ef4444'
    : selected
    ? 'hsl(221.2, 83.2%, 53.3%)'
    : color + '60'

  return (
    <div className="flex flex-col items-center group" style={{ minWidth: 80 }}>
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-[10px] !h-[10px] !bg-white !border-[2px] !rounded-full !-left-[5px]"
        style={{ borderColor: '#b1b1b7', top: '50%' }}
      />

      {/* Main node box — n8n style */}
      <div
        className={`
          relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900
          border-2 transition-all duration-150 cursor-pointer
          ${selected ? 'shadow-lg shadow-primary/20' : 'shadow-sm hover:shadow-md'}
          ${status === 'running' ? 'animate-pulse' : ''}
        `}
        style={{
          borderColor,
          minWidth: 140,
          maxWidth: 220,
        }}
      >
        {/* Icon — thay bằng status icon khi đang chạy */}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: status === 'running' ? '#fef3c7' : status === 'done' ? '#dcfce7' : status === 'error' ? '#fee2e2' : color + '14' }}
        >
          {status === 'running' ? (
            <Loader2 className="h-[18px] w-[18px] text-amber-500 animate-spin" />
          ) : status === 'done' ? (
            <CheckCircle2 className="h-[18px] w-[18px] text-green-500" />
          ) : status === 'error' ? (
            <XCircle className="h-[18px] w-[18px] text-red-500" />
          ) : (
            <Icon className="h-[18px] w-[18px]" style={{ color }} />
          )}
        </div>

        {/* Text */}
        <div className="flex flex-col min-w-0">
          <span className="text-[13px] font-semibold text-foreground leading-tight truncate">
            {data.label}
          </span>
          {subtitle && (
            <span className="text-[10px] text-muted-foreground leading-tight mt-0.5 font-mono truncate max-w-[130px]">
              {subtitle}
            </span>
          )}
        </div>

        {/* Category color indicator */}
        <div
          className="absolute -top-[3px] left-4 right-4 h-[3px] rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>

      {/* Output handle(s) */}
      {isFlowBranch ? (
        <>
          {/* Left branch */}
          <Handle
            type="source"
            position={Position.Bottom}
            id={data.label === 'If / Else' || data.label === 'Phần tử tồn tại?' ? 'true' : 'body'}
            className="!w-[10px] !h-[10px] !bg-white !border-[2px] !rounded-full"
            style={{ borderColor: '#22c55e', left: '30%', bottom: -5 }}
          />
          {/* Right branch */}
          <Handle
            type="source"
            position={Position.Bottom}
            id={data.label === 'If / Else' || data.label === 'Phần tử tồn tại?' ? 'false' : data.label === 'Try / Catch' ? 'catch' : 'done'}
            className="!w-[10px] !h-[10px] !bg-white !border-[2px] !rounded-full"
            style={{ borderColor: '#ef4444', left: '70%', bottom: -5 }}
          />
        </>
      ) : (
        <>
          <Handle
            type="source"
            position={Position.Right}
            className="!w-[10px] !h-[10px] !bg-white !border-[2px] !rounded-full !-right-[5px]"
            style={{ borderColor: '#b1b1b7', top: '50%' }}
          />
          {/* Nút "+" — hiện khi hover, luôn hiện nếu là node cuối */}
          <button
            className={`
              absolute -right-[32px] top-1/2 -translate-y-1/2
              w-6 h-6 rounded-full border-2 border-dashed border-primary/40
              flex items-center justify-center
              bg-background hover:bg-primary hover:border-primary
              hover:text-white text-primary/60
              transition-all duration-150
              ${hasOutgoingEdge ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}
            `}
            title="Thêm node tiếp theo"
            onClick={(e) => {
              e.stopPropagation()
              onAddAfterNode?.(id)
            }}
          >
            <Plus className="h-3 w-3" />
          </button>
        </>
      )}
    </div>
  )
}

const nodeTypes = { automationNode: AutomationNode }

const defaultEdgeOptions = {
  type: 'smoothstep',
  animated: true,
  style: { strokeWidth: 2, stroke: '#b1b1b7' },
  markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#b1b1b7' },
}

function VisualEditorInner() {
  const { activeWorkflow, updateNodes, updateEdges, selectedNodeId, setSelectedNode, nodeDefinitions } = useWorkflowStore()
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const reactFlowInstance = useReactFlow()
  const [showNodePanel, setShowNodePanel] = useState(false)
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null)
  const [addAfterNodeId, setAddAfterNodeId] = useState<string | null>(null)

  // Đăng ký callback cho nút "+" trên node
  useMemo(() => {
    setOnAddAfterNode((nodeId: string) => {
      setAddAfterNodeId(nodeId)
      setShowNodePanel(true)
      setSelectedNode(null)
    })
    return () => setOnAddAfterNode(null)
  }, [])

  const nodes: Node[] = useMemo(() =>
    (activeWorkflow?.nodes || []).map(n => ({
      id: n.id,
      type: 'automationNode',
      position: n.position,
      data: n.data,
      selected: n.id === activeNodeId || n.id === selectedNodeId
    })),
    [activeWorkflow?.nodes, activeNodeId, selectedNodeId]
  )

  const edges: Edge[] = useMemo(() =>
    (activeWorkflow?.edges || []).map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      type: 'smoothstep',
      style: { strokeWidth: 2, stroke: '#b1b1b7' },
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#b1b1b7' },
    })),
    [activeWorkflow?.edges]
  )

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const meaningful = changes.filter(c => c.type === 'position' || c.type === 'remove')
    if (meaningful.length === 0) return

    const current = useWorkflowStore.getState().activeWorkflow
    if (!current) return

    const currentNodes: Node[] = current.nodes.map(n => ({
      id: n.id,
      type: 'automationNode',
      position: n.position,
      data: n.data,
    }))
    const updated = applyNodeChanges(meaningful, currentNodes)
    updateNodes(updated.map(n => ({
      id: n.id,
      type: n.type!,
      position: n.position!,
      data: (n as any).data
    })))
  }, [updateNodes])

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    // Cho phép select + remove, bỏ qua các change khác gây loop
    const meaningful = changes.filter(c => c.type === 'select' || c.type === 'remove')
    if (meaningful.length === 0) return

    const current = useWorkflowStore.getState().activeWorkflow
    if (!current) return

    // Chỉ update store khi có remove (select chỉ cần ReactFlow tự xử lý)
    const hasRemove = meaningful.some(c => c.type === 'remove')
    if (!hasRemove) return

    const currentEdges: Edge[] = current.edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    }))
    const updated = applyEdgeChanges(meaningful, currentEdges)
    updateEdges(updated.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: (e as any).sourceHandle,
      targetHandle: (e as any).targetHandle
    })))
  }, [updateEdges])

  const onConnect = useCallback((connection: Connection) => {
    const current = useWorkflowStore.getState().activeWorkflow
    if (!current) return
    const currentEdges: Edge[] = current.edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    }))
    const newEdges = addEdge({
      ...connection,
      id: `e-${Date.now()}`,
      type: 'smoothstep',
      style: { strokeWidth: 2, stroke: '#b1b1b7' },
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#b1b1b7' },
    }, currentEdges)
    updateEdges(newEdges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle || undefined,
      targetHandle: e.targetHandle || undefined
    })))
  }, [updateEdges])

  // Single click → active (highlight border)
  const onNodeClick = useCallback((_: any, node: Node) => {
    setActiveNodeId(node.id)
  }, [])

  // Double click → mở config drawer, đóng node drawer
  const onNodeDoubleClick = useCallback((_: any, node: Node) => {
    setActiveNodeId(node.id)
    setShowNodePanel(false)
    setSelectedNode(node.id)
  }, [setSelectedNode])

  const onPaneClick = useCallback(() => {
    setActiveNodeId(null)
    setSelectedNode(null)
  }, [setSelectedNode])

  // Auto layout — sắp xếp node theo thứ tự kết nối (left → right)
  const autoLayout = useCallback(() => {
    const current = useWorkflowStore.getState().activeWorkflow
    if (!current || current.nodes.length === 0) return

    const NODE_W = 200
    const NODE_H = 60
    const GAP_X = 80
    const GAP_Y = 40

    const nodesMap = new Map(current.nodes.map(n => [n.id, n]))
    const edgesArr = current.edges

    // Build adjacency & inDegree
    const children = new Map<string, string[]>()
    const inDegree = new Map<string, number>()
    for (const n of current.nodes) {
      children.set(n.id, [])
      inDegree.set(n.id, 0)
    }
    for (const e of edgesArr) {
      children.get(e.source)?.push(e.target)
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1)
    }

    // Topological sort → assign layers (columns)
    const queue: string[] = []
    for (const [id, deg] of inDegree) {
      if (deg === 0) queue.push(id)
    }

    const layer = new Map<string, number>()
    const layers: string[][] = []

    while (queue.length > 0) {
      const id = queue.shift()!
      const l = layer.get(id) ?? 0
      if (!layers[l]) layers[l] = []
      layers[l].push(id)

      for (const child of children.get(id) || []) {
        const childLayer = Math.max(layer.get(child) ?? 0, l + 1)
        layer.set(child, childLayer)
        const newDeg = (inDegree.get(child) || 1) - 1
        inDegree.set(child, newDeg)
        if (newDeg === 0) queue.push(child)
      }
    }

    // Nodes not connected — add to last layer
    for (const n of current.nodes) {
      if (!layer.has(n.id)) {
        const l = layers.length
        if (!layers[l]) layers[l] = []
        layers[l].push(n.id)
      }
    }

    // Assign positions
    const positioned = current.nodes.map(n => {
      const l = layer.get(n.id) ?? 0
      const col = layers[l] || []
      const row = col.indexOf(n.id)
      const colHeight = col.length * (NODE_H + GAP_Y) - GAP_Y
      const startY = -colHeight / 2

      return {
        ...n,
        position: {
          x: l * (NODE_W + GAP_X),
          y: startY + row * (NODE_H + GAP_Y)
        }
      }
    })

    updateNodes(positioned)

    // Fit view after layout
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2, duration: 300 })
    }, 50)
  }, [updateNodes, reactFlowInstance])

  // Thêm node từ floating panel (click hoặc từ nút "+")
  const handleAddNode = useCallback((nodeType: string, nodeDef: any) => {
    const current = useWorkflowStore.getState().activeWorkflow
    if (!current) return

    const newNodeId = `node-${Date.now()}`
    let posX: number
    let posY: number

    // Nếu có addAfterNodeId → đặt bên phải node nguồn + tạo edge
    const sourceNodeId = addAfterNodeId
    const sourceNode = sourceNodeId ? current.nodes.find(n => n.id === sourceNodeId) : null

    if (sourceNode) {
      posX = sourceNode.position.x + 280
      posY = sourceNode.position.y
    } else {
      const { x, y, zoom } = reactFlowInstance.getViewport()
      const wrapper = reactFlowWrapper.current
      const centerX = wrapper ? (wrapper.offsetWidth / 2 - x) / zoom : 300
      const centerY = wrapper ? (wrapper.offsetHeight / 2 - y) / zoom : 200
      const offset = current.nodes.length * 20
      posX = centerX + offset
      posY = centerY + offset
    }

    const newNode = {
      id: newNodeId,
      type: 'automationNode',
      position: { x: posX, y: posY },
      data: {
        label: nodeDef.label,
        category: nodeDef.category,
        icon: nodeDef.icon,
        nodeType: nodeType,
        config: {}
      }
    }

    updateNodes([...current.nodes, newNode])

    // Tạo edge nối node nguồn → node mới
    if (sourceNodeId) {
      const newEdge = {
        id: `e-${Date.now()}`,
        source: sourceNodeId,
        target: newNodeId,
      }
      updateEdges([...current.edges, newEdge])
    }

    // Reset
    setAddAfterNodeId(null)
    setShowNodePanel(false)
  }, [updateNodes, updateEdges, reactFlowInstance, addAfterNodeId])

  // Thêm node từ drag & drop
  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    const type = event.dataTransfer.getData('application/automation-node')
    if (!type) return

    const current = useWorkflowStore.getState().activeWorkflow
    if (!current) return

    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    })

    const nodeData = JSON.parse(event.dataTransfer.getData('application/automation-node-data') || '{}')

    // Tìm definition để lấy icon
    const def = nodeDefinitions.find((d: any) => d.type === type)

    const newNode = {
      id: `node-${Date.now()}`,
      type: 'automationNode',
      position,
      data: {
        label: nodeData.label || type,
        category: nodeData.category || 'browser',
        icon: def?.icon || 'Zap',
        nodeType: type,
        config: {}
      }
    }

    updateNodes([...current.nodes, newNode])
  }, [updateNodes, reactFlowInstance, nodeDefinitions])

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  return (
    <div className="relative flex h-full overflow-hidden">
      {/* Flow Canvas */}
      <div className="flex-1 h-full overflow-hidden relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          onPaneClick={onPaneClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          connectionLineType={ConnectionLineType.SmoothStep}
          connectionLineStyle={{ strokeWidth: 2, stroke: '#b1b1b7' }}
          deleteKeyCode={['Backspace', 'Delete']}
          edgesUpdatable
          selectionOnDrag={false}
          selectionKeyCode="Shift"
          fitView
          snapToGrid
          snapGrid={[20, 20]}
          minZoom={0.3}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={"dots" as BackgroundVariant} gap={24} size={1.5} color="#999" style={{ opacity: 1 }} />
          <Controls showInteractive={false}>
            <button
              onClick={autoLayout}
              className="react-flow__controls-button"
              title="Tự động sắp xếp"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </Controls>
          <MiniMap
            nodeColor={(node) => CATEGORY_COLORS[node.data?.category] || '#6B7280'}
            nodeStrokeColor={(node) => CATEGORY_COLORS[node.data?.category] || '#6B7280'}
            nodeStrokeWidth={2}
            nodeBorderRadius={4}
            maskColor="rgba(0,0,0,0.1)"
            pannable
            zoomable={false}
            style={{
              backgroundColor: '#fafafa',
              border: '1px solid #e5e5e5',
              borderRadius: 8,
              width: 160,
              height: 100,
            }}
          />
        </ReactFlow>

        {/* Add Node Button */}
        <AddNodeButton onClick={() => {
          setShowNodePanel(prev => !prev)
          setShowAIPanel(false)
          setSelectedNode(null)
        }} />

        {/* AI Button */}
        <AIButton onClick={() => {
          setShowAIPanel(prev => !prev)
          setShowNodePanel(false)
          setSelectedNode(null)
        }} />

        {/* Node Drawer */}
        <NodeDrawer
          open={showNodePanel}
          onClose={() => setShowNodePanel(false)}
          onAddNode={handleAddNode}
        />

        {/* Properties Drawer */}
        <NodePropertiesPanel />

        {/* AI Chat Drawer */}
        <AIChatPanel open={showAIPanel} onClose={() => setShowAIPanel(false)} />
      </div>
    </div>
  )
}

export function VisualEditor() {
  return (
    <ReactFlowProvider>
      <VisualEditorInner />
    </ReactFlowProvider>
  )
}
