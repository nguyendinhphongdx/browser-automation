import {
  ToolLoopAgent,
  type ModelMessage,
  type ToolApprovalResponse,
  type ToolApprovalRequestOutput,
  type ToolSet
} from 'ai'
import { EventType, type AGUIEvent, type AgentApprovalResponse } from '../../shared/agent/ag-ui-events'
import { resolveAgentModel } from './model-provider'
import { adaptStreamPart } from './ag-ui-adapter'
import { buildToolset, APPROVAL_GATED_TOOLS } from './tools/registry'
import type { AgentToolContext } from './tools/types'

export interface AgentRunRequest {
  runId: string
  threadId: string
  messages: ModelMessage[]
  toolContext: AgentToolContext
}

// Without this, nothing tells the model an order of operations — it'll
// happily guess a CSS selector straight into run_js instead of looking at
// the real DOM first, since every tool's own description only explains
// what THAT tool does, not when to prefer it over another.
const AGENT_INSTRUCTIONS = `Bạn là trợ lý AI giúp xây dựng và kiểm tra workflow tự động hoá trình duyệt trong app BrowserAuto.

Quy tắc bắt buộc:
1. Gọi check_browser_status trước khi làm bất kỳ gì liên quan tới trang web. Nếu chưa có trình duyệt nào đang mở, gọi start_browser — không giả định.
2. KHÔNG BAO GIỜ đoán mò CSS selector. Trước khi viết code trong run_js hay đề xuất node nhắm vào 1 phần tử cụ thể (propose_workflow_change/propose_destructive_workflow_change), LUÔN gọi get_page_html trước — toàn trang, hoặc truyền "selector" để chỉ lấy đúng 1 vùng (1 form, 1 section...) — rồi dùng đúng id/class/attribute tìm thấy trong HTML thật đó, không bịa.
3. Nếu get_page_html không đủ rõ (trang quá phức tạp, hoặc cần xem bố cục trực quan để biết phần tử nào đang hiển thị), gọi thêm take_screenshot trước khi quyết định selector.
4. run_js dùng để kiểm tra/thao tác tạm thời ngay trên trang đang mở. Khi người dùng muốn 1 quy trình chạy lại được nhiều lần, đề xuất qua propose_workflow_change/propose_destructive_workflow_change thay vì chỉ chạy run_js một lần rồi thôi.
5. run_js trả "ok: true" chỉ có nghĩa là đoạn JS không bị lỗi khi chạy — KHÔNG có nghĩa là hành động đó thật sự có tác dụng đúng như mong đợi (ví dụ: click trúng nút ẩn/disabled vẫn không throw lỗi gì). Sau MỖI bước run_js quan trọng (click, nhập liệu, submit, điều hướng...), BẮT BUỘC gọi take_screenshot (và/hoặc get_page_url nếu kỳ vọng đổi trang) ngay sau đó để tự mắt xác nhận trang đã đổi đúng như mong đợi, trước khi báo cho người dùng là bước đó đã thành công. Không tự khẳng định thành công chỉ dựa vào việc code bạn viết trả về đúng giá trị bạn mong muốn (ví dụ tự return "Searched" không phải bằng chứng đã tìm kiếm thật).`

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
    const { runId, threadId, toolContext } = req
    let messages = req.messages
    let finished = false

    const abortController = new AbortController()
    this.abortControllers.set(runId, abortController)

    emit({ type: EventType.RUN_STARTED, threadId, runId, timestamp: Date.now() })

    try {
      const model = resolveAgentModel()
      const tools = buildToolset(toolContext)
      const toolApproval = Object.fromEntries(
        APPROVAL_GATED_TOOLS.map((name) => [name, 'user-approval' as const])
      )

      // `reasoning` is AI SDK's own provider-agnostic knob — it translates to
      // whatever each provider actually needs under the hood (Anthropic's
      // thinking budget, OpenAI's reasoningEffort, Gemini's thinkingConfig,
      // etc.), and providers/models that don't support it simply ignore it.
      // This is what makes REASONING_MESSAGE_* events show up at all — without
      // it most models never emit reasoning content for the UI to display.
      const agent = new ToolLoopAgent({ model, tools, toolApproval, reasoning: 'medium', instructions: AGENT_INSTRUCTIONS })

      // One iteration = one model call through to either a clean finish or a
      // batch of pending tool approvals. On approvals, we wait for the
      // renderer to resolve every one of them, append the responses as a
      // `tool` message, and call `.stream()` again with the extended
      // history — this is AI SDK's own documented resume pattern for
      // `toolApproval`, just looped instead of done once.
      while (!abortController.signal.aborted) {
        const result = await agent.stream({ messages, abortSignal: abortController.signal })

        let aborted = false
        for await (const part of result.stream) {
          if (part.type === 'abort') aborted = true
          for (const event of adaptStreamPart(part)) emit(event)
        }

        if (aborted) {
          emit({ type: EventType.RUN_FINISHED, threadId, runId, outcome: { type: 'cancelled' }, timestamp: Date.now() })
          finished = true
          break
        }

        const content = await result.content
        const responseMessages = await result.responseMessages
        messages = [...messages, ...responseMessages]

        const pendingRequests = content.filter(
          (part): part is ToolApprovalRequestOutput<ToolSet> =>
            part.type === 'tool-approval-request' && !part.isAutomatic
        )

        if (pendingRequests.length === 0) {
          emit({ type: EventType.RUN_FINISHED, threadId, runId, outcome: { type: 'success' }, timestamp: Date.now() })
          finished = true
          break
        }

        const responses = await Promise.all(
          pendingRequests.map((part) => this.waitForApproval(part.approvalId, abortController.signal))
        )

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
          emit({ type: EventType.RUN_FINISHED, threadId, runId, outcome: { type: 'cancelled' }, timestamp: Date.now() })
        } else {
          emit({
            type: EventType.RUN_ERROR,
            message: err instanceof Error ? err.message : String(err),
            timestamp: Date.now()
          })
        }
      }
    } finally {
      this.abortControllers.delete(runId)
    }
  }

  /** Called from agent-handlers.ts's `agent:respondApproval` handler. */
  resolveApproval(response: AgentApprovalResponse): void {
    const resolve = this.pendingApprovals.get(response.approvalId)
    if (resolve) {
      resolve(response)
      this.pendingApprovals.delete(response.approvalId)
    }
  }

  /** Called from agent-handlers.ts's `agent:cancel` handler. */
  cancel(runId: string): void {
    this.abortControllers.get(runId)?.abort()
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

class RunCancelledWhileWaitingError extends Error {
  constructor() {
    super('Run cancelled while waiting for approval')
    this.name = 'RunCancelledWhileWaitingError'
  }
}

export const agentService = new AgentService()
