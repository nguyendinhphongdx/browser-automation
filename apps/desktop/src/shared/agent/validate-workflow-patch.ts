import type { NodeDefinition } from '../types'

/**
 * Single source of truth for the globals a Code-mode workflow's sandbox
 * exposes — main/automation/engine.ts's executeCodeWorkflow() builds its
 * `api` object and destructure line from this same array, so adding a new
 * sandbox global here automatically keeps both the real runtime and this
 * file's syntax-check in sync (previously these were two independent
 * hardcoded parameter lists, connected only by a comment asking whoever
 * edits one to remember the other).
 */
export const CODE_SANDBOX_GLOBALS = ['page', 'context', 'variables', 'log', 'delay', 'resources'] as const

export interface ExistingNodeRef {
  id: string
  nodeType?: string
}

export interface ValidationResult {
  errors: string[]
}

// Loose shapes for the untrusted JSON the AI produces.
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
  'try-catch': ['try', 'catch']
}

function validateConfig(
  nodeLabel: string,
  nodeType: string,
  config: Record<string, unknown>,
  def: NodeDefinition | undefined,
  errors: string[]
) {
  if (!def) {
    errors.push(`Node "${nodeLabel}": loại node không tồn tại "${nodeType}"`)
    return
  }
  for (const field of def.configSchema) {
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
 * Validates an AI-produced workflow-patch JSON object against the real node
 * schema and branching rules. Returns hard errors only — a non-empty result
 * means the patch must be rejected, not just warned about. Pure/isomorphic:
 * used both as a fast in-loop check inside the propose-workflow-change tool
 * (main process, against a start-of-run snapshot) and as the authoritative
 * re-check right before applying to the live canvas (renderer, against
 * current state) — see plan's "two-gate validation" note.
 */
export function validateWorkflowPatch(
  patch: unknown,
  nodeDefinitions: NodeDefinition[],
  existingNodes: ExistingNodeRef[]
): ValidationResult {
  const errors: string[] = []
  if (!patch || typeof patch !== 'object') return { errors: ['Patch không hợp lệ'] }
  const act = patch as Record<string, unknown>

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
    // replace_all wipes the canvas so only local (in-patch) ids are valid.
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

  if (act.type === 'remove_nodes') {
    const nodeIds = Array.isArray(act.nodeIds) ? (act.nodeIds as unknown[]) : []
    for (const id of nodeIds) {
      if (typeof id !== 'string' || !existingById.has(id)) {
        errors.push(`remove_nodes: không tìm thấy node "${String(id)}"`)
      }
    }
  }

  if (act.type === 'update_node') {
    const nodeId = typeof act.nodeId === 'string' ? act.nodeId : ''
    const existing = existingById.get(nodeId)
    if (!existing) {
      errors.push(`update_node: không tìm thấy node "${nodeId}"`)
    } else if (act.config && typeof act.config === 'object') {
      validateConfig(
        nodeId,
        existing.nodeType || '',
        act.config as Record<string, unknown>,
        defsByType.get(existing.nodeType || ''),
        errors
      )
    }
  }

  if (act.type === 'update_code') {
    const code = typeof act.code === 'string' ? act.code : ''
    if (!code.trim()) {
      errors.push('update_code: code không được để trống')
    } else {
      // Same wrapping main/automation/engine.ts's executeCodeWorkflow() uses
      // at real-run time — constructing (not calling) the Function only
      // parses the body, so this is a pure syntax check. Must match that
      // wrapping exactly, otherwise ordinary top-level `await` in valid code
      // would wrongly fail here (await is only legal inside an async
      // function, which this wrapping provides). The parameter list comes
      // from CODE_SANDBOX_GLOBALS (above) rather than being hardcoded here
      // a second time.
      try {
        new Function(...CODE_SANDBOX_GLOBALS, `return (async () => { ${code} })();`)
      } catch (err) {
        errors.push(`update_code: code có lỗi cú pháp JS — ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  return { errors }
}
