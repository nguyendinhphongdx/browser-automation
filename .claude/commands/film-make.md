---
description: Sản xuất 1 tập từ kịch bản tới final.mp4 (character sheet → thoại → storyboard → duyệt → nháp → video → nhạc → ghép) với cổng xác nhận chi phí
argument-hint: <project_id> <episode_id> [bước, vd "storyboard" | "video" | "assemble"]
---

Tham số: $ARGUMENTS

Dùng skill `film-production`. Bắt đầu bằng `episode_get` + `usage_report` để biết tập đang ở đâu, rồi đi tiếp từ bước còn thiếu (hoặc đúng bước tôi nêu).
Luôn dừng hỏi tôi trước: lần đầu sinh character sheet, sinh storyboard, và **sinh video** (nêu số clip, tổng giây, quota đã dùng).
Storyboard phải theo continuity block: khóa style/aspect/character/location, sinh tuần tự trong block bằng ảnh trước đã duyệt làm reference, rồi duyệt toàn tập. Video phải chạy pilot 3 cảnh và cho tôi xem sample trước khi xin phép sinh phần còn lại. Sinh đủ clip phải ghép preview không nhạc và audit nội dung; `31/31 succeeded` không có nghĩa là đạt.
Xong mỗi đợt sinh: báo kết quả, lỗi, và `usage_report` tóm tắt, rồi theo luật "kết mỗi bước" ở `.claude/skills/film-story-craft/references/pipeline.md`: đề xuất bước kế + chi phí, hỏi tôi duyệt, đồng ý thì chạy luôn. Ghép xong → đề xuất đăng bài (`film-publish`).
