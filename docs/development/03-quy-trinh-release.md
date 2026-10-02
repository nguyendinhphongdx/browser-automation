# Quy trình Release

[← Về mục lục](../README.md)

Chi tiết kỹ thuật ở [architecture/15-auto-update-release.md](../architecture/15-auto-update-release.md) — trang này là **checklist thao tác** khi thực sự cắt 1 bản release.

## Các bước

1. Đảm bảo `master` đang ở trạng thái muốn release (CI xanh — `ci.yml` chạy typecheck + build desktop app mỗi push/PR)
2. Cập nhật `version` trong `apps/desktop/package.json` nếu cần khớp với tag sắp gắn
3. Gắn tag đúng định dạng `v<version>`:
   ```bash
   git tag v0.1.0-beta   # chứa "beta"/"alpha" → tự đánh dấu prerelease trên GitHub
   git push origin v0.1.0-beta
   ```
4. Theo dõi tab **Actions** trên GitHub — job `release` build song song 3 nền tảng (~10-20 phút tuỳ runner), job `publish` gom lại tạo GitHub Release
5. Kiểm tra Release vừa tạo có đủ file cho cả 3 nền tảng (`.exe`, `.dmg`, `.AppImage`/`.deb`) trước khi thông báo rộng rãi — nếu 1 runner build lỗi, job `release` của matrix đó fail nhưng 2 nền tảng còn lại vẫn có thể publish bình thường (`if-no-files-found: ignore` ở bước upload artifact)
6. App đang chạy ở máy người dùng tự phát hiện bản mới trong vòng tối đa 4 giờ (`auto-updater.ts` poll định kỳ) hoặc ngay khi họ mở lại app

## Rollback khi release lỗi

Không có lệnh "huỷ release" tự động — sửa thủ công trên GitHub:

1. Vào Releases, xoá hoặc đánh dấu bản lỗi là draft/pre-release để tắt khỏi `electron-updater`'s latest feed
2. Gắn tag mới với bản vá, release lại bình thường theo đúng 5 bước trên

## Thứ tự tăng version

Repo chưa có công cụ tự động bump version theo semver dựa trên commit (kiểu `semantic-release`) — tăng version là sửa tay `package.json` + đặt tên tag khớp. Giữ nhất quán giữa `package.json`'s `version` và tag git giúp `electron-builder` sinh đúng tên file cài đặt (ví dụ `BrowserAuto-0.1.0-beta.dmg`).
