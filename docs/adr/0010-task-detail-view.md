# ADR-0010: Task Detail — mở chi tiết task kiểu Jira (mô tả, đính kèm, output, comment)

🟢 Accepted

- **Date**: 2026-10-12
- **Status**: Accepted

## Context

Task hiện chỉ hiện inline trong cây (title + status + kind icon), sửa qua 1 dialog nhỏ (tên/thứ tự/ghi chú/output folder) — không có "trang chi tiết" riêng. Người dùng muốn bấm vào 1 task để mở chi tiết, giống Jira: mô tả, đính kèm (file tham chiếu), output (kết quả), và 1 luồng comment theo thời gian — vẫn nằm trong project đó, không phải 1 khái niệm tách rời.

Đã chốt qua trao đổi:
- Mô tả = dùng lại đúng field "Ghi chú" (notes) hiện có, chỉ chuyển vào màn chi tiết + đổi nhãn — không thêm cột.
- Đính kèm = vừa chọn tài nguyên có sẵn trong Thư viện, vừa upload file mới trực tiếp từ màn chi tiết — tái dùng `ResourcePicker` + `uploadLibraryResource` (đã có) — không viết lại upload.
- Output = chính nội dung thư mục `outputFolderId` (hoặc gốc project nếu trống) đã có sẵn — không phải khái niệm mới, chỉ cần hiện lên trong màn chi tiết.
- Comment = danh sách nhiều comment theo thời gian, không ghi đè — cần 1 bảng mới `task_comments`.

## Decision

### Schema — 2 bảng mới

```sql
CREATE TABLE IF NOT EXISTS task_attachments (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (task_id, resource_id)
);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON task_attachments(task_id);

CREATE TABLE IF NOT EXISTS task_comments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author TEXT NOT NULL DEFAULT 'user',
  text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);
```
`task_attachments` là bảng nối N-N — không dùng lại provenance `resources.objectType/objectId` (quan hệ 1-1, đúng cho output, không đúng cho đính kèm dùng chung nhiều task).

### Service, IPC, store

`project-service.ts` thêm `getTaskAttachments`/`attachResourceToTask`/`detachResourceFromTask`/`getTaskComments`/`addTaskComment`/`deleteTaskComment`. `project-handlers.ts`/`preload.ts` thêm 6 kênh passthrough tương ứng. `project-store.ts` thêm state + action, refetch đúng list sau mỗi mutation.

### UI

`TaskDetailDrawer` mới (tái dùng `Drawer`), mở khi bấm title 1 task: Mô tả (textarea bind `notes`, nút Lưu — mirror `ProjectNotebook`), Đính kèm (lưới `LibraryGridCard` + "Chọn từ Thư viện"/`ResourcePicker` + "Tải lên"/`uploadLibraryResource` + nút gỡ không xoá resource gốc), Output (chỉ xem, `getLibraryChildren` trên `outputFolderId` hoặc gốc project), Comment (danh sách cũ→mới + ô nhập + Gửi).

Không thêm tool AI cho attachments/comments ở bước này — ngoài phạm vi yêu cầu.

## Alternatives considered

| Option | Pros | Cons | Why not |
|---|---|---|---|
| Dùng provenance objectType/objectId cho đính kèm | Không thêm bảng | Quan hệ 1-1, không cho dùng chung nhiều task | Sai ngữ nghĩa |
| Comment là 1 field ghi đè | Không cần bảng mới | Mất lịch sử | Người dùng chọn rõ nhiều comment theo thời gian |
| 2 bảng mới + Drawer tái dùng tối đa hạ tầng có sẵn (chosen) | Đúng mô hình Jira, tái dùng ~90% | Thêm 2 bảng + nhiều wiring | Khối lượng tương xứng tính năng thật |

## Consequences

### Positive

- Task có màn chi tiết đầy đủ kiểu Jira, tái dùng gần hết hạ tầng đã có.
- `task_attachments` đúng ngữ nghĩa N-N.

### Negative

- Thêm 2 bảng mới — rủi ro thấp hơn ADR-0009 (bảng mới, không ALTER bảng cũ).
- Chưa có tool AI cho attachments/comments — làm thêm sau nếu cần.

## Related

- [ADR-0004](0004-project-task-production-tracking.md), [ADR-0009](0009-task-kind.md)
