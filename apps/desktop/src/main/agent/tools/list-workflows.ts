import { tool } from 'ai'
import { z } from 'zod'
import { getAllWorkflows } from '../../services/workflow-service'
import type { AgentToolContext } from './types'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ctx unused: workflow data is global, not scoped to this run
export function createListWorkflowsTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Liệt kê mọi workflow Automation hiện có kèm id. Dùng trước khi gọi delegate_to_automation nếu chưa biết id của workflow cần giao việc.',
    inputSchema: z.object({}),
    execute: async () => {
      const workflows = getAllWorkflows().map((w) => ({ id: w.id, name: w.name, description: w.description, mode: w.mode }))
      return { ok: true, workflows }
    }
  })
}
