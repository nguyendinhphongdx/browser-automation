---
name: docs-write
description: Tạo 1 trang docs mới trong docs/architecture, docs/conventions, docs/development hoặc docs/user-guide đúng convention có sẵn của repo (số thứ tự, H1, link về mục lục, "Đọc tiếp"). Dùng khi user nói "thêm trang docs về X", "viết tài liệu cho Y".
---

# docs-write — Tạo trang docs mới đúng convention

## Khi dùng

- User yêu cầu thêm 1 trang vào 1 trong 4 cây đã có số thứ tự: `architecture/`, `conventions/`, `development/`, `user-guide/` (KHÔNG áp dụng cho `adr/` — dùng skill `adr-write` riêng).
- Trước khi thêm, **xác định đúng cây** — xem bảng vai trò ở skill `docs-read`. Hỏi lại user nếu không rõ đây là "hiện trạng" (`architecture/`), "đích nên theo" (`conventions/`), hay "quy trình contributor" (`development/`).

## Convention bắt buộc (không phải Docusaurus — không cần frontmatter/sidebar_position)

1. **Tên file** = `<NN>-<ten-kebab-tieng-viet-khong-dau>.md`, `NN` 2 chữ số = số tiếp theo trong cây đó (Glob để biết số lớn nhất hiện có).
2. **H1** = tiêu đề trang, tiếng Việt.
3. **Dòng 2**: `[← Về mục lục](../README.md)` — với `conventions/`, thêm `· [← 00-tong-quan](00-tong-quan.md)` nếu không phải chính file đó.
4. **Nội dung tiếng Việt**, bảng + code block hơn văn xuôi dài (xem Writing rule ở [AGENTS.md](../../../AGENTS.md)).
5. **Cuối trang**: `## Đọc tiếp` — liệt kê link sang trang liên quan tiếp theo trong cùng cây (bỏ qua nếu là trang cuối).
6. **Cập nhật mục lục** — thêm 1 dòng vào bảng tương ứng trong [docs/README.md](../../../docs/README.md).

## Quy trình

1. Glob `docs/<cây>/*.md` → xác định số `NN` tiếp theo.
2. Đọc 1-2 file gần nhất trong cùng cây làm mẫu văn phong (độ dài, cách chia heading).
3. Viết file mới theo convention trên — **nội dung phải verify bằng Read code thật trước khi viết** nếu trang nói về 1 file/pattern cụ thể (không bịa đường dẫn/tên hàm).
4. Thêm dòng vào [docs/README.md](../../../docs/README.md).
5. Nếu trang mới ở `conventions/` và tạo ra 1 quyết định không-obvious (có alternative đã cân nhắc) → gợi ý user chạy thêm skill `adr-write`.

## Anti-pattern

- ❌ Viết `conventions/` như thể đang tả hiện trạng (dùng thì hiện tại: "code hiện làm X") — `conventions/` luôn nói ở dạng NÊN/ĐÍCH ("code mới PHẢI...", "đích là...").
- ❌ Copy nguyên văn giữa `architecture/` và `conventions/` cho cùng 1 chủ đề — mỗi cây có đúng 1 phần canonical, bên kia chỉ link sang.
- ❌ Quên cập nhật `docs/README.md` — trang mới sẽ "mồ côi", không ai tìm thấy qua mục lục.
- ❌ Bịa tên file/hàm chưa verify — Read code thật trước khi trích dẫn.
