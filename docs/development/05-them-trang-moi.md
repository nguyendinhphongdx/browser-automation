# Thêm trang mới

[← Về mục lục](../README.md)

Walkthrough thêm 1 trang mới vào sidebar, nối đủ route + state + nhãn đa ngôn ngữ — theo đúng pattern 6 trang hiện có ([19-routing-theme-i18n.md](../architecture/19-routing-theme-i18n.md)).

1. Tạo thư mục `renderer/pages/<ten-trang>/`, component chính `<TenTrang>Page.tsx`
2. Nếu trang cần state dùng chung nhiều nơi: thêm 1 store mới ở `renderer/stores/<ten>-store.ts` theo pattern Zustand sẵn có ([18-renderer-state.md](../architecture/18-renderer-state.md)) — action tự gọi `window.api.xxx()`, không để component tự gọi IPC
3. Thêm `<Route path="/<ten-trang>" element={<TenTrangPage />} />` vào `App.tsx` — phẳng, không nested
4. Thêm mục vào sidebar (danh sách nav item), kèm icon
5. Thêm nhãn vào `i18n.ts`'s `translations` cho cả `vi`/`en` — key đặt theo `nav.<ten-trang>`, `<ten-trang>.title`...
6. Nếu trang cần dữ liệu riêng từ main process (bảng SQLite mới, logic mới): thêm `services/`, `ipc/<ten>-handlers.ts`, cập nhật `preload.ts` + type `Window.api` theo checklist ở [03-ipc.md](../architecture/03-ipc.md#thêm-1-ipc-handler-mới--checklist)

## Lỗi hay gặp

- Quên cập nhật `Window.api` type ở `profile-store.ts` — gọi được lúc chạy (JS không bắt) nhưng `tsc` không báo type mismatch chỗ gọi sai tham số
- Thêm route nhưng quên thêm icon/label sidebar — trang tồn tại nhưng không ai vào được qua UI (chỉ gõ tay URL mới thấy, vô dụng với người dùng thật)
