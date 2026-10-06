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
| 16 | [Giao diện & Ngôn ngữ](user-guide/16-giao-dien-va-ngon-ngu.md) | Theme sáng/tối/hệ thống, chuyển Tiếng Việt/English |
| 17 | [Import/Export dữ liệu](user-guide/17-import-export-du-lieu.md) | Mọi nơi có thể xuất/nhập dữ liệu trong app, gom 1 chỗ |
| 18 | [Tính năng Campaign nâng cao](user-guide/18-campaign-nang-cao.md) | Quota, chọn profile theo rule, A/B test, phụ thuộc workflow — đã có ở backend, chưa có UI |
| 19 | [Mua bán trên Marketplace](user-guide/19-marketplace-mua-ban.md) | Script trả phí hiện chưa thanh toán được thật |

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
| 18 | [Renderer state](architecture/18-renderer-state.md) | 7 Zustand store, quy ước action/async |
| 19 | [Routing, theme, i18n](architecture/19-routing-theme-i18n.md) | React Router, dark mode, chuyển ngôn ngữ |
| 20 | [Visual Editor canvas](architecture/20-visual-editor-canvas.md) | React Flow, custom node/edge, NodePropertiesPanel |
| 21 | [Service layer pattern](architecture/21-service-layer-pattern.md) | CRUD lặp lại giữa các `*-service.ts`, settings dạng KV |
| 22 | [Campaign nâng cao](architecture/22-advanced-campaign-features.md) | Quota, rule chọn profile, A/B test, DAG phụ thuộc workflow |
| 23 | [Kiểm tra proxy](architecture/23-proxy-health-check.md) | TCP connect thô, đo tốc độ, không qua HTTP thật |
| 24 | [API client & refresh token](architecture/24-api-client.md) | Gọi server, tự refresh JWT khi hết hạn |
| 25 | [Danh mục IPC channel](architecture/25-ipc-channel-catalog.md) | Toàn bộ channel theo từng domain |
| 26 | [Onboarding](architecture/26-onboarding-flow.md) | Luồng chào mừng lần đầu mở app |
| 27 | [Sub-workflow & đệ quy](architecture/27-sub-workflow-recursion.md) | `depth`, chặn đệ quy vô hạn khi 1 workflow gọi workflow khác |
| 28 | [Settings keys reference](architecture/28-settings-keys-reference.md) | Mọi key cấu hình đang tồn tại, key nào chưa có UI |
| 29 | [Thanh toán Marketplace](architecture/29-marketplace-payment-flow.md) | Checkout Stripe còn là TODO, download chưa gate theo thanh toán |
| 30 | [Đánh giá & review script](architecture/30-script-reviews.md) | Unique constraint, tính avgRating |
| 31 | [Retry & backoff của node](architecture/31-node-retry-backoff.md) | `NodeRetryConfig`, tự chụp màn hình khi lỗi |
| 32 | [Chế độ Code](architecture/32-code-mode-execution.md) | `new Function`, API thật rộng hơn autocomplete khai báo |
| 33 | [Build Electron-Vite](architecture/33-electron-vite-build.md) | 3 target build (main/preload/renderer), alias |
| 34 | [CORS webhook server](architecture/34-webhook-cors-note.md) | Vì sao `Access-Control-Allow-Origin: *` vẫn an toàn ở đây |
| 35 | [Nội dung shared-types](architecture/35-shared-types-content.md) | Những type thật sự nằm trong package không dùng tới |
| 36 | [Admin dashboard (server)](architecture/36-admin-pages.md) | Trang nào có dữ liệu thật, trang nào còn là khung |
| 37 | [Campaign Editor UI](architecture/37-campaign-editor-ui.md) | Field nào đã nối, field nào quota/rule chưa nối |
| 38 | [Định dạng import Email/Cookie](architecture/38-email-cookie-formats.md) | CSV có/không header, JSON cookie — cookie đã lưu chưa được áp dụng |
| 39 | [⚠️ electron-builder đóng gói sai thư mục](architecture/39-electron-builder-files-mismatch.md) | `dist/` vs `out/` — khả năng cao installer hiện tại không chạy được |

## [development/](development/) — Đóng góp code

| # | Tài liệu | Nội dung |
|---|---|---|
| 1 | [Bắt đầu](development/01-bat-dau.md) | Setup máy, chạy dev, quy ước code, thêm node/tool mới |
| 2 | [Kiểm thử](development/02-kiem-thu.md) | Vitest, quy ước mock theo từng tầng |
| 3 | [Quy trình Release](development/03-quy-trinh-release.md) | Gắn tag, CI build, prerelease |
| 4 | [Quy ước commit](development/04-quy-uoc-commit.md) | Tiền tố `feat`/`fix`/`docs`, thông điệp nên viết gì |
| 5 | [Thêm trang mới](development/05-them-trang-moi.md) | Walkthrough: route + store + sidebar |
| 6 | [Thêm ngôn ngữ](development/06-them-ngon-ngu.md) | Thêm locale mới vào `i18n.ts` |
| 7 | [Mẹo debug](development/07-meo-debug.md) | DevTools main vs renderer, log ở đâu |
| 8 | [Known gaps](development/08-known-gaps.md) | Checklist tổng hợp mọi khoảng trống đã phát hiện |
| 9 | [Cấu hình Stripe thật](development/09-wiring-up-stripe.md) | Việc còn thiếu để checkout hoạt động thật |
| 10 | [An toàn của chế độ Code](development/10-code-mode-an-toan.md) | Vì sao không cần (và không nên) approval gate ở đây |
| 11 | [Xác minh bản đóng gói](development/11-xac-minh-ban-dong-goi.md) | Checklist mở thử file cài đặt thật, không chỉ tin CI xanh |

## Khác

- [Thuật ngữ (Glossary)](glossary.md) — tên gọi các khái niệm dùng xuyên suốt tài liệu

---

Tài liệu gốc `docs/GUIDE.md` (1 file duy nhất) đã được thay bằng cấu trúc trên — nội dung cũ được giữ nguyên ý nghĩa nhưng tách theo tính năng và bổ sung các phần mới (AI Agent, live preview, Campaign, Lịch tự động...) chưa có khi file đó được viết.
