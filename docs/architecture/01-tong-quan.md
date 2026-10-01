# Tổng quan kiến trúc

[← Về mục lục](../README.md)

## Monorepo

```
browser-automation/
├── apps/
│   ├── desktop/     # Electron app — nơi chạy phần lớn logic
│   └── server/      # Next.js — cloud sync, marketplace, auth
├── packages/
│   ├── shared-types/   # Type dùng chung desktop ↔ server
│   └── fingerprint/    # Sinh + inject fingerprint
└── docs/
```

Quản lý bằng **pnpm workspaces** + **Turborepo** (`turbo.json` định nghĩa task `build`/`dev`/`typecheck` chạy xuyên các package, cache kết quả).

## Hai ứng dụng, hai vai trò khác biệt

### Desktop app (`apps/desktop`) — nơi mọi thứ thực sự chạy

- Lưu trữ dữ liệu **cục bộ** (SQLite) — profile, workflow, proxy, email, cookie, log
- Tự điều khiển trình duyệt thật qua **Playwright** (không phải headless — người dùng thấy cửa sổ trình duyệt mở lên)
- Chạy **AI Agent** ngay trong app (gọi thẳng API của nhà cung cấp LLM từ main process, không qua server riêng)
- Hoạt động **offline hoàn toàn** — server là tuỳ chọn

### Server (`apps/server`) — lớp dịch vụ cloud tuỳ chọn

- Xác thực người dùng (NextAuth v5 + JWT riêng cho desktop)
- Backup profile lên cloud storage
- Marketplace: đăng/tải/đánh giá workflow, thanh toán qua Stripe
- Không bao giờ chạy automation thay desktop — server chỉ lưu trữ và điều phối dữ liệu

## Vì sao tách process process như vậy trong desktop app

Electron desktop app tự nó lại chia làm 2 tiến trình (xem [02-main-process.md](02-main-process.md)):

- **Main process** (Node.js): có quyền truy cập filesystem, SQLite, và điều khiển Playwright — không cho phép renderer gọi trực tiếp vì lý do bảo mật (renderer render HTML/JS gần giống trình duyệt thường, không nên có quyền hệ thống)
- **Renderer process** (Chromium + React): chỉ vẽ giao diện, mọi thao tác với dữ liệu/trình duyệt đều phải đi qua **IPC** (xem [03-ipc.md](03-ipc.md)) gọi sang main process

## Luồng dữ liệu tổng thể (ví dụ: chạy 1 workflow)

```
User bấm Run (renderer)
  → IPC invoke 'workflow:run' (preload cầu nối an toàn)
    → main process: workflow-service đọc workflow từ SQLite
      → automation/engine.ts: duyệt qua node theo đồ thị nodes+edges
        → mỗi node gọi Playwright thao tác trên trang thật
      → log từng bước được đẩy real-time về renderer qua kênh push
  ← renderer nhận log, cập nhật UI (panel log, node sáng theo tiến độ)
```

## Đọc tiếp

- [Main process](02-main-process.md) — cấu trúc thư mục, service layer
- [IPC](03-ipc.md) — quy ước giao tiếp 2 tiến trình
- [Database](04-database.md) — schema SQLite đầy đủ
- [Workflow Engine](05-workflow-engine.md) — cách 1 workflow thực sự được chạy
- [AI Agent](06-ai-agent.md) — kiến trúc agent, tool, approval, live preview
- [Fingerprint](07-fingerprint.md) — chống phát hiện automation
- [Server](08-server.md) — Next.js, Prisma, auth, marketplace
