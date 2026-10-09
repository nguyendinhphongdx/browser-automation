import { create } from 'zustand'
import type { LibraryResource, LibraryResourceKind } from '@shared/types'

export type LibraryKindFilter = 'all' | LibraryResourceKind

interface LibraryStore {
  resources: LibraryResource[]
  loading: boolean
  viewMode: 'table' | 'grid'
  currentFolderId: string | null
  kindFilter: LibraryKindFilter

  setViewMode: (mode: 'table' | 'grid') => void
  setCurrentFolderId: (id: string | null) => void
  setKindFilter: (kind: LibraryKindFilter) => void

  fetchCurrentFolder: () => Promise<void>
  search: (query: string) => Promise<LibraryResource[]>
  createFolder: (name: string) => Promise<LibraryResource>
  uploadResource: (kind?: LibraryResourceKind) => Promise<LibraryResource | null>
  createPromptTemplate: (name: string, text: string, tags?: string[]) => Promise<LibraryResource>
  updateMetadata: (id: string, data: { name?: string; tags?: string[]; category?: string; notes?: string }) => Promise<void>
  updateContent: (id: string, text: string) => Promise<void>
  moveResource: (id: string, newParentId: string | null) => Promise<void>
  deleteResource: (id: string) => Promise<void>
  getTextContent: (id: string) => Promise<string | null>
  exportResource: (id: string) => Promise<boolean>
}

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  resources: [],
  loading: false,
  viewMode: 'table',
  currentFolderId: null,
  kindFilter: 'all',

  setViewMode: (mode) => set({ viewMode: mode }),
  setKindFilter: (kind) => set({ kindFilter: kind }),

  setCurrentFolderId: (id) => {
    set({ currentFolderId: id })
    get().fetchCurrentFolder()
  },

  fetchCurrentFolder: async () => {
    set({ loading: true })
    try {
      const resources = await window.api.getLibraryChildren(get().currentFolderId)
      set({ resources })
    } finally {
      set({ loading: false })
    }
  },

  search: (query) => window.api.searchLibraryResources(query),

  createFolder: async (name) => {
    const folder = await window.api.createLibraryFolder(name, get().currentFolderId)
    await get().fetchCurrentFolder()
    return folder
  },

  uploadResource: async (kind) => {
    const resource = await window.api.uploadLibraryResource({ kind, parentId: get().currentFolderId })
    if (resource) await get().fetchCurrentFolder()
    return resource
  },

  createPromptTemplate: async (name, text, tags) => {
    const resource = await window.api.createPromptTemplate(name, text, { tags, parentId: get().currentFolderId })
    await get().fetchCurrentFolder()
    return resource
  },

  updateMetadata: async (id, data) => {
    await window.api.updateLibraryResourceMetadata(id, data)
    await get().fetchCurrentFolder()
  },

  updateContent: async (id, text) => {
    await window.api.updateLibraryResourceContent(id, text)
    await get().fetchCurrentFolder()
  },

  moveResource: async (id, newParentId) => {
    await window.api.moveLibraryResource(id, newParentId)
    await get().fetchCurrentFolder()
  },

  deleteResource: async (id) => {
    await window.api.deleteLibraryResource(id)
    await get().fetchCurrentFolder()
  },

  getTextContent: (id) => window.api.getLibraryResourceText(id),
  exportResource: (id) => window.api.exportLibraryResource(id)
}))
