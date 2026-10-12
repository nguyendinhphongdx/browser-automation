import { tool } from 'ai'
import { z } from 'zod'
import { getVideoPipelineById } from '../../services/video-pipeline-service'
import { createVideoPipelineRun, updateVideoPipelineRun } from '../../services/video-job-service'
import { executeVideoPipeline } from '../../video-studio/engine'
import type { AgentToolContext } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: pipeline data is global, not scoped to this run
export function createRunVideoPipelineTool(ctx: AgentToolContext) {
  return tool({
    description:
      'CHẠY THẬT 1 pipeline video đã thiết kế (ADR-0011) — gọi thật provider tạo ảnh/video (tốn tiền/thời gian thật), khác với propose_video_pipeline_change (chỉ thiết kế, không chạy). Luôn cần người dùng duyệt trước khi chạy thật — không tự ý chạy khi chưa chắc chắn người dùng muốn vậy. Dùng list_pipelines trước nếu chưa biết id. Sau khi chạy xong, đọc "logs" trong kết quả để biết chính xác resource nào đã được tạo (node save-to-library tự ghi log tên/id resource đã lưu).',
    inputSchema: z.object({ videoPipelineId: z.string() }),
    execute: async ({ videoPipelineId }) => {
      const pipeline = getVideoPipelineById(videoPipelineId)
      if (!pipeline) {
        return {
          ok: false,
          error: `Không tìm thấy pipeline với id "${videoPipelineId}". ĐỪNG tự đoán hay bịa 1 id khác để thử lại — gọi list_pipelines để lấy đúng danh sách pipeline và id thật, rồi dùng đúng id đó.`
        }
      }

      const run = createVideoPipelineRun(videoPipelineId)
      const logs: string[] = []

      try {
        await executeVideoPipeline(pipeline.nodes, pipeline.edges, {
          runId: run.id,
          pipelineId: videoPipelineId,
          log: (message) => logs.push(message)
        })
        updateVideoPipelineRun(run.id, 'completed', JSON.stringify(logs), new Date().toISOString())
        return { ok: true, runId: run.id, status: 'completed', logs }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        logs.push(message)
        updateVideoPipelineRun(run.id, 'error', JSON.stringify(logs), new Date().toISOString())
        return { ok: false, error: message, runId: run.id, logs }
      }
    }
  })
}
