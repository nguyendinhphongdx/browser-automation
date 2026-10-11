import type { IpcMain } from 'electron'
import {
  getAllProjects, getProjectById, createProject, updateProject, deleteProject,
  getTasksByProject, createTask, updateTask, updateTaskStatus, deleteTask
} from '../services/project-service'
import type { TaskStatus } from '../../shared/types'

export function registerProjectHandlers(ipcMain: IpcMain) {
  ipcMain.handle('project:getAll', () => getAllProjects())
  ipcMain.handle('project:get', (_e, id: string) => getProjectById(id))
  ipcMain.handle('project:create', (_e, data) => createProject(data))
  ipcMain.handle('project:update', (_e, id: string, data) => updateProject(id, data))
  ipcMain.handle('project:delete', (_e, id: string) => deleteProject(id))

  ipcMain.handle('task:getByProject', (_e, projectId: string) => getTasksByProject(projectId))
  ipcMain.handle('task:create', (_e, data) => createTask(data))
  ipcMain.handle('task:update', (_e, id: string, data) => updateTask(id, data))
  ipcMain.handle('task:updateStatus', (_e, id: string, status: TaskStatus) => updateTaskStatus(id, status))
  ipcMain.handle('task:delete', (_e, id: string) => deleteTask(id))
}
