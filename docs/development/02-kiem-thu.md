# Kiểm thử

[← Về mục lục](../README.md)

Dùng **Vitest**, cấu hình riêng ở `vitest.config.ts` (không dùng `electron-vite`'s config — code test chạy trên Node thuần, không cần JSX/DOM):

```ts
test: {
  environment: 'node',
  include: ['src/**/*.test.ts'],
  setupFiles: ['./src/test/setup.ts'],
  globals: false,    // phải tự import describe/it/expect, không dùng global
  clearMocks: true,  // tự reset mock giữa các test, khỏi afterEach(() => vi.clearAllMocks())
}
```

## Hiện trạng: chỉ có test cho `main/`, chưa có test cho `renderer/`

```
find src/renderer -name "*.test.ts*"   →  0 kết quả
find src/main src/shared -name "*.test.ts"  →  9 file
```

`environment: 'node'` (không phải `jsdom`) nghĩa là cấu hình hiện tại **không chạy được** test cần DOM (test component React). Toàn bộ 67 test hiện có đều kiểm logic thuần ở `main/` (node registry, workflow engine, AI agent service, validate patch) — UI chưa có test tự động nào, verify bằng tay qua `pnpm desktop:dev`. Đây là khoảng trống thật trong coverage, không phải lựa chọn có chủ đích bỏ qua renderer mãi mãi — muốn thêm test renderer sẽ cần 1 `vitest.config.ts` riêng (hoặc `environment: 'jsdom'` theo từng file) cộng `@testing-library/react`.

## Mock `electron` và `better-sqlite3` toàn cục

`src/test/setup.ts` mock 2 module này 1 lần cho **mọi** test file — lý do nêu ngay trong comment đầu file: code ở `main/**` import `electron` trực tiếp (ví dụ `app.getPath`), và qua chuỗi import bắc cầu (`base-node.ts` → `metrics-service.ts` → `database/init.ts`) kéo theo `better-sqlite3` — 1 native addon build riêng cho ABI của Electron, **crash khi load dưới Node thuần** mà Vitest chạy. Dù phần lớn test không thật sự cần 2 thứ này, chúng vẫn bị import ở top-level nên cần mock nhẹ để qua được bước import, không phải vì logic test cần giả lập DB/Electron thật.

```ts
vi.mock('electron', () => ({
  app: { getPath: (name) => path.join(os.tmpdir(), 'browser-automation-test', name) },
  ipcMain: { handle: vi.fn(), on: vi.fn(), removeHandler: vi.fn() },
  BrowserWindow: class { static getAllWindows() { return [] } },
  dialog: { showSaveDialog: vi.fn()..., showOpenDialog: vi.fn()... },
}))
```

**Không cần tự mock lại `electron`/`better-sqlite3` trong từng test file** — setup toàn cục đã lo, tự mock lại chỉ gây xung đột mock.

## Mock theo tầng — ví dụ thật từ `agent-service.test.ts`

```ts
vi.mock('./model-provider', () => ({ resolveAgentModel: vi.fn(() => fakeModel) }))
vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, ToolLoopAgent: vi.fn(() => ({ stream: streamImpl })) }
})
```

Mock **đúng 1 tầng ngay dưới** code đang test (ở đây: `agent-service.ts` test logic vòng lặp approval của chính nó, không test thật `ToolLoopAgent` của package `ai` — điều đó là trách nhiệm của test AI SDK, không phải của repo này). Mock `ai` nhưng vẫn giữ `importOriginal()` cho các export khác không liên quan (type, helper khác) — tránh phải mock lại toàn bộ API mặt của package chỉ để thay 1 class.

## Chạy test

```bash
pnpm --filter @browser-automation/desktop exec vitest run      # toàn bộ, 1 lần
pnpm --filter @browser-automation/desktop exec vitest          # watch mode
pnpm --filter @browser-automation/desktop exec vitest run <đường-dẫn-file>   # 1 file
```

> Lưu ý: `pnpm --filter @browser-automation/desktop test run` (không có `exec`) bị hiểu nhầm — `run` bị truyền vào làm **filter tên file** cho script `test` (vốn đã là `vitest run`), không phải chạy toàn bộ. Dùng `vitest run` qua `exec` như trên để chắc chắn chạy hết.
