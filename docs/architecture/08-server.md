# Server

[← Về mục lục](../README.md)

`apps/server` là Next.js 16 (App Router) — lớp dịch vụ cloud **tuỳ chọn**: xác thực, backup profile, marketplace. Không chạy bất kỳ automation nào — mọi thao tác trình duyệt luôn chạy trên máy người dùng (desktop app).

## Cấu trúc route

```
app/
├── (auth)/              # login, signup, desktop-login — route group không ảnh hưởng URL
├── (creator)/creator     # Dashboard người bán script
├── admin/                # dashboard, revenue, scripts, users — cần role ADMIN
└── api/
    ├── auth/              # [...nextauth], login, signup, me, refresh, desktop-token
    ├── profiles/           # sync, backup
    ├── marketplace/scripts/
    ├── payment/            # checkout, webhook (Stripe)
    ├── admin/              # scripts, stats
    ├── creator/stats
    └── health
```

## 2 cơ chế xác thực song song

Desktop app không tiện dùng cookie session kiểu web, nên server chấp nhận **cả hai**:

1. **Bearer JWT riêng** (`Authorization: Bearer <token>`) — desktop app đăng nhập 1 lần, lưu token, đính kèm mọi request sau đó qua `apiRequest()` ở `main/services/api-client.ts`
2. **NextAuth v5 session cookie** — web UI (trang admin, trang creator) dùng session bình thường, không cần tự quản lý token

`lib/api-auth.ts`'s `getRequestUser()` thử Bearer JWT trước, không có thì fallback sang session — mọi route API dùng chung 1 hàm này, không tự viết lại logic xác thực ở từng route.

```ts
export async function getRequestUser(request: Request): Promise<RequestUser | null> {
  const jwtUser = await getUserFromRequest(request)
  if (jwtUser) return jwtUser
  const session = await auth()
  return session?.user?.id ? session.user : null
}
```

`requireAdmin()` (cùng file) dùng thêm bước kiểm tra `role === 'ADMIN'` — `admin/layout.tsx` gọi hàm này ở server component, chặn truy cập trước khi render bất kỳ page con nào trong `/admin/*`.

## Database — Prisma + PostgreSQL

```
User ──┬── Account, Session (NextAuth)
        ├── Script (đã đăng bán)
        ├── Review (đã viết)
        └── ProfileBackup (đã backup)

Script ── Review (1-nhiều, unique theo [scriptId, userId] — 1 user review 1 script đúng 1 lần)
```

`Role` enum: `USER` → `PRO` → `CREATOR` → `ADMIN`. `ScriptStatus` enum: `PENDING` → `APPROVED`/`REJECTED` — script mới đăng luôn ở trạng thái chờ duyệt, không hiện công khai ngay.

## Thanh toán — Stripe webhook

`/api/payment/webhook` xác thực chữ ký Stripe (`stripe.webhooks.constructEvent()`) trước khi xử lý — từ chối thẳng (400) nếu chữ ký sai, trả 501 nếu chưa cấu hình `STRIPE_WEBHOOK_SECRET`, thay vì tin tưởng mù payload gửi tới (webhook endpoint là mục tiêu giả mạo phổ biến nếu không verify chữ ký).

## Build & deploy

- Dev: `cd apps/server && pnpm dev` (cần `DATABASE_URL`, `AUTH_SECRET`, `JWT_SECRET` trong `.env`)
- Schema thay đổi: sửa `prisma/schema.prisma` → `npx prisma db push` (dev) hoặc migration thật cho production
- CI chỉ typecheck + build desktop app — server build/deploy là quy trình riêng, không nằm trong `.github/workflows/` hiện tại
