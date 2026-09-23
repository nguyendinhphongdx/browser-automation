import { useEffect, useState, type ReactNode } from 'react'
import {
  Globe,
  Users,
  Workflow,
  Database,
  ShoppingBag,
  ChevronRight,
  ChevronLeft,
  Rocket,
  Fingerprint,
  Mail,
  KeyRound,
  Cookie,
  Star,
  Play,
  Check,
  X,
  type LucideIcon
} from 'lucide-react'

// ── Decorative primitives ──────────────────────────────────────────
// Every illustration below is built from layout + Lucide icons rather than
// bundled/hotlinked images, so onboarding never depends on network access.

function FloatingCard({
  children,
  className = ''
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/40 backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  )
}

function GhostCard({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`absolute rounded-2xl border border-white/5 bg-white/[0.03] ${className}`}
    />
  )
}

function WelcomeVisual() {
  return (
    <div className="relative flex h-64 w-72 items-center justify-center">
      <GhostCard className="h-48 w-60 rotate-[-8deg] top-6 left-2" />
      <GhostCard className="h-48 w-60 rotate-[7deg] top-4 right-0" />
      <FloatingCard className="relative w-64">
        <div className="mb-4 flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <div className="ml-2 h-5 flex-1 rounded-full bg-white/10" />
        </div>
        <div className="flex h-28 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/5">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-primary/40 bg-primary/20">
            <Globe className="h-8 w-8 text-white" strokeWidth={1.75} />
            <span className="absolute -inset-3 rounded-full border border-dashed border-white/20" />
          </div>
        </div>
        <p className="mt-4 text-center text-xs font-medium text-white/50">browserauto.app</p>
      </FloatingCard>
    </div>
  )
}

function ProfilesVisual() {
  const rings = ['border-sky-400', 'border-emerald-400', 'border-amber-400', 'border-fuchsia-400']
  return (
    <FloatingCard className="w-72">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-medium text-white/60">Browser Profiles</span>
        <span className="flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />4 active
        </span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {rings.map((ring, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <div className={`flex h-11 w-11 items-center justify-center rounded-full border-2 ${ring} bg-white/10`}>
              <Fingerprint className="h-5 w-5 text-white/80" strokeWidth={1.75} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-[11px] text-white/50">
        <Users className="h-3.5 w-3.5" />
        Chrome · Brave · Edge · Firefox
      </div>
    </FloatingCard>
  )
}

function AutomationVisual() {
  return (
    <FloatingCard className="w-72">
      <div className="mb-5 flex items-center justify-between">
        {[Play, Workflow, Check].map((Icon, i) => (
          <div key={i} className="flex items-center">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
                i === 1 ? 'border-primary/50 bg-primary/25' : 'border-white/15 bg-white/10'
              }`}
            >
              <Icon className="h-5 w-5 text-white" strokeWidth={1.75} />
            </div>
            {i < 2 && <div className="mx-1.5 h-px w-8 border-t border-dashed border-white/25" />}
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <div className="h-2 w-full rounded-full bg-white/10">
          <div className="h-2 w-2/3 rounded-full bg-primary" />
        </div>
        <p className="text-[11px] text-white/50">Đang chạy: Đăng nhập → Thu thập dữ liệu → Xuất file</p>
      </div>
    </FloatingCard>
  )
}

function ResourcesVisual() {
  const rows: Array<{ icon: LucideIcon; label: string }> = [
    { icon: KeyRound, label: 'Proxy pool' },
    { icon: Mail, label: 'Email inbox' },
    { icon: Cookie, label: 'Cookie vault' }
  ]
  return (
    <FloatingCard className="w-72">
      <div className="space-y-2.5">
        {rows.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
              <Icon className="h-4 w-4 text-white" strokeWidth={1.75} />
            </div>
            <span className="flex-1 text-xs text-white/70">{label}</span>
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          </div>
        ))}
      </div>
    </FloatingCard>
  )
}

function MarketplaceVisual() {
  return (
    <div className="grid w-72 grid-cols-2 gap-3">
      {[1, 2].map((i) => (
        <FloatingCard key={i} className="w-full">
          <div className="mb-3 flex h-16 items-center justify-center rounded-lg bg-gradient-to-br from-primary/30 to-transparent">
            <ShoppingBag className="h-6 w-6 text-white/80" strokeWidth={1.75} />
          </div>
          <div className="mb-2 h-2 w-4/5 rounded-full bg-white/15" />
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, s) => (
              <Star
                key={s}
                className={`h-3 w-3 ${s < 4 ? 'fill-amber-400 text-amber-400' : 'text-white/20'}`}
              />
            ))}
          </div>
        </FloatingCard>
      ))}
    </div>
  )
}

// ── Steps ───────────────────────────────────────────────────────────

interface StepDef {
  icon: LucideIcon
  eyebrow: string
  title: string
  description: string
  visual: ReactNode
}

const STEPS: StepDef[] = [
  {
    icon: Globe,
    eyebrow: 'Giới thiệu',
    title: 'Chào mừng đến BrowserAuto',
    description:
      'Nền tảng quản lý nhiều browser profile với fingerprint riêng biệt, xây dựng kịch bản automation và chia sẻ qua marketplace.',
    visual: <WelcomeVisual />
  },
  {
    icon: Users,
    eyebrow: 'Hồ sơ trình duyệt',
    title: 'Quản lý Profile',
    description:
      'Tạo nhiều browser profile với fingerprint khác nhau. Hỗ trợ Chrome, Brave, Edge, Firefox và nhiều trình duyệt khác.',
    visual: <ProfilesVisual />
  },
  {
    icon: Workflow,
    eyebrow: 'Tự động hoá',
    title: 'Automation Builder',
    description:
      'Xây dựng kịch bản tự động hoá bằng kéo thả hoặc viết code. Ghi lại thao tác trực tiếp trên browser.',
    visual: <AutomationVisual />
  },
  {
    icon: Database,
    eyebrow: 'Tài nguyên',
    title: 'Quản lý tài nguyên',
    description: 'Quản lý proxy, email, cookie tập trung. Gán cho từng profile một cách dễ dàng.',
    visual: <ResourcesVisual />
  },
  {
    icon: ShoppingBag,
    eyebrow: 'Marketplace',
    title: 'Marketplace',
    description: 'Chia sẻ kịch bản với cộng đồng. Mua bán và đánh giá các workflow automation.',
    visual: <MarketplaceVisual />
  }
]

interface Props {
  onComplete: () => void
}

export function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState(0)

  const isFirst = step === 0
  const isLast = step === STEPS.length - 1
  const current = STEPS[step]

  const goNext = () => (isLast ? onComplete() : setStep((s) => s + 1))
  const goBack = () => !isFirst && setStep((s) => s - 1)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') goNext()
      else if (e.key === 'ArrowLeft') goBack()
      else if (e.key === 'Escape') onComplete()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  return (
    <div className="fixed inset-0 z-50 flex bg-background">
      {/* Visual panel — intentionally always-dark for a premium, consistent
          hero regardless of the app's light/dark mode setting */}
      <div className="relative hidden w-[52%] items-center justify-center overflow-hidden bg-[#0a0f1e] lg:flex">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '36px 36px'
          }}
        />
        <div
          aria-hidden
          className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-primary/30 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl"
        />

        <div key={step} className="animate-onboarding-visual relative z-10">
          {current.visual}
        </div>

        {/* Brand mark */}
        <div className="absolute left-8 top-8 flex items-center gap-2 text-white/70">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/25">
            <Globe className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-tight">BrowserAuto</span>
        </div>
      </div>

      {/* Content panel */}
      <div className="relative flex w-full flex-col justify-center px-10 sm:px-16 lg:w-[48%] lg:px-20">
        <button
          onClick={onComplete}
          aria-label="Bỏ qua hướng dẫn"
          className="absolute right-6 top-6 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" />
        </button>

        <div key={step} className="animate-onboarding-content max-w-md">
          <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <current.icon className="h-5 w-5 text-primary" strokeWidth={1.75} />
          </div>

          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            {current.eyebrow}
          </span>
          <h2 className="mt-2 text-[28px] font-bold leading-tight tracking-tight">{current.title}</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">{current.description}</p>
        </div>

        {/* Progress */}
        <div className="mt-10 flex max-w-md gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                i <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Bước {step + 1}/{STEPS.length}
        </p>

        {/* Actions */}
        <div className="mt-7 flex max-w-md items-center gap-3">
          {!isFirst && (
            <button
              onClick={goBack}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <ChevronLeft className="h-4 w-4" />
              Quay lại
            </button>
          )}
          <button
            onClick={goNext}
            className="group inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {isLast ? (
              <>
                <Rocket className="h-4 w-4" />
                Bắt đầu sử dụng
              </>
            ) : (
              <>
                Tiếp theo
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>

          {!isLast && (
            <button
              onClick={onComplete}
              className="ml-1 cursor-pointer text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Bỏ qua
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
