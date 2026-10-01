# Cài đặt ứng dụng

[← Về mục lục](../README.md)

Vào **Cài đặt** (`Ctrl+,`):

- **Giao diện**: Sáng / Tối / Theo hệ thống
- **Ngôn ngữ**: Tiếng Việt / English
- **AI Provider**: Chọn nhà cung cấp (Anthropic, OpenAI, Google, Groq, Ollama, hoặc API tương thích OpenAI khác) + API key — bắt buộc để dùng [AI Agent](06-ai-agent.md)
- **Dữ liệu**: Mật khẩu proxy và email được mã hoá AES-256-GCM trước khi lưu vào database local
- **Thông tin**: Phiên bản app, framework, đường dẫn database local

## Mã hoá dữ liệu nhạy cảm

Mật khẩu (proxy, email) không bao giờ lưu dạng plaintext trong database — toàn bộ được mã hoá AES-256-GCM với khoá sinh riêng cho mỗi máy. Dữ liệu này không đồng bộ lên server dạng rõ ràng khi bạn bật Cloud Sync.

Tiếp theo: [Phím tắt →](10-phim-tat.md)
