import type { IpcMain } from 'electron'
import {
  getAllProjects, getProjectById, createProject, updateProject, deleteProject,
  getTasksByProject, createTask, updateTask, updateTaskStatus, deleteTask,
  getTaskAttachments, attachResourceToTask, detachResourceFromTask,
  getTaskComments, addTaskComment, deleteTaskComment
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

  ipcMain.handle('task:getAttachments', (_e, taskId: string) => getTaskAttachments(taskId))
  ipcMain.handle('task:attachResource', (_e, taskId: string, resourceId: string) => attachResourceToTask(taskId, resourceId))
  ipcMain.handle('task:detachResource', (_e, taskId: string, resourceId: string) => detachResourceFromTask(taskId, resourceId))
  ipcMain.handle('task:getComments', (_e, taskId: string) => getTaskComments(taskId))
  ipcMain.handle('task:addComment', (_e, taskId: string, text: string, author?: string) => addTaskComment(taskId, text, author))
  ipcMain.handle('task:deleteComment', (_e, id: string) => deleteTaskComment(id))
}
