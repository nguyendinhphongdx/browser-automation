# Campaign nâng cao — đã code xong backend, chưa có UI

[← Về mục lục](../README.md)

`main/services/quota-service.ts` implement 4 tính năng campaign nâng cao, **đã nối dây đầy đủ vào `campaign-engine.ts`'s luồng chạy thật** (không phải code chết như `packages/fingerprint`/`shared-types` ở [16-shared-packages.md](16-shared-packages.md)) — nhưng **`CampaignEditor.tsx` không có field nào để người dùng cấu hình chúng**. Xác minh bằng grep: 0 kết quả cho `quotaConfig`/`profileSelectionRules`/`dependencies`/`abTestVariants` trong toàn bộ `src/renderer`.

## 4 tính năng

### Quota — giới hạn tần suất chạy theo profile

```ts
checkQuota(profileId, { maxRunsPerProfile, perPeriod: 'hour'|'day'|'week', cooldownMinutes })
```

Đếm `workflow_logs` của profile đó trong khoảng thời gian, chặn chạy nếu vượt ngưỡng hoặc còn trong thời gian cooldown kể từ lần chạy gần nhất.

### Chọn profile theo rule — thay vì chọn tay từng profile

```ts
type ProfileSelectionRule = { type: 'tags' | 'last-used-before' | 'random-sample'; value: string | number }
```

Lọc động: "mọi profile có tag X", "chưa dùng kể từ ngày Y", "lấy ngẫu nhiên N profile" — thay vì liệt kê id cứng, hữu ích khi danh sách profile thay đổi thường xuyên (campaign tự chọn lại đúng tập hợp mỗi lần chạy).

### A/B Test — chia tỷ lệ workflow chạy theo trọng số

```ts
type ABTestVariant = { id: string; name: string; workflowId: string; weight: number }
pickABVariant(variants)  // random có trọng số — weight càng cao càng dễ được chọn
```

### Dependency — thứ tự chạy workflow theo đồ thị phụ thuộc

```ts
type WorkflowDependency = { workflowId: string; dependsOn: string[] }
topologicalSort(workflowIds, dependencies)  // Kahn's algorithm, throw nếu phát hiện cycle
```

"Workflow B chỉ chạy sau khi A xong" — tương tự ý tưởng lịch **chain** ([09-scheduler-webhook.md](09-scheduler-webhook.md)) nhưng ở cấp **trong 1 campaign** (nhiều workflow cùng 1 lần chạy) thay vì giữa các schedule độc lập.

## Dùng được ngay bây giờ không?

Có — nếu set trực tiếp các field này vào `CampaignExecution` (ví dụ sửa qua `apiRequest`/trực tiếp update DB, hoặc code tạm 1 UI thử nghiệm), `campaign-engine.ts` đọc và áp dụng đúng như mô tả. Không cần sửa gì ở backend. Việc còn thiếu thuần tuý là 1 bộ form trong `CampaignEditor.tsx` để người dùng tự cấu hình qua UI.

## Vì sao đáng ghi chú thay vì để người đọc tự mò ra

Khác với 2 package chết (đã gỡ bỏ ý nghĩa, nên cân nhắc dọn), đây là tính năng **đáng hoàn thiện nốt** (thêm UI) hơn là xoá — công phát triển đã hoàn tất phần khó hơn (logic), phần còn lại (form nhập liệu) nhỏ hơn nhiều so với phần đã xong.
