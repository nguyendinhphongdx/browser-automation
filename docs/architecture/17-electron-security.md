# Electron security

[← Về mục lục](../README.md)

Electron cho renderer chạy gần giống 1 trang web bình thường — nếu renderer bị chèn mã độc (ví dụ qua 1 trang web độc hại được mở nhầm, hoặc dependency JS bị compromise), cấu hình sai có thể cho mã đó chạy thẳng Node.js với toàn quyền hệ thống. Phần này ghi lại cấu hình bảo mật thật đang dùng trong `main/index.ts`.

## `webPreferences` — 2 dòng quan trọng nhất

```ts
new BrowserWindow({
  webPreferences: {
    preload: path.join(__dirname, '../preload/preload.js'),
    contextIsolation: true,   // renderer KHÔNG chia sẻ JS context với preload
    nodeIntegration: false    // renderer KHÔNG có require()/process/Node API
  }
})
```

Đây là cấu hình Electron khuyến nghị kể từ nhiều năm nay (ngược với mặc định lịch sử cũ `nodeIntegration: true` — đã đổi mặc định vì lý do bảo mật). Không set `sandbox` tường minh — Electron (từ bản 20 trở lên) tự bật sandbox mặc định khi `contextIsolation: true`, nên renderer process chạy trong sandbox hệ điều hành (giống tab Chrome thường) trừ khi chủ động tắt.

## `preload.ts` là ranh giới tin cậy duy nhất

Vì `contextIsolation: true`, renderer **không thể** tự ý gọi bất kỳ API Node/Electron nào — toàn bộ bề mặt renderer được phép dùng nằm gọn trong 1 object `window.api` do `preload.ts` tự định nghĩa và `contextBridge.exposeInMainWorld('api', api)` lộ ra. Channel push còn bị lọc thêm 1 lớp qua `ALLOWED_CHANNELS` — renderer gọi `window.api.on('channel-lạ', ...)` bị từ chối ngay ở preload, không chạm được tới `ipcRenderer.on` thật. Chi tiết: [03-ipc.md](03-ipc.md).

Hệ quả thực tế: **review code `preload.ts` kỹ như review 1 API công khai** — bất kỳ hàm nào thêm vào `api` object đều là bề mặt renderer (và gián tiếp, bất kỳ nội dung web nào lỡ chạy được trong renderer) có thể gọi tới.

## Mở link ngoài — qua `shell.openExternal`, không qua `<a href>` trong renderer

```ts
ipcMain.handle('auth:openBrowser', async () => {
  const loginUrl = `${serverUrl}/desktop-login?callback=...`
  await shell.openExternal(loginUrl)
})
```

Link đăng nhập mở bằng trình duyệt hệ thống thật (`shell.openExternal`) thay vì mở trong 1 `BrowserWindow`/`webview` khác của chính app — tránh phải tự quản lý thêm 1 bề mặt renderer nữa chỉ để hiển thị trang login bên ngoài.

## Deep link (`browserauto://`) — bề mặt nhận input từ bên ngoài app

```ts
app.setAsDefaultProtocolClient('browserauto')
// browserauto://auth?token=...&userId=...&email=...&name=...
```

Đăng ký custom protocol nghĩa là **bất kỳ trang web hoặc app nào khác trên máy cũng có thể trigger** `browserauto://...` với tham số tự chọn (ví dụ 1 thẻ `<a href="browserauto://auth?token=xxx">` trên 1 trang web bất kỳ). `handleDeepLink()` hiện chỉ đọc `token`/`userId`/`email`/`name` từ URL rồi lưu thẳng làm phiên đăng nhập — đây là bề mặt đáng chú ý nhất trong app vì nhận input trực tiếp từ **ngoài tiến trình Electron**, khác với IPC (chỉ renderer của chính app gọi được). Giá trị `token` cần được server xác minh hợp lệ (không phải tự app tin tưởng mù) trước khi coi là đã đăng nhập — xem luồng cấp token thật ở [08-server.md](08-server.md#2-cơ-chế-xác-thực-song-song).

## Khoảng trống chưa có — Content-Security-Policy

`src/renderer/index.html` hiện **chưa khai báo CSP** (không có thẻ `<meta http-equiv="Content-Security-Policy">`). Với `contextIsolation`/`nodeIntegration` đã tắt đúng cách, rủi ro bị giảm nhiều dù thiếu CSP, nhưng CSP vẫn là lớp phòng thủ bổ sung hữu ích (giới hạn renderer chỉ load script/style/ảnh từ nguồn định sẵn) theo khuyến nghị bảo mật chính thức của Electron — một việc dọn dẹp đáng làm nhưng chưa nằm trong phạm vi tài liệu này.
