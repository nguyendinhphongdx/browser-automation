# Backup

[← Về mục lục](../README.md)

`main/services/backup-service.ts` xử lý 2 việc khác nhau dùng chung tên "backup": **export/import ra file zip local** (không cần server) và **upload/download lên cloud storage qua server** (cần đăng nhập).

## Export/Import local — không phụ thuộc server

```ts
exportProfile(profileId)      // zip thư mục dữ liệu profile (archiver) → cho người dùng chọn nơi lưu
exportAllProfiles()           // zip toàn bộ profiles/ cùng lúc
importProfile(zipPath?, opts?) // giải nén (adm-zip) → tạo lại profile trong DB
```

Zip chứa cả thư mục dữ liệu trình duyệt thật (`getProfileDataDir(profileId)` — cookie, cache, localStorage đã lưu khi dùng profile đó) chứ không chỉ metadata trong SQLite — khôi phục lại là có ngay session đăng nhập cũ, không phải đăng nhập lại từ đầu.

`importProfile` nhận `opts.preserveId` — mặc định **tạo id mới** khi import (tránh đụng id với profile đang có), chỉ giữ nguyên id cũ khi caller chủ động yêu cầu (dùng khi restore từ cloud backup, cần khớp lại đúng `profileId` đã lưu trên server).

Lúc giải nén, mỗi đường dẫn file trong zip được resolve rồi kiểm tra còn nằm trong đúng thư mục đích không trước khi ghi (`targetPath.startsWith(resolvedDataDir)`) — chặn **Zip Slip**: 1 file backup bị chỉnh sửa ác ý có thể chứa entry tên dạng `../../../../etc/cron.d/x` để ghi đè file ngoài ý muốn khi giải nén nếu không kiểm tra.

## Upload/Download cloud — qua server, có auto-refresh token

```ts
async function authedFetch(input: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init)
  if (res.status === 401) {
    const refreshed = await refreshToken()
    if (refreshed) {
      // retry đúng 1 lần với token mới
    }
  }
  return res
}
```

Pattern **retry-once-on-401**: token JWT hết hạn giữa chừng phiên làm việc là bình thường (không phải lỗi), nên thử refresh và gọi lại đúng 1 lần thay vì bắt người dùng đăng nhập lại ngay khi token vừa hết hạn. Không retry vòng lặp vô hạn nếu refresh cũng thất bại — tránh loop treo khi token thực sự không còn hợp lệ (ví dụ bị thu hồi).

`uploadProfile()` gửi zip lên server, server lưu vào storage (`s3`/`gcs` theo cấu hình, xem `ProfileBackup.provider` trong [08-server.md](08-server.md#database--prisma--postgresql)) kèm checksum SHA-256 để sau này verify toàn vẹn khi `downloadBackup()` tải về.

`getBackupStatus()` — gọi để hiện ở UI trạng thái đồng bộ của từng profile (đã backup lần nào, lần gần nhất khi nào) mà không cần tự tính toán ở renderer.
