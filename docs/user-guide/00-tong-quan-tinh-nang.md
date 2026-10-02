# Tổng quan tính năng

[← Về mục lục](../README.md)

Bản đồ nhanh toàn bộ tính năng — đọc trang này trước để biết nên tra cứu tài liệu nào.

## 5 tab chính trên sidebar

| Tab | Phím tắt | Dùng để |
|---|---|---|
| **Profiles** | `Ctrl+1` | Tạo/quản lý danh tính trình duyệt — xem [01](01-cai-dat.md), [02](02-quan-ly-profile.md) |
| **Automation** | `Ctrl+2` | Xây và chạy workflow, Record Mode, AI Agent, Campaign, Lịch tự động — xem [04](04-automation-builder.md) trở đi |
| **Tài nguyên** | `Ctrl+3` | Proxy, Email, Cookie dùng chung cho các profile — xem [03](03-quan-ly-tai-nguyen.md) |
| **Marketplace** | `Ctrl+4` | Import/export/chia sẻ workflow — xem [07](07-marketplace.md) |
| **Cài đặt** | `Ctrl+5` | Giao diện, AI Provider, thông tin app — xem [09](09-cai-dat-ung-dung.md) |

## 1 workflow có thể chạy theo mấy cách

```
Tạo workflow (kéo thả hoặc Record Mode hoặc viết code)
        │
        ├─ Chạy thủ công: chọn 1 profile, bấm Play              → 04-automation-builder.md
        ├─ Chạy trên nhiều profile cùng lúc (Campaign)           → 11-campaigns.md
        └─ Tự chạy theo lịch (cron / webhook / nối tiếp workflow khác) → 12-lich-tu-dong.md
```

Mỗi lần chạy đều ghi lại **log** và **chỉ số hiệu năng từng node** — xem lại ở [13-lich-su-chay-va-metrics.md](13-lich-su-chay-va-metrics.md). Mỗi lần **lưu** workflow (không phải chạy) tạo 1 phiên bản mới, có thể rollback — xem [14-phien-ban-workflow.md](14-phien-ban-workflow.md).

## Không chắc nên bắt đầu từ đâu?

- Mới cài app lần đầu → [01-cai-dat.md](01-cai-dat.md) → [02-quan-ly-profile.md](02-quan-ly-profile.md)
- Muốn tự động hoá 1 thao tác lặp đi lặp lại, chưa quen kéo-thả node → [05-ghi-lai-thao-tac.md](05-ghi-lai-thao-tac.md) (Record Mode) rồi nhờ [06-ai-agent.md](06-ai-agent.md) tinh chỉnh
- Cần chạy cùng 1 kịch bản cho hàng loạt tài khoản/profile → [11-campaigns.md](11-campaigns.md)
- Gặp lỗi không biết vì sao → [15-khac-phuc-su-co.md](15-khac-phuc-su-co.md)

Tiếp theo: [Cài đặt →](01-cai-dat.md)
