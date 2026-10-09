import { useCallback, useEffect, useRef, useState } from 'react'
import type { ModelMessage } from 'ai'
import type { WorkflowNode, WorkflowEdge, WorkflowMode } from '@shared/types'
import {
  EventType,
  type AGUIEvent,
  type AgentApprovalRequest,
  type AgentEventEnvelope
} from '@shared/agent/ag-ui-events'
import type { WorkflowChangePatch } from './apply-workflow-patch'

const WORKFLOW_PATCH_TOOLS = new Set([
  'propose_workflow_change',
  'propose_destructive_workflow_change',
  'propose_code_change'
])

export type AgentUIItem =
  | { kind: 'user-message'; id: string; text: string }
  | { kind: 'text'; id: string; text: string; streaming: boolean }
  | { kind: 'reasoning'; id: string; text: string; streaming: boolean }
  | {
      kind: 'tool'
      id: string
      toolName: string
      argsText: string
      status: 'running' | 'done' | 'error'
      resultText?: string
    }
  | {
      kind: 'approval'
      id: string
      approvalId: string
      toolCallId: string
      toolName: string
      input: unknown
      reason?: string
      status: 'pending' | 'approved' | 'denied'
    }
  | { kind: 'screenshot'; id: string; dataUrl: string }
  | { kind: 'resource-preview'; id: string; dataUrl: string; name: string }

interface UseAgentRunOptions {
  profileId: string
  workflowId?: string
  getWorkflowSnapshot: () => { nodes: WorkflowNode[]; edges: WorkflowEdge[]; mode?: WorkflowMode; code?: string }
  // Called whenever propose_workflow_change/propose_destructive_workflow_change
  // comes back with `ok: true` — the caller owns re-validating against the
  // LIVE canvas and actually applying it (see apply-workflow-patch.ts).
  onWorkflowPatch: (patch: WorkflowChangePatch) => void
  // Called when the agent's start_browser/close_browser tools succeed, so
  // the caller can reconnect/disconnect the live preview — nothing launches
  // or stops the browser itself from here, the tool already did that.
  onBrowserLifecycle: (kind: 'started' | 'closed') => void
}

/**
 * OBSERVER: subscribes to the `agent:event` push channel and reduces the
 * incoming AG-UI event stream into UI-ready state — the renderer-side half
 * of ag-ui-adapter.ts's translation (main process AI SDK part -> AG-UI
 * event -> here, AG-UI event -> UI item).
 */
export function useAgentRun({
  profileId,
  workflowId,
  getWorkflowSnapshot,
  onWorkflowPatch,
  onBrowserLifecycle
}: UseAgentRunOptions) {
  const [items, setItems] = useState<AgentUIItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const runIdRef = useRef<string | null>(null)
  const historyRef = useRef<ModelMessage[]>([])
  // toolCallId -> toolName, so a later TOOL_CALL_RESULT (which only carries
  // the id) can tell whether it belongs to one of the workflow-patch tools.
  const toolNameByIdRef = useRef<Map<string, string>>(new Map())
  const onWorkflowPatchRef = useRef(onWorkflowPatch)
  onWorkflowPatchRef.current = onWorkflowPatch
  const onBrowserLifecycleRef = useRef(onBrowserLifecycle)
  onBrowserLifecycleRef.current = onBrowserLifecycle

  useEffect(() => {
    const handler = (envelope: AgentEventEnvelope) => {
      if (envelope.runId !== runIdRef.current) return
      const event = envelope.event

      if (event.type === EventType.TOOL_CALL_START) {
        toolNameByIdRef.current.set(event.toolCallId, event.toolCallName)
      }
      if (event.type === EventType.TOOL_CALL_RESULT) {
        const toolName = toolNameByIdRef.current.get(event.toolCallId)
        if (toolName && WORKFLOW_PATCH_TOOLS.has(toolName)) {
          tryApplyPatchFromResult(event.content, onWorkflowPatchRef.current)
        }
        if (toolName === 'start_browser' && resultOk(event.content)) {
          onBrowserLifecycleRef.current('started')
        }
        if (toolName === 'close_browser' && resultOk(event.content)) {
          onBrowserLifecycleRef.current('closed')
        }
      }

      setItems((prev) => reduceEvent(prev, event))

      if (event.type === EventType.RUN_FINISHED || event.type === EventType.RUN_ERROR) {
        setLoading(false)
        runIdRef.current = null
      }
      if (event.type === EventType.RUN_ERROR) {
        setError(event.message)
      }
    }

    return window.api.on('agent:event', handler)
  }, [])

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || loading) return

      const userMessage: ModelMessage = { role: 'user', content: trimmed }
      historyRef.current = [...historyRef.current, userMessage]
      setItems((prev) => [...prev, { kind: 'user-message', id: `u-${Date.now()}`, text: trimmed }])
      setError(null)
      setLoading(true)

      // Generated here, not read back from the response: `agent:run`'s
      // invoke() promise only resolves once the ENTIRE run finishes (it
      // streams everything else via `agent:event` while still pending), so
      // waiting for its return value to learn the runId would mean every
      // event arrives before this hook even knows which run they belong to
      // and gets filtered out below.
      const runId = crypto.randomUUID()
      runIdRef.current = runId

      try {
        await window.api.runAgent({
          runId,
          profileId,
          workflowId,
          workflowSnapshot: getWorkflowSnapshot(),
          messages: historyRef.current
        })
      } catch (err) {
        setLoading(false)
        setError(err instanceof Error ? err.message : String(err))
      }
    },
    [profileId, workflowId, getWorkflowSnapshot, loading]
  )

  const respondApproval = useCallback((approvalId: string, approved: boolean, reason?: string) => {
    setItems((prev) =>
      prev.map((it) =>
        it.kind === 'approval' && it.approvalId === approvalId
          ? { ...it, status: approved ? 'approved' : 'denied' }
          : it
      )
    )
    window.api.respondAgentApproval({ approvalId, approved, reason })
  }, [])

  const cancel = useCallback(() => {
    if (runIdRef.current) window.api.cancelAgentRun(runIdRef.current)
  }, [])

  const reset = useCallback(() => {
    setItems([])
    historyRef.current = []
    setError(null)
  }, [])

  return { items, loading, error, send, respondApproval, cancel, reset }
}

function reduceEvent(items: AgentUIItem[], event: AGUIEvent): AgentUIItem[] {
  switch (event.type) {
    case EventType.TEXT_MESSAGE_START:
      return [...items, { kind: 'text', id: event.messageId, text: '', streaming: true }]
    case EventType.TEXT_MESSAGE_CONTENT:
      return items.map((it) =>
        it.kind === 'text' && it.id === event.messageId ? { ...it, text: it.text + event.delta } : it
      )
    case EventType.TEXT_MESSAGE_END:
      return items.map((it) => (it.kind === 'text' && it.id === event.messageId ? { ...it, streaming: false } : it))

    case EventType.REASONING_MESSAGE_START:
      return [...items, { kind: 'reasoning', id: event.messageId, text: '', streaming: true }]
    case EventType.REASONING_MESSAGE_CONTENT:
      return items.map((it) =>
        it.kind === 'reasoning' && it.id === event.messageId ? { ...it, text: it.text + event.delta } : it
      )
    case EventType.REASONING_MESSAGE_END:
      return items.map((it) =>
        it.kind === 'reasoning' && it.id === event.messageId ? { ...it, streaming: false } : it
      )

    case EventType.TOOL_CALL_START:
      return [
        ...items,
        { kind: 'tool', id: event.toolCallId, toolName: event.toolCallName, argsText: '', status: 'running' }
      ]
    case EventType.TOOL_CALL_ARGS:
      return items.map((it) =>
        it.kind === 'tool' && it.id === event.toolCallId ? { ...it, argsText: it.argsText + event.delta } : it
      )
    case EventType.TOOL_CALL_RESULT: {
      const contentText = typeof event.content === 'string' ? event.content : JSON.stringify(event.content)
      const status = toolResultStatus(contentText)
      return items.map((it) =>
        it.kind === 'tool' && it.id === event.toolCallId ? { ...it, resultText: contentText, status } : it
      )
    }

    case EventType.CUSTOM: {
      if (event.name === 'tool-approval-request') {
        const req = event.value as AgentApprovalRequest
        return [
          ...items,
          {
            kind: 'approval',
            id: req.approvalId,
            approvalId: req.approvalId,
            toolCallId: req.toolCallId,
            toolName: req.toolName,
            input: req.input,
            reason: req.reason,
            status: 'pending'
          }
        ]
      }
      if (event.name === 'screenshot') {
        const { dataUrl } = event.value as { dataUrl: string }
        return [...items, { kind: 'screenshot', id: `shot-${Date.now()}`, dataUrl }]
      }
      if (event.name === 'resource-preview') {
        const { dataUrl, name } = event.value as { dataUrl: string; name: string }
        return [...items, { kind: 'resource-preview', id: `res-${Date.now()}`, dataUrl, name }]
      }
      return items
    }

    default:
      return items
  }
}

function resultOk(content: unknown): boolean {
  const contentText = typeof content === 'string' ? content : JSON.stringify(content)
  try {
    const parsed = JSON.parse(contentText) as { ok?: unknown }
    return parsed.ok === true
  } catch {
    return false
  }
}

function tryApplyPatchFromResult(content: unknown, onWorkflowPatch: (patch: WorkflowChangePatch) => void) {
  const contentText = typeof content === 'string' ? content : JSON.stringify(content)
  try {
    const parsed = JSON.parse(contentText) as { ok?: unknown; patch?: unknown }
    if (parsed.ok === true && parsed.patch && typeof parsed.patch === 'object') {
      onWorkflowPatch(parsed.patch as WorkflowChangePatch)
    }
  } catch {
    // Not JSON, or didn't match the expected {ok, patch} shape — nothing to apply.
  }
}

function toolResultStatus(contentText: string): 'done' | 'error' {
  try {
    const parsed: unknown = JSON.parse(contentText)
    if (parsed && typeof parsed === 'object' && (parsed as { ok?: unknown }).ok === false) return 'error'
  } catch {
    // Not JSON — treat as a plain successful result.
  }
  return 'done'
}
