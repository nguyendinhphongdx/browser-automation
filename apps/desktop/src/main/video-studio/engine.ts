import type { VideoNode, VideoEdge } from '../../shared/types'
import { topologicalLevels } from '../../shared/video-studio/topological-levels'
import { createVideoNode } from './nodes/registry'
import type { VideoExecutionContext, VideoSocketValue } from './nodes/base-node'

async function executeNode(
  node: VideoNode,
  edges: VideoEdge[],
  ctx: VideoExecutionContext,
  outputCache: Map<string, Record<string, VideoSocketValue>>
): Promise<void> {
  if (ctx.aborted) return
  ctx.onNodeStart?.(node.id)
  ctx.log(`Bắt đầu node "${node.data.label}" (${node.data.nodeType})`)

  try {
    const inputs: Record<string, VideoSocketValue> = {}
    for (const edge of edges) {
      if (edge.target !== node.id) continue
      const sourceOutputs = outputCache.get(edge.source)
      if (sourceOutputs) inputs[edge.targetHandle] = sourceOutputs[edge.sourceHandle]
    }

    const nodeInstance = createVideoNode(node.data.nodeType, node.id, node.data.config || {}, ctx)
    const outputs = await nodeInstance.execute(inputs)
    outputCache.set(node.id, outputs)

    ctx.onNodeDone?.(node.id, outputs)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    ctx.log(`Lỗi ở node "${node.data.label}": ${message}`)
    ctx.onNodeError?.(node.id, message)
    throw err
  }
}

export async function executeVideoPipeline(
  nodes: VideoNode[],
  edges: VideoEdge[],
  ctx: VideoExecutionContext
): Promise<void> {
  const levels = topologicalLevels(nodes, edges)
  const outputCache = new Map<string, Record<string, VideoSocketValue>>()

  for (const level of levels) {
    if (ctx.aborted) break
    // allSettled (không phải all) — 1 node lỗi không huỷ ngang các node khác
    // ĐANG CHẠY cùng tầng: chúng thường là lệnh gọi API trả phí đã submit
    // rồi, bỏ dở giữa chừng là job mồ côi không ai track được kết quả/tiền đã
    // trả (cùng lý do job-runner.ts không tự ý retry submit()). Chỉ dừng
    // KHÔNG sang tầng tiếp theo sau khi cả tầng hiện tại đã xong.
    const settled = await Promise.allSettled(level.map((node) => executeNode(node, edges, ctx, outputCache)))
    const failures = settled.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    if (failures.length === 1) throw failures[0].reason
    if (failures.length > 1) {
      const messages = failures.map((f) => (f.reason instanceof Error ? f.reason.message : String(f.reason)))
      throw new Error(`${failures.length} node lỗi cùng lúc: ${messages.join('; ')}`)
    }
  }
}
