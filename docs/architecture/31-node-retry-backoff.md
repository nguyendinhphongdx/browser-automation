# Retry & backoff của node

[← Về mục lục](../README.md)

Mỗi node có thể gắn `retryConfig` riêng — nằm trong Template Method `BaseNode.run()` đã nhắc ở [05-workflow-engine.md](05-workflow-engine.md), phần này đi sâu vào chính cơ chế retry.

```ts
export interface NodeRetryConfig {
  maxRetries: number
  backoffStrategy: 'fixed' | 'linear' | 'exponential'
  backoffBaseMs: number
  backoffMaxMs: number
}
```

## Vòng lặp retry — thử lại trong cùng 1 lần gọi `run()`, không phải chạy lại cả node từ đầu bên ngoài

```ts
for (let attempt = 0; attempt <= maxRetries; attempt++) {
  if (this.ctx.aborted) return
  try {
    if (attempt > 0) {
      const delay = this.getBackoffDelay(attempt, retryConfig!)
      this.ctx.onNodeRetry?.(this.nodeId, attempt, maxRetries)
      await new Promise(r => setTimeout(r, delay))
    }
    await this.execute()
    this.onSuccess()
    return
  } catch (err) {
    lastError = err
    if (attempt < maxRetries) continue
  }
}
// Hết số lần thử — chụp màn hình lỗi, ghi metric fail, throw
```

`attempt === 0` chạy ngay không chờ (lần thử đầu tiên, không tính là "retry"); từ `attempt 1` trở đi mới tính delay theo `backoffStrategy`. `this.ctx.aborted` được kiểm tra **ở đầu mỗi lần thử**, kể cả giữa các lần retry — người dùng bấm Dừng workflow giữa lúc đang chờ backoff vẫn dừng được ngay, không phải chờ hết delay mới dừng.

## Tự chụp màn hình khi hết retry mà vẫn lỗi

```ts
const screenshotPath = await this.captureErrorScreenshot()
this.recordMetric(nodeType, timeMs, false, lastError.message, screenshotPath)
```

Chỉ chụp **sau khi đã hết số lần retry** (thất bại thật sự), không chụp ở mỗi lần thử lỗi giữa chừng — tránh tích luỹ quá nhiều ảnh chụp cho 1 node hay flaky nhưng cuối cùng vẫn thành công sau vài lần retry. Ảnh lưu kèm vào `node_metrics.screenshot_path`, xem được khi tra lịch sử thực thi ở [11-metrics.md](11-metrics.md).

## 3 kiểu backoff — không có "no backoff" tách riêng

`fixed` (delay cố định `backoffBaseMs` mỗi lần), `linear` (tăng tuyến tính theo số lần thử), `exponential` (tăng theo cấp số nhân, thường dùng cho lỗi mạng/rate-limit) — cả 3 đều bị chặn trần bởi `backoffMaxMs` (không bao giờ chờ lâu hơn mốc này dù công thức tính ra số lớn hơn). Muốn "retry không chờ" thì đặt `backoffBaseMs = 0` với `fixed`, không có flag riêng cho trường hợp này.
