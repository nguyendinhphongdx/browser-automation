import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import { initDatabase, closeDatabase } from './database/init'
import { registerProfileHandlers } from './ipc/profile-handlers'
import { registerBrowserHandlers } from './ipc/browser-handlers'
import { registerResourceHandlers } from './ipc/resource-handlers'
import { registerAutomationHandlers } from './ipc/automation-handlers'
import { registerSettingsHandlers } from './ipc/settings-handlers'
import { registerBackupHandlers } from './ipc/backup-handlers'
import { closeAllBrowsers } from './browser/launcher'
import { initAutoUpdater } from './services/auto-updater'
import { setSetting } from './services/settings-service'
import { getSetting } from './services/settings-service'

const PROTOCOL = 'browserauto'

let mainWindow: BrowserWindow | null = null

// ── Deep Link Protocol ──────────────────────────
// Đăng ký browserauto:// protocol cho deep link auth
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL)
}

// Xử lý deep link URL
function handleDeepLink(url: string) {
  try {
    const parsed = new URL(url)
    // browserauto://auth?token=xxx&userId=yyy&email=zzz&name=nnn
    if (parsed.host === 'auth' || parsed.pathname === '//auth') {
      const token = parsed.searchParams.get('token')
      const userId = parsed.searchParams.get('userId')
      const email = parsed.searchParams.get('email')
      const name = parsed.searchParams.get('name')

      if (token) {
        setSetting('auth.token', token)
        if (userId) setSetting('auth.userId', userId)
        if (email) setSetting('auth.email', email)
        if (name) setSetting('auth.name', name)

        // Thông báo renderer cập nhật auth state
        mainWindow?.webContents.send('auth:deeplink-success', { token, userId, email, name })
      }
    }
  } catch {
    // URL không hợp lệ, bỏ qua
  }

  // Focus cửa sổ app
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
}

// macOS: deep link khi app đang chạy
app.on('open-url', (event, url) => {
  event.preventDefault()
  handleDeepLink(url)
})

// Windows/Linux: single instance lock + deep link qua argv
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, commandLine) => {
    // Deep link URL nằm ở cuối argv
    const deepLinkUrl = commandLine.find((arg) => arg.startsWith(`${PROTOCOL}://`))
    if (deepLinkUrl) handleDeepLink(deepLinkUrl)

    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

// ── Window ──────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Browser Automation Platform',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // Khởi tạo database
  initDatabase()

  // Đăng ký IPC handlers
  registerProfileHandlers(ipcMain)
  registerBrowserHandlers(ipcMain)
  registerResourceHandlers(ipcMain)
  registerAutomationHandlers(ipcMain)
  registerSettingsHandlers(ipcMain)
  registerBackupHandlers(ipcMain)

  // IPC: mở browser để đăng nhập
  ipcMain.handle('auth:openBrowser', async () => {
    const serverUrl = getSetting('api.url') || 'http://localhost:3000'
    const loginUrl = `${serverUrl}/desktop-login?callback=${encodeURIComponent(`${PROTOCOL}://auth`)}`
    await shell.openExternal(loginUrl)
    return { success: true }
  })

  createWindow()

  // Xử lý deep link từ lúc launch (macOS)
  // Trên Windows/Linux, URL nằm trong process.argv
  const launchUrl = process.argv.find((arg) => arg.startsWith(`${PROTOCOL}://`))
  if (launchUrl) handleDeepLink(launchUrl)

  // Auto-updater (chỉ trong production)
  if (mainWindow && process.env.NODE_ENV !== 'development') {
    initAutoUpdater(mainWindow)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Clean up all browsers before quitting
let isQuitting = false
app.on('before-quit', (e) => {
  if (isQuitting) return
  isQuitting = true
  e.preventDefault()

  Promise.resolve()
    .then(() => closeAllBrowsers())
    .then(() => closeDatabase())
    .catch((err) => console.error('Cleanup error:', err))
    .finally(() => app.quit())
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
