# ADR-0015: "Lưu vào Thư viện" nhận cả IMAGE/AUDIO, không chỉ VIDEO

🟢 Accepted

- **Date**: 2026-10-15
- **Status**: Accepted

## Context

Người dùng không kéo nối được output "image" của node "Tạo ảnh" (`generate-image`) vào input "media" của node "Lưu vào Thư viện" (`save-to-library`) trên canvas Video Studio.

Nguyên nhân: `save-to-library`'s input socket khai báo cứng `type: 'VIDEO'` (`node-definitions.ts`), còn `validateVideoEdge()` (`shared/video-studio/validate-edge.ts`) chỉ cho nối khi `source.type === target.type` chính xác tuyệt đối — `generate-image` output type `IMAGE` không bao giờ khớp. Đây là lỗi còn sót lại từ thời `save-to-library` được thiết kế CHỈ cho pipeline video (trước khi ADR-0012 thêm khả năng Automation/Video Studio tạo ảnh ĐỘC LẬP, không chỉ làm input trung gian cho `generate-video`) — hệ quả: **không có cách nào lưu kết quả của 1 pipeline chỉ-tạo-ảnh vào Thư viện**, vì node lưu duy nhất chỉ nhận VIDEO. Điều này cũng phá vỡ `assertPipelineRunnable` (ADR-0014, vừa thêm) — guard đó YÊU CẦU mọi pipeline phải có 1 node `save-to-library`, nhưng pipeline tạo ảnh lại không thể nối được tới nó.

## Decision

`VideoSocketDef.type` đổi từ `VideoSocketType` thành `VideoSocketType | VideoSocketType[]` (`shared/types.ts`) — mảng chỉ dùng cho INPUT socket muốn chấp nhận nhiều kiểu (output luôn là 1 giá trị đơn, 1 nguồn chỉ phát ra đúng 1 kiểu dữ liệu, không đổi). `validateVideoEdge()` cập nhật: `target.type` được chuẩn hoá thành mảng trước khi kiểm tra `source.type` có nằm trong đó không, thay vì so khớp tuyệt đối.

`save-to-library`'s input `media` đổi thành `type: ['IMAGE', 'VIDEO', 'AUDIO']` — 1 node lưu tổng quát duy nhất cho mọi loại output cuối cùng (ảnh/video/âm thanh), đúng tinh thần hướng dẫn AI đã có từ trước ("Pipeline PHẢI kết thúc bằng đúng 1 node save-to-library — không được thiếu", áp dụng chung cho mọi pipeline, không phân biệt loại).

`SaveToLibraryNode.execute()` (trước đây hardcode `kind: 'video', extension: 'mp4'`) giờ tự nhận diện loại thật từ phần mở rộng file nhận được (`path.extname`) — vì kênh dữ liệu giữa các node lúc chạy thật chỉ truyền 1 đường dẫn file tạm, không kèm metadata "đây là loại gì"; các node tạo ra file đó (`generate-image` → `.png`, `generate-video` → `.mp4`, `tts-*` → `.mp3`) đã tự quy ước phần mở rộng nhất quán, tận dụng lại thay vì truyền thêm 1 kênh metadata mới.

2 chỗ đọc `socket.type` như 1 giá trị đơn (renderer `VideoStudioNode.tsx`'s `SOCKET_COLORS` lookup, vẽ màu handle) thêm 1 helper nhỏ `socketColor()` lấy phần tử đầu tiên khi là mảng — chỉ ảnh hưởng màu sắc hiển thị, không ảnh hưởng logic nối/chạy.

## Alternatives considered

| Option | Pros | Cons | Why not |
|---|---|---|---|
| Thêm 1 node "save-image-to-library" riêng, giữ save-to-library chỉ nhận VIDEO | Không đổi type model hiện có | 2 node làm cùng 1 việc (lưu), người dùng/AI phải nhớ chọn đúng loại — tăng bề mặt API, trái với hướng dẫn "PHẢI kết thúc bằng ĐÚNG 1 node save-to-library" đã có từ trước | Phức tạp hơn không cần thiết, phá vỡ quy ước đã dạy AI |
| Đổi generate-image's output type thành 1 type "MEDIA" chung thay vì IMAGE | Không cần sửa validateVideoEdge | Phá vỡ MỌI kết nối IMAGE khác đang có (character-reference→generate-image's referenceImage, generate-video's image/continuityFrame input) — invasive hơn hẳn | Blast radius quá lớn so với vấn đề thật |
| Input socket chấp nhận mảng type, validateVideoEdge kiểm tra "nằm trong danh sách" (chosen) | Đúng đối tượng cần sửa (chỉ input của save-to-library), blast radius nhỏ (2 nơi đọc singular), tận dụng lại toàn bộ hạ tầng type-check hiện có | `VideoSocketDef.type` giờ là union phức tạp hơn 1 chút, cần 1 helper nhỏ ở 2 chỗ đọc singular | Đánh đổi nhỏ nhất, đúng gốc rễ |

## Consequences

### Positive
- Pipeline chỉ-tạo-ảnh (ADR-0012's use case) giờ kết nối VÀ chạy được trọn vẹn — `assertPipelineRunnable` (ADR-0014) không còn là ngõ cụt cho loại pipeline này.
- `save-to-library` giờ đúng là "1 node lưu duy nhất cho mọi loại output", khớp với hướng dẫn đã dạy AI từ trước, không cần sửa instructions.

### Negative
- `VideoSocketDef.type` phức tạp hơn (union với mảng) — mọi code mới đọc `.type` sau này phải nhớ xử lý cả 2 dạng, không chỉ giá trị đơn.
- Nhận diện kind bằng đuôi file là suy luận gián tiếp (không phải metadata tường minh) — nếu sau này 1 node mới tạo ra file với đuôi lạ không có trong `KIND_BY_EXTENSION`, sẽ fallback nhầm thành `'video'` thay vì báo lỗi.

## Related

- [ADR-0012](0012-gemini-omni-provider-and-automation-generate-nodes.md) — nơi nhu cầu "tạo ảnh độc lập, không chỉ làm input cho video" bắt đầu
- [ADR-0014](0014-pipeline-runnable-guard-and-task-output-honesty.md) — guard yêu cầu save-to-library mà ADR này giải quyết được bế tắc
