# Cấu hình Stripe thật

[← Về mục lục](../README.md)

Việc cần làm để [thanh toán Marketplace](../architecture/29-marketplace-payment-flow.md) hoạt động thật — theo đúng thứ tự phụ thuộc (làm trước mới làm được bước sau).

## 1. Thêm model lưu giao dịch

Chưa có model `Purchase`/`Order` trong `schema.prisma` — cần thêm trước tiên, tối thiểu:

```prisma
model Purchase {
  id            String   @id @default(cuid())
  userId        String
  scriptId      String
  amount        Int
  stripeSessionId String @unique
  status        String  // 'pending' | 'completed' | 'failed'
  createdAt     DateTime @default(now())

  user   User   @relation(fields: [userId], references: [id])
  script Script @relation(fields: [scriptId], references: [id])

  @@index([userId, scriptId])
}
```

## 2. Bỏ comment phần Stripe ở `checkout/route.ts`

Code mẫu đã viết sẵn dạng comment trong file — bỏ comment, điền `application_fee_amount`/`transfer_data.destination` (cần tài khoản Stripe Connect của creator để chia 70/30 tự động, không chỉ 1 `STRIPE_SECRET_KEY` chủ sàn). Tạo `Purchase` record trạng thái `pending` ngay khi tạo session.

## 3. Webhook Stripe xác nhận thanh toán xong → cập nhật `Purchase.status = 'completed'`

`/api/payment/webhook` đã có sẵn cơ chế verify chữ ký ([08-server.md](../architecture/08-server.md)) — chỉ cần thêm case xử lý sự kiện `checkout.session.completed`, update đúng `Purchase` record theo `stripeSessionId`.

## 4. Gate route download theo `Purchase`

```ts
// download/route.ts — thêm trước khi tăng downloads
if (script.price > 0) {
  const purchased = await prisma.purchase.findFirst({
    where: { userId: user.id, scriptId: id, status: 'completed' }
  })
  if (!purchased) return Response.json({ error: "Chưa mua script này" }, { status: 403 })
}
```

## 5. Thêm storage cho nội dung script thật

Hiện `download` chỉ trả metadata (comment `// workflowData sẽ được thêm khi có storage`) — cần 1 storage provider (S3/GCS, cùng mô hình `ProfileBackup` đã dùng cho backup, [12-backup.md](../architecture/12-backup.md)) lưu file workflow JSON lúc upload, trả về (có thể qua presigned URL) lúc download đã xác nhận đã mua.

## 6. Sửa lại `totalRevenue` ở `creator/stats`

Đổi từ `price * downloads` sang tính trên `Purchase` thật (`status: 'completed'`) — tránh đếm nhầm download miễn phí/chưa thanh toán thành doanh thu.
