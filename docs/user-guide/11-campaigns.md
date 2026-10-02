# Campaign

[← Về mục lục](../README.md)

Campaign chạy **1 hoặc nhiều workflow** trên **nhiều profile cùng lúc** — dùng khi cần thao tác hàng loạt (nhiều tài khoản, nhiều profile) thay vì chạy từng profile thủ công.

## Tạo campaign

1. Vào **Automation → Campaign → Tạo mới**
2. Đặt tên, chọn danh sách **profile** và **workflow** sẽ chạy
3. Cấu hình cách chạy (xem bên dưới)
4. Lưu và bấm **Chạy**

## Cách chạy — Tuần tự hay Song song

- **Tuần tự (sequential)**: chạy từng profile một, xong profile này mới sang profile kế. Có độ trễ ngẫu nhiên giữa các profile (khoảng min–max tự đặt) để tránh hành vi quá đều đặn.
- **Song song (parallel)**: chạy nhiều profile cùng lúc, giới hạn bởi **số luồng tối đa** (`maxConcurrent`).
  - **Warm-up**: thay vì chạy full số luồng ngay từ đầu, tăng dần số luồng chạy đồng thời theo từng bước — giảm tải đột ngột lúc khởi động.
  - **Thứ tự workflow/profile**: có thể chạy theo thứ tự cố định hoặc xáo trộn ngẫu nhiên mỗi lần.

## Lặp lại & xử lý lỗi

- **Số lần lặp** (`repeatCount`): chạy lại toàn bộ campaign N lần, có độ trễ ngẫu nhiên giữa mỗi lần lặp
- **Dừng khi lỗi** (`stopOnError`): 1 profile lỗi thì dừng cả campaign thay vì tiếp tục các profile còn lại
- **Số lần thử lại**: tự retry profile bị lỗi trước khi coi là thất bại hẳn

## Điều khiển khi đang chạy

- **Tạm dừng/Tiếp tục**: dừng giữa chừng, không huỷ tiến độ đã chạy
- **Dừng hẳn**: huỷ toàn bộ, các profile chưa chạy tới sẽ không chạy

## Xem kết quả

Panel kết quả hiện real-time: profile nào đang chạy, đã xong, bị lỗi — mở rộng từng dòng để xem log chi tiết hoặc thông báo lỗi của riêng profile đó. Lịch sử các lần chạy campaign được lưu lại để xem sau.

Tiếp theo: [Lịch tự động →](12-lich-tu-dong.md)
