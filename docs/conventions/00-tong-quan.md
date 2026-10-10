# Tổng quan kiến trúc đích — SOLID & Design Pattern

[← Về mục lục](../README.md)

Cây `docs/conventions/` mô tả **kiến trúc ĐÍCH** cho `apps/desktop` — áp SOLID + design pattern có chủ đích, không phải ghi lại hiện trạng. Khác [`docs/architecture/`](../architecture/) (ghi "đang có gì") và [`docs/adr/`](../adr/) (ghi "vì sao chọn vậy") — xem [docs/README.md](../README.md) để phân biệt 3 vai trò. Code hiện tại **chưa chắc khớp 100%** phần dưới đây; refactor sang đúng convention là việc làm sau, không phải trong lúc viết docs này.

## Pattern đã dùng trong repo, đặt tên chính thức

Rút ra từ việc tự tay xây 2 domain (Resource Library, Video Studio) — các pattern này đã tồn tại ad-hoc, giờ đặt tên + chỉ ra 1 **reference template** (file code thật) cho mỗi pattern, để không chỉ là lý thuyết.

| Pattern | Vai trò trong repo này | Reference template |
|---|---|---|
| **Registry** | Bảng tra type string → class/factory | `main/video-studio/nodes/registry.ts`, `main/agent/tools/registry.ts` |
| **Factory** | Hàm tạo instance mới mỗi lần gọi, đóng gói context riêng của 1 lần chạy | `createXTool(ctx)` trong `agent/tools/*.ts` |
| **Strategy** | Nhiều implementation cùng interface, chọn lúc runtime theo tên vendor | `video-studio/providers/types.ts` (`VideoProvider`/`TTSProvider`) + `providers/registry.ts` |
| **Template Method** | Khung chạy cố định (init→execute→metrics/error), subclass chỉ override `execute()` | `automation/nodes/base-node.ts` (`BaseNode`) — **`video-studio/nodes/base-node.ts`** (`BaseVideoNode`) là 1 hierarchy RIÊNG, không gộp 2 domain vào 1 base class |
| **Facade** | Che độ phức tạp đa-turn/pause-resume của 1 thư viện ngoài sau API gọn | `agent/agent-service.ts` (`AgentService.run/resolveApproval/cancel`) |
| **Adapter** | Dịch vocabulary của 1 lib ngoài sang vocabulary riêng app | `agent/ag-ui-adapter.ts` (`adaptStreamPart`) |
| **Observer** | Push event qua IPC channel, nhiều subscriber độc lập | Channel `*:node-progress`/`*:job-progress` + `window.api.on()` |
| **Two-gate validation** (tự đặt tên, không phải GoF) | AI đề xuất patch lên canvas → validate nhanh ở main-process (cho model tự sửa) → validate lại ở renderer ngay trước khi mutate canvas THẬT (chống canvas đã đổi giữa chừng) | `shared/agent/validate-workflow-patch.ts` + `renderer/pages/automation/agent/apply-workflow-patch.ts`, mirror ở `video-studio` |

Chi tiết layer + boundary cụ thể: [01-main-process-layering.md](01-main-process-layering.md), [02-renderer-layering.md](02-renderer-layering.md), [03-domain-boundaries.md](03-domain-boundaries.md), [04-window-api-contract.md](04-window-api-contract.md).

## SOLID áp dụng cụ thể

Không trích giáo trình — nêu đúng chỗ đã tuân thủ/vi phạm thật trong repo này:

- **S** — 1 service file = 1 lý do đổi (business rule của 1 domain); 1 node class = 1 bước thực thi; 1 provider file = 1 vendor.
- **O** — thêm node/provider/tool mới = thêm file + 1 dòng registry, **không sửa** engine/dispatcher điều phối chung.
- **L** — implementation nào của `BaseNode`/`BaseVideoNode`/`VideoProvider` cũng phải thay được cho nhau mà engine không cần biết là implementation nào.
- **I** — vi phạm thật đang có: `AgentToolContext` (`agent/tools/types.ts`) phình dần (`workflowSnapshot` + `videoPipelineSnapshot` + `onScreenshot` + `onResourcePreview`...), mỗi tool chỉ cần 1 góc nhỏ trong đó. Hướng đích: tách sub-interface theo nhu cầu từng nhóm tool, compose lại lúc build context — áp dụng dần khi refactor, chưa cần sửa ngay.
- **D** — engine/facade phụ thuộc interface (`BaseNode`, `VideoProvider`), không phụ thuộc class cụ thể; registry là điểm đảo hướng phụ thuộc.

## Decision ladder — chống over-engineer

Trước khi viết code mới, dừng ở bậc đầu tiên thỏa được:

| # | Câu hỏi | Nếu đúng → làm gì |
|---|---|---|
| 1 | Có cần tồn tại không? | Không cần → bỏ (YAGNI) |
| 2 | Đã có trong codebase? | Tái dùng (service/node/provider đã có, reference template) — đừng viết lại |
| 3 | Dependency đã cài làm được? | Dùng luôn — đừng thêm package mới |
| 4 | Giải quyết được trong 1 dòng/1 hàm nhỏ? | Viết vậy — đừng bọc thành class/abstraction mới |
| 5 | Hết cách trên? | Viết mức tối thiểu cần để đúng behavior, theo đúng layer ở [01](01-main-process-layering.md)/[02](02-renderer-layering.md) |

Service layer hiện "CRUD + business rule gộp 1 file, raw better-sqlite3, không có Repository pattern riêng" — đây là **quyết định đúng kích cỡ cho SQLite single-process**, không phải thiếu sót. Không "cải tiến" thành Repository pattern thừa thãi khi refactor.

## Đọc tiếp

- [01-main-process-layering.md](01-main-process-layering.md) — cây thư mục `main/` đích, layer IPC→service→domain engine→provider
- [02-renderer-layering.md](02-renderer-layering.md) — cây thư mục `renderer/` đích, rule `components/` vs `pages/`
- [03-domain-boundaries.md](03-domain-boundaries.md) — domain nào được import gì của domain khác
- [04-window-api-contract.md](04-window-api-contract.md) — đích cho `Window.api`, liên quan [ADR-0001](../adr/0001-window-api-composition.md)
