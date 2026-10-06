# Thanh toán Marketplace

[← Về mục lục](../README.md)

README liệt kê "Marketplace — mua bán kịch bản với chia doanh thu 70/30" như 1 tính năng đã có. Đọc thẳng code thì **toàn bộ phần thanh toán thật chưa tồn tại** — phần này ghi lại chính xác ở đâu dừng lại, để không ai tưởng nhầm tính năng này đã chạy được.

## Checkout — còn nguyên TODO, chưa gọi Stripe

```ts
// apps/server/src/app/api/payment/checkout/route.ts
// TODO: Tích hợp Stripe Checkout Session
// const session = await stripe.checkout.sessions.create({ ... })   ← toàn bộ bị comment

return Response.json({
  message: "Stripe chưa được cấu hình. Thêm STRIPE_SECRET_KEY vào .env để kích hoạt thanh toán.",
  ...
})
```

Route này **không tạo session Stripe thật nào cả** — chỉ trả về 1 message báo chưa cấu hình, dù `STRIPE_SECRET_KEY` có set trong `.env` hay không (code gọi Stripe bị comment hẳn, không phải if/else theo có-key-hay-không).

## Download — không kiểm tra đã thanh toán chưa

```ts
// apps/server/src/app/api/marketplace/scripts/[id]/download/route.ts
export async function POST(request: Request, { params }: RouteParams) {
  const user = await getUserFromRequest(request)
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const script = await prisma.script.findUnique({ where: { id } })
  if (script.status !== "APPROVED") return Response.json({ error: "..." }, { status: 403 })

  await prisma.script.update({ where: { id }, data: { downloads: { increment: 1 } } })
  // ... không có bước nào kiểm tra script.price > 0 đã được thanh toán chưa
}
```

Bất kỳ user đã đăng nhập nào gọi route này với 1 script `APPROVED` đều tải được — kể cả script có `price > 0`. Xác minh thêm: **không có model `Purchase`/`Order`/`Transaction` nào trong `schema.prisma`** — không có chỗ nào để lưu "user X đã mua script Y" dù có.

## `creator/stats`'s `totalRevenue` tính trên giả định chưa đúng với hiện trạng

```ts
const totalRevenue = scripts.reduce((sum, s) => sum + s.price * s.downloads, 0)
```

Công thức này đúng **nếu** mọi lượt `downloads` đều đã qua thanh toán thành công — nhưng vì download hiện không gate theo thanh toán, con số này thực chất đang tính "giá × số lượt tải", không phải "giá × số lượt đã trả tiền". Với script miễn phí (`price = 0`) không ảnh hưởng gì; với script trả phí, con số hiển thị cho creator sẽ sai (cao hơn thực tế) ngay khi tính năng download hoạt động như hiện tại.

## Nội dung file thật của script cũng chưa có

```ts
return Response.json({
  script: { id: script.id, name: script.name, version: script.version },
  // workflowData sẽ được thêm khi có storage
})
```

Comment ngay trong code: route download hiện **không trả về workflow JSON thật** — chỉ trả metadata. Cần thêm storage (S3/GCS, tương tự `ProfileBackup.storageKey` đã có cho backup profile) trước khi tính năng tải script thật sự dùng được.

## Việc còn thiếu để tính năng này hoạt động thật — xem [development/09](../development/09-wiring-up-stripe.md)
