import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

/**
 * 1 profile Chrome riêng cho việc đăng bài (scratch/omni/.browser-profile, git-ignore):
 * người dùng tự đăng nhập 1 lần bằng Chrome THƯỜNG (không automation — Google chặn đăng nhập trong
 * browser bị điều khiển), cookie ở lại profile; publisher mở lại đúng profile đó bằng Playwright để điền form.
 * Chrome thật, profile thật, tốc độ người — không giả vân tay, không giải captcha, không lưu mật khẩu.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

export const browserConfig = {
  profileDir: path.resolve(ROOT, process.env.PUBLISH_PROFILE_DIR || '.browser-profile'),
  chromePath:
    process.env.PUBLISH_CHROME_PATH ||
    (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : 'google-chrome'),
  headless: process.env.PUBLISH_HEADLESS === '1',
  /** Thời gian chờ upload xong tới khi form hiện ra (ms). */
  uploadTimeoutMs: Number(process.env.PUBLISH_UPLOAD_TIMEOUT_MS || 180000)
}

let context = null
let loginProc = null

/** Chrome đang mở profile (cửa sổ đăng nhập chưa tắt) thì Playwright không mở chung được. */
export function profileLocked() {
  if (loginProc && loginProc.exitCode === null) return true
  try {
    fs.lstatSync(path.join(browserConfig.profileDir, 'SingletonLock'))
    return !context
  } catch {
    return false
  }
}

export async function getContext() {
  if (context) return context
  if (profileLocked()) throw new Error('Profile đang mở trong cửa sổ Chrome đăng nhập — đăng nhập xong thì THOÁT hẳn Chrome đó (Cmd+Q) rồi thử lại.')
  fs.mkdirSync(browserConfig.profileDir, { recursive: true })
  const custom = process.env.PUBLISH_CHROME_PATH
  context = await chromium.launchPersistentContext(browserConfig.profileDir, {
    ...(custom ? { executablePath: custom } : { channel: 'chrome' }),
    headless: browserConfig.headless,
    viewport: null,
    acceptDownloads: false,
    locale: 'vi-VN'
  })
  context.on('close', () => (context = null))
  return context
}

export const isOpen = () => !!context

export async function closeBrowser() {
  if (context) await context.close().catch(() => {})
  context = null
}

/** Mở Chrome THƯỜNG với profile publisher để người dùng tự đăng nhập. Không automation, không đọc gì từ cửa sổ này. */
export async function openLogin(urls) {
  await closeBrowser()
  fs.mkdirSync(browserConfig.profileDir, { recursive: true })
  if (!fs.existsSync(browserConfig.chromePath) && path.isAbsolute(browserConfig.chromePath)) {
    throw new Error(`Không thấy Chrome ở ${browserConfig.chromePath} — đặt PUBLISH_CHROME_PATH.`)
  }
  loginProc = spawn(browserConfig.chromePath, [`--user-data-dir=${browserConfig.profileDir}`, '--no-first-run', '--no-default-browser-check', ...urls], { detached: true, stdio: 'ignore' })
  loginProc.unref()
  return { pid: loginProc.pid }
}

/** Trang mới ở tốc độ người: chờ có chủ đích giữa các thao tác, không bấm dồn. */
export async function newPage() {
  const ctx = await getContext()
  const page = await ctx.newPage()
  page.setDefaultTimeout(30000)
  await page.bringToFront().catch(() => {})
  return page
}

export const pause = (page, ms = 700) => page.waitForTimeout(ms + Math.round(Math.random() * 400))

/** Xoá rồi gõ nội dung vào ô (input/textarea/contenteditable/DraftJS). */
export async function fillText(page, locator, text) {
  await locator.click()
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A')
  await page.keyboard.press('Backspace')
  await page.keyboard.insertText(text)
  await pause(page)
}

/**
 * Chạy từng bước điền form; bước nào hỏng (giao diện đổi) thì ghi vào `manual` để người dùng tự làm,
 * không dừng cả quy trình. Bước `required` hỏng thì dừng.
 */
export function stepper(log) {
  const filled = []
  const manual = []
  const step = async (name, fn, { required = false, manualHint } = {}) => {
    try {
      const r = await fn()
      filled.push(name)
      log?.(`✓ ${name}`)
      return r
    } catch (err) {
      log?.(`✗ ${name}: ${String(err.message).split('\n')[0]}`)
      if (required) throw new Error(`${name}: ${String(err.message).split('\n')[0]}`)
      manual.push(manualHint || name)
      return null
    }
  }
  return { step, filled, manual }
}

export class NotLoggedIn extends Error {}
