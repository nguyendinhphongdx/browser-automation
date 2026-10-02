# Metrics

[← Về mục lục](../README.md)

`main/services/metrics-service.ts` ghi và truy vấn bảng `node_metrics` — 1 dòng cho mỗi lần 1 node chạy xong (thành công hay lỗi đều ghi).

## Ghi metric — từ đâu gọi tới

`recordNodeMetric()` được gọi bên trong `BaseNode.run()` (Template Method ở [05-workflow-engine.md](05-workflow-engine.md)) — **mọi node kế thừa `BaseNode` tự động được đo**, không cần tự thêm code đo thời gian ở từng class node. Ghi cả khi node bỏ qua đo metric (`ctx.workflowId` rỗng — ví dụ chạy thử ngoài context có workflow thật) bằng cách early-return trong `recordNodeMetric`, không throw.

## 2 kiểu truy vấn — gộp theo loại vs. theo đúng node

```ts
getNodeStats(workflowId)                    // gộp theo nodeType — "Click nói chung chạy thế nào"
getNodeInstanceStats(workflowId, nodeId)    // đúng 1 node cụ thể trên canvas
```

`getNodeStats` hữu ích để so sánh **loại** node nào hay lỗi nhất trong 1 workflow (ví dụ "HTTP Request" fail nhiều hơn "Click"); `getNodeInstanceStats` hữu ích khi nghi ngờ **1 node cụ thể** đang là điểm nghẽn (ví dụ node số 7 luôn chậm, các node Click khác thì bình thường).

`avgTimeMs` và `p95TimeMs` tính trên cùng tập dữ liệu nhưng ý nghĩa khác nhau — trung bình bị kéo lệch bởi vài lần chạy chậm bất thường (ví dụ chờ mạng timeout), p95 phản ánh "hầu hết các lần chạy nhanh hơn mốc này" sát thực tế hơn khi dùng để đặt kỳ vọng thời gian chạy.

## `getExecutionHistory` — gộp theo lần chạy, không phải theo node

Join `workflow_logs` với `node_metrics` theo `workflow_log_id` để tính `nodeCount`/`failedNodes`/`totalTimeMs` cho **1 lần chạy** — khác tầng dữ liệu với `getNodeStats` (gộp theo loại node, xuyên nhiều lần chạy).

## Dọn dữ liệu cũ

```ts
cleanupOldMetrics(retentionDays = 30)
```

Xoá bản ghi `created_at` cũ hơn `retentionDays`. Không tự chạy định kỳ — gọi thủ công qua IPC `metrics:cleanup` (từ UI Cài đặt) khi người dùng chủ động dọn, không chạy ngầm tự động để tránh mất dữ liệu người dùng chưa kịp xem mà không hay biết.
