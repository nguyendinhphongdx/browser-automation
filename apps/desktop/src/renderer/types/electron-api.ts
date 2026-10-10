import type { API } from '../../main/preload'

/**
 * Single source of truth for `window.api`'s shape — derived from preload.ts's
 * own `export type API = typeof api`, never hand-duplicated. See
 * docs/conventions/04-window-api-contract.md + ADR-0002 for why: a
 * hand-written copy of this shape previously lived in profile-store.ts and
 * silently drifted out of sync with real preload.ts methods (17 real
 * TS2339 errors at the time this file was introduced).
 */
declare global {
  interface Window {
    api: API
  }
}

export type {}
