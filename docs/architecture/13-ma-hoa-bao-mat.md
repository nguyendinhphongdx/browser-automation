# Mã hoá & bảo mật dữ liệu

[← Về mục lục](../README.md)

`main/services/encryption.ts` mã hoá mật khẩu proxy/email trước khi lưu vào SQLite — thuật toán AES-256-GCM, nằm gọn trong 1 file ~60 dòng.

## Khoá — sinh 1 lần, lưu ở file riêng

```ts
function loadOrCreateKey(): Buffer {
  const keyPath = path.join(app.getPath('userData'), 'encryption.key')
  if (fs.existsSync(keyPath)) {
    return Buffer.from(fs.readFileSync(keyPath, 'utf-8'), 'hex')
  }
  const key = crypto.randomBytes(32)
  fs.writeFileSync(keyPath, key.toString('hex'), { mode: 0o600 })
  return key
}
```

Lần đầu chạy app, sinh khoá 256-bit ngẫu nhiên, ghi ra file `encryption.key` cạnh database (`<userData>/encryption.key`), quyền `0o600` (chỉ chủ sở hữu file đọc/ghi được, trên hệ điều hành hỗ trợ POSIX permission). Các lần chạy sau đọc lại đúng khoá này — không derive từ password người dùng nhập (app không yêu cầu "master password" lúc mở app).

## Định dạng dữ liệu mã hoá

```
"iv:authTag:ciphertext"   (cả 3 phần encode hex, nối bằng dấu `:`)
```

Mỗi lần `encrypt()` sinh **IV ngẫu nhiên mới** (không tái dùng IV — tái dùng IV với cùng khoá trong AES-GCM làm lộ thông tin plaintext, 1 trong những lỗi mã hoá phổ biến nhất). `authTag` của GCM dùng để `decrypt()` phát hiện dữ liệu bị chỉnh sửa — sai `authTag` thì giải mã thất bại thay vì âm thầm trả về rác.

`decrypt()` bắt lỗi và trả nguyên văn chuỗi gốc nếu giải mã thất bại hoặc chuỗi không đúng định dạng 3 phần — xử lý trường hợp dữ liệu cũ từ **trước khi tính năng mã hoá được thêm vào** (migrate dần, không cần chạy script migrate 1 lần ép buộc).

## Giới hạn thực tế — model mối đe doạ

Cơ chế này chống được: ai đó lấy được **riêng file database** (ví dụ copy trộm 1 file `.db`) thì không đọc được mật khẩu plaintext ngay.

Không chống được: ai đó có quyền đọc **toàn bộ thư mục `userData`** (cả `.db` lẫn `encryption.key`) — trường hợp này khoá nằm ngay cạnh dữ liệu, giải mã được hết. Đây là đánh đổi có chủ đích của mọi app desktop không yêu cầu master password: bảo vệ khỏi rò rỉ **1 phần** dữ liệu (lộ file DB qua sync cloud nhầm, gửi nhầm file...), không bảo vệ khỏi kẻ tấn công đã chiếm được toàn quyền trên máy đang chạy app.

## Webhook — xác thực khác với mã hoá

Xác thực webhook nội bộ (so khớp `webhookSecret` — [09-scheduler-webhook.md](09-scheduler-webhook.md)) và Stripe webhook (xác minh chữ ký HMAC — [08-server.md](08-server.md#thanh-toán--stripe-webhook)) không dùng `encryption.ts` — đây là 2 bài toán khác nhau (toàn vẹn + xác thực nguồn gốc của 1 request, không phải mã hoá dữ liệu lưu trữ).
