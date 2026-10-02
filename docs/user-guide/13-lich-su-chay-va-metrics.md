# Lịch sử chạy & Metrics

[← Về mục lục](../README.md)

Mỗi lần 1 workflow chạy — dù chạy tay, qua Campaign, hay qua Lịch — app tự ghi lại **log đầy đủ** và **chỉ số hiệu năng từng node**, giúp trả lời "lần trước chạy có ổn không" mà không cần đoán.

## Lịch sử thực thi (Execution History)

Danh sách mọi lần chạy, mỗi dòng gồm: workflow nào, profile nào, trạng thái (thành công/lỗi), thời điểm bắt đầu/kết thúc, số node đã chạy, số node lỗi, tổng thời gian chạy. Lọc được theo workflow hoặc theo khoảng thời gian — hữu ích khi so sánh "hôm nay chạy chậm hơn tuần trước không".

## Thống kê theo loại node

Với mỗi workflow, xem được từng **loại node** (ví dụ "Click", "HTTP Request") đã chạy bao nhiêu lần, tỷ lệ thành công, thời gian chạy trung bình và **p95** (95% số lần chạy nhanh hơn mốc này — chỉ số hữu ích hơn trung bình khi có vài lần chạy bị chậm bất thường). Giúp phát hiện node nào đang là điểm nghẽn hoặc hay lỗi nhất trong workflow.

Nhấn vào 1 node cụ thể trên canvas để xem thống kê chi tiết riêng của node đó (không gộp theo loại, mà theo đúng node đang chọn).

## Dọn dữ liệu cũ

Dữ liệu metrics tích luỹ theo thời gian — ở Cài đặt có nút **dọn bản ghi cũ** (mặc định giữ lại 30 ngày gần nhất). Đây là thao tác **chủ động bấm**, app không tự xoá ngầm, nên dữ liệu cũ không biến mất ngoài ý muốn trước khi bạn kịp xem.

Tiếp theo: [Phiên bản workflow →](14-phien-ban-workflow.md)
