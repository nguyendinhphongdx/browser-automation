# Database (SQLite local)

[← Về mục lục](../README.md)

Desktop app dùng **SQLite** qua `better-sqlite3` (native module, đồng bộ — không cần `await` cho mỗi query), chế độ `WAL` + `foreign_keys = ON`. Schema khởi tạo ở `main/database/init.ts` bằng `CREATE TABLE IF NOT EXISTS` — không có migration framework, thay đổi schema là sửa trực tiếp file này (an toàn vì `IF NOT EXISTS` không phá dữ liệu cũ, nhưng **thêm cột mới vào bảng đã tồn tại cần tự viết `ALTER TABLE` riêng**, không tự động).

File DB nằm tại `<userData>/browser-automation.db` (xem đường dẫn thật ở Cài đặt → Thông tin).

## Sơ đồ bảng

```
profiles ──┬── proxy_id (lỏng lẻo, không FK) ──> proxies
           ├── emails.profile_id (FK, SET NULL khi xoá profile)
           └── cookies.profile_id (FK, SET NULL khi xoá profile)

workflows ──┬── workflow_logs.workflow_id (FK, CASCADE)
            ├── workflow_versions.workflow_id (FK, CASCADE)
            └── node_metrics.workflow_id (FK, CASCADE)

campaigns ── campaign_runs.campaign_id (FK, CASCADE)

schedules.target_id → workflows.id | campaigns.id (lỏng lẻo — target_type phân biệt loại)
```

## Các bảng

| Bảng | Vai trò | Cột đáng chú ý |
|---|---|---|
| `profiles` | Danh tính trình duyệt | `fingerprint` (JSON), `browser_executable_path`, `proxy_id` |
| `proxies` | Danh sách proxy | `type` (http/https/socks4/socks5), `status`, `speed` |
| `emails` | Tài khoản email | `password` (mã hoá AES-256-GCM), `provider`, `status` |
| `cookies` | Bộ cookie đã lưu | `cookies` (JSON array), gán theo `domain` |
| `workflows` | Định nghĩa workflow | `nodes`/`edges` (JSON — đồ thị React Flow), `code` (chế độ Code), `mode` (`visual`\|`code`) |
| `workflow_logs` | 1 dòng / lần chạy | `logs` (JSON array `LogEntry[]`), `status` |
| `workflow_versions` | Lịch sử phiên bản | snapshot `nodes`/`edges`/`code` tại thời điểm lưu, `version_number` tăng dần |
| `campaigns` | Chạy nhiều profile × nhiều workflow | `profile_ids`/`workflow_ids` (JSON array id), `execution` (JSON — tuần tự hay song song) |
| `campaign_runs` | 1 dòng / lần chạy campaign | `profile_results` (JSON — kết quả từng profile) |
| `schedules` | Lịch tự động (cron/webhook) | `cron_expression`, `webhook_secret`, `chain_source_id` (chạy nối tiếp sau 1 schedule khác) |
| `node_metrics` | Thống kê mỗi lần chạy 1 node | `execution_time_ms`, `success`, dùng cho trang Metrics |
| `settings` | Key-value cấu hình app | AI provider/key, theme, ngôn ngữ... |

## Vì sao `nodes`/`edges`/`fingerprint`... lưu dạng JSON text thay vì bảng riêng

Đây là dữ liệu **có cấu trúc nhưng chỉ đọc/ghi nguyên khối** — không bao giờ cần `WHERE` lọc theo 1 field bên trong `nodes[3].config.url` chẳng hạn. Query nguyên cụm + parse ở application layer (`JSON.parse`/`JSON.stringify` ở `services/`) đơn giản hơn nhiều so với chuẩn hoá thành bảng con, và tránh N+1 query khi load 1 workflow.

## `profiles.proxy_id` và `schedules.target_id` không có `FOREIGN KEY`

Cố ý — 2 cột này có thể trỏ tới bản ghi đã xoá tạm thời trong 1 số luồng (ví dụ xoá proxy nhưng vẫn muốn giữ lại thông tin profile), và `schedules.target_id` trỏ tới 1 trong 2 bảng khác nhau tuỳ `target_type` nên không thể khai báo FK tới "1 bảng cố định". Code ở `services/` tự xử lý trường hợp id không còn tồn tại.
