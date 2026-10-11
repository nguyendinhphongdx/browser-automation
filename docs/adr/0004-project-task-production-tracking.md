# ADR-0004: Project & Task — lớp theo dõi tiến độ phủ trên Resource Library

🟢 Accepted

- **Date**: 2026-10-11
- **Status**: Accepted

## Context

Người dùng đang dựng các sản phẩm dài hơi (vd 1 bộ phim hoạt hình nhiều tập), kết hợp Video Studio (dựng từng tập), Automation (crawl/tải tài nguyên), và Resource Library (lưu trữ) — nhưng hiện không có lớp nào gom chúng lại theo 1 dự án và theo dõi tiến độ. Quan trọng hơn: AI khi dựng tập N cần biết ngữ cảnh các tập trước (kịch bản, nhân vật, văn phong) để giữ mạch nhất quán — hiện không có cơ chế nào cho việc này.

Quyết định đã chốt qua trao đổi trực tiếp với người dùng (không suy diễn):
- Tiến độ/trạng thái là bắt buộc, Task có thể lồng nhau (Task cha chứa Task con).
- 1 Project luôn gắn với đúng 1 folder trong Thư viện — không tạo hệ lưu trữ song song.
- Không ép cây thư mục con cố định — mỗi Task tự chọn nơi lưu output qua 1 dialog chọn/tạo thư mục.
- "Ngữ cảnh gốc" phải dynamic — không phải 1 file tĩnh dễ lệch thực tế.

## Decision

### Domain mới `projects`/`tasks` — mirror pattern Campaign + resources đã có

Schema (`database/init.ts`), theo khuôn `campaigns`/`campaign_runs`:

```sql
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT DEFAULT '',
  library_folder_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  notebook_resource_id TEXT REFERENCES resources(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo',            -- 'todo' | 'in-progress' | 'done'
  parent_task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,  -- cây lồng nhau
  sequence INTEGER NOT NULL DEFAULT 0,             -- thứ tự (tập 1, 2, 3...)
  output_folder_id TEXT REFERENCES resources(id) ON DELETE SET NULL,  -- bỏ trống = gốc project
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id);
```

`parent_task_id` dùng `ON DELETE SET NULL` + cycle-guard tái dùng Y HỆT `library-service.ts`'s `isDescendantOf(id, candidateAncestorId, lookup)` — áp khi đổi `parentTaskId`.

Output của Task KHÔNG có cột riêng trỏ tới resource — dùng đúng cơ chế provenance polymorphic đã có: resource tạo ra gắn `objectType: 'task', objectId: <task.id>`. Thêm `'task'` vào `LibraryResourceObjectType` — 1 dòng, không đổi schema `resources`.

Service `main/services/project-service.ts` mirror `campaign-service.ts`. `createProject` tự gọi `createFolder()` (đã có) sinh folder gốc. IPC `main/ipc/project-handlers.ts` (file riêng, mirror `video-studio-handlers.ts`). Preload thêm block `// Project`.

### "Ngữ cảnh gốc" là tool động, không phải file tĩnh

Tool `get_project_context(projectId)` (cả automation + video-studio): đọc "sổ tay dự án" (`notebook_resource_id`) + quét SỐNG cây thư mục (`getChildren`, giới hạn độ sâu ~3-4 cấp) + danh sách Task + trạng thái — luôn đúng hiện trạng, không có file map riêng để lệch. AI luôn gọi tool này đầu tiên trước khi làm task trong 1 project (ghi vào `AGENT_INSTRUCTIONS`/`VIDEO_AGENT_INSTRUCTIONS`).

Tool `update_project_notebook(projectId, content)` — AI tự ghi/tóm tắt thêm vào sổ tay sau khi xong 1 tập, không dán nguyên văn (không phình theo số tập).

### Tool quản lý cho AI

`create_project`, `create_task` (có `outputFolderId` tuỳ chọn), `update_task_status`, `list_project_tasks`, `move_task` (cycle-guard), `delete_task`.

### UI

`ProjectPage.tsx` mirror `CampaignPage.tsx` (2 cột, `activeProject` quyết định empty-state/chi tiết). Field `outputFolderId` dùng ĐÚNG `ResourcePicker` (`filterKind: 'folder'`) + nút "Chọn thư mục này" đã có — không viết lại UI chọn folder. Store `project-store.ts` mirror `campaign-store.ts`.

## Alternatives considered

| Option | Pros | Cons | Why not |
|---|---|---|---|
| Task = 1 resource trong Thư viện, trạng thái nhét vào tag/notes | Không thêm bảng DB | Không query được tiến độ thật, dễ vỡ quy ước | Không đáp ứng yêu cầu có tiến độ thật |
| Hệ lưu trữ/versioning riêng cho Project, tách khỏi Thư viện | Kiểm soát trọn vẹn | Trùng lặp hạ tầng Thư viện đã xây | Vi phạm decision ladder (YAGN) |
| "Ngữ cảnh gốc" là file map tĩnh, cập nhật thủ công | Đơn giản, đọc 1 lần | Dễ lệch thực tế (cùng lớp lỗi với Window.api cũ, xem ADR-0002) | Người dùng yêu cầu rõ "dynamic" |
| Project/Task domain + folder Thư viện gắn kết + context tool động (chosen) | Tái dùng ~90% hạ tầng có sẵn, tiến độ query được, ngữ cảnh luôn đúng | Vẫn là domain mới hoàn toàn | — |

## Consequences

### Positive

- Tái dùng gần như toàn bộ: `createFolder`, `getChildren`, `isDescendantOf`, `ResourcePicker`, provenance `objectType`/`objectId`, pattern Campaign cho DB/service/store.
- AI có đúng 1 điểm vào (`get_project_context`) để định hướng toàn bộ project.
- Tiến độ theo dõi được thật sự (trạng thái, cây Task), không chỉ quy ước ngầm.

### Negative

- Domain hoàn toàn mới — nhiều file (bảng DB, service, IPC, types, store, 1 trang UI, ~6 tool AI).
- Quét cây thư mục sống trong `get_project_context` có thể chậm/dài với project nhiều resource — cần giới hạn độ sâu/số lượng, chấp nhận là giới hạn đã biết trước.
- Task không ràng buộc trực tiếp với pipeline/workflow tạo ra nó, chỉ ràng buộc với resource kết quả qua provenance — chấp nhận cho v1.

### Trade-off

- Không ép cây thư mục con cố định đổi lấy việc AI phải gọi `get_project_context` mỗi lần để biết cấu trúc THẬT — nhiều tool call hơn, nhưng đúng yêu cầu "dynamic".

## Related

- [docs/conventions/00-tong-quan.md](../conventions/00-tong-quan.md) — decision ladder, pattern Registry/provenance
- [ADR-0002](0002-window-api-derive-from-preload.md) — lý do tránh "file tĩnh dễ lệch thực tế" tái xuất hiện ở đây
- [ADR-0003](0003-video-studio-fanin-join-assumes-no-conditional-nodes.md) — tiền lệ ghi rõ giả định/giới hạn đã biết trước thay vì giấu đi
