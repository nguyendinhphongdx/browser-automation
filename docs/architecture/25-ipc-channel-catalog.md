# Danh mục IPC channel

[← Về mục lục](../README.md)

Toàn bộ channel thật đang đăng ký, trích trực tiếp từ `ipc/*.ts` và `preload.ts`'s `ALLOWED_CHANNELS` — tránh phải tự `grep` lại mỗi khi cần tra 1 channel có tồn tại chưa. Quy ước đặt tên và cách dùng: [03-ipc.md](03-ipc.md).

## Request/response (`ipcMain.handle` + `invoke`)

| Domain | Channel |
|---|---|
| `profile` | `getAll` `get` `create` `update` `delete` `duplicate` |
| `browser` | `launch` `close` `detect` |
| `browserPreview` | `start` `stop` |
| `proxy` | `getAll` `get` `create` `update` `delete` `check` `import` `importFile` |
| `email` | `getAll` `get` `create` `update` `delete` `importCSV` |
| `cookie` | `getAll` `get` `getByProfile` `create` `update` `delete` `import` `export` |
| `workflow` | `getAll` `get` `create` `update` `delete` `duplicate` `export` `import` `getLogs` `run` `stop` `getVersions` `getVersion` `rollback` `labelVersion` |
| `automation` | `getNodeDefinitions` `getNodeCategories` |
| `recorder` | `start` `stop` `status` `toWorkflow` |
| `campaign` | `getAll` `get` `create` `update` `delete` `duplicate` `getRuns` `run` `stop` `pause` `resume` |
| `schedule` | `getAll` `get` `create` `update` `delete` `toggle` `trigger` `webhookPort` |
| `metrics` | `nodeStats` `nodeInstanceStats` `executionHistory` `cleanup` |
| `backup` | `export` `exportAll` `import` `upload` `download` `status` |
| `settings` | `get` `getAll` `set` `setBatch` |
| `auth` | `login` `register` `logout` `check` `testConnection` `openBrowser` |
| `ai` | `testConnection` |
| `agent` | `run` `respondApproval` `cancel` |
| `api` | `request` (proxy chung, giới hạn method + prefix path ở `preload.ts`) |
| `app` | `getDbPath` |

## Push (`event.sender.send` + `window.api.on`)

```ts
const ALLOWED_CHANNELS = new Set([
  'auth:deeplink-success', 'recorder:action',
  'workflow:node-progress', 'workflow:status',
  'campaign:results', 'campaign:profile-progress', 'campaign:status', 'campaign:node-progress',
  'updater:downloading', 'updater:progress',
  'agent:event', 'browserPreview:frame',
])
```

Đây là **toàn bộ** channel push hợp lệ — `window.api.on('tên-khác', ...)` bị từ chối ngay ở preload, không chạm tới `ipcRenderer.on` thật (xem lý do thiết kế ở [03-ipc.md](03-ipc.md)).

## Thêm channel mới — nhớ cả 2 phía

Thiếu 1 trong 3 bước sau là lỗi phổ biến nhất khi thêm tính năng mới: đăng ký `ipcMain.handle` ở main, thêm wrapper trong `preload.ts`'s `api` object, cập nhật type `Window.api` ở `renderer/stores/profile-store.ts`. Riêng channel push còn cần thêm bước 4: thêm tên vào `ALLOWED_CHANNELS`.
