# Main process — layering đích

[← Về mục lục](../README.md) · [← 00-tong-quan](00-tong-quan.md)

## Cây thư mục đích — bắt buộc cho code mới

Mọi domain/file mới viết trong `main/` từ nay **PHẢI** theo đúng cây dưới đây — không tự đặt vị trí khác "cho tiện" rồi để refactor sau. Domain cũ chưa khớp thì ghi nhận lệch, không bắt chước cái lệch đó cho domain mới.

```
main/
├── services/            "mặt" của mọi domain — nơi DUY NHẤT domain khác được phép import vào
│   ├── profile-service.ts, workflow-service.ts, library-service.ts,
│   │   video-pipeline-service.ts, settings-service.ts, metrics-service.ts, ...
│   └── (1 file = 1 domain, CRUD + business rule gộp, raw better-sqlite3 — xem
│        00-tong-quan.md, đây là lựa chọn ĐÚNG kích cỡ, không phải thiếu
│        Repository pattern)
│
├── ipc/                 handler MỎNG — parse input, gọi đúng 1 hàm service/engine, return
│   └── <domain>-handlers.ts    (vd automation-handlers.ts, video-studio-handlers.ts)
│
├── <domain>/            CHỈ domain có orchestration/execution riêng mới cần folder này —
│   │                    domain thuần CRUD (profile, proxy, email, cookie, settings...)
│   │                    chỉ cần 1 file trong services/, không cần folder riêng
│   ├── engine.ts            orchestrator — duyệt graph, gọi node theo thứ tự
│   ├── node-definitions.ts  (nếu có canvas) catalog hiển thị lên UI
│   ├── nodes/
│   │   ├── base-node.ts     Template Method — execute() abstract, run() lo retry/metrics/error
│   │   ├── registry.ts      Registry — type string → class
│   │   └── <node-type>.ts   1 file = 1 loại node
│   └── providers/           (nếu gọi API ngoài) Strategy
│       ├── types.ts          interface chung (vd VideoProvider/TTSProvider)
│       ├── registry.ts       getXProvider(name) → chọn implementation theo setting
│       └── <vendor>-provider.ts
│
└── database/init.ts
```

3 domain hiện có đúng dạng `<domain>/`: `automation/` (BaseNode, 16+ loại node), `video-studio/` (BaseVideoNode — hierarchy RIÊNG, 5 provider video/ảnh + 3 TTS), `agent/` (AgentService facade + `tools/` theo kiểu Factory thay vì class — mỗi tool là 1 hàm `createXTool(ctx)` vì `ToolLoopAgent` nhận object `tool()`, không nhận class instance).

## Pattern theo đúng tên, trong context repo này

**Registry** — bảng `Record<string, Class>` tra type string → class, dùng khi "nhiều loại, chọn theo tên string, người gọi không cần biết implementation". Thêm 1 loại mới = thêm file + 1 dòng trong `registry.ts` — **không sửa** `createNode()`/`createVideoNode()`/`buildToolset()`.

```ts
// main/video-studio/nodes/registry.ts
const VIDEO_NODE_REGISTRY: Record<string, VideoNodeClass> = {
  'character-reference': CharacterReferenceNode,
  'generate-image': GenerateImageNode,
  // thêm loại mới: chỉ thêm 1 dòng ở đây + 1 file class mới
}
```

**Strategy** — 1 interface (`VideoProvider`/`TTSProvider` trong `providers/types.ts`: `submit()`/`poll()`/`cancel?()`), nhiều vendor implement, chọn lúc runtime qua `getXProvider(name)`. Dùng khi có ≥ 2 vendor làm cùng 1 việc nhưng API khác nhau.

**Template Method** — class abstract định nghĩa khung chạy cố định (`BaseNode.run()`: init → execute (có retry/backoff) → ghi metric → chụp screenshot lỗi), subclass CHỈ override `execute()`. `BaseVideoNode` của `video-studio/` là hierarchy khác — không bắt buộc `page`/`context` Playwright như `BaseNode`, input/output đã resolve theo từng socket từ `engine.ts` — **không gộp 2 base class khác domain**, dù tên file trùng (`nodes/base-node.ts` ở cả 2 nơi).

**Facade** — 1 class gói độ phức tạp đa-turn/pause-resume của 1 thư viện ngoài, lộ ra API gọn (`AgentService.run()/resolveApproval()/cancel()`) cho `ipc/agent-handlers.ts` dùng mà không cần biết `ToolLoopAgent` hoạt động thế nào bên trong.

**Adapter** — hàm thuần dịch vocabulary của 1 lib ngoài (`TextStreamPart` của AI SDK) sang vocabulary riêng của app (`AGUIEvent`), để mọi nơi downstream chỉ cần hiểu 1 vocabulary — `agent/ag-ui-adapter.ts`'s `adaptStreamPart()`.

**Observer** — push 1 chiều qua IPC channel (`'video-studio:job-progress'`...), renderer subscribe bằng `window.api.on(channel, cb)`, nhiều subscriber độc lập không cần biết nhau.

**Two-gate validation** — khi AI đề xuất thay đổi 1 đồ thị (workflow/pipeline): validate NHANH ở main-process tool (`propose-*-change.ts`) so với snapshot đầu run (cho model tự sửa nếu sai), rồi validate LẠI ở renderer (`apply-*-patch.ts`) so với canvas THẬT ngay trước khi mutate — vì 1 run dài có thể span qua lúc người dùng tự sửa canvas bằng tay. 2 bản hiện có (`validate-workflow-patch.ts`/`apply-workflow-patch.ts` cho Automation, mirror cho Video Studio) — chưa có abstraction chung, chấp nhận trùng lặp có kiểm soát vì 2 đồ thị khác type hẳn nhau (`WorkflowNode` control-flow vs `VideoNode` typed-socket).

## Đọc tiếp

- [02-renderer-layering.md](02-renderer-layering.md)
- [03-domain-boundaries.md](03-domain-boundaries.md) — ai được import service file của domain khác
