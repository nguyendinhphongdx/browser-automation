# Lịch tự động

[← Về mục lục](../README.md)

Lịch (Schedule) cho phép 1 **workflow** hoặc **campaign** tự chạy mà không cần mở app lên bấm thủ công mỗi lần. Vào **Automation → Lịch** để quản lý.

## 3 kiểu lịch

### Cron — chạy theo thời gian lặp lại

Đặt biểu thức cron (ví dụ "mỗi ngày lúc 8h sáng", "mỗi 30 phút"). App tự kiểm tra mỗi 30 giây xem có lịch nào tới hạn chưa — không cần chính xác tới từng giây, đủ dùng cho các tác vụ định kỳ thông thường.

### Webhook — chạy khi có request gọi tới

App tự chạy 1 HTTP server nội bộ (mặc định cổng `9876`, tự dò cổng trống kế tiếp nếu bị chiếm — xem cổng thật đang dùng ngay trên trang Lịch). Mỗi lịch webhook có 1 **secret** riêng. Ứng dụng khác (hoặc chính bạn) gọi:

```http
POST http://localhost:<port>/?secret=<webhook-secret>
X-Webhook-Secret: <webhook-secret>
```

Có thể gửi kèm JSON body — dữ liệu này nạp vào làm **biến** cho workflow dùng được ngay trong lần chạy đó. Dùng khi muốn trigger từ hệ thống bên ngoài (ví dụ 1 service khác báo "có đơn hàng mới" thì chạy workflow xử lý).

### Chain — chạy nối tiếp sau 1 lịch khác

Chọn "chạy sau khi [lịch A] hoàn thành" — có thể chọn điều kiện: chỉ chạy tiếp khi A **thành công**, chỉ khi A **lỗi**, hoặc **bất kể kết quả**. Dùng để ghép nhiều bước thành 1 chuỗi tự động (ví dụ: lịch A đăng nhập xong → lịch B mới chạy thu thập dữ liệu).

## Bật/tắt, xoá, chạy thử

- Mỗi lịch có công tắc bật/tắt riêng — tắt thì không bị huỷ, chỉ tạm dừng kích hoạt
- Nút **Chạy thử ngay** — kích hoạt lịch ngay lập tức, không cần chờ tới hạn, để kiểm tra cấu hình đúng chưa
- Thời điểm chạy gần nhất và lần chạy kế tiếp (với lịch cron) hiển thị ngay trên danh sách

Tiếp theo: [Lịch sử chạy & Metrics →](13-lich-su-chay-va-metrics.md)
