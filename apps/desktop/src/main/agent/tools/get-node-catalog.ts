import { tool } from 'ai'
import { z } from 'zod'
import type { AgentToolContext } from './types'

/**
 * propose-workflow-change.ts's own schema says "xem catalog trong system
 * prompt" cho field nodeType — nhưng AGENT_INSTRUCTIONS (khác
 * VIDEO_AGENT_INSTRUCTIONS) chưa từng liệt kê catalog nào cả (160 loại node,
 * quá nhiều để nhồi cố định vào mọi lượt chat). Tool này là nơi catalog đó
 * THẬT SỰ tồn tại — ctx.nodeDefinitions đã luôn có sẵn trong context (dùng
 * bởi mọi tool validate config), chỉ chưa có cách nào cho model tự đọc.
 */
export function createGetNodeCatalogTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Liệt kê toàn bộ loại node workflow có sẵn (nodeType, category, field config cần truyền) — gọi tool này để biết CHÍNH XÁC loại node nào tồn tại và cần config gì trước khi dùng propose_workflow_change/propose_destructive_workflow_change, thay vì đoán. Truyền "category" để chỉ xem 1 nhóm (vd "integration"); bỏ trống để xem hết.',
    inputSchema: z.object({
      category: z.string().optional().describe('lọc theo category, vd "browser"/"interaction"/"data"/"flow"/"integration"/"data-pipeline"')
    }),
    execute: async ({ category }) => {
      const defs = category ? ctx.nodeDefinitions.filter((d) => d.category === category) : ctx.nodeDefinitions
      return {
        ok: true,
        nodes: defs.map((d) => ({
          type: d.type,
          label: d.label,
          category: d.category,
          description: d.description,
          configSchema: d.configSchema.map((f) => ({ key: f.key, label: f.label, type: f.type, required: f.required ?? false }))
        }))
      }
    }
  })
}
