import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { initDatabase, closeDatabase } from './database/init'
import { registerProfileHandlers } from './ipc/profile-handlers'
import { registerBrowserHandlers } from './ipc/browser-handlers'
import { registerResourceHandlers } from './ipc/resource-handlers'
import { registerAutomationHandlers } from './ipc/automation-handlers'
import { registerSettingsHandlers } from './ipc/settings-handlers'
import { closeAllBrowsers } from './browser/launcher'
import { initAutoUpdater } from './services/auto-updater'

let mainWindow: BrowserWindow | null = null

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

  createWindow()

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
app.on('before-quit', async () => {
  await closeAllBrowsers()
  closeDatabase()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
