import { useState, useEffect } from 'react'
import { Globe, LogIn, UserPlus, Server, CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'

export function AuthPage() {
  const { login, register, openBrowserLogin, listenDeepLink, testConnection, setServerUrl, serverUrl, connected, loading } = useAuthStore()

  useEffect(() => {
    const cleanup = listenDeepLink()
    return cleanup
  }, [])
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [urlInput, setUrlInput] = useState(serverUrl)
  const [error, setError] = useState('')
  const [testing, setTesting] = useState(false)

  const handleTestConnection = async () => {
    setTesting(true)
    await setServerUrl(urlInput)
    await testConnection()
    setTesting(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      if (tab === 'login') {
        await login(email, password)
      } else {
        if (!name.trim()) {
          setError('Vui lòng nhập tên')
          return
        }
        await register(name.trim(), email, password)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="p-6 flex items-center justify-center min-h-full">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-primary/10 rounded-xl mb-3">
            <Globe className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">BrowserAuto</h1>
          <p className="text-sm text-muted-foreground mt-1">Kết nối với server để đồng bộ dữ liệu</p>
        </div>

        {/* Server URL */}
        <div className="border rounded-xl p-4 bg-card mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Server className="h-4 w-4 text-muted-foreground" />
            <label className="text-sm font-medium">Server URL</label>
          </div>
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="http://localhost:3000"
              className="flex-1 px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="px-3 py-2 border rounded-lg text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test'}
            </button>
          </div>
          {connected !== undefined && (
            <div className={cn('flex items-center gap-1.5 mt-2 text-xs',
              connected ? 'text-green-600' : 'text-destructive'
            )}>
              {connected ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
              {connected ? 'Đã kết nối thành công' : 'Không thể kết nối'}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b mb-4">
          <button
            onClick={() => { setTab('login'); setError('') }}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium border-b-2 transition-colors',
              tab === 'login' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            )}
          >
            <LogIn className="h-4 w-4" />
            Đăng nhập
          </button>
          <button
            onClick={() => { setTab('register'); setError('') }}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium border-b-2 transition-colors',
              tab === 'register' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            )}
          >
            <UserPlus className="h-4 w-4" />
            Đăng ký
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'register' && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Tên hiển thị</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
              className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {tab === 'login' ? 'Đang đăng nhập...' : 'Đang đăng ký...'}
              </span>
            ) : (
              tab === 'login' ? 'Đăng nhập' : 'Đăng ký'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">hoặc</span>
          </div>
        </div>

        {/* Browser login */}
        <button
          onClick={openBrowserLogin}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium hover:bg-accent transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          Đăng nhập bằng Browser
        </button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Mở trình duyệt để đăng nhập với Google, GitHub hoặc email
        </p>
      </div>
    </div>
  )
}
