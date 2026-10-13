# ADR-0012: Gemini omni provider + node "Tạo ảnh"/"Tạo video" cho cả Video Studio và Automation

🟢 Accepted

- **Date**: 2026-10-13
- **Status**: Accepted

## Context

Người dùng đang thử nghiệm Gemini's "omni" API (`ai.interactions.create({model:'gemini-omni-1.1-flash', input, response_format:{type:'video'|'image', aspect_ratio, resolution}})` — 1 model sinh cả ảnh lẫn video qua cùng 1 endpoint, chỉ đổi `response_format.type`) và muốn thêm nó như 1 model/provider trong danh sách có sẵn.

Đồng thời, Automation (workflow) — khác Video Studio (pipeline) — chưa có bất kỳ node tạo ảnh/video nào, chỉ có các node duyệt web/dữ liệu/tích hợp. Người dùng muốn cả 2 module đều có node "Tạo ảnh"/"Tạo video", với yêu cầu rõ: mỗi node chỉ nhận 1 provider (dropdown), provider nào chưa cấu hình API key thì báo lỗi đỏ, nhận prompt + cấu hình response (kích thước/tỉ lệ khung hình/thời lượng) — và chỉ 1 interface chung, không xây 2 hệ thống provider song song.

Khảo sát xác nhận Video Studio đã có đúng kiến trúc cần: `VideoProvider` interface (`submit()`/`poll()`), `getVideoProvider()` registry tự ném lỗi "Chưa cấu hình ... API Key trong Cài đặt" khi thiếu key, `runProviderJob()` job-runner, API key mã hoá qua `settings-service.ts` (`SENSITIVE_KEYS` + `encryption.ts`). Automation's engine (`main/automation/engine.ts`/`base-node.ts`) đã tự động hiện trạng thái lỗi màu đỏ (viền đỏ + icon `XCircle`, xem `VisualEditor.tsx`) cho bất kỳ node nào throw lỗi khi chạy — không cần xây cơ chế báo lỗi mới.

## Decision

Thêm 1 provider mới `gemini-omni` (`main/video-studio/providers/gemini-omni-provider.ts`) theo đúng mẹo "sync job" của `openai-image-provider.ts` (gọi API thật trong `submit()`, ghi file tạm, `poll()` trả `succeeded` ngay) — vì Gemini omni trả output ngay trong response, không có job/poll thật. Đăng ký trong `providers/registry.ts`, thêm key vào `SENSITIVE_KEYS`, thêm field nhập key trong Settings.

Export `IMAGE_PROVIDER_OPTIONS`/`VIDEO_PROVIDER_OPTIONS`/`ASPECT_RATIO_OPTIONS` từ `video-studio/node-definitions.ts` (trước đó là const riêng không export) và thêm option Gemini vào cả 2 danh sách — đây là "1 interface chung": Automation **import lại đúng 3 const này** thay vì tự định nghĩa danh sách provider riêng, nên danh sách model luôn đồng bộ giữa 2 module.

2 node mới cho Automation (`main/automation/nodes/generate-media.ts`): `GenerateImageNode`/`GenerateVideoNode` gọi thẳng `getVideoProvider()` + `runProviderJob()` + `downloadToTemp()` (toàn bộ hạ tầng Video Studio đã có, tái dùng qua import cross-module trong cùng `main/` process — không phải HTTP/IPC), rồi lưu kết quả vào Library qua `createResourceFromBuffer()` với `objectType:'workflow'` — mirror đúng pattern `DownloadFileNode` (`automation/nodes/integration.ts`) đã dùng cho việc tải file ngoài vào Thư viện.

Không thêm continuity/reference-image cho 2 node Automation mới (chỉ prompt-driven, đúng yêu cầu đã nêu) — và không thêm pre-run static validation mới (Automation vẫn chỉ validate khi chạy, throw trong `init()`/`execute()`, đã đủ cho yêu cầu "báo lỗi đỏ" nhờ cơ chế `onNodeError` có sẵn).

## Alternatives considered

| Option | Pros | Cons | Why not |
|---|---|---|---|
| Xây provider registry riêng cho Automation, tách biệt Video Studio | Mỗi module độc lập, không phụ thuộc chéo | Nhân đôi toàn bộ provider/job-runner/key-storage, danh sách model dễ lệch nhau giữa 2 module theo thời gian | Người dùng yêu cầu rõ "1 interface chung" |
| Chỉ thêm Gemini omni cho Video Studio, không làm gì cho Automation | Khối lượng nhỏ hơn hẳn | Không giải quyết yêu cầu rõ ràng "cả workflow cũng cần node tạo ảnh/video" | Người dùng chọn làm cả 2 module |
| Tái dùng nguyên `main/video-studio/providers/*` cho cả 2 module qua import cross-module (chosen) | Danh sách model/provider là 1 nguồn duy nhất, tận dụng toàn bộ job-runner/encryption/settings đã kiểm chứng, Automation có "báo lỗi đỏ" miễn phí từ engine có sẵn | Automation giờ phụ thuộc vào code của video-studio (chấp nhận được — cùng 1 app, cùng `main/` process, không phải ranh giới service) | Đúng yêu cầu, chi phí thấp nhất |

## Consequences

### Positive
- Danh sách provider/model tạo ảnh/video giờ là 1 nguồn duy nhất (`video-studio/node-definitions.ts`'s 3 const export) — thêm/sửa 1 chỗ, cả 2 module cùng thấy.
- Automation lần đầu có khả năng tạo ảnh/video thật, dùng chung hạ tầng key-storage mã hoá đã kiểm chứng (không viết cơ chế lưu key mới).
- "Báo lỗi đỏ khi thiếu key" đến miễn phí từ cơ chế `onNodeError`/`workflow:node-progress` có sẵn — không cần code UI mới.

### Negative
- Automation's `nodes/generate-media.ts` phụ thuộc trực tiếp vào `main/video-studio/providers/*` — nếu sau này tách Video Studio thành package/service riêng, đây là điểm phải refactor.
- Gemini omni chưa hỗ trợ `durationSec` (API hiện tại không có field này) — field này bị bỏ qua khi provider là `gemini-omni`, không có cảnh báo UI nào cho người dùng biết field đó vô tác dụng với provider này.

## Related

- [ADR-0011](0011-run-video-pipeline-tool.md) — tiền lệ gọi thẳng engine Video Studio từ 1 ngữ cảnh khác (agent tool) mà không qua renderer
