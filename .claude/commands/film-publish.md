---
description: Đăng 1 tập lên YouTube / Shorts / TikTok / Reels — soạn bộ đăng bài, duyệt, điền sẵn trong Chrome của tôi, tôi tự bấm Đăng
argument-hint: <project_id> <episode_id> [nền tảng, vd "youtube tiktok"]
---

Tham số: $ARGUMENTS

Dùng skill `film-publish`. Bắt đầu bằng `episode_get` rồi `episode_publish_kit` (nền tảng tôi nêu, mặc định youtube, shorts, tiktok, reels).
Trình cho tôi duyệt: tiêu đề, mô tả, chapter, hashtag, bản dọc; hỏi tôi `made_for_kids` nếu chưa chốt.
Chỉ khi tôi duyệt xong mới `publish_prepare` từng nền tảng một — để ở chế độ riêng tư, dừng trước nút Đăng, gửi screenshot + việc tôi cần tự làm.
**Không bao giờ bấm Đăng hộ tôi, và không chuyển công khai trừ khi tôi nói rõ cho đúng bài đó.** Tôi bấm xong thì `publish_record`, rồi hỏi duyệt nền tảng kế; xong cả tập → đề xuất viết kịch bản tập tiếp theo (luật "kết mỗi bước" ở `.claude/skills/film-story-craft/references/pipeline.md`).
