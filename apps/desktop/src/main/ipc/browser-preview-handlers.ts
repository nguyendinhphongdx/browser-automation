import type { IpcMain, IpcMainInvokeEvent } from 'electron'
import { getActiveBrowserContext } from '../browser/launcher'
import { getProfileById } from '../services/profile-service'
import { DEFAULT_PROFILE_ID } from '../database/init'
import { browserPreviewService } from '../agent/browser-preview-service'

export interface BrowserPreviewStartResult {
  success: boolean
  reason?: 'no-such-profile' | 'no-active-browser' | 'unsupported'
  message?: string
  // The resolved profile id frames will actually be tagged with (may differ
  // from the id the caller passed in, e.g. '' resolves to the real default
  // profile's id) — callers should filter incoming frames by this, not by
  // what they sent.
  profileId?: string
}

export function registerBrowserPreviewHandlers(ipcMain: IpcMain) {
  ipcMain.handle(
    'browserPreview:start',
    async (event: IpcMainInvokeEvent, rawProfileId: string): Promise<BrowserPreviewStartResult> => {
      // Same convention as agent-handlers.ts / automation-handlers.ts's
      // workflow:run: '' from the dropdown means "Default browser", not
      // "no profile".
      const profileId = rawProfileId || DEFAULT_PROFILE_ID
      if (!getProfileById(profileId)) {
        return { success: false, reason: 'no-such-profile' }
      }

      // Read-only — never launch a browser just to show a preview of it.
      // The agent's start_browser tool (or the user manually hitting Play)
      // is what brings a browser into existence; this only connects to one
      // that's already running.
      const active = getActiveBrowserContext(profileId)
      if (!active) {
        return { success: false, reason: 'no-active-browser' }
      }
      const pages = active.context.pages().filter((p) => !p.isClosed())
      const page = pages[pages.length - 1]
      if (!page) {
        return { success: false, reason: 'no-active-browser' }
      }

      try {
        await browserPreviewService.start(profileId, page, (id, dataUrl) => {
          event.sender.send('browserPreview:frame', { profileId: id, dataUrl })
        })
        return { success: true, profileId }
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

  ipcMain.handle('browserPreview:stop', async (_e, rawProfileId: string) => {
    // Must resolve the same way start() did — the service's internal map is
    // keyed by the resolved id, so stopping with the raw '' would silently
    // miss it and leak the CDP session.
    await browserPreviewService.stop(rawProfileId || DEFAULT_PROFILE_ID)
    return { success: true }
  })
}
