---
description: Viết (hoặc viết lại) kịch bản chi tiết + phân cảnh cho 1 tập, giữ liên tục với các tập trước
argument-hint: <project_id> [episode_id] [ghi chú, vd "thêm cảnh hài ở giữa"]
---

Tham số: $ARGUMENTS

Dùng skill `film-scene-writing`.
- Thiếu project_id → `project_list`, dự án mới nhất là mặc định, xác nhận với tôi.
- Thiếu episode_id → chọn tập sớm nhất chưa có kịch bản (theo `story_context`); tất cả đã có → đề xuất tập tiếp theo nối mạch.
- Phần còn lại của tham số là ghi chú/yêu cầu sửa của tôi — ưu tiên nó.

Kết thúc ở bước báo cáo (beat sheet, số cảnh, độ dài, điểm script-doctor). Không sinh storyboard/video.
