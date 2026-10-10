import { describe, it, expect } from 'vitest'
import { applyVideoPipelinePatch, type VideoPipelineChangePatch } from './apply-video-pipeline-patch'
import type { VideoNodeDefinition, VideoNode, VideoEdge } from '@shared/types'

const NODE_DEFS: VideoNodeDefinition[] = [
  {
    type: 'scene-prompt',
    label: 'Prompt cảnh',
    category: 'input',
    icon: 'FileText',
    description: '',
    inputs: [],
    outputs: [{ name: 'text', type: 'TEXT', required: true }],
    configSchema: [{ key: 'prompt', label: 'Prompt', type: 'text', required: true }]
  },
  {
    type: 'generate-image',
    label: 'Tạo ảnh',
    category: 'generate',
    icon: 'ImagePlus',
    description: '',
    inputs: [{ name: 'prompt', type: 'TEXT', required: true }],
    outputs: [{ name: 'image', type: 'IMAGE', required: true }],
    configSchema: []
  },
  // Fixture riêng cho test cycle — TEXT in/out cả 2 chiều nên 2 node loại
  // này có thể nối vòng mà vẫn khớp kiểu socket (không bị validate-edge chặn
  // trước khi tới bước phát hiện cycle thật sự đang muốn test).
  {
    type: 'echo',
    label: 'Echo (chỉ dùng cho test)',
    category: 'post',
    icon: 'FileText',
    description: '',
    inputs: [{ name: 'text', type: 'TEXT', required: true }],
    outputs: [{ name: 'text', type: 'TEXT', required: true }],
    configSchema: []
  }
]

const EMPTY: { nodes: VideoNode[]; edges: VideoEdge[] } = { nodes: [], edges: [] }

describe('applyVideoPipelinePatch — layout', () => {
  it('places 2 nodes with NO edge between them at the SAME x, different y (same level = parallel branch)', () => {
    const patch: VideoPipelineChangePatch = {
      type: 'add_nodes',
      nodes: [
        { id: 'n1', nodeType: 'scene-prompt', label: 'Cảnh A', config: { prompt: 'a' } },
        { id: 'n2', nodeType: 'scene-prompt', label: 'Cảnh B', config: { prompt: 'b' } }
      ]
    }
    const result = applyVideoPipelinePatch(patch, NODE_DEFS, EMPTY)
    expect(result.ok).toBe(true)
    const [a, b] = result.nodes!
    expect(a.position.x).toBe(b.position.x)
    expect(a.position.y).not.toBe(b.position.y)
  })

  it('places a node that depends on another at a LATER x (next level), not the same row', () => {
    const patch: VideoPipelineChangePatch = {
      type: 'add_nodes',
      nodes: [
        { id: 'n1', nodeType: 'scene-prompt', label: 'Cảnh A', config: { prompt: 'a' } },
        { id: 'n2', nodeType: 'generate-image', label: 'Ảnh A' }
      ],
      edges: [{ source: 'n1', target: 'n2', sourceHandle: 'text', targetHandle: 'prompt' }]
    }
    const result = applyVideoPipelinePatch(patch, NODE_DEFS, EMPTY)
    expect(result.ok).toBe(true)
    const prompt = result.nodes!.find((n) => n.data.label === 'Cảnh A')!
    const image = result.nodes!.find((n) => n.data.label === 'Ảnh A')!
    expect(image.position.x).toBeGreaterThan(prompt.position.x)
  })

  it('mixes independent + chained correctly: 2 parallel scenes, each with its own dependent node', () => {
    // n1->n2 (cảnh 1), n3->n4 (cảnh 2), KHÔNG nối n1/n2 với n3/n4 -> 2 nhánh song song thật
    const patch: VideoPipelineChangePatch = {
      type: 'add_nodes',
      nodes: [
        { id: 'n1', nodeType: 'scene-prompt', label: 'Cảnh 1', config: { prompt: '1' } },
        { id: 'n2', nodeType: 'generate-image', label: 'Ảnh 1' },
        { id: 'n3', nodeType: 'scene-prompt', label: 'Cảnh 2', config: { prompt: '2' } },
        { id: 'n4', nodeType: 'generate-image', label: 'Ảnh 2' }
      ],
      edges: [
        { source: 'n1', target: 'n2', sourceHandle: 'text', targetHandle: 'prompt' },
        { source: 'n3', target: 'n4', sourceHandle: 'text', targetHandle: 'prompt' }
      ]
    }
    const result = applyVideoPipelinePatch(patch, NODE_DEFS, EMPTY)
    expect(result.ok).toBe(true)
    const byLabel = Object.fromEntries(result.nodes!.map((n) => [n.data.label, n]))

    // Cùng tầng (level 0): Cảnh 1 và Cảnh 2 cùng x, khác y
    expect(byLabel['Cảnh 1'].position.x).toBe(byLabel['Cảnh 2'].position.x)
    expect(byLabel['Cảnh 1'].position.y).not.toBe(byLabel['Cảnh 2'].position.y)
    // Cùng tầng (level 1): Ảnh 1 và Ảnh 2 cùng x, khác y, và x > tầng 0
    expect(byLabel['Ảnh 1'].position.x).toBe(byLabel['Ảnh 2'].position.x)
    expect(byLabel['Ảnh 1'].position.y).not.toBe(byLabel['Ảnh 2'].position.y)
    expect(byLabel['Ảnh 1'].position.x).toBeGreaterThan(byLabel['Cảnh 1'].position.x)
  })

  it('returns ok:false (not a thrown exception) when the patch itself is a cycle', () => {
    const patch: VideoPipelineChangePatch = {
      type: 'add_nodes',
      nodes: [
        { id: 'n1', nodeType: 'echo', label: 'A' },
        { id: 'n2', nodeType: 'echo', label: 'B' }
      ],
      edges: [
        { source: 'n1', target: 'n2', sourceHandle: 'text', targetHandle: 'text' },
        { source: 'n2', target: 'n1', sourceHandle: 'text', targetHandle: 'text' }
      ]
    }
    expect(() => applyVideoPipelinePatch(patch, NODE_DEFS, EMPTY)).not.toThrow()
    const result = applyVideoPipelinePatch(patch, NODE_DEFS, EMPTY)
    expect(result.ok).toBe(false)
    expect(result.errors?.join(' ')).toMatch(/vòng lặp/)
  })
})
