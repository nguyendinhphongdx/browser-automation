# Known gaps

[← Về mục lục](../README.md)

Mọi khoảng trống/bất nhất đã phát hiện khi viết tài liệu (xác minh bằng grep/đọc source thật, không đoán) — gom 1 chỗ để không ai phải tự lục lại từng trang mới biết hết. Mỗi mục trỏ tới trang có chi tiết đầy đủ.

## 🔴 Nghiêm trọng — nên xử lý trước mọi mục khác

- [ ] **electron-builder đóng gói sai thư mục** (`dist/**/*` thay vì `out/**/*`) — theo tài liệu electron-builder, `files` khai báo sẽ thay thế hoàn toàn danh sách mặc định, nên bản cài đặt release hiện tại nhiều khả năng **không chứa code app thật**. Xác nhận bằng `git log`: `main` đã đổi từ `dist/` sang `out/` đúng lúc migrate electron-vite, nhưng `build.files` thêm sau đó không được đồng bộ lại → [architecture/39](../architecture/39-electron-builder-files-mismatch.md)

## Code chết / trùng lặp

- [ ] `packages/shared-types` không được import ở bất kỳ đâu trong `apps/desktop` hay `apps/server` — desktop tự định nghĩa type riêng ở `src/shared/types.ts` → [architecture/16](../architecture/16-shared-packages.md)
- [ ] `packages/fingerprint` cũng vậy — logic sinh/inject fingerprint bị lặp lại độc lập ở `main/browser/fingerprint.ts` + `launcher.ts` → [architecture/16](../architecture/16-shared-packages.md)

## Tính năng có backend, chưa có UI

- [ ] Quota/chọn-profile-theo-rule/A-B-test/dependency cho Campaign — `quota-service.ts` đã nối dây đầy đủ vào `campaign-engine.ts`, `CampaignEditor.tsx` chưa có form nào set các field này → [architecture/22](../architecture/22-advanced-campaign-features.md)
- [ ] Nhiều key ở `settings-service.ts`'s `DEFAULTS` (`general.*`, `sync.*`, `browser.headless`/`launchTimeout`/`defaultType`) không có ô nhập tương ứng ở trang Cài đặt → [architecture/28](../architecture/28-settings-keys-reference.md)

## Giới hạn kỹ thuật nên biết trước khi dựa vào

- [ ] Kiểm tra proxy chỉ là TCP connect thô tới `host:port`, không gửi request thật qua proxy — "sống" không đảm bảo proxy forward traffic đúng → [architecture/23](../architecture/23-proxy-health-check.md)
- [ ] Mã hoá AES-256-GCM bảo vệ được khi rò rỉ riêng file DB, không bảo vệ được nếu kẻ tấn công đọc được cả thư mục `userData` (khoá nằm cạnh dữ liệu) → [architecture/13](../architecture/13-ma-hoa-bao-mat.md)
- [ ] Chưa có test cho `renderer/` (0 file `.test.tsx`) — `vitest.config.ts` dùng `environment: 'node'`, chưa setup được test cần DOM → [development/02](02-kiem-thu.md)
- [ ] `src/renderer/index.html` chưa có Content-Security-Policy → [architecture/17](../architecture/17-electron-security.md)
- [ ] Deep link `browserauto://auth?token=...` nhận token thẳng từ URL ngoài app, không tự verify tại chỗ nhận (dựa vào server verify khi token được dùng sau đó) → [architecture/17](../architecture/17-electron-security.md)
- [ ] Cookie đã lưu ở Resources → Cookie **không có đường nào nạp vào trình duyệt thật** — node `set-cookie` chỉ đọc config riêng của chính nó, không đọc bảng `cookies` → [architecture/38](../architecture/38-email-cookie-formats.md)
- [ ] Marketplace: checkout Stripe còn nguyên TODO chưa gọi, download không gate theo đã-mua-hay-chưa, không có model `Purchase`, doanh thu creator tính nhầm mọi lượt tải thành đã bán → [architecture/29](../architecture/29-marketplace-payment-flow.md)
- [ ] Trang `admin/users` là khung tĩnh, hiện chữ "chưa setup auth" dù auth đã hoạt động đầy đủ từ lâu → [architecture/36](../architecture/36-admin-pages.md)

## Không phải bug — chỉ là thiếu tài liệu/UI, không phải thiếu đúng-sai

Khác với các mục trên, các việc dưới đây **không sai**, chỉ là cơ hội cải thiện rõ ràng nếu có thời gian:

- Form tạo Campaign chưa lộ ra các field nâng cao đã có sẵn ở backend (xem mục trên)
- Trang Cài đặt chưa có UI cho nhóm `general.*`/`sync.*` dù đã có default sẵn sàng dùng

## Cách dùng checklist này

Khi nhận việc dọn dẹp/refactor, đọc trang chi tiết tương ứng trước khi bắt tay sửa — mỗi trang đã giải thích rõ **vì sao** hiện trạng như vậy (quyết định thiết kế cũ, hay đơn thuần chưa làm tới), tránh sửa nhầm hướng hoặc phá vỡ 1 đánh đổi có chủ đích tưởng là bug.
