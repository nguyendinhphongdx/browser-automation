import { ToolLoopAgent, type ModelMessage, type ToolApprovalResponse } from 'ai'
import { randomUUID } from 'crypto'
import {
  EventType,
  type AGUIEvent,
  type AgentApprovalRequest,
  type AgentApprovalResponse
} from '../../shared/agent/ag-ui-events'
import { resolveAgentModel } from './model-provider'
import { adaptStreamPart } from './ag-ui-adapter'
import { AGENT_DOMAINS, type AgentDomain } from './domains'
import type { AgentToolContext } from './tools/types'

export interface AgentRunRequest {
  runId: string
  threadId: string
  messages: ModelMessage[]
  toolContext: AgentToolContext
  /** 'automation' (mặc định) — xem AGENT_DOMAINS (domains.ts, ADR-0005) cho tools/instructions/approval-gating của từng domain. */
  domain?: AgentDomain
}

type EmitFn = (event: AGUIEvent) => void

/**
 * FACADE: the single entry point for running an agent turn. Owns the
 * ToolLoopAgent's multi-turn pause/resume-on-approval loop and the bookkeeping
 * needed to resolve an approval that arrives later over IPC — everything
 * agent-handlers.ts needs to know is `run()`, `resolveApproval()`, `cancel()`.
 */
export class AgentService {
  private pendingApprovals = new Map<string, (response: AgentApprovalResponse) => void>()
  private abortControllers = new Map<string, AbortController>()

  /**
   * Drives one full run to completion — which may span several model calls
   * if the model requests one or more approval-gated tools along the way.
   * Every intermediate event is forwarded via `emit` as it happens (see
   * ag-ui-adapter.ts); this promise resolves only once the run is fully
   * finished, errored, or cancelled.
   */
  async run(req: AgentRunRequest, emit: EmitFn): Promise<void> {
    const { runId, threadId, toolContext, domain = 'automation' } = req
    let messages = req.messages
    let finished = false

    const abortController = new AbortController()
    this.abortControllers.set(runId, abortController)

    emit({ type: EventType.RUN_STARTED, threadId, runId, timestamp: Date.now() })

    try {
      const model = resolveAgentModel()
      const domainConfig = AGENT_DOMAINS[domain]
      const tools = domainConfig.buildToolset(toolContext)
      const instructions = domainConfig.instructions
      const modelLabel = typeof model === 'string' ? model : `${model.provider}/${model.modelId}`
      this.log(runId, `run bắt đầu — domain=${domain} model=${modelLabel} tools=[${Object.keys(tools).join(', ')}]`)
      const toolApproval = Object.fromEntries(
        domainConfig.approvalGatedTools.map((name) => [name, 'user-approval' as const])
      )

      // `reasoning` is AI SDK's own provider-agnostic knob — it translates to
      // whatever each provider actually needs under the hood (Anthropic's
      // thinking budget, OpenAI's reasoningEffort, Gemini's thinkingConfig,
      // etc.), and providers/models that don't support it simply ignore it.
      // This is what makes REASONING_MESSAGE_* events show up at all — without
      // it most models never emit reasoning content for the UI to display.
      //
      // For Gemini specifically, `reasoning` alone only sets thinkingBudget —
      // @ai-sdk/google's resolveGemini25ThinkingConfig() never sets
      // includeThoughts, so the model keeps "thinking" internally but the
      // stream never carries any reasoning text unless we ask for it here too.
      const agent = new ToolLoopAgent({
        model,
        tools,
        toolApproval,
        reasoning: 'medium',
        instructions,
        providerOptions: { google: { thinkingConfig: { includeThoughts: true } } }
      })

      // One iteration = one model call through to either a clean finish or a
      // batch of pending tool approvals. On approvals, we wait for the
      // renderer to resolve every one of them, append the responses as a
      // `tool` message, and call `.stream()` again with the extended
      // history — this is AI SDK's own documented resume pattern for
      // `toolApproval`, just looped instead of done once.
      let turn = 0
      while (!abortController.signal.aborted) {
        turn++
        this.log(runId, `gọi model lần ${turn} — ${messages.length} tin nhắn trong lịch sử`)
        const result = await agent.stream({ messages, abortSignal: abortController.signal })

        let aborted = false
        // Register waitForApproval() the INSTANT the stream yields the
        // request — i.e. before adaptStreamPart's event even reaches the
        // renderer, let alone gets answered. Doing this AFTER the loop (via
        // `content`, as this used to) raced a fast responder (bypass mode
        // especially — it answers within the same React render, no human
        // reaction time to lose the race) against this very registration:
        // resolveApproval() would run, find nothing yet in pendingApprovals
        // (the Map entry didn't exist until the content-based pass below
        // got to it), silently no-op, and the run would hang forever
        // waiting on a response that already arrived and was dropped.
        const pendingApprovalPromises: Promise<AgentApprovalResponse>[] = []
        for await (const part of result.stream) {
          if (part.type === 'abort') aborted = true
          if (part.type === 'tool-input-start') {
            this.log(runId, `gọi tool "${part.toolName}"`)
          }
          if (part.type === 'tool-approval-request') {
            const toolName = (part.toolCall as { toolName?: string })?.toolName ?? '?'
            this.log(runId, `tool "${toolName}" cần duyệt — approvalId=${part.approvalId} isAutomatic=${!!part.isAutomatic}`)
            if (!part.isAutomatic) {
              pendingApprovalPromises.push(this.waitForApproval(part.approvalId, abortController.signal))
            }
          }
          if (part.type === 'tool-result') {
            this.log(runId, `tool "${part.toolName}" xong`)
          }
          if (part.type === 'tool-error') {
            this.log(runId, `tool "${part.toolName}" lỗi: ${part.error instanceof Error ? part.error.message : String(part.error)}`)
          }
          for (const event of adaptStreamPart(part)) emit(event)
        }

        if (aborted) {
          this.log(runId, 'run bị huỷ (abort)')
          emit({ type: EventType.RUN_FINISHED, threadId, runId, outcome: { type: 'cancelled' }, timestamp: Date.now() })
          finished = true
          break
        }

        // Still awaited for whatever internal settling AI SDK does between
        // stream-drained and responseMessages being ready — just no longer
        // read directly; pendingRequests used to be filtered from this, now
        // sourced from the stream loop above instead (see comment there).
        await result.content
        const responseMessages = await result.responseMessages
        messages = [...messages, ...responseMessages]

        if (pendingApprovalPromises.length === 0) {
          this.log(runId, 'run hoàn tất')
          emit({ type: EventType.RUN_FINISHED, threadId, runId, outcome: { type: 'success' }, timestamp: Date.now() })
          finished = true
          break
        }

        this.log(runId, `đang chờ ${pendingApprovalPromises.length} approval...`)
        const responses = await Promise.all(pendingApprovalPromises)
        this.log(runId, `đã nhận đủ ${responses.length} approval — ${responses.map((r) => (r.approved ? 'cho phép' : 'từ chối')).join(', ')}`)

        const toolApprovalMessage: ModelMessage = {
          role: 'tool',
          content: responses.map(
            (r): ToolApprovalResponse => ({
              type: 'tool-approval-response',
              approvalId: r.approvalId,
              approved: r.approved,
              reason: r.reason
            })
          )
        } as ModelMessage
        messages = [...messages, toolApprovalMessage]
      }
    } catch (err) {
      if (!finished) {
        if (err instanceof RunCancelledWhileWaitingError) {
          this.log(runId, 'run bị huỷ trong lúc đang chờ approval')
          emit({ type: EventType.RUN_FINISHED, threadId, runId, outcome: { type: 'cancelled' }, timestamp: Date.now() })
        } else {
          const message = err instanceof Error ? err.message : String(err)
          this.log(runId, `run lỗi: ${message}`)
          emit({ type: EventType.RUN_ERROR, message, timestamp: Date.now() })
        }
      }
    } finally {
      this.abortControllers.delete(runId)
    }
  }

  /**
   * Runs 1 "sub-agent" turn to completion and resolves with just its final
   * text — used by the 'general' domain's delegate_to_* tools (ADR-0007) to
   * hand a task off to another domain's agent without a renderer page open
   * for it. Reuses `run()` entirely (same loop, same approval machinery),
   * only the `emit` differs: nothing streams out to a real `agent:event`
   * subscriber (this isn't a run any renderer is watching), and any
   * approval-gated tool the sub-agent tries gets auto-DENIED the instant it
   * comes up — there's no human available to answer it mid-delegation, and
   * defaulting to deny is the safe direction (vs. auto-approving, which
   * would let a delegated task silently do something destructive).
   *
   * `onToolResult` mirrors the renderer's `useAgentRun` callback shape
   * (ADR-0005) on purpose — same generalization, now reused server-side so
   * a delegate_to_* tool can react to e.g. propose_workflow_change's result
   * and persist the patch straight to the DB itself.
   */
  async runSubAgent(opts: {
    domain: AgentDomain
    toolContext: AgentToolContext
    task: string
    onToolResult?: (toolName: string, resultText: string, ok: boolean) => void
  }): Promise<{ ok: boolean; text: string }> {
    const runId = `sub-${randomUUID()}`
    const toolNameById = new Map<string, string>()
    let text = ''
    let errorMessage: string | null = null

    await new Promise<void>((resolve) => {
      const emit: EmitFn = (event) => {
        if (event.type === EventType.TEXT_MESSAGE_CONTENT) {
          text += event.delta
        }
        if (event.type === EventType.TOOL_CALL_START) {
          toolNameById.set(event.toolCallId, event.toolCallName)
        }
        if (event.type === EventType.TOOL_CALL_RESULT) {
          const toolName = toolNameById.get(event.toolCallId)
          if (toolName && opts.onToolResult) {
            const contentText = typeof event.content === 'string' ? event.content : JSON.stringify(event.content)
            opts.onToolResult(toolName, contentText, resultOk(event.content))
          }
        }
        if (event.type === EventType.CUSTOM && event.name === 'tool-approval-request') {
          const req = event.value as AgentApprovalRequest
          this.resolveApproval({
            approvalId: req.approvalId,
            approved: false,
            reason: 'Hành động cần người duyệt không thể tự chạy trong 1 task được giao (delegate) — thực hiện trực tiếp nếu thật sự cần.'
          })
        }
        if (event.type === EventType.RUN_ERROR) errorMessage = event.message
        if (event.type === EventType.RUN_FINISHED || event.type === EventType.RUN_ERROR) resolve()
      }

      this.run(
        { runId, threadId: runId, messages: [{ role: 'user', content: opts.task }], toolContext: opts.toolContext, domain: opts.domain },
        emit
      )
    })

    return errorMessage ? { ok: false, text: errorMessage } : { ok: true, text: text.trim() || '(không có phản hồi)' }
  }

  /** Called from agent-handlers.ts's `agent:respondApproval` handler. */
  resolveApproval(response: AgentApprovalResponse): void {
    const resolve = this.pendingApprovals.get(response.approvalId)
    if (resolve) {
      console.log(`[AgentService] resolveApproval: approvalId=${response.approvalId} approved=${response.approved}`)
      resolve(response)
      this.pendingApprovals.delete(response.approvalId)
    } else {
      // Should only happen for a genuinely stale approvalId (run already
      // finished/cancelled) — a response for one still in flight must always
      // find its entry now that waitForApproval() registers from the stream
      // loop itself (see run()). Logging instead of staying silent is what
      // would have made the race this fixed obvious immediately, instead of
      // surfacing only as "it's been stuck a long time" in the UI.
      console.warn(`[AgentService] resolveApproval: không tìm thấy approvalId "${response.approvalId}" đang chờ`)
    }
  }

  /** Called from agent-handlers.ts's `agent:cancel` handler. */
  cancel(runId: string): void {
    this.abortControllers.get(runId)?.abort()
  }

  /**
   * Terminal log of the agent loop's lifecycle — model calls, tool calls,
   * approval wait/resolve — visible in the `pnpm desktop:dev` main-process
   * console, independent of the renderer UI (added to debug a run that
   * silently hangs: the terminal trace shows exactly which step it never
   * got past, instead of just "it's been stuck a long time").
   */
  private log(runId: string, message: string): void {
    console.log(`[AgentService][${runId}] ${message}`)
  }

  /**
   * Resolves when the renderer answers this approval, or rejects with
   * RunCancelledWhileWaitingError if the run is cancelled first — without
   * the abort race, a run cancelled while waiting on approval would hang
   * forever, since nothing else would ever call resolveApproval() for it.
   */
  private waitForApproval(approvalId: string, signal: AbortSignal): Promise<AgentApprovalResponse> {
    return new Promise((resolve, reject) => {
      const onAbort = () => {
        this.pendingApprovals.delete(approvalId)
        reject(new RunCancelledWhileWaitingError())
      }
      signal.addEventListener('abort', onAbort, { once: true })
      this.pendingApprovals.set(approvalId, (response) => {
        signal.removeEventListener('abort', onAbort)
        resolve(response)
      })
    })
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

class RunCancelledWhileWaitingError extends Error {
  constructor() {
    super('Run cancelled while waiting for approval')
    this.name = 'RunCancelledWhileWaitingError'
  }
}

export const agentService = new AgentService()
