---
name: scaffold
description: Sinh skeleton file cho 1 loại node mới (automation/video-studio), 1 provider mới, 1 agent tool mới, hoặc 1 domain hoàn toàn mới trong main/ — đúng cây/pattern ở docs/conventions/, kèm đăng ký registry, để lại TODO cho phần logic. Dùng khi user nói "thêm node X", "thêm provider Y", "tạo domain mới cho Z".
---

# scaffold — Sinh code khung theo convention, không phải viết logic hộ

Khác `arch-check` (chỉ TƯ VẤN đặt ở đâu) — skill này THỰC SỰ tạo file. Chỉ sinh phần khung đúng pattern (class kế thừa, đăng ký registry, định nghĩa UI) — **không tự bịa logic nghiệp vụ**, luôn để `TODO` ở đúng chỗ cho người/agent điền tiếp.

## Trước khi sinh file — luôn làm theo thứ tự

1. Đọc [conventions/00-tong-quan.md](../../../docs/conventions/00-tong-quan.md) để biết đúng pattern.
2. Đọc **1 file reference template thật** cùng loại đã tồn tại (bảng trong `00-tong-quan.md`) — copy đúng hình dạng (constructor, tên method, cách gọi `this.log()`...), không tự sáng tạo shape mới.
3. Hỏi lại user nếu thiếu: tên loại (`nodeType`/tên provider), domain nào, input/output nào (nếu là node có socket kiểu).

## Kind 1 — Node mới cho domain đã có `nodes/` (automation hoặc video-studio)

1. Đọc 1 node class gần giống nhất làm mẫu (vd `main/automation/nodes/open-page.ts` hoặc `main/video-studio/nodes/scene-prompt.ts`).
2. Tạo `main/<domain>/nodes/<ten-kebab>.ts`:
   - Automation: `export class XNode extends BaseNode { protected async execute() { /* TODO */ } }`
   - Video Studio: `export class XNode extends BaseVideoNode { async execute(inputs) { /* TODO */ return {} } }`
3. Đăng ký 1 dòng vào `nodes/registry.ts` của đúng domain đó — **không sửa gì khác trong file registry**.
4. Automation only: thêm định nghĩa UI vào `automation/node-definitions.ts` (label, icon, category, configSchema).
5. Nhắc user: cần viết test (`base-node.test.ts` làm mẫu) trước khi coi là xong — không tự viết test hộ nếu chưa rõ hành vi thật.

## Kind 2 — Provider mới (Strategy, cho `video-studio/providers/`)

1. Đọc `providers/types.ts` (interface `VideoProvider`/`TTSProvider`) + 1 provider gần giống (vd `flux-provider.ts` cho ảnh, `elevenlabs-provider.ts` cho TTS).
2. Tạo `main/video-studio/providers/<vendor>-provider.ts` implement đúng interface (`submit()`/`poll()`, `cancel?()` nếu vendor hỗ trợ hủy).
3. Thêm 1 case vào `getVideoProvider()`/`getTTSProvider()` trong `providers/registry.ts`, đọc API key qua `getSetting('videoStudio.<vendor>.apiKey')`.
4. Nếu cần setting mới → thêm key vào `SENSITIVE_KEYS` ở `settings-service.ts` (mã hoá) nếu là secret.

## Kind 3 — Agent tool mới (Factory, cho `agent/tools/`)

1. Đọc 1 tool gần giống trong `agent/tools/*.ts` (vd `list-resources.ts` cho tool chỉ đọc, `propose-workflow-change.ts` cho tool đề xuất thay đổi canvas).
2. Tạo `main/agent/tools/<ten-kebab>.ts`, export `createXTool(ctx: AgentToolContext)` trả về `tool({ description, inputSchema, execute })`.
3. Thêm vào `buildToolset()` (domain automation) hoặc `buildVideoToolset()` (domain video-studio) ở `tools/registry.ts` — đúng domain, không thêm nhầm cả 2.
4. Hành động phá huỷ/không hồi phục (xoá dữ liệu, chạy mã tuỳ ý) → thêm tên tool vào `APPROVAL_GATED_TOOLS`.
5. Nếu tool cần dữ liệu mới trong context → thêm field vào `AgentToolContext` (`tools/types.ts`) — nhắc user đây đang là chỗ vi phạm ISP đã biết (xem `00-tong-quan.md`), thêm field mới càng khiến nó phình, chỉ thêm khi thật cần.

## Kind 4 — Domain hoàn toàn mới trong `main/`

Theo đúng cây ở [01-main-process-layering.md](../../../docs/conventions/01-main-process-layering.md):

- Thuần CRUD → chỉ tạo `main/services/<domain>-service.ts` (mirror `library-service.ts`: hàm `rowToX()` map DB row → type, prepared statement).
- Có orchestration/execution riêng → tạo `main/<domain>/{engine.ts, node-definitions.ts, nodes/{base-node.ts,registry.ts}}`, base class mới (Template Method riêng — **không** kế thừa `BaseNode`/`BaseVideoNode` của domain khác).

Luôn hỏi user xác nhận domain mới thật sự cần folder riêng (có "nhiều loại chọn theo tên string" + có canvas/orchestration) hay chỉ cần CRUD — tạo folder thừa khi không cần là vi phạm decision ladder ở `00-tong-quan.md`.

## Sau khi sinh file

Chạy `arch-check` (Mode 2) trên diff vừa tạo trước khi báo xong — scaffold đúng pattern không tự động đảm bảo không phá domain boundary (vd TODO logic lúc điền tay có thể lỡ import sai domain).

## Anti-pattern

- ❌ Tự điền logic nghiệp vụ thay vì để `TODO` — scaffold chỉ ra khung, không đoán hộ hành vi thật.
- ❌ Sinh file không đọc reference template trước — dễ lệch shape (constructor khác, thiếu `protected`/`abstract` đúng chỗ).
- ❌ Tạo domain folder mới cho thứ thuần CRUD — xem decision ladder trước khi tạo `nodes/`/`providers/` không cần thiết.
