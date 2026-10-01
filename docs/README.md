# Tài liệu BrowserAuto

Tài liệu được chia làm 3 nhóm, tuỳ theo bạn đang muốn **dùng** app, **đóng góp code**, hay **hiểu kiến trúc** bên trong.

## [user-guide/](user-guide/) — Dùng ứng dụng

Hướng dẫn sử dụng từng tính năng, dành cho người dùng cuối (không cần biết code).

| # | Tài liệu | Nội dung |
|---|---|---|
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

## [development/](development/) — Đóng góp code

| # | Tài liệu | Nội dung |
|---|---|---|
| 1 | [Bắt đầu](development/01-bat-dau.md) | Setup máy, chạy dev, quy ước code, thêm node/tool mới |

---

Tài liệu gốc `docs/GUIDE.md` (1 file duy nhất) đã được thay bằng cấu trúc trên — nội dung cũ được giữ nguyên ý nghĩa nhưng tách theo tính năng và bổ sung các phần mới (AI Agent, live preview) chưa có khi file đó được viết.
