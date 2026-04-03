/** Vai trò người dùng */
export type UserRole = 'USER' | 'PRO' | 'CREATOR' | 'ADMIN'

/** Thông tin người dùng (dùng chung giữa desktop và server) */
export interface User {
  id: string
  name: string | null
  email: string
  image: string | null
  role: UserRole
  createdAt: string
  updatedAt: string
}
