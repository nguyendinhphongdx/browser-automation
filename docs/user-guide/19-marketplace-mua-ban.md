# Mua bán trên Marketplace

[← Về mục lục](../README.md)

> ⚠️ **Thanh toán thật hiện chưa hoạt động.** Mục này mô tả luồng đã thiết kế, không phải tính năng đã dùng được ngay bây giờ — chi tiết kỹ thuật ở [architecture/29](../architecture/29-marketplace-payment-flow.md).

## Script miễn phí — dùng được bình thường

Tìm kiếm, xem, tải về bằng cách đăng nhập rồi bấm "Tải" — hoạt động đầy đủ với script giá `0`.

## Script trả phí — chưa thanh toán được thật

Bấm mua 1 script trả phí hiện chỉ nhận được thông báo "Stripe chưa được cấu hình" — chưa có cổng thanh toán thật nào được gọi. Nút "Tải" cũng chưa kiểm tra đã thanh toán hay chưa, nên về mặt kỹ thuật vẫn tải được, nhưng đây là lỗ hổng tạm thời chưa hoàn thiện (xem [architecture/29](../architecture/29-marketplace-payment-flow.md)), không phải tính năng "miễn phí thử trước" có chủ đích.

## Đăng bán script của bạn

Upload vẫn hoạt động bình thường — script vào trạng thái **chờ duyệt**, admin duyệt xong mới hiển thị công khai. Trang thống kê doanh thu ở Creator dashboard hiển thị số liệu tính theo lượt tải, cần lưu ý số liệu này **chưa phản ánh đã thực sự thu được tiền hay chưa** cho tới khi thanh toán được nối dây thật.

Tiếp theo: [Về mục lục →](../README.md)
