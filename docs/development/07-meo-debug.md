# Mẹo debug

[← Về mục lục](../README.md)

## 2 tiến trình, 2 nơi xem log khác nhau

- **Renderer** (React UI) — DevTools mở bình thường trong cửa sổ app lúc `pnpm desktop:dev` (`Ctrl+Shift+I`/menu). `console.log` trong `renderer/` hiện ở đây.
- **Main process** (Node) — log hiện thẳng ở **terminal** đang chạy `pnpm desktop:dev`, không phải trong DevTools của cửa sổ app. `console.log` trong `main/` (IPC handlers, services, workflow engine) hiện ở đây.

Nhầm lẫn phổ biến nhất khi mới quen repo: thêm `console.log` vào 1 file ở `main/` rồi tìm mãi không thấy trong DevTools — vì log đó nằm ở terminal, không phải browser console.

## `preload.ts` không hot-reload

Đổi gì trong `preload.ts` (hoặc bất kỳ file nào dưới `main/`) đều cần **restart hẳn** `pnpm desktop:dev` — Vite HMR chỉ áp dụng cho `renderer/`. Sửa xong mà vẫn thấy hành vi cũ gần như chắc chắn là quên restart.

## Lỗi `window.api.xxx is not a function`

Thường là 1 trong 2:
1. Quên restart sau khi sửa `preload.ts` (xem trên)
2. Quên thêm hàm wrapper vào `preload.ts`'s `api` object dù đã đăng ký `ipcMain.handle` ở main — kiểm tra cả 2 phía, không chỉ phía gọi

## Xem log thực thi workflow

Log của 1 lần chạy nằm trong `workflow_logs.logs` (JSON array), xem trực tiếp qua UI panel log dưới canvas — không cần tự query SQLite trừ khi debug sâu hơn mức UI hiện.

## Debug CDP screencast (live preview AI Agent)

Nếu preview không hiện gì: kiểm tra `browserPreviewService.isActive(profileId)` có `true` không (thêm tạm `console.log` ở `browser-preview-service.ts`), và chắc chắn page đang xem là Chromium — Firefox không có CDP nên screencast không chạy được ([07-fingerprint.md](../architecture/07-fingerprint.md) nói về browser engine, [06-ai-agent.md](../architecture/06-ai-agent.md) nói chi tiết live preview).

## Native module lỗi sau khi đổi version Electron

`better-sqlite3` cần rebuild lại đúng ABI mỗi khi bump version Electron:

```bash
npx @electron/rebuild -f -w better-sqlite3
```

Quên bước này sau khi `pnpm install` hoặc đổi version Electron là nguyên nhân phổ biến của lỗi crash ngay lúc khởi động app liên quan tới native binding.
