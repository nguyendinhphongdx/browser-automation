import type { VideoNodeDefinition, VideoNode, VideoEdge } from '@shared/types'
import { validateVideoPipelinePatch, type ExistingVideoNodeRef } from '@shared/video-studio/validate-pipeline-patch'
import { topologicalLevels } from '@shared/video-studio/topological-levels'

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
  try {
    const { nodes: newNodes, idMap } = buildNodes(patch.nodes, patch.edges, defsByType, current.nodes)
    const newEdges = buildEdges(patch.edges, idMap)
    return { ok: true, nodes: [...current.nodes, ...newNodes], edges: [...current.edges, ...newEdges] }
  } catch (err) {
    // topologicalLevels (dùng để xếp layout) ném lỗi nếu patch tự tạo ra 1
    // đồ thị có vòng lặp — validateVideoPipelinePatch ở trên không bắt case
    // này (nó chỉ check từng edge riêng lẻ, không check cycle toàn đồ thị).
    return { ok: false, errors: [err instanceof Error ? err.message : String(err)] }
  }
}

const COLUMN_WIDTH = 260
const ROW_HEIGHT = 200

/**
 * Layout theo TẦNG phụ thuộc (dùng chính topologicalLevels của engine.ts) —
 * KHÔNG phải 1 hàng ngang theo thứ tự mảng như trước. 2 node trong patch
 * không có edge nối nhau (trực tiếp hay gián tiếp) rơi vào CÙNG 1 tầng, xếp
 * CHỒNG THEO CHIỀU DỌC ở cùng cột x — để người dùng NHÌN THẤY pipeline có
 * chạy song song (engine.ts cũng chạy đúng cùng tầng này đồng thời thật, xem
 * ADR liên quan) thay vì tưởng lầm là tuần tự chỉ vì layout cũ luôn vẽ 1
 * hàng thẳng bất kể đồ thị thật trông thế nào.
 *
 * Chỉ tính level trên các edge NỐI GIỮA CÁC NODE MỚI trong patch này (dùng
 * id tạm) — edge nối sang node đã có sẵn trên canvas không ảnh hưởng layout
 * (node đã có vị trí riêng rồi, không cần xếp lại).
 */
function buildNodes(
  patchNodes: PatchNodeInput[],
  patchEdges: PatchEdgeInput[] | undefined,
  defsByType: Map<string, VideoNodeDefinition>,
  existingNodes: VideoNode[]
): { nodes: VideoNode[]; idMap: Map<string, string> } {
  const lastNode = [...existingNodes].sort((a, b) => a.position.x - b.position.x).pop()
  const startX = lastNode ? lastNode.position.x + COLUMN_WIDTH : 80
  const baseY = lastNode ? lastNode.position.y : 160

  // id tạm cho layout — node không khai "id" trong patch (không phải nguồn/đích
  // của edge nào) vẫn cần 1 key để tham gia topologicalLevels, dùng index làm key riêng.
  const layoutKeyByIndex = patchNodes.map((n, i) => n.id ?? `__no-id-${i}`)
  const layoutItems = patchNodes.map((n, i) => ({ id: layoutKeyByIndex[i], node: n }))
  const localEdges = (patchEdges ?? [])
    .filter((e) => layoutKeyByIndex.includes(e.source) && layoutKeyByIndex.includes(e.target))
    .map((e) => ({ source: e.source, target: e.target }))

  const levels = topologicalLevels(layoutItems, localEdges)

  const idMap = new Map<string, string>()
  const nodes: VideoNode[] = []
  let counter = 0
  levels.forEach((level, levelIndex) => {
    level.forEach((item, rowIndex) => {
      const realId = `node-${Date.now()}-${counter++}`
      if (item.node.id) idMap.set(item.node.id, realId)
      const def = defsByType.get(item.node.nodeType)
      nodes.push({
        id: realId,
        type: 'videoStudioNode',
        position: { x: startX + levelIndex * COLUMN_WIDTH, y: baseY + rowIndex * ROW_HEIGHT },
        data: { label: item.node.label, icon: def?.icon, nodeType: item.node.nodeType, config: item.node.config ?? {} }
      })
    })
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
