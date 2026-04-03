export type ProxyType = 'http' | 'https' | 'socks4' | 'socks5'
export type ProxyStatus = 'alive' | 'dead' | 'unknown'

/** Thông tin proxy */
export interface Proxy {
  id: string
  name: string
  type: ProxyType
  host: string
  port: number
  username?: string
  password?: string
  country?: string
  status: ProxyStatus
  speed?: number
  lastChecked?: string
  createdAt: string
}

export interface CreateProxyInput {
  name: string
  type: ProxyType
  host: string
  port: number
  username?: string
  password?: string
  country?: string
}

export interface UpdateProxyInput extends Partial<CreateProxyInput> {}
