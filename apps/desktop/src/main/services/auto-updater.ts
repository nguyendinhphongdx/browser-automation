import { BrowserWindow, dialog } from 'electron'

export function initAutoUpdater(mainWindow: BrowserWindow) {
  // Lazy import — electron-updater crash nếu import top-level trong dev
  const { autoUpdater } = require('electron-updater')

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  // Kiểm tra cập nhật khi khởi động
  autoUpdater.checkForUpdates().catch(() => {})

  // Kiểm tra định kỳ mỗi 4 giờ
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, 4 * 60 * 60 * 1000)

  autoUpdater.on('update-available', (info: any) => {
    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: 'Cập nhật mới',
        message: `Phiên bản ${info.version} đã sẵn sàng. Tải về ngay?`,
        buttons: ['Tải về', 'Để sau'],
        defaultId: 0,
      })
      .then((result: any) => {
        if (result.response === 0) {
          autoUpdater.downloadUpdate()
          mainWindow.webContents.send('updater:downloading', info.version)
        }
      })
  })

  autoUpdater.on('update-downloaded', (info: any) => {
    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: 'Cập nhật đã tải xong',
        message: `Phiên bản ${info.version} đã tải xong. Khởi động lại để cập nhật?`,
        buttons: ['Khởi động lại', 'Để sau'],
        defaultId: 0,
      })
      .then((result: any) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall()
        }
      })
  })

  autoUpdater.on('download-progress', (progress: any) => {
    mainWindow.webContents.send('updater:progress', {
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
    })
  })

  autoUpdater.on('error', (err: any) => {
    console.error('Auto-updater error:', err)
  })
}
