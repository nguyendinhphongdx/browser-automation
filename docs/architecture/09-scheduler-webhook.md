# Scheduler & Webhook

[← Về mục lục](../README.md)

`main/automation/scheduler.ts` và `webhook-server.ts` là 2 cơ chế trigger workflow/campaign **không cần người dùng thao tác tay**, cả 2 chạy nền suốt vòng đời app (khởi động ở `index.ts`'s `app.whenReady()`, dừng ở `before-quit`).

## Scheduler — poll mỗi 30 giây

```ts
export function startScheduler() {
  checkDueSchedules()
  intervalId = setInterval(checkDueSchedules, 30000)
}
```

Không dùng thư viện cron thật chạy theo tick chính xác — chỉ **poll định kỳ** bảng `schedules`, so `next_run_at` với thời gian hiện tại. Đơn giản, đủ chính xác cho tác vụ định kỳ thông thường (sai số tối đa ~30s), tránh phụ thuộc thêm 1 cron scheduler process riêng.

`checkDueSchedules()` chỉ xử lý schedule `type IN ('cron')` — tới hạn thì gọi `triggerSchedule()`, cập nhật `next_run_at` cho lần kế tiếp.

## Chain — tự tìm schedule phụ thuộc sau khi 1 lần chạy xong

```ts
function getChainSchedules(sourceId: string, status: string): Schedule[] {
  return db.prepare(
    "SELECT * FROM schedules WHERE type = 'chain' AND enabled = 1 " +
    "AND chain_source_id = ? AND (chain_on_status = ? OR chain_on_status = 'any')"
  ).all(sourceId, status)
}
```

Sau khi `triggerSchedule()` chạy xong 1 schedule, nó tự tìm mọi schedule `type='chain'` trỏ `chain_source_id` về schedule vừa chạy, lọc theo `chain_on_status` (`completed`/`error`/`any`) khớp kết quả vừa có, rồi trigger tiếp — đệ quy tự nhiên qua nhiều bước chain nối tiếp nhau mà không cần 1 "orchestrator chuỗi" riêng.

## Webhook server — HTTP server nội bộ, không qua Electron IPC

```ts
export function startWebhookServer(port = 9876): number {
  server = http.createServer(async (req, res) => { ... })
  server.listen(port, '127.0.0.1', ...)
}
```

Dùng Node `http` thuần (không phải Express) — chỉ cần xử lý 1 route POST, không đáng để thêm dependency. Bind vào `127.0.0.1` (không phải `0.0.0.0`) — **chỉ nhận request từ chính máy đang chạy app**, không mở ra mạng ngoài; ai cũng gọi webhook được thì phải ở trên cùng máy hoặc tunnel vào.

Xác thực request bằng cách so khớp `webhookSecret` của schedule (gửi qua header `X-Webhook-Secret` hoặc query `?secret=`), **không** parse chữ ký HMAC như Stripe webhook — vì đây là secret tự sinh, tự dùng nội bộ, không phải webhook nhận từ bên thứ ba cần xác minh nguồn gốc.

Nếu cổng mặc định `9876` bị chiếm, tự thử `port + 1` — `getWebhookPort()` cho renderer biết cổng thật đang dùng để hiển thị lên UI.

## Dùng chung logic chạy workflow với Campaign

Cả scheduler và campaign engine đều gọi `run-workflow.ts`'s `runWorkflowOnce()` thay vì tự implement lại — xem [10-campaign-engine.md](10-campaign-engine.md) và [05-workflow-engine.md](05-workflow-engine.md).
