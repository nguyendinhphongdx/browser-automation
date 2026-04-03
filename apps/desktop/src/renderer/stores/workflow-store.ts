import { create } from 'zustand'
import type {
  Workflow, CreateWorkflowInput, UpdateWorkflowInput,
  WorkflowNode, WorkflowEdge, WorkflowLog, LogEntry
} from '@shared/types'

// Node execution status: 'running' | 'done' | 'error'
type NodeStatus = 'running' | 'done' | 'error'

interface WorkflowStore {
  workflows: Workflow[]
  activeWorkflow: Workflow | null
  logs: WorkflowLog[]
  executionLogs: LogEntry[]
  nodeDefinitions: any[]
  nodeCategories: any[]
  isRunning: boolean
  runningLogId: string | null
  loading: boolean
  selectedNodeId: string | null
  nodeProgress: Record<string, NodeStatus>

  // Actions
  fetchWorkflows: () => Promise<void>
  fetchNodeDefinitions: () => Promise<void>
  createWorkflow: (data: CreateWorkflowInput) => Promise<Workflow>
  setActiveWorkflow: (id: string | null) => Promise<void>
  saveWorkflow: (data: UpdateWorkflowInput) => Promise<void>
  deleteWorkflow: (id: string) => Promise<void>

  // Visual editor
  updateNodes: (nodes: WorkflowNode[]) => void
  updateEdges: (edges: WorkflowEdge[]) => void
  setSelectedNode: (id: string | null) => void

  // Code editor
  updateCode: (code: string) => void

  // Execution
  runWorkflow: (profileId: string) => Promise<void>
  stopWorkflow: () => Promise<void>
  fetchLogs: (workflowId: string) => Promise<void>
}

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  workflows: [],
  activeWorkflow: null,
  logs: [],
  executionLogs: [],
  nodeDefinitions: [],
  nodeCategories: [],
  isRunning: false,
  runningLogId: null,
  loading: false,
  selectedNodeId: null,
  nodeProgress: {},

  fetchWorkflows: async () => {
    set({ loading: true })
    try {
      const workflows = await window.api.getWorkflows()
      set({ workflows })
    } finally {
      set({ loading: false })
    }
  },

  fetchNodeDefinitions: async () => {
    const [definitions, categories] = await Promise.all([
      window.api.getNodeDefinitions(),
      window.api.getNodeCategories()
    ])
    set({ nodeDefinitions: definitions, nodeCategories: categories })
  },

  createWorkflow: async (data) => {
    const workflow = await window.api.createWorkflow(data)
    await get().fetchWorkflows()
    set({ activeWorkflow: workflow })
    return workflow
  },

  setActiveWorkflow: async (id) => {
    if (!id) {
      set({ activeWorkflow: null, selectedNodeId: null })
      return
    }
    const workflow = await window.api.getWorkflow(id)
    set({ activeWorkflow: workflow, selectedNodeId: null })
    if (workflow) {
      await get().fetchLogs(workflow.id)
    }
  },

  saveWorkflow: async (data) => {
    const { activeWorkflow } = get()
    if (!activeWorkflow) return
    const updated = await window.api.updateWorkflow(activeWorkflow.id, data)
    if (updated) {
      set({ activeWorkflow: updated })
      await get().fetchWorkflows()
    }
  },

  deleteWorkflow: async (id) => {
    await window.api.deleteWorkflow(id)
    const { activeWorkflow } = get()
    if (activeWorkflow?.id === id) {
      set({ activeWorkflow: null })
    }
    await get().fetchWorkflows()
  },

  updateNodes: (nodes) => {
    const { activeWorkflow } = get()
    if (!activeWorkflow) return
    set({ activeWorkflow: { ...activeWorkflow, nodes } })
  },

  updateEdges: (edges) => {
    const { activeWorkflow } = get()
    if (!activeWorkflow) return
    set({ activeWorkflow: { ...activeWorkflow, edges } })
  },

  setSelectedNode: (id) => set({ selectedNodeId: id }),

  updateCode: (code) => {
    const { activeWorkflow } = get()
    if (!activeWorkflow) return
    set({ activeWorkflow: { ...activeWorkflow, code } })
  },

  runWorkflow: async (profileId) => {
    const { activeWorkflow } = get()
    if (!activeWorkflow) return

    // Save first
    await get().saveWorkflow({
      nodes: activeWorkflow.nodes,
      edges: activeWorkflow.edges,
      code: activeWorkflow.code
    })

    set({ isRunning: true, executionLogs: [], nodeProgress: {} })

    // Listen for node progress events
    const onNodeProgress = (data: { nodeId: string; status: NodeStatus }) => {
      const current = get().nodeProgress
      set({ nodeProgress: { ...current, [data.nodeId]: data.status } })
    }
    window.api.on('workflow:node-progress', onNodeProgress)

    try {
      const result = await window.api.runWorkflow(activeWorkflow.id, profileId)
      set({
        executionLogs: result.logs || [],
        runningLogId: result.logId
      })
      await get().fetchLogs(activeWorkflow.id)
    } finally {
      window.api.off('workflow:node-progress', onNodeProgress)
      set({ isRunning: false, runningLogId: null })
      // Keep nodeProgress visible for 2s after completion so user sees final state
      setTimeout(() => set({ nodeProgress: {} }), 2000)
    }
  },

  stopWorkflow: async () => {
    const { runningLogId } = get()
    if (runningLogId) {
      await window.api.stopWorkflow(runningLogId)
    }
    set({ isRunning: false, runningLogId: null })
  },

  fetchLogs: async (workflowId) => {
    const logs = await window.api.getWorkflowLogs(workflowId)
    set({ logs })
  }
}))
