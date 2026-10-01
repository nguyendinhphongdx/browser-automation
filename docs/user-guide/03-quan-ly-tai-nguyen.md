# Quản lý tài nguyên

[← Về mục lục](../README.md)

Vào tab **Tài nguyên** (`Ctrl+3`) để quản lý 3 loại dữ liệu dùng chung cho các profile: Proxy, Email, Cookie.

## Proxy

- Hỗ trợ: HTTP, HTTPS, SOCKS4, SOCKS5
- Import hàng loạt từ file TXT (1 proxy/dòng, định dạng `host:port:user:pass`)
- Kiểm tra proxy sống/chết và đo tốc độ phản hồi
- Gán proxy cho từng profile (mỗi profile chỉ gán được 1 proxy)

Mật khẩu proxy được **mã hoá AES-256-GCM** trước khi lưu vào database local — xem [09-cai-dat-ung-dung.md](09-cai-dat-ung-dung.md).

## Email / Account

- Import hàng loạt từ file CSV
- Trạng thái theo dõi: Hoạt động, Bị khoá, Cần xác minh
- Nhóm theo provider: Gmail, Outlook, Yahoo, khác
- Có thể gán 1 email cho 1 profile cụ thể

Mật khẩu email cũng được mã hoá AES-256-GCM như proxy.

## Cookie

- Import/Export cookie dạng JSON (tương thích định dạng cookie editor phổ biến)
- Gán cookie cho profile cụ thể — khi profile khởi chạy, cookie được nạp sẵn vào trình duyệt
- Dùng để khôi phục phiên đăng nhập mà không cần đăng nhập lại thủ công

Tiếp theo: [Automation Builder →](04-automation-builder.md)
