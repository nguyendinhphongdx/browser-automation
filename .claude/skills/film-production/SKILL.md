---
name: film-production
description: Sản xuất 1 tập phim trong MCP film-studio từ kịch bản đã lưu tới final.mp4 — character sheet, thoại TTS, storyboard, duyệt, nháp ảnh tĩnh, video, nhạc, ghép — với cổng xác nhận trước mỗi bước tốn tiền và báo quota. Dùng khi user muốn sinh ảnh/storyboard/video, "làm phim đi", ghép tập, sinh lại cảnh lỗi, hoặc xem đã tốn bao nhiêu quota.
---

# film-production — từ kịch bản tới mp4, không đốt tiền oan

Kịch bản phải có trước (skill `film-scene-writing`). Mọi bước sinh là **job nền**: tool trả `job_id` → `job_status(job_id, wait_sec=50)` lặp tới khi xong. `episode_get` luôn cho biết đang ở đâu và `next_steps`.

## Thứ tự & cổng

| # | Bước | Tool | Chi phí | Cổng |
|---|---|---|---|---|
| 0 | Trạng thái | `episode_get`, `usage_report` | 0 | Báo user tập đang ở bước nào |
| 1 | Character sheet + bối cảnh | `characters_generate` → `references_review` | ảnh ×(nhân vật+bối cảnh) | **Hỏi trước** lần đầu; cho user xem ảnh, sửa mô tả → `characters_generate(ids, force)` |
| 2 | Thoại TTS | `episode_audio_generate` | rẻ | Không cần hỏi. Đọc cảnh báo "đứng hình" → quay lại sửa kịch bản |
| 3 | Storyboard | `storyboard_generate` → `storyboard_review` | ảnh ×số cảnh | **Hỏi trước** (nói số ảnh). Duyệt cùng user |
| 4 | Sửa storyboard | `scene_update` / `storyboard_generate(scene_ids, force)` → `storyboard_approve` | ảnh ×cảnh sửa | Theo ý user |
| 5 | Nháp nhịp phim | `episode_assemble(allow_stills=true, music=false)` | 0 | Luôn làm. Gửi đường dẫn `video_abs` (hoặc dashboard http://localhost:4747) cho user xem |
| 6 | **Video** | `episode_videos_generate` | **đắt nhất** | **BẮT BUỘC hỏi**: số clip × tổng giây video, `usage_report` hiện tại. `prompt_preview` soát 2–3 cảnh quan trọng trước |
| 7 | Nhạc nền | `music_generate` | 1 bài | Hỏi nếu chưa có prompt nhạc |
| 8 | Ghép | `episode_assemble` | 0 | Chạy lại thoải mái |
| 9 | Báo cáo | `usage_report(episode_id)` | 0 | Tổng quota, số lần sinh lại, lỗi |

`episode_run` chạy nhiều bước liền — chỉ dùng cho 2 lượt: `["references","audio","storyboard"]` → duyệt → `["videos","music","assemble"]`, và chỉ khi user đã đồng ý chi phí lượt 2.

## Duyệt storyboard cùng user — soi gì

- Nhân vật đúng character sheet (mặt, trang phục, phụ kiện)? Sai → thêm chi tiết vào `image_prompt` hoặc giảm số nhân vật trong khung.
- Khung hình kể được nhịp truyện không cần thoại?
- Liên tục giữa cảnh liền nhau (hướng nhìn, vị trí, ánh sáng, thời gian trong ngày)?
- Có chữ/watermark lạ → sinh lại cảnh đó.
- **Ai là ai** (chốt chặn cuối trước khi tốn tiền video): xem dãy ảnh theo thứ tự kèm thoại. Câu gọi/xưng hô nào bị cắt sang người khác người được gọi không? Người được gọi vắng mặt đã xuất hiện bằng hình chưa? Có → quay lại `film-scene-writing` sửa kịch bản ([story-craft §7b](../film-story-craft/references/story-craft.md)), đừng vá bằng lời dẫn.
- Cảnh có trẻ em/người ở chỗ nguy hiểm (mép vực, giữa lũ) dễ bị bộ lọc an toàn của model video chặn: mô tả tư thế vững vàng, gợi nguy hiểm bằng cảnh rộng.

## Xử lý lỗi

| Hiện tượng | Làm |
|---|---|
| Job `completed_with_errors` | Đọc `result.failed`, sửa nguyên nhân, chạy lại với `scene_ids` các cảnh lỗi (không `force` cả tập) |
| 429 / RESOURCE_EXHAUSTED liên tục | Đợi vài phút; đề nghị user giảm `FILM_CONCURRENCY` |
| "Không có job" sau khi restart | Job chỉ sống trong process — xem trạng thái thật bằng `episode_get` |
| Video thiếu thoại / sai khẩu hình (native) | Cân nhắc `audio_mode: "tts"` cho cảnh đó qua `scene_update` |
| Phim lệch độ dài mục tiêu | Sửa kịch bản (thêm/bớt cảnh) trước khi sinh thêm video |

## Anti-pattern
- ❌ `force=true` cả tập để sửa 1–2 cảnh.
- ❌ Sinh video khi storyboard chưa duyệt hoặc chưa xem nháp ảnh tĩnh.
- ❌ `require_approval=false` khi user chưa nói rõ.
- ❌ Kết thúc mà không báo `usage_report`.
