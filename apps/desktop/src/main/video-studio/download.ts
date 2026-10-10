import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuid } from 'uuid'

/** Tải 1 URL (http/https) hoặc file:// local về temp file — kết quả `submit`/`poll` của provider có thể là 1 trong 2 dạng này. */
export async function downloadToTemp(url: string, extension: string): Promise<string> {
  if (url.startsWith('file://')) return fileURLToPath(url)

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Tải file thất bại: ${res.status} (${url})`)
  const buffer = Buffer.from(await res.arrayBuffer())
  const filePath = path.join(os.tmpdir(), `video-studio-dl-${uuid()}.${extension}`)
  fs.writeFileSync(filePath, buffer)
  return filePath
}
