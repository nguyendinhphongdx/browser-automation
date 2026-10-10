import type { VideoNodeDefinition, ConfigField } from '../types'
import { validateVideoEdge } from './validate-edge'

export interface ExistingVideoNodeRef {
  id: string
  nodeType?: string
}

export interface ValidationResult {
  errors: string[]
}

interface ActionNodeLike {
  id?: string
  nodeType?: string
  label?: string
  config?: Record<string, unknown>
}

interface ActionEdgeLike {
  source?: unknown
  target?: unknown
  sourceHandle?: unknown
  targetHandle?: unknown
}

function validateConfig(nodeLabel: string, nodeType: string, config: Record<string, unknown>, def: VideoNodeDefinition | undefined, errors: string[]) {
  if (!def) {
    errors.push(`Node "${nodeLabel}": loại node video không tồn tại "${nodeType}"`)
    return
  }
  for (const field of def.configSchema as ConfigField[]) {
    const value = config?.[field.key]
    if (field.required && (value === undefined || value === null || value === '')) {
      errors.push(`Node "${nodeLabel}" (${nodeType}): thiếu field bắt buộc "${field.key}"`)
      continue
    }
    if (field.type === 'select' && value !== undefined && field.options?.length) {
      const valid = field.options.some((o) => o.value === value)
      if (!valid) errors.push(`Node "${nodeLabel}" (${nodeType}): giá trị "${field.key}" không hợp lệ (${JSON.stringify(value)})`)
    }
  }
}

/**
 * Mirror của validate-workflow-patch.ts, áp cho đồ thị Video Studio — khác
 * biệt chính: edge phải khớp TYPE socket (IMAGE/VIDEO/AUDIO/TEXT...) qua
 * validateVideoEdge(), không chỉ khớp id node như control-flow graph. Dùng
 * cả ở main process (propose_video_pipeline_change, snapshot lúc bắt đầu
 * run) lẫn renderer (apply-video-pipeline-patch.ts, state canvas thật ngay
 * trước khi áp) — cùng pattern 2 lớp validate đã có cho Automation.
 */
export function validateVideoPipelinePatch(
  patch: unknown,
  nodeDefinitions: VideoNodeDefinition[],
  existingNodes: ExistingVideoNodeRef[]
): ValidationResult {
  const errors: string[] = []
  if (!patch || typeof patch !== 'object') return { errors: ['Patch không hợp lệ'] }
  const act = patch as Record<string, unknown>

  const defsByType = new Map(nodeDefinitions.map((d) => [d.type, d]))
  const existingById = new Map(existingNodes.map((n) => [n.id, n]))

  if (act.type === 'add_nodes') {
    const actionNodes = (Array.isArray(act.nodes) ? act.nodes : []) as ActionNodeLike[]
    const actionEdges = (Array.isArray(act.edges) ? act.edges : []) as ActionEdgeLike[]
    const localIds = new Set<string>()
    const localTypeById = new Map<string, string>()

    actionNodes.forEach((n, i) => {
      const nodeType = n?.nodeType || ''
      const label = n?.label || nodeType || `#${i}`
      validateConfig(label, nodeType, n?.config || {}, defsByType.get(nodeType), errors)
      if (n?.id) {
        localIds.add(String(n.id))
        localTypeById.set(String(n.id), nodeType)
      }
    })

    const resolvable = (ref: unknown) => typeof ref === 'string' && (localIds.has(ref) || existingById.has(ref))
    const typeOf = (ref: unknown) =>
      typeof ref === 'string' ? localTypeById.get(ref) || existingById.get(ref)?.nodeType : undefined

    for (const e of actionEdges) {
      if (!resolvable(e?.source) || !resolvable(e?.target)) {
        errors.push(`Edge tham chiếu tới node không tồn tại: ${JSON.stringify({ source: e?.source, target: e?.target })}`)
        continue
      }
      const sourceDef = defsByType.get(typeOf(e.source) || '')
      const targetDef = defsByType.get(typeOf(e.target) || '')
      const sourceSocket = sourceDef?.outputs.find((s) => s.name === e.sourceHandle)
      const targetSocket = targetDef?.inputs.find((s) => s.name === e.targetHandle)
      if (!validateVideoEdge(sourceSocket, targetSocket)) {
        errors.push(
          `Edge "${String(e.source)}.${String(e.sourceHandle)}" → "${String(e.target)}.${String(e.targetHandle)}" sai kiểu socket` +
            (sourceSocket && targetSocket ? ` (${sourceSocket.type} → ${targetSocket.type})` : ' (không tìm thấy socket)')
        )
      }
    }
  }

  if (act.type === 'update_node') {
    const nodeId = typeof act.nodeId === 'string' ? act.nodeId : ''
    const existing = existingById.get(nodeId)
    if (!existing) {
      errors.push(`update_node: không tìm thấy node "${nodeId}"`)
    } else if (act.config && typeof act.config === 'object') {
      validateConfig(nodeId, existing.nodeType || '', act.config as Record<string, unknown>, defsByType.get(existing.nodeType || ''), errors)
    }
  }

  return { errors }
}
