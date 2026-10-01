# Cài đặt

[← Về mục lục](../README.md)

## Yêu cầu hệ thống

- Windows 10+, macOS 10.15+, hoặc Ubuntu 20.04+
- RAM tối thiểu 4GB (khuyến nghị 8GB)
- Ít nhất 1 trình duyệt đã cài (Chrome, Brave, Edge, Firefox, Opera, Vivaldi, Chromium...)

## Cài đặt ứng dụng

1. Tải file cài đặt từ trang tải về (theo hệ điều hành: `.exe`, `.dmg`, `.AppImage`/`.deb`)
2. Chạy file cài đặt và làm theo hướng dẫn
3. Mở ứng dụng BrowserAuto
4. Hoàn thành hướng dẫn chào mừng (onboarding)

## Dữ liệu lưu ở đâu

Toàn bộ profile, workflow, proxy, email, cookie được lưu **cục bộ trên máy** trong 1 file SQLite tại thư mục dữ liệu người dùng của hệ điều hành (ví dụ `~/Library/Application Support/browser-automation/browser-automation.db` trên macOS). Ứng dụng hoạt động offline hoàn toàn — chỉ cần kết nối server khi bạn chủ động bật [đồng bộ cloud](08-ket-noi-server.md).

## Cập nhật ứng dụng

Ứng dụng tự kiểm tra bản mới qua GitHub Releases và báo khi có bản cập nhật (trừ môi trường development). Không cần tải lại file cài đặt thủ công.

Tiếp theo: [Quản lý Profile →](02-quan-ly-profile.md)
