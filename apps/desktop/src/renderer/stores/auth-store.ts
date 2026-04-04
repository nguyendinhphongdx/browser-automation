import { create } from 'zustand'

interface AuthUser {
  id: string
  name: string | null
  email: string
  role: string
}

interface AuthStore {
  user: AuthUser | null
  isLoggedIn: boolean
  loading: boolean
  serverUrl: string
  connected: boolean

  // Actions
  setServerUrl: (url: string) => Promise<void>
  testConnection: () => Promise<boolean>
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  openBrowserLogin: () => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
  syncProfiles: () => Promise<void>
  listenDeepLink: () => void
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isLoggedIn: false,
  loading: false,
  serverUrl: 'http://localhost:3000',
  connected: false,

  setServerUrl: async (url) => {
    await window.api.setSetting('api.url', url)
    set({ serverUrl: url })
  },

  testConnection: async () => {
    try {
      const res = await window.api.testConnection()
      set({ connected: res.ok })
      return res.ok
    } catch {
      set({ connected: false })
      return false
    }
  },

  login: async (email, password) => {
    set({ loading: true })
    try {
      const res = await window.api.login(email, password)
      if (!res.ok) {
        throw new Error(res.error || 'Đăng nhập thất bại')
      }
      set({
        user: res.data.user,
        isLoggedIn: true,
      })
    } finally {
      set({ loading: false })
    }
  },

  register: async (name, email, password) => {
    set({ loading: true })
    try {
      const res = await window.api.register(name, email, password)
      if (!res.ok) {
        throw new Error(res.error || 'Đăng ký thất bại')
      }
      set({
        user: res.data.user,
        isLoggedIn: true,
      })
    } finally {
      set({ loading: false })
    }
  },

  openBrowserLogin: async () => {
    await window.api.openBrowserLogin()
  },

  listenDeepLink: () => {
    window.api.on('auth:deeplink-success', (data: any) => {
      set({
        user: {
          id: data.userId,
          name: data.name || null,
          email: data.email,
          role: 'USER',
        },
        isLoggedIn: true,
      })
    })
  },

  logout: () => {
    window.api.logout()
    set({ user: null, isLoggedIn: false })
  },

  checkAuth: async () => {
    try {
      const urlSetting = await window.api.getSetting('api.url')
      if (urlSetting) set({ serverUrl: urlSetting })

      const res = await window.api.checkAuth()
      if (res.ok && res.data?.user) {
        set({ user: res.data.user, isLoggedIn: true })
      } else {
        set({ user: null, isLoggedIn: false })
      }
    } catch {
      set({ user: null, isLoggedIn: false })
    }
  },

  syncProfiles: async () => {
    const { isLoggedIn } = get()
    if (!isLoggedIn) return

    try {
      const profiles = await window.api.getProfiles()
      await window.api.apiRequest('POST', '/api/profiles/sync', { profiles })
    } catch (err) {
      console.error('Sync profiles failed:', err)
    }
  },
}))
