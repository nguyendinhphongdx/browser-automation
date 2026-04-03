export type EmailProvider = 'gmail' | 'outlook' | 'yahoo' | 'other'
export type EmailStatus = 'active' | 'locked' | 'verify_needed' | 'unknown'

/** Tài khoản email */
export interface EmailAccount {
  id: string
  email: string
  password: string
  recoveryEmail?: string
  phone?: string
  provider: EmailProvider
  status: EmailStatus
  notes: string
  profileId?: string | null
  createdAt: string
}

export interface CreateEmailInput {
  email: string
  password: string
  recoveryEmail?: string
  phone?: string
  provider?: EmailProvider
  status?: EmailStatus
  notes?: string
  profileId?: string | null
}

export interface UpdateEmailInput extends Partial<CreateEmailInput> {}
