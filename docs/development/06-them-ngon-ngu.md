# Thêm ngôn ngữ

[← Về mục lục](../README.md)

Hiện chỉ có `vi`/`en` ([19-routing-theme-i18n.md](../architecture/19-routing-theme-i18n.md)). Thêm 1 ngôn ngữ mới:

1. Mở `renderer/lib/i18n.ts`, thêm union type: `export type Locale = 'vi' | 'en' | '<ma-ngon-ngu-moi>'`
2. Thêm 1 object key-value mới vào `translations`, copy toàn bộ key từ `vi` hoặc `en` rồi dịch — **copy nguyên set key**, không bỏ sót, vì 1 key thiếu sẽ hiện literal key string (`profiles.title`) thay vì text thật nếu code gọi `t('profiles.title')` mà locale đang chọn không có key đó
3. Thêm lựa chọn ngôn ngữ mới vào dropdown ở trang Cài đặt
4. Build thử, bật ngôn ngữ mới, đi qua từng trang kiểm tra không còn chỗ nào hiện raw key

## Không có công cụ tự phát hiện key thiếu

Vì tự viết bảng tra cứu phẳng (không dùng thư viện i18n đầy đủ), không có lệnh kiểu `i18n-check` tự báo ngôn ngữ nào thiếu key nào so với ngôn ngữ gốc — tự rà bằng mắt hoặc viết 1 script so sánh `Object.keys()` giữa 2 locale nếu bộ key lớn dần theo thời gian.
