# electron-builder đóng gói sai thư mục — `dist/` thay vì `out/`

[← Về mục lục](../README.md)

Phát hiện quan trọng nhất đợt viết tài liệu này — ảnh hưởng trực tiếp tới việc **bản cài đặt release có chạy được hay không**.

## Mâu thuẫn trong chính `apps/desktop/package.json`

```json
{
  "main": "out/main/index.js",
  "build": {
    "files": ["dist/**/*", "resources/**/*"]
  }
}
```

`main` trỏ đúng `out/main/index.js` (khớp output thật của `electron-vite build`, xem [33-electron-vite-build.md](33-electron-vite-build.md)) — nhưng `build.files` (danh sách file `electron-builder` đóng gói vào installer) lại liệt kê `dist/**/*`, thư mục **không tồn tại** sau khi build (`ls apps/desktop` chỉ có `out/`, không có `dist/`).

## Xác nhận bằng `git log` — dấu vết rõ ràng của 1 lần migrate dở dang

```
git log -p --follow -- package.json | grep "dist/\|out/"

-  "main": "dist/main/index.js",
+  "main": "out/main/index.js",
...
+    "files": ["dist/**/*", ...]   ← thêm Ở 1 commit riêng, không đồng bộ lại sau lần đổi main ở trên
```

`main` đã được cập nhật đúng khi project chuyển từ build tool cũ (ra `dist/`) sang `electron-vite` (ra `out/`) — nhưng `build.files` (thêm vào ở 1 commit sau, lúc setup auto-update/release) **copy nhầm theo quy ước cũ**, không ai đối chiếu lại với giá trị `main` đã đổi.

## Hệ quả — theo tài liệu chính thức của electron-builder

> "files" option, khi khai báo, **thay thế hoàn toàn** danh sách mặc định, không cộng dồn thêm.

Nghĩa là package được publish hiện tại gần như chắc chắn **không chứa code app thật** (`out/**/*` không nằm trong danh sách đóng gói) — chỉ có `resources/**/*` và khung Electron trống. Cài đặt từ `.exe`/`.dmg`/`.AppImage` sinh ra từ pipeline release hiện tại ([15-auto-update-release.md](15-auto-update-release.md)) nhiều khả năng **mở lên là màn hình trắng hoặc crash ngay lập tức**.

## Cách sửa

```diff
   "build": {
     "files": [
-      "dist/**/*",
+      "out/**/*",
       "resources/**/*"
     ],
```

Và kiểm tra lại thật sự bằng cách build + đóng gói + mở thử file cài đặt sinh ra (không chỉ dựa vào CI "build thành công" — CI hiện chỉ chạy `electron-vite build`, chưa chạy `electron-builder` để đóng gói thật ở bước `ci.yml`, nên lỗi này không bị CI bắt được; chỉ `release.yml` mới chạy `electron-builder`, và chưa có bước nào trong đó tự mở thử file cài đặt để xác nhận app chạy được).
