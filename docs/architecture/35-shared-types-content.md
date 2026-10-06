# Nội dung `shared-types` không ai dùng

[← Về mục lục](../README.md)

Tiếp nối [16-shared-packages.md](16-shared-packages.md) (đã xác minh 0 import thật) — phần này ghi lại **có gì bên trong** package, để biết nó từng định hình domain model ra sao trước khi bị bỏ quên.

```
index.ts        9 dòng — re-export tất cả
auth.ts        13 dòng
browser.ts     21 dòng
cookie.ts      21 dòng
email.ts       29 dòng
proxy.ts       30 dòng
fingerprint.ts 31 dòng
profile.ts     37 dòng
marketplace.ts 38 dòng
workflow.ts   153 dòng — lớn nhất, chiếm gần nửa cả package
```

`workflow.ts` chiếm phần lớn dung lượng — hợp lý vì `Workflow`/`WorkflowNode`/`WorkflowEdge`/`CampaignExecution` là domain phức tạp nhất trong app (khớp với việc `apps/desktop/src/shared/types.ts` cũng dài nhất ở đúng phần này).

## Đã drift (lệch) khỏi `apps/desktop/src/shared/types.ts` tới đâu

So `Workflow` interface ở 2 nơi: cả 2 đều có field `mode`/`variables` giống tên, nhưng desktop's `types.ts` đã thêm `status`/`createdAt`/`updatedAt` và nhiều field khác phát sinh theo nhu cầu thực tế qua thời gian — package `shared-types` dừng lại ở phiên bản cũ hơn, không được cập nhật song song. Đây là hệ quả tự nhiên của việc không ai import nó: không có áp lực nào buộc phải giữ đồng bộ.

## Vì sao không chỉ xoá quách package này đi

Nội dung nó **không sai** — chỉ là bản chụp domain model ở 1 thời điểm cũ. Nếu có kế hoạch hợp nhất lại ([16-shared-packages.md](16-shared-packages.md)'s gợi ý dọn dẹp), đây vẫn là điểm khởi đầu hợp lý hơn viết lại từ đầu — chỉ cần đối chiếu field-by-field với `apps/desktop/src/shared/types.ts` (bản mới hơn, nên coi là nguồn sự thật) rồi merge, không cần tạo mới hoàn toàn.
