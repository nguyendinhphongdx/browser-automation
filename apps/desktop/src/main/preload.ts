import { contextBridge, ipcRenderer } from 'electron'

const ALLOWED_CHANNELS = new Set([
  'auth:deeplink-success',
  'recorder:action',
  'workflow:node-progress',
  'workflow:status',
  'campaign:results',
  'campaign:profile-progress',
  'campaign:status',
  'campaign:node-progress',
  'updater:downloading',
  'updater:progress',
])

const api = {
  // Profile
  getProfiles: () => ipcRenderer.invoke('profile:getAll'),
  getProfile: (id: string) => ipcRenderer.invoke('profile:get', id),
  createProfile: (data: any) => ipcRenderer.invoke('profile:create', data),
  updateProfile: (id: string, data: any) => ipcRenderer.invoke('profile:update', id, data),
  deleteProfile: (id: string) => ipcRenderer.invoke('profile:delete', id),
  duplicateProfile: (id: string) => ipcRenderer.invoke('profile:duplicate', id),

  // Browser
  launchBrowser: (profileId: string) => ipcRenderer.invoke('browser:launch', profileId),
  closeBrowser: (profileId: string) => ipcRenderer.invoke('browser:close', profileId),
  detectBrowsers: () => ipcRenderer.invoke('browser:detect'),

  // Proxy
  getProxies: () => ipcRenderer.invoke('proxy:getAll'),
  getProxy: (id: string) => ipcRenderer.invoke('proxy:get', id),
  createProxy: (data: any) => ipcRenderer.invoke('proxy:create', data),
  updateProxy: (id: string, data: any) => ipcRenderer.invoke('proxy:update', id, data),
  deleteProxy: (id: string) => ipcRenderer.invoke('proxy:delete', id),
  checkProxy: (id: string) => ipcRenderer.invoke('proxy:check', id),
  importProxies: (lines: string[], type?: string) => ipcRenderer.invoke('proxy:import', lines, type),
  importProxiesFile: () => ipcRenderer.invoke('proxy:importFile'),

  // Email
  getEmails: () => ipcRenderer.invoke('email:getAll'),
  getEmail: (id: string) => ipcRenderer.invoke('email:get', id),
  createEmail: (data: any) => ipcRenderer.invoke('email:create', data),
  updateEmail: (id: string, data: any) => ipcRenderer.invoke('email:update', id, data),
  deleteEmail: (id: string) => ipcRenderer.invoke('email:delete', id),
  importEmailsCSV: (csvContent?: string) => ipcRenderer.invoke('email:importCSV', csvContent),

  // Cookie
  getCookies: () => ipcRenderer.invoke('cookie:getAll'),
  getCookie: (id: string) => ipcRenderer.invoke('cookie:get', id),
  getCookiesByProfile: (profileId: string) => ipcRenderer.invoke('cookie:getByProfile', profileId),
  createCookie: (data: any) => ipcRenderer.invoke('cookie:create', data),
  updateCookie: (id: string, data: any) => ipcRenderer.invoke('cookie:update', id, data),
  deleteCookie: (id: string) => ipcRenderer.invoke('cookie:delete', id),
  importCookie: (name: string, profileId?: string) => ipcRenderer.invoke('cookie:import', name, profileId),
  exportCookie: (id: string) => ipcRenderer.invoke('cookie:export', id),

  // Workflow
  getWorkflows: () => ipcRenderer.invoke('workflow:getAll'),
  duplicateWorkflow: (id: string) => ipcRenderer.invoke('workflow:duplicate', id),
  exportWorkflow: (id: string) => ipcRenderer.invoke('workflow:export', id),
  importWorkflow: () => ipcRenderer.invoke('workflow:import'),
  getWorkflow: (id: string) => ipcRenderer.invoke('workflow:get', id),
  createWorkflow: (data: any) => ipcRenderer.invoke('workflow:create', data),
  updateWorkflow: (id: string, data: any) => ipcRenderer.invoke('workflow:update', id, data),
  deleteWorkflow: (id: string) => ipcRenderer.invoke('workflow:delete', id),
  getWorkflowLogs: (workflowId: string) => ipcRenderer.invoke('workflow:getLogs', workflowId),
  runWorkflow: (workflowId: string, profileId: string) => ipcRenderer.invoke('workflow:run', workflowId, profileId),
  stopWorkflow: (logId: string) => ipcRenderer.invoke('workflow:stop', logId),
  getNodeDefinitions: () => ipcRenderer.invoke('automation:getNodeDefinitions'),
  getNodeCategories: () => ipcRenderer.invoke('automation:getNodeCategories'),

  // Schedules
  getSchedules: () => ipcRenderer.invoke('schedule:getAll'),
  getSchedule: (id: string) => ipcRenderer.invoke('schedule:get', id),
  createSchedule: (data: any) => ipcRenderer.invoke('schedule:create', data),
  updateSchedule: (id: string, data: any) => ipcRenderer.invoke('schedule:update', id, data),
  deleteSchedule: (id: string) => ipcRenderer.invoke('schedule:delete', id),
  toggleSchedule: (id: string, enabled: boolean) => ipcRenderer.invoke('schedule:toggle', id, enabled),
  triggerSchedule: (id: string) => ipcRenderer.invoke('schedule:trigger', id),
  getWebhookPort: () => ipcRenderer.invoke('schedule:webhookPort'),

  // Metrics
  getNodeStats: (workflowId: string) => ipcRenderer.invoke('metrics:nodeStats', workflowId),
  getNodeInstanceStats: (workflowId: string, nodeId: string) => ipcRenderer.invoke('metrics:nodeInstanceStats', workflowId, nodeId),
  getExecutionHistory: (opts?: any) => ipcRenderer.invoke('metrics:executionHistory', opts),
  cleanupMetrics: (retentionDays?: number) => ipcRenderer.invoke('metrics:cleanup', retentionDays),

  // Workflow Versions
  getWorkflowVersions: (workflowId: string) => ipcRenderer.invoke('workflow:getVersions', workflowId),
  getWorkflowVersion: (versionId: string) => ipcRenderer.invoke('workflow:getVersion', versionId),
  rollbackWorkflow: (workflowId: string, versionId: string) => ipcRenderer.invoke('workflow:rollback', workflowId, versionId),
  labelWorkflowVersion: (versionId: string, label: string) => ipcRenderer.invoke('workflow:labelVersion', versionId, label),

  // Campaign
  getCampaigns: () => ipcRenderer.invoke('campaign:getAll'),
  getCampaign: (id: string) => ipcRenderer.invoke('campaign:get', id),
  createCampaign: (data: any) => ipcRenderer.invoke('campaign:create', data),
  updateCampaign: (id: string, data: any) => ipcRenderer.invoke('campaign:update', id, data),
  deleteCampaign: (id: string) => ipcRenderer.invoke('campaign:delete', id),
  duplicateCampaign: (id: string) => ipcRenderer.invoke('campaign:duplicate', id),
  getCampaignRuns: (campaignId: string) => ipcRenderer.invoke('campaign:getRuns', campaignId),
  runCampaign: (campaignId: string) => ipcRenderer.invoke('campaign:run', campaignId),
  stopCampaign: (campaignId: string) => ipcRenderer.invoke('campaign:stop', campaignId),
  pauseCampaign: (campaignId: string) => ipcRenderer.invoke('campaign:pause', campaignId),
  resumeCampaign: (campaignId: string) => ipcRenderer.invoke('campaign:resume', campaignId),

  // Recorder
  startRecording: (profileId: string) => ipcRenderer.invoke('recorder:start', profileId),
  stopRecording: () => ipcRenderer.invoke('recorder:stop'),
  getRecorderStatus: () => ipcRenderer.invoke('recorder:status'),
  actionsToWorkflow: (actions: any[]) => ipcRenderer.invoke('recorder:toWorkflow', actions),

  // App info
  getDbPath: () => ipcRenderer.invoke('app:getDbPath'),

  // Settings
  getSetting: (key: string) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
  getAllSettings: () => ipcRenderer.invoke('settings:getAll'),
  setSettingsBatch: (settings: Record<string, string>) => ipcRenderer.invoke('settings:setBatch', settings),

  // Auth
  login: (email: string, password: string) => ipcRenderer.invoke('auth:login', email, password),
  register: (name: string, email: string, password: string) => ipcRenderer.invoke('auth:register', name, email, password),
  logout: () => ipcRenderer.invoke('auth:logout'),
  checkAuth: () => ipcRenderer.invoke('auth:check'),
  testConnection: () => ipcRenderer.invoke('auth:testConnection'),
  openBrowserLogin: () => ipcRenderer.invoke('auth:openBrowser'),

  // API proxy (restricted to known safe paths)
  apiRequest: (method: string, path: string, body?: any) => {
    const allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
    const allowedPrefixes = ['/api/profiles/', '/api/auth/']
    if (!allowedMethods.includes(method.toUpperCase())) {
      return Promise.reject(new Error(`Method "${method}" not allowed`))
    }
    if (!allowedPrefixes.some((prefix) => path.startsWith(prefix))) {
      return Promise.reject(new Error(`Path "${path}" not allowed`))
    }
    return ipcRenderer.invoke('api:request', method, path, body)
  },

  // Backup
  exportProfile: (profileId: string) => ipcRenderer.invoke('backup:export', profileId),
  importProfile: () => ipcRenderer.invoke('backup:import'),
  exportAllProfiles: () => ipcRenderer.invoke('backup:exportAll'),
  uploadProfile: (profileId: string) => ipcRenderer.invoke('backup:upload', profileId),
  downloadBackup: (backupId: string) => ipcRenderer.invoke('backup:download', backupId),
  getBackupStatus: () => ipcRenderer.invoke('backup:status'),

  // AI Chat (qua main process, tránh CORS)
  aiChat: (systemPrompt: string, messages: any[]) => ipcRenderer.invoke('ai:chat', systemPrompt, messages),

  // Events (restricted to allowed channels)
  on: (channel: string, callback: (...args: any[]) => void) => {
    if (!ALLOWED_CHANNELS.has(channel)) {
      console.warn(`IPC channel "${channel}" is not in the allowlist`)
      return
    }
    const wrappedCallback = (_event: any, ...args: any[]) => callback(...args)
    ;(callback as any).__wrappedIpc = wrappedCallback
    ipcRenderer.on(channel, wrappedCallback)
  },
  off: (channel: string, callback: (...args: any[]) => void) => {
    if (!ALLOWED_CHANNELS.has(channel)) return
    const wrappedCallback = (callback as any).__wrappedIpc
    if (wrappedCallback) {
      ipcRenderer.removeListener(channel, wrappedCallback)
    }
  }
}

contextBridge.exposeInMainWorld('api', api)

export type API = typeof api
