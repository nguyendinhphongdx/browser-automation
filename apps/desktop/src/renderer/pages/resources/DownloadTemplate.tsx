import { Download } from 'lucide-react'

interface TemplateConfig {
  filename: string
  content: string
  label?: string
}

const TEMPLATES: Record<string, TemplateConfig[]> = {
  proxy: [
    {
      filename: 'proxy-template.txt',
      label: 'TXT (host:port:user:pass)',
      content: `# Proxy Template — mỗi dòng 1 proxy
# Format: host:port hoặc host:port:username:password
# Ví dụ:
192.168.1.1:8080
proxy.example.com:3128:admin:password123
socks5://10.0.0.1:1080
http://user:pass@proxy.com:8888
`
    },
    {
      filename: 'proxy-template.csv',
      label: 'CSV',
      content: `name,type,host,port,username,password,country
Proxy VN 1,http,103.1.2.3,8080,user1,pass1,VN
Proxy US 1,socks5,proxy.us.com,1080,admin,secret,US
Proxy SG,http,sg-proxy.com,3128,,,SG
`
    }
  ],
  email: [
    {
      filename: 'email-template.csv',
      label: 'CSV',
      content: `email,password,recovery_email,phone,provider,notes
user1@gmail.com,MyPassword123,recovery@gmail.com,+84912345678,gmail,Tài khoản chính
user2@outlook.com,SecurePass456,,+84987654321,outlook,Tài khoản phụ
test@yahoo.com,Test789,,,yahoo,
`
    }
  ],
  cookie: [
    {
      filename: 'cookie-template.json',
      label: 'JSON (Netscape/EditThisCookie)',
      content: JSON.stringify([
        {
          name: "session_id",
          value: "abc123xyz",
          domain: ".example.com",
          path: "/",
          expires: 1735689600,
          httpOnly: true,
          secure: true,
          sameSite: "Lax"
        },
        {
          name: "user_token",
          value: "eyJhbGciOiJIUzI1NiJ9...",
          domain: ".example.com",
          path: "/",
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: "None"
        }
      ], null, 2)
    }
  ]
}

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function DownloadTemplate({ type }: { type: 'proxy' | 'email' | 'cookie' }) {
  const templates = TEMPLATES[type]
  if (!templates || templates.length === 0) return null

  if (templates.length === 1) {
    const t = templates[0]
    return (
      <button
        onClick={() => downloadFile(t.filename, t.content)}
        className="inline-flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm font-medium hover:bg-accent transition-colors text-muted-foreground"
        title={`Tải file mẫu ${t.filename}`}
      >
        <Download className="h-4 w-4" />
        Tải mẫu
      </button>
    )
  }

  return (
    <div className="relative group">
      <button
        className="inline-flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm font-medium hover:bg-accent transition-colors text-muted-foreground"
      >
        <Download className="h-4 w-4" />
        Tải mẫu
      </button>
      <div className="absolute top-full left-0 mt-1 bg-card border rounded-lg shadow-lg py-1 min-w-[180px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
        {templates.map(t => (
          <button
            key={t.filename}
            onClick={() => downloadFile(t.filename, t.content)}
            className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            {t.label || t.filename}
          </button>
        ))}
      </div>
    </div>
  )
}
