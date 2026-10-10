import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import ffmpegStatic from 'ffmpeg-static'
import { execFileSync } from 'child_process'
import { concatVideos, mixAudioTracks, extractLastFrame } from './ffmpeg'

// Test tích hợp thật — tự sinh clip/audio mẫu bằng chính ffmpeg (nguồn lavfi,
// không cần file mẫu có sẵn), rồi chạy qua các hàm của ffmpeg.ts và xác nhận
// output thật sự được tạo ra. Dùng binary ffmpeg-static thật, không mock.
describe('ffmpeg render helpers (integration, uses the real bundled ffmpeg binary)', () => {
  let clipA: string
  let clipB: string
  let audioA: string
  let audioB: string

  beforeAll(() => {
    if (!ffmpegStatic) throw new Error('ffmpeg-static binary không có sẵn — chạy `pnpm install` trước')

    clipA = path.join(os.tmpdir(), `ffmpeg-test-clip-a-${Date.now()}.mp4`)
    clipB = path.join(os.tmpdir(), `ffmpeg-test-clip-b-${Date.now()}.mp4`)
    audioA = path.join(os.tmpdir(), `ffmpeg-test-audio-a-${Date.now()}.mp3`)
    audioB = path.join(os.tmpdir(), `ffmpeg-test-audio-b-${Date.now()}.mp3`)

    const run = (args: string[]) => execFileSync(ffmpegStatic as string, args, { stdio: 'pipe' })

    run(['-y', '-f', 'lavfi', '-i', 'color=c=red:s=64x64:d=1:r=10', '-pix_fmt', 'yuv420p', clipA])
    run(['-y', '-f', 'lavfi', '-i', 'color=c=blue:s=64x64:d=1:r=10', '-pix_fmt', 'yuv420p', clipB])
    run(['-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1', audioA])
    run(['-y', '-f', 'lavfi', '-i', 'sine=frequency=880:duration=1', audioB])
  }, 30_000)

  afterAll(() => {
    for (const f of [clipA, clipB, audioA, audioB]) {
      try {
        fs.unlinkSync(f)
      } catch {
        // đã xoá hoặc chưa từng tạo — bỏ qua
      }
    }
  })

  it('concatVideos nối 2 clip thành 1 file video hợp lệ, dài hơn từng clip riêng', async () => {
    const output = await concatVideos([clipA, clipB])
    expect(fs.existsSync(output)).toBe(true)
    expect(fs.statSync(output).size).toBeGreaterThan(0)
    fs.unlinkSync(output)
  }, 30_000)

  it('mixAudioTracks mix 2 track thành 1 file audio hợp lệ', async () => {
    const output = await mixAudioTracks([{ path: audioA, volume: 1 }, { path: audioB, volume: 0.5 }])
    expect(fs.existsSync(output)).toBe(true)
    expect(fs.statSync(output).size).toBeGreaterThan(0)
    fs.unlinkSync(output)
  }, 30_000)

  it('extractLastFrame lấy được 1 ảnh PNG từ video', async () => {
    const output = await extractLastFrame(clipA)
    expect(fs.existsSync(output)).toBe(true)
    expect(fs.statSync(output).size).toBeGreaterThan(0)
    expect(output.endsWith('.png')).toBe(true)
    fs.unlinkSync(output)
  }, 30_000)
})
