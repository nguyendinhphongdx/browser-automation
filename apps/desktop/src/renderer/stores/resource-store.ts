import { create } from 'zustand'
import type {
  Proxy, CreateProxyInput, UpdateProxyInput,
  EmailAccount, CreateEmailInput, UpdateEmailInput,
  CookieEntry, CreateCookieInput, UpdateCookieInput
} from '@shared/types'

interface ResourceStore {
  // Data
  proxies: Proxy[]
  emails: EmailAccount[]
  cookies: CookieEntry[]
  activeTab: 'proxy' | 'email' | 'cookie'
  loading: boolean

  // Tab
  setActiveTab: (tab: 'proxy' | 'email' | 'cookie') => void

  // Proxy actions
  fetchProxies: () => Promise<void>
  createProxy: (data: CreateProxyInput) => Promise<Proxy>
  updateProxy: (id: string, data: UpdateProxyInput) => Promise<void>
  deleteProxy: (id: string) => Promise<void>
  checkProxy: (id: string) => Promise<void>
  importProxies: (lines: string[], type?: string) => Promise<Proxy[]>
  importProxiesFile: () => Promise<Proxy[]>

  // Email actions
  fetchEmails: () => Promise<void>
  createEmail: (data: CreateEmailInput) => Promise<EmailAccount>
  updateEmail: (id: string, data: UpdateEmailInput) => Promise<void>
  deleteEmail: (id: string) => Promise<void>
  importEmailsCSV: (csvContent?: string) => Promise<EmailAccount[]>

  // Cookie actions
  fetchCookies: () => Promise<void>
  createCookie: (data: CreateCookieInput) => Promise<CookieEntry>
  updateCookie: (id: string, data: UpdateCookieInput) => Promise<void>
  deleteCookie: (id: string) => Promise<void>
  importCookieFile: (name: string, profileId?: string) => Promise<CookieEntry | null>
  exportCookie: (id: string) => Promise<boolean>
}

export const useResourceStore = create<ResourceStore>((set, get) => ({
  proxies: [],
  emails: [],
  cookies: [],
  activeTab: 'proxy',
  loading: false,

  setActiveTab: (tab) => set({ activeTab: tab }),

  // ── Proxy ─────────────────────────────────────────
  fetchProxies: async () => {
    set({ loading: true })
    try {
      const proxies = await window.api.getProxies()
      set({ proxies })
    } finally {
      set({ loading: false })
    }
  },

  createProxy: async (data) => {
    const proxy = await window.api.createProxy(data)
    await get().fetchProxies()
    return proxy
  },

  updateProxy: async (id, data) => {
    await window.api.updateProxy(id, data)
    await get().fetchProxies()
  },

  deleteProxy: async (id) => {
    await window.api.deleteProxy(id)
    await get().fetchProxies()
  },

  checkProxy: async (id) => {
    await window.api.checkProxy(id)
    await get().fetchProxies()
  },

  importProxies: async (lines, type) => {
    const result = await window.api.importProxies(lines, type)
    await get().fetchProxies()
    return result
  },

  importProxiesFile: async () => {
    const result = await window.api.importProxiesFile()
    await get().fetchProxies()
    return result
  },

  // ── Email ─────────────────────────────────────────
  fetchEmails: async () => {
    set({ loading: true })
    try {
      const emails = await window.api.getEmails()
      set({ emails })
    } finally {
      set({ loading: false })
    }
  },

  createEmail: async (data) => {
    const email = await window.api.createEmail(data)
    await get().fetchEmails()
    return email
  },

  updateEmail: async (id, data) => {
    await window.api.updateEmail(id, data)
    await get().fetchEmails()
  },

  deleteEmail: async (id) => {
    await window.api.deleteEmail(id)
    await get().fetchEmails()
  },

  importEmailsCSV: async (csvContent) => {
    const result = await window.api.importEmailsCSV(csvContent)
    await get().fetchEmails()
    return result
  },

  // ── Cookie ────────────────────────────────────────
  fetchCookies: async () => {
    set({ loading: true })
    try {
      const cookies = await window.api.getCookies()
      set({ cookies })
    } finally {
      set({ loading: false })
    }
  },

  createCookie: async (data) => {
    const cookie = await window.api.createCookie(data)
    await get().fetchCookies()
    return cookie
  },

  updateCookie: async (id, data) => {
    await window.api.updateCookie(id, data)
    await get().fetchCookies()
  },

  deleteCookie: async (id) => {
    await window.api.deleteCookie(id)
    await get().fetchCookies()
  },

  importCookieFile: async (name, profileId) => {
    const result = await window.api.importCookie(name, profileId)
    await get().fetchCookies()
    return result
  },

  exportCookie: async (id) => {
    return await window.api.exportCookie(id)
  }
}))
