import { describe, it, expect, vi } from 'vitest'
import { executeVideoPipeline } from './engine'
import type { VideoNode, VideoEdge } from '../../shared/types'
import type { VideoExecutionContext } from './nodes/base-node'

const executionLog: string[] = []
let concurrentCount = 0
let maxConcurrentObserved = 0

vi.mock('./nodes/registry', () => ({
  createVideoNode: (nodeType: string, nodeId: string, config: Record<string, unknown>) => ({
    async execute(inputs: Record<string, unknown>) {
      executionLog.push(nodeId)
      if (nodeType === 'fail') throw new Error('nổ giả lập')
      if (nodeType === 'source') return { out: config.value }
      if (nodeType === 'concat') return { out: `${inputs.a ?? ''}+${inputs.b ?? ''}` }
      if (nodeType === 'slow') {
        // Mô phỏng 1 lệnh gọi API có độ trễ thật — dùng để phát hiện engine
        // có thật sự chạy node không phụ thuộc nhau CÙNG LÚC hay chỉ tuần
        // tự: nếu tuần tự, concurrentCount không bao giờ vượt quá 1.
        concurrentCount++
        maxConcurrentObserved = Math.max(maxConcurrentObserved, concurrentCount)
        await new Promise((r) => setTimeout(r, 20))
        concurrentCount--
        return { out: nodeId }
      }
      return {}
    }
  })
}))

function makeCtx(overrides: Partial<VideoExecutionContext> = {}): VideoExecutionContext {
  return {
    runId: 'run-1',
    pipelineId: 'pipeline-1',
    log: () => {},
    ...overrides
  }
}

function node(id: string, nodeType: string, config: Record<string, unknown> = {}): VideoNode {
  return { id, type: 'videoStudioNode', position: { x: 0, y: 0 }, data: { label: id, nodeType, config } }
}

describe('executeVideoPipeline', () => {
  it('executes nodes in dependency order, not array order', async () => {
    executionLog.length = 0
    const nodes: VideoNode[] = [node('b', 'source', { value: 'B' }), node('a', 'source', { value: 'A' })]
    const edges: VideoEdge[] = []

    await executeVideoPipeline(nodes, edges, makeCtx())

    // Không có edge nối -> cả 2 đều in-degree 0, thứ tự giữ nguyên thứ tự mảng ban đầu của hàng đợi
    expect(executionLog).toEqual(['b', 'a'])
  })

  it('passes upstream output into downstream input via edges (sourceHandle -> targetHandle)', async () => {
    const nodes: VideoNode[] = [
      node('src1', 'source', { value: 'hello' }),
      node('src2', 'source', { value: 'world' }),
      node('merge', 'concat')
    ]
    const edges: VideoEdge[] = [
      { id: 'e1', source: 'src1', sourceHandle: 'out', target: 'merge', targetHandle: 'a' },
      { id: 'e2', source: 'src2', sourceHandle: 'out', target: 'merge', targetHandle: 'b' }
    ]

    const doneOutputs: Record<string, unknown>[] = []
    await executeVideoPipeline(nodes, edges, makeCtx({ onNodeDone: (_id, outputs) => doneOutputs.push(outputs) }))

    expect(doneOutputs[doneOutputs.length - 1]).toEqual({ out: 'hello+world' })
  })

  it('runs upstream nodes before downstream nodes regardless of array order', async () => {
    executionLog.length = 0
    const nodes: VideoNode[] = [node('merge', 'concat'), node('src', 'source', { value: 'x' })]
    const edges: VideoEdge[] = [{ id: 'e1', source: 'src', sourceHandle: 'out', target: 'merge', targetHandle: 'a' }]

    await executeVideoPipeline(nodes, edges, makeCtx())

    expect(executionLog).toEqual(['src', 'merge'])
  })

  it('throws on a cyclic graph instead of hanging or silently dropping nodes', async () => {
    const nodes: VideoNode[] = [node('a', 'source'), node('b', 'source')]
    const edges: VideoEdge[] = [
      { id: 'e1', source: 'a', sourceHandle: 'out', target: 'b', targetHandle: 'in' },
      { id: 'e2', source: 'b', sourceHandle: 'out', target: 'a', targetHandle: 'in' }
    ]

    await expect(executeVideoPipeline(nodes, edges, makeCtx())).rejects.toThrow('vòng lặp')
  })

  it('stops execution and calls onNodeError when a node throws, never running its dependents', async () => {
    // d phụ thuộc trực tiếp vào output của b (node sẽ lỗi) — đây là điều
    // engine PHẢI đảm bảo không chạy, khác với 1 node độc lập như c (không
    // phụ thuộc a/b) vốn có thể đã kịp chạy trước khi b lỗi vì topological
    // sort không ép buộc toàn đồ thị tuyến tính.
    const nodes: VideoNode[] = [
      node('a', 'source', { value: 'x' }),
      node('b', 'fail'),
      node('d', 'concat')
    ]
    const edges: VideoEdge[] = [
      { id: 'e1', source: 'a', sourceHandle: 'out', target: 'b', targetHandle: 'in' },
      { id: 'e2', source: 'b', sourceHandle: 'out', target: 'd', targetHandle: 'a' }
    ]

    executionLog.length = 0
    const errors: string[] = []
    await expect(
      executeVideoPipeline(nodes, edges, makeCtx({ onNodeError: (_id, message) => errors.push(message) }))
    ).rejects.toThrow('nổ giả lập')

    expect(errors).toEqual(['nổ giả lập'])
    expect(executionLog).not.toContain('d')
  })

  it('runs 2 independent nodes in the same level CONCURRENTLY, not one at a time', async () => {
    concurrentCount = 0
    maxConcurrentObserved = 0
    const nodes: VideoNode[] = [node('x', 'slow'), node('y', 'slow')]
    const edges: VideoEdge[] = [] // không nối nhau -> cùng 1 tầng

    await executeVideoPipeline(nodes, edges, makeCtx())

    expect(maxConcurrentObserved).toBe(2)
  })

  it('does not execute any node when ctx.aborted is already true (Dừng bấm trước khi kịp chạy)', async () => {
    executionLog.length = 0
    const nodes: VideoNode[] = [node('a', 'source', { value: 'x' })]
    await executeVideoPipeline(nodes, [], makeCtx({ aborted: true }))
    expect(executionLog).toEqual([])
  })

  it('stops before starting the NEXT level when aborted mid-run, without cancelling the level already in flight', async () => {
    executionLog.length = 0
    const ctx = makeCtx()
    ctx.onNodeDone = () => { ctx.aborted = true }
    const nodes: VideoNode[] = [node('a', 'source', { value: 'x' }), node('b', 'concat')]
    const edges: VideoEdge[] = [{ id: 'e1', source: 'a', target: 'b', sourceHandle: 'out', targetHandle: 'a' }]
    await executeVideoPipeline(nodes, edges, ctx)
    expect(executionLog).toEqual(['a'])
  })

  it('still waits a full level out before moving on, and only fails sequentially-dependent downstream work', async () => {
    // 1 node độc lập lỗi trong cùng tầng với 1 node độc lập khác đang chạy —
    // node kia vẫn phải chạy xong (allSettled), không bị huỷ ngang.
    const nodes: VideoNode[] = [node('ok', 'slow'), node('bad', 'fail')]
    const edges: VideoEdge[] = []

    executionLog.length = 0
    await expect(executeVideoPipeline(nodes, edges, makeCtx())).rejects.toThrow('nổ giả lập')
    expect(executionLog).toContain('ok')
  })
})
