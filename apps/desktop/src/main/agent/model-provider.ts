import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { LanguageModel } from 'ai'
import { getSetting } from '../services/settings-service'

// Same defaults ai-service.ts's testAIConnection() uses as fallbacks —
// keep both in sync when bumping a provider's default model.
const DEFAULT_MODELS: Record<string, string> = {
  anthropic: 'claude-sonnet-5',
  openai: 'gpt-6-luna',
  google: 'gemini-3.5-flash',
  groq: 'llama-3.3-70b-versatile',
  ollama: 'llama3.1'
}

export class AgentProviderConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AgentProviderConfigError'
  }
}

/**
 * Resolves the AI SDK `LanguageModel` the agent should use, from the same
 * `ai.provider`/`ai.apiKey`/`ai.baseUrl`/`ai.model` settings ai-service.ts's
 * aiChat() already reads — no new settings keys.
 */
export function resolveAgentModel(): LanguageModel {
  const provider = getSetting('ai.provider')
  const apiKey = getSetting('ai.apiKey') || ''
  const baseUrl = getSetting('ai.baseUrl') || ''
  const model = getSetting('ai.model') || ''

  if (!provider) {
    throw new AgentProviderConfigError(
      'Chưa cấu hình AI Provider. Vào Cài đặt → AI Provider để thiết lập.'
    )
  }

  const requireApiKey = () => {
    if (!apiKey) {
      throw new AgentProviderConfigError(
        `Chưa nhập API Key cho provider "${provider}". Vào Cài đặt → AI Provider.`
      )
    }
    return apiKey
  }

  switch (provider) {
    case 'anthropic':
      return createAnthropic({ apiKey: requireApiKey() })(model || DEFAULT_MODELS.anthropic)

    case 'google':
      return createGoogleGenerativeAI({ apiKey: requireApiKey() })(model || DEFAULT_MODELS.google)

    case 'groq':
      return createGroq({ apiKey: requireApiKey() })(model || DEFAULT_MODELS.groq)

    case 'ollama':
      return createOpenAICompatible({
        name: 'ollama',
        baseURL: `${(baseUrl || 'http://localhost:11434').replace(/\/$/, '')}/v1`
      })(model || DEFAULT_MODELS.ollama)

    case 'custom': {
      if (!baseUrl) {
        throw new AgentProviderConfigError('Chưa nhập Base URL cho provider tuỳ chỉnh.')
      }
      return createOpenAICompatible({
        name: 'custom',
        baseURL: baseUrl,
        apiKey: apiKey || undefined
      })(model || DEFAULT_MODELS.openai)
    }

    case 'openai':
    default:
      return createOpenAI({ apiKey: requireApiKey() })(model || DEFAULT_MODELS.openai)
  }
}
