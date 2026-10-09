import { useCallback, useEffect, useRef, useState } from 'react'

export type BrowserPreviewStatus = 'idle' | 'starting' | 'live' | 'unavailable'

interface BrowserPreviewFramePayload {
  profileId: string
  dataUrl: string
}

/**
 * OBSERVER: connects to a CDP screencast for `profileId` (see
 * main/agent/browser-preview-service.ts) — but only ever *connects* to a
 * browser that's already running; it never launches one. Opening the AI
 * Agent panel used to auto-launch a real browser as a side effect, which
 * was surprising when the user just wanted to chat. Now nothing launches
 * until the model explicitly calls the start_browser tool (or the user
 * hits Play themselves) — `reconnect()` is how the caller re-attempts the
 * connection once that happens, and `disconnect()` is how it reacts to the
 * browser being closed again.
 */
export function useBrowserPreview(profileId: string | undefined) {
  const [status, setStatus] = useState<BrowserPreviewStatus>('idle')
  const [frame, setFrame] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const activeProfileIdRef = useRef<string | null>(null)
  // Invalidates a connect() call that's still in flight when a newer one
  // starts (profile change, reconnect, or unmount) — so a stale response
  // can't clobber state for whatever is current by the time it resolves.
  const generationRef = useRef(0)

  const connect = useCallback(async (id: string) => {
    const myGeneration = ++generationRef.current
    setStatus('starting')
    setMessage(null)
    const result = await window.api.startBrowserPreview(id)
    if (generationRef.current !== myGeneration) return
    if (result.success) {
      activeProfileIdRef.current = result.profileId ?? id
    } else {
      activeProfileIdRef.current = null
      setStatus('unavailable')
      setMessage(
        result.reason === 'unsupported'
          ? 'Trình duyệt này không hỗ trợ xem trực tiếp (chỉ Chromium).'
          : result.message || 'Chưa có trình duyệt nào đang mở cho profile này.'
      )
    }
  }, [])

  useEffect(() => {
    if (profileId === undefined) {
      setStatus('idle')
      setFrame(null)
      activeProfileIdRef.current = null
      return
    }

    setFrame(null)

    const unsubscribe = window.api.on('browserPreview:frame', (payload: BrowserPreviewFramePayload) => {
      if (payload.profileId !== activeProfileIdRef.current) return
      setFrame(payload.dataUrl)
      setStatus('live')
    })

    connect(profileId)

    return () => {
      generationRef.current++ // invalidate any connect() still in flight
      unsubscribe()
      activeProfileIdRef.current = null
      window.api.stopBrowserPreview(profileId)
    }
  }, [profileId, connect])

  // Re-attempt the connection — call after the agent's start_browser tool
  // (or anything else) brings a browser into existence mid-session.
  const reconnect = useCallback(() => {
    if (profileId !== undefined) connect(profileId)
  }, [profileId, connect])

  // Drop the connection without launching/stopping the browser itself —
  // call after the agent's close_browser tool succeeds.
  const disconnect = useCallback(() => {
    if (profileId === undefined) return
    generationRef.current++
    window.api.stopBrowserPreview(profileId)
    activeProfileIdRef.current = null
    setStatus('idle')
    setFrame(null)
    setMessage(null)
  }, [profileId])

  return { status, frame, message, reconnect, disconnect }
}
