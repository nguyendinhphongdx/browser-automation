import type { VideoNodeDefinition, VideoNode, VideoEdge } from '@shared/types'
import { validateVideoPipelinePatch, type ExistingVideoNodeRef } from '@shared/video-studio/validate-pipeline-patch'

interface PatchNodeInput {
  id?: string
  nodeType: string
  label: string
  config?: Record<string, unknown>
}
interface PatchEdgeInput {
  source: string
  target: string
  sourceHandle: string
  targetHandle: string
}

export type VideoPipelineChangePatch =
  | { type: 'add_nodes'; nodes: PatchNodeInput[]; edges?: PatchEdgeInput[] }
  | { type: 'update_node'; nodeId: string; label?: string; config?: Record<string, unknown> }

export interface ApplyVideoPipelinePatchResult {
  ok: boolean
  errors?: string[]
  nodes?: VideoNode[]
  edges?: VideoEdge[]
}

/**
 * Mirror apply-workflow-patch.ts — lớp validate thứ 2 (chống canvas đã đổi
 * giữa chừng run dài) + mutation thật, cho đồ thị Video Studio.
 */
export function applyVideoPipelinePatch(
  patch: VideoPipelineChangePatch,
  nodeDefinitions: VideoNodeDefinition[],
  current: { nodes: VideoNode[]; edges: VideoEdge[] }
): ApplyVideoPipelinePatchResult {
  const existingRefs: ExistingVideoNodeRef[] = current.nodes.map((n) => ({ id: n.id, nodeType: n.data.nodeType }))
  const { errors } = validateVideoPipelinePatch(patch, nodeDefinitions, existingRefs)
  if (errors.length > 0) return { ok: false, errors }

  if (patch.type === 'update_node') {
    const nodes = current.nodes.map((n) =>
      n.id === patch.nodeId
        ? { ...n, data: { ...n.data, label: patch.label ?? n.data.label, config: patch.config ? { ...n.data.config, ...patch.config } : n.data.config } }
        : n
    )
    return { ok: true, nodes, edges: current.edges }
  }

  const defsByType = new Map(nodeDefinitions.map((d) => [d.type, d]))
  const { nodes: newNodes, idMap } = buildNodes(patch.nodes, defsByType, current.nodes)
  const newEdges = buildEdges(patch.edges, idMap)
  return { ok: true, nodes: [...current.nodes, ...newNodes], edges: [...current.edges, ...newEdges] }
}

/** Layout đơn giản: hàng ngang tiếp nối sau node phải nhất hiện có — giống buildNodes của Automation, người dùng tự sắp lại bằng tay nếu muốn. */
function buildNodes(
  patchNodes: PatchNodeInput[],
  defsByType: Map<string, VideoNodeDefinition>,
  existingNodes: VideoNode[]
): { nodes: VideoNode[]; idMap: Map<string, string> } {
  const lastNode = [...existingNodes].sort((a, b) => a.position.x - b.position.x).pop()
  const startX = lastNode ? lastNode.position.x + 260 : 80
  const y = lastNode ? lastNode.position.y : 160

  const idMap = new Map<string, string>()
  const nodes: VideoNode[] = patchNodes.map((n, i) => {
    const realId = `node-${Date.now()}-${i}`
    if (n.id) idMap.set(n.id, realId)
    const def = defsByType.get(n.nodeType)
    return {
      id: realId,
      type: 'videoStudioNode',
      position: { x: startX + i * 260, y },
      data: { label: n.label, icon: def?.icon, nodeType: n.nodeType, config: n.config ?? {} }
    }
  })
  return { nodes, idMap }
}

function buildEdges(patchEdges: PatchEdgeInput[] | undefined, idMap: Map<string, string>): VideoEdge[] {
  return (patchEdges ?? []).map((e, i) => ({
    id: `edge-${Date.now()}-${i}`,
    source: idMap.get(e.source) ?? e.source,
    target: idMap.get(e.target) ?? e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle
  }))
}
