/** Cookie entry lưu cho từng profile/domain */
export interface CookieEntry {
  id: string
  name: string
  profileId: string | null
  domain: string
  cookies: string // JSON string of cookie array
  notes: string
  createdAt: string
  updatedAt: string
}

export interface CreateCookieInput {
  name: string
  profileId?: string | null
  domain: string
  cookies: string
  notes?: string
}

export interface UpdateCookieInput extends Partial<CreateCookieInput> {}
