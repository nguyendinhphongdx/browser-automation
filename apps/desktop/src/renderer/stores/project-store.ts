import { create } from 'zustand'
import type {
  Project, CreateProjectInput, UpdateProjectInput,
  Task, CreateTaskInput, UpdateTaskInput, TaskStatus
} from '@shared/types'

interface ProjectStore {
  projects: Project[]
  activeProject: Project | null
  tasks: Task[]
  loading: boolean

  fetchProjects: () => Promise<void>
  setProject: (id: string | null) => Promise<void>
  createProject: (data: CreateProjectInput) => Promise<Project>
  updateProject: (id: string, data: UpdateProjectInput) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  fetchTasks: (projectId: string) => Promise<void>
  createTask: (data: CreateTaskInput) => Promise<Task>
  updateTask: (id: string, data: UpdateTaskInput) => Promise<void>
  updateTaskStatus: (id: string, status: TaskStatus) => Promise<void>
  deleteTask: (id: string) => Promise<void>
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  activeProject: null,
  tasks: [],
  loading: false,

  fetchProjects: async () => {
    set({ loading: true })
    try {
      const projects = await window.api.getProjects()
      set({ projects })
    } finally {
      set({ loading: false })
    }
  },

  setProject: async (id) => {
    if (!id) {
      set({ activeProject: null, tasks: [] })
      return
    }
    const project = await window.api.getProject(id)
    set({ activeProject: project })
    if (project) {
      await get().fetchTasks(project.id)
    }
  },

  createProject: async (data) => {
    const project = await window.api.createProject(data)
    await get().fetchProjects()
    set({ activeProject: project })
    return project
  },

  updateProject: async (id, data) => {
    await window.api.updateProject(id, data)
    await get().fetchProjects()
    const current = get().activeProject
    if (current?.id === id) {
      const updated = await window.api.getProject(id)
      set({ activeProject: updated })
    }
  },

  deleteProject: async (id) => {
    await window.api.deleteProject(id)
    const current = get().activeProject
    if (current?.id === id) {
      set({ activeProject: null, tasks: [] })
    }
    await get().fetchProjects()
  },

  fetchTasks: async (projectId) => {
    const tasks = await window.api.getTasksByProject(projectId)
    set({ tasks })
  },

  createTask: async (data) => {
    const task = await window.api.createTask(data)
    await get().fetchTasks(data.projectId)
    return task
  },

  updateTask: async (id, data) => {
    await window.api.updateTask(id, data)
    const projectId = get().activeProject?.id
    if (projectId) await get().fetchTasks(projectId)
  },

  updateTaskStatus: async (id, status) => {
    await window.api.updateTaskStatus(id, status)
    const projectId = get().activeProject?.id
    if (projectId) await get().fetchTasks(projectId)
  },

  deleteTask: async (id) => {
    await window.api.deleteTask(id)
    const projectId = get().activeProject?.id
    if (projectId) await get().fetchTasks(projectId)
  }
}))
