import { create } from 'zustand'
import type { BrowserProfile, CreateProfileInput, UpdateProfileInput, BrowserInfo } from '@shared/types'

declare global {
  interface Window {
    api: {
      getProfiles: () => Promise<BrowserProfile[]>
      getProfile: (id: string) => Promise<BrowserProfile | null>
      createProfile: (data: CreateProfileInput) => Promise<BrowserProfile>
      updateProfile: (id: string, data: UpdateProfileInput) => Promise<BrowserProfile | null>
      deleteProfile: (id: string) => Promise<boolean>
      launchBrowser: (profileId: string) => Promise<{ success: boolean }>
      closeBrowser: (profileId: string) => Promise<{ success: boolean }>
      detectBrowsers: () => Promise<BrowserInfo[]>
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
