****# Browser Automation Platform — Kế hoạch dự án

## 1. Tổng quan sản phẩm

Ứng dụng desktop cho phép quản lý nhiều browser profile với fingerprint riêng biệt, xây dựng và chia sẻ kịch bản automation thông qua marketplace, kết hợp quản lý tài nguyên (proxy, email, account).

### Tính năng chính

- **Profile Manager** — Tạo, clone, quản lý nhiều browser profile với fingerprint spoofing
- **Automation Builder** — Xây dựng kịch bản bằng code hoặc kéo thả (visual flow)
- **Marketplace** — Chia sẻ, mua bán kịch bản automation, ăn chia lợi nhuận
- **Resource Manager** — Quản lý proxy, email, phone, cookie, API key
- **Auth & Cloud Sync** — Đăng nhập, đồng bộ dữ liệu, chia sẻ kịch bản

---

## 2. Tech Stack

| Thành phần          | Công nghệ                          | Lý do                                         |
| ------------------- | ---------------------------------- | --------------------------------------------- |
| Desktop App         | Electron                           | Tích hợp tốt với Chromium, ecosystem lớn      |
| Frontend            | React + TypeScript                 | Component library phong phú, type-safe         |
| UI Framework        | Tailwind CSS + Shadcn/ui           | Giao diện hiện đại, sáng sủa, customizable    |
| Browser Engine      | Playwright                         | Hỗ trợ Chromium, Firefox, WebKit cùng 1 API   |
| Quản lý trình duyệt | Đa trình duyệt (Chrome, Brave, Edge, Firefox...) | Người dùng chọn trình duyệt theo nhu cầu |
| Anti-detect         | Fingerprint injection theo từng engine | Tuỳ chỉnh fingerprint cho từng loại trình duyệt |
| Visual Builder      | React Flow                         | Kéo thả node giống n8n, thư viện trưởng thành |
| Code Editor         | Monaco Editor                      | VS Code editor, IntelliSense, syntax highlight |
| Server              | Next.js (App Router)               | API routes + Landing page + Admin dashboard    |
| Local Database      | SQLite (better-sqlite3)            | Nhẹ, không cần server, phù hợp desktop        |
| Cloud Database      | PostgreSQL                         | Marketplace, user data, đáng tin cậy           |
| File Storage        | S3 / MinIO                         | Lưu kịch bản, asset                           |
| Auth                | NextAuth.js (Auth.js)              | Tích hợp tốt với Next.js, hỗ trợ OAuth        |
| Payment             | Stripe                             | Revenue split, subscription, toàn cầu          |
| Mã hoá              | AES-256 (local vault)              | Mã hoá proxy, password, cookie                 |

---

## 3. Kiến trúc hệ thống

```
┌──────────────────────────────────────────────────────────────┐
│                    DESKTOP APP (Electron)                     │
│                                                              │
│  ┌────────────┐ ┌────────────┐ ┌──────────┐ ┌────────────┐  │
│  │  Quản lý   │ │  Xây dựng  │ │ Quản lý  │ │ Marketplace│  │
│  │  Profile   │ │  Kịch bản  │ │ Tài nguyên│ │  Client    │  │
│  │            │ │            │ │          │ │            │  │
│  │ - Tạo mới  │ │ - Kéo thả  │ │ - Proxy  │ │ - Duyệt    │  │
│  │ - Clone    │ │   Flow     │ │ - Email  │ │ - Tải về   │  │
│  │ - Chỉnh sửa│ │ - Viết code│ │ - Phone  │ │ - Tải lên  │  │
│  │ - Khởi chạy│ │   Editor   │ │ - Cookie │ │ - Đánh giá │  │
│  │ - Nhóm     │ │ - Ghi lại  │ │ - API    │ │ - Doanh thu│  │
│  │ - Gắn tag  │ │ - Debug    │ │   Keys   │ │   Thống kê │  │
│  └────────────┘ └────────────┘ └──────────┘ └────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │      Đa trình duyệt (Playwright + Fingerprint)          ││
│  │  Trình duyệt hỗ trợ:                                    ││
│  │  - Chrome / Chromium    - Brave                          ││
│  │  - Microsoft Edge       - Firefox                        ││
│  │  - Opera / Vivaldi      - Tuỳ chỉnh (đường dẫn)         ││
│  │  Fingerprint spoofing:                                   ││
│  │  - Canvas spoofing      - WebGL spoofing                 ││
│  │  - Font fingerprint     - AudioContext                   ││
│  │  - Timezone/Locale      - Độ phân giải màn hình          ││
│  │  - User-Agent           - Chống rò rỉ WebRTC             ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │   Lưu trữ cục bộ (SQLite + Kho mã hoá AES-256)          ││
│  └──────────────────────────────────────────────────────────┘│
└──────────────────────────┬───────────────────────────────────┘
                           │ REST API / WebSocket
┌──────────────────────────┴───────────────────────────────────┐
│              CLOUD SERVER (Next.js App Router)                │
│                                                              │
│  ┌───────────────────────────────────────────────────────────┐│
│  │  Pages (SSR/SSG)                                         ││
│  │  - Landing page (giới thiệu sản phẩm, pricing, tải app) ││
│  │  - Admin dashboard (quản lý user, kịch bản, doanh thu)   ││
│  └───────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌──────────┐ ┌────────────┐ ┌───────────┐ ┌─────────────┐  │
│  │  Xác thực │ │ Marketplace│ │ Thanh toán│ │  Phân tích  │  │
│  │  API      │ │  API       │ │  API      │ │  API        │  │
│  │          │ │            │ │           │ │             │  │
│  │ - Login  │ │ - Kịch bản │ │ - Stripe  │ │ - Lượt tải  │  │
│  │ - OAuth  │ │ - Tìm kiếm │ │ - Chia    │ │ - Sử dụng   │  │
│  │ - JWT    │ │ - Đánh giá │ │   doanh thu│ │ - Doanh thu │  │
│  │ - Phân   │ │ - Phiên bản│ │ - Gói     │ │ - Xu hướng  │  │
│  │   quyền  │ │            │ │   thuê bao│ │             │  │
│  └──────────┘ └────────────┘ └───────────┘ └─────────────┘  │
│                                                              │
│  ┌────────────────────┐  ┌────────────────────────────────┐  │
│  │   PostgreSQL       │  │   S3 / MinIO (lưu kịch bản)    │  │
│  └────────────────────┘  └────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Chi tiết các module

### 4.1 Quản lý Profile (Profile Manager)

**Chức năng:**
- Tạo profile mới với fingerprint ngẫu nhiên hoặc tuỳ chỉnh
- **Chọn loại trình duyệt** cho từng profile (Chrome, Brave, Edge, Firefox, Opera, Vivaldi...)
- **Chọn phiên bản trình duyệt** hoặc để tự động dùng bản mới nhất
- **Tự động phát hiện** các trình duyệt đã cài trên máy người dùng
- Hỗ trợ **đường dẫn tuỳ chỉnh** tới file thực thi trình duyệt bất kỳ
- Clone profile từ profile có sẵn
- Nhóm profile theo tag, folder, màu sắc
- Gán proxy, cookie, account cho từng profile
- Export/Import profile (JSON)
- Đồng thời chạy nhiều profile (khác loại trình duyệt)

**Trình duyệt hỗ trợ:**

| Trình duyệt     | Engine   | Ghi chú                                      |
| ---------------- | -------- | --------------------------------------------- |
| Google Chrome    | Chromium | Phổ biến nhất, fingerprint database lớn       |
| Brave            | Chromium | Tích hợp sẵn chặn quảng cáo, shield          |
| Microsoft Edge   | Chromium | Phổ biến trên Windows                         |
| Opera            | Chromium | Có VPN tích hợp                               |
| Vivaldi          | Chromium | Nhiều tuỳ chỉnh giao diện                     |
| Firefox          | Gecko    | Engine khác biệt, tránh bị phát hiện Chromium |
| Chromium (thuần) | Chromium | Nhẹ, không tracking                           |
| Tuỳ chỉnh       | —        | Người dùng tự chỉ đường dẫn file thực thi     |

**Các tham số fingerprint:**
- User-Agent (tuỳ theo loại trình duyệt + phiên bản đã chọn)
- Độ phân giải màn hình + độ sâu màu
- Múi giờ + ngôn ngữ + locale
- Canvas fingerprint
- WebGL vendor + renderer
- Audio context
- Font đã cài đặt
- Thuộc tính Navigator (hardwareConcurrency, deviceMemory, platform)
- WebRTC (vô hiệu hoá hoặc giả mạo IP local/public)
- Do Not Track header

**Data model:**
```typescript
interface BrowserProfile {
  id: string
  name: string
  tags: string[]
  folder: string
  color: string
  // Cấu hình trình duyệt
  browserType: 'chrome' | 'brave' | 'edge' | 'firefox' | 'opera' | 'vivaldi' | 'chromium' | 'custom'
  browserVersion: string | 'latest'    // Phiên bản cụ thể hoặc 'latest'
  browserExecutablePath?: string        // Đường dẫn tuỳ chỉnh (nếu browserType = 'custom')
  // Fingerprint & dữ liệu
  fingerprint: Fingerprint
  proxyId: string | null
  cookies: Cookie[]
  localStorage: Record<string, string>
  notes: string
  lastUsed: Date
  createdAt: Date
}
```

### 4.2 Xây dựng kịch bản (Automation Builder)

**2 chế độ:**

#### Chế độ kéo thả (Visual Mode)
- Canvas kéo thả node, giống n8n / Node-RED
- Các nhóm node cơ bản:
  - **Trình duyệt**: Mở trang, Điều hướng, Quay lại/Tiến, Làm mới, Đóng tab
  - **Tương tác**: Click, Nhập text, Cuộn, Hover, Chọn dropdown, Upload file
  - **Dữ liệu**: Lấy text, Lấy thuộc tính, Lấy URL, Chụp màn hình, Trích xuất bảng
  - **Luồng điều khiển**: If/Else, Vòng lặp, Chờ, Delay, Switch, Try/Catch
  - **Xử lý dữ liệu**: Regex, JSON parse, Toán học, Xử lý chuỗi
  - **Tích hợp**: HTTP request, Webhook, Email, Telegram, Discord
  - **Profile**: Chuyển profile, Lấy thông tin profile
  - **Tài nguyên**: Lấy proxy, Xoay proxy, Lấy email
- Kết nối node bằng edge (đường nối)
- Xem trước / debug từng bước
- Lưu thành JSON workflow

#### Chế độ viết code (Code Mode)
- Monaco Editor với TypeScript support
- IntelliSense cho API của app (auto-complete)
- Chạy / debug trong sandbox
- Template có sẵn để bắt đầu nhanh

#### Chế độ ghi lại (Record Mode)
- Ghi lại thao tác người dùng trên browser
- Chuyển thành workflow hoặc code
- Cho phép chỉnh sửa sau khi ghi

**Workflow data model:**
```typescript
interface Workflow {
  id: string
  name: string
  description: string
  version: string
  mode: 'visual' | 'code'
  // Chế độ kéo thả
  nodes?: WorkflowNode[]
  edges?: WorkflowEdge[]
  // Chế độ viết code
  code?: string
  // Metadata
  variables: Variable[]
  settings: WorkflowSettings
  createdAt: Date
  updatedAt: Date
}

interface WorkflowNode {
  id: string
  type: string           // 'click', 'type', 'if-else', 'loop', ...
  position: { x: number, y: number }
  data: Record<string, any>
  inputs: string[]
  outputs: string[]
}
```

### 4.3 Quản lý tài nguyên (Resource Manager)

#### Quản lý Proxy
- Import proxy từ file (TXT, CSV), API, hoặc nhập tay
- Hỗ trợ HTTP, HTTPS, SOCKS4, SOCKS5
- Kiểm tra proxy sống / tốc độ / vị trí
- Tự động xoay proxy theo thời gian hoặc số request
- Gán proxy cho profile hoặc workflow
- Hiển thị trạng thái: sống, chết, tốc độ, quốc gia

#### Quản lý Email / Account
- Import email từ file CSV
- Lưu trữ: email, mật khẩu, email khôi phục, số điện thoại
- Trạng thái: hoạt động, bị khoá, cần xác minh
- Gán email cho profile
- Nhóm theo nhà cung cấp (Gmail, Outlook, Yahoo...)

#### Quản lý Cookie
- Import/Export cookie (JSON, Netscape format)
- Xem, sửa, xoá cookie theo profile
- Chia sẻ cookie giữa các profile

### 4.4 Chợ kịch bản (Marketplace)

**Cho người bán (Script Creator):**
- Upload workflow/script
- Đặt giá hoặc miễn phí
- Viết mô tả, ảnh chụp màn hình, video demo
- Quản lý phiên bản
- Xem thống kê: lượt tải, doanh thu, đánh giá

**Cho người mua:**
- Tìm kiếm theo danh mục, tag, đánh giá
- Xem đánh giá, mô tả, demo
- Tải về và cài đặt 1-click
- Đánh giá và nhận xét sau khi dùng

**Chia sẻ doanh thu:**
- Mặc định: 70% cho người bán, 30% cho nền tảng
- Thanh toán qua Stripe Connect
- Dashboard thống kê doanh thu
- Rút tiền theo tháng

**Danh mục gợi ý:**
- Mạng xã hội (Facebook, Instagram, TikTok, Twitter...)
- Thương mại điện tử (Shopee, Lazada, Amazon, eBay...)
- SEO & Marketing
- Thu thập dữ liệu (Data Scraping)
- Quản lý tài khoản
- Tiện ích

### 4.5 Xác thực & Hệ thống người dùng

- Đăng ký / Đăng nhập (email + mật khẩu)
- OAuth: Google, GitHub
- Vai trò: Người dùng miễn phí, Người dùng Pro, Nhà sáng tạo, Quản trị viên
- Gói thuê bao:
  - **Miễn phí**: 3 profile, automation cơ bản, không được upload lên marketplace
  - **Pro**: Không giới hạn profile, đầy đủ automation, truy cập marketplace
  - **Nhà sáng tạo**: Pro + upload lên marketplace + dashboard doanh thu

---

## 5. Cấu trúc thư mục dự kiến

```
browser-automation/
├── apps/
│   ├── desktop/                  # Ứng dụng Electron
│   │   ├── src/
│   │   │   ├── main/             # Electron main process
│   │   │   │   ├── index.ts
│   │   │   │   ├── ipc/          # IPC handlers
│   │   │   │   ├── browser/      # Browser engine, fingerprint
│   │   │   │   ├── database/     # SQLite, migrations
│   │   │   │   └── services/     # Các service: profile, proxy, automation
│   │   │   ├── renderer/         # React frontend
│   │   │   │   ├── components/   # Component UI dùng chung
│   │   │   │   ├── pages/
│   │   │   │   │   ├── profiles/
│   │   │   │   │   ├── automation/
│   │   │   │   │   ├── resources/
│   │   │   │   │   ├── marketplace/
│   │   │   │   │   └── settings/
│   │   │   │   ├── stores/       # Quản lý state (Zustand)
│   │   │   │   ├── hooks/
│   │   │   │   └── lib/
│   │   │   └── shared/           # Types và utils dùng chung
│   │   ├── resources/            # Icon, ảnh, asset
│   │   └── package.json
│   │
│   └── server/                   # Next.js server (API + Landing + Admin)
│       ├── app/
│       │   ├── (landing)/        # Landing page (giới thiệu, pricing, tải app)
│       │   ├── (admin)/          # Admin dashboard (quản lý user, kịch bản, doanh thu)
│       │   │   ├── dashboard/
│       │   │   ├── users/
│       │   │   ├── scripts/
│       │   │   └── revenue/
│       │   └── api/              # API routes cho desktop app + marketplace
│       │       ├── auth/
│       │       ├── marketplace/
│       │       ├── payment/
│       │       └── analytics/
│       ├── components/           # Shared UI components (Shadcn/ui)
│       ├── lib/                  # Utils, database client, auth helpers
│       └── package.json
│
├── packages/
│   ├── shared-types/             # TypeScript types dùng chung
│   ├── automation-engine/        # Lõi chạy automation
│   ├── fingerprint/              # Tạo và giả mạo fingerprint
│   └── workflow-nodes/           # Định nghĩa các node có sẵn
│
├── scripts/                      # Script build, deploy
├── docs/                         # Tài liệu
├── PLAN.md                       # File này
├── package.json                  # Monorepo root (pnpm workspaces)
└── turbo.json                    # Cấu hình Turborepo
```

---

## 6. Lộ trình phát triển

### Phase 1 — Server & Landing Page (2-3 tuần)

**Mục tiêu:** Dựng Next.js server với landing page, auth, và admin dashboard cơ bản.

- [x] Khởi tạo monorepo (pnpm + Turborepo)
- [x] Setup Next.js 16 (App Router + Turbopack) + Tailwind v4 + Shadcn/ui v4
- [x] Setup PostgreSQL + Prisma v7 (adapter-pg)
- [x] Landing page: hero (gradient glow), features, how it works, quick start, pricing, download, footer
- [x] Xác thực: đăng ký, đăng nhập, OAuth Google + GitHub (NextAuth v5 / Auth.js)
- [x] Admin dashboard: layout sidebar + 4 trang (dashboard, users, scripts, revenue)
- [ ] Deploy lên Vercel / VPS

### Phase 2 — Desktop App & Quản lý Profile (4-6 tuần)

**Mục tiêu:** Chạy được app Electron, tạo và khởi chạy browser profile với fingerprint spoofing.

- [x] Setup Electron + React + TypeScript + Tailwind + Shadcn/ui
- [x] Thiết kế layout chính (sidebar, header, vùng nội dung)
- [x] Setup SQLite database + migrations
- [x] CRUD browser profile
- [x] Engine tạo fingerprint (tuỳ theo loại trình duyệt)
- [x] Tự động phát hiện các trình duyệt đã cài trên máy
- [x] Khởi chạy browser với Playwright (Chrome, Brave, Edge, Firefox...) + inject fingerprint
- [x] Hỗ trợ đường dẫn trình duyệt tuỳ chỉnh
- [x] Giao diện danh sách profile (dạng bảng + dạng lưới)
- [x] Form chi tiết / chỉnh sửa profile (CreateProfileDialog)
- [ ] Kết nối desktop app với server (auth, sync)

### Phase 3 — Quản lý tài nguyên (2-3 tuần)

**Mục tiêu:** Quản lý proxy, email, cookie đầy đủ.

- [x] Quản lý proxy: CRUD, import, kiểm tra sống, đo tốc độ
- [x] Quản lý email/account: CRUD, import CSV
- [x] Quản lý cookie: import/export, xem/sửa
- [x] Gán proxy + email cho profile
- [x] Giao diện cho từng loại tài nguyên
- [x] Kho mã hoá cho dữ liệu nhạy cảm

### Phase 4 — Xây dựng kịch bản (6-8 tuần)

**Mục tiêu:** Xây dựng và chạy kịch bản automation bằng code và kéo thả.

- [x] Lõi engine automation (chạy workflow)
- [x] Chế độ viết code với Monaco Editor
- [x] API helpers + IntelliSense cho automation
- [x] Chế độ kéo thả với React Flow
- [x] Các node cơ bản: Trình duyệt, Tương tác, Dữ liệu, Luồng điều khiển
- [x] Panel thuộc tính node (cấu hình từng node)
- [x] Chế độ debug: chạy từng bước, xem log
- [ ] Chế độ ghi lại: ghi thao tác → workflow
- [x] Lưu / tải workflow
- [x] Chạy workflow trên nhiều profile đồng thời

### Phase 5 — Marketplace (4-6 tuần)

**Mục tiêu:** Hệ thống mua bán và chia sẻ kịch bản.

- [ ] Marketplace API: upload, tìm kiếm, tải về, đánh giá
- [x] Giao diện Marketplace trong desktop app
- [x] Quản lý phiên bản kịch bản
- [ ] Hệ thống đánh giá & nhận xét
- [ ] Tích hợp Stripe: thanh toán, chia doanh thu
- [ ] Admin dashboard: duyệt kịch bản, thống kê doanh thu
- [ ] Dashboard nhà sáng tạo: thống kê doanh thu cá nhân

### Phase 6 — Hoàn thiện & Ra mắt (2-4 tuần)

**Mục tiêu:** Hoàn thiện, kiểm thử, và phát hành bản beta.

- [ ] Tự động cập nhật (electron-updater)
- [ ] Luồng hướng dẫn cho người dùng mới
- [x] Phím tắt
- [x] Giao diện sáng / tối (Dark mode / Light mode)
- [x] Đa ngôn ngữ (Tiếng Việt, English)
- [ ] Tối ưu hiệu năng
- [x] Kiểm tra bảo mật
- [ ] Tài liệu hướng dẫn sử dụng
- [ ] Phát hành bản beta

---

## 7. Ưu tiên kỹ thuật

- **Bảo mật:** Mã hoá dữ liệu nhạy cảm (proxy, mật khẩu, cookie) bằng AES-256. Không lưu dạng plaintext.
- **Hiệu năng:** Lazy loading, virtualized list cho dữ liệu lớn. Web Worker cho tác vụ nặng.
- **Trải nghiệm người dùng:** Responsive layout, phím tắt, kéo thả, thông báo toast.
- **Khả năng mở rộng:** Hệ thống plugin cho node mới, cho phép cộng đồng đóng góp.
- **Kiểm thử:** Unit test (Vitest), E2E test (Playwright), CI/CD (GitHub Actions).

---

## 8. Rủi ro và giải pháp

| Rủi ro                                         | Giải pháp                                                  |
| ---------------------------------------------- | ---------------------------------------------------------- |
| Anti-detect bị phát hiện bởi nền tảng          | Cập nhật fingerprint thường xuyên, theo dõi thay đổi       |
| Playwright bị chặn                             | Stealth plugin, delay ngẫu nhiên, hành vi giống người thật |
| Marketplace bị lạm dụng (kịch bản độc hại)     | Quy trình duyệt, chạy trong sandbox, hệ thống báo cáo     |
| Dữ liệu người dùng bị rò rỉ                   | Mã hoá, lưu trữ an toàn, nhật ký kiểm tra                 |
| App quá nặng (Electron)                        | Lazy loading, chia nhỏ bundle, tối ưu hoá                  |
| Vấn đề pháp lý                                | Điều khoản dịch vụ rõ ràng, tuyên bố miễn trừ             |
