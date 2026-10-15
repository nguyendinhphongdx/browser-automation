import { tool } from 'ai'
import { z } from 'zod'
import { agentService } from '../agent-service'
import { getVideoPipelineById, updateVideoPipeline } from '../../services/video-pipeline-service'
import { VIDEO_NODE_DEFINITIONS } from '../../video-studio/node-definitions'
import { applyVideoPipelinePatch, type VideoPipelineChangePatch } from '../../../shared/video-studio/apply-video-pipeline-patch'
import type { AgentToolContext } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: this tool builds its OWN inert context for the sub-agent, not the caller's
export function createDelegateToVideoStudioTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Giao 1 task cho trợ lý domain "video-studio" tự dựng/sửa pipeline (ADR-0007) — vd "thêm 1 cảnh mới vào pipeline X". Sub-agent làm việc trên bản ĐÃ LƯU trong DB (không phải canvas đang mở ở trang Video Studio) và lưu thẳng kết quả vào DB nếu hợp lệ — nếu trang đó đang mở với thay đổi CHƯA lưu, kết quả có thể bị đè khi người dùng bấm Lưu sau. Sub-agent không làm được việc cần duyệt (vd xoá). Dùng list_pipelines trước nếu chưa biết id.',
    inputSchema: z.object({
      videoPipelineId: z.string(),
      task: z.string().describe('mô tả việc cần làm với pipeline này, càng cụ thể càng tốt')
    }),
    execute: async ({ videoPipelineId, task }) => {
      const pipeline = getVideoPipelineById(videoPipelineId)
      if (!pipeline) return { ok: false, error: `Không tìm thấy pipeline "${videoPipelineId}"` }

      const subContext: AgentToolContext = {
        page: null,
        profileId: '',
        workflowSnapshot: { nodes: [], edges: [] },
        videoPipelineSnapshot: { nodes: pipeline.nodes, edges: pipeline.edges },
        nodeDefinitions: [],
        onScreenshot: () => {},
        onResourcePreview: () => {}
      }

      let persistError: string | null = null
      const result = await agentService.runSubAgent({
        domain: 'video-studio',
        toolContext: subContext,
        task,
        onToolResult: (toolName, resultText, ok) => {
          if (
            !ok ||
            persistError ||
            (toolName !== 'propose_video_pipeline_change' && toolName !== 'propose_destructive_video_pipeline_change')
          ) return
          try {
            const parsed = JSON.parse(resultText) as { patch?: unknown }
            if (!parsed.patch || typeof parsed.patch !== 'object') return
            const current = getVideoPipelineById(videoPipelineId)
            if (!current) {
              persistError = `Pipeline "${videoPipelineId}" đã bị xoá trong lúc sub-agent đang chạy`
              return
            }
            const applied = applyVideoPipelinePatch(parsed.patch as VideoPipelineChangePatch, VIDEO_NODE_DEFINITIONS, {
              nodes: current.nodes,
              edges: current.edges
            })
            if (!applied.ok) {
              persistError = applied.errors?.join('; ') ?? 'patch không hợp lệ'
              return
            }
            updateVideoPipeline(videoPipelineId, { nodes: applied.nodes, edges: applied.edges })
          } catch {
            // Không phải JSON, hoặc không đúng shape {patch} — không có gì để áp.
          }
        }
      })

      if (persistError) {
        return { ok: false, error: `Sub-agent đề xuất thay đổi nhưng không lưu được: ${persistError}`, subAgentText: result.text }
      }
      return { ok: result.ok, result: result.text }
    }
  })
}
