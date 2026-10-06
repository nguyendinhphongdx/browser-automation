# Đánh giá & review script

[← Về mục lục](../README.md)

## Mỗi user chỉ review được 1 lần cho 1 script — ở tầng database, không phải chỉ validate ở code

```prisma
model Review {
  rating    Int      // 1-5
  comment   String?
  scriptId  String
  userId    String
  @@unique([scriptId, userId])
}
```

`@@unique([scriptId, userId])` chặn ngay ở DB — kể cả nếu code API quên kiểm tra "đã review chưa" trước khi insert, Postgres tự từ chối bản ghi trùng thay vì tạo ra 2 review của cùng 1 user cho cùng 1 script. An toàn hơn so với chỉ kiểm tra ở tầng ứng dụng (dễ bỏ sót nếu có nhiều entry point cùng ghi vào bảng này).

## `avgRating` tính lúc đọc, không lưu sẵn

```ts
avgRating: s.reviews.length > 0
  ? s.reviews.reduce((a, r) => a + r.rating, 0) / s.reviews.length
  : 0
```

Không có cột `avgRating`/`reviewCount` trên bảng `Script` — mỗi lần cần hiển thị, query kéo hết `reviews` của script đó rồi tính trung bình ngay tại chỗ (ở `creator/stats`, tương tự có thể lặp lại ở trang marketplace public). Đơn giản, luôn chính xác tức thời (không bao giờ lệch so với dữ liệu review thật), đánh đổi là tính lại từ đầu mỗi lần đọc thay vì đọc 1 số đã cache sẵn — chấp nhận được ở quy mô hiện tại (số review trên 1 script không lớn), sẽ cần cân nhắc lại (cache `avgRating` khi review thay đổi) nếu script phổ biến tích luỹ hàng nghìn review.

## Không có API sửa/xoá review trong danh sách route marketplace

README chỉ liệt kê `GET`/`POST` cho `/api/marketplace/scripts/[id]/reviews` — review tạo được, đọc được, nhưng không có route `PATCH`/`DELETE` cho chính review (khác với `Script` có `PATCH`/`DELETE` riêng). Người dùng muốn sửa đánh giá hiện phải tự xoá thủ công qua DB hoặc chưa làm được qua UI.
