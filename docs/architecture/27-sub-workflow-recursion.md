# Sub-workflow & đệ quy

[← Về mục lục](../README.md)

Node **Run Sub-workflow** (`run-workflow`) cho 1 workflow gọi 1 workflow khác như 1 bước con — dễ tạo vòng lặp vô hạn nếu workflow A gọi B, B gọi lại A (trực tiếp hoặc qua trung gian). Chặn bằng đếm **độ sâu** (`depth`), không phải phát hiện cycle trong đồ thị.

```ts
const MAX_DEPTH = 10

if (this.ctx.depth >= (this.config.maxDepth || MAX_DEPTH)) {
  throw new Error(`Vượt quá độ sâu đệ quy tối đa (${maxDepth})`)
}

// Tạo context mới cho workflow con, tăng depth lên 1
const childCtx = {
  ...this.ctx,
  depth: this.ctx.depth + 1,
  parentWorkflowId: workflow.id,
}
```

`ExecutionContext.depth` bắt đầu từ 0 ở workflow gốc, tăng 1 mỗi lần `run-workflow` gọi xuống 1 tầng — chạm `maxDepth` (mặc định 10, tự chỉnh được per-node qua `config.maxDepth`) thì throw lỗi thay vì chạy mãi. Đơn giản hơn nhiều so với tự dò cycle thật trong đồ thị gọi lẫn nhau (cần theo dõi tập workflow đã đi qua trong chuỗi gọi hiện tại) — đổi lại: 1 chuỗi gọi **không hồi quy** nhưng sâu hơn 10 tầng (A→B→C→...→K, mỗi workflow chỉ gọi 1 lần, không workflow nào lặp lại) cũng bị chặn nhầm dù không thực sự vô hạn. Đánh đổi chấp nhận được vì 10 tầng lồng nhau đã là dấu hiệu thiết kế workflow có vấn đề, hiếm khi là nhu cầu hợp lệ.

`parentWorkflowId` không dùng để chặn đệ quy (không so sánh "đã gọi tới workflow này chưa") — chỉ mang tính thông tin, phục vụ log/debug biết workflow con đang chạy dưới workflow cha nào.
