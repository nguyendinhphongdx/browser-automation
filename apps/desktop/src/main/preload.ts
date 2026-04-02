import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Profile
  getProfiles: () => ipcRenderer.invoke('profile:getAll'),
  getProfile: (id: string) => ipcRenderer.invoke('profile:get', id),
  createProfile: (data: any) => ipcRenderer.invoke('profile:create', data),
  updateProfile: (id: string, data: any) => ipcRenderer.invoke('profile:update', id, data),
  deleteProfile: (id: string) => ipcRenderer.invoke('profile:delete', id),

  // Browser
  launchBrowser: (profileId: string) => ipcRenderer.invoke('browser:launch', profileId),
  closeBrowser: (profileId: string) => ipcRenderer.invoke('browser:close', profileId),
  detectBrowsers: () => ipcRenderer.invoke('browser:detect'),

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
