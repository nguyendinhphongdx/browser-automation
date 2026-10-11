# ADR-0008: Trợ lý chung — mở rộng tool sang Campaigns/Resources/Profiles

🟢 Accepted

- **Date**: 2026-10-12
- **Status**: Accepted

## Context

Trợ lý chung (`'general'`, ADR-0006/0007) hiện chỉ chạm được Thư viện + Project trực tiếp, Automation/Video Studio qua `delegate_to_*`. 3 domain còn lại của app — Campaigns (chạy workflow trên nhiều profile), Resources (cookie/proxy/email — khác Resource Library), Profiles (hồ sơ chống dấu vết) — chưa có tool AI nào.

Người dùng chốt: mở rộng tool sang các domain này, giữ nguyên triết lý gate đang có (không bỏ approval cho bất kỳ tool nào, cả cũ và mới) — phương án "bỏ hết rào an toàn" đã bị từ chối ở 1 câu hỏi trước.

Khảo sát xác nhận service CRUD đã có sẵn đầy đủ (`campaign-service.ts`, `cookie-service.ts`, `proxy-service.ts`, `email-service.ts`, `profile-service.ts`), chỉ cần viết tool wrapper mirror `delete-resource.ts`. Khảo sát cũng chỉ ra vài hành động/field cần cẩn trọng hơn CRUD thường:

- `executeCampaign` — chạy thật nhiều browser cùng lúc, cần `WebContents sender` không tự nhiên có trong tool context, rủi ro cao. Loại trừ khỏi v1.
- `launchBrowser`/`closeBrowser`/`closeAllBrowsers` — trợ lý chung không có tool nào khác để làm gì tiếp với browser đó (không có run_js/get_page_html, các tool đó chỉ thuộc automation) — capability cụt, chỉ thêm rủi ro. Loại trừ.
- `exportCookiesJSON` — trả nguyên văn cookie session thật. Loại trừ hoàn toàn.
- `getAllProxies`/`getProxyById`/`getAllEmails`/`getEmailById` — trả mật khẩu/username đã decrypt. Tool đọc phải ẩn field nhạy cảm khỏi kết quả — không có lý do model cần thấy mật khẩu thật.
- `checkProxy` — mở kết nối TCP thật tới host:port lưu sẵn — hành động mạng thật, gate approval.

## Decision

### Tool mới theo 3 domain

**Campaigns**: `list_campaigns` (kèm trạng thái run gần nhất), `create_campaign`, `update_campaign`, `duplicate_campaign`, `delete_campaign` (gate). Không có tool chạy/dừng campaign.

**Resources**: `list_cookies`/`create_cookie`/`update_cookie`/`delete_cookie` (gate) — list không trả giá trị cookie thật. `list_proxies`/`create_proxy`/`update_proxy`/`delete_proxy` (gate)/`check_proxy` (gate) — list/get ẩn username/password. `list_emails`/`create_email`/`update_email`/`delete_email` (gate) — list/get ẩn password. Không có tool import/export.

**Profiles**: `list_profiles`, `create_profile`, `update_profile`, `duplicate_profile`, `delete_profile` (gate — rủi ro cao nhất, xoá cả thư mục dữ liệu browser trên đĩa). Không có tool launch/close browser.

### Đăng ký + gate

Tất cả tool mới chỉ thêm vào `buildGeneralToolset`. `general.approvalGatedTools` thêm `delete_campaign`/`delete_cookie`/`delete_proxy`/`delete_email`/`delete_profile`/`check_proxy`. `GENERAL_AGENT_INSTRUCTIONS` cập nhật mô tả bộ tool mới + giới hạn (không chạy campaign thật, không mở/đóng browser).

## Alternatives considered

| Option | Pros | Cons | Why not |
|---|---|---|---|
| Bỏ hết approval gate | Hành động không bị chặn | Mất lớp an toàn duy nhất đang có | Người dùng đã chọn giữ gate |
| Wrap toàn bộ service function kể cả executeCampaign/launchBrowser/exportCookiesJSON | "Đầy đủ" cơ học | executeCampaign cần sender không tự nhiên có; launch/close browser là capability cụt; exportCookiesJSON lộ session thật | Rủi ro/chi phí không tương xứng |
| CRUD cơ bản mỗi domain, ẩn field nhạy cảm, loại trừ 3 nhóm hành động nguy hiểm (chosen) | Đủ dùng thực tế, không lộ secret, không thêm capability cụt | Không chạy campaign/mở browser qua trợ lý chung | Đánh đổi hợp lý, nói rõ trong instructions |

## Consequences

### Positive

- Trợ lý chung phủ được Campaigns/Resources/Profiles — chỉ còn Settings chưa có tool.
- Không lộ cookie/mật khẩu vào context model dù chỉ "đọc".
- Không thêm capability nửa vời (chạy campaign/mở browser không theo dõi tiếp được).

### Negative

- Settings vẫn ngoài phạm vi.
- Không chạy/dừng campaign qua AI — cần thiết kế riêng nếu sau này cần.

## Related

- [ADR-0006](0006-general-assistant-domain.md), [ADR-0007](0007-agent-orchestration.md) — domain 'general' và tiền lệ gate theo mức rủi ro
