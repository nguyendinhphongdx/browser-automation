import { useState } from 'react'
import { Globe, Users, Play, Database, ShoppingBag, ChevronRight, Rocket } from 'lucide-react'

const STEPS = [
  {
    icon: Globe,
    title: 'Chào mừng đến BrowserAuto',
    description: 'Nền tảng quản lý nhiều browser profile với fingerprint riêng biệt, xây dựng kịch bản automation và chia sẻ qua marketplace.',
  },
  {
    icon: Users,
    title: 'Quản lý Profile',
    description: 'Tạo nhiều browser profile với fingerprint khác nhau. Hỗ trợ Chrome, Brave, Edge, Firefox và nhiều trình duyệt khác.',
  },
  {
    icon: Play,
    title: 'Automation Builder',
    description: 'Xây dựng kịch bản tự động hoá bằng kéo thả hoặc viết code. Ghi lại thao tác trực tiếp trên browser.',
  },
  {
    icon: Database,
    title: 'Quản lý tài nguyên',
    description: 'Quản lý proxy, email, cookie tập trung. Gán cho từng profile một cách dễ dàng.',
  },
  {
    icon: ShoppingBag,
    title: 'Marketplace',
    description: 'Chia sẻ kịch bản với cộng đồng. Mua bán và đánh giá các workflow automation.',
  },
]

interface Props {
  onComplete: () => void
}

export function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState(0)

  const isLast = step === STEPS.length - 1
  const current = STEPS[step]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="w-full max-w-lg text-center px-8">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-primary/10 rounded-2xl">
            <current.icon className="h-12 w-12 text-primary" />
          </div>
        </div>

        {/* Content */}
        <h2 className="text-2xl font-bold mb-3">{current.title}</h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">{current.description}</p>

        {/* Dots */}
        <div className="flex justify-center gap-2 mb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === step ? 'w-8 bg-primary' : 'w-2 bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-6 py-2.5 border rounded-lg text-sm font-medium hover:bg-accent transition-colors"
            >
              Quay lại
            </button>
          )}
          <button
            onClick={() => {
              if (isLast) {
                onComplete()
              } else {
                setStep(step + 1)
              }
            }}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {isLast ? (
              <>
                <Rocket className="h-4 w-4" />
                Bắt đầu sử dụng
              </>
            ) : (
              <>
                Tiếp theo
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>

        {/* Skip */}
        {!isLast && (
          <button
            onClick={onComplete}
            className="mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Bỏ qua hướng dẫn
          </button>
        )}
      </div>
    </div>
  )
}
