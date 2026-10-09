import type { NodeDefinition, WorkflowNode, WorkflowEdge } from '@shared/types'
import { validateWorkflowPatch, type ExistingNodeRef } from '@shared/agent/validate-workflow-patch'

// Loose shapes matching main/agent/tools/propose-workflow-change.ts's Zod
// schemas — not importing those directly since that file pulls in 'ai'/'zod'
// main-process-only tooling; this is just the JSON shape that crosses the
// IPC boundary as a tool-result.
interface PatchNodeInput {
  id?: string
  nodeType: string
  label: string
  config?: Record<string, unknown>
}
interface PatchEdgeInput {
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  edgeType?: 'normal' | 'on-error'
}

export type WorkflowChangePatch =
  | { type: 'add_nodes'; nodes: PatchNodeInput[]; edges?: PatchEdgeInput[] }
  | { type: 'update_node'; nodeId: string; label?: string; config?: Record<string, unknown> }
  | { type: 'remove_nodes'; nodeIds: string[] }
  | { type: 'replace_all'; nodes: PatchNodeInput[]; edges?: PatchEdgeInput[] }
  | { type: 'update_code'; code: string }

export interface ApplyWorkflowPatchResult {
  ok: boolean
  errors?: string[]
}

/**
 * Authoritative second validation gate + the actual canvas mutation — the
 * half of propose-workflow-change.ts's plan that was never wired up. Main
 * process validates fast against a start-of-run snapshot (lets the model
 * self-correct); this re-validates against the LIVE canvas right before
 * touching it, since a long multi-step run can span the user editing the
 * canvas by hand in between. Pure function: returns the new nodes/edges,
 * caller is responsible for actually calling updateNodes()/updateEdges().
 */
export function applyWorkflowPatch(
  patch: WorkflowChangePatch,
  nodeDefinitions: NodeDefinition[],
  current: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }
): ApplyWorkflowPatchResult & { nodes?: WorkflowNode[]; edges?: WorkflowEdge[]; code?: string } {
  // update_code doesn't touch nodes/edges at all — validateWorkflowPatch's
  // node-oriented checks don't apply, it has its own syntax-check branch.
  const existingRefs: ExistingNodeRef[] = current.nodes.map((n) => ({ id: n.id, nodeType: n.data.nodeType }))
  const { errors } = validateWorkflowPatch(patch, nodeDefinitions, existingRefs)
  if (errors.length > 0) return { ok: false, errors }

  if (patch.type === 'update_code') {
    return { ok: true, code: patch.code }
  }

  const defsByType = new Map(nodeDefinitions.map((d) => [d.type, d]))

  switch (patch.type) {
    case 'add_nodes': {
      const { nodes: newNodes, idMap } = buildNodes(patch.nodes, defsByType, current.nodes)
      const newEdges = buildEdges(patch.edges, idMap)
      return { ok: true, nodes: [...current.nodes, ...newNodes], edges: [...current.edges, ...newEdges] }
    }

    case 'update_node': {
      const nodes = current.nodes.map((n) =>
        n.id === patch.nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                label: patch.label ?? n.data.label,
                config: patch.config ? { ...n.data.config, ...patch.config } : n.data.config
              }
            }
          : n
      )
      return { ok: true, nodes, edges: current.edges }
    }

    case 'remove_nodes': {
      const idsToRemove = new Set(patch.nodeIds)
      const nodes = current.nodes.filter((n) => !idsToRemove.has(n.id))
      const edges = current.edges.filter((e) => !idsToRemove.has(e.source) && !idsToRemove.has(e.target))
      return { ok: true, nodes, edges }
    }

    case 'replace_all': {
      const { nodes, idMap } = buildNodes(patch.nodes, defsByType, [])
      const edges = buildEdges(patch.edges, idMap)
      return { ok: true, nodes, edges }
    }
  }
}

/**
 * Builds real WorkflowNode objects from the model's patch nodes, generating
 * a real id for each (the model only ever sees/assigns short-lived temp ids
 * like "n1" to wire edges within the same patch) and laying them out in a
 * simple left-to-right row continuing after the current rightmost node —
 * same convention RecorderPanel.tsx / recorder.ts's actionsToWorkflow use
 * for the same "model doesn't know canvas positions" problem.
 */
function buildNodes(
  patchNodes: PatchNodeInput[],
  defsByType: Map<string, NodeDefinition>,
  existingNodes: WorkflowNode[]
): { nodes: WorkflowNode[]; idMap: Map<string, string> } {
  // Continue the row after the current rightmost node (empty canvas starts
  // fresh at the same origin RecorderPanel.tsx/recorder.ts use).
  const lastNode = [...existingNodes].sort((a, b) => a.position.x - b.position.x).pop()
  const startX = lastNode ? lastNode.position.x + 280 : 80
  const y = lastNode ? lastNode.position.y : 200

  const idMap = new Map<string, string>()
  const nodes: WorkflowNode[] = patchNodes.map((n, i) => {
    const realId = `node-${Date.now()}-${i}`
    if (n.id) idMap.set(n.id, realId)
    const def = defsByType.get(n.nodeType)
    return {
      id: realId,
      type: 'automationNode',
      position: { x: startX + i * 280, y },
      data: {
        label: n.label,
        category: def?.category ?? 'browser',
        icon: def?.icon,
        nodeType: n.nodeType,
        config: n.config ?? {}
      }
    }
  })
  return { nodes, idMap }
}

function buildEdges(patchEdges: PatchEdgeInput[] | undefined, idMap: Map<string, string>): WorkflowEdge[] {
  return (patchEdges ?? []).map((e, i) => ({
    id: `edge-${Date.now()}-${i}`,
    source: idMap.get(e.source) ?? e.source,
    target: idMap.get(e.target) ?? e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    edgeType: e.edgeType
  }))
}
