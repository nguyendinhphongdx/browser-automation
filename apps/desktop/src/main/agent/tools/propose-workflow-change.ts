import { tool } from 'ai'
import { z } from 'zod'
import { validateWorkflowPatch, type ExistingNodeRef } from '../../../shared/agent/validate-workflow-patch'
import type { AgentToolContext } from './types'

// Local temp id ("n1", "n2"...) used to wire edges within the same patch —
// the renderer assigns the real node id only once the patch is applied.
export const nodeInputSchema = z.object({
  id: z.string().optional().describe('id tạm để nối edge trong cùng patch này, vd "n1" — không phải id thật'),
  nodeType: z.string().describe('loại node — xem catalog trong system prompt để biết type hợp lệ'),
  label: z.string(),
  category: z.enum(['browser', 'interaction', 'data', 'flow', 'integration']).optional(),
  icon: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional()
})

export const edgeInputSchema = z.object({
  source: z.string().describe('id tạm ("n1") của node mới, hoặc id thật của node đã có sẵn trong workflow'),
  target: z.string(),
  sourceHandle: z.string().optional().describe('bắt buộc cho node rẽ nhánh — xem QUY TẮC RẼ NHÁNH'),
  targetHandle: z.string().optional(),
  edgeType: z.enum(['normal', 'on-error']).optional()
})

function toExistingNodeRefs(ctx: AgentToolContext): ExistingNodeRef[] {
  return ctx.workflowSnapshot.nodes.map((n) => ({ id: n.id, nodeType: n.data.nodeType }))
}

/**
 * Non-destructive workflow edits (add a node, tweak an existing node's
 * config) — not approval-gated, unlike its sibling
 * propose-destructive-workflow-change.ts. Validated here against the
 * snapshot the run started with (fast, lets the model self-correct within
 * the same run); the renderer re-validates against the LIVE canvas right
 * before actually applying it — see plan's two-gate validation note.
 */
export function createProposeWorkflowChangeTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Đề xuất thêm node mới hoặc sửa config 1 node đã có trong workflow đang mở. Kết quả đã được validate tự động theo đúng schema — nếu có lỗi, bạn sẽ nhận lại danh sách lỗi cụ thể để tự sửa và gọi lại tool này, không cần hỏi lại người dùng trừ khi không chắc ý định của họ.',
    inputSchema: z.discriminatedUnion('type', [
      z.object({
        type: z.literal('add_nodes'),
        nodes: z.array(nodeInputSchema),
        edges: z.array(edgeInputSchema).optional()
      }),
      z.object({
        type: z.literal('update_node'),
        nodeId: z.string().describe('id thật của node đang có trên canvas'),
        label: z.string().optional(),
        config: z.record(z.string(), z.unknown()).optional()
      })
    ]),
    execute: async (input) => {
      const { errors } = validateWorkflowPatch(input, ctx.nodeDefinitions, toExistingNodeRefs(ctx))
      if (errors.length > 0) return { ok: false, errors }

      const summary =
        input.type === 'add_nodes'
          ? `Thêm ${input.nodes.length} node`
          : `Sửa config node "${input.nodeId}"`

      return { ok: true, patch: input, summary }
    }
  })
}
