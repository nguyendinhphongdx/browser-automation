import type { TextStreamPart, ToolSet } from 'ai'
import { EventType, type AGUIEvent, type AgentApprovalRequest } from '../../shared/agent/ag-ui-events'

/**
 * ADAPTER: translates one AI SDK `TextStreamPart` (ToolLoopAgent's own
 * stream vocabulary) into zero or more AG-UI `AGUIEvent` objects, so
 * everything downstream (agent-handlers.ts, the renderer) only ever has to
 * understand one, portable event vocabulary — regardless of which engine
 * produced it. Pure function, no side effects, easy to unit test in
 * isolation from any real model/browser.
 *
 * Most AI SDK part types map 1:1 onto an AG-UI event using fields AI SDK
 * already attaches (message/tool-call ids), so no local state needs to be
 * tracked here at all.
 */
export function adaptStreamPart(part: TextStreamPart<ToolSet>): AGUIEvent[] {
  const now = Date.now()

  switch (part.type) {
    case 'text-start':
      return [{ type: EventType.TEXT_MESSAGE_START, messageId: part.id, role: 'assistant', timestamp: now }]
    case 'text-delta':
      return [{ type: EventType.TEXT_MESSAGE_CONTENT, messageId: part.id, delta: part.text, timestamp: now }]
    case 'text-end':
      return [{ type: EventType.TEXT_MESSAGE_END, messageId: part.id, timestamp: now }]

    case 'reasoning-start':
      return [{ type: EventType.REASONING_MESSAGE_START, messageId: part.id, role: 'reasoning', timestamp: now }]
    case 'reasoning-delta':
      return [{ type: EventType.REASONING_MESSAGE_CONTENT, messageId: part.id, delta: part.text, timestamp: now }]
    case 'reasoning-end':
      return [{ type: EventType.REASONING_MESSAGE_END, messageId: part.id, timestamp: now }]

    case 'tool-input-start':
      return [
        { type: EventType.TOOL_CALL_START, toolCallId: part.id, toolCallName: part.toolName, timestamp: now }
      ]
    case 'tool-input-delta':
      return [{ type: EventType.TOOL_CALL_ARGS, toolCallId: part.id, delta: part.delta, timestamp: now }]
    case 'tool-input-end':
      return [{ type: EventType.TOOL_CALL_END, toolCallId: part.id, timestamp: now }]

    case 'tool-result':
      return [
        {
          type: EventType.TOOL_CALL_RESULT,
          messageId: `result-${part.toolCallId}`,
          toolCallId: part.toolCallId,
          content: safeStringify(part.output),
          role: 'tool',
          timestamp: now
        }
      ]
    case 'tool-error':
      return [
        {
          type: EventType.TOOL_CALL_RESULT,
          messageId: `error-${part.toolCallId}`,
          toolCallId: part.toolCallId,
          content: safeStringify({
            error: part.error instanceof Error ? part.error.message : String(part.error)
          }),
          role: 'tool',
          timestamp: now
        }
      ]

    case 'tool-approval-request': {
      const toolCall = part.toolCall as { toolCallId: string; toolName: string; input?: unknown }
      const payload: AgentApprovalRequest = {
        approvalId: part.approvalId,
        toolCallId: toolCall.toolCallId,
        toolName: toolCall.toolName,
        input: toolCall.input,
        reason: part.reason
      }
      return [{ type: EventType.CUSTOM, name: 'tool-approval-request', value: payload, timestamp: now }]
    }

    case 'error':
      return [
        {
          type: EventType.RUN_ERROR,
          message: part.error instanceof Error ? part.error.message : String(part.error),
          timestamp: now
        }
      ]

    // Bookkeeping/step-boundary parts we don't currently surface as their own
    // AG-UI event (STEP_STARTED/FINISHED would be one option, but per-turn
    // start/finish is already implicit in the RUN_STARTED/RUN_FINISHED pair
    // agent-service.ts emits around the whole multi-turn run), plus parts
    // this app doesn't use yet (files, sources) or that we intentionally
    // drive ourselves rather than echo (tool-approval-response — see
    // agent-service.ts's approval loop).
    case 'start':
    case 'finish':
    case 'start-step':
    case 'finish-step':
    case 'abort':
    case 'tool-approval-response':
    case 'tool-output-denied':
    case 'source':
    case 'file':
    case 'reasoning-file':
    case 'custom':
    case 'raw':
      return []

    default:
      return []
  }
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}
