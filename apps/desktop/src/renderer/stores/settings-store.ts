import { create } from 'zustand'

interface AuthUser {
  userId: string
  email: string
  name: string
}

interface SettingsStore {
  settings: Record<string, string>
  loading: boolean
  connected: boolean
  checking: boolean
  auth: AuthUser | null

  // Actions
  fetchSettings: () => Promise<void>
  updateSetting: (key: string, value: string) => Promise<void>
  updateSettingsBatch: (settings: Record<string, string>) => Promise<void>

  // Connection
  testConnection: () => Promise<boolean>

  // Auth
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  register: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: {},
  loading: false,
  connected: false,
  checking: false,
  auth: null,

  fetchSettings: async () => {
    set({ loading: true })
    try {
      const settings = await window.api.getAllSettings()
      const auth: AuthUser | null = settings['auth.userId']
        ? { userId: settings['auth.userId'], email: settings['auth.email'] || '', name: settings['auth.name'] || '' }
        : null
      set({ settings, auth })
    } finally {
      set({ loading: false })
    }
  },

  updateSetting: async (key, value) => {
    await window.api.setSetting(key, value)
    set(state => ({ settings: { ...state.settings, [key]: value } }))
  },

  updateSettingsBatch: async (newSettings) => {
    await window.api.setSettingsBatch(newSettings)
    set(state => ({ settings: { ...state.settings, ...newSettings } }))
  },

  testConnection: async () => {
    set({ checking: true })
    try {
      const res = await window.api.testConnection()
      set({ connected: res.ok })
      return res.ok
    } catch {
      set({ connected: false })
      return false
    } finally {
      set({ checking: false })
    }
  },

  login: async (email, password) => {
    const res = await window.api.login(email, password)
    if (res.ok) {
      await get().fetchSettings()
    }
    return { ok: res.ok, error: res.error }
  },

  register: async (name, email, password) => {
    const res = await window.api.register(name, email, password)
    if (res.ok) {
      await get().fetchSettings()
    }
    return { ok: res.ok, error: res.error }
  },

  logout: async () => {
    await window.api.logout()
    set({ auth: null })
    await get().fetchSettings()
  },

  checkAuth: async () => {
    const res = await window.api.checkAuth()
    if (!res.ok) {
      set({ auth: null })
    }
  }
}))
