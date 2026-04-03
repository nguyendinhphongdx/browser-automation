import { create } from 'zustand'
import type {
  Campaign, CreateCampaignInput, UpdateCampaignInput,
  CampaignRun, CampaignProfileResult, CampaignExecution
} from '@shared/types'

export const DEFAULT_EXECUTION: CampaignExecution = {
  mode: 'parallel',
  maxConcurrent: 3,
  delayBetweenProfiles: { min: 1000, max: 5000 },
  workflowOrder: 'sequential',
  profileOrder: 'sequential',
  repeatCount: 0,
  repeatDelay: { min: 5000, max: 10000 },
  stopOnError: false,
  retryOnError: 1,
  warmUp: false,
  warmUpStep: 1,
  warmUpDelay: 10000,
}

interface CampaignStore {
  campaigns: Campaign[]
  activeCampaign: Campaign | null
  runs: CampaignRun[]
  loading: boolean

  // Realtime execution state
  isRunning: boolean
  profileResults: CampaignProfileResult[]

  // Actions
  fetchCampaigns: () => Promise<void>
  setCampaign: (id: string | null) => Promise<void>
  createCampaign: (data: CreateCampaignInput) => Promise<Campaign>
  updateCampaign: (id: string, data: UpdateCampaignInput) => Promise<void>
  deleteCampaign: (id: string) => Promise<void>
  duplicateCampaign: (id: string) => Promise<void>
  fetchRuns: (campaignId: string) => Promise<void>

  // Execution
  setRunning: (running: boolean) => void
  setProfileResults: (results: CampaignProfileResult[]) => void
  updateProfileResult: (profileId: string, workflowId: string, update: Partial<CampaignProfileResult>) => void
}

export const useCampaignStore = create<CampaignStore>((set, get) => ({
  campaigns: [],
  activeCampaign: null,
  runs: [],
  loading: false,
  isRunning: false,
  profileResults: [],

  fetchCampaigns: async () => {
    set({ loading: true })
    try {
      const campaigns = await window.api.getCampaigns()
      set({ campaigns })
    } finally {
      set({ loading: false })
    }
  },

  setCampaign: async (id) => {
    if (!id) {
      set({ activeCampaign: null, runs: [] })
      return
    }
    const campaign = await window.api.getCampaign(id)
    set({ activeCampaign: campaign })
    if (campaign) {
      await get().fetchRuns(campaign.id)
    }
  },

  createCampaign: async (data) => {
    const campaign = await window.api.createCampaign(data)
    await get().fetchCampaigns()
    set({ activeCampaign: campaign })
    return campaign
  },

  updateCampaign: async (id, data) => {
    await window.api.updateCampaign(id, data)
    await get().fetchCampaigns()
    const current = get().activeCampaign
    if (current?.id === id) {
      const updated = await window.api.getCampaign(id)
      set({ activeCampaign: updated })
    }
  },

  deleteCampaign: async (id) => {
    await window.api.deleteCampaign(id)
    const current = get().activeCampaign
    if (current?.id === id) {
      set({ activeCampaign: null })
    }
    await get().fetchCampaigns()
  },

  duplicateCampaign: async (id) => {
    await window.api.duplicateCampaign(id)
    await get().fetchCampaigns()
  },

  fetchRuns: async (campaignId) => {
    const runs = await window.api.getCampaignRuns(campaignId)
    set({ runs })
  },

  setRunning: (running) => set({ isRunning: running }),

  setProfileResults: (results) => set({ profileResults: results }),

  updateProfileResult: (profileId, workflowId, update) => {
    const results = get().profileResults.map(r =>
      r.profileId === profileId && r.workflowId === workflowId
        ? { ...r, ...update }
        : r
    )
    set({ profileResults: results })
  },
}))
