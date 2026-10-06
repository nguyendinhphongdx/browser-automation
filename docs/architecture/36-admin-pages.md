# Admin dashboard (server)

[← Về mục lục](../README.md)

`apps/server/src/app/admin/*` được chặn bởi `requireAdmin()` ([08-server.md](08-server.md)) — nhưng **không phải trang nào sau cổng chặn đó cũng có dữ liệu thật**.

| Trang | Dữ liệu |
|---|---|
| `dashboard` | Thật — query `prisma.user.count()`, `prisma.script.count()`, downloads tháng này... |
| `scripts` | Thật — `prisma.script.findMany()` kèm `author`/`reviews`, có nút duyệt/từ chối |
| `revenue` | Thật — tính trên `prisma.script.aggregate({ _sum: { downloads } })` (lưu ý: cùng giả định "mọi download = đã bán" như [29-marketplace-payment-flow.md](29-marketplace-payment-flow.md)) |
| `users` | **Stub tĩnh** — không có query `prisma` nào, hiện cứng dòng chữ "No users yet. Users will appear here after authentication is set up." |

## Trang `users` đang hiện thông báo sai sự thật

Dòng chữ "sau khi auth được set up" ngụ ý auth **chưa** xong — nhưng auth (NextAuth + JWT, [08-server.md](08-server.md)) đã hoạt động đầy đủ, và `User` model đã có data thật (mọi người dùng đăng ký/đăng nhập qua desktop app đều tạo 1 row `users`). Đây là dấu vết rõ ràng của 1 trang được tạo khung trước (scaffold lúc chưa có auth), rồi auth được hoàn thiện sau nhưng trang này không được cập nhật lại theo — không phải lỗi logic, chỉ là UI chưa viết nốt phần fetch danh sách user thật.

## Việc còn thiếu nếu muốn hoàn thiện `users`

Thay nội dung tĩnh bằng `prisma.user.findMany()` + hiển thị bảng (tên, email, role, ngày tạo), thêm thao tác đổi `role` (ví dụ nâng user lên `ADMIN`/`CREATOR`) — theo đúng pattern `scripts` page đã làm (query + action buttons trong 1 client component riêng, xem `script-actions.tsx`).
