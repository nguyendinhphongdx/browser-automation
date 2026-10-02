# Auto-update & Release

[← Về mục lục](../README.md)

Desktop app tự kiểm tra và cài bản mới qua **GitHub Releases** — không có server cập nhật riêng.

## Phía app: `electron-updater`

```ts
autoUpdater.autoDownload = false         // hỏi trước khi tải, không tự tải ngầm
autoUpdater.autoInstallOnAppQuit = true  // cài khi app đóng lại, không gián đoạn phiên đang dùng

autoUpdater.checkForUpdates()            // kiểm tra ngay lúc khởi động
setInterval(() => autoUpdater.checkForUpdates(), 4 * 60 * 60 * 1000)  // rồi mỗi 4 giờ
```

3 bước đều hỏi/báo người dùng qua `dialog.showMessageBox` thay vì âm thầm làm — có bản mới → hỏi tải không → tải xong → hỏi khởi động lại không. Tiến độ tải (`download-progress`) đẩy qua push channel `updater:progress` để renderer hiện thanh tiến độ nếu muốn (xem [03-ipc.md](03-ipc.md)).

`require('electron-updater')` dùng `require` thay vì `import` ở đầu file, có ghi chú rõ lý do: import top-level khiến module này crash trong môi trường dev (nó cố đọc file cấu hình chỉ tồn tại ở bản đã đóng gói) — `initAutoUpdater()` cũng chỉ được gọi khi `NODE_ENV !== 'development'` ở `index.ts`.

## Phía CI: gắn tag → build → publish

```
git tag v0.1.0-beta
git push origin v0.1.0-beta
```

`push tag v*` trigger `.github/workflows/release.yml` — build song song trên 3 runner (`ubuntu-latest`/`windows-latest`/`macos-latest`), mỗi runner tự rebuild `better-sqlite3` cho đúng ABI của Electron trên OS đó (native module không build chéo được giữa OS), đóng gói bằng `electron-builder --<platform>`, upload artifact. Job `publish` chạy sau, gom toàn bộ artifact từ 3 runner, tạo 1 GitHub Release duy nhất.

```yaml
prerelease: ${{ contains(github.ref, 'beta') || contains(github.ref, 'alpha') }}
```

Tag chứa chuỗi `beta`/`alpha` tự động đánh dấu **prerelease** trên GitHub — không cần sửa workflow mỗi lần, chỉ cần đặt tên tag đúng quy ước (`v1.0.0-beta.1`, `v2.0.0-alpha`...).

## Vì sao CI (`ci.yml`) và Release (`release.yml`) tách riêng 2 workflow

`ci.yml` chạy mỗi push/PR — chỉ cần nhanh (typecheck + build, không đóng gói installer). `release.yml` chỉ chạy khi có tag — chậm hơn nhiều (build 3 OS song song + đóng gói + upload), không nên chạy lại cho mỗi commit thường. Tách riêng giúp vòng lặp dev (push code → CI xanh) không bị kéo dài bởi bước đóng gói chỉ cần thiết lúc thật sự release.
