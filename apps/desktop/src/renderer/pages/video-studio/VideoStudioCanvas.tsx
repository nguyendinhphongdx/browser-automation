import { useCallback, useRef, useState } from 'react'
import ReactFlow, {
  addEdge, applyNodeChanges, applyEdgeChanges,
  Background, Controls, ReactFlowProvider, useReactFlow,
  type Node, type Edge, type Connection, type NodeChange, type EdgeChange, type IsValidConnection,
  MarkerType, BackgroundVariant
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Plus, Play, Loader2, Sparkles } from 'lucide-react'
import { useVideoStudioStore } from '@/stores/video-studio-store'
import { validateVideoEdge } from '@shared/video-studio/validate-edge'
import type { VideoNodeDefinition, VideoSocketDef } from '@shared/types'
import { VideoStudioNode } from './VideoStudioNode'
import { VideoNodePalette } from './VideoNodePalette'
import { VideoNodePropertiesPanel } from './VideoNodePropertiesPanel'
import { VideoAgentChatPanel } from './agent/VideoAgentChatPanel'

const nodeTypes = { videoStudioNode: VideoStudioNode }

const defaultEdgeOptions = {
  type: 'smoothstep' as const,
  style: { strokeWidth: 2, stroke: '#b1b1b7' },
  markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#b1b1b7' }
}

function findSocket(defs: VideoNodeDefinition[], nodeType: string | undefined, name: string | null | undefined, io: 'inputs' | 'outputs'): VideoSocketDef | undefined {
  if (!nodeType || !name) return undefined
  const def = defs.find((d) => d.type === nodeType)
  return def?.[io].find((s) => s.name === name)
}

function VideoStudioCanvasInner() {
  const { activePipeline, nodeDefinitions, updateNodes, updateEdges, selectedNodeId, setSelectedNode, isRunning, runPipeline, runError, nodeProgress } =
    useVideoStudioStore()
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const reactFlowInstance = useReactFlow()
  const [showPalette, setShowPalette] = useState(false)
  const [showAgent, setShowAgent] = useState(false)

  const nodes: Node[] = (activePipeline?.nodes || []).map((n) => ({
    id: n.id,
    type: 'videoStudioNode',
    position: n.position,
    data: n.data,
    selected: n.id === selectedNodeId
  }))

  const edges: Edge[] = (activePipeline?.edges || []).map((e) => {
    const status = nodeProgress[e.target]
    const color = status === 'error' ? '#EF4444' : status === 'done' ? '#22c55e' : '#b1b1b7'
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      type: 'smoothstep',
      style: { strokeWidth: 2, stroke: color },
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color }
    }
  })

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const meaningful = changes.filter((c) => c.type === 'position' || c.type === 'remove')
      if (meaningful.length === 0) return
      const current = useVideoStudioStore.getState().activePipeline
      if (!current) return
      const currentNodes: Node[] = current.nodes.map((n) => ({ id: n.id, type: 'videoStudioNode', position: n.position, data: n.data }))
      const updated = applyNodeChanges(meaningful, currentNodes)
      updateNodes(
        updated.map((n) => ({ id: n.id, type: 'videoStudioNode' as const, position: n.position!, data: n.data }))
      )
    },
    [updateNodes]
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const meaningful = changes.filter((c) => c.type === 'remove')
      if (meaningful.length === 0) return
      const current = useVideoStudioStore.getState().activePipeline
      if (!current) return
      const currentEdges: Edge[] = current.edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle }))
      const updated = applyEdgeChanges(meaningful, currentEdges)
      updateEdges(updated.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle || '', targetHandle: e.targetHandle || '' })))
    },
    [updateEdges]
  )

  const isValidConnection: IsValidConnection = useCallback(
    (connection) => {
      const current = useVideoStudioStore.getState().activePipeline
      if (!current) return false
      const sourceNode = current.nodes.find((n) => n.id === connection.source)
      const targetNode = current.nodes.find((n) => n.id === connection.target)
      const sourceSocket = findSocket(nodeDefinitions, sourceNode?.data.nodeType, connection.sourceHandle, 'outputs')
      const targetSocket = findSocket(nodeDefinitions, targetNode?.data.nodeType, connection.targetHandle, 'inputs')
      return validateVideoEdge(sourceSocket, targetSocket)
    },
    [nodeDefinitions]
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      const current = useVideoStudioStore.getState().activePipeline
      if (!current) return
      const currentEdges: Edge[] = current.edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle }))
      const newEdges = addEdge({ ...connection, id: `e-${Date.now()}`, ...defaultEdgeOptions }, currentEdges)
      updateEdges(newEdges.map((e) => ({ id: e.id, source: e.source!, target: e.target!, sourceHandle: e.sourceHandle!, targetHandle: e.targetHandle! })))
    },
    [updateEdges]
  )

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const type = event.dataTransfer.getData('application/video-studio-node')
      if (!type) return
      const current = useVideoStudioStore.getState().activePipeline
      if (!current) return

      const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY })
      const def = nodeDefinitions.find((d) => d.type === type)
      if (!def) return

      const newNode = {
        id: `node-${Date.now()}`,
        type: 'videoStudioNode' as const,
        position,
        data: { label: def.label, nodeType: type, icon: def.icon, config: {} }
      }
      updateNodes([...current.nodes, newNode])
    },
    [updateNodes, reactFlowInstance, nodeDefinitions]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const addNodeAtCenter = (nodeType: string, def: VideoNodeDefinition) => {
    const current = useVideoStudioStore.getState().activePipeline
    if (!current) return
    const position = reactFlowInstance.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
    const newNode = {
      id: `node-${Date.now()}`,
      type: 'videoStudioNode' as const,
      position,
      data: { label: def.label, nodeType, icon: def.icon, config: {} }
    }
    updateNodes([...current.nodes, newNode])
  }

  return (
    <div className="relative w-full h-full" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={(_e, node) => setSelectedNode(node.id)}
        onPaneClick={() => setSelectedNode(null)}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls />
      </ReactFlow>

      <button
        onClick={() => setShowPalette((v) => !v)}
        className="absolute top-3 right-3 z-30 w-10 h-10 rounded-xl bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105 flex items-center justify-center"
        title="Thêm node"
      >
        <Plus className="h-5 w-5" />
      </button>

      <button
        onClick={() => setShowAgent((v) => !v)}
        className="absolute top-16 right-3 z-30 w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center group"
        title="AI dựng pipeline"
      >
        <Sparkles className="h-5 w-5 text-purple-500 group-hover:text-purple-600 transition-colors" />
      </button>

      <button
        onClick={runPipeline}
        disabled={isRunning || !activePipeline?.nodes.length}
        className="absolute top-3 left-3 z-30 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white shadow-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        {isRunning ? 'Đang chạy...' : 'Chạy pipeline'}
      </button>

      {runError && (
        <div className="absolute bottom-3 left-3 right-3 z-30 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive">
          {runError}
        </div>
      )}

      <VideoNodePalette open={showPalette} onClose={() => setShowPalette(false)} onAddNode={addNodeAtCenter} />
      <VideoNodePropertiesPanel />
      <VideoAgentChatPanel open={showAgent} onClose={() => setShowAgent(false)} />
    </div>
  )
}

export function VideoStudioCanvas() {
  return (
    <ReactFlowProvider>
      <VideoStudioCanvasInner />
    </ReactFlowProvider>
  )
}
