# Automation Builder

[← Về mục lục](../README.md)

Vào tab **Automation** (`Ctrl+2`) để tạo và chạy workflow — kịch bản tự động hoá thao tác trình duyệt.

## Chế độ kéo thả (Visual)

1. Vào **Automation → Tạo Workflow → Kéo thả**
2. Kéo node từ bảng bên trái vào canvas
3. Nối các node bằng cách kéo từ đầu ra → đầu vào
4. Cấu hình từng node ở panel bên phải (nhấn vào node để mở)
5. Nhấn **Save** (`Ctrl+S`) để lưu

### Các nhóm node (54 loại node, 5 nhóm)

| Nhóm | Ví dụ node |
|---|---|
| **Trình duyệt** | Mở trang, Điều hướng, Tab mới/chuyển/đóng, Đóng browser, Chụp màn hình, Đặt viewport |
| **Tương tác** | Click, Double-click, Nhập text, Nhấn phím, Cuộn, Hover, Chọn dropdown, Tick checkbox, Upload file, Kéo-thả |
| **Dữ liệu** | Lấy text/thuộc tính/URL/title, Đếm phần tử, Gán biến, Chạy JS tuỳ ý, Trích bảng |
| **Luồng** | If/Else, Loop, Loop-each, Try/Catch, Break loop, Delay, Wait, Kiểm tra phần tử tồn tại, Chạy workflow con, Parallel fork/join, các node xử lý dữ liệu theo lô (phân trang, map, filter, reduce, sort, export) |
| **Tích hợp** | HTTP Request, Gán/lấy cookie, LocalStorage, Thông báo, Ghi log |

Node **If/Else**, **Loop**, **Parallel fork/join** là các node điều khiển luồng đặc biệt — chúng không tự thực thi hành động mà quyết định *đường đi tiếp theo* trong workflow dựa trên nhánh đầu ra (`branch-true`/`branch-false`, `branch-0`/`branch-1`...).

## Chế độ viết code (Code)

1. Vào **Automation → Tạo Workflow → Viết code**
2. Viết TypeScript/JavaScript trong Monaco Editor
3. Dùng API có sẵn với auto-complete (điều khiển Playwright page trực tiếp)

Dùng chế độ này khi logic quá phức tạp để biểu diễn bằng node (vòng lặp lồng nhau nhiều tầng, xử lý dữ liệu phức tạp...).

## Chạy workflow

1. Chọn profile từ dropdown (bắt buộc — workflow cần 1 trình duyệt thật để chạy)
2. Nhấn nút **Play** (▶) hoặc `Ctrl+Shift+R`
3. Xem log thực thi real-time ở panel dưới, từng node sáng lên theo tiến độ chạy

## Phiên bản & lịch sử

Mỗi lần lưu workflow tạo 1 **version** mới (xem ở panel Lịch sử phiên bản) — có thể đặt nhãn, xem lại, hoặc rollback về version cũ.

## Lên lịch chạy tự động

Workflow có thể được gắn **lịch chạy** (cron hoặc webhook) để tự chạy định kỳ không cần mở app thao tác — xem chi tiết ở trang Lịch (Schedule).

Tiếp theo: [Ghi lại thao tác →](05-ghi-lai-thao-tac.md) · [AI Agent →](06-ai-agent.md)
