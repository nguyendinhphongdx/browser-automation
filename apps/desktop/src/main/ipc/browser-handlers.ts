import type { IpcMain } from 'electron'
import { launchBrowser, closeBrowser } from '../browser/launcher'
import { detectInstalledBrowsers } from '../browser/detect'
import { getProfileById, updateLastUsed } from '../services/profile-service'

export function registerBrowserHandlers(ipcMain: IpcMain) {
  ipcMain.handle('browser:launch', async (_event, profileId: string) => {
    try {
      const profile = getProfileById(profileId)
      if (!profile) {
        throw new Error(`Profile "${profileId}" không tồn tại`)
      }

      await launchBrowser(profile)
      updateLastUsed(profileId)
      return { success: true }
    } catch (err: any) {
      console.error('[browser:launch]', err)
      throw new Error(err.message || 'Không thể khởi chạy trình duyệt')
    }
  })

  ipcMain.handle('browser:close', async (_event, profileId: string) => {
    try {
      await closeBrowser(profileId)
      return { success: true }
    } catch (err: any) {
      console.error('[browser:close]', err)
      throw new Error(err.message || 'Không thể đóng trình duyệt')
    }
  })

  ipcMain.handle('browser:detect', () => {
    try {
      return detectInstalledBrowsers()
    } catch (err: any) {
      console.error('[browser:detect]', err)
      return []
    }
  })
}
