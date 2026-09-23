import type { AGUIEvent, BaseEvent } from '@ag-ui/core'

// Re-exports the parts of @ag-ui/core this app actually uses, from one place
// importable by both main (relative path) and renderer (`@shared/*` alias) —
// same "shared pure types" convention as shared/types.ts.
export { EventType } from '@ag-ui/core'
export type { AGUIEvent, BaseEvent }

/**
 * Our own approval envelope, carried inside a CUSTOM AG-UI event (see
 * ag-ui-adapter.ts). Deliberately NOT using @ag-ui/core's own Interrupt/
 * resume types — that part of the spec is still DRAFT/unstable as of this
 * writing. This is a small, stable contract of our own that happens to
 * follow the same shape, built directly on top of AI SDK's own (shipped,
 * documented) `toolApproval` mechanism.
 */
export interface AgentApprovalRequest {
  approvalId: string
  toolCallId: string
  toolName: string
  input: unknown
  reason?: string
}

export interface AgentApprovalResponse {
  approvalId: string
  approved: boolean
  reason?: string
}

/** Wire envelope pushed over the `agent:event` IPC channel — see agent-handlers.ts / preload.ts. */
export interface AgentEventEnvelope {
  runId: string
  event: AGUIEvent
}
