// Types dùng chung — bản chính nằm tại packages/shared-types
// File này giữ nguyên để tương thích với import path @shared/types

// Các loại trình duyệt hỗ trợ
export type BrowserType =
  | 'chrome'
  | 'brave'
  | 'edge'
  | 'firefox'
  | 'opera'
  | 'vivaldi'
  | 'chromium'
  | 'custom'

export interface BrowserInfo {
  type: BrowserType
  name: string
  version: string
  executablePath: string
  engine: 'chromium' | 'gecko'
}

// Fingerprint
export interface Fingerprint {
  userAgent: string
  screenResolution: { width: number; height: number }
  colorDepth: number
  timezone: string
  language: string
  locale: string
  platform: string
  hardwareConcurrency: number
  deviceMemory: number
  canvas: {
    noise: number
    seed: number
  }
  webgl: {
    vendor: string
    renderer: string
  }
  audioContext: {
    noise: number
    seed: number
  }
  fonts: string[]
  webrtc: {
    enabled: boolean
    publicIp?: string
    localIp?: string
  }
  doNotTrack: boolean
}

// Browser Profile
export interface BrowserProfile {
  id: string
  name: string
  tags: string[]
  folder: string
  color: string
  // Cấu hình trình duyệt
  browserType: BrowserType
  browserVersion: string
  browserExecutablePath?: string
  // Fingerprint & dữ liệu
  fingerprint: Fingerprint
  proxyId: string | null
  notes: string
  lastUsed: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateProfileInput {
  name: string
  browserType: BrowserType
  browserVersion?: string
  browserExecutablePath?: string
  tags?: string[]
  folder?: string
  color?: string
  notes?: string
  fingerprint?: Partial<Fingerprint>
  proxyId?: string | null
}

export interface UpdateProfileInput extends Partial<CreateProfileInput> {}

// Proxy
export interface Proxy {
  id: string
  name: string
  type: 'http' | 'https' | 'socks4' | 'socks5'
  host: string
  port: number
  username?: string
  password?: string
  country?: string
  status: 'alive' | 'dead' | 'unknown'
  speed?: number
  lastChecked?: string
  createdAt: string
}

export interface CreateProxyInput {
  name: string
  type: 'http' | 'https' | 'socks4' | 'socks5'
  host: string
  port: number
  username?: string
  password?: string
  country?: string
}

export interface UpdateProxyInput extends Partial<CreateProxyInput> {}

// Email / Account
export interface EmailAccount {
  id: string
  email: string
  password: string
  recoveryEmail?: string
  phone?: string
  provider: 'gmail' | 'outlook' | 'yahoo' | 'other'
  status: 'active' | 'locked' | 'verify_needed' | 'unknown'
  notes: string
  profileId?: string | null
  createdAt: string
}

export interface CreateEmailInput {
  email: string
  password: string
  recoveryEmail?: string
  phone?: string
  provider?: 'gmail' | 'outlook' | 'yahoo' | 'other'
  status?: 'active' | 'locked' | 'verify_needed' | 'unknown'
  notes?: string
  profileId?: string | null
}

export interface UpdateEmailInput extends Partial<CreateEmailInput> {}

// Cookie
export interface CookieEntry {
  id: string
  name: string
  profileId: string | null
  domain: string
  cookies: string // JSON string of cookie array
  notes: string
  createdAt: string
  updatedAt: string
}

export interface CreateCookieInput {
  name: string
  profileId?: string | null
  domain: string
  cookies: string
  notes?: string
}

export interface UpdateCookieInput extends Partial<CreateCookieInput> {}

// ── Automation / Workflow ────────────────────────────────

export type WorkflowMode = 'visual' | 'code'

export type WorkflowStatus = 'draft' | 'ready' | 'running' | 'completed' | 'error'

// Node categories
export type NodeCategory = 'browser' | 'interaction' | 'data' | 'flow' | 'integration'

export interface WorkflowNodeData {
  label: string
  category: NodeCategory
  config: Record<string, any>
  icon?: string
  nodeType?: string
  retryConfig?: NodeRetryConfig
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
  edgeType?: 'normal' | 'on-error'
}

export interface WorkflowVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  defaultValue: string
  direction?: 'in' | 'out' | 'inout'
}

// Retry config per-node
export interface NodeRetryConfig {
  maxRetries: number
  backoffStrategy: 'fixed' | 'linear' | 'exponential'
  backoffBaseMs: number
  backoffMaxMs: number
}

export interface Workflow {
  id: string
  name: string
  description: string
  version: string
  mode: WorkflowMode
  // Visual mode
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  // Code mode
  code: string
  // Metadata
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

// Execution log
export interface WorkflowLog {
  id: string
  workflowId: string
  profileId: string
  status: 'running' | 'completed' | 'error'
  logs: string // JSON array of log entries
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

// ── Workflow Version ──────────────────────────

export interface WorkflowVersion {
  id: string
  workflowId: string
  versionNumber: number
  label: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  code: string
  variables: WorkflowVariable[]
  createdAt: string
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
  // Advanced (Phase 8)
  dependencies?: CampaignDependency[]
  profileSelectionRules?: CampaignProfileSelectionRule[]
  quotaConfig?: CampaignQuotaConfig
  abTestVariants?: CampaignABTestVariant[]
}

export interface CampaignDependency {
  workflowId: string
  dependsOn: string[]
}

export interface CampaignProfileSelectionRule {
  type: 'tags' | 'last-used-before' | 'random-sample'
  value: string | number
}

export interface CampaignQuotaConfig {
  maxRunsPerProfile: number
  perPeriod: 'hour' | 'day' | 'week'
  cooldownMinutes: number
}

export interface CampaignABTestVariant {
  id: string
  name: string
  workflowId: string
  weight: number
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

// ── Schedule ─────────────────────────────────

export interface Schedule {
  id: string
  name: string
  type: 'cron' | 'webhook' | 'chain'
  targetType: 'workflow' | 'campaign'
  targetId: string
  profileId?: string
  cronExpression?: string
  webhookSecret?: string
  chainSourceId?: string
  chainOnStatus?: 'completed' | 'error' | 'any'
  enabled: boolean
  lastTriggeredAt?: string
  nextRunAt?: string
  createdAt: string
  updatedAt: string
}

export interface CreateScheduleInput {
  name: string
  type: 'cron' | 'webhook' | 'chain'
  targetType: 'workflow' | 'campaign'
  targetId: string
  profileId?: string
  cronExpression?: string
  chainSourceId?: string
  chainOnStatus?: 'completed' | 'error' | 'any'
}

// ── Backup ───────────────────────────────────

export interface BackupMetadata {
  profileId: string
  profileName: string
  browserType: BrowserType
  exportedAt: string
  version: string
}

export interface BackupStatusItem {
  profileId: string
  name: string
  latestBackupAt: string
  checksum: string
  size: number
}
