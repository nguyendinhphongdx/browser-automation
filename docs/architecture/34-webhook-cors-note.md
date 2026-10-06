# CORS của webhook server nội bộ

[← Về mục lục](../README.md)

`webhook-server.ts` ([09-scheduler-webhook.md](09-scheduler-webhook.md)) set:

```ts
res.setHeader('Access-Control-Allow-Origin', '*')
```

Nhìn thoáng qua giống 1 cấu hình CORS lỏng lẻo đáng ngại — nhưng cần đặt cạnh 2 sự thật khác để đánh giá đúng:

1. Server này `listen(port, '127.0.0.1')` — **chỉ nhận kết nối từ chính máy đang chạy app**, không mở ra mạng ngoài. CORS vốn là cơ chế trình duyệt tự áp dụng cho request **từ 1 trang web** gọi sang origin khác; ở đây không có "trang web" nào liên quan — client gọi webhook thường là 1 script/service backend khác (dùng `curl`/`fetch` ngoài trình duyệt), nơi CORS header không có ý nghĩa thực thi gì (CORS chỉ chặn ở phía trình duyệt, không chặn request từ Node/curl).
2. Xác thực request dựa vào `webhookSecret` so khớp ([09-scheduler-webhook.md](09-scheduler-webhook.md)) — **không** dựa vào Origin header để quyết định cho phép hay không, nên nới CORS cũng không mở thêm đường bypass xác thực nào.

## Vậy khi nào `Access-Control-Allow-Origin: *` ở đây mới thực sự có ý nghĩa

Trường hợp duy nhất CORS ảnh hưởng: nếu **chính renderer của app này** (chạy trong Chromium, có khái niệm origin) gọi `fetch()` tới webhook server từ JavaScript của chính nó — khi đó header này cho phép gọi không bị CORS chặn. Thực tế hiện tại renderer không làm việc này (webhook nhận request từ bên ngoài, không phải renderer tự gọi mình) — header tồn tại nhiều khả năng mang tính phòng xa/copy từ boilerplate hơn là phục vụ 1 nhu cầu đang dùng thật.

## Kết luận

Không phải lỗ hổng — bind `127.0.0.1` + xác thực qua secret là 2 lớp bảo vệ thật sự, CORS header chỉ là chi tiết không ảnh hưởng gì trong bối cảnh này. Không cần sửa, chỉ cần hiểu đúng để không báo nhầm thành lỗi bảo mật khi review code.
