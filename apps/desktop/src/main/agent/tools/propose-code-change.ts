import { tool } from 'ai'
import { z } from 'zod'
import { validateWorkflowPatch } from '../../../shared/agent/validate-workflow-patch'
import type { AgentToolContext } from './types'

/**
 * Destructive — replaces the ENTIRE workflow.code (chế độ "Viết code"), the
 * same risk tier as propose-destructive-workflow-change.ts's `replace_all`
 * for node-graph workflows, so it's gated the same way (see
 * tools/registry.ts's APPROVAL_GATED_TOOLS).
 *
 * Deliberately scoped to workflows that are ALREADY in code mode — this
 * tool never silently converts a node-graph (Visual) workflow into a code
 * one, since that would discard all its nodes/edges as a side effect of
 * what looks like "just writing some code". If the user wants that
 * conversion, they switch modes themselves first.
 */
export function createProposeCodeChangeTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Đề xuất GHI ĐÈ TOÀN BỘ code của workflow (chế độ "Viết code") bằng "code" mới. "code" chạy ở tầng điều khiển Playwright — có sẵn biến page, context, variables, log(message), delay(ms) — KHÔNG phải DOM API như run_js/node eval-js (document, window). Chỉ dùng được khi workflow đang mở sẵn ở chế độ "Viết code" (không tự chuyển 1 workflow Kéo thả sang Code). Đây là hành động phá huỷ — cần người dùng duyệt trước khi áp dụng.',
    inputSchema: z.object({
      code: z
        .string()
        .describe(
          'Toàn bộ script thay thế — ví dụ: await page.goto("https://x.com"); const title = await page.title(); log(title);'
        )
    }),
    execute: async ({ code }) => {
      if (ctx.workflowSnapshot.mode !== 'code') {
        return {
          ok: false,
          error:
            'Workflow này đang ở chế độ Kéo thả (Visual), không thể sửa bằng propose_code_change. Dùng propose_workflow_change/propose_destructive_workflow_change thay thế, hoặc yêu cầu người dùng tự chuyển workflow sang chế độ Viết code trước.'
        }
      }

      const { errors } = validateWorkflowPatch({ type: 'update_code', code }, ctx.nodeDefinitions, [])
      if (errors.length > 0) return { ok: false, errors }

      return { ok: true, patch: { type: 'update_code', code }, summary: 'Thay toàn bộ code của workflow' }
    }
  })
}
