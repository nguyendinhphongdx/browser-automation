# An toàn của chế độ Code

[← Về mục lục](../README.md)

Nối tiếp [architecture/32](../architecture/32-code-mode-execution.md) — ghi rõ ranh giới trách nhiệm để tránh tranh luận lặp lại mỗi khi có người review thấy `new Function()` chạy Playwright thật và nghi ngờ đây là lỗ hổng.

## Mô hình tin cậy: người viết code = người chạy code

Workflow `mode: 'code'` chỉ chạy trên **máy của chính người đã viết nó** (workflow lưu local, hoặc tải về từ Marketplace do chính người dùng chủ động chọn import) — không có kịch bản nào 1 người dùng A viết code rồi code đó tự động chạy trên máy người dùng B mà B không biết. Khác hẳn mô hình của AI Agent's `run_js`, nơi code **do AI sinh ra** thay mặt người dùng — lý do duy nhất `run_js` cần cổng duyệt là người dùng chưa đọc/hiểu code đó trước khi nó chạy.

## Vì vậy: không cần thêm approval gate cho chế độ Code

Thêm 1 hộp thoại "Xác nhận chạy code" trước mỗi lần Run ở chế độ Code **không tăng thêm an toàn thật** — người dùng đã tự viết/tự chọn import workflow đó, hộp thoại chỉ là 1 cú click thêm vô nghĩa (click-through fatigue), không ngăn được kịch bản nào họ không hiểu.

## Rủi ro thật sự đáng quan tâm: Workflow trả phí/miễn phí tải từ Marketplace của người lạ

Đây là nơi mô hình tin cậy "người viết = người chạy" **không còn đúng** — workflow `mode: 'code'` tải về từ Marketplace chứa code do **người khác** viết, và Run ngay sau khi import thì hoàn toàn tương đương chạy code lạ không rõ nguồn gốc với toàn quyền Playwright. Hiện tại marketplace chưa có cơ chế review code tự động hay cảnh báo riêng cho workflow `mode: 'code'` so với `mode: 'visual'` — đáng cân nhắc thêm (ví dụ: luôn hiện nội dung code để người dùng tự đọc trước khi Run lần đầu, đặc biệt với workflow import từ nguồn ngoài) khi tính năng thanh toán/tải marketplace được hoàn thiện thật ([09-wiring-up-stripe.md](09-wiring-up-stripe.md)).
