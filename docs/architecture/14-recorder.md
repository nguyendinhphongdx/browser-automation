# Recorder

[← Về mục lục](../README.md)

`main/automation/recorder.ts` bắt thao tác người dùng làm **thật** trên 1 trang Playwright đang mở, rồi chuyển thành node workflow — xem phía người dùng ở [user-guide/05-ghi-lai-thao-tac.md](../user-guide/05-ghi-lai-thao-tac.md).

## Cầu nối browser → main process: `exposeFunction`

```ts
await page.exposeFunction('__recordAction', (action) => {
  state.actions.push({ ...action, timestamp: Date.now() })
})
await page.addInitScript(RECORDER_SCRIPT)   // áp cho mọi trang mới mở sau này
await page.evaluate(RECORDER_SCRIPT)        // áp ngay cho trang đang mở hiện tại
```

`page.exposeFunction` tạo 1 hàm gọi được **từ trong trang** (browser context) nhưng thực thi **ở main process** — đây là cách script chạy trong trang (không có quyền Node.js) báo được sự kiện về phía có quyền ghi vào bộ nhớ/DB. `RECORDER_SCRIPT` được inject 2 lần vì 2 lý do khác nhau: `addInitScript` lo cho các trang **mở sau** (navigate, tab mới), `evaluate` áp ngay cho trang **đang mở sẵn** từ trước khi bắt đầu ghi (nếu không gọi riêng, trang hiện tại sẽ không có script này cho tới lần load tiếp theo).

## Suy luận CSS selector — ưu tiên theo độ bền vững

Script injected tự tính 1 selector cho phần tử được thao tác, theo thứ tự ưu tiên:

1. `#id` — nếu phần tử có `id`
2. `[data-testid="..."]` — quy ước phổ biến cho test, ổn định qua các lần render lại UI
3. `tag[name="..."]` — form field thường có `name` cố định
4. Fallback: đường dẫn `nth-of-type` từ phần tử lên tới `<body>`

Thứ tự này ưu tiên selector **ít phụ thuộc cấu trúc DOM nhất trước** — `id`/`data-testid` không đổi dù trang redesign lại layout, còn selector theo `nth-of-type` (ưu tiên cuối) dễ gãy nếu trang thêm/bớt phần tử ở giữa.

## Điều hướng (navigate) được bắt riêng, không qua `exposeFunction`

```ts
page.on('framenavigated', (frame) => {
  if (frame === page.mainFrame() && state.recording) {
    state.actions.push({ type: 'navigate', url: page.url(), ... })
  }
})
```

Đổi URL (gõ địa chỉ mới, submit form điều hướng trang, redirect...) không phải sự kiện DOM script injected bắt được từ bên trong trang cũ (trang đã rời đi) — Playwright's `framenavigated` event ở tầng CDP bắt được bất kể nguyên nhân điều hướng là gì.

## `actionsToWorkflow()` — map action → node, dàn layout tự động

```ts
const ACTION_TO_NODE: Record<string, {...}> = {
  navigate: { nodeType: 'open-page', ... },
  click: { nodeType: 'click', ... },
  type: { nodeType: 'type-text', ... },
  // ...
}
```

Mỗi action ghi được map sang đúng 1 loại node trong [`NODE_REGISTRY`](05-workflow-engine.md), node đặt theo layout ngang đơn giản (`x = 80 + i * 250`) — đủ để người dùng thấy ngay thứ tự, không cố tính layout "đẹp" (người dùng có thể tự kéo sắp xếp lại sau). Action không map được (`ACTION_TO_NODE[action.type]` không tồn tại) fallback về node `click` thay vì bỏ qua — ưu tiên giữ đủ số bước đã ghi hơn là im lặng bỏ mất 1 hành động.
