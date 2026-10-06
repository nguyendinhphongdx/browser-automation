# Service layer pattern

[← Về mục lục](../README.md)

Mọi `main/services/*-service.ts` theo cùng 1 khuôn: hàm thuần (không nhận `ipcMain`/`event`), tự lấy `getDatabase()`, trả về type đã parse sẵn (không trả raw SQLite row). `ipc/*-handlers.ts` chỉ gọi thẳng các hàm này — xem [02-main-process.md](02-main-process.md).

```ts
export function getAllProxies(): Proxy[] { ... }
export function getProxyById(id: string): Proxy | null { ... }
export function createProxy(input: CreateProxyInput): Proxy { ... }
export function updateProxy(id: string, input: UpdateProxyInput): Proxy | null { ... }
export function deleteProxy(id: string): boolean { ... }
```

`profile-service.ts`, `proxy-service.ts`, `email-service.ts`, `cookie-service.ts`, `workflow-service.ts`... đều lặp lại đúng bộ hàm `getAll/getById/create/update/delete` này — không có 1 `BaseService` chung hay generic CRUD factory. Lặp lại có chủ đích: mỗi bảng có field/validate riêng đủ khác nhau (ví dụ `proxy` cần `checkProxy()` riêng, `email` cần parse CSV riêng) nên 1 abstraction chung dễ thành "generic vô dụng" phải phá vỡ ngay cho từng trường hợp đặc biệt.

## `settings-service.ts` — ngoại lệ: 1 bảng key-value cho mọi cấu hình lặt vặt

```ts
export interface AppSettings {
  'api.url': string
  'auth.token': string
  'ai.apiKey': string
  [key: string]: string   // vẫn nhận key lạ, không ép phải khai báo trước hết
}

const SENSITIVE_KEYS = ['auth.token', 'auth.refreshToken', 'api.secret', 'ai.apiKey']
```

Thay vì thêm 1 cột mới vào bảng `settings` cho mỗi cấu hình (sẽ dẫn tới `ALTER TABLE` liên tục), mọi cấu hình nhỏ lẻ (API key AI provider, trạng thái sync, timeout...) đi qua **1 bảng `key TEXT PRIMARY KEY, value TEXT`** — đánh đổi mất type-safety ở tầng DB (mọi giá trị là string) để đổi lấy việc không cần migration mỗi lần thêm 1 setting mới. `AppSettings` interface là lớp type ở tầng TypeScript bù lại phần đã mất, index signature `[key: string]: string` vẫn cho phép key chưa khai báo trước đi qua (tránh phải sửa interface này mỗi lần thêm key nháp).

`SENSITIVE_KEYS` quyết định key nào tự động `encrypt()`/`decrypt()` qua [13-ma-hoa-bao-mat.md](13-ma-hoa-bao-mat.md) ngay trong hàm `get`/`set` chung — không phải tự nhớ gọi `encrypt()` ở từng nơi set 1 trong các key này, giảm khả năng quên mã hoá 1 field nhạy cảm mới thêm sau này (chỉ cần thêm tên key vào mảng, không cần sửa logic get/set).
