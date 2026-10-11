import { tool } from 'ai'
import { z } from 'zod'
import { getAllVideoPipelines } from '../../services/video-pipeline-service'
import type { AgentToolContext } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: pipeline data is global, not scoped to this run
export function createListPipelinesTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Liệt kê mọi pipeline Video Studio hiện có kèm id. Dùng trước khi gọi delegate_to_video_studio nếu chưa biết id của pipeline cần giao việc.',
    inputSchema: z.object({}),
    execute: async () => {
      const pipelines = getAllVideoPipelines().map((p) => ({ id: p.id, name: p.name, description: p.description, status: p.status }))
      return { ok: true, pipelines }
    }
  })
}
