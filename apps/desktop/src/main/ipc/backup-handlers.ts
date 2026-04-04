import type { IpcMain } from 'electron'
import {
  exportProfile,
  importProfile,
  exportAllProfiles,
  uploadProfile,
  downloadBackup,
  getBackupStatus
} from '../services/backup-service'

// Validate ID format to prevent path traversal / injection
const ID_PATTERN = /^[a-zA-Z0-9_-]+$/

function validateId(id: unknown, label: string): string {
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
    throw new Error(`${label} không hợp lệ`)
  }
  return id
}

export function registerBackupHandlers(ipcMain: IpcMain) {
  ipcMain.handle('backup:export', async (_event, profileId: string) => {
    const filePath = await exportProfile(validateId(profileId, 'profileId'))
    return { success: true, filePath }
  })

  ipcMain.handle('backup:import', async () => {
    const profile = await importProfile()
    return { success: true, profile }
  })

  ipcMain.handle('backup:exportAll', async () => {
    const filePath = await exportAllProfiles()
    return { success: true, filePath }
  })

  ipcMain.handle('backup:upload', async (_event, profileId: string) => {
    await uploadProfile(validateId(profileId, 'profileId'))
    return { success: true }
  })

  ipcMain.handle('backup:download', async (_event, backupId: string) => {
    const profile = await downloadBackup(validateId(backupId, 'backupId'))
    return { success: true, profile }
  })

  ipcMain.handle('backup:status', async () => {
    const statuses = await getBackupStatus()
    return { success: true, statuses }
  })
}
