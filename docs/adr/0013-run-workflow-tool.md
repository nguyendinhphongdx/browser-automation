# ADR-0013: AI có thể tự CHẠY workflow Automation thật (gate approval)

🟢 Accepted

- **Date**: 2026-10-13
- **Status**: Accepted

## Context

ADR-0011 cho AI khả năng tự CHẠY pipeline Video Studio thật (`run_video_pipeline`), nhưng cố tình để Automation ngoài phạm vi — ghi rõ "giới hạn đã biết". Người dùng hỏi thẳng: "AI trợ lý có giúp mình chạy tạo được video ảnh không" — sau khi ADR-0012 thêm 2 node `generate-image`/`generate-video` cho Automation, câu trả lời thực tế là KHÔNG: AI chỉ có `propose_workflow_change` (chỉ thiết kế/lưu bản nháp), không có tool nào thật sự chạy workflow — người dùng vẫn phải tự bấm "Chạy" trên UI.

Khảo sát xác nhận `executeVisualWorkflow`/`executeCodeWorkflow` (`automation/engine.ts`) có interface giống hệt `executeVideoPipeline` (ADR-0011 đã dựa vào) — `ExecutionContext` chỉ cần `page`/`context`/`profileId`/`variables`/`logs`, các callback `onNodeStart/Done/Error/Retry` đều optional, không phụ thuộc `WebContents`. Phần "thật sự cần browser" (`acquireBrowserPage`) chỉ cần 1 `BrowserProfile`, không cần IPC `event.sender` nào — điểm duy nhất `workflow:run`'s IPC handler làm mà 1 agent tool không cần là gửi thông báo tiến độ real-time cho renderer (không có renderer nào đang nghe trong ngữ cảnh agent tool).

## Decision

Tool mới `run_workflow(workflowId, profileId?)` (`main/agent/tools/run-workflow.ts`) — mirror chính xác `run-video-pipeline.ts`: `getWorkflowById` lấy workflow, `getProfileById` lấy/validate profile (mặc định `ctx.profileId` của cuộc chat hiện tại, hoặc `DEFAULT_PROFILE_ID`), `acquireBrowserPage` (browser/launcher.ts, đã tự xử lý context chết/relaunch) mở browser thật, `executeVisualWorkflow`/`executeCodeWorkflow` theo đúng `workflow.mode`, `createWorkflowLog`/`updateWorkflowLog` ghi kết quả. Trả `{ok, logId, status, logs}`.

Đăng ký vào `buildAutomationToolset` (chat trực tiếp ở Automation) và `buildProjectToolset` (kế thừa vào `buildGeneralToolset`) — KHÔNG vào `buildVideoToolset` (không liên quan, Video Studio không chạm Automation). Gate `run_workflow` trong `approvalGatedTools` của cả 3 domain này — cùng lý do `run_video_pipeline` được gate (chạy node thật, có thể tốn tiền/thời gian nếu dùng node generate-image/generate-video mới). Khi gọi qua `delegate_to_automation`'s sub-agent, cơ chế auto-deny của `runSubAgent` (ADR-0007) tự chặn chạy ngầm không ai duyệt được — chỉ chat trực tiếp hoặc trợ lý chung/project tự gọi mới duyệt được thật, giống hệt cách `run_video_pipeline` đã hoạt động.

Cập nhật instructions cả 3 domain (automation/project/general) để model biết: propose chỉ thiết kế, phải `run_workflow` mới có kết quả thật — không được báo "đã xong" khi chỉ mới propose.

## Alternatives considered

| Option | Pros | Cons | Why not |
|---|---|---|---|
| Giữ nguyên giới hạn (chỉ propose) | Không cần thêm gì | Đúng vấn đề người dùng chỉ ra — AI "dựng xong" workflow tạo ảnh/video mà không chạy được, vẫn phải tự bấm Chạy | Người dùng xác nhận muốn thêm |
| Thêm tool chạy nhưng KHÔNG gate | AI tự động hoàn toàn | Tốn tiền/thời gian thật không kiểm soát (đặc biệt với node generate-image/generate-video mới), rủi ro cao | Nhất quán với quyết định gate `run_video_pipeline` (ADR-0011) |
| Thêm `run_workflow` mirror `run_video_pipeline`, gate approval, dựa vào auto-deny sẵn có của sub-agent (chosen) | Giải quyết đúng vấn đề, không cần cơ chế mới (tái dùng engine + ADR-0007's auto-deny), đối xứng hoàn toàn với Video Studio | Vẫn tốn 1 lượt duyệt thật mỗi lần chạy | Đánh đổi hợp lý — đúng mức rủi ro |

## Consequences

### Positive
- Automation giờ đối xứng với Video Studio: AI có thể cả thiết kế LẪN chạy thật — đóng đúng khoảng trống ADR-0011 từng để lại.
- Không rủi ro chạy ngầm không kiểm soát qua delegate — auto-deny của sub-agent (ADR-0007) tự nhiên chặn, không cần logic mới.

### Negative
- `run_workflow` không có `onNodeStart/Done/Error` báo real-time tới renderer nào (không có ai nghe) — AI chỉ biết kết quả sau khi toàn bộ workflow chạy xong, giống hệt giới hạn đã biết của `run_video_pipeline`.
- Một workflow treo vô hạn (vd chờ 1 phần tử không bao giờ xuất hiện) sẽ khiến tool này không bao giờ trả về — chưa có timeout ở tầng tool (giống `run_video_pipeline`, cũng chưa có).

## Related

- [ADR-0011](0011-run-video-pipeline-tool.md) — tiền lệ trực tiếp, để lại đúng giới hạn mà ADR này giải quyết
- [ADR-0012](0012-gemini-omni-provider-and-automation-generate-nodes.md) — lý do câu hỏi này nảy sinh (Automation vừa có node tạo ảnh/video, nhưng chưa chạy được)
