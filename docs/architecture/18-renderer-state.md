# Renderer state

[← Về mục lục](../README.md)

`apps/desktop/src/renderer/stores/` — 7 store **Zustand**, không dùng Redux/Context cho state toàn cục. Mỗi store ứng với 1 domain, không có store "tổng" gộp hết:

```
profile-store.ts    — profiles, installedBrowsers, runningProfiles
workflow-store.ts   — activeWorkflow, logs, nodeProgress real-time
campaign-store.ts   — activeCampaign, profileResults
resource-store.ts   — proxies, emails, cookies
auth-store.ts       — user, isLoggedIn, deep-link listener
settings-store.ts   — key-value settings cache phía renderer
theme-store.ts       — light/dark/system
```

## Quy ước chung — action tự gọi IPC, component không gọi `window.api` trực tiếp

```ts
// store action
createProfile: async (data) => {
  const profile = await window.api.createProfile(data)
  await get().fetchProfiles()   // tự refetch để đồng bộ list, không tự chèn thủ công
  return profile
}

// component
const { createProfile } = useProfileStore()
await createProfile(data)
```

Component gọi action của store, không tự `window.api.xxx()` rồi tự `setState` — giữ 1 nơi duy nhất biết "sau khi tạo profile thì phải làm gì tiếp" (refetch list), tránh mỗi component tự suy diễn khác nhau.

## Store nào subscribe push channel thì tự quản lý vòng đời

`workflow-store.ts`'s `runWorkflow()` tự `window.api.on('workflow:node-progress', ...)` rồi tự gỡ (`unsubscribe()`) trong `finally` — không rò rỉ ra ngoài store, component dùng store không cần biết có push channel nào đang chạy ngầm. Pattern on/off (và lý do dùng closure trả về thay vì gọi `off()` riêng) chi tiết ở [03-ipc.md](03-ipc.md).

## Vì sao không gộp 7 store thành 1

Mỗi store độc lập — re-render của component chỉ phụ thuộc store nó thật sự dùng (Zustand chỉ re-render khi phần state đã subscribe đổi). Gộp hết vào 1 store lớn sẽ khiến nhiều component re-render oan khi 1 phần không liên quan của state đổi (ví dụ sửa theme làm re-render luôn cả danh sách profile).
