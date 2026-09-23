import { describe, it, expect, vi, beforeEach } from 'vitest'

const settingsStore = new Map<string, string>()

// settings-service.ts talks to a real SQLite table; the global test mock in
// src/test/setup.ts fakes better-sqlite3 so every row read comes back
// `undefined`, which would make every getSetting() call return null — no way
// to distinguish test scenarios. Bypass the DB layer entirely instead.
vi.mock('../services/settings-service', () => ({
  getSetting: (key: string) => settingsStore.get(key) ?? null
}))

import { resolveAgentModel, AgentProviderConfigError } from './model-provider'

// resolveAgentModel()'s return type is AI SDK's `LanguageModel`, a union that
// includes a bare model-id string alias — real provider factories always
// return the object form, which does carry `modelId`, but the union type
// doesn't expose it without narrowing. Test-only helper, not a runtime check.
function modelId(model: ReturnType<typeof resolveAgentModel>): string {
  return (model as { modelId: string }).modelId
}

describe('resolveAgentModel', () => {
  beforeEach(() => {
    settingsStore.clear()
  })

  it('throws AgentProviderConfigError when no provider is configured', () => {
    expect(() => resolveAgentModel()).toThrow(AgentProviderConfigError)
  })

  it('throws when an API-key provider has no key set', () => {
    settingsStore.set('ai.provider', 'anthropic')
    expect(() => resolveAgentModel()).toThrow(/API Key/)
  })

  it('throws when the custom provider has no base URL', () => {
    settingsStore.set('ai.provider', 'custom')
    expect(() => resolveAgentModel()).toThrow(/Base URL/)
  })

  it('resolves an anthropic model when a key is present', () => {
    settingsStore.set('ai.provider', 'anthropic')
    settingsStore.set('ai.apiKey', 'sk-ant-test')
    const model = resolveAgentModel()
    expect(modelId(model)).toBe('claude-sonnet-5')
  })

  it('uses the configured model id instead of the default when set', () => {
    settingsStore.set('ai.provider', 'anthropic')
    settingsStore.set('ai.apiKey', 'sk-ant-test')
    settingsStore.set('ai.model', 'claude-opus-5')
    const model = resolveAgentModel()
    expect(modelId(model)).toBe('claude-opus-5')
  })

  it('resolves ollama without requiring an API key', () => {
    settingsStore.set('ai.provider', 'ollama')
    const model = resolveAgentModel()
    expect(modelId(model)).toBe('llama3.1')
  })

  it('resolves a custom OpenAI-compatible endpoint', () => {
    settingsStore.set('ai.provider', 'custom')
    settingsStore.set('ai.baseUrl', 'http://localhost:8080/v1')
    settingsStore.set('ai.model', 'my-local-model')
    const model = resolveAgentModel()
    expect(modelId(model)).toBe('my-local-model')
  })
})

// Live smoke test: only runs if a real Anthropic key is exported in the
// environment (e.g. `ANTHROPIC_API_KEY=sk-ant-... pnpm test`). Skipped by
// default so CI/regular runs never need a real key or hit the network.
describe.skipIf(!process.env.ANTHROPIC_API_KEY)('ToolLoopAgent live smoke test', () => {
  it(
    'calls a real provider and round-trips a tool call',
    async () => {
      const { ToolLoopAgent, tool, isStepCount } = await import('ai')
      const { z } = await import('zod')
      const { createAnthropic } = await import('@ai-sdk/anthropic')

      const agent = new ToolLoopAgent({
        model: createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })(
          'claude-haiku-4-5-20251001'
        ),
        tools: {
          echo: tool({
            description: 'Echoes back the given text, uppercased.',
            inputSchema: z.object({ text: z.string() }),
            execute: async ({ text }) => ({ result: text.toUpperCase() })
          })
        },
        stopWhen: isStepCount(3)
      })

      const result = await agent.generate({
        prompt: 'Call the echo tool with text "hello", then tell me exactly what it returned.'
      })

      expect(result.text).toMatch(/HELLO/)
    },
    30000
  )
})
