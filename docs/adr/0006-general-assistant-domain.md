# ADR-0006: Trợ lý chung (domain 'general') — mount ở Layout, điểm mở cho điều phối sau này

🟢 Accepted

- **Date**: 2026-10-11
- **Status**: Accepted

## Context

Sau ADR-0005, AI chat chỉ gắn vào 3 trang cụ thể (Automation/Video Studio/Project) — các trang còn lại (Profiles, Campaigns, Resources, Library, Settings) không có AI nào, và không có cách nào hỏi AI 1 việc "chung" (vd quản lý Thư viện, tạo/tra project) mà không phải mở đúng 1 trong 3 trang đó.

Người dùng xác nhận: vẫn nên có 1 "trợ lý chung", và gợi mở hướng tương lai — trợ lý chung có thể **điều phối** (gọi tới) các trợ lý riêng theo domain. Điều phối (delegate sang 1 domain khác, kiểu sub-agent) là việc lớn (gọi lồng `agentService.run()`, cần xác định trang/canvas nào để giao việc) và người dùng tự nói "có thể sau này" — **không làm ở bước này**, chỉ đảm bảo thiết kế domain 'general' không chặn đường mở rộng đó sau.

## Decision

### Domain mới `'general'` — tái dùng tối đa, chỉ thêm đúng 1 tool mới

Mirror đúng khuôn domain 'project' (ADR-0005's `buildProjectToolset`), vì mọi tool Project/Task + tool thư viện đều nhận id qua tham số tool (không qua `AgentToolContext`), nên gọi được từ bất kỳ đâu, không cần biết "đang ở trang nào":

```ts
// tools/registry.ts
export function buildGeneralToolset(ctx: AgentToolContext): ToolSet {
  return {
    ...buildProjectToolset(ctx),
    list_projects: createListProjectsTool(ctx)
  }
}
```

Chỉ 1 tool mới: `agent/tools/list-projects.ts` — mirror `list-project-tasks.ts`, wrap `getAllProjects()` (đã có, `project-service.ts`). Cần vì trợ lý chung không có `projectId` sẵn như trang Project — phải tự tra "đang có project nào" trước khi gọi `get_project_context(projectId)`.

Không thêm `list_workflows`/`list_campaigns`/`list_pipelines` ở bước này — đó là việc của hướng "điều phối" sau này (trợ lý chung không tự quản lý canvas của domain khác, sẽ GIAO việc đó cho trợ lý domain tương ứng qua 1 tool `delegate_to_*` trong tương lai, không tự có tool đọc canvas riêng của từng domain).

`domains.ts`: `AgentDomain` thêm `'general'`; entry mới `general: { instructions: GENERAL_AGENT_INSTRUCTIONS, buildToolset: buildGeneralToolset, approvalGatedTools: ['delete_resource'] }`. `GENERAL_AGENT_INSTRUCTIONS` dạy gọi `list_projects` trước khi cần `get_project_context` nếu chưa biết id, quản lý Thư viện/Project từ bất kỳ đâu, và nói rõ giới hạn hiện tại: không thấy/sửa được workflow đang mở ở Automation hay pipeline ở Video Studio — việc đó phải mở đúng trang đó (đúng tinh thần ADR-0003: ghi rõ giới hạn đã biết trước, không giấu).

`agent-handlers.ts`: thêm nhánh thứ 4 `domain === 'general'` — `threadId = 'general'`, `toolContext` rỗng/inert giống nhánh `'project'`.

### UI — mount ở `Layout.tsx`, không phải 1 trang riêng

`Layout.tsx`'s `<main>` thêm `relative` để `AgentChatPanel`'s `Drawer` neo đúng vào đây. Thêm 1 nút nổi (`absolute bottom-5 right-5`, icon `Sparkles`) mở/đóng, mount `<AgentChatPanel domain="general" buildRunContext={() => ({})} .../>` — tái dùng 100% component/hook đã gộp ở ADR-0005, không viết thêm gì mới ở lớp UI. Nút nổi hiện ở mọi trang, độc lập với nút AI riêng từng trang (Automation/Video Studio/Project vẫn giữ nguyên).

## Alternatives considered

| Option | Pros | Cons | Why not |
|---|---|---|---|
| Làm orchestration (điều phối sang domain khác) ngay | Giải quyết đúng tầm nhìn cuối | Phức tạp nhiều (nested run, chọn context/trang đích), người dùng tự nói "sau này" | Chưa cần, rủi ro over-engineer trước khi rõ use-case thật |
| Trợ lý chung có TOÀN BỘ tool mọi domain (gộp hết) | 1 chỗ làm được mọi thứ | Đúng cái đã bác bỏ ở ADR-0005 (AI chọn tool kém hơn, tool không liên quan hiện ra) | Mâu thuẫn quyết định trước |
| Domain 'general' = library+project tools (đã có) + 1 tool mới, mount ở Layout (chosen) | Tái dùng ~95%, rõ giới hạn, không chặn đường orchestration sau | Chưa "thấy" được workflow/pipeline — giới hạn thật, phải nói rõ | — |

## Consequences

### Positive

- Trợ lý chung dùng được ở MỌI trang (kể cả Profiles/Campaigns/Resources/Settings vốn chưa có AI nào) mà gần như không viết code mới.
- Không chặn hướng orchestration sau này — `buildGeneralToolset` chỉ cần thêm tool `delegate_to_*` khi làm tới, không phải đổi cấu trúc domain.

### Negative

- Trợ lý chung không thấy được state canvas của Automation/Video Studio — giới hạn thật, ghi rõ trong instructions + description, không che giấu.
- 2 domain ('project' và 'general') có toolset gần giống nhau — trùng lặp nhỏ, chấp nhận được vì rẻ hơn tách interface riêng cho khác biệt 1 tool.

## Related

- [ADR-0004](0004-project-task-production-tracking.md) — nguồn tool Project/Task được tái dùng ở `buildGeneralToolset`
- [ADR-0005](0005-unified-agent-domain-registry.md) — domain registry + component/hook dùng chung mà domain 'general' build trên đó
- [ADR-0003](0003-video-studio-fanin-join-assumes-no-conditional-nodes.md) — tiền lệ ghi rõ giới hạn đã biết trước thay vì giấu đi

## Future: điều phối sang domain khác

Khi làm orchestration, phương án khả thi: thêm tool `delegate_to_automation`/`delegate_to_video_studio`/`delegate_to_project` vào `buildGeneralToolset` — mỗi tool nhận 1 mô tả việc cần làm (+ id trang đích nếu cần, vd `workflowId`/`projectId`), tự gọi `agentService.run()` lồng cho domain đích với toolset/instructions của domain đó, rồi trả lại text tổng hợp cho trợ lý chung. Không cần đổi cấu trúc `AGENT_DOMAINS`/`AgentChatPanel` hiện tại — chỉ thêm tool mới.
