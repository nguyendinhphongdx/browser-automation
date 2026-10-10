import type { VideoNode, VideoEdge } from '../../shared/types'
import { createVideoNode } from './nodes/registry'
import type { VideoExecutionContext, VideoSocketValue } from './nodes/base-node'

/**
 * Kahn's algorithm theo TẦNG (level), không chỉ 1 thứ tự phẳng — mỗi tầng là
 * tập node đã đủ input (mọi upstream của nó nằm ở tầng trước), không phụ
 * thuộc NHAU trong cùng tầng. executeVideoPipeline chạy song song mọi node
 * trong cùng 1 tầng (Promise.allSettled), tuần tự giữa các tầng — 2 node độc
 * lập (vd 2 nhánh "Vẽ Nhân Vật" không nối nhau) rơi vào CÙNG 1 tầng nên chạy
 * đồng thời thật, không chỉ "thứ tự đúng" như bản cũ (vốn luôn chạy từng
 * node một kể cả khi không phụ thuộc gì nhau).
 */
function topologicalLevels(nodes: VideoNode[], edges: VideoEdge[]): VideoNode[][] {
  const inDegree = new Map<string, number>(nodes.map((n) => [n.id, 0]))
  const dependents = new Map<string, string[]>(nodes.map((n) => [n.id, []]))

  for (const edge of edges) {
    if (!inDegree.has(edge.source) || !inDegree.has(edge.target)) continue
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1)
    dependents.get(edge.source)!.push(edge.target)
  }

  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  const levels: VideoNode[][] = []
  let frontier = nodes.filter((n) => inDegree.get(n.id) === 0)
  let visitedCount = 0

  while (frontier.length > 0) {
    levels.push(frontier)
    visitedCount += frontier.length
    const next: VideoNode[] = []
    for (const node of frontier) {
      for (const depId of dependents.get(node.id) || []) {
        const remaining = (inDegree.get(depId) || 0) - 1
        inDegree.set(depId, remaining)
        if (remaining === 0) next.push(nodeById.get(depId)!)
      }
    }
    frontier = next
  }

  if (visitedCount !== nodes.length) {
    throw new Error('Đồ thị pipeline có vòng lặp (cycle) — không thể xác định thứ tự chạy')
  }
  return levels
}

async function executeNode(
  node: VideoNode,
  edges: VideoEdge[],
  ctx: VideoExecutionContext,
  outputCache: Map<string, Record<string, VideoSocketValue>>
): Promise<void> {
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
