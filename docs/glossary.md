# Thuật ngữ

[← Về mục lục](README.md)

Tên gọi các khái niệm dùng xuyên suốt tài liệu, theo đúng tên trong code (để tra lại source dễ hơn khi cần).

| Thuật ngữ | Nghĩa | Đọc thêm |
|---|---|---|
| **Profile** | 1 danh tính trình duyệt độc lập — fingerprint riêng, dữ liệu (cookie/cache) riêng | [user-guide/02](user-guide/02-quan-ly-profile.md) |
| **Fingerprint** | Tập thuộc tính giả lập (User-Agent, màn hình, canvas/webgl noise...) khiến mỗi profile trông như 1 máy khác nhau | [architecture/07](architecture/07-fingerprint.md) |
| **Workflow** | 1 kịch bản automation — đồ thị `nodes`+`edges` (chế độ kéo-thả) hoặc đoạn code (chế độ Code) | [user-guide/04](user-guide/04-automation-builder.md) |
| **Node** | 1 bước trong workflow (click, nhập text, gọi API...) — 54 loại, mỗi loại là 1 class kế thừa `BaseNode` | [architecture/05](architecture/05-workflow-engine.md) |
| **Edge** | 1 cạnh nối giữa 2 node trên canvas, có `sourceHandle` (nhánh) quyết định đi theo đường nào khi node nguồn có nhiều đầu ra (If/Else, Parallel Fork) | [architecture/05](architecture/05-workflow-engine.md) |
| **Branching node** | Node điều khiển luồng (If/Else, Loop, Try/Catch, Parallel Fork/Join...) — orchestrator (`engine.ts`) tự xử lý thay vì chỉ gọi `execute()` như node thường | [architecture/05](architecture/05-workflow-engine.md) |
| **Campaign** | Chạy 1 workflow trên nhiều profile cùng lúc (tuần tự hoặc song song) | [user-guide/11](user-guide/11-campaigns.md) |
| **Schedule** | Lịch tự kích hoạt 1 workflow/campaign — 3 kiểu: cron (định kỳ), webhook (gọi từ ngoài), chain (nối tiếp lịch khác) | [user-guide/12](user-guide/12-lich-tu-dong.md) |
| **Record Mode** | Ghi thao tác tay trên trình duyệt thật, tự sinh workflow từ các thao tác đó | [user-guide/05](user-guide/05-ghi-lai-thao-tac.md) |
| **AI Agent** | Trợ lý AI dùng tool thật (đọc trang, chạy JS, đề xuất sửa workflow) thay vì chat completion 1 lượt | [architecture/06](architecture/06-ai-agent.md) |
| **Tool** (AI Agent) | 1 hành động AI Agent có thể gọi (`get_page_url`, `run_js`...), đăng ký ở `tools/registry.ts` | [architecture/06](architecture/06-ai-agent.md) |
| **Approval gate** | Cơ chế dừng AI Agent lại chờ người dùng duyệt trước khi chạy tool nguy hiểm (`run_js`, xoá/thay thế workflow) | [architecture/06](architecture/06-ai-agent.md) |
| **Live preview** | Khung xem trực tiếp trình duyệt thật trong panel AI Agent, qua CDP screencast | [architecture/06](architecture/06-ai-agent.md) |
| **IPC** | Cơ chế giao tiếp giữa main process (Node, có quyền hệ thống) và renderer (React UI, không có quyền hệ thống) | [architecture/03](architecture/03-ipc.md) |
| **Main process** | Tiến trình Node.js của Electron — chạy DB, Playwright, mọi logic nghiệp vụ | [architecture/02](architecture/02-main-process.md) |
| **Renderer** | Tiến trình hiển thị UI (Chromium + React) — không có quyền hệ thống, phải gọi qua IPC | [architecture/02](architecture/02-main-process.md), [architecture/17](architecture/17-electron-security.md) |
| **Workflow version** | 1 snapshot nodes/edges/code tại thời điểm lưu — mỗi lần Save tạo 1 bản, rollback được | [user-guide/14](user-guide/14-phien-ban-workflow.md) |
| **Node metric** | 1 bản ghi thời gian chạy + kết quả của 1 lần 1 node thực thi — dùng tính thống kê hiệu năng | [architecture/11](architecture/11-metrics.md) |
