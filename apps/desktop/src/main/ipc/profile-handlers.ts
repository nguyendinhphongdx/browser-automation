import type { IpcMain } from 'electron'
import {
  getAllProfiles,
  getProfileById,
  createProfile,
  updateProfile,
  deleteProfile,
  duplicateProfile
} from '../services/profile-service'

export function registerProfileHandlers(ipcMain: IpcMain) {
  ipcMain.handle('profile:getAll', () => {
    return getAllProfiles()
  })

  ipcMain.handle('profile:get', (_event, id: string) => {
    return getProfileById(id)
  })

  ipcMain.handle('profile:create', (_event, data) => {
    return createProfile(data)
  })

  ipcMain.handle('profile:update', (_event, id: string, data) => {
    return updateProfile(id, data)
  })

  ipcMain.handle('profile:delete', (_event, id: string) => {
    return deleteProfile(id)
  })

  ipcMain.handle('profile:duplicate', (_event, id: string) => {
    return duplicateProfile(id)
  })
}
