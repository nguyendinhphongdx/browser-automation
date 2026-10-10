# `Window.api` — đích cho preload bridge

[← Về mục lục](../README.md) · [← 00-tong-quan](00-tong-quan.md)

Quyết định đầy đủ (kèm alternative đã thử-và-fail) ghi ở [ADR-0001](../adr/0001-window-api-composition.md) — file này chỉ nêu cây đích để code mới theo đúng ngay từ đầu.

## Hiện trạng (chưa đạt đích)

`renderer/stores/profile-store.ts` hiện giữ 1 block `declare global { interface Window { api: {...} } } }` duy nhất, liệt kê 95+ method của MỌI domain (Profile, Workflow, Campaign, AI Agent, Resource Library, Video Studio...). Code mới **không thêm tiếp** vào block này — xem đích dưới đây.

## Đích

Mỗi domain's store file tự export 1 interface `<Domain>API` cho riêng domain đó:

```ts
// renderer/stores/video-studio-store.ts
export interface VideoStudioAPI {
  getVideoPipelines: () => Promise<VideoPipeline[]>
  runVideoPipeline: (pipelineId: string) => Promise<{ runId: string; status: string; error?: string }>
  // ... chỉ method của domain này
}
```

1 file DUY NHẤT làm aggregator — `renderer/types/electron-api.ts` (file mới, không thuộc store nào cụ thể):

```ts
// renderer/types/electron-api.ts
import type { ProfileAPI } from '../stores/profile-store'
import type { WorkflowAPI } from '../stores/workflow-store'
import type { VideoStudioAPI } from '../stores/video-studio-store'
// ... import API interface của mọi domain

export type ElectronAPI = ProfileAPI & WorkflowAPI & VideoStudioAPI /* & ... */ & {
  on: (channel: string, callback: (...args: any[]) => void) => () => void
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}
```

Chỉ file này có `declare global` — không rải nhiều block `declare global { interface Window {...} } }` ở nhiều file (xem vì sao trong ADR-0001).

## Đọc tiếp

- [ADR-0001: Window.api composition](../adr/0001-window-api-composition.md)
