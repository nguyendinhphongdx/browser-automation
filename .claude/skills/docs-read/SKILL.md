---
name: docs-read
description: Định vị nhanh 1 chủ đề trong docs/ (architecture, conventions, adr, development, user-guide) và trả về đường dẫn chính xác. Dùng khi user hỏi "docs nào nói về X", "kiến trúc Y nằm ở đâu", "pattern Z dùng chỗ nào trong repo".
---

# docs-read — Định vị docs BrowserAuto

## Mục tiêu

Khi user hỏi về 1 chủ đề, **đừng đoán** — định vị đúng file trong [docs/](../../../docs/) rồi trả lời kèm link `[text](path)`.

## Bản đồ 5 cây docs — vai trò KHÁC NHAU, không trộn

| Cây | Trả lời câu hỏi dạng | Vai trò |
|---|---|---|
| [architecture/](../../../docs/architecture/) | "Code X hiện làm thế nào", "schema bảng Y" | Hiện trạng — ghi lại CÁI ĐANG CÓ |
| [conventions/](../../../docs/conventions/) | "Nên đặt file ở đâu", "pattern nào áp dụng cho Z" | Đích — ghi KIẾN TRÚC NÊN THEO, code hiện tại chưa chắc khớp |
| [adr/](../../../docs/adr/) | "Vì sao chọn X mà không chọn Y" | Quyết định đã chốt + alternative đã cân nhắc |
| [development/](../../../docs/development/) | "Cách thêm node/tool/trang mới", "chạy test sao" | Quy trình contributor |
| [user-guide/](../../../docs/user-guide/) | "Tính năng X dùng ra sao" (góc nhìn end-user) | Hướng dẫn sử dụng |

## Quy trình

1. **Phân loại câu hỏi** theo bảng trên — "hiện trạng" vs "nên làm sao" vs "vì sao" là 3 câu hỏi khác nhau, dễ nhầm.
2. **Glob** đúng cây rồi tìm file theo tên (mỗi cây có `README.md`/mục lục ở gốc liệt kê số thứ tự + chủ đề từng file — đọc mục lục trước khi Glob chi tiết).
3. Đọc đúng phần liên quan, trả lời ngắn, kèm link `[tên](docs/<cây>/<file>.md)` để user click được.

## Mẹo

- Hỏi "pattern Strategy/Registry/Facade... dùng ở đâu" → [conventions/00-tong-quan.md](../../../docs/conventions/00-tong-quan.md) có bảng pattern → reference template file thật.
- Hỏi "tại sao Window.api không tách theo domain từ đầu" → [adr/0001-window-api-composition.md](../../../docs/adr/0001-window-api-composition.md).
- Câu hỏi mơ hồ "kiến trúc app" → mở [architecture/01-tong-quan.md](../../../docs/architecture/01-tong-quan.md) trước (hiện trạng tổng quan), dẫn sang `conventions/00-tong-quan.md` nếu user hỏi tiếp "nên sửa thế nào".

## Anti-pattern

- ❌ Trả lời từ kiến thức framework chung mà không mở docs thật — repo có quyết định riêng.
- ❌ Lẫn `architecture/` (hiện trạng) với `conventions/` (đích) — nếu 2 cây nói khác nhau về cùng 1 vùng code, đó là lệch ĐÃ BIẾT (đang chờ refactor), không phải lỗi docs — nói rõ với user cả 2 phía.
- ❌ Đoán đường dẫn — luôn Glob/đọc mục lục trước khi trả lời.
