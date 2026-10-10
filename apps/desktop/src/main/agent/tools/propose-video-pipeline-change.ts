import { tool } from 'ai'
import { z } from 'zod'
import { validateVideoPipelinePatch, type ExistingVideoNodeRef } from '../../../shared/video-studio/validate-pipeline-patch'
import { VIDEO_NODE_DEFINITIONS } from '../../video-studio/node-definitions'
import type { AgentToolContext } from './types'

export const videoNodeInputSchema = z.object({
  id: z.string().optional().describe('id tạm để nối edge trong cùng patch này, vd "n1" — không phải id thật'),
  nodeType: z.string().describe('loại node — xem catalog node video trong system prompt để biết type hợp lệ'),
  label: z.string(),
  config: z.record(z.string(), z.unknown()).optional()
})

export const videoEdgeInputSchema = z.object({
  source: z.string().describe('id tạm ("n1") của node mới, hoặc id thật của node đã có sẵn trong pipeline'),
  target: z.string(),
  sourceHandle: z.string().describe('tên output socket của node nguồn (vd "video", "image", "text")'),
  targetHandle: z.string().describe('tên input socket của node đích — PHẢI cùng kiểu (type) với sourceHandle')
})

function toExistingNodeRefs(ctx: AgentToolContext): ExistingVideoNodeRef[] {
  return (ctx.videoPipelineSnapshot?.nodes || []).map((n) => ({ id: n.id, nodeType: n.data.nodeType }))
}

/**
 * Mirror propose-workflow-change.ts cho đồ thị Video Studio. Không hỗ trợ
 * remove_nodes/replace_all/update_code ở v1 — AI chủ yếu DỰNG MỚI 1 pipeline
 * nhiều cảnh từ 1 câu brief, chỉnh sửa/xoá thì người dùng tự thao tác tay
 * trên canvas (đã đủ UI cho việc đó).
 */
export function createProposeVideoPipelineChangeTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Đề xuất thêm node mới hoặc sửa config 1 node đã có trong pipeline Video Studio đang mở. Dùng tool này để dựng cả 1 pipeline nhiều cảnh (nhân vật tham chiếu, prompt từng cảnh, generate ảnh/video, TTS, ghép...) chỉ trong 1 lần gọi — không cần hỏi lại người dùng từng bước. Kết quả đã được validate tự động theo đúng schema VÀ kiểu socket (IMAGE/VIDEO/AUDIO/TEXT...); nếu có lỗi, bạn nhận lại danh sách lỗi cụ thể để tự sửa và gọi lại tool này.',
    inputSchema: z.discriminatedUnion('type', [
      z.object({
        type: z.literal('add_nodes'),
        nodes: z.array(videoNodeInputSchema),
        edges: z.array(videoEdgeInputSchema).optional()
      }),
      z.object({
        type: z.literal('update_node'),
        nodeId: z.string().describe('id thật của node đang có trên canvas'),
        label: z.string().optional(),
        config: z.record(z.string(), z.unknown()).optional()
      })
    ]),
    execute: async (input) => {
      const { errors } = validateVideoPipelinePatch(input, VIDEO_NODE_DEFINITIONS, toExistingNodeRefs(ctx))
      if (errors.length > 0) return { ok: false, errors }

      const summary = input.type === 'add_nodes' ? `Thêm ${input.nodes.length} node` : `Sửa config node "${input.nodeId}"`

      return { ok: true, patch: input, summary }
    }
  })
}
