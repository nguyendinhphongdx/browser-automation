export type WorkflowMode = 'visual' | 'code'
export type WorkflowStatus = 'draft' | 'ready' | 'running' | 'completed' | 'error'
export type NodeCategory = 'browser' | 'interaction' | 'data' | 'flow' | 'integration'

export interface WorkflowNodeData {
  label: string
  category: NodeCategory
  config: Record<string, any>
}

export interface WorkflowNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: WorkflowNodeData
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
}

export interface WorkflowVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  defaultValue: string
}

export interface Workflow {
  id: string
  name: string
  description: string
  version: string
  mode: WorkflowMode
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  code: string
  variables: WorkflowVariable[]
  status: WorkflowStatus
  createdAt: string
  updatedAt: string
}

export interface CreateWorkflowInput {
  name: string
  description?: string
  mode: WorkflowMode
}

export interface UpdateWorkflowInput {
  name?: string
  description?: string
  mode?: WorkflowMode
  nodes?: WorkflowNode[]
  edges?: WorkflowEdge[]
  code?: string
  variables?: WorkflowVariable[]
  status?: WorkflowStatus
}

/** Nhật ký chạy workflow */
export interface WorkflowLog {
  id: string
  workflowId: string
  profileId: string
  status: 'running' | 'completed' | 'error'
  logs: string // JSON array of LogEntry
  startedAt: string
  finishedAt?: string
}

export interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  nodeId?: string
  message: string
  data?: any
}

// ── Campaign ──────────────────────────────────

export type CampaignStatus = 'draft' | 'running' | 'paused' | 'completed' | 'error'
export type WorkflowOrderMode = 'sequential' | 'random' | 'shuffle'
export type ProfileOrderMode = 'sequential' | 'random'

export interface CampaignExecution {
  mode: 'parallel' | 'sequential'
  maxConcurrent: number
  delayBetweenProfiles: { min: number; max: number }
  workflowOrder: WorkflowOrderMode
  profileOrder: ProfileOrderMode
  repeatCount: number
  repeatDelay: { min: number; max: number }
  stopOnError: boolean
  retryOnError: number
  warmUp: boolean
  warmUpStep: number
  warmUpDelay: number
}

export interface Campaign {
  id: string
  name: string
  description: string
  profileIds: string[]
  workflowIds: string[]
  execution: CampaignExecution
  status: CampaignStatus
  lastRunAt?: string
  createdAt: string
  updatedAt: string
}

export interface CreateCampaignInput {
  name: string
  description?: string
  profileIds: string[]
  workflowIds: string[]
  execution: CampaignExecution
}

export interface UpdateCampaignInput {
  name?: string
  description?: string
  profileIds?: string[]
  workflowIds?: string[]
  execution?: CampaignExecution
  status?: CampaignStatus
}

export interface CampaignRun {
  id: string
  campaignId: string
  status: CampaignStatus
  profileResults: CampaignProfileResult[]
  startedAt: string
  finishedAt?: string
}

export interface CampaignProfileResult {
  profileId: string
  profileName: string
  workflowId: string
  workflowName: string
  status: 'pending' | 'running' | 'completed' | 'error' | 'skipped'
  error?: string
  startedAt?: string
  finishedAt?: string
  logs: LogEntry[]
}
