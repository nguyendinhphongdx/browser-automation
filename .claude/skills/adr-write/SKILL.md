---
name: adr-write
description: Viết 1 Architecture Decision Record (ADR) theo format Michael Nygard vào docs/adr/. Dùng khi cần ghi lại 1 quyết định kiến trúc không-obvious (có alternative đã cân nhắc) — đổi layering, thêm lib core, đổi pattern, hoặc user chạy "viết ADR cho X".
---

# adr-write — Architecture Decision Record

## Khi dùng

- Quyết định ảnh hưởng layering/pattern/boundary đã nêu trong [docs/conventions/](../../../docs/conventions/), hoặc đổi lib core, hoặc security/deployment.
- Quyết định mà người đọc tương lai (hoặc agent khác) cần biết **vì sao** chọn vậy, không chỉ chọn gì — đặc biệt nếu có 1 hướng đã THỬ VÀ THẤT BẠI (như ADR-0001) đáng ghi để không ai thử lại.
- KHÔNG dùng cho quyết định hiển nhiên/nhỏ (đặt tên biến, chọn lib phụ không ảnh hưởng kiến trúc).

## Format (Michael Nygard, rút gọn — xem [_template.md](../../../docs/adr/_template.md))

Status badge 🟡Proposed/🟢Accepted/🔴Deprecated/⚪Superseded → Context (2-4 đoạn, vấn đề + force xung đột) → Decision (1-2 đoạn, prescriptive) → Alternatives considered (bảng, tối thiểu 2 option khác kể cả "không làm gì") → Consequences (Positive/Negative/Trade-off) → Related (link convention/ADR liên quan).

## Quy trình

1. **Hỏi user** (nếu chưa rõ từ ngữ cảnh): Context là gì? Decision đã chọn gì? Có alternative nào đã thử/cân nhắc? Consequence tiêu cực nào chấp nhận đánh đổi?
2. **Numbering**: Glob `docs/adr/*.md` (loại `_template.md`) → next `NNNN` (4 chữ số, không trùng).
3. **Tạo file** `docs/adr/<NNNN>-<kebab-title>.md` — copy `_template.md`, điền đủ, xoá placeholder `&lt;...&gt;`.
4. **Status mặc định 🟡 Proposed** — chỉ đặt 🟢 Accepted sau khi user xác nhận rõ ràng (không tự suy ra là đã chốt).
5. **Link ngược** — nếu ADR ảnh hưởng 1 file trong `docs/conventions/`, thêm link sang ADR đó ở cuối file convention tương ứng (xem cách [04-window-api-contract.md](../../../docs/conventions/04-window-api-contract.md) link tới ADR-0001).

## Anti-pattern

- ❌ Set status "Accepted" khi user chưa confirm.
- ❌ Bỏ "Alternatives considered" — thiếu alternative, reader tương lai sẽ nghi ngờ quyết định.
- ❌ ADR quá ngắn cho quyết định lớn (vd "chọn X vì nó tốt") — phải có ràng buộc/force cụ thể, lý tưởng nhất là 1 lỗi/giới hạn THẬT đã gặp (như `TS2717` trong ADR-0001).
- ❌ Quên link ADR vào `docs/conventions/` liên quan.
