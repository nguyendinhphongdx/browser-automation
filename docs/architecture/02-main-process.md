# Main process

[← Về mục lục](../README.md)

`apps/desktop/src/main/` là toàn bộ code chạy trong tiến trình Node.js của Electron — nơi duy nhất có quyền đụng vào filesystem, SQLite, và điều khiển trình duyệt thật.

```
main/
├── index.ts              # Entry point: khởi tạo DB, đăng ký IPC handlers, vòng đời app
├── preload.ts             # Cầu nối an toàn renderer ↔ main (contextBridge)
├── database/
│   └── init.ts            # Tạo schema SQLite, seed profile mặc định
├── browser/
│   ├── launcher.ts         # launchBrowser/closeBrowser/acquireBrowserPage — quản lý process trình duyệt
│   ├── detect.ts           # Dò trình duyệt đã cài trên máy
│   └── fingerprint.ts      # Áp fingerprint vào context Playwright
├── automation/             # Workflow engine — xem 05-workflow-engine.md
│   ├── engine.ts            # Orchestrator: duyệt graph node, xử lý branching/parallel
│   ├── nodes/                # 1 class/node-type, implement BaseNode
│   ├── scheduler.ts          # Cron/webhook trigger chạy workflow tự động
│   ├── campaign-engine.ts    # Chạy 1 workflow trên nhiều profile
│   └── recorder.ts           # Ghi thao tác Playwright → danh sách action
├── agent/                  # AI Agent — xem 06-ai-agent.md
│   ├── agent-service.ts       # Facade: vòng đời 1 lượt chat với LLM
│   ├── model-provider.ts      # Factory: setting → AI SDK LanguageModel
│   ├── ag-ui-adapter.ts       # Adapter: AI SDK stream → AG-UI event
│   ├── browser-preview-service.ts  # Facade: CDP screencast cho live view
│   └── tools/                  # 1 file/tool mà agent có thể gọi
├── services/                # Business logic thuần, không biết gì về IPC
│   ├── profile-service.ts, proxy-service.ts, email-service.ts...
│   ├── encryption.ts          # AES-256-GCM cho mật khẩu proxy/email
│   └── workflow-service.ts
└── ipc/                     # 1 file/nhóm tính năng, đăng ký ipcMain.handle()
    ├── profile-handlers.ts, browser-handlers.ts, agent-handlers.ts...
```

## Nguyên tắc phân lớp

**`ipc/*-handlers.ts` mỏng — chỉ parse input, gọi `services/`, trả kết quả.** Logic nghiệp vụ thật nằm ở `services/`, không nằm trong handler. Lý do: `services/` có thể test bằng Vitest mà không cần mock Electron; handler thì phải mock `ipcMain`/`electron`.

```ts
// ipc/profile-handlers.ts — mỏng
ipcMain.handle('profile:create', (_e, data) => createProfile(data))

// services/profile-service.ts — logic thật, test được độc lập
export function createProfile(data: CreateProfileInput): BrowserProfile { ... }
```

## Vòng đời app (`index.ts`)

1. `app.whenReady()` → `initDatabase()` → đăng ký toàn bộ `register*Handlers(ipcMain)`
2. Tạo `BrowserWindow`, load renderer
3. Khởi động `scheduler` (cron) và `webhook-server` (HTTP endpoint nhận webhook trigger) chạy nền
4. `before-quit`: dừng scheduler/webhook, `browserPreviewService.stopAll()`, `closeAllBrowsers()`, `closeDatabase()` — theo đúng thứ tự để không rò rỉ process con khi thoát app

## `preload.ts` — cổng duy nhất renderer được phép đi qua

Renderer **không bao giờ** `require('electron')` hay import trực tiếp code main process — mọi thứ đi qua `window.api` do `preload.ts` expose bằng `contextBridge.exposeInMainWorld`. Hai kiểu giao tiếp:

- **Request/response**: `ipcRenderer.invoke(channel, payload)` — dùng cho hầu hết thao tác (CRUD, chạy workflow...)
- **Push**: main tự gửi event sang renderer qua `event.sender.send(channel, data)`, renderer nghe bằng `window.api.on(channel, cb)` — dùng cho log real-time, tiến độ node, stream của AI Agent

Chi tiết quy ước đặt tên và cách tránh rò rỉ listener: [03-ipc.md](03-ipc.md).
