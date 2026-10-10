# Domain boundary trong `main/`

[← Về mục lục](../README.md) · [← 00-tong-quan](00-tong-quan.md)

## Rule bắt buộc

Mỗi domain trong `main/` (automation, video-studio, agent, profile, library, campaign...) chỉ lộ ra ngoài qua **service file** của nó (`services/<domain>-service.ts`) HOẶC **`node-definitions.ts`** của nó (nếu có — đây là catalog dữ liệu thuần, không phải logic, nên cũng là "mặt" hợp lệ: domain khác — chủ yếu `agent/tools/` — cần đọc catalog này để biết loại node nào tồn tại, xem [propose-video-pipeline-change.ts](../../apps/desktop/src/main/agent/tools/propose-video-pipeline-change.ts) đọc `VIDEO_NODE_DEFINITIONS` của video-studio). Domain khác muốn dùng gì của domain X:

- ✅ **Được**: import hàm export từ `services/X-service.ts`, hoặc đọc catalog từ `X/node-definitions.ts`.
- ❌ **Không được**: import trực tiếp 1 node class, 1 provider cụ thể, hay bất kỳ file nội bộ nào trong `<domain>/nodes/`, `<domain>/providers/` của domain khác — đây mới là coupling thật (implementation có thể đổi hình dạng bất cứ lúc nào), khác catalog (chỉ đổi khi domain đó CHỦ ĐỘNG thêm/sửa loại node, luôn là thay đổi có chủ ý).

Lý do: `services/*-service.ts` là nơi DUY NHẤT giữ business rule + truy cập DB của domain đó (xem [01-main-process-layering.md](01-main-process-layering.md)) — import vòng qua file nội bộ nghĩa là bỏ qua đúng lớp rule đó, tạo coupling ngầm mà refactor nội bộ 1 domain sẽ âm thầm phá domain khác.

## Ví dụ ĐÚNG, đã có thật trong repo

```ts
// main/video-studio/nodes/save-to-library.ts
import { createResourceFromBuffer } from '../../services/library-service'
```

`video-studio` cần lưu kết quả vào Resource Library → import đúng hàm từ `services/library-service.ts` (mặt của domain `library`), không đụng tới file nội bộ nào của `library` (không có khái niệm "node"/"provider" cho domain này, chỉ có service — cũng đúng theo quy tắc, vì domain thuần CRUD không cần folder riêng).

## Khi nào domain A thật sự cần biết "hình dạng" của domain B (không chỉ gọi hàm)

Vẫn đi qua service/type export của B, không đọc trực tiếp struct nội bộ. Nếu thấy cần quá nhiều, đó là dấu hiệu 2 domain nên gộp hoặc cần 1 type dùng chung đặt ở `shared/types.ts` (không phải import chéo nội bộ).

## Đọc tiếp

- [04-window-api-contract.md](04-window-api-contract.md)
