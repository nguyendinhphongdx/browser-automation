# Campaign Editor UI

[← Về mục lục](../README.md)

`CampaignEditor.tsx` map **12/16 field** của `CampaignExecution` ra UI — liệt kê đúng cái gì có, cái gì chưa, để không mất công tìm 1 ô nhập không tồn tại.

## Có UI (12 field)

```
mode, maxConcurrent, delayBetweenProfiles, workflowOrder, profileOrder,
repeatCount, repeatDelay, stopOnError, retryOnError,
warmUp, warmUpStep, warmUpDelay
```

Đúng những gì mô tả ở [10-campaign-engine.md](10-campaign-engine.md) và [user-guide/11](../user-guide/11-campaigns.md).

## Không có UI (4 field) — `quotaConfig`, `profileSelectionRules`, `dependencies`, `abTestVariants`

Chi tiết đầy đủ ở [22-advanced-campaign-features.md](22-advanced-campaign-features.md) — nhắc lại ngắn gọn ở đây vì đây chính xác là nơi cần sửa nếu muốn thêm UI: thêm 1 section mới trong `CampaignEditor.tsx` (cạnh section "Warm-up" đã có, theo đúng pattern `{exec.warmUp && (...)}` show/hide theo checkbox bật/tắt) cho từng field còn thiếu, gọi `updateExec({ <field>: ... })` giống các field khác.

## Pattern chung của form — 1 object `exec` cập nhật qua `updateExec()`

```tsx
const updateExec = (patch: Partial<CampaignExecution>) =>
  setExec(prev => ({ ...prev, ...patch }))

<input value={exec.maxConcurrent} onChange={e => updateExec({ maxConcurrent: Number(e.target.value) })} />
```

Mọi field đều qua 1 hàm `updateExec` chung (merge patch vào state) thay vì 16 hàm `setXxx` riêng — thêm field mới chỉ cần thêm 1 input gọi `updateExec({ fieldMoi: ... })`, không cần thêm state/setter riêng.
