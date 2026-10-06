# Import/Export dữ liệu

[← Về mục lục](../README.md)

Mỗi loại dữ liệu nằm ở trang riêng với nút import/export riêng — trang này gom lại 1 chỗ cho dễ tra, tránh phải nhớ mỗi loại nằm ở đâu.

| Dữ liệu | Export | Import | Định dạng |
|---|---|---|---|
| Profile (1 cái) | Nút "Xuất file" trên card profile | Nút "Nhập file" ở Profiles | `.zip` (kèm cả cookie/cache/localStorage thật) |
| Toàn bộ profile | "Xuất tất cả" ở Profiles | — | `.zip` |
| Proxy | — | Dán danh sách hoặc chọn file `.txt` (`host:port:user:pass`, 1 dòng/proxy) | `.txt` |
| Email | — | Chọn file `.csv` | `.csv` |
| Cookie | Nút "Xuất" trên từng cookie | Nút "Nhập" | `.json` |
| Workflow | Nút "Xuất file" trên card workflow | "Import Workflow" ở Marketplace | `.json` |
| Backup lên cloud | Nút "Sync"/"Upload" (cần đăng nhập) | Nút "Download" theo backup đã lưu | — (lưu trên server, không tải file) |

## Khác biệt quan trọng: export **local** vs. backup **cloud**

- **Export local** (zip/json) — bạn tự giữ file, tự gửi/chuyển cho người khác hoặc máy khác, không cần đăng nhập server
- **Backup cloud** (upload/download) — cần đăng nhập, file nằm trên storage của server, không tự cầm file — xem [08-ket-noi-server.md](08-ket-noi-server.md)

## Lưu ý khi import profile

File export profile chứa **toàn bộ dữ liệu phiên đăng nhập thật** (cookie, localStorage của lần dùng gần nhất) — coi file này nhạy cảm như chính tài khoản đang đăng nhập trong đó, không chia sẻ công khai.

Tiếp theo: [Tính năng Campaign nâng cao →](18-campaign-nang-cao.md)
