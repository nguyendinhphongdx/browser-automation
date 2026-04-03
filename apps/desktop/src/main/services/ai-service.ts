import { getSetting } from './settings-service'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface AIChatResult {
  ok: boolean
  text: string
  error?: string
}

export async function aiChat(systemPrompt: string, messages: ChatMessage[]): Promise<AIChatResult> {
  const provider = getSetting('ai.provider')
  const apiKey = getSetting('ai.apiKey') || ''
  const baseUrl = getSetting('ai.baseUrl') || ''
  const model = getSetting('ai.model') || ''

  if (!provider) {
    return { ok: false, text: '', error: 'Chưa cấu hình AI Provider. Vào Cài đặt → AI Provider để thiết lập.' }
  }

  if (!apiKey && provider !== 'ollama') {
    return { ok: false, text: '', error: 'Chưa nhập API Key. Vào Cài đặt → AI Provider.' }
  }

  try {
    if (provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: model || 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          system: systemPrompt,
          messages: messages.filter(m => m.role !== 'system'),
        }),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, text: '', error: data.error?.message || `API error ${res.status}` }
      return { ok: true, text: data.content?.[0]?.text || '' }
    }

    if (provider === 'ollama') {
      const url = (baseUrl || 'http://localhost:11434') + '/api/chat'
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model || 'llama3.1',
          stream: false,
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
        }),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, text: '', error: `Ollama error ${res.status}` }
      return { ok: true, text: data.message?.content || '' }
    }

    // OpenAI-compatible (OpenAI, Groq, Google, Custom)
    const base = baseUrl || (
      provider === 'google' ? 'https://generativelanguage.googleapis.com/v1beta/openai' :
      provider === 'groq' ? 'https://api.groq.com/openai' :
      'https://api.openai.com'
    )
    const res = await fetch(`${base}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        max_tokens: 4096,
      }),
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, text: '', error: data.error?.message || `API error ${res.status}` }
    return { ok: true, text: data.choices?.[0]?.message?.content || '' }
  } catch (err: any) {
    return { ok: false, text: '', error: err.message || 'Network error' }
  }
}
