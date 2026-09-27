import { useEffect, useState } from 'react'

export type BrowserPreviewStatus = 'idle' | 'starting' | 'live' | 'unavailable'

interface BrowserPreviewFramePayload {
  profileId: string
  dataUrl: string
}

/**
 * OBSERVER: starts a CDP screencast for `profileId` (see
 * main/agent/browser-preview-service.ts) for as long as this hook stays
 * mounted, subscribes to the resulting frame stream, and tears the
 * screencast down again on unmount/profile change — so opening the AI
 * Agent drawer is what turns the live view on, and closing it (or picking
 * a different profile) turns it back off.
 */
export function useBrowserPreview(profileId: string | undefined) {
  const [status, setStatus] = useState<BrowserPreviewStatus>('idle')
  const [frame, setFrame] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!profileId) {
      setStatus('idle')
      setFrame(null)
      return
    }

    let cancelled = false
    setStatus('starting')
    setFrame(null)
    setMessage(null)

    const unsubscribe = window.api.on('browserPreview:frame', (payload: BrowserPreviewFramePayload) => {
      if (cancelled || payload.profileId !== profileId) return
      setFrame(payload.dataUrl)
      setStatus('live')
    })

    window.api.startBrowserPreview(profileId).then((result) => {
      if (cancelled) return
      if (!result.success) {
        setStatus('unavailable')
        setMessage(
          result.reason === 'unsupported'
            ? 'Trình duyệt này không hỗ trợ xem trực tiếp (chỉ Chromium).'
            : result.message || 'Không thể mở trình duyệt cho profile này.'
        )
      }
    })

    return () => {
      cancelled = true
      unsubscribe()
      window.api.stopBrowserPreview(profileId)
    }
  }, [profileId])

  return { status, frame, message }
}
