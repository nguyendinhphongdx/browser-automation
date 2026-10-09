import { tool } from 'ai'
import { z } from 'zod'
import type { AgentToolContext } from './types'

/**
 * Returns the current workflow's nodes/edges, reduced to what the model
 * actually needs — React Flow's `position` and other rendering-only fields
 * are dropped since they'd just waste context tokens for no benefit here.
 */
export function createGetWorkflowStateTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Đọc trạng thái hiện tại của workflow đang mở — chế độ (Kéo thả hay Viết code), và tương ứng: danh sách node/edge, hoặc toàn bộ code hiện có. Gọi tool này trước khi đề xuất thay đổi để biết chính xác đang ở chế độ nào và cấu trúc/code hiện tại.',
    inputSchema: z.object({}),
    execute: async () => {
      const mode = ctx.workflowSnapshot.mode ?? 'visual'
      if (mode === 'code') {
        return { ok: true, mode, code: ctx.workflowSnapshot.code ?? '' }
      }
      const nodes = ctx.workflowSnapshot.nodes.map((n) => ({
        id: n.id,
        nodeType: n.data.nodeType,
        label: n.data.label,
        config: n.data.config
      }))
      const edges = ctx.workflowSnapshot.edges.map((e) => ({
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        edgeType: e.edgeType
      }))
      return { ok: true, mode, nodes, edges }
    }
  })
}
