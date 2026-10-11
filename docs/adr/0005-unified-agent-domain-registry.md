# ADR-0005: Unified AI Agent — domain registry (tools/instructions/config) thay cho trùng lặp theo module

🟢 Accepted

- **Date**: 2026-10-11
- **Status**: Accepted

## Context

AI chat chỉ gắn vào đúng 2 màn (Automation, Video Studio), mỗi màn là 1 bộ code riêng gần như sao chép nhau: `agent-service.ts` có 2 hằng instructions (`AGENT_INSTRUCTIONS`/`VIDEO_AGENT_INSTRUCTIONS`) + ternary chọn toolset theo `domain`, `agent-handlers.ts` có 2 nhánh gần như trùng để build `AgentToolContext`. Frontend có 2 component gần như sao y nhau (`AgentChatPanel.tsx` 314 dòng vs `VideoAgentChatPanel.tsx` 144 dòng) và 2 hook (`use-agent-run.ts`/`useVideoAgentRun.ts`) cùng cấu trúc `reduceEvent`.

Khi thêm Project/Task (ADR-0004) đã có 7 tool AI cho domain 'project' nhưng không có màn nào để chat trực tiếp — thêm domain mới theo cách cũ nghĩa là copy thêm 1 bộ component/hook/instructions nữa, không scale.

Khảo sát phát hiện 1 lỗi thật đã có sẵn: `buildVideoToolset` có `delete_resource` (tool nằm trong `APPROVAL_GATED_TOOLS`), nhưng `VideoAgentChatPanel`/`useVideoAgentRun` không xử lý case `tool-approval-request` ở CUSTOM event (comment giải thích "domain này không tool nào cần duyệt" — đúng khi viết, lệch sau khi `delete_resource` được thêm vào). Hậu quả: AI ở Video Studio gọi `delete_resource` sẽ treo vô thời hạn chờ 1 approval mà UI không có cách hiển thị/trả lời.

Quyết định theo hướng người dùng chốt: tách **tool + instructions + config agent** theo domain, nhưng **UI/luồng chat dùng chung 1 component + 1 hook**.

## Decision

### 1. Backend — domain registry

File mới `main/agent/domains.ts` — `AGENT_DOMAINS: Record<AgentDomain, { instructions, buildToolset, approvalGatedTools }>` với `AgentDomain = 'automation' | 'video-studio' | 'project'`. `AGENT_INSTRUCTIONS`/`VIDEO_AGENT_INSTRUCTIONS` di chuyển nguyên văn từ `agent-service.ts` sang đây; thêm `PROJECT_AGENT_INSTRUCTIONS` mới (dạy gọi `get_project_context` đầu tiên, dùng các tool task/notebook, cú pháp `[resource:id "name"]`).

`tools/registry.ts`: `buildToolset` đổi tên `buildAutomationToolset`; thêm `buildProjectToolset` mới — mirror bộ tool thư viện của `buildVideoToolset` + 7 tool Project/Task đã có ở ADR-0004 (không thêm tool mới). `APPROVAL_GATED_TOOLS` (1 danh sách dùng chung) tách thành 3 danh sách theo domain: automation giữ 4 tool hiện tại, video-studio và project chỉ `['delete_resource']` — hiệu lực thực tế không đổi, chỉ làm rõ ràng + đúng theo domain.

`agent-service.ts`'s `run()` dùng `AGENT_DOMAINS[domain]` để lấy cả 3 thứ (tools/instructions/toolApproval), xoá ternary + 2 hằng cũ. `agent-handlers.ts` thêm nhánh thứ 3 cho `'project'` — `toolContext` rỗng/inert vì 7 tool Project/Task + tool thư viện không đọc `ctx` (đã xác nhận mọi tool ADR-0004 đều comment "ctx unused"). `preload.ts`'s `runAgent` payload thêm `'project'` vào domain union + `projectId?`.

### 2. Frontend — 1 component + 1 hook dùng chung

Hợp nhất vào `renderer/components/agent/`: `AgentChatPanel.tsx`, `use-agent-run.ts` (di chuyển `use-browser-preview.ts` + `Drawer.tsx` vào đây nguyên trạng — cả 2 đã generic sẵn).

Hook `useAgentRun({ domain, buildRunContext, onToolResult })` — thay cơ chế đặc thù cũ (`WORKFLOW_PATCH_TOOLS` set cứng, `onWorkflowPatch`/`onPipelinePatch`/`onBrowserLifecycle` riêng biệt) bằng 1 callback tổng quát `onToolResult(toolName, resultText, ok)` — mỗi trang tự pattern-match tên tool nó quan tâm. `AgentUIItem` hợp nhất đủ kind (`user-message/text/reasoning/tool/approval/screenshot/resource-preview`).

Component `AgentChatPanel` LUÔN hỗ trợ approval card + `respondApproval` (tránh lặp lại lỗi treo), bypass-approval toggle (key localStorage riêng theo domain), resource-attach (`ResourcePicker`/`AttachmentChip`), dùng `Drawer` thay `<div>` trần. `profileId` optional (có mới mount browser preview). Cấu hình hiển thị (`title/icon/description/suggestions/placeholder`) truyền qua props từ trang gọi.

Mỗi trang giữ phần patch-validator riêng (`apply-workflow-patch.ts`/`apply-video-pipeline-patch.ts` không đổi vị trí). `ProjectPage.tsx` mount domain `'project'` mới — `onToolResult` refetch project/task store sau khi AI sửa dữ liệu.

## Alternatives considered

| Option | Pros | Cons | Why not |
|---|---|---|---|
| Copy thêm 1 bộ component/hook/instructions cho domain 'project' | Không đụng code cũ | Nhân bản lỗi approval-treo sang domain mới, càng thêm domain càng phình | Chính là vấn đề cần giải quyết |
| 1 AI toàn app, 1 toolset khổng lồ dùng mọi nơi | Code ít nhất | AI chọn sai tool nhiều hơn, tool không liên quan hiện ra ở màn không cần, mất khả năng tối ưu instructions riêng | Người dùng chốt hướng ngược lại |
| Tách domain (tool/instructions/config) + UI/hook dùng chung (chosen) | Thêm domain mới chỉ cần 1 entry registry + mount 1 component; sửa luôn lỗi approval-treo | Cần 1 lần refactor động tới 2 màn đang chạy ổn | — |

## Consequences

### Positive

- Thêm domain AI mới chỉ còn: 1 entry `AGENT_DOMAINS` + mount `<AgentChatPanel domain="..." />` — không copy ~450 dòng.
- Sửa lỗi thật: domain nào cũng có approval UI, không còn treo vô thời hạn.
- Project có AI chat ngay tại trang của nó.

### Negative

- Đổi cấu trúc 2 màn đang chạy ổn — cần test kỹ cả 2 trước khi xoá file cũ.
- `onToolResult` tổng quát đẩy "biết tool nào làm gì" ra trang gọi — không có ràng buộc compile-time giữa tên tool thật và string match ở trang, dễ lỗi chính tả.

### Trade-off

- Không làm 1 AI-toàn-app, đổi lại nhiều điểm mount hơn (mỗi trang cần 1 nút AI + vài dòng wiring) — rẻ hơn cái giá phải trả khi AI chọn sai tool trong 1 toolset khổng lồ.

## Related

- [ADR-0004](0004-project-task-production-tracking.md) — nguồn của domain 'project' và 7 tool được gom vào `buildProjectToolset`
- [docs/conventions/00-tong-quan.md](../conventions/00-tong-quan.md) — decision ladder, pattern Registry
