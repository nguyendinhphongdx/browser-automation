---
name: arch-check
description: Kiểm tra 1 domain/feature/file MỚI nên đặt ở đâu, theo pattern gì — hoặc kiểm tra 1 diff đã viết có phá domain boundary/components-pages/Window.api rule không — theo docs/conventions/. Dùng TRƯỚC khi code 1 node/provider/tool/trang mới, hoặc trước khi commit 1 thay đổi chạm main/ hay renderer/.
---

# arch-check — Áp convention đích lúc code thật

Khác `docs-read`/`docs-write`/`adr-write` (quản lý cây docs) — skill này dùng **lúc viết code**, biến [docs/conventions/](../../../docs/conventions/) thành quyết định cụ thể cho 1 thay đổi thật.

## Mode 1 — TRƯỚC KHI CODE: "cái này nên đặt ở đâu?"

1. Đọc [conventions/00-tong-quan.md](../../../docs/conventions/00-tong-quan.md) — xác định việc đang làm khớp pattern nào trong bảng (Registry/Strategy/Template Method/Facade/Adapter/Two-gate validation), hay là domain thuần CRUD không cần pattern gì đặc biệt.
2. Map vào cây thư mục đích:
   - Thêm 1 loại node/provider/tool vào domain **đã có** → thêm 1 file + 1 dòng trong `registry.ts` của domain đó (xem [01](../../../docs/conventions/01-main-process-layering.md)). KHÔNG sửa `engine.ts`/dispatcher.
   - Domain **hoàn toàn mới**:
     - Thuần CRUD (không có canvas/execution riêng) → chỉ cần 1 file `main/services/<domain>-service.ts`.
     - Có orchestration/execution riêng (có canvas, nhiều "loại" chọn theo tên) → tạo `main/<domain>/` theo đúng cây ở [01](../../../docs/conventions/01-main-process-layering.md) (`engine.ts`, `nodes/{base-node,registry}.ts`, `providers/` nếu gọi API ngoài).
   - Trang/component renderer mới → [02](../../../docs/conventions/02-renderer-layering.md): feature-specific vào `pages/<feature>/`; nếu CÓ KHẢ NĂNG dùng ở ≥ 2 feature (dù chưa dùng ngay) → đặt thẳng `components/<domain>/` từ đầu, đừng đợi phát hiện lỗi mới `git mv`.
3. Nếu cần import từ 1 domain khác → chỉ qua `services/<domain>-service.ts` của domain đó (xem [03](../../../docs/conventions/03-domain-boundaries.md)). Cần import file nội bộ (node class, provider cụ thể) của domain khác → dấu hiệu sai, dừng lại hỏi lại thiết kế.
4. Nếu cần thêm method mới gọi từ renderer → thêm vào interface `<Domain>API` của đúng domain đó (không thêm vào block `Window.api` cũ trong `profile-store.ts`) — xem [04](../../../docs/conventions/04-window-api-contract.md) + [ADR-0001](../../../docs/adr/0001-window-api-composition.md).
5. Tìm 1 **reference template** gần nhất trong bảng ở `00-tong-quan.md` — đọc file đó trước khi viết file mới theo đúng hình dạng.

## Mode 2 — SAU KHI CODE / trước commit: kiểm tra diff có phá rule không

Checklist (tick từng dòng với diff thật đang có):

- [ ] File main-process mới có nằm đúng cây ở [01](../../../docs/conventions/01-main-process-layering.md) không (service/ipc/`<domain>/`)?
- [ ] Có import nào từ `main/` đi thẳng vào file nội bộ (`nodes/`, `providers/`) của 1 domain KHÁC không — nếu có, sửa về import qua `services/*-service.ts` ([03](../../../docs/conventions/03-domain-boundaries.md)).
- [ ] Có file nào trong `renderer/components/` import từ `renderer/pages/` không — nếu có, đảo hướng hoặc di chuyển file ([02](../../../docs/conventions/02-renderer-layering.md)).
- [ ] Có thêm method mới vào block `Window.api` cũ (`profile-store.ts`) thay vì vào `<Domain>API` riêng không ([04](../../../docs/conventions/04-window-api-contract.md))?
- [ ] Thêm 1 loại mới (node/provider/tool) có phải sửa `engine.ts`/dispatcher chung không — nếu có, vi phạm Open/Closed, xem lại cách đăng ký qua `registry.ts`.

## Khi tìm thấy vi phạm

- Vi phạm trên code **MỚI vừa viết trong chính thay đổi đang làm** → sửa luôn trước khi coi là xong.
- Vi phạm trên code **cũ, không liên quan trực tiếp tới thay đổi đang làm** → KHÔNG tự sửa "tiện thể" (xem `AGENTS.md` Quy tắc cứng #2) — nêu rõ cho user, để họ quyết có refactor ngay không.
- Vi phạm là 1 quyết định không-obvious mới phát sinh (vd phải phá rule vì lý do kỹ thuật thật) → gợi ý chạy skill `adr-write` trước khi code lệch convention.

## Anti-pattern

- ❌ Chạy mode 2 xong thấy vi phạm cũ rồi tự refactor luôn "vì đang sửa gần đó" — không phải scope của thay đổi đang làm.
- ❌ Bỏ qua bước tìm reference template ở Mode 1 bước 5 — code mới dễ lệch hình dạng nếu không soi theo 1 file thật đã đúng convention.
