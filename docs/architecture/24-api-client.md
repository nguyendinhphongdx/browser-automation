# API client & refresh token

[← Về mục lục](../README.md)

`main/services/api-client.ts` là lớp gọi server duy nhất từ main process — renderer không tự `fetch()` thẳng tới server (tránh lộ token ra renderer, và tránh vấn đề CORS vì renderer chạy trong `file://`/dev-server origin khác với server).

## Guard chống refresh chồng chéo

```ts
let isRefreshing = false

export async function refreshToken(): Promise<boolean> {
  if (isRefreshing) return false
  isRefreshing = true
  try {
    // POST /api/auth/refresh với Bearer token cũ → nhận token mới
  } finally {
    isRefreshing = false
  }
}
```

Cờ module-level đơn giản — nếu 2 request cùng lúc đều gặp 401 và cùng gọi `refreshToken()`, request thứ 2 thấy `isRefreshing === true` thì trả `false` ngay (không tự gửi thêm 1 request refresh song song chồng lên request đầu). Đơn giản hơn 1 hàng đợi Promise thật (nơi request thứ 2 đáng lẽ nên **chờ** kết quả của request thứ 1 thay vì coi như thất bại luôn) — đánh đổi chấp nhận được vì refresh token là thao tác hiếm khi xảy ra đồng thời trong 1 app desktop single-user.

## Dùng lại ở 2 nơi theo 2 cách khác nhau

- `backup-service.ts`'s `authedFetch()` ([12-backup.md](12-backup.md)) — tự gọi `refreshToken()` rồi retry đúng 1 lần khi gặp 401
- Các hàm CRUD khác qua `rawRequest()` trong chính `api-client.ts` — cùng 1 ý tưởng retry-once-on-401

Cả 2 chỗ đều theo pattern **retry đúng 1 lần, không lặp vô hạn** — token thật sự hết hạn (refresh cũng thất bại) thì để lỗi 401 nổi lên UI, không che giấu bằng cách thử lại mãi.

## Token lưu ở đâu

`auth.token`/`auth.refreshToken` đi qua `settings-service.ts`, nằm trong `SENSITIVE_KEYS` nên tự động mã hoá trước khi ghi SQLite — xem [21-service-layer-pattern.md](21-service-layer-pattern.md) và [13-ma-hoa-bao-mat.md](13-ma-hoa-bao-mat.md).
