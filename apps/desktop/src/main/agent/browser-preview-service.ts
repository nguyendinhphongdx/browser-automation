import type { CDPSession, Page } from 'playwright-core'

type FrameListener = (profileId: string, dataUrl: string) => void

interface PreviewSession {
  session: CDPSession
}

/**
 * FACADE managing one CDP screencast session per profile — streams live
 * JPEG frames of a profile's active page so the renderer can show what the
 * agent (and the user watching alongside it) currently sees. Chromium
 * exposes this over the same CDP connection Playwright already drives the
 * page with (`Page.startScreencast`), so no extra video/WebRTC pipeline is
 * needed. Firefox has no CDP, so `start()` throws for firefox profiles —
 * callers should surface that as "preview not supported" rather than crash.
 */
export class BrowserPreviewService {
  private sessions = new Map<string, PreviewSession>()

  async start(profileId: string, page: Page, onFrame: FrameListener): Promise<void> {
    await this.stop(profileId)

    const session = await page.context().newCDPSession(page)

    session.on('Page.screencastFrame', (event) => {
      onFrame(profileId, `data:image/jpeg;base64,${event.data}`)
      // Chrome pauses the screencast until each frame is acked. Losing the
      // race here (session already closing) just means we stop getting
      // frames — nothing to clean up.
      session.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => {})
    })
    session.once('close', () => {
      this.sessions.delete(profileId)
    })

    await session.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 60,
      maxWidth: 960,
      maxHeight: 640,
      everyNthFrame: 1
    })

    this.sessions.set(profileId, { session })
  }

  async stop(profileId: string): Promise<void> {
    const entry = this.sessions.get(profileId)
    if (!entry) return
    this.sessions.delete(profileId)
    await entry.session.send('Page.stopScreencast').catch(() => {})
    await entry.session.detach().catch(() => {})
  }

  async stopAll(): Promise<void> {
    await Promise.all(Array.from(this.sessions.keys()).map((id) => this.stop(id)))
  }

  isActive(profileId: string): boolean {
    return this.sessions.has(profileId)
  }
}

export const browserPreviewService = new BrowserPreviewService()
