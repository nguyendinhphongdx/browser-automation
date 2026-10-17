# Khóa liên tục hình ảnh

Đọc file này trước khi sinh storyboard hoặc video. Mục tiêu là một chuỗi cảnh liền mạch, không phải một tập hợp ảnh đẹp độc lập.

## Ba khóa bắt buộc

1. **Khóa dự án**: lấy nguyên văn `aspect_ratio` và `style` từ `project_get`. Generator ngoài MCP cũng phải dùng đúng hai giá trị này; không tự thêm phong cách như “3D”, “cinematic realism” nếu dự án không có.
2. **Khóa nhân vật/look**: mỗi nhân vật ở mỗi look có đúng một sheet đã duyệt. Giữ mặt, tuổi, màu da, tóc, tỷ lệ cơ thể, trang phục và phụ kiện. Sheet sai hoặc mâu thuẫn → sửa sheet trước, không vá từng cảnh.
3. **Khóa không gian**: dùng location sheet đã duyệt; giữ sơ đồ trái/phải, cửa, gương, ghế, nguồn sáng và thời điểm trong ngày trong cùng một nhịp.

## Continuity block

Chia tập thành các block 3–5 cảnh liên tiếp có cùng địa điểm, thời gian và hành động. Lập bảng trước khi sinh:

| Cảnh | Block | Ảnh neo | Trái/phải + hướng nhìn | Look/trang phục | Ánh sáng | Chỉ thay đổi |
|---|---|---|---|---|---|---|
| s01 | A | sheet + location | Hân giữa khung | `han` gốc | chiều ấm | lau má |
| s02 | A | **s01 đã duyệt** + sheets | Mây trái, Hân phải | giữ nguyên | chiều ấm | Mây bước vào |

- Cảnh đầu block = **anchor shot**, dùng character/look sheet + location sheet.
- Cảnh sau = dùng **ảnh cảnh ngay trước đã duyệt** làm reference chính, cộng sheet nhân vật/look và location khi cần.
- Không sinh song song các cảnh trong cùng block; cảnh sau phụ thuộc kết quả cảnh trước. Chỉ song song giữa các block độc lập.
- Match-cut hoặc before/after dùng lại cùng ảnh/bố cục khi có thể; không yêu cầu model tự tái tạo “giống hệt”.

Với workflow Codex ImageGen → `asset_import`: mỗi asset vẫn là một lần gọi riêng, nhưng `referenced_image_paths` phải chứa ảnh trước đã duyệt cho cảnh liền kề. Không dùng prompt chung có style khác dự án.

## Cổng duyệt storyboard

Duyệt theo block, rồi duyệt toàn tập. Một cảnh **không đạt** nếu có một trong các lỗi:

- mặt/tóc/tuổi/màu da/tỷ lệ nhân vật trôi;
- đổi look, trang phục hoặc phụ kiện không có nguyên nhân;
- location bị thiết kế lại, vật thể lớn đổi chỗ, ngày/đêm nhảy vô cớ;
- nhân vật đổi bên khung, hướng nhìn hoặc hướng di chuyển gây đứt trục 180°;
- aspect ratio hoặc style lệch project;
- hành động đầu cảnh sau không bắt được trạng thái cuối cảnh trước.

Không approve vì “ảnh riêng lẻ đẹp”. Nếu lỗi lặp ở nhiều cảnh, dừng và sửa anchor/sheet/chiến lược reference; không regenerate hàng loạt bằng cùng cách cũ.

## Video phải chạy hai pha

`prompt_preview` chỉ kiểm tra đầu vào, không chứng minh clip đầu ra đạt.

1. Sau khi storyboard đạt continuity, xin duyệt quota cho **pilot 3 clip**: một cận thoại, một cảnh hai người/hành động, một reveal hoặc cliffhanger.
2. Sinh pilot, ghép sample không nhạc, kiểm tra trực tiếp first/middle/last frame, identity, chuyển động, thoại/khẩu hình và cách nối với cảnh kề. Cho user xem.
3. Pilot đạt mới báo quota và xin duyệt sinh phần còn lại. User có thể chủ động bỏ qua pilot, nhưng agent không tự bỏ.
4. Sinh đủ clip xong phải ghép preview **không nhạc**. “31/31 succeeded” chỉ là trạng thái kỹ thuật, không phải duyệt chất lượng.
5. Audit preview theo từng cảnh: first/middle/last frame, nhân vật, look, location, chuyển động, thoại, phụ đề và điểm cắt. User duyệt preview thật rồi mới sinh nhạc/final.

Nếu preview lộ drift diện rộng, quay lại storyboard/anchor. Không dùng dissolve, nhạc hoặc lời dẫn để che lỗi continuity.
