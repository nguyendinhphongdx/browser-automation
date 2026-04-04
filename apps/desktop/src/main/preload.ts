import { contextBridge, ipcRenderer } from 'electron'

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

  // API proxy
  apiRequest: (method: string, path: string, body?: any) => ipcRenderer.invoke('api:request', method, path, body),

  // Backup
  exportProfile: (profileId: string) => ipcRenderer.invoke('backup:export', profileId),
  importProfile: () => ipcRenderer.invoke('backup:import'),
  exportAllProfiles: () => ipcRenderer.invoke('backup:exportAll'),
  uploadProfile: (profileId: string) => ipcRenderer.invoke('backup:upload', profileId),
  downloadBackup: (backupId: string) => ipcRenderer.invoke('backup:download', backupId),
  getBackupStatus: () => ipcRenderer.invoke('backup:status'),

  // AI Chat (qua main process, tránh CORS)
  aiChat: (systemPrompt: string, messages: any[]) => ipcRenderer.invoke('ai:chat', systemPrompt, messages),

  // Events
  on: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args))
  },
  off: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type API = typeof api
