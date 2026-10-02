# Khắc phục sự cố

[← Về mục lục](../README.md)

## macOS chặn mở app ("đã bị hỏng" / "không xác định được nhà phát triển")

Xảy ra với bản build chưa ký (unsigned) hoặc dùng phiên bản Electron đã EOL — macOS Gatekeeper/XProtect gắn cờ cảnh báo dù file tải về nguyên vẹn. Vào **System Settings → Privacy & Security**, cuộn xuống tìm dòng thông báo về app này, chọn **Mở dù sao (Open Anyway)**. Nếu vẫn không được, kiểm tra đang dùng bản cài đặt mới nhất (bản cũ dùng Electron EOL dễ bị chặn hơn).

## Không mở được trình duyệt khi bấm Play

1. Vào **Cài đặt** → kiểm tra trình duyệt đã chọn cho profile đó có đang **cài trên máy** không (nhãn "Đã cài")
2. Nếu chọn "Tuỳ chỉnh": kiểm tra đường dẫn file thực thi có đúng không — xem [02-quan-ly-profile.md](02-quan-ly-profile.md)
3. Nút Play giờ hiện thông báo lỗi cụ thể thay vì im lặng không phản hồi — đọc kỹ nội dung lỗi hiện ra

## AI Agent báo "Chưa cấu hình AI Provider" / "Chưa nhập API Key"

Vào **Cài đặt → AI Provider**, chọn nhà cung cấp và nhập API key tương ứng — xem [09-cai-dat-ung-dung.md](09-cai-dat-ung-dung.md). Panel AI Agent không tự hoạt động được nếu thiếu bước này.

## Nút AI Agent bị mờ, không bấm được

Chưa chọn profile ở dropdown trên trang Automation — chọn 1 profile trước, nút sẽ sáng lên.

## Kết nối server thất bại

- Kiểm tra Server URL nhập đúng chưa (có `http://` hoặc `https://` ở đầu)
- Nếu tự chạy server local, đảm bảo server đang chạy (`pnpm dev` trong `apps/server`) trước khi bấm Test
- Kết nối server là **tuỳ chọn** — mọi tính năng tạo/chạy workflow, quản lý profile vẫn dùng được bình thường khi không kết nối, xem [08-ket-noi-server.md](08-ket-noi-server.md)

## Workflow chạy mãi không xong / không phản hồi

- Kiểm tra node đang chạy có phải loại chờ sự kiện (Wait, kiểm tra phần tử tồn tại) với điều kiện không bao giờ đúng — trang không có phần tử đó thì node sẽ chờ tới hết timeout cấu hình
- Bấm nút **Dừng** để huỷ giữa chừng, xem lại log ở panel dưới để biết đang kẹt ở node nào

## Cập nhật app xong có mất dữ liệu không?

Không — profile, workflow, proxy, email, cookie nằm trong 1 file SQLite riêng ở thư mục dữ liệu người dùng, **tách biệt hoàn toàn** khỏi file cài đặt app. Cập nhật app chỉ thay phần code, không đụng tới thư mục dữ liệu này.

Tiếp theo: [Về mục lục →](../README.md)
