# Renderer — layering đích

[← Về mục lục](../README.md) · [← 00-tong-quan](00-tong-quan.md)

## Cây thư mục đích — bắt buộc cho code mới

Mọi trang/component mới viết trong `renderer/` từ nay **PHẢI** theo đúng cây dưới đây.

```
renderer/
├── pages/<feature>/      chỉ feature đó dùng — page = container, gọi store, bố cục layout
│   ├── <Feature>Page.tsx
│   ├── <Feature>Canvas.tsx / list / form...   (component CHỈ feature này cần)
│   └── agent/             (nếu feature có AI agent panel riêng — xem automation/agent/, video-studio/agent/)
│
├── components/            DÙNG CHUNG ≥ 2 feature — KHÔNG BAO GIỜ import từ pages/
│   ├── Layout.tsx, VirtualizedList.tsx, KeyRecorderInput.tsx   (generic, feature-agnostic)
│   ├── ai-elements/        Conversation, Message, ToolCallCard... — mọi *AgentChatPanel dùng chung
│   └── library/            LibraryGridCard... — page Library VÀ mọi nơi cần "chọn resource" (vd Video Studio)
│
├── stores/                 1 file = 1 domain, state + action gọi window.api — KHÔNG chứa JSX
│   └── <domain>-store.ts
│
└── (preload bridge)        window.api — xem 04-window-api-contract.md
```

## Rule cốt lõi: `pages/` → `components/`, không bao giờ ngược lại

`pages/<feature>/` được import từ `components/`. `components/` **không bao giờ** import từ `pages/` — nếu 1 component trong `components/` cần thứ gì đó, thứ đó phải tự nó cũng nằm trong `components/` (hoặc `hooks/`/`lib/`), không "mượn tạm" từ 1 `pages/` nào.

**Lỗi thật đã xảy ra, dùng làm ví dụ không lặp lại**: `LibraryGridCard` ban đầu đặt trong `pages/library/` (nhìn hợp lý — nó hiển thị resource của trang Library). Nhưng Video Studio cần dùng lại đúng component đó để chọn ảnh tham chiếu nhân vật → `components/library/ResourcePicker.tsx` phải import ngược từ `pages/library/`. Phát hiện lúc tự review, sửa bằng `git mv pages/library/LibraryGridCard.tsx components/library/`. Cách nhận biết sớm: **nếu 1 component có khả năng được dùng ở ≥ 2 feature (kể cả chỉ "có khả năng", chưa cần dùng thật ngay) → đặt thẳng vào `components/<domain>/` từ đầu**, không đợi phát hiện lỗi mới `git mv`.

## Pattern

**Observer** — `window.api.on(channel, callback)` trả về hàm unsubscribe; mỗi page/component tự subscribe/cleanup bằng `useEffect`, không có 1 "event bus" tập trung nào khác. Zustand store cũng là 1 dạng Observer nội bộ React (`useXStore()` tự re-render khi slice liên quan đổi).

**Two-gate validation (nửa renderer)** — `apply-*-patch.ts` trong `pages/<feature>/agent/` là lớp validate THỨ 2 (xem [01-main-process-layering.md](01-main-process-layering.md)), đặt trong `pages/` vì chỉ feature đó cần, không phải `components/` hay `stores/`.

## Đọc tiếp

- [03-domain-boundaries.md](03-domain-boundaries.md)
- [04-window-api-contract.md](04-window-api-contract.md)
