# Quản lý Profile

[← Về mục lục](../README.md)

Mỗi **profile** là một "danh tính trình duyệt" độc lập: fingerprint riêng, dữ liệu (cookie, localStorage, cache) riêng, có thể gán proxy riêng.

## Tạo profile mới

1. Nhấn nút **"Tạo Profile"** ở góc trên phải
2. Nhập tên profile
3. Chọn loại trình duyệt (Chrome, Brave, Edge, Firefox, Opera, Vivaldi, Chromium)
   - Trình duyệt đã cài sẽ hiện nhãn "Đã cài"
   - Chọn "Tuỳ chỉnh" để trỏ tới file thực thi trình duyệt khác
4. Chọn màu sắc để phân biệt trên giao diện
5. Thêm tags (VD: `facebook, ads, account1`) và folder để nhóm
6. Nhấn **"Tạo Profile"**

Fingerprint được tạo **tự động và ngẫu nhiên** cho mỗi profile, gồm:
- User-Agent phù hợp với loại trình duyệt đã chọn
- Screen resolution, timezone, locale/language
- Nhiễu (noise) riêng cho Canvas, WebGL, AudioContext fingerprint
- Tuỳ chọn bật/tắt WebRTC

> Chi tiết kỹ thuật về cách fingerprint được sinh và inject vào trang: [architecture/07-fingerprint.md](../architecture/07-fingerprint.md).

## Khởi chạy browser

- Nhấn nút **Play** (▶) bên cạnh profile để mở trình duyệt thật (Playwright điều khiển, không phải headless)
- Mỗi profile chạy với fingerprint + thư mục dữ liệu riêng biệt — cookie/login của profile này không lẫn sang profile khác
- Có thể chạy nhiều profile cùng lúc, mỗi profile là 1 process trình duyệt riêng

## Chỉnh sửa / Nhân đôi / Xoá

- **Edit** (✏️): Sửa tên, trình duyệt, tags, folder, ghi chú, proxy gán
- **Copy** (📋): Nhân đôi profile — tên mới, **fingerprint mới** (không copy fingerprint cũ)
- **Delete** (🗑️): Xoá profile (cần xác nhận). Profile mặc định `Default Browser` không thể xoá.

## Chế độ xem

- **Bảng** (Table): danh sách đầy đủ cột thông tin
- **Lưới** (Grid): dạng card, gọn, phù hợp khi có nhiều profile

Tiếp theo: [Quản lý tài nguyên →](03-quan-ly-tai-nguyen.md)
