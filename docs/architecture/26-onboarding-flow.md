# Onboarding

[← Về mục lục](../README.md)

`App.tsx` quyết định hiện `Onboarding` hay app thật, dựa trên **đúng 1 setting** đọc qua `settings-service.ts` (cùng cơ chế KV ở [21-service-layer-pattern.md](21-service-layer-pattern.md)):

```tsx
useEffect(() => {
  window.api.getSetting('onboarding.completed').then((val) => {
    if (!val) setShowOnboarding(true)
  })
}, [])

const handleOnboardingComplete = () => {
  window.api.setSetting('onboarding.completed', 'true')
  setShowOnboarding(false)
}

if (showOnboarding) return <Onboarding onComplete={handleOnboardingComplete} />
```

Không có bảng/cột riêng cho trạng thái onboarding — chỉ 1 key `onboarding.completed` trong bảng `settings` chung. Lưu ở SQLite (không phải `localStorage`) nên onboarding không hiện lại nếu người dùng xoá dữ liệu trình duyệt renderer nhưng vẫn giữ database app — nhất quán với chỗ lưu mọi cấu hình khác.

## Component `Onboarding` — tự quản lý step nội bộ, không qua router

```tsx
const STEPS: StepDef[] = [ ... ]
const [step, setStep] = useState(0)
const current = STEPS[step]
const isFirst = step === 0
const isLast = step === STEPS.length - 1
```

Đi qua từng bước bằng state cục bộ trong chính component (không phải route `/onboarding/1`, `/onboarding/2`) — hợp lý vì onboarding là 1 luồng tuyến tính khép kín, không cần deep-link vào giữa chừng hay back/forward của trình duyệt (vốn không áp dụng ý nghĩa gì trong 1 app desktop single-window). `onComplete` chỉ gọi đúng 1 lần ở bước cuối — không có cách "bỏ qua" lưu từng phần nếu đóng app giữa chừng (mở lại sẽ thấy lại từ bước 1, không nhớ đã đi tới đâu).
