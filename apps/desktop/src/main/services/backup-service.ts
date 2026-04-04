import crypto from 'crypto'
import path from 'path'
import fs from 'fs'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'
import os from 'os'
import { app, dialog } from 'electron'
import archiver from 'archiver'
import AdmZip from 'adm-zip'
import { getProfileById, getAllProfiles, createProfile } from './profile-service'
import { getSetting } from './settings-service'
import { isBrowserRunning } from '../browser/launcher'
import type { BrowserProfile, BackupStatusItem } from '../../shared/types'

function getProfilesBaseDir(): string {
  return path.join(app.getPath('userData'), 'profiles')
}

function getProfileDataDir(profileId: string): string {
  return path.join(getProfilesBaseDir(), profileId)
}

function getServerConfig(): { url: string; token: string } {
  const url = getSetting('api.url')
  const token = getSetting('auth.token')
  if (!url || !token) throw new Error('Chưa đăng nhập hoặc chưa cấu hình server')
  return { url, token }
}

// ─── Zip helper ─────────────────────────────────────────────

function zipProfile(profile: BrowserProfile, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath)
    const archive = archiver('zip', { zlib: { level: 6 } })

    output.on('close', resolve)
    output.on('error', reject)
    archive.on('error', reject)
    archive.pipe(output)

    // Profile metadata
    archive.append(JSON.stringify(profile, null, 2), { name: 'profile.json' })

    // Browser data directory (bỏ cache để giảm dung lượng)
    const dataDir = getProfileDataDir(profile.id)
    if (fs.existsSync(dataDir)) {
      archive.directory(dataDir, 'data', (entry) => {
        // Bỏ qua các thư mục cache lớn
        const skip = ['Cache', 'Code Cache', 'GPUCache', 'ShaderCache', 'Service Worker']
        if (skip.some((s) => entry.name.includes(s))) return false
        return entry
      })
    }

    archive.finalize()
  })
}

// ─── Export ──────────────────────────────────────────────────

export async function exportProfile(profileId: string): Promise<string | null> {
  const profile = getProfileById(profileId)
  if (!profile) throw new Error('Profile không tồn tại')

  if (isBrowserRunning(profileId)) {
    throw new Error('Vui lòng đóng browser trước khi backup')
  }

  const { filePath } = await dialog.showSaveDialog({
    defaultPath: `${profile.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.zip`,
    filters: [{ name: 'ZIP', extensions: ['zip'] }],
  })

  if (!filePath) return null

  await zipProfile(profile, filePath)
  return filePath
}

export async function exportAllProfiles(): Promise<string | null> {
  const profiles = getAllProfiles()
  if (profiles.length === 0) throw new Error('Không có profile nào')

  // Kiểm tra browser đang chạy
  const running = profiles.filter((p) => isBrowserRunning(p.id))
  if (running.length > 0) {
    throw new Error(`Vui lòng đóng ${running.length} browser đang chạy trước khi backup`)
  }

  const date = new Date().toISOString().slice(0, 10)
  const { filePath } = await dialog.showSaveDialog({
    defaultPath: `all-profiles-${date}.zip`,
    filters: [{ name: 'ZIP', extensions: ['zip'] }],
  })

  if (!filePath) return null

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(filePath)
    const archive = archiver('zip', { zlib: { level: 6 } })

    output.on('close', () => resolve(filePath))
    output.on('error', reject)
    archive.on('error', reject)
    archive.pipe(output)

    for (const profile of profiles) {
      // Metadata
      archive.append(JSON.stringify(profile, null, 2), {
        name: `${profile.id}/profile.json`,
      })

      // Data dir
      const dataDir = getProfileDataDir(profile.id)
      if (fs.existsSync(dataDir)) {
        archive.directory(dataDir, `${profile.id}/data`, (entry) => {
          const skip = ['Cache', 'Code Cache', 'GPUCache', 'ShaderCache', 'Service Worker']
          if (skip.some((s) => entry.name.includes(s))) return false
          return entry
        })
      }
    }

    archive.finalize()
  })
}

// ─── Import ─────────────────────────────────────────────────

export async function importProfile(zipPath?: string): Promise<BrowserProfile> {
  if (!zipPath) {
    const { filePaths } = await dialog.showOpenDialog({
      filters: [{ name: 'ZIP', extensions: ['zip'] }],
      properties: ['openFile'],
    })
    if (!filePaths || filePaths.length === 0) throw new Error('Không chọn file')
    zipPath = filePaths[0]
  }

  const zip = new AdmZip(zipPath)
  const metaEntry = zip.getEntry('profile.json')
  if (!metaEntry) throw new Error('File backup không hợp lệ — thiếu profile.json')

  const meta = JSON.parse(metaEntry.getData().toString('utf8')) as BrowserProfile

  // Tạo profile mới trong DB (sẽ có ID mới)
  const newProfile = createProfile({
    name: meta.name,
    browserType: meta.browserType,
    browserVersion: meta.browserVersion,
    browserExecutablePath: meta.browserExecutablePath,
    tags: meta.tags,
    folder: meta.folder,
    color: meta.color,
    notes: meta.notes,
    fingerprint: meta.fingerprint,
    proxyId: meta.proxyId,
  })

  // Extract data/ vào thư mục profile mới
  const newDataDir = getProfileDataDir(newProfile.id)
  const resolvedDataDir = path.resolve(newDataDir)
  const entries = zip.getEntries()
  for (const entry of entries) {
    if (entry.entryName.startsWith('data/') && !entry.isDirectory) {
      const relativePath = entry.entryName.slice('data/'.length)
      const targetPath = path.resolve(newDataDir, relativePath)
      // Zip Slip protection: ensure path stays within target directory
      if (!targetPath.startsWith(resolvedDataDir + path.sep) && targetPath !== resolvedDataDir) {
        throw new Error(`Zip entry "${entry.entryName}" resolves outside target directory — possible Zip Slip attack`)
      }
      fs.mkdirSync(path.dirname(targetPath), { recursive: true })
      fs.writeFileSync(targetPath, entry.getData())
    }
  }

  return newProfile
}

// ─── Upload to server ───────────────────────────────────────

export async function uploadProfile(profileId: string): Promise<void> {
  const profile = getProfileById(profileId)
  if (!profile) throw new Error('Profile không tồn tại')

  if (isBrowserRunning(profileId)) {
    throw new Error('Vui lòng đóng browser trước khi upload')
  }

  const { url, token } = getServerConfig()
  // Zip vào thư mục temp
  const tempZip = path.join(os.tmpdir(), `backup-${profileId}-${Date.now()}.zip`)
  try {
    await zipProfile(profile, tempZip)

    const zipBuffer = await fs.promises.readFile(tempZip)
    const checksum = crypto.createHash('sha256').update(zipBuffer).digest('hex')

    // 1. Xin presigned URL từ server
    const res = await fetch(`${url}/api/profiles/backup/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        profileId,
        name: profile.name,
        size: zipBuffer.length,
        checksum,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || `Failed to get upload URL: ${res.status}`)
    }

    const { uploadUrl } = await res.json()

    // 2. Upload thẳng lên cloud storage
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/zip' },
      body: zipBuffer,
    })

    if (!uploadRes.ok) {
      throw new Error(`Upload to storage failed: ${uploadRes.status}`)
    }
  } finally {
    if (fs.existsSync(tempZip)) fs.unlinkSync(tempZip)
  }
}

// ─── Download from server ───────────────────────────────────

export async function downloadBackup(backupId: string): Promise<BrowserProfile> {
  const { url, token } = getServerConfig()

  // Lấy signed URL
  const res = await fetch(`${url}/api/profiles/backup/download/${backupId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) throw new Error('Không thể tải backup')

  const { url: downloadUrl } = await res.json()

  // Download file — stream to disk instead of buffering in memory
  const dlRes = await fetch(downloadUrl)
  if (!dlRes.ok) throw new Error('Download failed')

  const tempZip = path.join(os.tmpdir(), `download-${backupId}-${Date.now()}.zip`)

  try {
    const body = dlRes.body
    if (!body) throw new Error('Empty response body')
    const nodeStream = Readable.fromWeb(body as any)
    await pipeline(nodeStream, fs.createWriteStream(tempZip))
    return await importProfile(tempZip)
  } finally {
    if (fs.existsSync(tempZip)) fs.unlinkSync(tempZip)
  }
}

// ─── Backup status (signal URL) ─────────────────────────────

export async function getBackupStatus(): Promise<BackupStatusItem[]> {
  const { url, token } = getServerConfig()

  const res = await fetch(`${url}/api/profiles/backup/status`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) throw new Error('Không thể lấy trạng thái backup')

  const { statuses } = await res.json()
  return statuses
}
