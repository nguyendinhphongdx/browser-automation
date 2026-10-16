---
description: Tổng quan nhanh các dự án film-studio — tiến độ từng tập, bước tiếp theo, quota đã dùng
argument-hint: [project_id]
---

Tham số: $ARGUMENTS

- Không có project_id → `project_list`, trình bảng (dự án | số tập | cập nhật).
- Có project_id → `project_get` + `usage_report`: bảng tập (tập | tên | độ dài ước tính/mục tiêu | storyboard | video | phim cuối), `next_steps` đầu tiên, quota (lần gọi, lỗi, sinh lại, chi phí ước tính nếu có).
- Nhắc dashboard http://localhost:4747 nếu server đang chạy.

Chỉ đọc — không gọi tool ghi/sinh nào. Kết bằng 1 câu đề xuất lệnh tiếp theo (`/film-write`, `/film-review` hoặc `/film-make`).
