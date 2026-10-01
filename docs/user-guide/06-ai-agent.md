# AI Agent

[← Về mục lục](../README.md)

AI Agent là trợ lý xây workflow cùng bạn — khác với chatbot hỏi-đáp đơn thuần, nó **thấy được** trạng thái trình duyệt thật, **đọc được** log lần chạy trước, và **tự đề xuất** sửa workflow đã được kiểm tra hợp lệ trước khi áp dụng.

## Mở AI Agent

1. Vào **Automation**, chọn 1 profile ở dropdown trên cùng (bắt buộc)
2. Nhấn nút hình tia sáng (✦) ở góc phải canvas để mở panel AI Agent

Nếu chưa chọn profile, nút này bị mờ đi — chọn profile trước rồi mở lại.

## Khung xem trực tiếp (Live Preview)

Ngay khi mở panel, 1 khung hình ở trên cùng hiển thị **y hệt những gì trình duyệt thật đang hiển thị**, cập nhật liên tục (có nhãn "Live"). Nếu chưa có trình duyệt nào đang chạy cho profile đó, app tự mở 1 trình duyệt mới — bạn không cần tự bấm Play trước.

Khung này giúp bạn theo dõi AI đang thao tác đúng trang/đúng ý hay không, mà không cần tự chụp màn hình hỏi lại.

## AI có thể làm gì

- Đọc nội dung/HTML, lấy URL trang hiện tại
- Chụp màn hình để "nhìn" giao diện khi cần
- Chạy đoạn JavaScript để kiểm tra 1 phần tử/điều kiện cụ thể trên trang
- Đọc trạng thái workflow hiện tại trên canvas
- Đọc log của lần chạy workflow gần nhất (hữu ích khi hỏi "sao lần trước chạy lỗi")
- Đề xuất thêm/sửa node, hoặc thay thế toàn bộ workflow

## Khi nào cần bạn duyệt (Approval)

Hai loại hành động **luôn dừng lại chờ bạn bấm Duyệt/Từ chối** trước khi thực hiện, vì có thể ảnh hưởng dữ liệu:

- **Chạy JavaScript tuỳ ý** trên trang thật
- **Xoá node / thay thế toàn bộ workflow**

Các hành động còn lại (đọc trang, đề xuất thêm node mới) không cần duyệt vì không phá huỷ gì.

## Ví dụ câu hỏi

- "Trang này đang hiển thị gì, có nút đăng nhập không?"
- "Chụp màn hình trang hiện tại cho tôi xem"
- "Kiểm tra xem phần tử `.login-button` có tồn tại không"
- "Sao lần chạy workflow trước bị lỗi?"
- "Tạo giúp tôi workflow mở trang Google rồi tìm kiếm 'browser automation'"

## Giới hạn hiện tại

- AI chỉnh **workflow định nghĩa** (các node trên canvas), không tự thao tác trực tiếp trên trình duyệt thật thay bạn — sau khi AI sửa xong, bạn vẫn cần bấm **Chạy (Run)** để workflow thực sự chạy
- Cần cấu hình AI Provider (API key) ở [Cài đặt ứng dụng](09-cai-dat-ung-dung.md) trước khi dùng được

Tiếp theo: [Marketplace →](07-marketplace.md)
