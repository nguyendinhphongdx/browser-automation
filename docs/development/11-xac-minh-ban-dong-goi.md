# Xác minh bản đóng gói thật sự chạy được

[← Về mục lục](../README.md)

Sau khi sửa [electron-builder đóng gói sai thư mục](../architecture/39-electron-builder-files-mismatch.md) (hoặc bất kỳ lần nào đổi `build.files`/cấu hình `electron-builder`), đừng chỉ tin CI "xanh" — `ci.yml` chỉ chạy `electron-vite build`, **không** chạy `electron-builder` để đóng gói thật ([15-auto-update-release.md](../architecture/15-auto-update-release.md)). Việc này cần tự kiểm tra tay.

## Checklist

1. Build local: `pnpm --filter @browser-automation/desktop build`
2. Đóng gói local: `cd apps/desktop && npx electron-builder --mac` (hoặc `--win`/`--linux` theo máy đang dùng)
3. **Mở thử file cài đặt sinh ra** (`dist-electron/*.dmg`/`.exe`/`.AppImage`) — cài đặt thật, không chỉ nhìn file có sinh ra hay không (file installer vẫn sinh ra bình thường dù bên trong rỗng, vì `electron-builder` không báo lỗi khi glob `files` không khớp gì — nó chỉ đóng gói rỗng, không crash lúc build)
4. Mở app vừa cài — kỳ vọng thấy đúng UI app thật (Profiles/Automation/...), không phải màn hình trắng hay cửa sổ trống
5. Thử 1 thao tác chạm tới main process (tạo 1 profile) — xác nhận IPC + SQLite hoạt động, không chỉ renderer tĩnh load được

## Vì sao bước 3-5 không thể bỏ qua

Lỗi dạng "file đóng gói nhưng rỗng/thiếu code" **không hiện ra ở bất kỳ bước build/CI nào** — `electron-vite build` thành công (code renderer/main compile đúng), `electron-builder` cũng "thành công" (tạo ra file `.dmg`/`.exe` hợp lệ về mặt định dạng) — chỉ có **mở app cài từ file đó lên** mới lộ ra app trống rỗng. Đây chính xác là lý do bug ở [architecture/39](../architecture/39-electron-builder-files-mismatch.md) tồn tại được mà không ai phát hiện qua CI.
