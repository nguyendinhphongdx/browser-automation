# ADR-0014: Chặn chạy pipeline rỗng/thiếu save-to-library + Task Output không fallback nhầm

🟢 Accepted

- **Date**: 2026-10-14
- **Status**: Accepted

## Context

Người dùng báo: 1 task kind="image" (status "Đang làm", không phải "Xong" — ít nhất AI không báo sai hoàn thành) nhưng phần Output trong Task Detail chỉ hiện toàn văn bản/markdown (prompt set, kịch bản, sổ tay dự án), không có ảnh nào.

Khảo sát trực tiếp trên bản sao database thật (copy kèm `.db-wal`/`.db-shm`, không đụng file gốc) lộ ra 2 lỗi riêng biệt:

1. AI đã gọi `run_video_pipeline` trên 1 pipeline **0 node, 0 edge** (rỗng hoàn toàn). `executeVideoPipeline` (`video-studio/engine.ts`) khi nhận mảng node rỗng, `topologicalLevels` trả `[]`, vòng lặp thực thi không chạy gì — hàm `resolve` bình thường như thể đã chạy xong. Tool trả về `{ok: true, status: 'completed', logs: []}` — "thành công" dù chẳng làm gì cả. AI tin vào `ok: true` này mà không tự kiểm tra lại logs/output thật.
2. Phần "Output" trong Task Detail (`ProjectPage.tsx`) khi `task.outputFolderId` là `null` (task này đúng là chưa có folder riêng) fallback hiện **toàn bộ thư mục gốc của project** — vô tình trộn lẫn resource của MỌI task khác (sổ tay, kịch bản) vào, trông như "đây là output của task này" dù hoàn toàn không phải.

## Decision

### 1. `assertPipelineRunnable(nodes)` (`main/video-studio/assert-runnable.ts`, mới)

Hàm thuần kiểm tra 2 điều kiện tối thiểu để 1 lần chạy có khả năng tạo ra kết quả thật: (a) có ít nhất 1 node, (b) có ít nhất 1 node `save-to-library` (nếu không, dù các node khác chạy thành công, không có gì được lưu vào Thư viện). Ném lỗi rõ ràng bằng tiếng Việt nếu vi phạm.

Gọi hàm này ở CẢ 2 call site thực thi pipeline — `agent/tools/run-video-pipeline.ts` (AI tự chạy) và `ipc/video-studio-handlers.ts`'s `video-studio:run` (người dùng bấm Chạy thủ công) — ngay trước `executeVideoPipeline`. KHÔNG đặt check này bên trong `executeVideoPipeline` chính nó: hàm đó là 1 generic graph executor (không biết gì về "loại node nào là node lưu kết quả"), đã có bộ test riêng (`engine.test.ts`) cố tình dùng node type giả ('source'/'concat'/'fail'/'slow') để cô lập đúng ngữ nghĩa thực thi đồ thị (thứ tự phụ thuộc, song song, lan truyền lỗi) khỏi quy tắc "pipeline phải có gì đó lưu kết quả" — 1 quy tắc nghiệp vụ, không phải ngữ nghĩa thực thi đồ thị. Gộp 2 thứ vào `executeVideoPipeline` sẽ phá vỡ 7 test đang có (đã thử, revert lại) và làm hàm đó phụ thuộc cứng vào 1 string nodeType cụ thể.

### 2. Task Output không fallback nhầm (`renderer/pages/projects/ProjectPage.tsx`)

`useEffect` tải Output đổi từ `getLibraryChildren(task.outputFolderId ?? project.libraryFolderId)` sang: nếu `!task.outputFolderId`, set `outputResources = []` ngay (không gọi `getLibraryChildren` với thư mục gốc project nữa). Thông báo trống cũng tách rõ 2 trường hợp: "Chưa có output" (đã có folder riêng, chỉ là rỗng) vs "Task chưa có thư mục Output riêng — nhấn ✏️ Sửa để gán 1 thư mục" (chưa từng gán folder).

Không tự động tạo folder output mới hay đổi hành vi `handleUpload`/`save_resource` (vẫn fallback lưu vào thư mục gốc project khi task chưa có folder riêng — đó là hành vi LƯU hợp lý đã có từ ADR-0004/0009, khác với hành vi HIỂN THỊ đang gây hiểu nhầm).

## Alternatives considered

| Option | Pros | Cons | Why not |
|---|---|---|---|
| Thêm check vào thẳng `executeVideoPipeline` | Chỉ 1 chỗ | Phá 7 test cô lập ngữ nghĩa graph executor khỏi quy tắc nghiệp vụ; coupling sai lớp | Vi phạm layering, đã thử và revert |
| Giữ nguyên fallback hiện thư mục gốc project cho Output, chỉ thêm ghi chú nhỏ | Không đổi code nhiều | Vẫn gây hiểu nhầm — không giải quyết đúng vấn đề người dùng chỉ ra | Không đủ, cần hiện đúng sự thật |
| `assertPipelineRunnable` tách lớp + Output không fallback nhầm (chosen) | Giải quyết đúng gốc rễ ở đúng lớp, không phá test hiện có, UI trung thực về trạng thái thật | Task chưa có folder riêng giờ Output luôn rỗng cho tới khi người dùng gán folder — output do AI lưu vào gốc project (nếu task chưa có folder riêng) sẽ KHÔNG hiện trong Output panel của task đó nữa | Đánh đổi chấp nhận được — thà rỗng trung thực còn hơn hiện nhầm |

## Consequences

### Positive
- `run_video_pipeline`/nút "Chạy" thủ công không còn báo "completed" giả cho 1 pipeline rỗng hoặc không lưu được gì — AI (và người dùng) biết ngay có vấn đề thay vì tưởng đã xong.
- Task Detail's Output không còn trộn lẫn resource của task khác — điều hiện ra đúng là output thật của task đó.

### Negative
- Nếu AI/người dùng lưu kết quả vào thư mục gốc project (vì task chưa có outputFolderId riêng), Output panel của task đó sẽ KHÔNG hiện kết quả đó — phải tự vào Thư viện xem, hoặc gán 1 outputFolderId riêng cho task trước khi AI bắt đầu làm để Output hiện đúng.
- `assertPipelineRunnable` chỉ bắt được 2 kiểu lỗi cấu trúc cụ thể (0 node, thiếu save-to-library) — không bắt được pipeline có save-to-library nhưng input của nó không bao giờ nhận được dữ liệu thật (vd lỗi logic sâu hơn trong đồ thị).

## Related

- [ADR-0003](0003-video-studio-fanin-join-assumes-no-conditional-nodes.md) — tiền lệ giữ engine thực thi tổng quát, tách khỏi quy tắc riêng của từng loại node
- [ADR-0011](0011-run-video-pipeline-tool.md) — nơi `run_video_pipeline` được thêm, nay được bổ sung guard này
