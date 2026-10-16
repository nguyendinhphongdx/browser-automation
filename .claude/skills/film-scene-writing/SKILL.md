---
name: film-scene-writing
description: Viết kịch bản chi tiết + phân cảnh cho 1 tập phim trong MCP film-studio — beat sheet có mốc thời gian, cảnh có image_prompt/video_prompt/thoại/chuyển cảnh đúng schema, giữ liên tục với tập trước, khớp độ dài mục tiêu. Dùng khi user muốn viết/viết lại/sửa kịch bản một tập, viết tập tiếp theo, thêm cảnh, hoặc làm thoại hay hơn.
---

# film-scene-writing — kịch bản 1 tập, sẵn sàng sinh storyboard

Bạn là **biên kịch kiêm đạo diễn phân cảnh**. Đầu ra là 1 lần `episode_script_save` mà server nhận ngay, và đọc lên thấy hay.
Kỹ thuật cảnh/máy/thoại: [references/scene-writing.md](references/scene-writing.md) · nghề truyện: [../film-story-craft/references/story-craft.md](../film-story-craft/references/story-craft.md) (§4 động cơ tập, §7 thoại).

## Quy trình

### 1. Nạp ngữ cảnh
`mcp__film-studio__story_context(project_id, episode_id)`. Đọc kỹ: logline, central_question, ending, hồ sơ nhân vật (want/need/flaw/arc/**speech_style**), bối cảnh, dàn ý tập này (hook/beats/cliffhanger), `focus.previous` (recap + 3 cảnh cuối tập trước), `focus.scene_budget`.
- `focus.missing_recaps` không rỗng → đọc `episode_get(full=true)` tập đó, viết recap, lưu bằng `episode_script_save(episode_id=<tập đó>, recap=...)` trước.
- Tập chưa có trong dàn ý → tự đề xuất title/synopsis/hook/cliffhanger nối mạch, xác nhận với user cùng câu hỏi độ dài.
- `focus.target_confirmed=false` → **hỏi user** độ dài: mặc định dự án hay 3–8 phút. (Server từ chối lưu nếu thiếu.)

### 2. Beat sheet có mốc thời gian
Từ dàn ý, viết 6–8 nhịp theo bảng story-craft §4, mỗi nhịp: mốc (mm:ss), chuyện gì xảy ra, nhân vật muốn gì ở nhịp này, nó đổi gì. Tổng = độ dài mục tiêu. Tập ≥2: nhịp đầu nối thẳng cliffhanger tập trước (không tóm tắt dài).

### 3. Chia cảnh
Phân số cảnh theo `scene_budget` cho từng nhịp (nhịp cao trào nhiều cảnh ngắn, nhịp cảm xúc ít cảnh dài). Viết `script` (markdown, bản cho người đọc: diễn biến, hành động, thoại) rồi `scenes[]` theo [scene-writing.md](references/scene-writing.md):
- `characters` = **ai có mặt trong khung hình** (quyết định ảnh tham chiếu và chế độ âm thanh auto).
- `image_prompt` = 1 khung hình: cỡ cảnh + góc máy + bố cục + ánh sáng + hành động/biểu cảm. Không lặp ngoại hình.
- `video_prompt` = 1 hành động + 1 chuyển động máy.
- `lines` = 1–3 câu, đúng speech_style, `style` thẻ cảm xúc **tiếng Anh**, `speaker: "narrator"` cho lời dẫn.
- `transition` có chủ đích; `duration_sec` cho cảnh không lời.

### 4. Bốn lượt sửa (bắt buộc, trước khi lưu)
1. **Truyện**: mỗi cảnh đẩy truyện hoặc lộ nhân vật? Không → cắt/gộp. Cao trào do nhân vật chính tự quyết?
2. **Thoại**: đọc to từng nhân vật — ai cũng nói giống nhau? câu nào nói thẳng cảm xúc → đổi thành hành động/ẩn ý; câu > ~12 ký tự × thời lượng cảnh → tách cảnh.
3. **Hình**: đa dạng cỡ cảnh (không 3 cảnh liền cùng cỡ), giữ hướng nhìn/hướng chuyển động, cảnh sau "bắt" khung cảnh trước, ≤3 nhân vật/khung.
4. **Người xem lần đầu** ([story-craft §7b](../film-story-craft/references/story-craft.md)): quên kịch bản đi, chỉ đọc chuỗi *hình + câu nói* theo thứ tự như khán giả. Với **mỗi** câu có xưng hô/từ quan hệ hoặc câu gọi người vắng mặt, ghi ra: "người xem sẽ nghĩ câu này nói về/với ai?" (dựa vào cảnh ngay trước và ngay sau). Nếu khác ý định → sửa bằng hình (cho thấy đúng người được gọi, chèn cảnh trung gian, đổi thứ tự), không vá bằng lời dẫn. Ghi kết quả lượt này vào báo cáo cho user.
   Lỗi thật đã gặp: "Mẹ ơi!" (Cò) → cắt sang Mị Nương ⇒ người xem tưởng nàng là mẹ Cò.

### 5. Lưu & cân độ dài
`episode_script_save(project_id, episode_id, duration, title, synopsis, script, scenes, hook, beats, cliffhanger, recap, mode="replace")`.
- Đọc `episode.duration` + `next_steps`: lệch >15% → thêm/bớt cảnh hoặc thoại, lưu lại. Cảnh báo "đứng hình" (thoại TTS > clip tối đa) → tách cảnh.
- `recap`: điều đã thay đổi sau tập (quan hệ, vật phẩm, thương tích, bí mật lộ), tuyến còn treo.

### 6. Phản biện
Gọi subagent **`script-doctor`** với `project_id` + `episode_id` (nó tự đọc qua MCP). Sửa `CRITICAL`/`MAJOR` bằng `scene_update` (sửa lẻ) hoặc `episode_script_save` (sửa nhiều). Tối đa 2 vòng.

### 7. Báo user
Beat sheet (bảng mốc | nhịp) · số cảnh · độ dài ước tính / mục tiêu · cảnh TTS vs native · điểm script-doctor và đã sửa gì. Hỏi trước khi sinh storyboard (đó là `/film-make`, tốn tiền).

## Sửa tập đã có
- Sửa ít cảnh → `scene_update` (server tự bỏ asset không còn khớp, giữ phần không đổi).
- Viết lại nhiều → `episode_script_save` mode `replace`, **giữ nguyên id** của cảnh không đổi nội dung để giữ asset.
- Đổi thoại cảnh native = sinh lại video cảnh đó (tốn tiền) — nói cho user biết.

## Anti-pattern
- ❌ Viết scenes trước khi có beat sheet.
- ❌ Mở tập bằng toàn cảnh + lời dẫn "Ngày xửa ngày xưa…".
- ❌ `characters` liệt kê cả người chỉ được nhắc tên mà không có trong khung.
- ❌ `style` thoại bằng tiếng Việt (server từ chối — TTS sẽ đọc to).
- ❌ Lưu mà không kiểm tra `duration.estimated` so với target.
- ❌ Câu gọi người vắng mặt ("Mẹ ơi!", "Anh ở đâu?") rồi cắt sang một nhân vật khác — người xem sẽ gán quan hệ sai.
- ❌ Phát hiện hiểu nhầm sau khi đã sinh video rồi vá bằng lời dẫn giải thích — sửa ở kịch bản, bằng hình, trước khi tốn quota.
