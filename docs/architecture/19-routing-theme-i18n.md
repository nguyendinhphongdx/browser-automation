# Routing, theme, i18n

[← Về mục lục](../README.md)

## Routing — `react-router-dom`, phẳng, không nested route

```tsx
<Route path="/" element={<Navigate to="/profiles" replace />} />
<Route path="/profiles" element={<ProfilesPage />} />
<Route path="/automation" element={<AutomationPage />} />
<Route path="/campaigns" element={<CampaignPage />} />
<Route path="/resources" element={<ResourcesPage />} />
<Route path="/marketplace" element={<MarketplacePage />} />
<Route path="/settings" element={<SettingsPage />} />
<Route path="/account" element={<AuthPage />} />
```

6 trang chính, tất cả phẳng ở gốc — không có route con dạng `/automation/:id`, mỗi trang tự quản lý state "đang chọn gì" bằng query param hoặc local state riêng (ví dụ `AutomationPage`'s `selectedProfileId`) thay vì đẩy vào URL. `/` redirect thẳng sang `/profiles` — không có trang chủ/dashboard riêng.

## Theme — áp class `dark` lên `<html>`, Tailwind tự đọc

```ts
function applyTheme(theme: Theme) {
  const resolved = theme === 'system' ? getSystemTheme() : theme
  document.documentElement.classList.toggle('dark', resolved === 'dark')
  localStorage.setItem('theme', theme)
}
```

Không dùng context Provider kiểu `ThemeProvider` bọc toàn app — chỉ toggle 1 class CSS trên `<html>`, Tailwind's `dark:` variant tự động áp dụng mọi nơi đã dùng class đó trong code, không cần truyền theme qua props xuống từng component. `theme-store` lưu lựa chọn vào `localStorage` (không phải SQLite — đây là preference thuần UI, không cần đồng bộ cloud) và nghe `matchMedia('(prefers-color-scheme: dark)')`'s `change` event để tự cập nhật khi theme hệ thống đổi lúc đang chọn "Theo hệ thống".

## i18n — bảng tra cứu string phẳng, không dùng thư viện i18n

```ts
const translations: Record<Locale, Record<string, string>> = {
  vi: { 'nav.profiles': 'Hồ sơ', 'profiles.manage': 'Quản lý {count} browser profile', ... },
  en: { ... }
}
```

Tự viết, không dùng `react-i18next`/`next-intl` — đủ cho quy mô hiện tại (vài chục key, 2 ngôn ngữ). Key đặt theo `<page>.<ý-nghĩa>` (`nav.profiles`, `profiles.manage`), nội suy biến bằng `{count}` thay thế thủ công bằng `.replace()` ở nơi gọi — không có pluralization rule phức tạp (số ít/nhiều) như thư viện i18n đầy đủ, chấp nhận được vì tiếng Việt không chia số ít/nhiều theo ngữ pháp.

Thêm 1 ngôn ngữ mới: xem walkthrough ở [development/06-them-ngon-ngu.md](../development/06-them-ngon-ngu.md).
