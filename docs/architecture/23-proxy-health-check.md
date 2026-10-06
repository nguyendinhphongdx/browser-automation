# Kiểm tra proxy

[← Về mục lục](../README.md)

Nút "Kiểm tra" ở trang Tài nguyên → Proxy gọi `checkProxy()` ở `main/services/proxy-service.ts`. Cách kiểm tra **đơn giản hơn** cảm giác tên gọi gợi ý — đáng biết trước khi tin tưởng kết quả.

```ts
const net = await import('net')
await new Promise<void>((resolve, reject) => {
  const socket = net.createConnection({ host: proxy.host, port: proxy.port }, () => {
    speed = Date.now() - start
    status = 'alive'
    socket.destroy()
    resolve()
  })
  socket.setTimeout(10000)
  socket.on('timeout', () => { socket.destroy(); reject(new Error('timeout')) })
  socket.on('error', reject)
})
```

Đây là **TCP connect thô** tới `host:port` của proxy — không gửi request thật **qua** proxy để kiểm tra proxy có hoạt động đúng chức năng không (có forward được traffic không, có xác thực đúng user/pass không). Comment ngay trong code giải thích lý do: `fetch` của Node.js không hỗ trợ proxy natively, nên chọn cách đơn giản hơn là test kết nối TCP.

## Hệ quả thực tế

- **"Sống" (alive) chỉ nghĩa là cổng đang mở và chấp nhận kết nối TCP** — không đảm bảo proxy forward traffic đúng, không phát hiện được proxy yêu cầu auth sai (socket vẫn connect được dù sau đó proxy sẽ từ chối request thật vì sai user/pass)
- `speed` đo thời gian TCP handshake, không phải thời gian round-trip 1 request HTTP thật qua proxy — số liệu tham khảo độ trễ mạng tới proxy, không phản ánh tốc độ duyệt web thực tế qua proxy đó
- Biến `proxyUrl` (ghép `type://user:pass@host:port`) được build trong hàm nhưng **không dùng tới** ở bước kiểm tra thật — dấu vết của lần thử nghiệm cách kiểm tra "đúng" hơn (qua proxy thật) nhưng chưa hoàn thiện

## Khi nào đủ dùng, khi nào không

Đủ để lọc nhanh proxy đã chết hẳn (sập server, sai host/port) trước khi gán cho profile. Không đủ để khẳng định chắc chắn 1 proxy "sống" theo kết quả này sẽ hoạt động đúng khi browser thật dùng nó — cách xác nhận chắc chắn hơn là tự mở browser với proxy đó và thử truy cập 1 trang thật.
