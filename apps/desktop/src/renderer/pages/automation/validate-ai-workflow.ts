import type { AIConfigField, AINodeDefinition } from './ai-node-catalog'

export interface AIExistingNode {
  id: string
  nodeType?: string
}

export interface ValidationResult {
  errors: string[]
}

// Loose shapes for the untrusted JSON the AI returns — mirrors
// AIActionNodeInput/AIActionEdgeInput in AIChatPanel.tsx (not imported from
// there to avoid a circular dependency between the two modules).
interface ActionNodeLike {
  id?: string
  type?: string
  nodeType?: string
  label?: string
  config?: Record<string, unknown>
}

interface ActionEdgeLike {
  source?: unknown
  target?: unknown
  sourceHandle?: string
}

// sourceHandle values each branching node type MUST have at least one edge
// for — mirrors engine.ts's getNextNodes()/branching handlers.
const BRANCH_REQUIREMENTS: Record<string, string[]> = {
  'if-else': ['true', 'false'],
  'element-exists': ['true', 'false'],
  loop: ['body', 'done'],
  'loop-each': ['body', 'done'],
  'try-catch': ['try', 'catch'],
}

function validateConfig(
  nodeLabel: string,
  nodeType: string,
  config: Record<string, unknown>,
  def: AINodeDefinition | undefined,
  errors: string[]
) {
  if (!def) {
    errors.push(`Node "${nodeLabel}": loại node không tồn tại "${nodeType}"`)
    return
  }
  for (const field of (def.configSchema || []) as AIConfigField[]) {
    const value = config?.[field.key]
    if (field.required && (value === undefined || value === null || value === '')) {
      errors.push(`Node "${nodeLabel}" (${nodeType}): thiếu field bắt buộc "${field.key}"`)
      continue
    }
    if (field.type === 'select' && value !== undefined && field.options?.length) {
      const valid = field.options.some((o) => o.value === value)
      if (!valid) {
        errors.push(`Node "${nodeLabel}" (${nodeType}): giá trị "${field.key}" không hợp lệ (${JSON.stringify(value)})`)
      }
    }
  }
}

/**
 * Validates an AI-produced action JSON object against the real node schema
 * and branching rules before it's ever applied to the canvas. Returns hard
 * errors only — a non-empty result means the action must be rejected, not
 * just warned about.
 */
export function validateAction(
  action: unknown,
  nodeDefinitions: AINodeDefinition[],
  existingNodes: AIExistingNode[]
): ValidationResult {
  const errors: string[] = []
  if (!action || typeof action !== 'object') return { errors: ['Action không hợp lệ'] }
  const act = action as Record<string, unknown>

  const defsByType = new Map(nodeDefinitions.map((d) => [d.type, d]))
  const existingById = new Map(existingNodes.map((n) => [n.id, n]))

  if (act.type === 'add_nodes' || act.type === 'replace_all') {
    const actionNodes = (Array.isArray(act.nodes) ? act.nodes : []) as ActionNodeLike[]
    const actionEdges = (Array.isArray(act.edges) ? act.edges : []) as ActionEdgeLike[]
    const localIds = new Set<string>()

    actionNodes.forEach((n, i) => {
      const nodeType = n?.nodeType || n?.type || ''
      const label = n?.label || nodeType || `#${i}`
      validateConfig(label, nodeType, n?.config || {}, defsByType.get(nodeType), errors)
      if (n?.id) localIds.add(String(n.id))
    })

    // add_nodes edges may also reference nodes already on the canvas;
    // replace_all wipes the canvas so only local (in-action) ids are valid.
    const resolvable = (ref: unknown) =>
      typeof ref === 'string' && (localIds.has(ref) || (act.type === 'add_nodes' && existingById.has(ref)))

    for (const e of actionEdges) {
      if (!resolvable(e?.source) || !resolvable(e?.target)) {
        errors.push(`Edge tham chiếu tới node không tồn tại: ${JSON.stringify({ source: e?.source, target: e?.target })}`)
      }
    }

    actionNodes.forEach((n, i) => {
      const nodeType = n?.nodeType || n?.type || ''
      const required = BRANCH_REQUIREMENTS[nodeType]
      if (!required) return
      const label = n?.label || nodeType || `#${i}`
      if (!n?.id) {
        errors.push(`Node "${label}" (${nodeType}) là node rẽ nhánh nên cần có "id" để khai báo edges`)
        return
      }
      const handles = new Set(actionEdges.filter((e) => e?.source === n.id).map((e) => e?.sourceHandle))
      const missing = required.filter((h) => !handles.has(h))
      if (missing.length > 0) {
        errors.push(`Node "${label}" (${nodeType}) thiếu edge với sourceHandle: ${missing.join(', ')}`)
      }
    })
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
