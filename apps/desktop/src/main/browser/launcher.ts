import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import { chromium, firefox, type BrowserContext, type Page } from 'playwright-core'
import type { BrowserProfile, BrowserType, Fingerprint } from '../../shared/types'
import { detectInstalledBrowsers } from './detect'

// Lưu trữ các browser context đang chạy
const activeBrowsers = new Map<string, { context: BrowserContext }>()

export function getProfileDataDir(profileId: string): string {
  const dir = path.join(app.getPath('userData'), 'profiles', profileId)
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function getPlaywrightBrowserType(browserType: BrowserType) {
  if (browserType === 'firefox') {
    return firefox
  }
  // Tất cả Chromium-based browsers đều dùng chromium engine
  return chromium
}

function getExecutablePath(profile: BrowserProfile): string | undefined {
  if (profile.browserExecutablePath) {
    return profile.browserExecutablePath
  }

  // Tìm đường dẫn thực thi dựa trên loại trình duyệt
  const installed = detectInstalledBrowsers()
  const match = installed.find((b) => b.type === profile.browserType)
  return match?.executablePath
}

function buildFingerprintArgs(fingerprint: Fingerprint): string[] {
  const args: string[] = [
    '--disable-blink-features=AutomationControlled',
    '--disable-features=IsolateOrigins,site-per-process',
    '--disable-infobars'
  ]

  if (!fingerprint.webrtc.enabled) {
    args.push('--disable-webrtc')
  }

  return args
}

function buildFingerprintScript(fingerprint: Fingerprint): string {
  // Use JSON.stringify for all interpolated values to prevent script injection
  const s = (val: unknown) => JSON.stringify(val)

  return `
    // Ghi đè navigator properties
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => ${s(fingerprint.hardwareConcurrency)} });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => ${s(fingerprint.deviceMemory)} });
    Object.defineProperty(navigator, 'platform', { get: () => ${s(fingerprint.platform)} });
    Object.defineProperty(navigator, 'language', { get: () => ${s(fingerprint.language)} });
    Object.defineProperty(navigator, 'languages', { get: () => [${s(fingerprint.language)}, ${s(fingerprint.language.split('-')[0])}] });
    Object.defineProperty(navigator, 'doNotTrack', { get: () => ${fingerprint.doNotTrack ? '"1"' : 'null'} });

    // Ghi đè screen properties
    Object.defineProperty(screen, 'width', { get: () => ${s(fingerprint.screenResolution.width)} });
    Object.defineProperty(screen, 'height', { get: () => ${s(fingerprint.screenResolution.height)} });
    Object.defineProperty(screen, 'colorDepth', { get: () => ${s(fingerprint.colorDepth)} });

    // Canvas fingerprint noise
    const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(type) {
      const ctx = this.getContext('2d');
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, this.width, this.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i] = imageData.data[i] + (${s(fingerprint.canvas.noise)} * (Math.random() - 0.5) * 2) | 0;
        }
        ctx.putImageData(imageData, 0, 0);
      }
      return origToDataURL.apply(this, arguments);
    };

    // WebGL fingerprint
    const origGetParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(param) {
      const UNMASKED_VENDOR = 0x9245;
      const UNMASKED_RENDERER = 0x9246;
      if (param === UNMASKED_VENDOR) return ${s(fingerprint.webgl.vendor)};
      if (param === UNMASKED_RENDERER) return ${s(fingerprint.webgl.renderer)};
      return origGetParameter.apply(this, arguments);
    };

    // AudioContext fingerprint noise
    const origCreateOscillator = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function() {
      const osc = origCreateOscillator.apply(this, arguments);
      const origConnect = osc.connect.bind(osc);
      osc.connect = function(dest) {
        return origConnect(dest);
      };
      return osc;
    };

    // Ẩn dấu vết automation
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
  `
}

export async function launchBrowser(profile: BrowserProfile): Promise<void> {
  // Đóng browser cũ nếu đang chạy
  if (activeBrowsers.has(profile.id)) {
    await closeBrowser(profile.id)
  }

  const browserType = getPlaywrightBrowserType(profile.browserType)
  const executablePath = getExecutablePath(profile)

  if (!executablePath) {
    throw new Error(
      `Không tìm thấy trình duyệt "${profile.browserType}" trên máy. ` +
        'Vui lòng cài đặt hoặc chỉ định đường dẫn trong cấu hình profile.'
    )
  }

  const fp = profile.fingerprint
  const args = buildFingerprintArgs(fp)
  const userDataDir = getProfileDataDir(profile.id)

  // Dùng persistent context để lưu cookies, localStorage, cache giữa các phiên
  const context = await browserType.launchPersistentContext(userDataDir, {
    executablePath,
    headless: false,
    args,
    userAgent: fp.userAgent,
    viewport: {
      width: fp.screenResolution.width,
      height: fp.screenResolution.height
    },
    locale: fp.locale,
    timezoneId: fp.timezone,
    colorScheme: 'light'
  })

  // Inject fingerprint script vào mỗi trang mới
  await context.addInitScript(buildFingerprintScript(fp))

  // Mở trang mặc định
  const page = await context.newPage()
  await page.goto('about:blank')

  activeBrowsers.set(profile.id, { context })
}

export async function closeBrowser(profileId: string): Promise<void> {
  const entry = activeBrowsers.get(profileId)
  if (entry) {
    // finally, không phải sau await trực tiếp — nếu process browser đã chết
    // ngoài tầm kiểm soát (crash/bị kill thủ công), context.close() tự nó
    // ném lỗi vì không còn gì để đóng, và nếu lỗi đó văng ra TRƯỚC dòng
    // delete, entry chết sẽ kẹt lại trong Map mãi mãi — lần gọi sau vẫn thấy
    // "đang có browser" dù thực ra đã chết.
    try {
      await entry.context.close()
    } finally {
      activeBrowsers.delete(profileId)
    }
  }
}

export function isBrowserRunning(profileId: string): boolean {
  return activeBrowsers.has(profileId)
}

export function getActiveBrowserContext(profileId: string) {
  return activeBrowsers.get(profileId) || null
}

export async function closeAllBrowsers(): Promise<void> {
  const ids = Array.from(activeBrowsers.keys())
  for (const id of ids) {
    await closeBrowser(id)
  }
}

/**
 * Single source of truth for "get me a ready-to-use page" used by both the
 * scheduler and the campaign engine. Resolves the active browser context for
 * a profile (detecting a dead/stale context and relaunching it), launching a
 * fresh browser if none is active, then picks a usable page (reusing the
 * last non-closed open page, or opening a new one).
 */
async function pickOrOpenPage(context: BrowserContext): Promise<Page> {
  const pages = context.pages().filter((p) => !p.isClosed())
  return pages.length > 0 ? pages[pages.length - 1] : await context.newPage()
}

export async function acquireBrowserPage(
  profile: BrowserProfile
): Promise<{ context: BrowserContext; page: Page; launchedNow: boolean }> {
  let active = getActiveBrowserContext(profile.id)
  let launchedNow = false

  if (active) {
    try {
      const page = await pickOrOpenPage(active.context)
      return { context: active.context, page, launchedNow }
    } catch {
      // context.pages() (dùng ở bản cũ để "dò" context chết) là hàm ĐỒNG BỘ
      // chỉ đọc cache local của Playwright — không hề hỏi thật browser process
      // còn sống hay không, nên không bao giờ bắt được đúng trường hợp này
      // (process đã crash/bị đóng ngoài tầm kiểm soát, nhưng Map
      // `activeBrowsers` chưa kịp dọn). Chỉ thao tác THẬT như newPage() mới
      // lộ ra lỗi "Target page, context or browser has been closed" — và lúc
      // đó coi như xác nhận context đã chết, dọn sạch rồi khởi chạy lại từ
      // đầu thay vì ném lỗi thẳng cho người dùng.
      await closeBrowser(profile.id).catch(() => {})
      active = null
    }
  }

  await launchBrowser(profile)
  active = getActiveBrowserContext(profile.id)
  launchedNow = true

  if (!active) {
    throw new Error('Không thể khởi chạy browser')
  }

  const page = await pickOrOpenPage(active.context)
  return { context: active.context, page, launchedNow }
}
