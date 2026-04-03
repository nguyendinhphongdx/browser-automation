import type { BrowserType, Fingerprint } from '@browser-automation/shared-types'
import {
  USER_AGENTS,
  SCREEN_RESOLUTIONS,
  TIMEZONES,
  LANGUAGES,
  WEBGL_VENDORS,
  WEBGL_RENDERERS,
  COMMON_FONTS
} from './data'

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomSubset<T>(arr: T[], min: number, max: number): T[] {
  const count = randomInt(min, max)
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

/** Tạo fingerprint ngẫu nhiên cho một loại trình duyệt */
export function generateFingerprint(
  browserType: BrowserType,
  overrides?: Partial<Fingerprint>
): Fingerprint {
  const agentKey = browserType === 'custom' ? 'chrome' : browserType
  const agents = USER_AGENTS[agentKey] || USER_AGENTS.chrome

  const fingerprint: Fingerprint = {
    userAgent: randomItem(agents),
    screenResolution: randomItem(SCREEN_RESOLUTIONS),
    colorDepth: randomItem([24, 32]),
    timezone: randomItem(TIMEZONES),
    language: randomItem(LANGUAGES),
    locale: randomItem(LANGUAGES),
    platform: randomItem(['Win32', 'MacIntel', 'Linux x86_64']),
    hardwareConcurrency: randomItem([2, 4, 6, 8, 12, 16]),
    deviceMemory: randomItem([2, 4, 8, 16]),
    canvas: {
      noise: Math.random() * 0.1,
      seed: randomInt(1, 999999)
    },
    webgl: {
      vendor: randomItem(WEBGL_VENDORS),
      renderer: randomItem(WEBGL_RENDERERS)
    },
    audioContext: {
      noise: Math.random() * 0.0001,
      seed: randomInt(1, 999999)
    },
    fonts: randomSubset(COMMON_FONTS, 8, COMMON_FONTS.length),
    webrtc: {
      enabled: false
    },
    doNotTrack: randomItem([true, false])
  }

  if (overrides) {
    return { ...fingerprint, ...overrides }
  }

  return fingerprint
}
