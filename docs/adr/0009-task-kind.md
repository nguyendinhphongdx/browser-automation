# ADR-0009: Task có "kind" — AI chủ động chia nhỏ project thành việc đúng loại, đúng domain

🟢 Accepted

- **Date**: 2026-10-12
- **Status**: Accepted

## Context

`Task` (ADR-0004) không có cách nào thể hiện bản chất công việc (viết kịch bản khác tạo ảnh nhân vật khác dựng video khác automation), nên AI không có cơ sở để biết nên tự làm trực tiếp (văn bản) hay giao cho domain nào (`delegate_to_video_studio`/`delegate_to_automation`, ADR-0007) — khoảng trống đã ghi nhận từ ADR-0004 nhưng chưa làm.

Mục tiêu người dùng: "AI có thể giúp tôi chia thành nhiều việc, có việc thì tạo ảnh, tạo kịch bản, có việc thì automation, cái thì tạo video tuỳ loại." — AI cần chủ động phân rã 1 mục tiêu project lớn thành nhiều task, mỗi task gắn đúng loại, và biết dùng đúng domain cho từng loại khi thực hiện.

DB của người dùng đã có dữ liệu thật (project "Phim Doraemon", 2 task) — lần đầu tiên codebase cần thêm 1 cột vào bảng ĐÃ TỒN TẠI (`tasks`), không phải tạo bảng mới. Repo chưa có migration runner, chỉ có `CREATE TABLE IF NOT EXISTS` cộng dồn — cách đó không tự thêm cột vào DB cũ. Cần `ALTER TABLE` an toàn, chỉ chạy nếu cột chưa có.

## Decision

### Schema

`database/init.ts`: `CREATE TABLE IF NOT EXISTS tasks` (cài mới) thêm `kind TEXT NOT NULL DEFAULT 'other'`. Thêm đoạn kiểm tra + `ALTER TABLE` ngay sau (DB cũ):
```ts
const taskColumns = db.prepare("PRAGMA table_info(tasks)").all() as { name: string }[]
if (!taskColumns.some((c) => c.name === 'kind')) {
  db.exec("ALTER TABLE tasks ADD COLUMN kind TEXT NOT NULL DEFAULT 'other'")
}
```
Đã kiểm chứng trực tiếp trên bản sao DB thật của người dùng (project Doraemon, 2 task) — cả 2 project + 2 task giữ nguyên, task cũ tự nhận `kind='other'`, chạy lại lần 2 không lỗi (idempotent).

### Types + Service + Tool

`shared/types.ts`: `TaskKind = 'script' | 'image' | 'video' | 'automation' | 'other'`, `Task.kind`, `CreateTaskInput.kind?`/`UpdateTaskInput.kind?`. `project-service.ts`'s `rowToTask`/`createTask`/`updateTask` map/ghi cột `kind`. `create_task` tool (agent) nhận `kind` tuỳ chọn. `list_project_tasks`/`get_project_context` trả kèm `kind`.

### Instructions

`PROJECT_AGENT_INSTRUCTIONS` và `GENERAL_AGENT_INSTRUCTIONS` (`domains.ts`) thêm quy tắc: khi được giao 1 mục tiêu lớn, chủ động `create_task` nhiều lần theo đúng kind (script/image/video/automation/other). Domain 'project' (không có tool delegate) tự làm được script/other, báo người dùng mở đúng trang hoặc dùng trợ lý chung cho image/video/automation. Domain 'general' (có delegate_to_*) tự định tuyến đúng: image/video → `delegate_to_video_studio`, automation → `delegate_to_automation`.

### UI

`ProjectPage.tsx`: `TaskDialog` thêm `<select>` chọn kind; `TaskNode` thêm icon nhỏ theo kind cạnh status badge (`other` không hiện icon).

## Alternatives considered

| Option | Pros | Cons | Why not |
|---|---|---|---|
| Field workflowId/videoPipelineId ràng buộc trực tiếp | Liên kết chặt, bấm "Chạy" thẳng từ task | 1 task có thể cần nhiều cơ chế (kịch bản + ảnh + video) — field đơn lẻ không đủ | Không khớp nhu cầu thật (phân loại + định tuyến) |
| Suy luận kind từ title mỗi lần, không lưu field | Không đổi schema | Suy luận lại mỗi lần, không hiện icon ổn định, kết quả có thể khác nhau giữa các lần | Lưu field rẻ và ổn định hơn |
| Thêm cột `kind` (ALTER TABLE an toàn) + dạy AI phân rã + định tuyến (chosen) | Đúng mục tiêu, rẻ, AI có cơ sở rõ ràng | Lần đầu cần ALTER TABLE trong codebase này | Rủi ro giảm bằng kiểm tra tồn tại cột + đã test trên bản sao DB thật |

## Consequences

### Positive

- AI có cơ sở rõ ràng để tự phân rã 1 mục tiêu lớn thành nhiều task đúng loại, tự chọn đúng domain khi thực hiện.
- Không mất dữ liệu hiện có — đã kiểm chứng trên bản sao DB thật của người dùng.
- UI hiện loại việc ngay trên từng task.

### Negative

- `kind` chỉ là nhãn phân loại — không ép AI tuân theo khi thực hiện, không có ràng buộc cứng ở tầng code.
- ALTER TABLE đầu tiên trong codebase — nếu cần thêm cột khác cho bảng cũ sau này, nên cân nhắc 1 cơ chế migration rõ ràng hơn.

## Related

- [ADR-0004](0004-project-task-production-tracking.md), [ADR-0007](0007-agent-orchestration.md)
