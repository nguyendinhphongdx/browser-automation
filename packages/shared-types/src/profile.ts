import type { BrowserType } from './browser'
import type { Fingerprint } from './fingerprint'

/** Browser profile đầy đủ */
export interface BrowserProfile {
  id: string
  name: string
  tags: string[]
  folder: string
  color: string
  browserType: BrowserType
  browserVersion: string
  browserExecutablePath?: string
  fingerprint: Fingerprint
  proxyId: string | null
  notes: string
  lastUsed: string | null
  createdAt: string
  updatedAt: string
}

/** Dữ liệu đầu vào khi tạo profile */
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

/** Dữ liệu đầu vào khi cập nhật profile */
export interface UpdateProfileInput extends Partial<CreateProfileInput> {}
