# BrowserAuto

Nền tảng quản lý nhiều browser profile với fingerprint riêng biệt, xây dựng kịch bản automation và chia sẻ qua marketplace.

## Tính năng

- **Profile Manager** — Tạo, clone, quản lý browser profile với fingerprint spoofing (Chrome, Brave, Edge, Firefox, Opera, Vivaldi, Chromium)
- **Automation Builder** — Kéo thả (React Flow) hoặc viết code (Monaco Editor) + Record mode ghi thao tác trực tiếp
- **Resource Manager** — Quản lý proxy (HTTP/SOCKS), email, cookie, mã hoá AES-256
- **Marketplace** — Upload, tìm kiếm, đánh giá, mua bán kịch bản với chia doanh thu 70/30
- **Cloud Sync** — Đồng bộ profile lên server, auth JWT
- **Auto Update** — Tự động cập nhật qua GitHub Releases

## Tech Stack

| Thành phần | Công nghệ |
|---|---|
| Desktop App | Electron + React 18 + TypeScript + Tailwind + Shadcn/ui |
| Browser Engine | Playwright Core (đa trình duyệt) |
| Visual Builder | React Flow |
| Code Editor | Monaco Editor |
| Local DB | SQLite (better-sqlite3, WAL mode) |
| Server | Next.js 16 (App Router) + Prisma + PostgreSQL |
| Auth | NextAuth.js v5 + JWT (jose) |
| Payment | Stripe (placeholder) |
| Monorepo | pnpm workspaces + Turborepo |
| CI/CD | GitHub Actions + electron-builder |

## Cấu trúc dự án

```
browser-automation/
├── apps/
│   ├── desktop/              # Electron desktop app
│   │   ├── src/
│   │   │   ├── main/         # Main process (IPC, browser, DB, services)
│   │   │   ├── renderer/     # React frontend (pages, stores, components)
│   │   │   └── shared/       # Types dùng chung
│   │   └── package.json
│   └── server/               # Next.js server (submodule)
│       ├── src/app/          # Pages + API routes
│       ├── prisma/           # Database schema
│       └── package.json
├── packages/
│   ├── shared-types/         # TypeScript types dùng chung
│   └── fingerprint/          # Fingerprint generation + injection
├── docs/                     # Tài liệu hướng dẫn
├── .github/workflows/        # CI/CD
├── PLAN.md                   # Kế hoạch dự án chi tiết
└── package.json              # Monorepo root
```

---

## Hướng dẫn Development

### Yêu cầu

- **Node.js** >= 22
- **pnpm** >= 10
- **Git** (với submodule support)
- **PostgreSQL** (cho server, có thể dùng Docker)

### 1. Clone repo

```bash
git clone --recurse-submodules https://github.com/<owner>/browser-automation.git
cd browser-automation
```

Nếu đã clone rồi nhưng thiếu submodule:

```bash
git submodule update --init --recursive
```

### 2. Cài dependencies

```bash
pnpm install
```

### 3. Chạy Desktop App

```bash
pnpm desktop:dev
```

App Electron sẽ mở với hot reload. Dữ liệu lưu trong SQLite tại `userData/browser-automation.db`.

### 4. Chạy Server

```bash
cd apps/server

# Copy env
cp .env.example .env
# Sửa DATABASE_URL, AUTH_SECRET, JWT_SECRET trong .env

# Tạo database
npx prisma db push

# Chạy dev
pnpm dev
```

Server chạy tại `http://localhost:3000` với:
- Landing page: `/`
- Login/Signup: `/login`, `/signup`
- Admin: `/admin`
- Creator dashboard: `/creator`
- API: `/api/*`

### 5. Biến môi trường Server (.env)

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/browser_automation"

# Auth.js
AUTH_SECRET="generate-with-npx-auth-secret"
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
AUTH_GITHUB_ID=""
AUTH_GITHUB_SECRET=""

# JWT cho desktop API
JWT_SECRET="random-secret-here"

# Stripe (tuỳ chọn)
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
NEXT_PUBLIC_URL="http://localhost:3000"
```

### 6. Build Desktop App

```bash
# Build code
pnpm desktop:build

# Đóng gói installer
cd apps/desktop
npx electron-builder --linux    # hoặc --win, --mac
```

Output trong `apps/desktop/dist-electron/`.

---

## Packages

### `@browser-automation/shared-types`

Types dùng chung giữa desktop và server:

```typescript
import type { BrowserProfile, Fingerprint, Workflow } from '@browser-automation/shared-types'
```

### `@browser-automation/fingerprint`

Engine tạo và inject fingerprint:

```typescript
import { generateFingerprint, buildFingerprintScript } from '@browser-automation/fingerprint'

const fp = generateFingerprint('chrome')
const script = buildFingerprintScript(fp)
```

---

## API Routes (Server)

### Auth
| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/api/auth/signup` | Đăng ký (trả JWT) |
| POST | `/api/auth/login` | Đăng nhập (trả JWT) |
| GET | `/api/auth/me` | Lấy user info từ Bearer token |
| GET | `/api/health` | Health check |

### Profile Sync
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/profiles/sync` | Lấy profiles đã sync |
| POST | `/api/profiles/sync` | Đồng bộ profiles từ desktop |
| DELETE | `/api/profiles/sync` | Xoá profile đã sync |

### Marketplace
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/marketplace/scripts` | Tìm kiếm scripts |
| POST | `/api/marketplace/scripts` | Upload script mới |
| GET | `/api/marketplace/scripts/[id]` | Chi tiết script |
| PATCH | `/api/marketplace/scripts/[id]` | Cập nhật script |
| DELETE | `/api/marketplace/scripts/[id]` | Xoá script |
| POST | `/api/marketplace/scripts/[id]/download` | Tải script |
| GET | `/api/marketplace/scripts/[id]/reviews` | Lấy reviews |
| POST | `/api/marketplace/scripts/[id]/reviews` | Viết review |

### Admin (role = ADMIN)
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/admin/stats` | Thống kê tổng quan |
| GET | `/api/admin/scripts` | Danh sách scripts |
| PATCH | `/api/admin/scripts/[id]` | Duyệt/từ chối script |

### Creator
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/creator/stats` | Thống kê doanh thu cá nhân |

### Payment
| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/api/payment/checkout` | Tạo Stripe checkout |
| POST | `/api/payment/webhook` | Stripe webhook |

---

## CI/CD

### CI (mỗi push/PR)

Type check + build desktop app.

### Release (khi push tag `v*`)

```bash
git tag v0.1.0-beta
git push origin v0.1.0-beta
```

GitHub Actions tự động:
1. Build cho Linux (AppImage, .deb), macOS (.dmg), Windows (.exe)
2. Tạo GitHub Release với tất cả artifacts
3. Tag chứa `beta`/`alpha` → đánh dấu prerelease

Desktop app dùng `electron-updater` tự động kiểm tra và tải cập nhật từ GitHub Releases.

---

## Phím tắt (Desktop App)

| Phím | Chức năng |
|------|-----------|
| `Ctrl+N` | Tạo profile mới |
| `Ctrl+S` | Lưu workflow |
| `Ctrl+Shift+R` | Chạy workflow |
| `Ctrl+F` | Tìm kiếm |
| `Ctrl+,` | Mở cài đặt |
| `Ctrl+1-5` | Chuyển tab |

---

## Tài liệu

- [PLAN.md](PLAN.md) — Kế hoạch dự án chi tiết
- [docs/GUIDE.md](docs/GUIDE.md) — Hướng dẫn sử dụng

## License

ISC
