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
      'Đọc danh sách node và edge hiện tại của workflow đang mở. Gọi tool này trước khi đề xuất thay đổi để biết chính xác cấu trúc hiện tại (id node thật, loại node, config).',
    inputSchema: z.object({}),
    execute: async () => {
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
      return { ok: true, nodes, edges }
    }
  })
}
