import { create } from 'zustand'
import type { VideoPipeline, VideoNode, VideoEdge, VideoNodeDefinition } from '@shared/types'

type NodeStatus = 'running' | 'done' | 'error'

interface VideoStudioStore {
  pipelines: VideoPipeline[]
  activePipeline: VideoPipeline | null
  nodeDefinitions: VideoNodeDefinition[]
  isRunning: boolean
  runningRunId: string | null
  loading: boolean
  selectedNodeId: string | null
  nodeProgress: Record<string, NodeStatus>
  nodeProgressPercent: Record<string, number>
  runError: string | null

  fetchPipelines: () => Promise<void>
  fetchNodeDefinitions: () => Promise<void>
  createPipeline: (data: { name: string; description?: string }) => Promise<VideoPipeline>
  setActivePipeline: (id: string | null) => Promise<void>
  savePipeline: (data: { nodes?: VideoNode[]; edges?: VideoEdge[]; name?: string; description?: string }) => Promise<void>
  deletePipeline: (id: string) => Promise<void>

  updateNodes: (nodes: VideoNode[]) => void
  updateEdges: (edges: VideoEdge[]) => void
  setSelectedNode: (id: string | null) => void

  runPipeline: () => Promise<void>
}

export const useVideoStudioStore = create<VideoStudioStore>((set, get) => ({
  pipelines: [],
  activePipeline: null,
  nodeDefinitions: [],
  isRunning: false,
  runningRunId: null,
  loading: false,
  selectedNodeId: null,
  nodeProgress: {},
  nodeProgressPercent: {},
  runError: null,

  fetchPipelines: async () => {
    set({ loading: true })
    try {
      const pipelines = await window.api.getVideoPipelines()
      set({ pipelines })
    } finally {
      set({ loading: false })
    }
  },

  fetchNodeDefinitions: async () => {
    const definitions = await window.api.getVideoNodeDefinitions()
    set({ nodeDefinitions: definitions })
  },

  createPipeline: async (data) => {
    const pipeline = await window.api.createVideoPipeline(data)
    await get().fetchPipelines()
    set({ activePipeline: pipeline })
    return pipeline
  },

  setActivePipeline: async (id) => {
    if (!id) {
      set({ activePipeline: null, selectedNodeId: null })
      return
    }
    const pipeline = await window.api.getVideoPipeline(id)
    set({ activePipeline: pipeline, selectedNodeId: null })
  },

  savePipeline: async (data) => {
    const { activePipeline } = get()
    if (!activePipeline) return
    const updated = await window.api.updateVideoPipeline(activePipeline.id, data)
    if (updated) {
      set({ activePipeline: updated })
      await get().fetchPipelines()
    }
  },

  deletePipeline: async (id) => {
    await window.api.deleteVideoPipeline(id)
    const { activePipeline } = get()
    if (activePipeline?.id === id) set({ activePipeline: null })
    await get().fetchPipelines()
  },

  updateNodes: (nodes) => {
    const { activePipeline, selectedNodeId } = get()
    if (!activePipeline) return
    const stillExists = selectedNodeId && nodes.some((n) => n.id === selectedNodeId)
    set({
      activePipeline: { ...activePipeline, nodes },
      ...(stillExists ? null : { selectedNodeId: null })
    })
  },

  updateEdges: (edges) => {
    const { activePipeline } = get()
    if (!activePipeline) return
    set({ activePipeline: { ...activePipeline, edges } })
  },

  setSelectedNode: (id) => set({ selectedNodeId: id }),

  runPipeline: async () => {
    const { activePipeline } = get()
    if (!activePipeline) return

    await get().savePipeline({ nodes: activePipeline.nodes, edges: activePipeline.edges })

    set({ isRunning: true, nodeProgress: {}, nodeProgressPercent: {}, runError: null })

    const onNodeProgress = (data: { runId: string; nodeId: string; status: NodeStatus; error?: string }) => {
      set({ nodeProgress: { ...get().nodeProgress, [data.nodeId]: data.status } })
      if (data.error) set({ runError: data.error })
    }
    const onJobProgress = (data: { runId: string; nodeId: string; percent: number }) => {
      set({ nodeProgressPercent: { ...get().nodeProgressPercent, [data.nodeId]: data.percent } })
    }
    const unsubscribeNode = window.api.on('video-studio:node-progress', onNodeProgress)
    const unsubscribeJob = window.api.on('video-studio:job-progress', onJobProgress)

    try {
      const result = await window.api.runVideoPipeline(activePipeline.id)
      set({ runningRunId: result.runId })
      if (result.status === 'error') set({ runError: result.error || 'Pipeline chạy thất bại' })
    } finally {
      unsubscribeNode()
      unsubscribeJob()
      set({ isRunning: false, runningRunId: null })
      setTimeout(() => set({ nodeProgress: {}, nodeProgressPercent: {} }), 2000)
    }
  }
}))
