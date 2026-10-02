# Phiên bản workflow

[← Về mục lục](../README.md)

Mỗi lần bấm **Save** (`Ctrl+S`) trên 1 workflow, app lưu lại **toàn bộ snapshot** (nodes, edges, code) tại thời điểm đó thành 1 phiên bản mới — không ghi đè lên phiên bản trước.

## Xem lịch sử phiên bản

Mở panel **Lịch sử phiên bản** trên workflow đang chỉnh sửa — danh sách hiện theo thứ tự thời gian, số thứ tự phiên bản tăng dần, kèm thời điểm lưu.

## Gắn nhãn

Đặt tên gợi nhớ cho 1 phiên bản quan trọng (ví dụ "bản chạy ổn trước khi sửa lớn") thay vì chỉ nhớ theo số thứ tự — giúp tìm lại nhanh hơn khi danh sách dài.

## Rollback

Chọn 1 phiên bản cũ → **Khôi phục (Rollback)** — canvas hiện tại được thay bằng đúng nodes/edges/code của phiên bản đó. Bản hiện tại (trước khi rollback) **không bị mất** — rollback cũng tạo thêm 1 phiên bản mới ghi lại trạng thái vừa khôi phục, nên luôn có thể quay lại được.

## Khi nào nên dùng

- Trước khi để [AI Agent](06-ai-agent.md) sửa lớn 1 workflow đang chạy ổn — gắn nhãn bản hiện tại trước, để có điểm quay lại chắc chắn nếu kết quả AI đề xuất không như ý
- Sau khi debug ra 1 workflow hay lỗi — rollback về bản trước đó thay vì sửa tay lại từ đầu

Tiếp theo: [Khắc phục sự cố →](15-khac-phuc-su-co.md)
