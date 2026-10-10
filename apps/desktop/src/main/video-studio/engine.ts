import type { VideoNode, VideoEdge } from '../../shared/types'
import { createVideoNode } from './nodes/registry'
import type { VideoExecutionContext, VideoSocketValue } from './nodes/base-node'

/** Kahn's algorithm — thứ tự thực thi theo phụ thuộc dữ liệu (dataflow), không phải thứ tự node trong mảng. */
function topologicalSort(nodes: VideoNode[], edges: VideoEdge[]): VideoNode[] {
  const inDegree = new Map<string, number>(nodes.map((n) => [n.id, 0]))
  const dependents = new Map<string, string[]>(nodes.map((n) => [n.id, []]))

  for (const edge of edges) {
    if (!inDegree.has(edge.source) || !inDegree.has(edge.target)) continue
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1)
    dependents.get(edge.source)!.push(edge.target)
  }

  const queue = nodes.filter((n) => inDegree.get(n.id) === 0)
  const sorted: VideoNode[] = []
  const nodeById = new Map(nodes.map((n) => [n.id, n]))

  while (queue.length > 0) {
    const node = queue.shift()!
    sorted.push(node)
    for (const depId of dependents.get(node.id) || []) {
      const remaining = (inDegree.get(depId) || 0) - 1
      inDegree.set(depId, remaining)
      if (remaining === 0) queue.push(nodeById.get(depId)!)
    }
  }

  if (sorted.length !== nodes.length) {
    throw new Error('Đồ thị pipeline có vòng lặp (cycle) — không thể xác định thứ tự chạy')
  }
  return sorted
}

export async function executeVideoPipeline(
  nodes: VideoNode[],
  edges: VideoEdge[],
  ctx: VideoExecutionContext
): Promise<void> {
  const order = topologicalSort(nodes, edges)
  const outputCache = new Map<string, Record<string, VideoSocketValue>>()

  for (const node of order) {
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
}
