# Workflow Engine

[← Về mục lục](../README.md)

Một workflow là 1 đồ thị `nodes` + `edges` (định dạng React Flow). `main/automation/engine.ts` duyệt đồ thị này và thực thi từng node bằng Playwright.

## 2 tầng: node đơn giản (registry) vs. node điều khiển luồng (orchestrator)

### Node đơn giản — Template Method qua `BaseNode`

54 loại node (mở trang, click, nhập text, lấy dữ liệu...) đều là 1 class kế thừa `BaseNode`, đăng ký trong `nodes/registry.ts`:

```ts
const NODE_REGISTRY: Record<string, NodeClass> = {
  'open-page': OpenPageNode,
  'click': ClickNode,
  // ...54 dòng
}
```

`BaseNode.run()` là **Template Method**: lo sẵn retry (theo `NodeRetryConfig` cấu hình trên node), đo thời gian chạy, ghi `node_metrics`, bắt lỗi — subclass chỉ cần implement `execute()` (và tuỳ chọn `init()` để validate config trước khi chạy):

```ts
export class OpenPageNode extends BaseNode {
  protected async init() {
    if (!this.config.url) throw new Error('URL is required')
  }
  protected async execute() {
    await this.page.goto(this.resolve(this.config.url))
  }
}
```

Thêm 1 node mới = tạo 1 class thế này + thêm 1 dòng vào `NODE_REGISTRY`, không cần sửa `engine.ts`.

### Node điều khiển luồng — xử lý trực tiếp trong `engine.ts`

```ts
const BRANCHING_TYPES = new Set([
  'if-else', 'loop', 'loop-each', 'element-exists',
  'try-catch', 'break-loop', 'parallel-fork', 'parallel-join'
])
```

Các loại này **không** nằm trong `NODE_REGISTRY` — chúng không "làm" gì trên trang mà quyết định *node tiếp theo nào được chạy*, nên orchestrator (`engine.ts`) tự xử lý logic rẽ nhánh/lặp/song song thay vì uỷ quyền cho 1 class.

## Cách engine chọn "cạnh tiếp theo"

Mỗi `edge` có `sourceHandle` (ví dụ `branch-true`/`branch-false` của If/Else, `branch-0`/`branch-1`... của Parallel Fork) và `edgeType`. Engine duyệt cạnh theo 2 hàm:

```ts
getNextNodes(nodeId, edges, handleFilter?)  // cạnh thường, lọc theo sourceHandle nếu có
getErrorNodes(nodeId, edges)                // cạnh edgeType === 'on-error' — nhánh xử lý lỗi riêng
```

Node bắt đầu workflow là node **không phải target của bất kỳ edge nào** (`getStartNodes`) — không cần đánh dấu "node đầu" riêng, suy ra từ chính đồ thị.

## Parallel Fork/Join

`parallel-fork` tìm tất cả nhánh xuất phát từ nó, dò theo từng nhánh tới khi gặp `parallel-join` chung (`findJoinNode`), rồi chạy đồng thời (`Promise.all`/`Promise.any` tuỳ cấu hình) — mỗi nhánh có **bản sao biến riêng** (`{ ...ctx.variables }`) để tránh ghi đè chéo, sau đó merge kết quả: khoá nào khác giá trị giữa các nhánh sẽ gộp thành mảng.

## `ExecutionContext` — trạng thái xuyên suốt 1 lần chạy

```ts
interface ExecutionContext {
  page: Page; context: BrowserContext        // Playwright thật
  variables: Record<string, any>             // biến workflow, đọc/ghi qua node Set Variable
  logs: LogEntry[]                           // tích luỹ, ghi vào workflow_logs khi xong
  depth: number; parentWorkflowId?: string   // cho node Run Sub-workflow — chặn đệ quy vô hạn
  onNodeStart/onNodeDone/onNodeError/onNodeRetry  // callback đẩy tiến độ real-time qua IPC
}
```

## Chạy workflow trên nhiều profile — Campaign

`campaign-engine.ts` không tự implement lại logic chạy workflow — nó gọi `automation/run-workflow.ts`'s `runWorkflowOnce()`, hàm dùng chung với `scheduler.ts` (cron/webhook trigger). Tách hàm này ra riêng (thay vì lặp lại logic ở 2 nơi) là điểm đã được refactor khi phát hiện trùng lặp giữa scheduler và campaign engine.
