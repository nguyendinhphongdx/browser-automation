# ADR-0016: Gemini (omni) — model ảnh/video cấu hình riêng trong Cài đặt

🟢 Accepted

- **Date**: 2026-10-15
- **Status**: Accepted

## Context

Người dùng báo lỗi `404 Model 'gemini-omni-1.1-flash' not found` khi dùng provider Gemini (omni) cho node "Tạo ảnh" (Video Studio) — dù chính model này chạy ổn định cho "Tạo video" (đã kiểm chứng 2 lần: `scratch/omni/omni.js` và gọi trực tiếp SDK ngoài Electron, cả 2 đều sinh video thật thành công).

Điều tra trực tiếp (gọi thật API, cùng key, cùng SDK) phát hiện nguyên nhân thật: gửi `response_format: {type: 'image', ...}` tới `gemini-omni-1.1-flash` **không hề trả về ảnh** — response luôn mang field `output_video` (có dữ liệu thật, định dạng video base64) thay vì `output_image`, bất kể yêu cầu loại gì. Có lúc server còn trả thẳng lỗi 404 cho yêu cầu ảnh thay vì âm thầm trả video. Kết luận: **`gemini-omni-1.1-flash` là model CHỈ SINH VIDEO** — code cũ coi nó dùng chung được cho cả 2 loại là sai giả định, không phải lỗi logic request.

## Decision

`createGeminiOmniProvider(apiKey, models?)` (`gemini-omni-provider.ts`) nhận thêm tham số `GeminiOmniModels { videoModel?, imageModel? }`:
- `videoModel` mặc định `'gemini-omni-1.1-flash'` nếu không cấu hình — giữ hành vi đã kiểm chứng hoạt động.
- `imageModel` **không có default** — nếu node "Tạo ảnh" chọn provider `gemini-omni` mà chưa cấu hình tên model ảnh, ném lỗi rõ ràng ngay lập tức ("Chưa cấu hình model ảnh cho Gemini (omni) trong Cài đặt — gemini-omni-1.1-flash đã kiểm chứng chỉ sinh video") thay vì gọi model sai và nhận 404/output sai loại khó hiểu.

`providers/registry.ts`'s case `'gemini-omni'` đọc 2 setting mới (`videoStudio.geminiOmni.videoModel`, `videoStudio.geminiOmni.imageModel`) qua `getSetting()` — không mã hoá (không phải secret, chỉ là tên model, khác API key).

Settings UI (`SettingsPage.tsx`) thêm 1 field text thường (`PlainTextField`, component mới — khác `MaskedKeyField` vì không cần che giấu) cho mỗi loại: field model ảnh ở mục "Tạo ảnh" (placeholder gợi ý người dùng tự tra cứu model ảnh thật trong tài liệu Google — KHÔNG đặt sẵn 1 tên model mình chưa kiểm chứng, tránh lặp lại đúng lỗi vừa sửa), field model video ở mục "Tạo video" (placeholder = default đã kiểm chứng).

## Alternatives considered

| Option | Pros | Cons | Why not |
|---|---|---|---|
| Tự đoán 1 tên model ảnh khác (vd từ danh sách model SDK khai báo) rồi hardcode | Không cần thêm UI | Chưa kiểm chứng tên đó THẬT SỰ hoạt động với key hiện có — lặp lại đúng sai lầm ban đầu (đoán mò tên model) | Không đủ bằng chứng, rủi ro lặp lại lỗi |
| Bỏ hẳn Gemini omni khỏi IMAGE_PROVIDER_OPTIONS, chỉ giữ cho VIDEO | An toàn nhất, không cần thêm field | Người dùng có thể biết đúng tên model ảnh riêng (qua tài liệu Google) nhưng không có chỗ nhập — khoá chết khả năng dùng Gemini cho ảnh vĩnh viễn | Quá cứng nhắc, không cần thiết nếu chỉ cần 1 chỗ nhập tên model |
| Cho cấu hình tên model riêng cho ảnh/video trong Cài đặt, không default cho ảnh (chosen) | Người dùng tự điền đúng tên model thật họ tra được, lỗi hiện rõ ràng ngay nếu chưa điền, không đoán mò | Thêm 2 field cấu hình mới, người dùng phải tự tra cứu model ảnh đúng (không có sẵn) | Đúng mức trách nhiệm — hệ thống không đoán hộ thứ chưa kiểm chứng được |

## Consequences

### Positive
- Không còn 404/kết quả sai loại khó hiểu khi dùng nhầm model video cho ảnh — lỗi hiện ngay, rõ ràng, đúng lúc submit chứ không phải sau khi gọi API thật (tốn thời gian/tiền).
- Model video vẫn hoạt động y hệt trước (không cấu hình gì vẫn chạy đúng default đã kiểm chứng).
- Kiến trúc mở — khi Google ra model ảnh riêng cho dòng "omni", người dùng chỉ cần điền tên vào Cài đặt, không cần sửa code.

### Negative
- Gemini (omni) hiện KHÔNG dùng được cho tạo ảnh ngay-khi-cài-đặt — người dùng phải tự tìm đúng tên model ảnh (nếu có) từ tài liệu Google rồi tự điền, không có trải nghiệm "chọn là chạy" như FLUX/OpenAI Image.

## Related

- [ADR-0012](0012-gemini-omni-provider-and-automation-generate-nodes.md) — nơi Gemini omni được thêm vào lần đầu, giả định sai rằng 1 model dùng chung được cho cả ảnh/video
