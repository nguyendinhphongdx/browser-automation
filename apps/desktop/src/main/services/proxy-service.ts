import { v4 as uuid } from 'uuid'
import { getDatabase } from '../database/init'
import { encrypt, decrypt } from './encryption'
import type { Proxy, CreateProxyInput, UpdateProxyInput } from '../../shared/types'

function rowToProxy(row: any): Proxy {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    host: row.host,
    port: row.port,
    username: row.username ? decrypt(row.username) : undefined,
    password: row.password ? decrypt(row.password) : undefined,
    country: row.country || undefined,
    status: row.status || 'unknown',
    speed: row.speed || undefined,
    lastChecked: row.last_checked || undefined,
    createdAt: row.created_at
  }
}

export function getAllProxies(): Proxy[] {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM proxies ORDER BY created_at DESC').all()
  return rows.map(rowToProxy)
}

export function getProxyById(id: string): Proxy | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM proxies WHERE id = ?').get(id)
  return row ? rowToProxy(row) : null
}

export function createProxy(input: CreateProxyInput): Proxy {
  const db = getDatabase()
  const id = uuid()
  const now = new Date().toISOString()

  db.prepare(`
    INSERT INTO proxies (id, name, type, host, port, username, password, country, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, input.name, input.type, input.host, input.port,
    input.username ? encrypt(input.username) : null,
    input.password ? encrypt(input.password) : null,
    input.country || null, now)

  return getProxyById(id)!
}

export function updateProxy(id: string, input: UpdateProxyInput): Proxy | null {
  const db = getDatabase()
  const existing = getProxyById(id)
  if (!existing) return null

  db.prepare(`
    UPDATE proxies SET
      name = ?, type = ?, host = ?, port = ?, username = ?, password = ?, country = ?
    WHERE id = ?
  `).run(
    input.name ?? existing.name,
    input.type ?? existing.type,
    input.host ?? existing.host,
    input.port ?? existing.port,
    input.username !== undefined ? (input.username ? encrypt(input.username) : null) : (existing.username ? encrypt(existing.username) : null),
    input.password !== undefined ? (input.password ? encrypt(input.password) : null) : (existing.password ? encrypt(existing.password) : null),
    input.country !== undefined ? input.country : existing.country ?? null,
    id
  )

  return getProxyById(id)
}

export function deleteProxy(id: string): boolean {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM proxies WHERE id = ?').run(id)
  return result.changes > 0
}

export function importProxies(lines: string[], defaultType: Proxy['type'] = 'http'): Proxy[] {
  const results: Proxy[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    // Formats: host:port, host:port:user:pass, type://user:pass@host:port
    let host: string, port: number, username: string | undefined, password: string | undefined
    let type: Proxy['type'] = defaultType

    const urlMatch = trimmed.match(/^(https?|socks[45]):\/\/(?:([^:]+):([^@]+)@)?([^:]+):(\d+)$/)
    if (urlMatch) {
      type = urlMatch[1] as Proxy['type']
      username = urlMatch[2]
      password = urlMatch[3]
      host = urlMatch[4]
      port = parseInt(urlMatch[5])
    } else {
      const parts = trimmed.split(':')
      if (parts.length < 2) continue
      host = parts[0]
      port = parseInt(parts[1])
      if (parts.length >= 4) {
        username = parts[2]
        password = parts[3]
      }
    }

    if (!host || isNaN(port)) continue

    const proxy = createProxy({
      name: `${host}:${port}`,
      type,
      host,
      port,
      username,
      password
    })
    results.push(proxy)
  }

  return results
}

export async function checkProxy(id: string): Promise<Proxy | null> {
  const proxy = getProxyById(id)
  if (!proxy) return null

  const db = getDatabase()
  const now = new Date().toISOString()
  let status: 'alive' | 'dead' = 'dead'
  let speed: number | null = null

  try {
    const start = Date.now()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const proxyUrl = proxy.username
      ? `${proxy.type}://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`
      : `${proxy.type}://${proxy.host}:${proxy.port}`

    // Simple connectivity check via fetch with proxy env
    // Note: Node.js fetch doesn't natively support proxies,
    // so we test TCP connectivity instead
    const net = await import('net')
    await new Promise<void>((resolve, reject) => {
      const socket = net.createConnection({ host: proxy.host, port: proxy.port }, () => {
        speed = Date.now() - start
        status = 'alive'
        socket.destroy()
        resolve()
      })
      socket.setTimeout(10000)
      socket.on('timeout', () => { socket.destroy(); reject(new Error('timeout')) })
      socket.on('error', reject)
    })

    clearTimeout(timeout)
  } catch {
    status = 'dead'
  }

  db.prepare('UPDATE proxies SET status = ?, speed = ?, last_checked = ? WHERE id = ?')
    .run(status, speed, now, id)

  return getProxyById(id)
}
