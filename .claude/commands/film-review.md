---
description: Nhờ script-doctor chấm bible hoặc kịch bản 1 tập, rồi đề xuất (và nếu tôi đồng ý thì áp) bản sửa
argument-hint: <project_id> [episode_id]
---

Tham số: $ARGUMENTS

1. Gọi subagent `script-doctor` với project_id (và episode_id nếu có — không có thì chấm bible series). Thiếu project_id → `project_list` và hỏi tôi.
2. Trình kết quả gọn: điểm, bảng trục, danh sách sửa.
3. Hỏi tôi áp mục nào (mặc định: mọi CRITICAL + MAJOR). Áp bằng `scene_update` / `episode_script_save` / `series_bible_save` / `characters_save` theo skill `film-scene-writing` hoặc `film-story-craft`.
4. Áp xong, chạy lại `script-doctor` 1 lần và báo điểm trước → sau. Nhắc nếu sửa làm mất asset đã sinh (ảnh/video cảnh bị đổi).
5. Theo luật "kết mỗi bước" ở `.claude/skills/film-story-craft/references/pipeline.md`: đề xuất bước kế (chấm bible → viết kịch bản tập 1; chấm tập → sản xuất tập đó), hỏi tôi duyệt, đồng ý thì làm luôn.
