# Visual Editor canvas

[← Về mục lục](../README.md)

`VisualEditor.tsx` dựng canvas kéo-thả bằng **React Flow**. Chỉ 1 loại node React Flow duy nhất cho **mọi** loại node workflow:

```tsx
const nodeTypes = { automationNode: AutomationNode }
<ReactFlow nodeTypes={nodeTypes} ... />
```

`AutomationNode` là 1 component React chung, tự đổi icon/màu/label theo `data.nodeType` (tra cứu `NodeDefinition` tương ứng ở [`node-definitions.ts`](../architecture/05-workflow-engine.md)) — không tạo 54 component React riêng cho 54 loại node. Thêm 1 loại node workflow mới **không cần** đụng tới `VisualEditor.tsx`, chỉ cần thêm vào `NODE_DEFINITIONS` (xem [development/01-bat-dau.md](../development/01-bat-dau.md)).

## `NodePropertiesPanel` — sinh form từ `configSchema`, không viết tay form riêng cho từng node

```tsx
{(definition?.configSchema || []).map((field) => (
  field.type === 'text' || field.type === 'selector' ? <input type="text" .../>
  : field.type === 'number' ? <input type="number" .../>
  : field.type === 'select' ? <select>{field.options.map(...)}</select>
  : field.type === 'boolean' ? <input type="checkbox" .../>
  : field.type === 'keyrecorder' ? <KeyRecorderInput .../>
  : ...
))}
```

1 vòng `map` qua `configSchema` của node đang chọn, switch theo `field.type` ra đúng input control — đây là lý do `ConfigField` (ở `shared/types.ts`) tồn tại như 1 "mini schema language" riêng thay vì để mỗi node tự viết JSX form riêng: thêm 1 field cấu hình mới cho 1 node chỉ cần thêm 1 object vào mảng `configSchema`, không viết thêm JSX nào ở `NodePropertiesPanel.tsx`.

`selector` dùng chung input giống `text` (cả 2 chỉ là 1 ô nhập chuỗi) — tách riêng type `selector` không phải vì render khác, mà để **phân biệt ý nghĩa dữ liệu** (dành chỗ cho tính năng sau này: ví dụ nút "chọn phần tử trên trang" ghi thẳng CSS selector vào field kiểu này, chưa cần đổi UI render ngay bây giờ).

## 1 node kéo-thả → 1 object `WorkflowNode`, đồng bộ 2 chiều với `workflow-store`

Kéo-thả trên canvas (di chuyển, nối edge, xoá) gọi `updateNodes`/`updateEdges` ở `workflow-store.ts` — canvas không tự giữ state riêng tách biệt khỏi store, nên panel properties/log/minimap luôn thấy đúng state hiện tại không cần đồng bộ thủ công giữa nhiều nơi.
