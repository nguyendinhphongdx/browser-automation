import { tool } from 'ai'
import { z } from 'zod'
import { createProject } from '../../services/project-service'
import type { AgentToolContext } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: project data is global, not scoped to this run
export function createCreateProjectTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Tạo 1 project mới (ADR-0004) — dùng khi người dùng muốn bắt đầu 1 sản phẩm dài hơi nhiều phần (vd 1 bộ phim nhiều tập). Tự động tạo kèm 1 folder gốc trong Thư viện để chứa mọi tài nguyên/output của project này — không cần tạo folder riêng.',
    inputSchema: z.object({
      name: z.string().describe('tên project'),
      description: z.string().optional()
    }),
    execute: async ({ name, description }) => {
      try {
        const project = createProject({ name, description })
        return { ok: true, id: project.id, name: project.name, rootFolderId: project.libraryFolderId }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  })
}
