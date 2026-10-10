# ADR-0003: Fan-in (join) của Video Studio dựa trên giả định KHÔNG có node điều kiện

🟢 Accepted

- **Date**: 2026-10-10
- **Status**: Accepted

## Context

`video-studio/engine.ts` (sau khi sửa để chạy song song — xem commit `aa961f8`) dùng Kahn's algorithm đếm `inDegree` theo SỐ CẠNH TỚI MỖI NODE: 1 node chỉ vào tầng kế tiếp (được chạy) khi TOÀN BỘ cạnh trỏ vào nó đã hoàn tất ở tầng trước. Đây chính là "fan-in" (hội tụ nhiều nhánh) — vd node `stitch` (6 input `video1..video6`) hay `audio-mix` (4 input `track1..track4`) chỉ chạy khi mọi nhánh nó cần đã xong.

Tham khảo trực tiếp `ai-platform-product-strategy`/CAP repo's [ADR-0023 — workflow fan-out/fan-in join](../../../../C-OpenAI/cap/apps/docs/docs/10-engineering/06-adr/0023-workflow-fanout-fanin-join.md) (họ đã implement thật, không phải lý thuyết): engine của họ CÂN NHẮC KỸ vì workflow CAP có node `branch`/`human_in_the_loop` — router CÓ ĐIỀU KIỆN, chỉ kích hoạt ĐÚNG 1 trong N cạnh ra, không phải tất cả. Cách "đợi đủ mọi cạnh tĩnh" (đúng cách engine Video Studio đang làm) bị chính CAP liệt là lựa chọn SAI ("Option B" họ loại bỏ) cho trường hợp CỦA HỌ — vì sau khi 1 router chỉ chọn 1 nhánh, các cạnh KHÔNG được chọn không bao giờ tới, join ngây thơ sẽ **deadlock chờ mãi**.

## Decision

Giữ nguyên cách đếm `inDegree` theo cạnh tĩnh (không đổi sang per-port/active-edge như CAP) — vì **đúng cho Video Studio hiện tại**: catalog 12 node của Video Studio hoàn toàn là dataflow thuần (character-reference, scene-prompt, generate-image, generate-video, extract-last-frame, tts-dialogue/narration, subtitle, stitch, audio-mix, compose, save-to-library) — **không có node điều kiện/router nào chọn 1-trong-N nhánh**. Mọi cạnh được AI/người dùng vẽ ra đều CHẮC CHẮN được kích hoạt khi node nguồn chạy xong — không có khái niệm "cạnh không được chọn" như CAP.

**Ràng buộc tường minh cho tương lai**: nếu Video Studio thêm 1 node kiểu điều kiện (vd "chỉ tạo video nếu có đủ ảnh tham chiếu", "rẽ theo A/B test provider") — cách đếm `inDegree` hiện tại SẼ VỠ đúng kiểu CAP đã cảnh báo (deadlock). Lúc đó phải đổi sang per-port join có khái niệm "cạnh active" (xem thiết kế CAP) — không phải chỉnh nhỏ, là đổi cách tính fan-in.

## Alternatives considered

| Option | Pros | Cons | Why not |
|---|---|---|---|
| Per-port/active-edge join như CAP (ADR-0023) | Đúng cả khi có node điều kiện sau này | Phức tạp hơn hẳn — cần track "cạnh nào active" theo runtime, không suy được tĩnh từ đồ thị | Video Studio hiện không có node điều kiện — áp dụng trước là over-engineer, vi phạm decision ladder ở [00-tong-quan.md](../conventions/00-tong-quan.md) |
| Đếm `inDegree` theo cạnh tĩnh (chosen) | Đơn giản, đúng 100% với catalog node hiện tại, đã có sẵn (không phải viết thêm) | Vỡ nếu thêm node điều kiện mà không xem lại ADR này trước | — |

## Consequences

### Positive

- Không thêm độ phức tạp không cần thiết cho use case hiện tại.
- `executeVideoPipeline` vẫn giữ đúng tính chất CAP coi là bắt buộc: node không bao giờ chạy với dữ liệu thiếu (1 tầng lỗi → dừng hẳn, không sang tầng sau — xem `aa961f8`).

### Negative

- Giả định "không có node điều kiện" là NGẦM trong code (`engine.ts` không tự kiểm tra/cảnh báo gì) — chỉ ADR này ghi lại, dễ bị quên nếu không đọc trước khi thêm node mới.

### Trade-off

- Đổi "đúng trong mọi trường hợp tương lai" lấy "đơn giản, đúng cho hiện tại, có cảnh báo rõ ràng khi nào cần đổi".

## Related

- [docs/conventions/00-tong-quan.md](../conventions/00-tong-quan.md) — Template Method / decision ladder
- Commit `aa961f8` — chạy song song theo tầng
- CAP ADR-0023 (repo tham khảo, không phải trong monorepo này) — thiết kế fan-in per-port đầy đủ, dùng làm model khi Video Studio thật sự cần nó
