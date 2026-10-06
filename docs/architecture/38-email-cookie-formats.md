# Định dạng import Email/Cookie

[← Về mục lục](../README.md)

## Email — CSV, tự dò có header hay không

```ts
const firstLine = lines[0].toLowerCase()
const startIdx = (firstLine.includes('email') || firstLine.includes('mail')) ? 1 : 0
```

Dòng đầu chứa chữ "email"/"mail" (không phân biệt hoa thường) thì coi là header và bỏ qua — không cần người dùng tự xoá dòng tiêu đề trước khi import, nhưng cũng nghĩa là **1 địa chỉ email thật ở dòng đầu** (vô tình chứa chữ "mail" dù đó là email thật, ví dụ `mail@company.com`) sẽ bị **bỏ sót nhầm thành header**. Thứ tự cột cố định: `email,password,recoveryEmail,phone,notes` — sai thứ tự cột là dữ liệu bị gán nhầm field, không có cách khai báo "cột nào ứng với field nào" như nhiều tool import CSV khác.

```ts
const parts = lines[i].split(',').map(p => p.trim())
```

`split(',')` thuần — **không xử lý giá trị chứa dấu phẩy trong ngoặc kép** (chuẩn CSV thật cho phép `"Nguyễn, Văn A"` là 1 field). Ghi chú (`notes`) chứa dấu phẩy sẽ bị cắt thành nhiều field sai vị trí. Đủ dùng cho dữ liệu đơn giản (email/password/phone hiếm khi chứa dấu phẩy), nhưng field `notes` nên tránh dùng dấu phẩy khi import hàng loạt.

## Cookie — JSON, validate bằng thử `JSON.parse`, không validate schema

```ts
try {
  JSON.parse(input.cookies)
} catch {
  throw new Error('Invalid cookie JSON format')
}
```

Chỉ đảm bảo chuỗi là JSON hợp lệ — **không kiểm tra cấu trúc bên trong** có đúng dạng mảng cookie Playwright mong đợi không (`[{ name, value, domain, path, expires, ... }]`). Import 1 JSON hợp lệ nhưng sai cấu trúc (ví dụ `{"a":1}` thay vì mảng) vẫn lưu thành công vào DB.

**Quan trọng hơn cả validate:** xác minh bằng grep `addCookies` trên toàn repo chỉ ra **đúng 1 nơi gọi** — bên trong node `set-cookie` ([05-workflow-engine.md](05-workflow-engine.md)), và node đó đọc `name`/`value`/`domain` từ **config riêng của chính node đó**, không đọc từ bảng `cookies` (`CookieEntry`) ở Resources. Nói cách khác: cookie import/lưu ở trang Tài nguyên → Cookie hiện **không có đường nào nạp vào browser thật** — đây thuần tuý là kho lưu trữ, muốn áp dụng cookie cho 1 lần chạy workflow phải tự gõ tay giá trị vào node `set-cookie` trên canvas, không gọi lại được cookie đã lưu sẵn.
