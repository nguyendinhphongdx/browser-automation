import { describe, it, expect, vi } from 'vitest'
import type { Page } from 'playwright-core'
import { buildToolset, APPROVAL_GATED_TOOLS } from './registry'
import type { AgentToolContext } from './types'

function makeCtx(overrides: Partial<AgentToolContext> = {}): AgentToolContext {
  return {
    page: null,
    profileId: 'profile-1',
    workflowSnapshot: { nodes: [], edges: [] },
    nodeDefinitions: [],
    ...overrides
  }
}

/** Minimal fake Page — only the methods the 4 browser tools actually call. */
function makeFakePage(overrides: Partial<Page> = {}): Page {
  return {
    url: () => 'https://example.com/login',
    title: async () => 'Login',
    content: async () => '<html><body>hi</body></html>',
    locator: () => ({ first: () => ({ innerHTML: async () => '<button>Go</button>' }) }),
    evaluate: async (fn: unknown) => (typeof fn === 'string' ? eval(fn) : undefined),
    screenshot: async () => Buffer.from('fake-jpeg-bytes'),
    viewportSize: () => ({ width: 1280, height: 800 }),
    ...overrides
  } as unknown as Page
}

describe('get_page_url', () => {
  it('returns url/title when a browser is open', async () => {
    const ctx = makeCtx({ page: makeFakePage() })
    const result = (await buildToolset(ctx).get_page_url!.execute!({}, {} as never)) as Record<string, unknown>
    expect(result).toEqual({ ok: true, url: 'https://example.com/login', title: 'Login' })
  })

  it('reports no-browser error when page is null', async () => {
    const ctx = makeCtx({ page: null })
    const result = (await buildToolset(ctx).get_page_url!.execute!({}, {} as never)) as Record<string, unknown>
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/Chưa có browser/)
  })
})

describe('get_page_html', () => {
  it('returns full document html when no selector given', async () => {
    const ctx = makeCtx({ page: makeFakePage() })
    const result = (await buildToolset(ctx).get_page_html!.execute!(
      {},
      {} as never
    )) as Record<string, unknown>
    expect(result).toMatchObject({ ok: true, truncated: false })
    expect(result.html).toContain('<body>hi</body>')
  })

  it('scopes to a selector when given', async () => {
    const ctx = makeCtx({ page: makeFakePage() })
    const result = (await buildToolset(ctx).get_page_html!.execute!(
      { selector: 'button' },
      {} as never
    )) as Record<string, unknown>
    expect(result.html).toBe('<button>Go</button>')
  })

  it('truncates HTML past the length cap and flags it', async () => {
    const bigHtml = 'x'.repeat(25_000)
    const ctx = makeCtx({ page: makeFakePage({ content: async () => bigHtml }) })
    const result = (await buildToolset(ctx).get_page_html!.execute!(
      {},
      {} as never
    )) as Record<string, unknown>
    expect(result.truncated).toBe(true)
    expect((result.html as string).length).toBe(20_000)
  })
})

describe('run_js', () => {
  it('is in the approval-gated tool list', () => {
    expect(APPROVAL_GATED_TOOLS).toContain('run_js')
  })

  it('evaluates the given expression and returns a JSON-serializable result', async () => {
    const ctx = makeCtx({ page: makeFakePage() })
    const result = (await buildToolset(ctx).run_js!.execute!(
      { code: '1 + 1' },
      {} as never
    )) as Record<string, unknown>
    expect(result).toEqual({ ok: true, result: 2 })
  })

  it('reports errors thrown by page.evaluate without throwing itself', async () => {
    const ctx = makeCtx({
      page: makeFakePage({
        evaluate: async () => {
          throw new Error('boom')
        }
      })
    })
    const result = (await buildToolset(ctx).run_js!.execute!(
      { code: 'whatever' },
      {} as never
    )) as Record<string, unknown>
    expect(result).toEqual({ ok: false, error: 'boom' })
  })
})

describe('take_screenshot', () => {
  it('returns size metadata to the model and forwards the data URL via onScreenshot, not in its own result', async () => {
    const onScreenshot = vi.fn()
    const ctx = makeCtx({ page: makeFakePage(), onScreenshot })
    const result = (await buildToolset(ctx).take_screenshot!.execute!(
      { fullPage: false },
      {} as never
    )) as Record<string, unknown>

    expect(result.ok).toBe(true)
    expect(result.width).toBe(1280)
    expect(result.height).toBe(800)
    expect(result.byteSize).toBe(Buffer.from('fake-jpeg-bytes').length)
    expect(Object.keys(result)).not.toContain('dataUrl')
    expect(Object.keys(result)).not.toContain('base64')

    expect(onScreenshot).toHaveBeenCalledTimes(1)
    expect(onScreenshot.mock.calls[0][0]).toMatch(/^data:image\/jpeg;base64,/)
  })
})
