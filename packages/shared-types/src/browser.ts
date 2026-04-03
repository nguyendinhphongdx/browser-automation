/** Các loại trình duyệt hỗ trợ */
export type BrowserType =
  | 'chrome'
  | 'brave'
  | 'edge'
  | 'firefox'
  | 'opera'
  | 'vivaldi'
  | 'chromium'
  | 'custom'

export type BrowserEngine = 'chromium' | 'gecko'

/** Thông tin trình duyệt đã cài trên máy */
export interface BrowserInfo {
  type: BrowserType
  name: string
  version: string
  executablePath: string
  engine: BrowserEngine
}
