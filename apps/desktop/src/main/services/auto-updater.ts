import { autoUpdater } from 'electron-updater'
import { BrowserWindow, dialog } from 'electron'
import log from 'electron-log'

autoUpdater.logger = log
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

export function initAutoUpdater(mainWindow: BrowserWindow) {
  // Kiểm tra cập nhật khi khởi động
  autoUpdater.checkForUpdates().catch(() => {
    // Bỏ qua lỗi nếu không có kết nối mạng
  })

  // Kiểm tra định kỳ mỗi 4 giờ
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, 4 * 60 * 60 * 1000)

  autoUpdater.on('update-available', (info) => {
    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: 'Cập nhật mới',
        message: `Phiên bản ${info.version} đã sẵn sàng. Tải về ngay?`,
        buttons: ['Tải về', 'Để sau'],
        defaultId: 0,
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.downloadUpdate()
          mainWindow.webContents.send('updater:downloading', info.version)
        }
      })
  })

  autoUpdater.on('update-downloaded', (info) => {
    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: 'Cập nhật đã tải xong',
        message: `Phiên bản ${info.version} đã tải xong. Khởi động lại để cập nhật?`,
        buttons: ['Khởi động lại', 'Để sau'],
        defaultId: 0,
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall()
        }
      })
  })

  autoUpdater.on('download-progress', (progress) => {
    mainWindow.webContents.send('updater:progress', {
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
    })
  })

  autoUpdater.on('error', (err) => {
    log.error('Auto-updater error:', err)
  })
}
