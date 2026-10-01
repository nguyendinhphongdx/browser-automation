# Bắt đầu đóng góp code

[← Về mục lục](../README.md)

Setup máy + chạy dev đã có sẵn ở [README.md gốc](../../README.md#hướng-dẫn-development) — tài liệu này tập trung vào **quy ước code** và **cách thêm tính năng mới** theo đúng pattern repo đang dùng, để code mới viết nhất quán với phần đã có.

## Nguyên tắc chung xuyên suốt repo

- **IPC handler mỏng, logic nằm ở `services/`** — xem [architecture/03-ipc.md](../architecture/03-ipc.md)
- **Registry pattern cho mọi thứ "nhiều loại, chọn theo tên string"** — node workflow (`nodes/registry.ts`), tool AI agent (`agent/tools/registry.ts`). Thêm 1 loại mới = thêm 1 class/hàm + 1 dòng đăng ký, không sửa logic điều phối.
- **Không dùng `any` khi tránh được** — ESLint của `apps/desktop` bật `@typescript-eslint/no-explicit-any`. Chạy `pnpm --filter @browser-automation/desktop lint` trước khi coi 1 thay đổi là xong.
- **`preload.ts` không hot-reload** — sửa file này hoặc bất kỳ gì trong `main/` đều cần restart hẳn `pnpm desktop:dev`, Vite HMR chỉ áp dụng cho `renderer/`.

## Test

```bash
pnpm --filter @browser-automation/desktop exec vitest run    # chạy toàn bộ
pnpm --filter @browser-automation/desktop typecheck
pnpm --filter @browser-automation/desktop lint
```

`electron` và `better-sqlite3` (native module) được mock toàn cục ở `src/test/setup.ts` — code trong `main/**` import thẳng 2 thứ này được, Vitest chạy trên Node thuần nên cần mock để không crash lúc import. Không cần tự mock lại 2 module này trong từng test file.

## Walkthrough: thêm 1 loại node workflow mới

1. Viết class kế thừa `BaseNode` trong file phù hợp ở `main/automation/nodes/` (hoặc tạo file mới nếu là nhóm hoàn toàn mới)
2. Implement `execute()` (bắt buộc), `init()` (tuỳ chọn, validate config trước khi chạy) — xem ví dụ `OpenPageNode` ở [architecture/05-workflow-engine.md](../architecture/05-workflow-engine.md)
3. Đăng ký 1 dòng vào `NODE_REGISTRY` ở `nodes/registry.ts`
4. Thêm định nghĩa UI (label, icon, category, các field cấu hình) vào `automation/node-definitions.ts` — đây là phần hiện lên bảng chọn node bên trái canvas
5. Viết test (xem `base-node.test.ts`, `sub-workflow.test.ts` làm mẫu)

## Walkthrough: thêm 1 tool mới cho AI Agent

1. Tạo `main/agent/tools/<ten-tool>.ts`, export `createXTool(ctx: AgentToolContext)` trả `tool({ description, inputSchema, execute })`
2. Thêm vào `buildToolset()` ở `tools/registry.ts`
3. Hành động phá huỷ/không hồi phục được (xoá dữ liệu, chạy mã tuỳ ý...) → thêm tên tool vào `APPROVAL_GATED_TOOLS`
4. Viết test mock `AgentToolContext` (xem `tools/browser-tools.test.ts`) — không cần trình duyệt thật

Chi tiết đầy đủ: [architecture/06-ai-agent.md](../architecture/06-ai-agent.md).

## Walkthrough: thêm 1 IPC handler mới

Checklist đầy đủ đã viết ở [architecture/03-ipc.md](../architecture/03-ipc.md#thêm-1-ipc-handler-mới--checklist) — gồm cả 2 bug thật (rò rỉ listener, race điều kiện id) nên biết trước khi tự viết thêm push channel.

## Trước khi mở PR / commit

```bash
pnpm --filter @browser-automation/desktop typecheck
pnpm --filter @browser-automation/desktop lint
pnpm --filter @browser-automation/desktop exec vitest run
```

Không tăng số lỗi typecheck/lint so với trước khi sửa (baseline hiện tại không phải 0 — repo có nợ kỹ thuật cũ chưa dọn — nhưng code mới viết không được cộng thêm lỗi vào đó).
