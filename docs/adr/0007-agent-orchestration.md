# ADR-0007: Điều phối — trợ lý chung giao việc cho trợ lý domain khác

🟢 Accepted

- **Date**: 2026-10-11
- **Status**: Accepted

## Context

ADR-0006 xây trợ lý chung (`'general'`) nhưng khoanh vùng rõ: không thấy/sửa được workflow (Automation) hay pipeline (Video Studio) đang mở, vì các domain đó gắn với canvas SỐNG trong renderer (state trong store, chỉ ghi DB khi người dùng bấm "Lưu"), còn trợ lý chung chạy ở `Layout.tsx`, không có trang nào đang mở.

Người dùng xác nhận muốn làm điều phối (orchestration) tới cả 3 domain ngay, và đồng ý đánh đổi: lấy workflow/pipeline theo bản ĐÃ LƯU trong DB (không cần trang đó đang mở), và patch AI đề xuất lưu thẳng vào DB từ main process — bỏ qua bước re-validate 2 lớp hiện có ở renderer (ADR này chỉ áp dụng cho đường điều phối mới, không đụng tới luồng propose_workflow_change/propose_video_pipeline_change bình thường khi trang đó đang mở — luồng đó giữ nguyên y như ADR-0005).

Khảo sát xác nhận: `applyWorkflowPatch`/`applyVideoPipelinePatch` (lúc đó ở `renderer/pages/.../agent/`) là hàm thuần (không đụng DOM/React, chỉ nhận/trả data) — an toàn chuyển vào `shared/` để main process dùng lại nguyên bản, không viết trùng. `workflow-service.ts`/`video-pipeline-service.ts` đã có `getWorkflowById`/`updateWorkflow`/`getVideoPipelineById`/`updateVideoPipeline` — đúng primitive "đọc + ghi thẳng DB" cần dùng.

## Decision

### Chuyển 2 hàm apply-patch thuần vào `shared/` — dùng lại, không viết trùng

`apply-workflow-patch.ts` → `shared/agent/apply-workflow-patch.ts`, `apply-video-pipeline-patch.ts` → `shared/video-studio/apply-video-pipeline-patch.ts` — nguyên văn, chỉ sửa đường import. `AutomationPage.tsx`/`VideoStudioCanvas.tsx` đổi theo.

### `AgentService.runSubAgent()` — chạy 1 agent con, không stream UI, tự auto-deny approval

Tái dùng nguyên `run()` hiện có, chỉ khác `emit` truyền vào: gom `TEXT_MESSAGE_CONTENT` thành text trả về; theo dõi `TOOL_CALL_RESULT` để gọi `onToolResult(toolName, resultText, ok)` (đúng shape `useAgentRun`'s `onToolResult` — cùng triết lý ADR-0005); gặp CUSTOM `tool-approval-request` thì tự `resolveApproval({approved: false})` ngay — sub-agent không có người để duyệt, mặc định từ chối (an toàn hơn tự chấp). Không forward event nào ra `agent:event` của renderer.

### 3 tool `delegate_to_automation`/`delegate_to_video_studio`/`delegate_to_project` — chỉ thêm vào `buildGeneralToolset`

`delegate_to_automation({workflowId, task})`: đọc workflow từ DB → dựng `AgentToolContext` inert + snapshot từ DB → `runSubAgent('automation', ...)` với `onToolResult` bắt tool propose_* → `applyWorkflowPatch` → nếu hợp lệ, `updateWorkflow()` ghi thẳng DB. `delegate_to_video_studio` mirror y hệt. `delegate_to_project` đơn giản hơn — tool Project/Task tự ghi DB ngay, không cần bước patch riêng.

2 tool tra cứu: `list_workflows`, `list_pipelines` (mirror `list_projects`).

### Gating + instructions

`general.approvalGatedTools` thêm `delegate_to_automation`/`delegate_to_video_studio` (ghi thẳng DB, bỏ qua re-validate renderer — rủi ro cao hơn tool thường). Không gate `delegate_to_project`. `GENERAL_AGENT_INSTRUCTIONS` nói rõ giới hạn mới: sub-agent sửa trên bản ĐÃ LƯU, không phải canvas đang mở — có thể bị đè nếu trang đó đang có thay đổi chưa lưu; sub-agent không làm được việc cần duyệt.

## Alternatives considered

| Option | Pros | Cons | Why not |
|---|---|---|---|
| Chỉ chạy khi trang đích đang mở (bơm qua IPC tới đúng runId renderer) | Dùng đúng re-validate 2 lớp sẵn có | Trợ lý chung không biết trang nào đang mở ở máy người dùng — phức tạp, ràng buộc ngược | Người dùng đã chọn đánh đổi đi DB thẳng |
| Sub-agent forward mọi event ra UI để hiện lồng nhau | Thấy chi tiết sub-agent đang làm gì | Phức tạp UI, không cần cho v1 | Giữ tối giản — chỉ cần text kết quả cuối |
| runSubAgent auto-approve mọi tool cần duyệt | Không bị chặn giữa đường | Không ai duyệt thật — nguy hiểm nếu gọi delete_resource | Mặc định an toàn hơn: tự chối |
| Patch persist thẳng DB qua apply-patch chuyển vào shared/, 3 tool delegate_to_*, auto-deny approval (chosen) | Tái dùng ~95% code có sẵn, rủi ro bypass được bù bằng approval-gate | Vẫn có rủi ro race nếu trang đích đang mở cùng lúc | — |

## Consequences

### Positive

- Trợ lý chung giao được việc thật cho Automation/Video Studio mà không cần trang đó đang mở.
- Không viết trùng logic validate/apply patch — cả renderer và main dùng 1 bản ở `shared/`.
- Rủi ro bypass renderer được bù bằng approval-gate cho đúng 2 tool "ghi DB", không gate tràn lan.

### Negative

- Race điều kiện thật: trang đích đang mở với thay đổi chưa lưu → delegate ghi đè bản DB, mất thay đổi của 1 bên khi Lưu — đã ghi rõ trong instructions, chưa có cơ chế phát hiện/khoá.
- `runSubAgent` auto-deny mọi approval — sub-agent không làm được việc cần duyệt dù task yêu cầu, phải báo lại người dùng tự làm.

## Related

- [ADR-0005](0005-unified-agent-domain-registry.md) — domain registry + `onToolResult` pattern mà `runSubAgent` tái dùng
- [ADR-0006](0006-general-assistant-domain.md) — trợ lý chung, nơi 3 tool delegate được gắn vào
