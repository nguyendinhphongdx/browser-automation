# AI Agent

[← Về mục lục](../README.md)

`main/agent/` triển khai 1 agent dùng tool thật (không phải chat completion 1 lượt) trên nền **Vercel AI SDK**'s `ToolLoopAgent`. Vòng lặp model ↔ tool ↔ model do AI SDK tự quản lý nội bộ; code trong repo chỉ cần cung cấp model, tool, và cấu hình cổng duyệt (`toolApproval`).

## Design pattern áp dụng — map cụ thể

| Pattern | File | Vai trò |
|---|---|---|
| Registry | `tools/registry.ts` | Bảng tên tool → tool instance, giống `nodes/registry.ts` |
| Factory/Strategy | `model-provider.ts` | 1 hàm chọn "chiến lược" provider theo setting runtime (Anthropic/OpenAI/Google/Groq/Ollama/custom), thống nhất sau kiểu `LanguageModel` |
| Adapter | `ag-ui-adapter.ts` | Dịch `TextStreamPart` riêng của AI SDK sang vocabulary sự kiện chuẩn [AG-UI](https://github.com/ag-ui-protocol/ag-ui) |
| Observer | `renderer/.../use-agent-run.ts` | Subscribe channel push `agent:event`, reduce thành state UI |
| Facade | `agent-service.ts` | 1 cửa vào duy nhất (`run`/`resolveApproval`/`cancel`) giấu hết chi tiết model + tool + approval + event bên trong |

## 8 tool agent có thể gọi (`tools/`)

| Tool | Cần duyệt? | Làm gì |
|---|---|---|
| `get_page_url` | Không | URL + title trang hiện tại |
| `get_page_html` | Không | `page.content()`/`innerHTML()`, cắt ở ~20k ký tự |
| `take_screenshot` | Không | Chụp màn hình — trả `{width,height,byteSize}` cho model, đẩy ảnh thật ra UI qua event `CUSTOM` riêng (model không cần "nhìn" ảnh base64 khổng lồ để biết đã chụp thành công) |
| `run_js` | **Có** | `page.evaluate()` JS tuỳ ý, timeout 10s — rủi ro cao nhất vì chạy mã tuỳ ý trên trang thật |
| `get_workflow_state` | Không | Snapshot `nodes`/`edges` hiện tại trên canvas, đã rút gọn (bỏ `position` không cần cho model) |
| `get_execution_logs` | Không | Đọc `workflow_logs` qua thẳng `workflow-service.ts` (main process, không qua IPC vì đã ở main rồi) |
| `propose_workflow_change` | Không | `add_nodes`/`update_node` — validate bằng `validateWorkflowPatch` trước khi coi là hợp lệ |
| `propose_destructive_workflow_change` | **Có** | `remove_nodes`/`replace_all` — tính thêm `affectedEdgeCount` để UI duyệt hiện rõ ảnh hưởng |

Tách riêng 2 tool `propose_*` (thay vì 1 tool + flag) vì cổng duyệt của AI SDK chỉ xác nhận hoạt động đúng theo **tên tool tĩnh** (`toolApproval: {toolName: 'user-approval'}`), chưa có API gate theo điều kiện động trong 1 tool.

```ts
export const APPROVAL_GATED_TOOLS = ['run_js', 'propose_destructive_workflow_change'] as const
```

## Validate 2 lớp cho patch workflow

1. **Main process, lúc tool chạy** — validate nhanh dựa trên snapshot workflow lúc **bắt đầu** lượt chat, để model tự sửa nếu đề xuất sai (thiếu `sourceHandle`, trỏ tới node không tồn tại...)
2. **Renderer, ngay trước khi áp dụng** — validate lại lần nữa trên state **thật** của canvas, vì 1 lượt chat nhiều bước có thể kéo dài trong khi người dùng đã tự sửa canvas — tránh patch đè lên state đã lỗi thời

## `agent-service.ts` — vòng lặp 1 lượt chat

```
emit RUN_STARTED
while chưa xong:
  result = agent.stream({ messages })       // ToolLoopAgent tự chạy nhiều bước nội bộ
  for await part of result.stream:
    emit adaptStreamPart(part)               // dịch sang AG-UI event, đẩy real-time qua agent:event
  content = await result.content
  pending = content lọc các tool-approval-request chưa trả lời
  nếu pending rỗng: emit RUN_FINISHED; dừng
  chờ người dùng duyệt từng pending (Promise treo, resolve khi agent:respondApproval tới)
  nối message "tool-approval-response" vào lịch sử, lặp lại
```

Huỷ lượt chat giữa chừng (`cancel()`) phải **race** với Promise đang chờ duyệt — nếu không, huỷ trong lúc đang chờ người dùng bấm Duyệt sẽ treo vĩnh viễn thay vì kết thúc. `agent-service.ts` dùng `AbortController` + 1 lớp lỗi riêng (`RunCancelledWhileWaitingError`) để phát hiện đúng trường hợp này và emit `RUN_FINISHED`/`cancelled` thay vì treo hoặc báo lỗi chung chung.

## Vì sao dùng vocabulary AG-UI nhưng không dùng nguyên cả thư viện

[AG-UI](https://github.com/ag-ui-protocol/ag-ui) định nghĩa 1 bộ sự kiện chuẩn hoá (`TEXT_MESSAGE_*`, `TOOL_CALL_*`, `REASONING_MESSAGE_*`...) độc lập transport — dùng lại đúng đống type này (`@ag-ui/core`) giúp sau này nếu agent chạy server-side cho nhiều client, lớp UI không cần đổi gì. Nhưng phần `Interrupt`/resume của AG-UI khi xây tính năng này vẫn ở trạng thái DRAFT chưa ổn định 1.0 — nên approval được tự làm bằng 1 `CUSTOM` event riêng (cùng "họ" AG-UI) thay vì phụ thuộc phần chưa chốt API.

## Live preview — AI và người dùng cùng xem 1 trình duyệt

`browser-preview-service.ts` mở 1 CDP session (`page.context().newCDPSession(page)`) và gọi `Page.startScreencast` — API có sẵn trên mọi trang Chromium Playwright đang điều khiển, không cần dựng thêm pipeline video/WebRTC nào. Mỗi frame JPEG base64 được đẩy qua `browserPreview:frame` (push channel), renderer vẽ thẳng vào `<img>`. Chỉ hoạt động với Chromium — Firefox không có CDP nên tool trả lỗi `unsupported`, renderer hiện thông báo thay vì crash.

Agent và khung preview **đều tự launch browser nếu chưa có** (qua `acquireBrowserPage()` dùng chung với scheduler/campaign) — quyết định này đánh đổi: ban đầu agent chỉ *đọc* browser đã mở sẵn (không tự ý mở gì), nhưng điều đó khiến mọi tool đọc trang đều lỗi "chưa có browser nào đang mở" nếu người dùng chưa tự bấm Play trước — trải nghiệm kém hơn việc agent tự lo lấy 1 trình duyệt đúng cấu hình (fingerprint, thư mục dữ liệu) của chính profile đó.

## Thêm 1 tool mới — checklist

1. Tạo `tools/<ten-tool>.ts`, export `createXTool(ctx: AgentToolContext)` trả về `tool({ description, inputSchema, execute })` (Zod schema)
2. Thêm vào `buildToolset()` trong `tools/registry.ts`
3. Nếu tool có thể gây hại không hồi phục được (xoá dữ liệu, chạy mã tuỳ ý...): thêm tên vào `APPROVAL_GATED_TOOLS`
4. Viết test ở `tools/*.test.ts` (mock `AgentToolContext`, không cần trình duyệt thật)
