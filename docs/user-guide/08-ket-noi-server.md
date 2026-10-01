# Kết nối Server

[← Về mục lục](../README.md)

Kết nối server là **tuỳ chọn** — app hoạt động offline hoàn toàn không cần bước này. Chỉ cần khi muốn đồng bộ cloud hoặc dùng Marketplace online.

## Các bước

1. Vào **Đăng nhập / Đăng ký** (sidebar dưới cùng)
2. Nhập Server URL (mặc định `http://localhost:3000` khi tự chạy server, hoặc URL server production)
3. Nhấn **Test** để kiểm tra kết nối
4. Đăng nhập hoặc đăng ký tài khoản
5. Sau khi đăng nhập:
   - Nhấn **Sync** để đồng bộ profiles lên server
   - Dữ liệu được backup trên cloud, khôi phục lại được nếu đổi máy

## Xác thực

Đăng nhập dùng JWT — token được lưu cục bộ và tự động đính kèm cho mọi request tới server sau đó. Đăng xuất sẽ xoá token, không ảnh hưởng dữ liệu local (profile/workflow vẫn còn nguyên trên máy).

Tiếp theo: [Cài đặt ứng dụng →](09-cai-dat-ung-dung.md)
