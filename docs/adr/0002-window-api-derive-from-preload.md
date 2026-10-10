# ADR-0002: `Window.api` lấy type trực tiếp từ `preload.ts`, không khai tay

🟢 Accepted

- **Date**: 2026-10-10
- **Status**: Accepted
- **Supersedes**: [ADR-0001](0001-window-api-composition.md)

## Context

ADR-0001 chọn tách `Window.api` thành nhiều interface theo domain + 1 file aggregator — nhưng được quyết định TRƯỚC KHI đọc kỹ `main/preload.ts`. Đọc lại thì `preload.ts` đã tự có:

```ts
const api = { /* ~100 method thật, implementation thật */ }
contextBridge.exposeInMainWorld('api', api)
export type API = typeof api   // ← đã có sẵn, chưa từng được dùng ở renderer
```

`renderer/stores/profile-store.ts` lại KHAI TAY lại 1 lần nữa toàn bộ shape này trong `declare global { interface Window { api: {...} } } }` — tức là 2 bản copy của cùng 1 sự thật, không có gì đảm bảo đồng bộ. Hệ quả đo được thật (baseline typecheck lúc viết ADR này): **17 lỗi TS2339** — các method thật có trong `api` (`getExecutionHistory`, `getSchedules`, `toggleSchedule`, `uploadProfile`, `openBrowserLogin`...) nhưng bản khai tay quên liệt kê, vì mỗi lần thêm method mới trong `preload.ts` không ai nhớ phải sửa tiếp đúng chỗ thứ 2.

ADR-0001 giải quyết "làm sao chia nhỏ 1 interface khổng lồ cho dễ đọc" — nhưng vấn đề THẬT gây lỗi là "2 nguồn sự thật, không đồng bộ", không phải "interface quá dài". Chia nhỏ theo domain (ADR-0001) vẫn giữ nguyên 2 nguồn sự thật (chỉ là nhiều file khai tay nhỏ hơn thay vì 1 file khai tay to), không sửa gốc rễ.

## Decision

`Window.api` lấy type **trực tiếp** từ `API` do `preload.ts` export — không khai tay lại dưới bất kỳ hình thức nào (dù 1 block hay nhiều block theo domain).

```ts
// renderer/types/electron-api.ts (file mới, THAY cho toàn bộ interface khai tay cũ)
import type { API } from '../../main/preload'

declare global {
  interface Window {
    api: API
  }
}

export type {}
```

Xoá bỏ interface khai tay trong `profile-store.ts`. Chỉ 1 `declare global` duy nhất trong toàn repo — không còn nguy cơ `TS2717` (vốn chỉ xảy ra khi có ≥ 2 khai báo khác type cho cùng field `api`).

Tổ chức theo domain — mục tiêu phụ của ADR-0001 — đã được giải quyết KHÁC, không cần interface riêng: `preload.ts`'s `api = {...}` đã tự chia theo comment từng domain (`// Profile`, `// Workflow`, `// Video Studio`...) ngay tại nguồn, đọc trực tiếp ở đó khi cần biết domain nào có method gì.

## Alternatives considered

| Option | Pros | Cons | Why not |
|---|---|---|---|
| ADR-0001: nhiều interface theo domain + 1 aggregator, vẫn khai tay | Đọc theo domain | Vẫn 2 nguồn sự thật — không sửa nguyên nhân gốc (drift), chỉ chia nhỏ phần khai tay | Không giải quyết đúng vấn đề |
| Nhiều `declare global` block riêng theo domain | — | **Đã thử, lỗi thật** `TS2717` | Không compile được (giữ nguyên lý do từ ADR-0001) |
| Lấy type trực tiếp từ `API` export của `preload.ts` (chosen) | 1 nguồn sự thật, không thể drift, 1 dòng `declare global` duy nhất, sửa luôn 17 lỗi baseline hiện tại | Gõ `window.api.` autocomplete ra cả ~100 method (không chia theo domain ở tầng type) — chấp nhận được vì `preload.ts` đã tự chia theo comment | — |

## Consequences

### Positive

- 17 lỗi `TS2339` baseline hiện tại biến mất — không phải sửa tay từng dòng, tự đúng vì type giờ LÀ implementation thật.
- Không thể drift lần nữa — thêm method mới trong `preload.ts` tự động có trong `Window.api`, không có "chỗ thứ 2" để quên sửa.
- Code đổi ít hơn ADR-0001 rất nhiều (xoá 1 block, thêm 1 file 8 dòng) — đúng decision ladder ở [00-tong-quan.md](../conventions/00-tong-quan.md) (giải quyết trong 1 dòng/1 file nhỏ, đừng bọc abstraction).

### Negative

- Autocomplete `window.api.` ra hết ~100 method không phân domain — đánh đổi lấy đúng đắn, chấp nhận được vì đã có comment phân domain tại nguồn.
- Renderer giờ `import type` từ `main/preload.ts` — type-only, bị erase lúc build (không kéo runtime `electron` vào bundle renderer), nhưng là lần đầu renderer "biết tên" 1 file trong `main/`. Không tạo coupling runtime thật.

### Trade-off

- Đổi "tổ chức theo domain ở tầng type" (ADR-0001 muốn) lấy "không thể drift" (vấn đề THẬT đang gây lỗi) — ưu tiên đúng vì đây là ADR sửa lỗi, không phải ADR tối ưu đọc code.

## Related

- Supersedes: [ADR-0001](0001-window-api-composition.md)
- Convention: [docs/conventions/04-window-api-contract.md](../conventions/04-window-api-contract.md) (đã cập nhật theo ADR này)
