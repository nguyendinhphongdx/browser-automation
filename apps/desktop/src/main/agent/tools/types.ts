import type { Page } from 'playwright-core'
import type { WorkflowNode, WorkflowEdge, WorkflowMode } from '../../../shared/types'
import type { NodeDefinition } from '../../automation/node-definitions'

/**
 * Per-run context every agent tool closes over. Built fresh by
 * agent-service.ts (Phase C) for each `agent:run` call — never shared or
 * mutated across runs.
 */
export interface AgentToolContext {
  /** Live Playwright page for the profile, or null if no browser is open — the IPC handler resolves this once up front (see agent-handlers.ts), tools never look it up themselves. */
  page: Page | null
  profileId: string
  workflowId?: string
  /** Nodes/edges/code/mode as they were when the run started, sent by the renderer. May go stale mid-run — see propose-workflow-change.ts's two-gate validation note. */
  workflowSnapshot: { nodes: WorkflowNode[]; edges: WorkflowEdge[]; mode?: WorkflowMode; code?: string }
  nodeDefinitions: NodeDefinition[]
  /**
   * Called with a `data:image/...;base64,...` URL right after a screenshot is
   * captured, so the UI can display it. The model itself only ever sees size
   * metadata in the tool result (see take-screenshot.ts) — raw base64 would
   * otherwise get stuffed straight into the model's context on the next step.
   */
  onScreenshot?: (dataUrl: string) => void
}
