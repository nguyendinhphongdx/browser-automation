import type { IpcMain, IpcMainInvokeEvent } from 'electron'
import { acquireBrowserPage } from '../browser/launcher'
import { getProfileById } from '../services/profile-service'
import { browserPreviewService } from '../agent/browser-preview-service'

export interface BrowserPreviewStartResult {
  success: boolean
  reason?: 'no-such-profile' | 'launch-failed' | 'unsupported'
  message?: string
}

export function registerBrowserPreviewHandlers(ipcMain: IpcMain) {
  ipcMain.handle(
    'browserPreview:start',
    async (event: IpcMainInvokeEvent, profileId: string): Promise<BrowserPreviewStartResult> => {
      const profile = getProfileById(profileId)
      if (!profile) {
        return { success: false, reason: 'no-such-profile' }
      }

      // Same auto-launch helper agent-handlers.ts uses: opening the AI
      // Agent panel should show a live browser without the user having to
      // separately hit "launch" first.
      let page
      try {
        page = (await acquireBrowserPage(profile)).page
      } catch (err) {
        return {
          success: false,
          reason: 'launch-failed',
          message: err instanceof Error ? err.message : String(err)
        }
      }

      try {
        await browserPreviewService.start(profileId, page, (id, dataUrl) => {
          event.sender.send('browserPreview:frame', { profileId: id, dataUrl })
        })
        return { success: true }
      } catch (err) {
        // Most commonly: a non-Chromium (Firefox) profile — CDP screencast
        // doesn't exist there.
        return {
          success: false,
          reason: 'unsupported',
          message: err instanceof Error ? err.message : String(err)
        }
      }
    }
  )

  ipcMain.handle('browserPreview:stop', async (_e, profileId: string) => {
    await browserPreviewService.stop(profileId)
    return { success: true }
  })
}
