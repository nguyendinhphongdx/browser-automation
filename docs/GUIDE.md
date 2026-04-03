# Hướng dẫn sử dụng BrowserAuto

## Mục lục

1. [Cài đặt](#1-cài-đặt)
2. [Quản lý Profile](#2-quản-lý-profile)
3. [Quản lý tài nguyên](#3-quản-lý-tài-nguyên)
4. [Automation Builder](#4-automation-builder)
5. [Ghi lại thao tác (Record Mode)](#5-ghi-lại-thao-tác)
6. [Marketplace](#6-marketplace)
7. [Kết nối Server](#7-kết-nối-server)
8. [Cài đặt ứng dụng](#8-cài-đặt-ứng-dụng)
9. [Phím tắt](#9-phím-tắt)

---

## 1. Cài đặt

### Yêu cầu hệ thống
- Windows 10+, macOS 10.15+, hoặc Ubuntu 20.04+
- RAM tối thiểu 4GB (khuyến nghị 8GB)
- Ít nhất 1 trình duyệt đã cài (Chrome, Brave, Edge, Firefox...)

### Cài đặt
1. Tải file cài đặt từ trang tải về
2. Chạy file cài đặt và làm theo hướng dẫn
3. Mở ứng dụng BrowserAuto
4. Hoàn thành hướng dẫn chào mừng (5 bước)

---

## 2. Quản lý Profile

### Tạo profile mới
1. Nhấn nút **"Tạo Profile"** ở góc trên phải
2. Nhập tên profile
3. Chọn loại trình duyệt (Chrome, Brave, Edge, Firefox, Opera, Vivaldi, Chromium)
   - Trình duyệt đã cài sẽ hiện nhãn "Đã cài"
   - Chọn "Tuỳ chỉnh" để dùng trình duyệt khác
4. Chọn màu sắc để phân biệt
5. Thêm tags (VD: `facebook, ads, account1`)
6. Nhấn **"Tạo Profile"**

Fingerprint sẽ được tạo tự động cho mỗi profile, bao gồm:
- User-Agent phù hợp với loại trình duyệt
- Screen resolution, timezone, language ngẫu nhiên
- Canvas, WebGL, AudioContext fingerprint riêng biệt
- WebRTC protection

### Khởi chạy browser
- Nhấn nút **Play** (▶) bên cạnh profile để mở trình duyệt
- Mỗi profile chạy với fingerprint riêng biệt
- Có thể chạy nhiều profile đồng thời

### Chỉnh sửa / Nhân đôi / Xoá
- **Edit** (✏️): Sửa tên, trình duyệt, tags, ghi chú
- **Copy** (📋): Nhân đôi profile với fingerprint mới
- **Delete** (🗑️): Xoá profile (cần xác nhận)

### Chế độ xem
- **Bảng** (Table): Xem dạng danh sách, hiện đầy đủ thông tin
- **Lưới** (Grid): Xem dạng card, gọn hơn

---

## 3. Quản lý tài nguyên

### Proxy
- Vào **Tài nguyên → Proxy**
- Hỗ trợ: HTTP, HTTPS, SOCKS4, SOCKS5
- Import từ file TXT (1 proxy/dòng, format: `host:port:user:pass`)
- Kiểm tra proxy sống/chết, đo tốc độ
- Gán proxy cho từng profile

### Email / Account
- Vào **Tài nguyên → Email**
- Import từ file CSV
- Trạng thái: Hoạt động, Bị khoá, Cần xác minh
- Nhóm theo provider: Gmail, Outlook, Yahoo

### Cookie
- Vào **Tài nguyên → Cookie**
- Import/Export cookie dạng JSON
- Gán cookie cho profile cụ thể

---

## 4. Automation Builder

### Chế độ kéo thả (Visual)
1. Vào **Automation → Tạo Workflow → Kéo thả**
2. Kéo node từ bảng bên trái vào canvas
3. Nối các node bằng cách kéo từ đầu ra → đầu vào
4. Cấu hình từng node ở panel bên phải
5. Nhấn **Save** (Ctrl+S) để lưu

**Các loại node:**
- **Trình duyệt**: Mở trang, Điều hướng, Làm mới
- **Tương tác**: Click, Nhập text, Cuộn, Hover, Chọn dropdown
- **Dữ liệu**: Lấy text, Lấy thuộc tính, Chụp màn hình
- **Luồng**: If/Else, Vòng lặp, Chờ, Delay
- **Tích hợp**: HTTP Request, Webhook

### Chế độ viết code (Code)
1. Vào **Automation → Tạo Workflow → Viết code**
2. Viết TypeScript/JavaScript trong Monaco Editor
3. Sử dụng API có sẵn (auto-complete)

### Chạy workflow
1. Chọn profile từ dropdown
2. Nhấn nút **Play** (▶) hoặc Ctrl+Shift+R
3. Xem log real-time ở panel dưới

---

## 5. Ghi lại thao tác

1. Mở browser cho một profile (nhấn Play ở trang Profiles)
2. Vào **Automation**
3. Ở panel **"Ghi lại thao tác"** bên trái dưới:
   - Chọn profile đang mở browser
   - Nhấn **"Bắt đầu ghi"**
4. Thao tác trên browser (click, nhập text, điều hướng...)
5. Các thao tác sẽ hiện real-time trong panel
6. Nhấn **"Dừng ghi"** khi xong
7. Nhấn **"Lưu workflow"** để chuyển thành visual workflow

---

## 6. Marketplace

### Xem workflow có sẵn
- Vào **Marketplace**
- Tìm kiếm theo tên hoặc mô tả
- Lọc theo loại: Tất cả, Visual, Code

### Import / Export
- **Import**: Nhấn "Import Workflow" → chọn file JSON
- **Export**: Nhấn "Xuất file" trên card workflow

### Marketplace online (sắp ra mắt)
- Upload workflow lên cộng đồng
- Đánh giá và nhận xét
- Mua bán với chia doanh thu 70/30

---

## 7. Kết nối Server

1. Vào **Đăng nhập / Đăng ký** (sidebar dưới cùng)
2. Nhập Server URL (mặc định `http://localhost:3000`)
3. Nhấn **Test** để kiểm tra kết nối
4. Đăng nhập hoặc đăng ký tài khoản
5. Sau khi đăng nhập:
   - Nhấn **Sync** để đồng bộ profiles lên server
   - Dữ liệu được backup trên cloud

---

## 8. Cài đặt ứng dụng

Vào **Cài đặt** (Ctrl+,):

- **Giao diện**: Sáng / Tối / Theo hệ thống
- **Ngôn ngữ**: Tiếng Việt / English
- **Dữ liệu**: Mã hoá AES-256-GCM cho proxy và email passwords
- **Thông tin**: Phiên bản app, framework, database

---

## 9. Phím tắt

| Phím tắt | Chức năng |
|----------|-----------|
| `Ctrl+N` | Tạo profile mới |
| `Ctrl+S` | Lưu workflow |
| `Ctrl+Shift+R` | Chạy workflow |
| `Ctrl+F` | Tìm kiếm |
| `Ctrl+,` | Mở cài đặt |
| `Ctrl+1` | Chuyển sang Profiles |
| `Ctrl+2` | Chuyển sang Automation |
| `Ctrl+3` | Chuyển sang Tài nguyên |
| `Ctrl+4` | Chuyển sang Marketplace |
| `Ctrl+5` | Chuyển sang Cài đặt |
| `Delete` | Xoá node đã chọn |
