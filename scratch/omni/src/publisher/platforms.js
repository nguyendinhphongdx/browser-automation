import { NotLoggedIn, browserConfig, fillText, pause, stepper } from './browser.js'

/**
 * Adapter từng nền tảng: mở trang upload, chọn file, điền tiêu đề/mô tả/caption/tuỳ chọn, chọn chế độ riêng tư,
 * rồi DỪNG trước nút Đăng/Lưu cuối — người dùng tự xem và bấm. Selector gom ở `sel` để sửa nhanh khi giao diện đổi;
 * bước nào không tìm thấy thì thành việc "làm tay" chứ không bấm bừa.
 * URL ghi đè được bằng PUBLISH_URL_<PLATFORM> (test dùng trang giả).
 */

const url = (platform, fallback) => process.env[`PUBLISH_URL_${platform.toUpperCase()}`] || fallback

const youtube = {
  id: 'youtube',
  label: 'YouTube Studio',
  loginUrl: 'https://studio.youtube.com',
  uploadUrl: () => url('youtube', 'https://www.youtube.com/upload'),
  sel: {
    fileInput: 'input[type="file"]',
    title: '#title-textarea #textbox',
    description: '#description-textarea #textbox',
    thumbnail: 'input#file-loader',
    madeForKids: (yes) => `tp-yt-paper-radio-button[name="${yes ? 'VIDEO_MADE_FOR_KIDS_MFK' : 'VIDEO_MADE_FOR_KIDS_NOT_MFK'}"]`,
    showMore: '#toggle-button',
    tags: 'input[aria-label="Tags"], #tags-container input',
    alteredContent: (yes) => `tp-yt-paper-radio-button[name="${yes ? 'VIDEO_HAS_ALTERED_CONTENT_YES' : 'VIDEO_HAS_ALTERED_CONTENT_NO'}"]`,
    next: '#next-button',
    visibility: (v) => `tp-yt-paper-radio-button[name="${{ private: 'PRIVATE', unlisted: 'UNLISTED' }[v] || 'PRIVATE'}"]`,
    videoLink: '.video-url-fadeable a, a.style-scope.ytcp-video-info'
  },
  loggedOut: (page) => /accounts\.google\.com|ServiceLogin|signin/i.test(page.url()),
  async prepare(page, d, files, log) {
    const { sel } = this
    if (d.made_for_kids == null) throw new Error('YouTube bắt buộc chọn "dành cho trẻ em" — hỏi người dùng rồi lưu bằng episode_publish_kit(made_for_kids=...) trước.')
    const { step, filled, manual } = stepper(log)
    await page.goto(this.uploadUrl(), { waitUntil: 'domcontentloaded' })
    await pause(page, 1500)
    if (this.loggedOut(page)) throw new NotLoggedIn('youtube')
    await step('chọn file video', () => page.locator(sel.fileInput).first().setInputFiles(files.video), { required: true })
    const title = page.locator(sel.title).first()
    await step('chờ form chi tiết', () => title.waitFor({ state: 'visible', timeout: browserConfig.uploadTimeoutMs }), { required: true })
    await pause(page, 1500)
    await step('tiêu đề', () => fillText(page, title, d.title), { manualHint: `dán tiêu đề: ${d.title}` })
    await step('mô tả', () => fillText(page, page.locator(sel.description).first(), d.description), { manualHint: 'dán mô tả (trong file .txt)' })
    if (files.thumbnail) await step('ảnh bìa', () => page.locator(sel.thumbnail).first().setInputFiles(files.thumbnail), { manualHint: `tải ảnh bìa ${files.thumbnail} (kênh cần xác minh số điện thoại mới đổi được ảnh bìa)` })
    await step(`dành cho trẻ em: ${d.made_for_kids ? 'CÓ' : 'KHÔNG'}`, () => page.locator(sel.madeForKids(d.made_for_kids)).first().click(), { manualHint: `chọn "dành cho trẻ em": ${d.made_for_kids ? 'Có' : 'Không'}` })
    await step('mở "Hiện thêm"', () => page.locator(sel.showMore).first().click())
    if (d.tags?.length) await step('thẻ (tags)', () => fillText(page, page.locator(sel.tags).first(), `${d.tags.join(', ')},`), { manualHint: `thẻ: ${d.tags.join(', ')}` })
    await step(`nội dung chỉnh sửa/tổng hợp: ${d.altered_content ? 'CÓ' : 'KHÔNG'}`, () => page.locator(sel.alteredContent(!!d.altered_content)).first().click(), { manualHint: 'mục "Nội dung bị biến đổi": phim hoạt hình rõ ràng không thật → Không' })
    for (let i = 1; i <= 3; i++) {
      await step(`Tiếp (${i}/3)`, async () => {
        await page.locator(sel.next).first().click()
        await pause(page, 1200)
      })
    }
    await step(`chế độ hiển thị: ${d.visibility}`, () => page.locator(sel.visibility(d.visibility)).first().click(), { manualHint: `chọn "${d.visibility === 'unlisted' ? 'Không công khai' : 'Riêng tư'}"` })
    const link = await page.locator(sel.videoLink).first().getAttribute('href', { timeout: 5000 }).catch(() => null)
    if (files.captions) manual.push(`(tuỳ chọn) bước "Phụ đề" → tải lên ${files.captions}`)
    manual.push('kiểm tra lại rồi tự bấm "Lưu"')
    return { filled, manual, video_url: link }
  }
}

const tiktok = {
  id: 'tiktok',
  label: 'TikTok Studio',
  loginUrl: 'https://www.tiktok.com/login',
  uploadUrl: () => url('tiktok', 'https://www.tiktok.com/tiktokstudio/upload'),
  sel: {
    fileInput: 'input[type="file"][accept*="video"]',
    caption: '.public-DraftEditor-content, div[contenteditable="true"]'
  },
  loggedOut: (page) => /\/login/i.test(page.url()),
  async prepare(page, d, files, log) {
    const { sel } = this
    const { step, filled, manual } = stepper(log)
    await page.goto(this.uploadUrl(), { waitUntil: 'domcontentloaded' })
    await pause(page, 1500)
    if (this.loggedOut(page)) throw new NotLoggedIn('tiktok')
    await step('chọn file video', () => page.locator(sel.fileInput).first().setInputFiles(files.video), { required: true })
    const caption = page.locator(sel.caption).first()
    await step('chờ form chi tiết', () => caption.waitFor({ state: 'visible', timeout: browserConfig.uploadTimeoutMs }), { required: true })
    await pause(page, 2000)
    await step('caption + hashtag', () => fillText(page, caption, d.caption), { manualHint: 'dán caption (trong tiktok.txt)' })
    manual.push(`"Ai có thể xem video này" → ${d.visibility === 'private' ? '"Chỉ mình tôi"' : d.visibility}`)
    if (d.ai_generated) manual.push('"Hiện thêm" → bật "Nội dung do AI tạo"')
    if (files.cover) manual.push(`(tuỳ chọn) "Sửa ảnh bìa" → tải ${files.cover}`)
    manual.push('kiểm tra lại rồi tự bấm "Đăng"')
    return { filled, manual, video_url: null }
  }
}

const reels = {
  id: 'reels',
  label: 'Facebook Reels',
  loginUrl: 'https://www.facebook.com/login',
  uploadUrl: () => url('reels', 'https://www.facebook.com/reels/create/'),
  sel: {
    fileInput: 'input[type="file"][accept*="video"]',
    caption: 'div[contenteditable="true"][role="textbox"]',
    next: 'div[role="button"]:has-text("Tiếp"), div[role="button"]:has-text("Next")'
  },
  loggedOut: async (page) => /\/login/i.test(page.url()) || (await page.locator('input[name="email"]').count()) > 0,
  async prepare(page, d, files, log) {
    const { sel } = this
    const { step, filled, manual } = stepper(log)
    await page.goto(this.uploadUrl(), { waitUntil: 'domcontentloaded' })
    await pause(page, 1500)
    if (await this.loggedOut(page)) throw new NotLoggedIn('reels')
    manual.push('kiểm tra góc trên: đang đăng bằng đúng TRANG (Page) chưa — chưa thì chuyển sang Page rồi chạy lại')
    await step('chọn file video', () => page.locator(sel.fileInput).first().setInputFiles(files.video), { required: true })
    const caption = page.locator(sel.caption).first()
    await step('chờ ô mô tả', async () => {
      for (let i = 0; i < 2 && !(await caption.isVisible()); i++) {
        await page.locator(sel.next).first().click({ timeout: browserConfig.uploadTimeoutMs })
        await pause(page, 1500)
      }
      await caption.waitFor({ state: 'visible', timeout: browserConfig.uploadTimeoutMs })
    }, { required: true })
    await step('mô tả + hashtag', () => fillText(page, caption, d.caption), { manualHint: 'dán mô tả (trong reels.txt)' })
    manual.push('kiểm tra lại; Reels trên Page luôn CÔNG KHAI khi bấm "Đăng" — muốn nháp thì chọn lưu nháp/lên lịch nếu có')
    return { filled, manual, video_url: null }
  }
}

/** Shorts = upload YouTube với bản dọc ≤ 3 phút; YouTube tự xếp vào Shorts. */
const shorts = { ...youtube, id: 'shorts', label: 'YouTube Shorts', uploadUrl: () => url('shorts', url('youtube', 'https://www.youtube.com/upload')) }

export const ADAPTERS = { youtube, shorts, tiktok, reels }
export const LOGIN_URLS = { youtube: youtube.loginUrl, tiktok: tiktok.loginUrl, facebook: reels.loginUrl }
