# Chế độ Code

[← Về mục lục](../README.md)

Workflow `mode: 'code'` chạy đoạn TypeScript/JS người dùng tự viết trong Monaco Editor, thay vì đồ thị node.

## Thực thi — `new Function`, không sandbox

```ts
// main/automation/engine.ts's executeCodeWorkflow()
const api = { page: ctx.page, context: ctx.context, variables: ctx.variables, log, delay }

const fn = new Function('api', `
  const { page, context, variables, log, delay } = api;
  return (async () => { ${code} })();
`)
await fn(api)
```

`page`/`context` truyền vào là **object Playwright thật**, không phải 1 wrapper giới hạn API. Code người dùng viết có toàn quyền như code TypeScript bình thường gọi Playwright — kể cả việc không được "quảng cáo" qua autocomplete.

## Autocomplete trong Monaco khai báo 1 tập API **nhỏ hơn** khả năng thật

```ts
// renderer/pages/automation/CodeEditor.tsx
declare const page: {
  goto(url: string, options?: {...}): Promise<void>;
  click(selector: string, ...): Promise<void>;
  // ...chỉ ~15 method
};
```

Đây là khai báo type **chỉ để Monaco gợi ý lúc gõ** — bị xoá hoàn toàn lúc chạy thật (TypeScript type không tồn tại ở runtime). Vì `executeCodeWorkflow()` truyền thẳng `page` **thật** (không phải object giả lập khớp đúng interface trên), người dùng có thể gọi **bất kỳ method nào của Playwright `Page`** (ví dụ `page.evaluate()`, `page.route()`, `page.keyboard`...) dù autocomplete không gợi ý — chỉ là Monaco sẽ không hiện gợi ý/kiểm tra kiểu cho các method ngoài danh sách khai báo, không phải chặn gọi chúng.

## So với `run_js` của AI Agent — khác về cổng duyệt, không khác về quyền hạn

[`run_js`](06-ai-agent.md) (tool cho AI Agent chạy JS tuỳ ý) bị gate — luôn cần người dùng duyệt trước khi chạy. Chế độ Code **không có cổng duyệt nào** — code chạy ngay khi bấm Run, dù về bản chất kỹ thuật cả 2 đều thực thi JS tuỳ ý với cùng mức quyền truy cập Playwright. Khác biệt hợp lý: code ở chế độ Code là do **chính người dùng tự viết** (họ đã biết họ viết gì), còn `run_js` là code **do AI tạo ra** thay mặt người dùng — rủi ro "chạy nhầm ý" chỉ áp dụng cho trường hợp sau.
