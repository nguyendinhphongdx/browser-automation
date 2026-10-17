# Bản đồ quy trình + luật "kết mỗi bước"

Mọi skill/lệnh film-* dùng chung file này. User không cần nhớ lệnh nào — **agent dẫn đường**.

## Luật: làm phim KHÔNG sửa code

Phiên làm phim chỉ dùng tool của MCP (film-studio, publisher) và sửa nội dung dự án (bible, nhân vật, kịch bản, cảnh, bộ đăng bài).
**Không sửa code** của server: `scratch/omni/src/**`, `scratch/omni/test/**`, `package.json`, `.mcp.json`, và không sửa `projects/*/project.json` bằng tay.
Thiếu tính năng hoặc server lỗi → dừng, nói rõ cho user cái gì thiếu và cách tạm vượt bằng tool có sẵn (nếu có), rồi đề xuất làm thành **việc phát triển riêng** (phiên khác). User đồng ý mới có phiên code; phiên làm phim không tự chuyển sang code.

## Luật: chờ job thì báo từng phút

Đã khởi chạy job (sinh ảnh, thoại, video, nhạc, ghép, bộ đăng bài, publish_prepare) → **không kết lượt khi job còn chạy**, không nói "xong mình báo" rồi dừng (sẽ không ai báo).
Lặp `job_status(job_id, wait_sec=50)` (publisher: `publish_job_status`) tới khi xong. Sau MỖI lần gọi viết đúng 1 dòng:

`⏳ storyboard 12/32 xong · 0 lỗi · 3:40 đã chạy · còn ~5 phút`

(lấy từ `progress` + `elapsed_sec`; "còn ~" = thời gian trung bình mỗi mục × số còn lại / song song; chưa có số thì ghi bước đang chạy từ `recent_log`). Có lỗi thì nêu cảnh lỗi ngay trong dòng đó. Job xong → sang duyệt kết quả rồi "kết mỗi bước".
Chỉ được kết lượt khi job còn chạy nếu user bảo dừng/chờ — khi đó nói rõ job_id và cách xem lại (`/film-status`).

## Luật: kết mỗi bước

Xong 1 bước (hoặc 1 giai đoạn), KHÔNG dừng ở "Bước tiếp theo: `/film-…`". Luôn:

1. **Tóm tắt** kết quả 2–4 dòng (đã có gì, còn vướng gì, quota vừa tốn nếu có).
2. **Đề xuất bước kế tiếp** theo bản đồ dưới — nói nó làm gì, tốn gì (0 / ảnh × N / video × N giây).
3. **Hỏi duyệt** bằng AskUserQuestion (không có thì hỏi 1 câu có/không), 2–3 lựa chọn:
   - `Làm tiếp: <bước kế>` (Recommended) — mô tả ngắn + chi phí
   - `Sửa trước` — sửa gì ở bước vừa xong
   - `Dừng ở đây` — nói lệnh để quay lại sau (`/film-…`)
4. User chọn làm tiếp → **làm luôn trong lượt này**, không bắt user gõ lệnh. Nhảy sang skill của giai đoạn sau nếu cần.

Bước **tốn quota** (ô "Cổng" ghi *hỏi*): câu hỏi phải nêu số ảnh/clip/giây và `usage_report` hiện tại. "Cứ làm hết đi" chỉ áp cho bước miễn phí và bước đã nêu giá — tới cổng tốn tiền tiếp theo vẫn hỏi lại.

`job_status=succeeded` chỉ xác nhận asset tồn tại. Ảnh/video chỉ được coi là đạt sau cổng continuity và user duyệt đầu ra thật theo [visual-continuity.md](../../film-production/references/visual-continuity.md).

## Bản đồ

| Giai đoạn | Bước | Tool / skill | Tốn | Cổng | Kế tiếp |
|---|---|---|---|---|---|
| **1. Ý tưởng** `/film-new` | giả định + 3 concept | `film-story-craft` | 0 | chọn concept + độ dài | bible |
| | bible + nhân vật + dàn ý → `script-doctor` | `film-story-craft` | 0 | duyệt tóm tắt | lưu |
| | lưu | `project_create` → `series_bible_save` → `characters_save` | 0 | — | **viết kịch bản e01** |
| **2. Kịch bản** `/film-write` | kịch bản + phân cảnh 1 tập | `film-scene-writing` | 0 | chốt độ dài (lần đầu) | chấm |
| | chấm + sửa | `script-doctor` (`/film-review`) | 0 | chọn mục sửa | **sản xuất** |
| **3. Sản xuất** `/film-make` | character sheet + bối cảnh (1 lần/dự án) | `characters_generate` → `references_review` | ảnh × (nhân vật + bối cảnh) | **hỏi** | duyệt sheet |
| | thoại TTS | `episode_audio_generate` | rẻ | — | storyboard |
| | storyboard theo block | ledger → sinh tuần tự trong block → review block/toàn tập → approve | ảnh × cảnh | **hỏi** | nháp |
| | nháp ảnh tĩnh | `episode_assemble(allow_stills=true)` | 0 | user xem nháp | video |
| | pilot video | 3 clip đại diện → sample không nhạc → audit | clip × giây | **hỏi** | video còn lại |
| | video còn lại | `episode_videos_generate` | **đắt nhất**: clip × giây | **hỏi lại sau pilot** | preview thật |
| | preview clip thật | `episode_assemble(music=false)` → audit từng cảnh | 0 | user duyệt | nhạc |
| | nhạc + ghép | `music_generate` → `episode_assemble` | 1 bài / 0 | user xem final.mp4 | **đăng** |
| **4. Đăng** `/film-publish` | bộ đăng bài | `episode_publish_kit` | 0 | duyệt + `made_for_kids` | điền form |
| | điền sẵn từng nền tảng | publisher `publish_prepare` | 0 | user tự bấm Đăng | ghi nhận |
| | ghi nhận | `publish_record` | 0 | — | **tập tiếp theo** |
| **Tập sau** | lưu `recap` tập vừa xong → quay lại giai đoạn 2 với tập kế | `film-scene-writing` | 0 | — | … |

Tập cuối đăng xong → báo tổng kết dự án (số tập, tổng quota từ `usage_report`) và hỏi user có muốn mùa 2 / dự án mới.

Lạc giữa chừng (user quay lại sau vài ngày, hỏi "giờ làm gì") → `project_get` / `episode_get` → đọc `next_steps` → đặt vào bản đồ → hỏi như luật trên.
