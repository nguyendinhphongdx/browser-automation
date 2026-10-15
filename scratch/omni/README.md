# Film Studio MCP

MCP server để làm phim truyện 1 hoặc nhiều tập bằng AI agent (Claude Code, Codex, Cursor, …).

Quy trình đi từ ý tưởng tới file mp4 đăng được ngay:

**brainstorm → series bible → nhân vật + phụ kiện (character sheet) → kịch bản từng tập → storyboard (ảnh) → duyệt → video → thoại / nhạc → chuyển cảnh → ghép phim**

Agent là biên kịch kiêm đạo diễn. Server lo sinh asset (Gemini) và dựng phim (ffmpeg).

## Yêu cầu

- Node ≥ 20, `ffmpeg` + `ffprobe` (`brew install ffmpeg`)
- `GEMINI_API_KEY`

```bash
cd scratch/omni
pnpm install --ignore-workspace
cp .env.example .env   # điền GEMINI_API_KEY
```

Server tự đọc `.env`. Biến truyền qua cấu hình MCP (`-e` / `env`) được ưu tiên hơn `.env`.

Mọi thứ nằm gọn trong repo:
- Code và `.env` ở `scratch/omni/`.
- Dự án phim lưu ở `scratch/omni/projects/`.
- Server được cài ở cấp dự án bằng `.mcp.json` ở gốc repo.

## Kết nối agent

**Claude Code**: đã khai báo sẵn trong `.mcp.json` ở gốc repo (scope project).
Mở Claude Code tại thư mục repo, chấp nhận server `film-studio` khi được hỏi, rồi kiểm tra bằng `/mcp`.
API key lấy từ `scratch/omni/.env`, nên `.mcp.json` không chứa bí mật nào.

Thêm thủ công cũng được, vẫn ở scope project và chạy từ gốc repo:

```bash
claude mcp add film-studio -s project -- node scratch/omni/src/server.js
```

**Codex**: thêm vào `~/.codex/config.toml`. Codex cần đường dẫn tuyệt đối, nhưng server vẫn đọc `.env` và lưu dự án trong repo.

```toml
[mcp_servers.film-studio]
command = "node"
args = ["/Users/dinhphong/Documents/Code/AI/VibeCode/browser-automation/scratch/omni/src/server.js"]
tool_timeout_sec = 120
```

Kết nối xong, agent tự đọc `instructions` của server và tool `studio_guide` để hiểu toàn bộ quy trình.
Nên bắt đầu bằng prompt có sẵn **`brainstorm_series`** (Claude Code: `/mcp__film-studio__brainstorm_series`).

## Tool

| Nhóm | Tool |
|---|---|
| Hướng dẫn | `studio_guide`, prompt `brainstorm_series`, prompt `write_episode` |
| Dự án | `project_create`, `project_list`, `project_get` |
| Series | `series_bible_save` (chủ đề, thế giới, kịch bản tổng quát, dàn ý các tập, nhạc chủ đề) |
| Nhân vật | `characters_save` (ngoại hình, tính cách, phụ kiện, giọng + bối cảnh lặp lại), `characters_generate` (character sheet), `references_review` |
| Tập | `episode_script_save` (kịch bản chi tiết + phân cảnh), `episode_get`, `scene_update`, `prompt_preview` |
| Sinh | `episode_audio_generate`, `storyboard_generate`, `storyboard_review`, `storyboard_approve`, `episode_videos_generate`, `music_generate` |
| Dựng | `episode_assemble`, `episode_run` (chạy nhiều bước), `asset_import` (dùng file của bạn) |
| Quota | `usage_report` (gom theo kind / model / purpose / episode / scene / day; `project_get` có tóm tắt) |
| Job | `job_status` (có `wait_sec`), `job_list` |

Các bước sinh chạy thành job nền vì video mất vài phút mỗi clip. Trạng thái thật lưu trong `project.json`,
nên restart server không mất kết quả.

## Các quyết định thiết kế

- **Nhất quán nhân vật.** Mỗi nhân vật có 1 character sheet (nhiều góc + toàn bộ phụ kiện), mỗi bối cảnh có 1 ảnh tham chiếu.
  Các ảnh này được đính kèm khi sinh từng ảnh phân cảnh.
- **Mọi tập dài như nhau.** Mặc định 3 phút, cho phép 3–8 phút.
  Lần đầu lưu kịch bản cho một tập, agent bắt buộc phải hỏi người dùng dùng độ dài mặc định hay chọn số phút khác; thiếu thì server từ chối.
  Server ước tính độ dài từ kịch bản, cảnh báo khi lệch quá 15%, và gợi ý thêm hoặc bớt bao nhiêu cảnh trước khi sinh video.
- **Storyboard trước, video sau.** Phải đủ ảnh của cả tập và đã duyệt thì mới được sinh video, để không tốn tiền video cho ảnh hỏng.
  Lệnh `episode_assemble(allow_stills=true)` cho xem nháp nhịp phim bằng ảnh tĩnh, miễn phí.
- **Âm thanh `auto` theo từng cảnh.** Người nói đang trong khung hình thì dùng tiếng do video tự sinh (khẩu hình khớp).
  Lời dẫn hoặc người nói ngoài khung hình thì dùng TTS xếp theo mốc phụ đề, và video được sinh dài đúng bằng thoại.
- **Chuyển cảnh.** Dùng xfade cho hình và acrossfade cho tiếng. Cảnh được kéo dài để chuyển cảnh không đè lên lời thoại.
- **Âm thanh cuối.** Nhạc nền lặp cho đủ dài và tự hạ khi có thoại (sidechain), chuẩn hoá -14 LUFS, fade đầu / cuối.
- **Đầu ra.** Mỗi tập ra `final.mp4` (H.264 / AAC, +faststart), `final.srt` (cũng nhúng thành track phụ đề mềm) và `cover.jpg`.
  Nếu ffmpeg có libass thì `burn_subtitles=true` sẽ đốt cứng phụ đề vào hình.

## Dashboard web

Khi agent kết nối `film-studio`, server mở thêm dashboard chỉ đọc tại **http://localhost:4747**, chỉ cho máy này truy cập. Trang có:
- dự án → các tập: độ dài mục tiêu / ước tính / thực tế, tiến độ ảnh / duyệt / thoại / video
- lưới storyboard: rê chuột để xem thử clip, bấm vào cảnh để xem ảnh, video, thoại, prompt và lỗi
- phát phim cuối, tải mp4 / .srt / ảnh bìa
- nhân vật và bối cảnh, quota theo tập, job đang chạy kèm log

Trang tự làm mới mỗi 4 giây mà không làm gián đoạn video đang phát.
Đổi cổng bằng `FILM_DASHBOARD_PORT` (`0` = tắt). Muốn mở riêng không cần MCP thì chạy `node src/dashboard/http.js`; khi đó không thấy job đang chạy.
Việc chat để làm phim vẫn diễn ra trong Claude Code / Codex (desktop, web hoặc Remote Control), dashboard dùng để theo dõi.

## Quota đã dùng

Mọi lần gọi API, kể cả lần lỗi, được ghi vào `projects/<id>/usage.jsonl` (mỗi dòng 1 lần gọi). Mỗi dòng gồm:
- loại, mục đích, tập, cảnh, model
- token (lấy từ `usage` của Gemini), số ảnh / giây video / giây âm thanh tạo ra
- thời gian chạy, số lần thử lại, lỗi nếu có

Xem lại bằng tool `usage_report` hoặc `node src/cli.js usage <project_id> [episode_id|-] [group_by]`.
Báo cáo có trường `regenerated`, là số lần sinh lại một thứ đã sinh thành công trước đó, tức quota tốn thêm do sửa hoặc làm lại.

Muốn ước tính chi phí thì copy `pricing.example.json` thành `pricing.json` rồi điền đơn giá
theo https://ai.google.dev/gemini-api/docs/pricing. Server không tự đoán giá.

## Biến môi trường

| Biến | Mặc định |
|---|---|
| `GEMINI_API_KEY` | (bắt buộc) |
| `FILM_PROJECTS_DIR` | `projects` (tức `scratch/omni/projects`; tương đối thì tính từ thư mục server) |
| `FILM_IMAGE_MODEL` / `FILM_VIDEO_MODEL` / `FILM_TTS_MODEL` / `FILM_MUSIC_MODEL` | `gemini-3.1-flash-image` / `gemini-omni-1.1-flash` / `gemini-3.8-flash-tts` / `lyria-3.5` |
| `FILM_VIDEO_MIN_SEC` / `FILM_VIDEO_MAX_SEC` | 4 / 10 (giới hạn của gemini-omni-1.1-flash) |
| `FILM_CONCURRENCY` | 3 |
| `FILM_PRICING_FILE` | `pricing.json` (bảng đơn giá để ước tính chi phí) |
| `HTTPS_PROXY` | hỗ trợ (fetch của Node mặc định bỏ qua biến này) |

## Test

```bash
node test/smoke-assemble.js   # dựng phim offline bằng asset giả (ffmpeg), không tốn API
node test/smoke-mcp.js        # đi hết luồng tool qua MCP client thật, không tốn API
GEMINI_API_KEY=... node test/live-cheap.js   # 1 câu TTS + 1 ảnh
GEMINI_API_KEY=... node test/live-refs.js    # character sheet + ảnh phân cảnh dùng sheet
GEMINI_API_KEY=... node test/live-usage.js   # sổ quota: ảnh, TTS sinh lại, 1 lần lỗi
```
