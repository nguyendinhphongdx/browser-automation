import http from 'http'
import { getScheduleByWebhookSecret, markTriggered } from '../services/schedule-service'
import { triggerSchedule } from './scheduler'

let server: http.Server | null = null
let currentPort = 0

export function startWebhookServer(port = 9876): number {
  if (server) return currentPort

  server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Webhook-Secret')

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    if (req.method !== 'POST') {
      res.writeHead(405)
      res.end(JSON.stringify({ error: 'Method not allowed' }))
      return
    }

    // Extract secret from header or URL
    const secret = req.headers['x-webhook-secret'] as string
      || new URL(req.url || '', `http://localhost:${port}`).searchParams.get('secret')
      || ''

    if (!secret) {
      res.writeHead(401)
      res.end(JSON.stringify({ error: 'Missing webhook secret' }))
      return
    }

    const schedule = getScheduleByWebhookSecret(secret)
    if (!schedule) {
      res.writeHead(404)
      res.end(JSON.stringify({ error: 'Invalid webhook secret' }))
      return
    }

    // Parse body (optional — available as variables)
    let body: any = {}
    try {
      const chunks: Buffer[] = []
      for await (const chunk of req) chunks.push(chunk as Buffer)
      const raw = Buffer.concat(chunks).toString()
      if (raw) body = JSON.parse(raw)
    } catch { /* ignore parse errors */ }

    console.log(`[Webhook] Triggered: ${schedule.name}`)

    try {
      await triggerSchedule(schedule)
      markTriggered(schedule.id)
      res.writeHead(200)
      res.end(JSON.stringify({ ok: true, schedule: schedule.name }))
    } catch (err: any) {
      res.writeHead(500)
      res.end(JSON.stringify({ error: err.message }))
    }
  })

  server.listen(port, '127.0.0.1', () => {
    console.log(`[Webhook] Server listening on http://127.0.0.1:${port}`)
  })

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Webhook] Port ${port} in use, trying ${port + 1}`)
      server = null
      startWebhookServer(port + 1)
    }
  })

  currentPort = port
  return port
}

export function stopWebhookServer() {
  if (server) {
    server.close()
    server = null
    console.log('[Webhook] Server stopped')
  }
}

export function getWebhookPort(): number {
  return currentPort
}
