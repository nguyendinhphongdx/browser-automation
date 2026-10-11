import { tool } from 'ai'
import { z } from 'zod'
import { getTaskById, updateTask } from '../../services/project-service'
import type { AgentToolContext } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: project data is global, not scoped to this run
export function createMoveTaskTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Đổi task cha của 1 task (ADR-0004) — vd đưa 1 task rời vào làm con của task khác, hoặc đưa ra lại gốc (parentTaskId = null). Chặn tự động nếu việc này tạo ra vòng lặp (đưa task vào chính con/cháu của nó).',
    inputSchema: z.object({
      taskId: z.string(),
      parentTaskId: z.string().nullable().describe('id task cha mới, hoặc null để đưa về gốc project (không còn task cha)')
    }),
    execute: async ({ taskId, parentTaskId }) => {
      try {
        const existing = getTaskById(taskId)
        if (!existing) return { ok: false, error: `Không tìm thấy task "${taskId}"` }

        if (parentTaskId) {
          const parent = getTaskById(parentTaskId)
          if (!parent) return { ok: false, error: `Không tìm thấy task cha "${parentTaskId}"` }
          if (parent.projectId !== existing.projectId) return { ok: false, error: `Task cha "${parentTaskId}" không thuộc project này` }
        }

        const task = updateTask(taskId, { parentTaskId })
        return { ok: true, id: task!.id, title: task!.title, parentTaskId: task!.parentTaskId }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  })
}
