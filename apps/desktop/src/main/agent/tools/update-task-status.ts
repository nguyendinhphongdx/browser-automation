import { tool } from 'ai'
import { z } from 'zod'
import { getTaskById, updateTaskStatus } from '../../services/project-service'
import type { AgentToolContext } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: project data is global, not scoped to this run
export function createUpdateTaskStatusTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Đổi trạng thái 1 task (ADR-0004) — "todo" (chưa làm), "in-progress" (đang làm), "done" (xong). Gọi khi bắt đầu hoặc hoàn thành 1 task; sau khi đổi sang "done" cho 1 task quan trọng (vd xong 1 tập), nên gọi thêm update_project_notebook để ghi lại tóm tắt cho các task sau.',
    inputSchema: z.object({
      taskId: z.string(),
      status: z.enum(['todo', 'in-progress', 'done'])
    }),
    execute: async ({ taskId, status }) => {
      try {
        const existing = getTaskById(taskId)
        if (!existing) return { ok: false, error: `Không tìm thấy task "${taskId}"` }

        const task = updateTaskStatus(taskId, status)
        return { ok: true, id: task!.id, title: task!.title, status: task!.status }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  })
}
