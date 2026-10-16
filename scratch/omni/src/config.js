import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// .env cạnh package.json (xem .env.example). loadEnvFile không ghi đè biến đã có,
// nên biến truyền từ cấu hình MCP (claude mcp add -e / Codex env) vẫn được ưu tiên.
const envFile = path.join(ROOT, '.env')
if (fs.existsSync(envFile)) process.loadEnvFile(envFile)

/** Mọi thứ cấu hình qua biến môi trường — không bao giờ hardcode API key trong code. */
export const config = {
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
  /** Mặc định lưu ngay trong repo (scratch/omni/projects). Đường dẫn tương đối tính từ thư mục server, không phụ thuộc cwd. */
  projectsDir: path.resolve(ROOT, process.env.FILM_PROJECTS_DIR || 'projects'),
  models: {
    image: process.env.FILM_IMAGE_MODEL || 'gemini-3.1-flash-image',
    video: process.env.FILM_VIDEO_MODEL || 'gemini-omni-1.1-flash',
    tts: process.env.FILM_TTS_MODEL || 'gemini-3.8-flash-tts',
    music: process.env.FILM_MUSIC_MODEL || 'lyria-3.5'
  },
  /** Giới hạn độ dài 1 clip video model sinh được (giây) — gemini-omni-1.1-flash tối đa 10s. Cảnh dài hơn sẽ được giữ khung cuối. */
  videoMinSec: Number(process.env.FILM_VIDEO_MIN_SEC || 4),
  videoMaxSec: Number(process.env.FILM_VIDEO_MAX_SEC || 10),
  /** Số request Gemini chạy song song trong 1 job. */
  concurrency: Number(process.env.FILM_CONCURRENCY || 3),
  /** Thời gian tối đa chờ 1 video (ms). */
  videoTimeoutMs: Number(process.env.FILM_VIDEO_TIMEOUT_MS || 15 * 60 * 1000),
  ffmpeg: process.env.FFMPEG_PATH || 'ffmpeg',
  ffprobe: process.env.FFPROBE_PATH || 'ffprobe',
  fps: 30,
  /** Dashboard web (chỉ đọc) chạy kèm MCP server; 0 = tắt. */
  dashboardPort: Number(process.env.FILM_DASHBOARD_PORT ?? 4747)
}

export const RESOLUTIONS = {
  '720p': { '16:9': [1280, 720], '9:16': [720, 1280] },
  '1080p': { '16:9': [1920, 1080], '9:16': [1080, 1920] }
}
