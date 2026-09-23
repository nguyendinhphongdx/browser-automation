import { tool } from 'ai'
import { z } from 'zod'
import { validateWorkflowPatch, type ExistingNodeRef } from '../../../shared/agent/validate-workflow-patch'
import { nodeInputSchema, edgeInputSchema } from './propose-workflow-change'
import type { AgentToolContext } from './types'

function toExistingNodeRefs(ctx: AgentToolContext): ExistingNodeRef[] {
  return ctx.workflowSnapshot.nodes.map((n) => ({ id: n.id, nodeType: n.data.nodeType }))
}

/**
 * Destructive workflow edits (delete nodes, replace the whole workflow) —
 * a SEPARATE tool from propose-workflow-change.ts specifically so gating can
 * be a static per-tool-name `toolApproval` entry (see tools/registry.ts's
 * APPROVAL_GATED_TOOLS), since a dynamic per-call approval predicate isn't a
 * confirmed-stable part of the API this app relies on.
 */
export function createProposeDestructiveWorkflowChangeTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Đề xuất XOÁ node hoặc THAY TOÀN BỘ workflow bằng nội dung mới. Đây là hành động phá huỷ — cần người dùng duyệt trước khi áp dụng thật. Kết quả đã được validate tự động; nếu lỗi sẽ có danh sách lỗi cụ thể để tự sửa và gọi lại.',
    inputSchema: z.discriminatedUnion('type', [
      z.object({
        type: z.literal('remove_nodes'),
        nodeIds: z.array(z.string()).describe('id thật của các node cần xoá')
      }),
      z.object({
        type: z.literal('replace_all'),
        nodes: z.array(nodeInputSchema),
        edges: z.array(edgeInputSchema).optional()
      })
    ]),
    execute: async (input) => {
      const { errors } = validateWorkflowPatch(input, ctx.nodeDefinitions, toExistingNodeRefs(ctx))
      if (errors.length > 0) return { ok: false, errors }

      if (input.type === 'remove_nodes') {
        const idsToRemove = new Set(input.nodeIds)
        const affectedEdgeCount = ctx.workflowSnapshot.edges.filter(
          (e) => idsToRemove.has(e.source) || idsToRemove.has(e.target)
        ).length
        return {
          ok: true,
          patch: input,
          affectedEdgeCount,
          summary: `Xoá ${input.nodeIds.length} node (ảnh hưởng ${affectedEdgeCount} edge)`
        }
      }

      return { ok: true, patch: input, summary: `Thay toàn bộ workflow bằng ${input.nodes.length} node mới` }
    }
  })
}
