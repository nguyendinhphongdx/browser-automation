import { useState, useEffect } from 'react'
import { Sun, Moon, Monitor, Globe, Info, Keyboard, Shield, Database, Copy, Check, Brain, Eye, EyeOff, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useThemeStore } from '@/stores/theme-store'
import { useI18n, type Locale } from '@/lib/i18n'
import { cn } from '@/lib/utils'

type Theme = 'light' | 'dark' | 'system'

const THEME_OPTIONS: { value: Theme; label: string; icon: any }[] = [
  { value: 'light', label: 'Sáng', icon: Sun },
  { value: 'dark', label: 'Tối', icon: Moon },
  { value: 'system', label: 'Hệ thống', icon: Monitor }
]

const SHORTCUTS = [
  { keys: ['Ctrl', 'N'], description: 'Tạo profile mới' },
  { keys: ['Ctrl', 'S'], description: 'Lưu workflow' },
  { keys: ['Ctrl', 'Shift', 'R'], description: 'Chạy workflow' },
  { keys: ['Ctrl', 'F'], description: 'Tìm kiếm' },
  { keys: ['Ctrl', ','], description: 'Mở cài đặt' },
  { keys: ['Delete'], description: 'Xoá node đã chọn' }
]

function SettingSection({ title, icon: Icon, children }: {
  title: string; icon: any; children: React.ReactNode
}) {
  return (
    <div className="border rounded-xl p-5 bg-card">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function DbPathRow() {
  const [dbPath, setDbPath] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    window.api.getDbPath?.().then(setDbPath).catch(() => {})
  }, [])

  const handleCopy = () => {
    navigator.clipboard.writeText(dbPath)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">Cơ sở dữ liệu</p>
        <p className="text-xs text-muted-foreground">SQLite lưu cục bộ với WAL mode</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <code className="text-[11px] text-muted-foreground bg-secondary px-2 py-1 rounded max-w-[300px] truncate block" title={dbPath}>
          {dbPath || 'browser-automation.db'}
        </code>
        <button
          onClick={handleCopy}
          className="p-1.5 rounded-md hover:bg-accent transition-colors"
          title="Copy đường dẫn"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
        </button>
      </div>
    </div>
  )
}

// ── AI Provider ────────────────────────────────────

type AIProvider = 'openai' | 'anthropic' | 'google' | 'groq' | 'ollama' | 'custom'

interface AIProviderOption {
  value: AIProvider
  label: string
  description: string
  placeholder: string
  docsUrl: string
  models: string[]
}

const AI_PROVIDERS: AIProviderOption[] = [
  {
    value: 'openai',
    label: 'OpenAI',
    description: 'GPT-4o, GPT-4o-mini, o1, o3',
    placeholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    models: ['gpt-4o', 'gpt-4o-mini', 'o1', 'o3-mini']
  },
  {
    value: 'anthropic',
    label: 'Anthropic',
    description: 'Claude Sonnet 4, Claude Opus 4',
    placeholder: 'sk-ant-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    models: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-haiku-4-20250514']
  },
  {
    value: 'google',
    label: 'Google AI',
    description: 'Gemini 2.5 Pro, Gemini 2.5 Flash',
    placeholder: 'AIza...',
    docsUrl: 'https://aistudio.google.com/apikey',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash']
  },
  {
    value: 'groq',
    label: 'Groq',
    description: 'Llama 3, Mixtral (nhanh, miễn phí tier)',
    placeholder: 'gsk_...',
    docsUrl: 'https://console.groq.com/keys',
    models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768']
  },
  {
    value: 'ollama',
    label: 'Ollama (Local)',
    description: 'Chạy AI cục bộ, không cần API key',
    placeholder: 'http://localhost:11434',
    docsUrl: 'https://ollama.com',
    models: ['llama3.1', 'mistral', 'codestral', 'qwen2.5']
  },
  {
    value: 'custom',
    label: 'Tuỳ chỉnh',
    description: 'OpenAI-compatible API endpoint',
    placeholder: 'https://api.example.com/v1',
    docsUrl: '',
    models: []
  }
]

function AIProviderSection() {
  const [provider, setProvider] = useState<AIProvider>('openai')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [model, setModel] = useState('')
  const [customModel, setCustomModel] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [saved, setSaved] = useState(false)

  // Load saved settings
  useEffect(() => {
    Promise.all([
      window.api.getSetting('ai.provider'),
      window.api.getSetting('ai.apiKey'),
      window.api.getSetting('ai.baseUrl'),
      window.api.getSetting('ai.model'),
    ]).then(([p, k, u, m]) => {
      if (p) setProvider(p as AIProvider)
      if (k) setApiKey(k)
      if (u) setBaseUrl(u)
      if (m) setModel(m)
    }).catch(() => {})
  }, [])

  const currentProvider = AI_PROVIDERS.find(p => p.value === provider)!
  const needsApiKey = provider !== 'ollama'
  const needsBaseUrl = provider === 'ollama' || provider === 'custom'

  const handleSave = async () => {
    await window.api.setSettingsBatch({
      'ai.provider': provider,
      'ai.apiKey': apiKey,
      'ai.baseUrl': baseUrl,
      'ai.model': model || customModel,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      // Gửi test request tới provider
      let url = ''
      let headers: Record<string, string> = { 'Content-Type': 'application/json' }
      let body = ''

      if (provider === 'ollama') {
        url = (baseUrl || 'http://localhost:11434') + '/api/tags'
        const res = await fetch(url)
        setTestResult(res.ok ? 'success' : 'error')
      } else if (provider === 'anthropic') {
        // Anthropic: gọi messages API với max_tokens nhỏ
        url = 'https://api.anthropic.com/v1/messages'
        headers['x-api-key'] = apiKey
        headers['anthropic-version'] = '2023-06-01'
        headers['anthropic-dangerous-direct-browser-access'] = 'true'
        body = JSON.stringify({
          model: model || 'claude-sonnet-4-20250514',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }]
        })
        const res = await fetch(url, { method: 'POST', headers, body })
        setTestResult(res.ok || res.status === 200 ? 'success' : 'error')
      } else {
        // OpenAI-compatible (OpenAI, Groq, Google, Custom)
        const base = baseUrl || (
          provider === 'google' ? 'https://generativelanguage.googleapis.com/v1beta/openai' :
          provider === 'groq' ? 'https://api.groq.com/openai' :
          'https://api.openai.com'
        )
        url = `${base}/v1/models`
        headers['Authorization'] = `Bearer ${apiKey}`
        const res = await fetch(url, { headers })
        setTestResult(res.ok ? 'success' : 'error')
      }
    } catch {
      setTestResult('error')
    } finally {
      setTesting(false)
    }
  }

  const maskedKey = apiKey
    ? apiKey.slice(0, 7) + '•'.repeat(Math.max(0, apiKey.length - 11)) + apiKey.slice(-4)
    : ''

  return (
    <div className="space-y-4">
      {/* Provider selection */}
      <div>
        <label className="block text-xs font-medium mb-2">Provider</label>
        <div className="grid grid-cols-3 gap-2">
          {AI_PROVIDERS.map(opt => (
            <button
              key={opt.value}
              onClick={() => {
                setProvider(opt.value)
                setModel('')
                setTestResult(null)
              }}
              className={cn(
                'flex flex-col items-start p-3 rounded-lg border text-left transition-colors',
                provider === opt.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-accent'
              )}
            >
              <span className="text-xs font-semibold">{opt.label}</span>
              <span className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{opt.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* API Key */}
      {needsApiKey && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium">API Key</label>
            {currentProvider.docsUrl && (
              <a
                href={currentProvider.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-primary hover:underline"
              >
                Lấy API key
              </a>
            )}
          </div>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={showKey ? apiKey : maskedKey}
              onChange={e => { setApiKey(e.target.value); setTestResult(null) }}
              onFocus={() => setShowKey(true)}
              placeholder={currentProvider.placeholder}
              className="w-full px-3 py-2 pr-10 border rounded-lg bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => setShowKey(v => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      )}

      {/* Base URL (Ollama / Custom) */}
      {needsBaseUrl && (
        <div>
          <label className="block text-xs font-medium mb-1.5">
            {provider === 'ollama' ? 'Ollama URL' : 'Base URL'}
          </label>
          <input
            type="url"
            value={baseUrl}
            onChange={e => { setBaseUrl(e.target.value); setTestResult(null) }}
            placeholder={currentProvider.placeholder}
            className="w-full px-3 py-2 border rounded-lg bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      {/* Model selection */}
      <div>
        <label className="block text-xs font-medium mb-1.5">Model</label>
        {currentProvider.models.length > 0 ? (
          <div className="space-y-2">
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Chọn model...</option>
              {currentProvider.models.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <input
              type="text"
              value={customModel}
              onChange={e => setCustomModel(e.target.value)}
              placeholder="Hoặc nhập tên model khác..."
              className="w-full px-3 py-2 border rounded-lg bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        ) : (
          <input
            type="text"
            value={customModel}
            onChange={e => setCustomModel(e.target.value)}
            placeholder="Nhập tên model..."
            className="w-full px-3 py-2 border rounded-lg bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          />
        )}
      </div>

      {/* Test + Save */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleTest}
          disabled={testing || (!apiKey && needsApiKey)}
          className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-medium hover:bg-accent transition-colors disabled:opacity-50"
        >
          {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Brain className="h-3 w-3" />}
          Kiểm tra kết nối
        </button>
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          {saved ? <Check className="h-3 w-3" /> : null}
          {saved ? 'Đã lưu!' : 'Lưu cài đặt'}
        </button>

        {testResult === 'success' && (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle className="h-3.5 w-3.5" />
            Kết nối thành công
          </span>
        )}
        {testResult === 'error' && (
          <span className="flex items-center gap-1 text-xs text-destructive">
            <XCircle className="h-3.5 w-3.5" />
            Không thể kết nối
          </span>
        )}
      </div>

      {/* Hint */}
      <div className="text-[10px] text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2 leading-relaxed">
        API key được mã hoá và lưu cục bộ. Các tính năng AI sẽ bao gồm: tự động tạo kịch bản từ mô tả, gợi ý selector, phân tích lỗi, tối ưu workflow, và chat assistant trong automation builder.
      </div>
    </div>
  )
}

export function SettingsPage() {
  const { theme, setTheme } = useThemeStore()
  const { locale, setLocale } = useI18n()

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Cài đặt</h1>
        <p className="text-sm text-muted-foreground mt-1">Tuỳ chỉnh ứng dụng</p>
      </div>

      <div className="space-y-4">
        {/* Theme */}
        <SettingSection title="Giao diện" icon={Sun}>
          <div className="grid grid-cols-3 gap-3">
            {THEME_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setTheme(opt.value)}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-lg border text-sm font-medium transition-colors',
                  theme === opt.value
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:bg-accent'
                )}>
                <opt.icon className="h-5 w-5" />
                {opt.label}
              </button>
            ))}
          </div>
        </SettingSection>

        {/* Language */}
        <SettingSection title="Ngôn ngữ" icon={Globe}>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setLocale('vi')}
              className={cn('flex items-center gap-3 p-3 rounded-lg border text-sm font-medium transition-colors',
                locale === 'vi' ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-accent text-muted-foreground')}>
              <span className="text-lg">🇻🇳</span> Tiếng Việt
            </button>
            <button onClick={() => setLocale('en')}
              className={cn('flex items-center gap-3 p-3 rounded-lg border text-sm font-medium transition-colors',
                locale === 'en' ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-accent text-muted-foreground')}>
              <span className="text-lg">🇺🇸</span> English
            </button>
          </div>
        </SettingSection>

        {/* AI Provider */}
        <SettingSection title="AI Provider" icon={Brain}>
          <AIProviderSection />
        </SettingSection>

        {/* Keyboard shortcuts */}
        <SettingSection title="Phím tắt" icon={Keyboard}>
          <div className="space-y-2">
            {SHORTCUTS.map((shortcut, i) => (
              <div key={i} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key, j) => (
                    <span key={j}>
                      <kbd className="px-2 py-1 bg-secondary rounded text-xs font-mono font-medium">{key}</kbd>
                      {j < shortcut.keys.length - 1 && <span className="text-muted-foreground mx-0.5">+</span>}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SettingSection>

        {/* Data */}
        <SettingSection title="Dữ liệu" icon={Database}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Mã hoá dữ liệu</p>
                <p className="text-xs text-muted-foreground">Mật khẩu proxy và email được mã hoá AES-256-GCM</p>
              </div>
              <div className="flex items-center gap-1.5 text-green-600">
                <Shield className="h-4 w-4" />
                <span className="text-xs font-medium">Đang bật</span>
              </div>
            </div>
            <DbPathRow />
          </div>
        </SettingSection>

        {/* About */}
        <SettingSection title="Thông tin" icon={Info}>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phiên bản</span>
              <span className="font-medium">0.2.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Framework</span>
              <span>Electron + React + TypeScript</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Browser Engine</span>
              <span>Playwright Core</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Database</span>
              <span>SQLite (better-sqlite3)</span>
            </div>
          </div>
        </SettingSection>
      </div>
    </div>
  )
}
