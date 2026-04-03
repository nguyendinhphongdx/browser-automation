/** Trạng thái kịch bản trên marketplace */
export type ScriptStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

/** Danh mục kịch bản */
export type ScriptCategory =
  | 'social-media'
  | 'e-commerce'
  | 'seo-marketing'
  | 'data-scraping'
  | 'account-management'
  | 'utilities'

/** Kịch bản automation trên marketplace */
export interface Script {
  id: string
  name: string
  slug: string
  description: string
  version: string
  category: ScriptCategory
  tags: string[]
  price: number
  status: ScriptStatus
  downloads: number
  authorId: string
  createdAt: string
  updatedAt: string
}

/** Đánh giá kịch bản */
export interface Review {
  id: string
  rating: number
  comment: string | null
  scriptId: string
  userId: string
  createdAt: string
}
