// Các loại trình duyệt hỗ trợ
export type BrowserType =
  | 'chrome'
  | 'brave'
  | 'edge'
  | 'firefox'
  | 'opera'
  | 'vivaldi'
  | 'chromium'
  | 'custom'

export interface BrowserInfo {
  type: BrowserType
  name: string
  version: string
  executablePath: string
  engine: 'chromium' | 'gecko'
}

// Fingerprint
export interface Fingerprint {
  userAgent: string
  screenResolution: { width: number; height: number }
  colorDepth: number
  timezone: string
  language: string
  locale: string
  platform: string
  hardwareConcurrency: number
  deviceMemory: number
  canvas: {
    noise: number
    seed: number
  }
  webgl: {
    vendor: string
    renderer: string
  }
  audioContext: {
    noise: number
    seed: number
  }
  fonts: string[]
  webrtc: {
    enabled: boolean
    publicIp?: string
    localIp?: string
  }
  doNotTrack: boolean
}

// Browser Profile
export interface BrowserProfile {
  id: string
  name: string
  tags: string[]
  folder: string
  color: string
  // Cấu hình trình duyệt
  browserType: BrowserType
  browserVersion: string
  browserExecutablePath?: string
  // Fingerprint & dữ liệu
  fingerprint: Fingerprint
  proxyId: string | null
  notes: string
  lastUsed: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateProfileInput {
  name: string
  browserType: BrowserType
  browserVersion?: string
  browserExecutablePath?: string
  tags?: string[]
  folder?: string
  color?: string
  notes?: string
  fingerprint?: Partial<Fingerprint>
  proxyId?: string | null
}

export interface UpdateProfileInput extends Partial<CreateProfileInput> {}

// Proxy
export interface Proxy {
  id: string
  name: string
  type: 'http' | 'https' | 'socks4' | 'socks5'
  host: string
  port: number
  username?: string
  password?: string
  country?: string
  status: 'alive' | 'dead' | 'unknown'
  speed?: number
  lastChecked?: string
}
