import { create } from 'zustand'
import type {
  BrowserProfile, CreateProfileInput, UpdateProfileInput, BrowserInfo,
  Proxy, CreateProxyInput, UpdateProxyInput,
  EmailAccount, CreateEmailInput, UpdateEmailInput,
  CookieEntry, CreateCookieInput, UpdateCookieInput,
  Workflow, CreateWorkflowInput, UpdateWorkflowInput, WorkflowLog, LogEntry
} from '@shared/types'

declare global {
  interface Window {
    api: {
      // Profile
      getProfiles: () => Promise<BrowserProfile[]>
      getProfile: (id: string) => Promise<BrowserProfile | null>
      createProfile: (data: CreateProfileInput) => Promise<BrowserProfile>
      updateProfile: (id: string, data: UpdateProfileInput) => Promise<BrowserProfile | null>
      deleteProfile: (id: string) => Promise<boolean>
      duplicateProfile: (id: string) => Promise<BrowserProfile | null>
      // Browser
      launchBrowser: (profileId: string) => Promise<{ success: boolean }>
      closeBrowser: (profileId: string) => Promise<{ success: boolean }>
      detectBrowsers: () => Promise<BrowserInfo[]>
      // Proxy
      getProxies: () => Promise<Proxy[]>
      getProxy: (id: string) => Promise<Proxy | null>
      createProxy: (data: CreateProxyInput) => Promise<Proxy>
      updateProxy: (id: string, data: UpdateProxyInput) => Promise<Proxy | null>
      deleteProxy: (id: string) => Promise<boolean>
      checkProxy: (id: string) => Promise<Proxy | null>
      importProxies: (lines: string[], type?: string) => Promise<Proxy[]>
      importProxiesFile: () => Promise<Proxy[]>
      // Email
      getEmails: () => Promise<EmailAccount[]>
      getEmail: (id: string) => Promise<EmailAccount | null>
      createEmail: (data: CreateEmailInput) => Promise<EmailAccount>
      updateEmail: (id: string, data: UpdateEmailInput) => Promise<EmailAccount | null>
      deleteEmail: (id: string) => Promise<boolean>
      importEmailsCSV: (csvContent?: string) => Promise<EmailAccount[]>
      // Cookie
      getCookies: () => Promise<CookieEntry[]>
      getCookie: (id: string) => Promise<CookieEntry | null>
      getCookiesByProfile: (profileId: string) => Promise<CookieEntry[]>
      createCookie: (data: CreateCookieInput) => Promise<CookieEntry>
      updateCookie: (id: string, data: UpdateCookieInput) => Promise<CookieEntry | null>
      deleteCookie: (id: string) => Promise<boolean>
      importCookie: (name: string, profileId?: string) => Promise<CookieEntry | null>
      exportCookie: (id: string) => Promise<boolean>
      // Workflow
      getWorkflows: () => Promise<Workflow[]>
      duplicateWorkflow: (id: string) => Promise<Workflow | null>
      exportWorkflow: (id: string) => Promise<boolean>
      importWorkflow: () => Promise<Workflow | null>
      getWorkflow: (id: string) => Promise<Workflow | null>
      createWorkflow: (data: CreateWorkflowInput) => Promise<Workflow>
      updateWorkflow: (id: string, data: UpdateWorkflowInput) => Promise<Workflow | null>
      deleteWorkflow: (id: string) => Promise<boolean>
      getWorkflowLogs: (workflowId: string) => Promise<WorkflowLog[]>
      runWorkflow: (workflowId: string, profileId: string) => Promise<{ logId: string; status: string; logs: LogEntry[] }>
      stopWorkflow: (logId: string) => Promise<{ success: boolean }>
      getNodeDefinitions: () => Promise<any[]>
      getNodeCategories: () => Promise<any[]>
      // Settings
      getSetting: (key: string) => Promise<string | null>
      setSetting: (key: string, value: string) => Promise<void>
      getAllSettings: () => Promise<Record<string, string>>
      setSettingsBatch: (settings: Record<string, string>) => Promise<void>
      // Auth
      login: (email: string, password: string) => Promise<any>
      register: (name: string, email: string, password: string) => Promise<any>
      logout: () => Promise<void>
      checkAuth: () => Promise<any>
      testConnection: () => Promise<any>
      // API proxy
      apiRequest: (method: string, path: string, body?: any) => Promise<any>
      // Events
      on: (channel: string, callback: (...args: any[]) => void) => void
      off: (channel: string, callback: (...args: any[]) => void) => void
    }
  }
}

interface ProfileStore {
  profiles: BrowserProfile[]
  selectedProfileId: string | null
  installedBrowsers: BrowserInfo[]
  runningProfiles: Set<string>
  loading: boolean
  viewMode: 'table' | 'grid'

  // Actions
  setViewMode: (mode: 'table' | 'grid') => void
  setSelectedProfile: (id: string | null) => void
  fetchProfiles: () => Promise<void>
  fetchBrowsers: () => Promise<void>
  createProfile: (data: CreateProfileInput) => Promise<BrowserProfile>
  updateProfile: (id: string, data: UpdateProfileInput) => Promise<void>
  deleteProfile: (id: string) => Promise<void>
  duplicateProfile: (id: string) => Promise<void>
  launchBrowser: (profileId: string) => Promise<void>
  closeBrowser: (profileId: string) => Promise<void>
}

export const useProfileStore = create<ProfileStore>((set, get) => ({
  profiles: [],
  selectedProfileId: null,
  installedBrowsers: [],
  runningProfiles: new Set(),
  loading: false,
  viewMode: 'table',

  setViewMode: (mode) => set({ viewMode: mode }),

  setSelectedProfile: (id) => set({ selectedProfileId: id }),

  fetchProfiles: async () => {
    set({ loading: true })
    try {
      const profiles = await window.api.getProfiles()
      set({ profiles })
    } finally {
      set({ loading: false })
    }
  },

  fetchBrowsers: async () => {
    const browsers = await window.api.detectBrowsers()
    set({ installedBrowsers: browsers })
  },

  createProfile: async (data) => {
    const profile = await window.api.createProfile(data)
    await get().fetchProfiles()
    return profile
  },

  updateProfile: async (id, data) => {
    await window.api.updateProfile(id, data)
    await get().fetchProfiles()
  },

  deleteProfile: async (id) => {
    await window.api.deleteProfile(id)
    const { selectedProfileId } = get()
    if (selectedProfileId === id) {
      set({ selectedProfileId: null })
    }
    await get().fetchProfiles()
  },

  duplicateProfile: async (id) => {
    await window.api.duplicateProfile(id)
    await get().fetchProfiles()
  },

  launchBrowser: async (profileId) => {
    await window.api.launchBrowser(profileId)
    set((state) => {
      const running = new Set(state.runningProfiles)
      running.add(profileId)
      return { runningProfiles: running }
    })
  },

  closeBrowser: async (profileId) => {
    await window.api.closeBrowser(profileId)
    set((state) => {
      const running = new Set(state.runningProfiles)
      running.delete(profileId)
      return { runningProfiles: running }
    })
  }
}))
