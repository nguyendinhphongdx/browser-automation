# Shared packages

[← Về mục lục](../README.md)

`packages/` có 2 package tồn tại để chia sẻ code giữa `apps/desktop` và `apps/server`. Theo thiết kế monorepo, đây đúng là **nơi nên** đặt type/logic dùng chung. Nhưng kiểm tra thực tế trong source thì khác với vẻ ngoài.

## `@browser-automation/shared-types` — khai báo dependency, 0 import thật

```bash
$ grep -rl "@browser-automation/shared-types" apps/desktop/src apps/server/src
# (không có kết quả nào)
```

`apps/desktop/package.json` có khai `"@browser-automation/shared-types": "workspace:*"`, nhưng **không file nào trong `apps/desktop/src` thực sự import nó**. Thay vào đó, desktop tự định nghĩa toàn bộ type ở `apps/desktop/src/shared/types.ts` (dùng ở 43 file khác nhau trong desktop) — file này **độc lập hoàn toàn**, không re-export hay extend gì từ package `shared-types`. `apps/server` còn không khai package này trong `package.json`.

Nói cách khác: tên "shared-types" mô tả **ý định thiết kế**, không mô tả trạng thái code hiện tại — 2 app đang dùng 2 bộ định nghĩa type tách biệt, trùng lặp ở những field chung (ví dụ `BrowserProfile`, `Fingerprint`).

## `@browser-automation/fingerprint` — cùng tình trạng

Đã nêu chi tiết ở [07-fingerprint.md](07-fingerprint.md): `main/browser/fingerprint.ts` và `main/browser/launcher.ts` mỗi file tự định nghĩa lại logic sinh/inject fingerprint, độc lập với package này.

## Vì sao đáng được nêu rõ trong tài liệu thay vì bỏ qua

Nếu chỉ đọc `README.md` (phần "Packages") hoặc cấu trúc thư mục, sẽ hiểu lầm đây là 2 package đang hoạt động — dẫn tới sửa nhầm chỗ (sửa `packages/fingerprint` rồi thắc mắc vì sao desktop không thấy thay đổi), hoặc import nhầm từ package tưởng là "nguồn sự thật" trong khi thực tế không phải.

## Gợi ý nếu muốn dọn dẹp (ngoài phạm vi tài liệu này, chưa làm)

- **Shared-types**: chuyển `apps/desktop/src/shared/types.ts` thành re-export từ `@browser-automation/shared-types`, bổ sung field còn thiếu vào package; server import trực tiếp từ package thay vì định nghĩa type riêng cho response API.
- **Fingerprint**: xoá `main/browser/fingerprint.ts` + logic trùng trong `launcher.ts`, thay bằng gọi `generateFingerprint()`/`buildFingerprintScript()` từ `@browser-automation/fingerprint`.

Cả 2 việc trên là refactor có rủi ro thấp (hợp nhất logic đã tương đương nhau) nhưng cần test kỹ đường dẫn tạo profile + launch browser trước khi merge, vì đụng vào luồng cốt lõi nhất của app.
