import type { BrowserType, Fingerprint } from '../../shared/types'

// Danh sách User-Agent phổ biến theo từng loại trình duyệt
const USER_AGENTS: Record<string, string[]> = {
  chrome: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ],
  brave: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ],
  edge: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
  ],
  firefox: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0'
  ],
  opera: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0'
  ],
  vivaldi: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ],
  chromium: [
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ]
}

const SCREEN_RESOLUTIONS = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1536, height: 864 },
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 2560, height: 1440 },
  { width: 1600, height: 900 },
  { width: 1280, height: 1024 }
]

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'America/Denver',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Ho_Chi_Minh',
  'Asia/Seoul',
  'Asia/Singapore',
  'Australia/Sydney'
]

const LANGUAGES = ['en-US', 'en-GB', 'fr-FR', 'de-DE', 'ja-JP', 'zh-CN', 'ko-KR', 'vi-VN', 'es-ES', 'pt-BR']

const WEBGL_VENDORS = ['Google Inc.', 'Google Inc. (NVIDIA)', 'Google Inc. (Intel)', 'Google Inc. (AMD)']

const WEBGL_RENDERERS = [
  'ANGLE (NVIDIA GeForce GTX 1060 Direct3D11 vs_5_0 ps_5_0)',
  'ANGLE (NVIDIA GeForce GTX 1660 SUPER Direct3D11 vs_5_0 ps_5_0)',
  'ANGLE (NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)',
  'ANGLE (Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0)',
  'ANGLE (Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0)',
  'ANGLE (AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0)',
  'ANGLE (AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0)',
  'Mesa Intel(R) UHD Graphics 630 (CFL GT2)',
  'Mesa Intel(R) Xe Graphics (TGL GT2)'
]

const COMMON_FONTS = [
  'Arial',
  'Arial Black',
  'Comic Sans MS',
  'Courier New',
  'Georgia',
  'Impact',
  'Lucida Console',
  'Lucida Sans Unicode',
  'Microsoft Sans Serif',
  'Palatino Linotype',
  'Tahoma',
  'Times New Roman',
  'Trebuchet MS',
  'Verdana'
]

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

  // Áp dụng overrides
  if (overrides) {
    return { ...fingerprint, ...overrides }
  }

  return fingerprint
}
