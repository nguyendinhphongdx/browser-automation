# `Window.api` — đích cho preload bridge

[← Về mục lục](../README.md) · [← 00-tong-quan](00-tong-quan.md)

Quyết định đầy đủ (kèm 2 alternative đã thử-và-fail) ghi ở [ADR-0002](../adr/0002-window-api-derive-from-preload.md) (supersede [ADR-0001](../adr/0001-window-api-composition.md)) — file này chỉ nêu đích để code mới theo đúng ngay từ đầu.

## Rule bắt buộc: `Window.api` LẤY TYPE từ `preload.ts`, không khai tay

`main/preload.ts` đã tự export `export type API = typeof api` — đây là nguồn sự thật DUY NHẤT cho shape của `window.api` (chính là implementation thật, không thể drift). `renderer/types/electron-api.ts` chỉ import type đó và `declare global` — không bao giờ tự liệt kê lại method.

```ts
// renderer/types/electron-api.ts — toàn bộ file, không có gì khác
import type { API } from '../../main/preload'

declare global {
  interface Window {
    api: API
  }
}

export type {}
```

Thêm method mới cho `window.api` → sửa **duy nhất** `main/preload.ts` (thêm vào `api = {...}` + handler IPC tương ứng) — `Window.api` tự động có đúng type ngay, không có "chỗ thứ 2" cần nhớ sửa.

## Vì sao không tách interface theo domain (đã từng định làm — xem ADR-0001)

Mục tiêu "đọc theo domain" đã được giải quyết tại nguồn: `preload.ts`'s `api = {...}` tự chia theo comment từng domain (`// Profile`, `// Workflow`, `// Video Studio`...). Muốn biết domain nào có method gì → đọc trực tiếp ở đó, không cần interface riêng.

## Đọc tiếp

- [ADR-0002: Window.api derive từ preload](../adr/0002-window-api-derive-from-preload.md)
