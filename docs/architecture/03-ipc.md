# IPC (giao tiếp main ↔ renderer)

[← Về mục lục](../README.md)

Electron cô lập renderer (chạy code gần giống 1 trang web) khỏi main process (có quyền hệ thống đầy đủ). Mọi thao tác renderer cần main process làm hộ đều đi qua **IPC**, lộ ra renderer qua đúng 1 object: `window.api` (định nghĩa ở `preload.ts`, khai báo type ở `renderer/stores/profile-store.ts`).

## Quy ước đặt tên channel

`<domain>:<action>`, ví dụ `profile:create`, `workflow:run`, `agent:respondApproval`. Giúp nhìn tên channel là biết ngay thuộc nhóm tính năng nào, tránh đụng tên khi thêm mới.

## Hai kiểu giao tiếp

### 1. Request/response — `ipcMain.handle` + `ipcRenderer.invoke`

Dùng cho hầu hết thao tác: tạo/sửa/xoá, chạy workflow, gọi AI agent. Renderer chờ 1 Promise trả về.

```ts
// main: ipc/profile-handlers.ts
ipcMain.handle('profile:create', (_e, data) => createProfile(data))

// preload: lộ ra renderer
createProfile: (data) => ipcRenderer.invoke('profile:create', data)

// renderer
const profile = await window.api.createProfile(data)
```

### 2. Push — `event.sender.send` + `window.api.on`

Dùng khi main cần **tự đẩy** nhiều sự kiện trong lúc 1 thao tác đang chạy (log thực thi, tiến độ từng node, stream trả lời của AI Agent) — không hợp với mô hình 1-request-1-response.

```ts
// main: gửi nhiều lần trong lúc 1 workflow đang chạy
event.sender.send('workflow:node-progress', { nodeId, status })

// renderer: đăng ký nghe, nhận hàm huỷ đăng ký
useEffect(() => {
  return window.api.on('workflow:node-progress', handler)
}, [])
```

Channel push phải được khai báo trong `ALLOWED_CHANNELS` ở `preload.ts` — `window.api.on()` từ chối channel không có trong danh sách này (chặn renderer nghe lén channel nội bộ khác).

## 2 bug thật đã gặp khi xây tính năng push — và cách tránh lặp lại

### Rò rỉ listener khi `off()` không khớp được với `on()`

Bản đầu tiên của `on()`/`off()` gắn `wrappedCallback` lên 1 property của chính hàm callback (`callback.__wrappedIpc = wrappedCallback`) để `off()` đọc lại và gỡ đúng listener đó. Vấn đề: callback đi qua ranh giới `contextBridge` không đảm bảo giữ nguyên identity, nên `off()` nhiều khi không tìm lại được property đã gắn → listener cũ **không bao giờ bị gỡ**. Mỗi lần component mount/unmount (ví dụ mở/đóng 1 Drawer) lại rò rỉ thêm 1 listener sống, khiến mỗi sự kiện bị xử lý N lần — biểu hiện ra ngoài là nội dung bị lặp/chồng chữ.

**Cách sửa:** `on()` tự trả về 1 closure hủy đăng ký thay vì yêu cầu gọi `off(channel, callback)` riêng:

```ts
on: (channel, callback) => {
  const wrapped = (_e, ...args) => callback(...args)
  ipcRenderer.on(channel, wrapped)
  return () => ipcRenderer.removeListener(channel, wrapped)
}
```

Cách này không phụ thuộc việc giữ được identity của callback qua ranh giới contextBridge — luôn đúng closure cần gỡ.

### Race điều kiện khi id được sinh ở phía nhận request thay vì phía gửi

`agent:run` chạy lâu (streaming nhiều bước) — promise của `invoke()` chỉ resolve khi **toàn bộ** lượt chat xong, trong khi mọi sự kiện trung gian (text, tool-call, reasoning...) đẩy về qua channel push riêng trong lúc đó. Nếu id để đối chiếu "sự kiện này thuộc lượt chat nào" được sinh ở main process rồi trả về trong response của `invoke()`, renderer sẽ biết id đó **sau khi lượt chat đã chạy xong** — mọi sự kiện đến trước đó bị lọc bỏ vì chưa biết so khớp với gì.

**Cách sửa:** sinh id (`crypto.randomUUID()`) ngay ở renderer, **trước khi** gọi `invoke()`, rồi gửi kèm trong payload thay vì đọc từ response.

## Thêm 1 IPC handler mới — checklist

1. Thêm hàm xử lý ở `services/` (logic thuần, test được)
2. Đăng ký `ipcMain.handle('domain:action', ...)` trong `ipc/<domain>-handlers.ts`, gọi service
3. Thêm wrapper trong `preload.ts`'s `api` object
4. Nếu cần push channel: thêm tên channel vào `ALLOWED_CHANNELS`
5. Cập nhật type `Window.api` trong `renderer/stores/profile-store.ts`
6. Restart hẳn `pnpm desktop:dev` — **`preload.ts` không hot-reload qua Vite HMR**, sửa xong phải khởi động lại app mới thấy hiệu lực
