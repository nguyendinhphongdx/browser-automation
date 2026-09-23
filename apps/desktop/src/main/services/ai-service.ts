interface TestConnectionResult {
  ok: boolean
  error?: string
}

/**
 * Lightweight connectivity check for the Settings page's "Test connection"
 * button. Runs from the main process so the API key never has to leave main
 * and no CORS-bypass header is needed — the previous renderer-side
 * implementation called providers directly via `fetch`.
 */
export async function testAIConnection(
  provider: string,
  apiKey: string,
  baseUrl: string,
  model: string
): Promise<TestConnectionResult> {
  try {
    if (provider === 'ollama') {
      const url = (baseUrl || 'http://localhost:11434') + '/api/tags'
      const res = await fetch(url)
      return res.ok ? { ok: true } : { ok: false, error: `Ollama error ${res.status}` }
    }

    if (provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: model || 'claude-sonnet-5',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      })
      if (res.ok) return { ok: true }
      const data = await res.json().catch(() => ({}))
      return { ok: false, error: data.error?.message || `API error ${res.status}` }
    }

    // OpenAI-compatible (OpenAI, Groq, Google, Custom)
    const base = baseUrl || (
      provider === 'google' ? 'https://generativelanguage.googleapis.com/v1beta/openai' :
      provider === 'groq' ? 'https://api.groq.com/openai' :
      'https://api.openai.com'
    )
    const url = `${base}/v1/models`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } })
    return res.ok ? { ok: true } : { ok: false, error: `API error ${res.status}` }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}
