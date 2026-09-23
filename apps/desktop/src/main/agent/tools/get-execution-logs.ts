import { tool } from 'ai'
import { z } from 'zod'
import { getWorkflowLogs } from '../../services/workflow-service'
import type { LogEntry } from '../../../shared/types'
import type { AgentToolContext } from './types'

const MAX_ENTRIES_PER_LOG = 40

/**
 * Reads past run results for the active workflow (or one the model names
 * explicitly) — this is what lets the agent actually answer "why did my last
 * run fail" instead of only ever seeing the static workflow definition.
 * Runs in the main process, so it calls workflow-service.ts's
 * getWorkflowLogs() directly — no IPC round-trip needed.
 */
export function createGetExecutionLogsTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Đọc log của (các) lần chạy gần nhất của workflow — dùng khi người dùng hỏi tại sao workflow fail, hoặc muốn biết kết quả lần chạy trước. Nếu lần chạy bị lỗi, chỉ trả về các dòng log mức warn/error (không phải toàn bộ log) để tiết kiệm ngữ cảnh.',
    inputSchema: z.object({
      workflowId: z.string().optional().describe('bỏ trống để dùng workflow đang mở'),
      limit: z.number().int().min(1).max(10).optional().default(1).describe('số lần chạy gần nhất muốn xem')
    }),
    execute: async ({ workflowId, limit }) => {
      const targetId = workflowId || ctx.workflowId
      if (!targetId) {
        return { ok: false, error: 'Không có workflowId — không rõ đang muốn xem log của workflow nào.' }
      }

      const logs = getWorkflowLogs(targetId).slice(0, limit)
      if (logs.length === 0) {
        return { ok: true, runs: [], message: 'Chưa có lần chạy nào được ghi lại cho workflow này.' }
      }

      const runs = logs.map((log) => {
        let entries: LogEntry[] = []
        try {
          entries = JSON.parse(log.logs) as LogEntry[]
        } catch {
          // Malformed/empty log payload — treat as no entries rather than fail the tool call.
        }

        const relevant =
          log.status === 'error' ? entries.filter((e) => e.level === 'error' || e.level === 'warn') : entries

        return {
          status: log.status,
          startedAt: log.startedAt,
          finishedAt: log.finishedAt,
          entries: relevant.slice(0, MAX_ENTRIES_PER_LOG).map((e) => ({
            level: e.level,
            nodeId: e.nodeId,
            message: e.message
          }))
        }
      })

      return { ok: true, runs }
    }
  })
}
