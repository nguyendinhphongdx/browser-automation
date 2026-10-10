# ADR-0001: `Window.api` composition theo domain thay vì 1 block khổng lồ

🟢 Accepted

- **Date**: 2026-10-10
- **Status**: Accepted

## Context

`renderer/stores/profile-store.ts` giữ 1 `declare global { interface Window { api: {...} } } }` duy nhất, liệt kê method của MỌI domain (Profile, Workflow, Campaign, AI Agent, Resource Library, Video Studio...) — hiện đã hơn 95 method trong 1 block. Mỗi domain mới (Resource Library, rồi Video Studio) đều phải thêm tiếp vào đúng block này vì không có cách nào khác lúc đó: TypeScript's declaration merging cho `interface` chỉ hoạt động nếu tất cả các phần được merge nằm trong **cùng 1 file logic** hoặc kiểu hoàn toàn khớp — thử tách thành nhiều `declare global` block riêng ở nhiều file store khác nhau (mỗi domain tự khai báo phần `Window.api` của mình) đã cho ra lỗi biên dịch thật `TS2717 — Subsequent property declarations must have the same type`, vì TS không merge 2 kiểu khác nhau cho CÙNG 1 property (`api`) khi khai báo ở 2 nơi khác nhau.

Vấn đề sẽ chỉ nặng thêm: domain mới = method mới = sửa tiếp đúng 1 file đã quá dài, không ai biết chắc đã có method đó chưa khi tìm trong hàng trăm dòng.

## Decision

Mỗi domain's store file tự export 1 interface `<Domain>API` riêng (vd `ProfileAPI` trong `profile-store.ts`, `VideoStudioAPI` trong `video-studio-store.ts`). Tạo 1 file MỚI DUY NHẤT — `renderer/types/electron-api.ts` — làm aggregator: `type ElectronAPI = ProfileAPI & WorkflowAPI & ... & VideoStudioAPI`, và CHỈ file này có `declare global { interface Window { api: ElectronAPI } } }`.

Vì chỉ có đúng 1 chỗ gọi `declare global`, không còn tình huống TS phải merge 2 khai báo khác nhau cho cùng `api` — mỗi domain interface là 1 type riêng biệt, chỉ được `&` (intersect) lại ở 1 nơi.

## Alternatives considered

| Option | Pros | Cons | Why not |
|---|---|---|---|
| Nhiều `declare global` block, 1 block/domain, mỗi domain tự khai báo `Window.api` của mình | Không cần file aggregator mới | **Đã thử, lỗi thật**: `TS2717` — TS không merge khác type cùng field `api` qua nhiều `declare global` | Không compile được |
| Giữ 1 block khổng lồ trong `profile-store.ts`, chấp nhận phình dần | Không cần sửa gì ngay | Không scale — file ngày càng dài, domain mới không rõ nên thêm vào đâu, dễ trùng tên method | Đúng vấn đề ADR này giải quyết |
| 1 interface `ElectronAPI` composed từ `&` của nhiều interface theo domain, aggregator ở 1 file riêng (chosen) | Mỗi domain tự chủ interface của mình, chỉ 1 nơi `declare global`, compile sạch | Thêm 1 file mới, mỗi domain cần export thêm 1 interface (nhỏ, không phải logic) | — |

## Consequences

### Positive

- Mỗi domain's API surface nằm cạnh domain đó (trong chính store file), dễ tìm, dễ review diff khi thêm method mới.
- Aggregator (`electron-api.ts`) là nơi DUY NHẤT thấy toàn cảnh — hữu ích khi cần audit preload bridge.
- Không còn rủi ro `TS2717` tái diễn (đã thử hướng gây lỗi đó, biết chắc không đi lại).

### Negative

- Thêm 1 file mới (`electron-api.ts`) chỉ để làm aggregator — không chứa logic, thuần type.
- Domain nào cũng phải export thêm 1 interface (tách khỏi code hiện tại, cần làm 1 lượt refactor — chưa làm trong lần viết ADR này, xem [docs/conventions/04](../conventions/04-window-api-contract.md)).

### Trade-off

- Đổi "1 file duy nhất, dễ tìm nhưng ngày càng dài" lấy "nhiều file nhỏ theo domain, phải biết nhìn vào aggregator để thấy toàn cảnh".

## Related

- Convention: [docs/conventions/04-window-api-contract.md](../conventions/04-window-api-contract.md)
