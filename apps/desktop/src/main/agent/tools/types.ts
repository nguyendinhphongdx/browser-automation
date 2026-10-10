import type { Page } from 'playwright-core'
import type { WorkflowNode, WorkflowEdge, WorkflowMode, VideoNode, VideoEdge } from '../../../shared/types'
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
   * Chỉ có khi domain = 'video-studio' (xem agent-handlers.ts) — snapshot
   * đồ thị Video Studio lúc bắt đầu run, dùng bởi
   * propose_video_pipeline_change. Tách hẳn khỏi workflowSnapshot vì
   * VideoNode/VideoEdge là type hoàn toàn khác (đồ thị có kiểu, không phải
   * control-flow).
   */
  videoPipelineSnapshot?: { nodes: VideoNode[]; edges: VideoEdge[] }
  /**
   * Called with a `data:image/...;base64,...` URL right after a screenshot is
   * captured, so the UI can display it. The model itself only ever sees size
   * metadata in the tool result (see take-screenshot.ts) — raw base64 would
   * otherwise get stuffed straight into the model's context on the next step.
   */
  onScreenshot?: (dataUrl: string) => void
  /**
   * Called with a `data:image/...;base64,...` URL when get_resource reads an
   * image resource, so the UI can show it — same reasoning as onScreenshot:
   * the model only ever sees metadata in the tool result, never raw pixels.
   */
  onResourcePreview?: (dataUrl: string, name: string) => void
}
