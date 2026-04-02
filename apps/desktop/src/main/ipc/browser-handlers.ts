import type { IpcMain } from 'electron'
import { launchBrowser, closeBrowser } from '../browser/launcher'
import { detectInstalledBrowsers } from '../browser/detect'
import { getProfileById, updateLastUsed } from '../services/profile-service'

export function registerBrowserHandlers(ipcMain: IpcMain) {
  ipcMain.handle('browser:launch', async (_event, profileId: string) => {
    const profile = getProfileById(profileId)
    if (!profile) {
      throw new Error(`Profile "${profileId}" không tồn tại`)
    }

    await launchBrowser(profile)
    updateLastUsed(profileId)
    return { success: true }
  })

  ipcMain.handle('browser:close', async (_event, profileId: string) => {
    await closeBrowser(profileId)
    return { success: true }
  })

  ipcMain.handle('browser:detect', () => {
    return detectInstalledBrowsers()
  })
}
