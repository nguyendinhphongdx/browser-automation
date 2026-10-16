---
name: film-publish
description: Đăng 1 tập phim film-studio lên YouTube / Shorts / TikTok / Facebook Reels — soạn bộ đăng bài (tiêu đề, mô tả, chapter, hashtag, bản dọc 9:16), duyệt cùng user, rồi điền sẵn form upload trong Chrome của user qua MCP publisher và DỪNG để user tự bấm Đăng. Dùng khi user muốn đăng/up/publish tập phim, soạn tiêu đề-mô tả-hashtag, làm bản dọc TikTok/Reels/Shorts, hoặc đổi chế độ hiển thị bài đã đăng.
---

# film-publish — từ final.mp4 tới bài đăng, user luôn là người bấm nút

Hai MCP: **film-studio** soạn bộ đăng bài (offline, ffmpeg, miễn phí) · **publisher** điều khiển Chrome thật của user (profile riêng `scratch/omni/.browser-profile`, cookie đăng nhập sẵn) để upload + điền form, rồi **dừng trước nút Đăng/Lưu**.

## Luật cứng

- **Không bao giờ bấm Đăng/Lưu/Publish thay user** — publisher không có tool làm việc đó, đừng tự xoay (Playwright plugin, JS, phím Enter...).
- **Mặc định riêng tư**: YouTube/Shorts = Riêng tư, TikTok = Chỉ mình tôi. Lên **công khai chỉ khi user nói rõ cho ĐÚNG bài đó trong lượt này** — mỗi bài, mỗi lần hỏi lại; "ok đăng hết" của lần trước không tính. Reels trên Page luôn công khai khi bấm Đăng → nói rõ điều này trước khi user bấm.
- **Không nhận mật khẩu, mã 2FA, cookie** trong chat. Đăng nhập = `publisher_login` mở Chrome thường, user tự gõ.
- **Captcha / xác minh / "hoạt động bất thường"**: dừng, nói user tự xử lý trong cửa sổ Chrome. Không thử lại dồn dập, không né.
- Không dùng trình duyệt anti-detect, giả vân tay, proxy xoay vòng, nhiều tài khoản. Một tài khoản của user, một Chrome thật, đăng từng bài.
- `made_for_kids` (YouTube bắt buộc, liên quan luật COPPA) là **quyết định của user** — hỏi, không đoán, kể cả phim hoạt hình.

## Quy trình

| # | Việc | Tool | Cổng |
|---|---|---|---|
| 0 | Tập có `final.mp4` chưa, có phải nháp ảnh tĩnh không | film-studio `episode_get` | Nháp (`stills_used` khác rỗng) → khuyên chưa đăng |
| 1 | Soạn bộ đăng bài | film-studio `episode_publish_kit(platforms)` | Mặc định `youtube, shorts, tiktok, reels` |
| 2 | **Duyệt cùng user** | đọc `publish/<platform>.txt`, `publish.json` | Xem bảng dưới. Sửa → `episode_publish_kit(title=..., description_intro=..., hashtags=..., chapters=..., made_for_kids=...)` — được lưu, chạy lại không mất |
| 3 | Đăng nhập (lần đầu / hết hạn) | publisher `publisher_status` → `publisher_login(platforms)` | User đăng nhập xong phải **thoát hẳn** Chrome đó (Cmd+Q) |
| 4 | Điền sẵn từng nền tảng | publisher `publish_prepare(platform)` → `publish_job_status(wait_sec=50)` lặp, báo 1 dòng tiến độ mỗi lần | Một nền tảng một lần. Trình `filled` + `manual_steps` + screenshot |
| 5 | User tự hoàn tất | (user, trong Chrome) | Đọc lại `manual_steps` (vd. TikTok: chọn "Chỉ mình tôi", bật nhãn AI). User bấm Đăng/Lưu |
| 6 | Ghi nhận | publisher `publish_record(platform, url, visibility)` | Chỉ ghi điều user xác nhận. Link YouTube được chèn vào mô tả tập sau |
| 7 | Lên công khai (nếu muốn) | user tự đổi trong YouTube Studio / TikTok | Chỉ sau khi user đã xem bản riêng tư và **nói rõ** "công khai bài X". Xong → `publish_record(visibility="public")` |

## Duyệt bộ đăng bài — soi gì

- **Tiêu đề** ≤ 100 ký tự, ra được cái "móc" của tập chứ không chỉ "Tập N". Gợi 1–2 phương án hay hơn nếu tiêu đề mặc định nhạt.
- **Mô tả**: câu đầu là hook (hiện trên kết quả tìm kiếm). Không lộ kết/cliffhanger (kit đã không đưa `ending`/`cliffhanger` vào — đừng tự thêm).
- **Chapter**: mốc khớp nhịp truyện? Tên lấy từ `beats` — đặt lại cho hấp dẫn bằng `chapters=[{scene_id, title}]`. Cảnh báo "ƯỚC TÍNH" → `episode_assemble` lại trước.
- **Hashtag**: 3 cái đầu hiện trên tiêu đề YouTube — đưa cái quan trọng nhất lên đầu.
- **Bản dọc**: mở `vertical.mp4` / teaser cho user xem. Nhân vật bị nhỏ quá → `vertical_mode="crop"`. Teaser (Reels ≤ 90s, Shorts ≤ 3 phút) cắt ở ranh giới cảnh — kết có gợn không?
- **made_for_kids** và **altered_content** (YouTube "nội dung tổng hợp trông như thật": hoạt hình → Không) đã chốt chưa.

## Khi publish_prepare lỗi

| Hiện tượng | Làm |
|---|---|
| "Chưa đăng nhập" | `publisher_login(platforms=[...])` → user đăng nhập → thoát Chrome → chạy lại |
| "Profile đang mở trong cửa sổ đăng nhập" | Nhắc user Cmd+Q cửa sổ Chrome đăng nhập |
| Bước nằm trong `manual_steps` / lỗi selector | Giao diện nền tảng đổi. `publish_screenshot` → hướng dẫn user làm tay bước đó. Báo để sửa `sel` trong `scratch/omni/src/publisher/platforms.js` |
| Captcha / xác minh | Dừng. User tự làm trong Chrome rồi bảo bạn chạy tiếp |
| Upload quá lâu | `publish_job_status(wait_sec=50)` thêm; file lớn → tăng `PUBLISH_UPLOAD_TIMEOUT_MS` |

## Kết mỗi bước
Theo [pipeline.md](../film-story-craft/references/pipeline.md): tóm tắt → đề xuất bước kế → hỏi duyệt (AskUserQuestion: Làm tiếp / Sửa trước / Dừng) → đồng ý thì làm luôn. Xong 1 nền tảng → hỏi nền tảng kế. Xong cả tập → lưu `recap` (nếu chưa) và đề xuất **viết kịch bản tập tiếp theo**; tập cuối → tổng kết dự án.

## Anti-pattern
- ❌ Sửa code server/publisher (`scratch/omni/src/**`) khi đang đăng bài — selector hỏng thì hướng dẫn user làm tay và đề xuất việc sửa riêng ([pipeline.md](../film-story-craft/references/pipeline.md)).
- ❌ Bấm nút đăng hộ, hoặc chuyển công khai khi user chưa nói rõ cho bài đó.
- ❌ Đăng nhiều nền tảng/nhiều tập dồn một lượt không ai xem — từng bài, có screenshot.
- ❌ Đăng `final.mp4` nháp ảnh tĩnh.
- ❌ Tự chọn `made_for_kids`.
- ❌ Viết lại mô tả tay mỗi lần thay vì lưu chỉnh sửa vào `episode_publish_kit` (lần sau mất).
