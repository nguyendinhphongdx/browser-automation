import { tool } from 'ai'
import { z } from 'zod'
import { validateVideoPipelinePatch, type ExistingVideoNodeRef } from '../../../shared/video-studio/validate-pipeline-patch'
import { VIDEO_NODE_DEFINITIONS } from '../../video-studio/node-definitions'
import { videoNodeInputSchema, videoEdgeInputSchema } from './propose-video-pipeline-change'
import type { AgentToolContext } from './types'

function toExistingNodeRefs(ctx: AgentToolContext): ExistingVideoNodeRef[] {
  return (ctx.videoPipelineSnapshot?.nodes || []).map((n) => ({ id: n.id, nodeType: n.data.nodeType }))
}

/**
 * Mirror propose-destructive-workflow-change.ts cho đồ thị Video Studio —
 * tách riêng khỏi propose_video_pipeline_change (chỉ thiết kế) để gating
 * (approvalGatedTools) đơn giản là 1 entry tĩnh theo tên tool, giống hệt lý
 * do Automation đã tách 2 tool này (xem file kia). Trước ADR-0017, Video
 * Studio hoàn toàn không có cách nào xoá/thay node qua AI — model chỉ có thể
 * ADD_NODES chồng lên node sai khi được yêu cầu "sửa", để lại rác trên canvas
 * (đúng vấn đề update_node đã giải quyết được phần sửa-config, nhưng không
 * giải quyết được phần đổi-hẳn-loại-node).
 */
export function createProposeDestructiveVideoPipelineChangeTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Đề xuất XOÁ node hoặc THAY TOÀN BỘ pipeline Video Studio bằng nội dung mới. Đây là hành động phá huỷ — cần người dùng duyệt trước khi áp dụng thật. Kết quả đã được validate tự động; nếu lỗi sẽ có danh sách lỗi cụ thể để tự sửa và gọi lại.',
    inputSchema: z.discriminatedUnion('type', [
      z.object({
        type: z.literal('remove_nodes'),
        nodeIds: z.array(z.string()).describe('id thật của các node cần xoá')
      }),
      z.object({
        type: z.literal('replace_all'),
        nodes: z.array(videoNodeInputSchema),
        edges: z.array(videoEdgeInputSchema).optional()
      })
    ]),
    execute: async (input) => {
      const { errors } = validateVideoPipelinePatch(input, VIDEO_NODE_DEFINITIONS, toExistingNodeRefs(ctx))
      if (errors.length > 0) return { ok: false, errors }

      if (input.type === 'remove_nodes') {
        const idsToRemove = new Set(input.nodeIds)
        const affectedEdgeCount = (ctx.videoPipelineSnapshot?.edges || []).filter(
          (e) => idsToRemove.has(e.source) || idsToRemove.has(e.target)
        ).length
        return {
          ok: true,
          patch: input,
          affectedEdgeCount,
          summary: `Xoá ${input.nodeIds.length} node (ảnh hưởng ${affectedEdgeCount} edge)`
        }
      }

      return { ok: true, patch: input, summary: `Thay toàn bộ pipeline bằng ${input.nodes.length} node mới` }
    }
  })
}
