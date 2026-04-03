/** Cấu hình fingerprint cho mỗi browser profile */
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
