import { useCallback, useEffect, useRef, useState } from 'react'
import type { ModelMessage } from 'ai'
import type { VideoNode, VideoEdge } from '@shared/types'
import { EventType, type AGUIEvent, type AgentEventEnvelope } from '@shared/agent/ag-ui-events'
import type { VideoPipelineChangePatch } from './apply-video-pipeline-patch'

export type VideoAgentUIItem =
  | { kind: 'user-message'; id: string; text: string }
  | { kind: 'text'; id: string; text: string; streaming: boolean }
  | { kind: 'reasoning'; id: string; text: string; streaming: boolean }
  | { kind: 'tool'; id: string; toolName: string; argsText: string; status: 'running' | 'done' | 'error'; resultText?: string }
  | { kind: 'resource-preview'; id: string; dataUrl: string; name: string }

interface UseVideoAgentRunOptions {
  pipelineId?: string
  getPipelineSnapshot: () => { nodes: VideoNode[]; edges: VideoEdge[] }
  onPipelinePatch: (patch: VideoPipelineChangePatch) => void
}

/**
 * Mirror use-agent-run.ts, rút gọn cho domain 'video-studio' — toolset của
 * domain này (propose_video_pipeline_change/list_resources/get_resource/
 * save_resource) không tool nào cần duyệt (xem registry.ts's
 * buildVideoToolset), nên bỏ hẳn phần approval request/response không dùng
 * tới, không phải vì quên mà vì không có gì để gate.
 */
export function useVideoAgentRun({ pipelineId, getPipelineSnapshot, onPipelinePatch }: UseVideoAgentRunOptions) {
  const [items, setItems] = useState<VideoAgentUIItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const runIdRef = useRef<string | null>(null)
  const historyRef = useRef<ModelMessage[]>([])
  const toolNameByIdRef = useRef<Map<string, string>>(new Map())
  const onPipelinePatchRef = useRef(onPipelinePatch)
  onPipelinePatchRef.current = onPipelinePatch

  useEffect(() => {
    const handler = (envelope: AgentEventEnvelope) => {
      if (envelope.runId !== runIdRef.current) return
      const event = envelope.event

      if (event.type === EventType.TOOL_CALL_START) {
        toolNameByIdRef.current.set(event.toolCallId, event.toolCallName)
      }
      if (event.type === EventType.TOOL_CALL_RESULT) {
        const toolName = toolNameByIdRef.current.get(event.toolCallId)
        if (toolName === 'propose_video_pipeline_change') {
          tryApplyPatchFromResult(event.content, onPipelinePatchRef.current)
        }
      }

      setItems((prev) => reduceEvent(prev, event))

      if (event.type === EventType.RUN_FINISHED || event.type === EventType.RUN_ERROR) {
        setLoading(false)
        runIdRef.current = null
      }
      if (event.type === EventType.RUN_ERROR) setError(event.message)
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

      const runId = crypto.randomUUID()
      runIdRef.current = runId

      try {
        await window.api.runAgent({
          runId,
          domain: 'video-studio',
          videoPipelineId: pipelineId,
          videoPipelineSnapshot: getPipelineSnapshot(),
          messages: historyRef.current
        })
      } catch (err) {
        setLoading(false)
        setError(err instanceof Error ? err.message : String(err))
      }
    },
    [pipelineId, getPipelineSnapshot, loading]
  )

  const cancel = useCallback(() => {
    if (runIdRef.current) window.api.cancelAgentRun(runIdRef.current)
  }, [])

  const reset = useCallback(() => {
    setItems([])
    historyRef.current = []
    setError(null)
  }, [])

  return { items, loading, error, send, cancel, reset }
}

function reduceEvent(items: VideoAgentUIItem[], event: AGUIEvent): VideoAgentUIItem[] {
  switch (event.type) {
    case EventType.TEXT_MESSAGE_START:
      return [...items, { kind: 'text', id: event.messageId, text: '', streaming: true }]
    case EventType.TEXT_MESSAGE_CONTENT:
      return items.map((it) => (it.kind === 'text' && it.id === event.messageId ? { ...it, text: it.text + event.delta } : it))
    case EventType.TEXT_MESSAGE_END:
      return items.map((it) => (it.kind === 'text' && it.id === event.messageId ? { ...it, streaming: false } : it))

    case EventType.REASONING_MESSAGE_START:
      return [...items, { kind: 'reasoning', id: event.messageId, text: '', streaming: true }]
    case EventType.REASONING_MESSAGE_CONTENT:
      return items.map((it) => (it.kind === 'reasoning' && it.id === event.messageId ? { ...it, text: it.text + event.delta } : it))
    case EventType.REASONING_MESSAGE_END:
      return items.map((it) => (it.kind === 'reasoning' && it.id === event.messageId ? { ...it, streaming: false } : it))

    case EventType.TOOL_CALL_START:
      return [...items, { kind: 'tool', id: event.toolCallId, toolName: event.toolCallName, argsText: '', status: 'running' }]
    case EventType.TOOL_CALL_ARGS:
      return items.map((it) => (it.kind === 'tool' && it.id === event.toolCallId ? { ...it, argsText: it.argsText + event.delta } : it))
    case EventType.TOOL_CALL_RESULT: {
      const contentText = typeof event.content === 'string' ? event.content : JSON.stringify(event.content)
      const status = toolResultStatus(contentText)
      return items.map((it) => (it.kind === 'tool' && it.id === event.toolCallId ? { ...it, resultText: contentText, status } : it))
    }

    case EventType.CUSTOM: {
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

function tryApplyPatchFromResult(content: unknown, onPipelinePatch: (patch: VideoPipelineChangePatch) => void) {
  const contentText = typeof content === 'string' ? content : JSON.stringify(content)
  try {
    const parsed = JSON.parse(contentText) as { ok?: unknown; patch?: unknown }
    if (parsed.ok === true && parsed.patch && typeof parsed.patch === 'object') {
      onPipelinePatch(parsed.patch as VideoPipelineChangePatch)
    }
  } catch {
    // Không phải JSON, hoặc không đúng shape {ok, patch} — không có gì để áp.
  }
}

function toolResultStatus(contentText: string): 'done' | 'error' {
  try {
    const parsed: unknown = JSON.parse(contentText)
    if (parsed && typeof parsed === 'object' && (parsed as { ok?: unknown }).ok === false) return 'error'
  } catch {
    // Không phải JSON — coi như thành công bình thường.
  }
  return 'done'
}
