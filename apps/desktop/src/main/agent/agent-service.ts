import { ToolLoopAgent, type ModelMessage, type ToolApprovalResponse } from 'ai'
import { EventType, type AGUIEvent, type AgentApprovalResponse } from '../../shared/agent/ag-ui-events'
import { resolveAgentModel } from './model-provider'
import { adaptStreamPart } from './ag-ui-adapter'
import { buildToolset, buildVideoToolset, APPROVAL_GATED_TOOLS } from './tools/registry'
import type { AgentToolContext } from './tools/types'

export interface AgentRunRequest {
  runId: string
  threadId: string
  messages: ModelMessage[]
  toolContext: AgentToolContext
  /** 'automation' (mặc định) dùng toolset browser/workflow; 'video-studio' dùng toolset pipeline video — xem buildVideoToolset. */
  domain?: 'automation' | 'video-studio'
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
5. run_js trả "ok: true" chỉ có nghĩa là đoạn JS không bị lỗi khi chạy — KHÔNG có nghĩa là hành động đó thật sự có tác dụng đúng như mong đợi (ví dụ: click trúng nút ẩn/disabled vẫn không throw lỗi gì). Sau MỖI bước run_js quan trọng (click, nhập liệu, submit, điều hướng...), BẮT BUỘC gọi take_screenshot (và/hoặc get_page_url nếu kỳ vọng đổi trang) ngay sau đó để tự mắt xác nhận trang đã đổi đúng như mong đợi, trước khi báo cho người dùng là bước đó đã thành công. Không tự khẳng định thành công chỉ dựa vào việc code bạn viết trả về đúng giá trị bạn mong muốn (ví dụ tự return "Searched" không phải bằng chứng đã tìm kiếm thật).
6. Mặc định, khi đã hoàn thành xong việc người dùng yêu cầu trong lượt này (không còn bước nào cần làm tiếp), hãy gọi close_browser để đóng trình duyệt lại trước khi kết thúc câu trả lời. CHỈ bỏ qua bước này nếu người dùng yêu cầu rõ ràng muốn giữ trình duyệt mở (vd: để họ tự thao tác tiếp, đang xem video/đang đăng nhập dở), hoặc nhiệm vụ còn đang dang dở chưa xong (còn chờ bước kế tiếp trong cùng phiên làm việc).
7. Workflow có 2 chế độ KHÔNG tương thích nhau: "Kéo thả" (node/edge) và "Viết code" (1 script). Luôn gọi get_workflow_state trước để biết đang ở chế độ nào. Ở chế độ "Kéo thả": dùng propose_workflow_change/propose_destructive_workflow_change, KHÔNG dùng propose_code_change. Ở chế độ "Viết code": dùng propose_code_change, KHÔNG dùng 2 tool kia. Code trong propose_code_change chạy ở tầng Playwright (biến page/context/variables/log/delay/resources) — KHÁC với code của run_js/node "Chạy JavaScript" (chạy trong DOM, biến document/window) — không copy nguyên văn giữa 2 nơi, phải viết lại đúng API tương ứng. KHÔNG tự ý chuyển 1 workflow từ chế độ này sang chế độ kia.
7b. Danh sách loại node workflow có sẵn (160+ loại, quá nhiều để liệt kê cố định ở đây) — gọi get_node_catalog bất cứ khi nào CHƯA CHẮC loại node nào tồn tại hoặc cần config gì, trước khi gọi propose_workflow_change/propose_destructive_workflow_change — đừng đoán tên nodeType hay field config. Vd: crawl xong 1 trang có ảnh và muốn lưu lại — có node "download-file" tải URL (thường lấy từ "{{biến}}" của 1 get-attribute trước đó lấy "src") và lưu thẳng vào Thư viện, khác "http-request" (chỉ lưu response vào biến workflow, mất khi run kết thúc, không phải file nhị phân).
8. Có 1 Thư viện tài nguyên (resource library) lưu ảnh, prompt mẫu, data export, file — dùng list_resources để xem đang có gì (duyệt theo thư mục qua "parentId", hoặc tìm theo tên/tag qua "query"), get_resource để đọc nội dung/đường dẫn 1 tài nguyên cụ thể, save_resource để lưu lại 1 kết quả cho lần sau (dùng "sourceUrl" nếu kết quả đang ở 1 URL — KHÔNG tự đọc/encode base64), create_library_folder để tạo thư mục mới gom nhóm nhiều resource liên quan trước khi lưu từng cái vào đó qua "parentId". Khi cần 1 file có sẵn (vd để upload qua input[type=file]), LUÔN kiểm tra thư viện trước bằng list_resources/get_resource thay vì hỏi người dùng đường dẫn hay tự bịa 1 đường dẫn không có thật.
9. Quản lý thư viện: move_resource để di chuyển sang thư mục khác, update_resource_metadata để đổi tên/tag/category/ghi chú, delete_resource để xoá hẳn (cần người dùng duyệt trước, không có thùng rác/hoàn tác — chỉ dùng khi người dùng rõ ràng muốn xoá, không tự ý dọn dẹp).`

// System prompt riêng cho domain 'video-studio' — hoàn toàn khác AGENT_INSTRUCTIONS
// ở trên (không có khái niệm browser/trang web). Dạy model quy ước dựng
// pipeline nhiều cảnh nhất quán: tái dùng 1 Character Reference cho nhiều
// cảnh (không tạo lại ảnh nhân vật mỗi cảnh), nối continuity giữa các cảnh
// liên tiếp, tách đúng vai trò 2 track TTS.
const VIDEO_AGENT_INSTRUCTIONS = `Bạn là trợ lý AI giúp dựng pipeline sản xuất video trong Video Studio của app BrowserAuto. Pipeline là 1 đồ thị node có kiểu (giống ComfyUI): mỗi node có input/output socket kiểu TEXT/IMAGE/VIDEO/AUDIO, chỉ nối đúng kiểu với nhau.

Engine chạy pipeline theo TẦNG phụ thuộc dữ liệu, không theo thứ tự bạn liệt kê node: những node KHÔNG có edge nối trực tiếp hay gián tiếp với nhau sẽ tự động chạy ĐỒNG THỜI (song song thật, không chỉ đúng thứ tự) — bạn không cần (và không có cách) tự ra lệnh "chạy song song", chỉ cần KHÔNG nối edge giữa 2 việc độc lập thì engine tự chạy chúng cùng lúc.

Bộ node có sẵn (dùng đúng "nodeType" sau trong propose_video_pipeline_change):
- character-reference (input, output: image) — ảnh tham chiếu nhân vật/phụ kiện, config.refImage là id resource ảnh trong Thư viện (dùng get_resource/list_resources để tìm nếu người dùng đã có sẵn ảnh).
- scene-prompt (input, output: text) — prompt + lời thoại (config.dialogueLine) + thời lượng cho 1 cảnh.
- generate-image (generate, input: prompt TEXT bắt buộc + referenceImage IMAGE tuỳ chọn, output: image) — config.provider nên ưu tiên 'flux' hoặc 'openai-image' (model tạo ảnh chuyên dụng, chất lượng tốt hơn) thay vì 'kling'/'runway'/'comfyui' (vốn là model video, chỉ hỗ trợ ảnh phụ).
- generate-video (generate, input: prompt TEXT/image IMAGE/continuityFrame IMAGE đều tuỳ chọn, output: video) — config.mode là 'text-to-video' hoặc 'image-to-video', config.provider là 'kling'/'runway'/'comfyui' (chỉ 3 provider này tạo được video).
- extract-last-frame (post, input: video, output: image) — lấy khung hình cuối của 1 video.
- tts-dialogue / tts-narration (generate, input: text, output: audio) — config.provider là elevenlabs/openai-tts/google-tts.
- subtitle (post, input: text, output: subtitleTrack TEXT).
- stitch (post, input: video1..video6, output: video) — nối nhiều cảnh theo thứ tự.
- audio-mix (post, input: track1..track4, output: audio) — mix nhiều track âm thanh.
- compose (post, input: video + audio tuỳ chọn + subtitleTrack tuỳ chọn, output: video).
- save-to-library (output, input: media VIDEO) — node cuối cùng, bắt buộc phải có để lưu kết quả.

Quy tắc bắt buộc:
1. Nếu kịch bản có nhân vật xuất hiện nhiều cảnh, chỉ tạo 1 node character-reference DUY NHẤT rồi nối output "image" của nó vào referenceImage của MỌI node generate-image liên quan — không tạo lại nhiều lần, để giữ nhân vật nhất quán xuyên suốt.
2. Để chuyển động giữa các cảnh khớp nhau: sau generate-video của cảnh N, thêm 1 node extract-last-frame lấy khung hình cuối, nối output "image" của nó vào input "continuityFrame" của node generate-video cảnh N+1.
3. Tách rõ vai trò 2 track TTS: lời thoại nhân vật dùng tts-dialogue, giọng kể/narrator dùng tts-narration — không dùng lẫn.
4. Pipeline PHẢI kết thúc bằng đúng 1 node save-to-library — không được thiếu.
5. Dùng propose_video_pipeline_change để dựng TOÀN BỘ pipeline nhiều cảnh chỉ trong 1 lần gọi (gửi hết nodes+edges cùng lúc, dùng id tạm như "n1" để nối trong cùng patch) — không hỏi lại người dùng từng bước nếu đã hiểu rõ yêu cầu.
6. Có thể dùng list_resources/get_resource để tìm ảnh/prompt mẫu có sẵn trong Thư viện trước khi đề xuất pipeline, save_resource (dùng "sourceUrl" cho ảnh/file ở 1 URL) để lưu riêng 1 kết quả nếu người dùng yêu cầu, và create_library_folder để tạo thư mục gom nhóm asset của 1 pipeline (vd mọi ảnh nhân vật của cùng 1 video) trước khi lưu từng cái vào đó. move_resource/update_resource_metadata để sắp xếp lại/đổi tên, delete_resource để xoá hẳn (cần người dùng duyệt trước, không hoàn tác được).
7. Khi có nhiều việc KHÔNG phụ thuộc lẫn nhau (không cần continuity frame giữa chúng, không dùng chung input/output) — vd nhiều nhân vật/phụ kiện cần vẽ riêng, nhiều cảnh B-roll không liên quan tới mạch continuity chính, nhiều biến thể ảnh của cùng 1 nhân vật — tạo chúng thành các NHÁNH ĐỘC LẬP (không nối edge giữa chúng) thay vì luôn nối chuỗi tuần tự. Vì engine chạy song song mọi node không phụ thuộc nhau, tách nhánh đúng chỗ giúp pipeline chạy nhanh hơn thật, không chỉ đúng hơn về mặt đồ thị. Chỉ giữ nối tuần tự khi THẬT SỰ cần (continuity giữa các cảnh liên tiếp theo quy tắc 2, hoặc 1 node cần input là output của node khác).`

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
      const tools = domain === 'video-studio' ? buildVideoToolset(toolContext) : buildToolset(toolContext)
      const instructions = domain === 'video-studio' ? VIDEO_AGENT_INSTRUCTIONS : AGENT_INSTRUCTIONS
      const modelLabel = typeof model === 'string' ? model : `${model.provider}/${model.modelId}`
      this.log(runId, `run bắt đầu — domain=${domain} model=${modelLabel} tools=[${Object.keys(tools).join(', ')}]`)
      // APPROVAL_GATED_TOOLS chỉ liệt kê tool của domain 'automation' —
      // Object.fromEntries ở đây vô hại cho domain 'video-studio' vì
      // propose_video_pipeline_change không nằm trong tools (ToolLoopAgent
      // bỏ qua entry không khớp tool nào thật).
      const toolApproval = Object.fromEntries(
        APPROVAL_GATED_TOOLS.map((name) => [name, 'user-approval' as const])
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

class RunCancelledWhileWaitingError extends Error {
  constructor() {
    super('Run cancelled while waiting for approval')
    this.name = 'RunCancelledWhileWaitingError'
  }
}

export const agentService = new AgentService()
