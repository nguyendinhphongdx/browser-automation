import Link from "next/link";
import {
  Globe,
  Shield,
  Workflow,
  Store,
  Monitor,
  Fingerprint,
  Check,
  ArrowRight,
  Compass,
  Zap,
  Code,
  MousePointerClick,
  Lock,
  Download,
  Terminal,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* ─── Header ─────────────────────────────────────────────── */

function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-14 items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5 font-semibold text-base">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Globe className="h-4 w-4" />
          </div>
          <span>BrowserAuto</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            How it works
          </a>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Pricing
          </a>
          <a href="#download" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Download
          </a>
          <a href="#guide" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Guide
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" render={<Link href="/login" />}>
            Log in
          </Button>
          <Button size="sm" render={<Link href="/signup" />}>
            Get Started
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </header>
  );
}

/* ─── Hero ────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Glow background */}
      <div className="absolute inset-0 glow pointer-events-none" />

      <div className="relative container mx-auto flex flex-col items-center px-6 pt-28 pb-20 text-center">
        <Badge
          variant="outline"
          className="mb-8 gap-1.5 border-border/60 px-3 py-1 text-xs font-medium"
        >
          <Zap className="h-3 w-3" />
          Now in Open Beta
        </Badge>

        <h1 className="max-w-4xl text-5xl font-bold tracking-tight leading-[1.1] sm:text-6xl lg:text-7xl">
          The browser that{" "}
          <span className="gradient-text">actually automates</span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
          Manage hundreds of browser profiles with unique fingerprints.
          Build automation with drag-and-drop or code.
          Share and monetize scripts on our marketplace.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-3">
          <Button size="lg" render={<a href="#download" />}>
            <Download className="mr-2 h-4 w-4" />
            Download for Free
          </Button>
          <Button size="lg" variant="outline" render={<a href="#features" />}>
            See how it works
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-16 flex flex-wrap justify-center gap-x-12 gap-y-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Multi-browser support
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            AES-256 encryption
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Free to get started
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Supported Browsers ─────────────────────────────────── */

const browsers = [
  { name: "Chrome", desc: "Most popular" },
  { name: "Brave", desc: "Built-in ad block" },
  { name: "Edge", desc: "Chromium-based" },
  { name: "Firefox", desc: "Gecko engine" },
  { name: "Opera", desc: "Built-in VPN" },
  { name: "Vivaldi", desc: "Customizable" },
  { name: "Chromium", desc: "Lightweight" },
  { name: "Custom", desc: "Any executable" },
];

function Browsers() {
  return (
    <section className="border-y border-border/50 bg-muted/30">
      <div className="container mx-auto px-6 py-10">
        <p className="text-center text-sm text-muted-foreground mb-6">
          Works with every browser you already use
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          {browsers.map((b) => (
            <div
              key={b.name}
              className="flex items-center gap-2.5 rounded-full border border-border/60 bg-card/50 px-4 py-2 text-sm"
            >
              <Compass className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{b.name}</span>
              <span className="text-xs text-muted-foreground">{b.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Features ────────────────────────────────────────────── */

const features = [
  {
    icon: Fingerprint,
    title: "Anti-Detect Profiles",
    description:
      "Unique fingerprints per profile — canvas, WebGL, audio, fonts, timezone, navigator. Each profile is a completely separate digital identity.",
  },
  {
    icon: Monitor,
    title: "Multi-Browser Engine",
    description:
      "Chrome, Brave, Edge, Firefox, Opera, Vivaldi, or any custom browser. Auto-detect installed browsers on your system.",
  },
  {
    icon: Workflow,
    title: "Visual Automation Builder",
    description:
      "Drag-and-drop workflow editor like n8n. Connect nodes, build complex flows, debug step by step. No coding required.",
  },
  {
    icon: Code,
    title: "Code Editor with IntelliSense",
    description:
      "Full Monaco Editor with TypeScript support and auto-complete for our API. Write powerful scripts with confidence.",
  },
  {
    icon: Store,
    title: "Script Marketplace",
    description:
      "Browse, buy, and sell automation scripts. Earn 70% revenue share as a creator. One-click install for buyers.",
  },
  {
    icon: Lock,
    title: "AES-256 Encrypted Vault",
    description:
      "Proxies, passwords, cookies, API keys — everything is encrypted locally. Zero plaintext. Zero compromise.",
  },
];

function Features() {
  return (
    <section id="features" className="relative overflow-hidden">
      <div className="absolute inset-0 glow-orange pointer-events-none" />

      <div className="relative container mx-auto max-w-6xl px-6 py-28">
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            Features
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Everything you need.{" "}
            <span className="text-muted-foreground">Nothing you don&apos;t.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="card-hover group rounded-xl border border-border/50 bg-card/50 p-6"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <feature.icon className="h-5 w-5 text-foreground" />
              </div>
              <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── How It Works ────────────────────────────────────────── */

const steps = [
  {
    step: "01",
    icon: Download,
    title: "Download & Install",
    description:
      "Download BrowserAuto for your OS. Install in seconds. No account required to start.",
  },
  {
    step: "02",
    icon: Fingerprint,
    title: "Create Profiles",
    description:
      "Create browser profiles with unique fingerprints. Assign proxies, cookies, and resources to each one.",
  },
  {
    step: "03",
    icon: MousePointerClick,
    title: "Build Automation",
    description:
      "Use the visual builder or code editor to create automation scripts. Record your actions or start from templates.",
  },
  {
    step: "04",
    icon: Zap,
    title: "Run & Scale",
    description:
      "Run your scripts across multiple profiles simultaneously. Monitor execution, debug issues, share on marketplace.",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-border/50">
      <div className="container mx-auto max-w-5xl px-6 py-28">
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            How it works
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Up and running in minutes
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => (
            <div key={step.step} className="relative">
              <div className="text-5xl font-bold text-muted/50 mb-4 font-mono">
                {step.step}
              </div>
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <step.icon className="h-5 w-5 text-foreground" />
              </div>
              <h3 className="text-base font-semibold mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Quick Start ─────────────────────────────────────────── */

function QuickStart() {
  return (
    <section className="border-t border-border/50 bg-muted/30">
      <div className="container mx-auto max-w-3xl px-6 py-28 text-center">
        <div className="mb-8">
          <p className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            Quick Start
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            One command to get started
          </h2>
        </div>

        <div className="rounded-xl border border-border/50 bg-card p-1">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-mono">Terminal</span>
          </div>
          <div className="p-5 text-left font-mono text-sm">
            <div className="text-muted-foreground">
              <span className="text-emerald-400">$</span>{" "}
              <span className="text-foreground">
                curl -fsSL https://browserauto.dev/install | sh
              </span>
            </div>
            <div className="mt-3 text-muted-foreground">
              <span className="text-emerald-400">$</span>{" "}
              <span className="text-foreground">browserauto start</span>
            </div>
          </div>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Or download the desktop app directly from the{" "}
          <a href="#download" className="text-foreground underline underline-offset-4 hover:text-primary">
            downloads section
          </a>
          .
        </p>
      </div>
    </section>
  );
}

/* ─── Pricing ─────────────────────────────────────────────── */

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Get started with the basics",
    features: [
      "3 browser profiles",
      "Basic automation",
      "Community support",
      "Proxy management",
    ],
    cta: "Download Free",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "For power users and teams",
    features: [
      "Unlimited profiles",
      "Full automation builder",
      "Marketplace access",
      "Priority support",
      "Cloud sync",
      "Advanced fingerprinting",
    ],
    cta: "Start Pro Trial",
    highlighted: true,
  },
  {
    name: "Creator",
    price: "$49",
    period: "/month",
    description: "Build and sell scripts",
    features: [
      "Everything in Pro",
      "Publish to marketplace",
      "Revenue dashboard",
      "70% revenue share",
      "Script analytics",
      "Verified badge",
    ],
    cta: "Become a Creator",
    highlighted: false,
  },
];

function Pricing() {
  return (
    <section id="pricing" className="relative overflow-hidden border-t border-border/50">
      <div className="absolute inset-0 glow pointer-events-none" />

      <div className="relative container mx-auto max-w-5xl px-6 py-28">
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            Pricing
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Start free. Scale when ready.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`card-hover rounded-xl border p-6 ${
                plan.highlighted
                  ? "border-primary/50 bg-card shadow-[0_0_40px_-12px] shadow-primary/20"
                  : "border-border/50 bg-card/50"
              }`}
            >
              {plan.highlighted && (
                <Badge className="mb-4 gap-1">
                  <Star className="h-3 w-3" />
                  Most Popular
                </Badge>
              )}
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>

              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5 text-sm">
                    <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                className="w-full mt-8"
                variant={plan.highlighted ? "default" : "outline"}
                render={<a href="#download" />}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Download ────────────────────────────────────────────── */

function DownloadSection() {
  return (
    <section id="download" className="border-t border-border/50 bg-muted/30">
      <div className="container mx-auto max-w-3xl px-6 py-28 text-center">
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Globe className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          Ready to automate?
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Download BrowserAuto for free. Available on all platforms.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg">
            <Download className="mr-2 h-4 w-4" />
            Windows (.exe)
          </Button>
          <Button size="lg" variant="outline">
            macOS (.dmg)
          </Button>
          <Button size="lg" variant="outline">
            Linux (.AppImage)
          </Button>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          v0.1.0 Beta &middot; 64-bit required &middot; Free forever for basic usage
        </p>
      </div>
    </section>
  );
}

/* ─── Installation Guide ─────────────────────────────────── */

const installSteps = {
  windows: [
    "Tải file .exe từ mục Download ở trên",
    "Chạy file BrowserAuto-Setup.exe",
    'Nhấn "Next" → chọn thư mục cài → "Install"',
    "Mở BrowserAuto từ Desktop hoặc Start Menu",
    "Hoàn thành hướng dẫn chào mừng (5 bước)",
  ],
  macos: [
    "Tải file .dmg từ mục Download ở trên",
    "Mở file .dmg và kéo BrowserAuto vào thư mục Applications",
    'Lần đầu mở: chuột phải → "Open" để bỏ qua Gatekeeper',
    "Hoàn thành hướng dẫn chào mừng (5 bước)",
  ],
  linux: [
    "Tải file .AppImage hoặc .deb",
    "AppImage: chmod +x BrowserAuto.AppImage && ./BrowserAuto.AppImage",
    "Debian/Ubuntu: sudo dpkg -i BrowserAuto.deb",
    "Hoàn thành hướng dẫn chào mừng (5 bước)",
  ],
};

const requirements = [
  "Windows 10+, macOS 10.15+, hoặc Ubuntu 20.04+",
  "RAM tối thiểu 4GB (khuyến nghị 8GB)",
  "Ít nhất 1 trình duyệt đã cài (Chrome, Brave, Edge, Firefox...)",
  "Kết nối Internet (cho marketplace và cloud sync)",
];

function InstallationGuide() {
  return (
    <section id="guide" className="border-t border-border/50">
      <div className="container mx-auto max-w-5xl px-6 py-28">
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            Installation Guide
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Hướng dẫn cài đặt chi tiết
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            BrowserAuto hỗ trợ Windows, macOS và Linux. Cài đặt chỉ mất vài phút.
          </p>
        </div>

        {/* System Requirements */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-6 mb-8">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Monitor className="h-5 w-5 text-muted-foreground" />
            Yêu cầu hệ thống
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {requirements.map((req) => (
              <li key={req} className="flex items-start gap-2.5 text-sm">
                <Check className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">{req}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Platform tabs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(["windows", "macos", "linux"] as const).map((platform) => {
            const title = platform === "windows" ? "Windows" : platform === "macos" ? "macOS" : "Linux";
            const icon = platform === "windows" ? "💻" : platform === "macos" ? "🍎" : "🐧";
            return (
              <div key={platform} className="rounded-xl border border-border/50 bg-card/50 p-6">
                <h3 className="text-base font-semibold mb-4">
                  <span className="mr-2">{icon}</span>
                  {title}
                </h3>
                <ol className="space-y-3">
                  {installSteps[platform].map((step, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </div>

        {/* After install */}
        <div className="mt-8 rounded-xl border border-border/50 bg-card/50 p-6">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-muted-foreground" />
            Sau khi cài đặt
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { step: "1", title: "Tạo Profile", desc: "Chọn trình duyệt, fingerprint tự động tạo" },
              { step: "2", title: "Gán Proxy", desc: "Import proxy và gán cho từng profile" },
              { step: "3", title: "Xây dựng Automation", desc: "Kéo thả hoặc viết code kịch bản" },
              { step: "4", title: "Kết nối Server", desc: "Đăng nhập để sync dữ liệu lên cloud" },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold mb-2">
                  {item.step}
                </div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Documentation link */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Xem{" "}
            <a
              href="https://github.com/user/browser-automation/blob/master/docs/GUIDE.md"
              className="text-foreground underline underline-offset-4 hover:text-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              tài liệu hướng dẫn đầy đủ
            </a>{" "}
            để biết thêm chi tiết về tất cả tính năng.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ──────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="border-t border-border/50">
      <div className="container mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between gap-10">
          <div className="max-w-xs">
            <Link href="/" className="flex items-center gap-2.5 font-semibold text-base">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Globe className="h-4 w-4" />
              </div>
              BrowserAuto
            </Link>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Multi-browser profile management and automation platform.
              Built for power users.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-10 text-sm">
            <div>
              <h4 className="font-medium mb-3">Product</h4>
              <ul className="space-y-2.5 text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#download" className="hover:text-foreground transition-colors">Download</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Changelog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3">Resources</h4>
              <ul className="space-y-2.5 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Marketplace</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Community</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3">Legal</h4>
              <ul className="space-y-2.5 text-muted-foreground">
                <li><a href="/terms" className="hover:text-foreground transition-colors">Terms of Service</a></li>
                <li><a href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-border/50 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} BrowserAuto. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ────────────────────────────────────────────────── */

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <Browsers />
        <Features />
        <HowItWorks />
        <QuickStart />
        <Pricing />
        <DownloadSection />
        <InstallationGuide />
      </main>
      <Footer />
    </>
  );
}
