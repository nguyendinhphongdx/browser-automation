# Tính năng Campaign nâng cao

[← Về mục lục](../README.md)

> ⚠️ Các tính năng dưới đây **đã hoạt động ở backend nhưng chưa có giao diện để tự cấu hình** trong màn hình tạo Campaign hiện tại. Trang này chỉ để bạn biết chúng tồn tại — nếu cần dùng ngay, báo đội phát triển bổ sung giao diện thay vì tự chỉnh database.

## Giới hạn tần suất chạy (Quota)

Giới hạn số lần 1 profile được chạy trong 1 khoảng thời gian (giờ/ngày/tuần), và thời gian nghỉ tối thiểu giữa 2 lần chạy liên tiếp — hữu ích để tránh chạy quá dồn dập trên cùng 1 tài khoản.

## Chọn profile theo điều kiện

Thay vì tự tick từng profile, chọn theo điều kiện: "mọi profile có tag abc", "chưa dùng kể từ ngày X", "lấy ngẫu nhiên N profile" — campaign tự chọn lại đúng tập hợp phù hợp mỗi lần chạy, không cần sửa tay khi danh sách profile thay đổi.

## A/B Test giữa các workflow

Chia tỷ lệ chạy giữa nhiều phiên bản workflow khác nhau theo trọng số (ví dụ 70% chạy workflow A, 30% chạy workflow B) — dùng khi muốn so sánh hiệu quả giữa 2 cách làm.

## Thứ tự chạy theo phụ thuộc

Đặt "workflow B chỉ chạy sau khi workflow A xong" — campaign tự tính đúng thứ tự thay vì bạn phải tự sắp xếp danh sách workflow theo tay.

Tiếp theo: [Về mục lục →](../README.md)
