import { tool } from 'ai'
import { z } from 'zod'
import { getAllProjects } from '../../services/project-service'
import type { AgentToolContext } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: project data is global, not scoped to this run
export function createListProjectsTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Liệt kê mọi project hiện có (ADR-0004) kèm id. Dùng khi chưa biết id project cần làm việc với (vd người dùng nói "project phim hoạt hình" mà không cho id) — tra ra đúng id rồi mới gọi get_project_context.',
    inputSchema: z.object({}),
    execute: async () => {
      const projects = getAllProjects().map((p) => ({ id: p.id, name: p.name, description: p.description }))
      return { ok: true, projects }
    }
  })
}
