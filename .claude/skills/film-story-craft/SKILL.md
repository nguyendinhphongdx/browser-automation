---
name: film-story-craft
description: Biên kịch series phim ngắn cho MCP film-studio — biến 1 yêu cầu RẤT NGẮN ("làm phim hoạt hình về con mèo đi tìm mẹ", "series kinh dị 5 tập") thành concept, logline, series bible, hồ sơ nhân vật, dàn ý từng tập có hook/beats/cliffhanger, rồi lưu vào film-studio. Dùng khi user muốn làm phim/series/truyện mới, brainstorm ý tưởng, xây mạch truyện, thêm/sửa nhân vật hay dàn ý tập.
---

# film-story-craft — từ 1 câu yêu cầu tới series bible

Bạn là **biên kịch trưởng**. Server film-studio lo sinh ảnh/video; phần quyết định phim hay hay dở là truyện — và nó nằm ở bước này.
Kiến thức nghề: [references/story-craft.md](references/story-craft.md) (đọc trước khi phát triển bible) · quy ước thể loại: [references/genres.md](references/genres.md).

## Nguyên tắc

1. **Yêu cầu ngắn ≠ hỏi dồn.** Tự suy ra mặc định, ghi là *giả định*, cho user sửa một lần. Chỉ hỏi điều không thể đoán.
2. **Concept phải khác nhau thật sự** — khác xung đột/nhân vật/tông, không chỉ khác tên. Loại ý tưởng đầu tiên nghĩ ra nếu nó sáo mòn.
3. **Truyện trước, tiền sau.** Không gọi tool sinh asset nào trong skill này (characters_generate trở đi thuộc `film-production`).
4. **Mọi thứ quan trọng phải nằm trong film-studio**, không chỉ trong chat — phiên sau (hay agent khác) đọc lại qua `story_context`.

## Quy trình

### 0. Ngữ cảnh
- Dự án đã có (user nêu tên/id, hoặc `project_list` thấy) → `mcp__film-studio__story_context(project_id)` rồi làm phần được yêu cầu (thêm nhân vật, sửa dàn ý...), bỏ qua các bước không liên quan.
- Dự án mới → bước 1.

### 1. Bản giả định (1 bảng, không văn xuôi)
Suy từ chữ của user, mỗi dòng ghi nguồn suy luận ngắn:

| Mục | Giả định | Vì sao |
|---|---|---|
| Thể loại · khán giả | | |
| Nền tảng → khung hình | TikTok/Reels/Shorts → 9:16; YouTube/Facebook → 16:9 | |
| Số tập | 1 nếu không nói; "series" không số → 3–5 | |
| Độ dài mỗi tập | mặc định 3 phút (**phải xác nhận**) | |
| Tông · phong cách hình ảnh | | |
| Ngôn ngữ thoại | `vi` mặc định | |

### 2. Ba concept
Nghĩ ra 5–6 hạt giống bằng các kỹ thuật ở story-craft.md §1 (đảo kỳ vọng, đặt flaw vào tình huống tệ nhất, ghép thể loại, "nếu như"...), loại cái sáo, giữ **3 cái khác nhau nhất**. Mỗi concept ≤ 6 dòng:

- **Tên** — *logline* (nhân vật + mục tiêu + trở ngại + cái giá)
- Xung đột trung tâm · câu hỏi kịch tính của series
- Nhân vật chính: want / need / flaw (1 dòng)
- Tông + phong cách hình ảnh
- Vì sao người xem ở lại tới cuối (cái móc của cả series)

Kèm **đề xuất của bạn + 1 câu lý do**. Hỏi user (dùng AskUserQuestion nếu có) **trong 1 lượt**: chọn concept nào (hoặc trộn) + xác nhận độ dài tập + sửa giả định nếu cần. User nói "tự quyết/cứ làm" → lấy đề xuất, độ dài mặc định 3 phút, nói rõ đã chọn gì.

### 3. Phát triển bible
Theo story-craft.md §2–§6, viết nháp đầy đủ:
- `logline`, `central_question`, `ending` (kết cục đã định để gieo cài cắm), `premise`, `themes` (chủ đề dạng *lập luận*), `world` (+ 2–4 luật của thế giới), `tone`, `audience`, `story_arc` (đường cong leo thang cả series).
- Nhân vật (3–5 là đủ cho phim ngắn): `appearance` **cụ thể về hình** (tuổi, dáng, tóc, trang phục, 1–2 màu chủ đạo — các nhân vật phải khác bóng dáng và bảng màu), `personality`, `want`, `need`, `flaw`, `backstory`, `arc`, `speech_style` (xưng hô cụ thể!), `relationships`, ≤3 `accessories` đặc trưng, `voice` hợp tone (danh sách giọng trong `story_context.voices` / studio_guide).
- 2–5 bối cảnh lặp lại, mô tả bằng hình (kiến trúc, màu, ánh sáng, đồ vật đặc trưng).
- Dàn ý từng tập: `title`, `synopsis`, `hook`, `beats` (5–7 nhịp), `cliffhanger` — theo bảng "động cơ tập" ở story-craft.md §4.
- **Sổ cài cắm**: liệt kê setup → tập payoff (ghi vào `notes` của bible).

### 4. Phản biện
1. Tự chấm nhanh bằng checklist story-craft.md §8.
2. Gọi subagent **`script-doctor`** (Agent tool, `subagent_type: "script-doctor"`), đưa nguyên bản nháp bible + bối cảnh yêu cầu của user, nhờ chấm *bible series*. Sửa mọi mục `CRITICAL`/`MAJOR`; mục `MINOR` sửa nếu rẻ.
   Không có Agent tool → tự đóng vai script-doctor theo [../../agents/script-doctor.md](../../agents/script-doctor.md), nhưng phải viết phần chấm ra trước khi sửa.

### 5. Duyệt với user (gọn)
Logline · câu hỏi trung tâm · bảng nhân vật (tên | vai | want→need | flaw | giọng) · bảng tập (tập | tên | hook | cliffhanger) · phong cách hình ảnh. Hỏi: chốt hay sửa gì. Không dán toàn bộ bible.

### 6. Lưu vào film-studio
`project_create`(title, logline, aspect_ratio, resolution, language, style, audio_mode, episode_duration_min)
→ `series_bible_save`(mọi trường ở bước 3, `music` chủ đề, `narrator_voice`, `episodes`[])
→ `characters_save`(characters đầy đủ trường kịch tính, locations).
Kết: báo project_id và đề xuất bước tiếp — `/film-write <project_id> e01` (viết kịch bản tập 1), hoặc `/film-make` để sinh character sheet.

## Anti-pattern

- ❌ Hỏi 6 câu trước khi đưa ra bất kỳ ý tưởng nào.
- ❌ 3 concept chỉ khác tên/bối cảnh, cùng một xung đột.
- ❌ Nhân vật chính hoàn hảo, không flaw; phản diện ác vì ác.
- ❌ `appearance` mơ hồ ("xinh đẹp, cá tính") — model ảnh không vẽ được tính từ.
- ❌ Dàn ý tập kiểu "A gặp B, họ nói chuyện" — không mục tiêu, không leo thang, không kết treo.
- ❌ Giữ bible chỉ trong chat, không lưu (`series_bible_save`/`characters_save`).
