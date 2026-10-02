# Tài liệu BrowserAuto

Tài liệu được chia làm 3 nhóm, tuỳ theo bạn đang muốn **dùng** app, **đóng góp code**, hay **hiểu kiến trúc** bên trong.

## [user-guide/](user-guide/) — Dùng ứng dụng

Hướng dẫn sử dụng từng tính năng, dành cho người dùng cuối (không cần biết code).

| # | Tài liệu | Nội dung |
|---|---|---|
| 0 | [Tổng quan tính năng](user-guide/00-tong-quan-tinh-nang.md) | Bản đồ toàn bộ tính năng, nên đọc trước tiên |
| 1 | [Cài đặt](user-guide/01-cai-dat.md) | Yêu cầu hệ thống, cài đặt lần đầu |
| 2 | [Quản lý Profile](user-guide/02-quan-ly-profile.md) | Tạo, chỉnh sửa, nhân đôi profile + fingerprint |
| 3 | [Quản lý tài nguyên](user-guide/03-quan-ly-tai-nguyen.md) | Proxy, Email, Cookie |
| 4 | [Automation Builder](user-guide/04-automation-builder.md) | Kéo thả, viết code, các loại node |
| 5 | [Ghi lại thao tác](user-guide/05-ghi-lai-thao-tac.md) | Record Mode — biến thao tác tay thành workflow |
| 6 | [AI Agent](user-guide/06-ai-agent.md) | Trợ lý AI xây workflow cùng bạn, xem trình duyệt trực tiếp |
| 7 | [Marketplace](user-guide/07-marketplace.md) | Import/export, chia sẻ kịch bản |
| 8 | [Kết nối Server](user-guide/08-ket-noi-server.md) | Đồng bộ cloud, đăng nhập |
| 9 | [Cài đặt ứng dụng](user-guide/09-cai-dat-ung-dung.md) | Giao diện, ngôn ngữ, mã hoá dữ liệu |
| 10 | [Phím tắt](user-guide/10-phim-tat.md) | Toàn bộ shortcut |
| 11 | [Campaign](user-guide/11-campaigns.md) | Chạy 1 workflow trên nhiều profile cùng lúc |
| 12 | [Lịch tự động](user-guide/12-lich-tu-dong.md) | Cron, webhook, chạy nối tiếp (chain) |
| 13 | [Lịch sử chạy & Metrics](user-guide/13-lich-su-chay-va-metrics.md) | Theo dõi hiệu năng từng node qua thời gian |
| 14 | [Phiên bản workflow](user-guide/14-phien-ban-workflow.md) | Lịch sử lưu, gắn nhãn, rollback |
| 15 | [Khắc phục sự cố](user-guide/15-khac-phuc-su-co.md) | Lỗi thường gặp và cách xử lý |

## [architecture/](architecture/) — Hiểu kiến trúc

Tài liệu kỹ thuật, dành cho người đọc/sửa code trong repo này.

| # | Tài liệu | Nội dung |
|---|---|---|
| 1 | [Tổng quan](architecture/01-tong-quan.md) | Monorepo, 2 ứng dụng, luồng dữ liệu tổng thể |
| 2 | [Main process](architecture/02-main-process.md) | Cấu trúc `apps/desktop/src/main`, service layer |
| 3 | [IPC](architecture/03-ipc.md) | Quy ước đặt tên channel, request/response vs push |
| 4 | [Database](architecture/04-database.md) | Schema SQLite đầy đủ, quan hệ giữa các bảng |
| 5 | [Workflow Engine](architecture/05-workflow-engine.md) | Node registry, orchestrator, branching, parallel |
| 6 | [AI Agent](architecture/06-ai-agent.md) | Kiến trúc agent, tool, approval gate, live preview |
| 7 | [Fingerprint](architecture/07-fingerprint.md) | Cách sinh và inject fingerprint chống phát hiện |
| 8 | [Server](architecture/08-server.md) | Next.js server, Prisma schema, auth, marketplace |
| 9 | [Scheduler & Webhook](architecture/09-scheduler-webhook.md) | Vòng lặp poll 30s, HTTP server nội bộ nhận webhook |
| 10 | [Campaign Engine](architecture/10-campaign-engine.md) | Chạy song song/tuần tự nhiều profile, warm-up, retry |
| 11 | [Metrics](architecture/11-metrics.md) | Thu thập `node_metrics`, tính toán thống kê |
| 12 | [Backup](architecture/12-backup.md) | Định dạng file backup, đồng bộ server, auto-refresh token |
| 13 | [Mã hoá & bảo mật dữ liệu](architecture/13-ma-hoa-bao-mat.md) | AES-256-GCM, nơi lưu khoá, giới hạn thực tế |
| 14 | [Recorder](architecture/14-recorder.md) | Cách suy ra selector, chuyển action → node |
| 15 | [Auto-update & Release](architecture/15-auto-update-release.md) | electron-updater, electron-builder, GitHub Releases |
| 16 | [Shared packages](architecture/16-shared-packages.md) | `shared-types`, `fingerprint` — khi nào nên/không nên dùng |
| 17 | [Electron security](architecture/17-electron-security.md) | contextIsolation, sandbox, vì sao preload là ranh giới tin cậy duy nhất |

## [development/](development/) — Đóng góp code

| # | Tài liệu | Nội dung |
|---|---|---|
| 1 | [Bắt đầu](development/01-bat-dau.md) | Setup máy, chạy dev, quy ước code, thêm node/tool mới |
| 2 | [Kiểm thử](development/02-kiem-thu.md) | Vitest, quy ước mock theo từng tầng |
| 3 | [Quy trình Release](development/03-quy-trinh-release.md) | Gắn tag, CI build, prerelease |
| 4 | [Quy ước commit](development/04-quy-uoc-commit.md) | Tiền tố `feat`/`fix`/`docs`, thông điệp nên viết gì |

## Khác

- [Thuật ngữ (Glossary)](glossary.md) — tên gọi các khái niệm dùng xuyên suốt tài liệu

---

Tài liệu gốc `docs/GUIDE.md` (1 file duy nhất) đã được thay bằng cấu trúc trên — nội dung cũ được giữ nguyên ý nghĩa nhưng tách theo tính năng và bổ sung các phần mới (AI Agent, live preview, Campaign, Lịch tự động...) chưa có khi file đó được viết.
