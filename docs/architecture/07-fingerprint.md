# Fingerprint

[← Về mục lục](../README.md)

Mỗi profile giả lập 1 "máy" khác nhau trước các kỹ thuật phát hiện automation/fingerprinting của website, bằng 2 bước tách biệt: **sinh** fingerprint (lúc tạo profile) và **inject** fingerprint (lúc mở trình duyệt).

## Luồng thực tế đang chạy

```
Tạo profile (profile-service.ts)
  → generateFingerprint() ở main/browser/fingerprint.ts
    → random User-Agent theo browser_type, screen resolution, timezone,
      locale, hardwareConcurrency, deviceMemory, noise cho canvas/webgl...
  → lưu nguyên khối JSON vào cột profiles.fingerprint

Mở browser (browser/launcher.ts)
  → đọc profile.fingerprint từ DB
  → buildFingerprintArgs(fp) → cờ khởi động Chromium (--disable-blink-features=AutomationControlled...)
  → buildFingerprintScript(fp) → đoạn JS override navigator/screen/canvas/webgl/audio
  → context.addInitScript(script) — chạy script này TRƯỚC mọi script của trang,
    trên MỌI page mới mở trong context (kể cả tab mới do trang tự mở)
```

## Những gì bị override

| Nhóm | Field |
|---|---|
| `navigator` | `hardwareConcurrency`, `deviceMemory`, `platform`, `language`, `languages`, `doNotTrack`, `webdriver` (ẩn hẳn, trả `undefined`) |
| `screen` | `width`, `height`, `colorDepth` |
| Canvas | Thêm nhiễu ngẫu nhiên nhỏ vào `getImageData()` trước khi `toDataURL()` — 2 lần chụp canvas cho ra hash khác nhau dù cùng nội dung vẽ |
| WebGL | `getParameter()` trả vendor/renderer giả cho `UNMASKED_VENDOR`/`UNMASKED_RENDERER` |
| AudioContext | Can thiệp `createOscillator()` (giảm nhẹ hiệu quả audio fingerprinting) |
| Dấu vết automation | Xoá các biến `cdc_...` mà ChromeDriver/Selenium thường để lại trên `window` |

## ⚠ `packages/fingerprint` hiện không được dùng

Repo có sẵn 1 package riêng `packages/fingerprint` (`generateFingerprint`, `buildFingerprintScript`, `buildFingerprintArgs`) — về mặt thiết kế, đây rõ ràng là nơi *nên* chứa logic này để desktop và server cùng dùng chung (README cũng giới thiệu package này). Nhưng tra thực tế: **không có file nào trong `apps/desktop` hay `apps/server` import `@browser-automation/fingerprint`.**

Thay vào đó, `main/browser/fingerprint.ts` (sinh fingerprint) và `main/browser/launcher.ts` (build script inject) mỗi file tự định nghĩa lại logic gần như y hệt, độc lập với package. Đây là trùng lặp code còn sót lại — nếu sửa 1 tham số fingerprint, cần nhớ sửa ở `main/browser/fingerprint.ts` + `launcher.ts`, **không phải** ở `packages/fingerprint`. Hợp nhất lại về 1 nguồn (dùng package thật) là việc dọn dẹp đáng làm nhưng chưa nằm trong phạm vi tài liệu này.

## Giới hạn

Đây là fingerprint spoofing ở tầng JS injection — không chống được mọi kỹ thuật phát hiện (ví dụ TLS fingerprinting ở tầng network nằm ngoài khả năng can thiệp của `addInitScript`). Hiệu quả tốt nhất khi kết hợp với proxy riêng cho mỗi profile.
