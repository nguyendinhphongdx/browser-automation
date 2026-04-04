import { getSetting, setSetting, deleteSetting } from './settings-service'

interface ApiResponse<T = any> {
  ok: boolean
  status: number
  data: T | null
  error?: string
}

function getBaseUrl(): string {
  return getSetting('api.url') || 'http://localhost:3000'
}

function getTimeout(): number {
  return parseInt(getSetting('api.timeout') || '30000')
}

function getAuthToken(): string | null {
  return getSetting('auth.token')
}

let isRefreshing = false

export async function refreshToken(): Promise<boolean> {
  if (isRefreshing) return false
  isRefreshing = true
  try {
    const token = getAuthToken()
    if (!token) return false

    const baseUrl = getBaseUrl()
    const res = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    if (!res.ok) return false

    const data = await res.json()
    if (data.token) {
      setSetting('auth.token', data.token)
      return true
    }
    return false
  } catch {
    return false
  } finally {
    isRefreshing = false
  }
}

async function rawRequest<T = any>(
  method: string,
  path: string,
  body?: any,
  options?: { noAuth?: boolean }
): Promise<ApiResponse<T>> {
  const baseUrl = getBaseUrl()
  const url = `${baseUrl}${path.startsWith('/') ? path : '/' + path}`
  const timeout = getTimeout()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  if (!options?.noAuth) {
    const token = getAuthToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    })

    clearTimeout(timer)

    const contentType = response.headers.get('content-type')
    let data: any
    if (contentType?.includes('application/json')) {
      data = await response.json()
    } else {
      data = await response.text()
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
      error: response.ok ? undefined : (data?.message || data?.error || `HTTP ${response.status}`)
    }
  } catch (err: any) {
    clearTimeout(timer)

    if (err.name === 'AbortError') {
      return { ok: false, status: 0, data: null, error: 'Request timeout' }
    }
    return { ok: false, status: 0, data: null, error: err.message || 'Network error' }
  }
}

export async function apiRequest<T = any>(
  method: string,
  path: string,
  body?: any,
  options?: { noAuth?: boolean }
): Promise<ApiResponse<T>> {
  const res = await rawRequest<T>(method, path, body, options)

  // Auto-refresh: nếu 401 và không phải request auth → thử refresh rồi retry
  if (res.status === 401 && !options?.noAuth && !path.startsWith('/api/auth/')) {
    const refreshed = await refreshToken()
    if (refreshed) {
      return rawRequest<T>(method, path, body, options)
    }
  }

  return res
}

// ── Auth ──────────────────────────────────────────

export async function login(email: string, password: string): Promise<ApiResponse> {
  const res = await apiRequest('POST', '/api/auth/login', { email, password }, { noAuth: true })
  if (res.ok && res.data?.token) {
    setSetting('auth.token', res.data.token)
    if (res.data.refreshToken) setSetting('auth.refreshToken', res.data.refreshToken)
    if (res.data.user?.id) setSetting('auth.userId', res.data.user.id)
    if (res.data.user?.email) setSetting('auth.email', res.data.user.email)
    if (res.data.user?.name) setSetting('auth.name', res.data.user.name)
  }
  return res
}

export async function register(name: string, email: string, password: string): Promise<ApiResponse> {
  const res = await apiRequest('POST', '/api/auth/signup', { name, email, password }, { noAuth: true })
  if (res.ok && res.data?.token) {
    setSetting('auth.token', res.data.token)
    if (res.data.user?.id) setSetting('auth.userId', res.data.user.id)
    if (res.data.user?.email) setSetting('auth.email', res.data.user.email)
    if (res.data.user?.name) setSetting('auth.name', res.data.user.name)
  }
  return res
}

export function logout(): void {
  deleteSetting('auth.token')
  deleteSetting('auth.refreshToken')
  deleteSetting('auth.userId')
  deleteSetting('auth.email')
  deleteSetting('auth.name')
}

export async function checkAuth(): Promise<ApiResponse> {
  const token = getAuthToken()
  if (!token) return { ok: false, status: 0, data: null, error: 'No token' }
  return apiRequest('GET', '/api/auth/me')
}

export async function testConnection(): Promise<ApiResponse> {
  const baseUrl = getBaseUrl()
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(`${baseUrl}/api/health`, { signal: controller.signal })
    clearTimeout(timer)
    return { ok: res.ok, status: res.status, data: { connected: res.ok } }
  } catch (err: any) {
    return { ok: false, status: 0, data: null, error: err.message || 'Cannot connect' }
  }
}
