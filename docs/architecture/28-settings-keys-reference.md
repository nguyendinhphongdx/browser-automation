# Settings keys reference

[← Về mục lục](../README.md)

Toàn bộ key đã có `DEFAULTS` khai báo trong `settings-service.ts` — tra nhanh thay vì đọc lại source mỗi lần cần biết key nào tồn tại.

| Key | Default | Có UI ở Settings không? |
|---|---|---|
| `api.url` | `http://localhost:3000` | Có — ô Server URL |
| `api.timeout` | `30000` | Không |
| `auth.token` / `auth.refreshToken` | — | Không (set qua luồng đăng nhập, không sửa tay) |
| `sync.enabled` / `sync.autoSync` | `false` | Không |
| `browser.defaultType` | `chrome` | Không |
| `browser.launchTimeout` | `30000` | Không |
| `browser.headless` | `false` | Không |
| `general.startMinimized` | `false` | Không |
| `general.closeToTray` | `false` | Không |
| `general.autoStart` | `false` | Không |
| `general.maxConcurrentBrowsers` | `5` | Không |
| `ai.provider` / `ai.apiKey` / `ai.baseUrl` / `ai.model` | — | Có — mục AI Provider |

## Khá nhiều key có default nhưng chưa có ô nhập tương ứng

Xác minh bằng grep: `SettingsPage.tsx` không tham chiếu tới bất kỳ key nào thuộc nhóm `general.*`, `sync.*`, `browser.headless`/`browser.launchTimeout`/`browser.defaultType`. Các giá trị default này tồn tại sẵn (code đâu đó trong tương lai có thể đọc `getSetting('general.maxConcurrentBrowsers')` để giới hạn số browser chạy đồng thời chẳng hạn) nhưng hiện tại **không ai set được giá trị khác default qua UI** — chỉ sửa được bằng cách tự gọi `window.api.setSetting(key, value)` (ví dụ qua DevTools console) hoặc update thẳng bảng `settings` trong SQLite.

Không phải lỗi — nhiều khả năng đây là chỗ để sẵn cho tính năng dự kiến làm sau (giới hạn tài nguyên, tuỳ chỉnh hành vi khởi động) nhưng UI tương ứng chưa viết. Liệt kê ở đây để không ai tưởng nhầm các default này đang được 1 ô cài đặt nào đó điều khiển.
