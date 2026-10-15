import { config } from './config.js'
import { TRANSITIONS } from './media.js'
import { EPISODE_DEFAULT_SEC, EPISODE_MAX_SEC, EPISODE_MIN_SEC } from './project.js'

const MIN = EPISODE_MIN_SEC / 60
const MAX = EPISODE_MAX_SEC / 60
const DEF = EPISODE_DEFAULT_SEC / 60

/** Giọng TTS dựng sẵn của Gemini (đọc được tiếng Việt). */
export const VOICES = [
  { name: 'Kore', tone: 'nữ, chắc, rõ ràng' },
  { name: 'Puck', tone: 'nam, vui tươi, trẻ' },
  { name: 'Charon', tone: 'nam, trầm, kể chuyện' },
  { name: 'Aoede', tone: 'nữ, nhẹ nhàng, thoáng' },
  { name: 'Fenrir', tone: 'nam, hào hứng, mạnh' },
  { name: 'Leda', tone: 'nữ, trẻ trung' },
  { name: 'Orus', tone: 'nam, chắc chắn' },
  { name: 'Zephyr', tone: 'nữ, tươi sáng' },
  { name: 'Callirrhoe', tone: 'nữ, thoải mái' },
  { name: 'Enceladus', tone: 'nam, thì thầm, hơi thở' },
  { name: 'Iapetus', tone: 'nam, rõ ràng' },
  { name: 'Algenib', tone: 'nam, khàn' },
  { name: 'Gacrux', tone: 'nữ, trưởng thành' },
  { name: 'Sulafat', tone: 'nữ, ấm áp' },
  { name: 'Achird', tone: 'nam, thân thiện' },
  { name: 'Schedar', tone: 'nam, đều đặn' }
]

export const GUIDE = `# Film Studio — MCP làm phim truyện nhiều tập

Biến ý tưởng thành phim (1 hoặc nhiều tập). Mỗi tập xuất ra 1 file mp4 hoàn chỉnh, đăng được ngay.
Bạn (agent) là biên kịch kiêm đạo diễn, làm việc CÙNG người dùng. Server lo phần sinh asset và dựng phim.

## Quy trình

### A. Cả dự án (làm 1 lần)
1. **Brainstorm với người dùng** trong cuộc trò chuyện: chủ đề, thế giới, tông, nhân vật, mạch truyện, chia tập.
   Hỏi lại người dùng ở những quyết định lớn, đừng tự quyết hết (có prompt mẫu \`brainstorm_series\`).
2. **project_create**: tên phim, khung hình (16:9 / 9:16), \`style\` hình ảnh chung, \`audio_mode\`.
3. **series_bible_save**: tiền đề, chủ đề, thế giới, tông, kịch bản tổng quát (story_arc), nhạc chủ đề, dàn ý các tập (tạo sẵn e01, e02...).
4. **characters_save**: mỗi nhân vật gồm ngoại hình cố định, tính cách, vai trò, **phụ kiện**, giọng đọc.
   Kèm các **bối cảnh lặp lại** (locations).
5. **characters_generate**: mỗi nhân vật 1 character sheet (nhiều góc + toàn bộ phụ kiện trong 1 ảnh), mỗi bối cảnh 1 ảnh.
   Xem bằng **references_review**. Chưa ưng thì sửa mô tả rồi sinh lại (\`ids\`, \`force\`).

### B. Mỗi tập
6. **HỎI NGƯỜI DÙNG độ dài tập** trước khi viết kịch bản: dùng độ dài chuẩn của dự án (mặc định ${DEF} phút)
   hay chọn từ ${MIN} đến ${MAX} phút. Các tập trong 1 dự án nên dài như nhau.
   **episode_script_save**: lưu kịch bản chi tiết (văn bản) + phân cảnh (scenes) theo thứ tự, kèm \`duration\` ("default" hoặc số phút).
   Lần đầu lưu 1 tập mà thiếu \`duration\` thì server từ chối. Kết quả trả về có \`duration.estimated\` so với \`duration.target\`.
   Nếu lệch quá 15% thì thêm / bớt cảnh rồi lưu lại, TRƯỚC khi sinh video.
7. **episode_audio_generate**: thoại TTS cho các cảnh cần (rẻ, nhanh). Biết độ dài thoại thì mới sinh video dài vừa đủ.
8. **storyboard_generate**: ảnh phân cảnh cho CẢ TẬP.
9. **storyboard_review**: xem ảnh cùng người dùng. Sửa bằng **scene_update** hoặc sinh lại
   (\`storyboard_generate\` với \`scene_ids\`, \`force\`), rồi **storyboard_approve**.
   *Nên* dùng **episode_assemble(allow_stills=true)** để xem nháp nhịp phim bằng ảnh tĩnh, việc này miễn phí.
10. **episode_videos_generate**: ảnh → video. Chỉ chạy khi tập đủ ảnh và đã duyệt. Đây là bước tốn tiền và thời gian nhất.
11. **music_generate**: nhạc nền của tập.
12. **episode_assemble**: ghép thành \`episodes/<id>/output/final.mp4\` (+ \`.srt\`, \`cover.jpg\`).

**episode_run** chạy nhiều bước liền nhau. Nên chạy 2 lượt: \`["references","audio","storyboard"]\` → duyệt → \`["videos","music","assemble"]\`.
Các bước sinh là job nền: tool trả \`job_id\`, theo dõi bằng **job_status**(job_id, wait_sec=50).
**project_get** / **episode_get** luôn cho biết thiếu gì, lỗi gì, và \`next_steps\`.
**prompt_preview** cho xem đúng prompt sẽ gửi tới model.
**usage_report** cho xem lại quota đã dùng (theo loại, model, tập, cảnh, ngày), gồm cả số lần sinh lại và lỗi. Báo cho người dùng sau mỗi đợt sinh lớn.

## Âm thanh: chọn nguồn tốt hơn cho từng cảnh (audio_mode)

- **auto** (mặc định), quyết định theo từng cảnh:
  - Mọi người nói đều có trong \`scene.characters\` (đang ở trong khung hình) → **native**: model video tự nói thoại,
    khẩu hình khớp, giọng hợp cảnh. Phụ đề được ước lượng theo độ dài câu.
  - Có lời dẫn (\`narrator\`) hoặc người nói ngoài khung hình → **tts**: mỗi câu đọc riêng bằng giọng nhân vật,
    xếp theo mốc thời gian (chính là phụ đề), video sinh dài đúng bằng thoại, tiếng gốc của clip giữ nhỏ làm âm thanh môi trường.
  - Cảnh không lời → tiếng gốc của clip (âm thanh môi trường).
- **tts** / **native**: ép một chế độ cho cả dự án, hoặc cho từng cảnh qua \`scene.audio_mode\`.
  Ép \`tts\` khi cần giọng nhân vật đồng nhất tuyệt đối giữa các tập. Ép \`native\` cho cảnh đối thoại cận mặt.

## Độ dài tập

- Mỗi tập dài ${MIN}–${MAX} phút, mặc định ${DEF} phút. Độ dài chuẩn của dự án đặt bằng \`episode_duration_min\`
  (project_create / series_bible_save). Từng tập chốt bằng \`duration\` trong episode_script_save.
- Lên kế hoạch số cảnh theo độ dài: cảnh trung bình 6–8s, nên **3 phút ≈ 22–30 cảnh**, 5 phút ≈ 40–50 cảnh, 8 phút ≈ 60–80 cảnh.
- Ước tính tính theo lượng thoại (~12 ký tự/giây) và \`duration_sec\` của cảnh không lời.
  Sau episode_audio_generate thì dùng độ dài thoại thật. Kiểm tra lại bằng episode_get.

## Viết cảnh tốt

- \`characters\` = nhân vật CÓ MẶT trong khung hình (ảnh hưởng ảnh tham chiếu VÀ chế độ âm thanh).
  \`location\` = id bối cảnh.
- \`image_prompt\` mô tả 1 khung hình điện ảnh: cỡ cảnh (toàn / trung / cận / đặc tả), góc máy, bố cục, ánh sáng,
  hành động, biểu cảm. KHÔNG cần lặp lại ngoại hình hay phụ kiện, server tự ghép từ characters_save và ảnh tham chiếu.
- \`video_prompt\` mô tả CHUYỂN ĐỘNG: 1 hành động rõ ràng + chuyển động máy (dolly in, pan, tilt, orbit, handheld, tĩnh).
- Clip dài ${config.videoMinSec}–${config.videoMaxSec}s. Mỗi cảnh nên có 1–3 câu thoại. Thoại dài thì tách cảnh và đổi góc máy.
- Muốn chuyển cảnh liền mạch thì cho khung đầu cảnh sau "bắt" khung cuối cảnh trước
  (cùng hướng chuyển động, cùng vị trí nhân vật, hoặc match-cut theo hình khối).
- \`lines[].style\` là thẻ cảm xúc ngắn **bằng tiếng Anh** ("warm, storytelling", "whispering, scared", "shouting angrily").
  Model TTS đọc to mọi chỉ dẫn tiếng Việt thành lời, nên style tiếng Việt bị từ chối.
  \`pause_before\` dùng để tạo khoảng lặng.

## Chuyển cảnh

\`scene.transition\` = { type, duration } là chuyển cảnh TỪ cảnh trước SANG cảnh này. Các type: ${TRANSITIONS.join(', ')}.
Gợi ý: \`cut\` cho đối thoại qua lại; \`fade\`/\`dissolve\` 0.5–1s khi đổi thời gian hoặc địa điểm;
\`fadeblack\` 1–1.5s khi sang hồi mới; \`wipe*\`/\`slide*\` cho phong cách vui nhộn.
Server tự kéo dài cảnh để chuyển cảnh không đè lên lời thoại (TTS), đồng thời crossfade cả âm thanh.

## Giọng đọc

${VOICES.map((v) => `- ${v.name}: ${v.tone}`).join('\n')}

Người dẫn chuyện dùng \`speaker: "narrator"\` (giọng đặt bằng \`narrator_voice\`).

## Âm thanh cuối

Nhạc nền được lặp cho đủ dài và tự hạ âm lượng khi có thoại (sidechain ducking), có fade vào / ra.
Toàn bộ được chuẩn hoá về -14 LUFS (chuẩn YouTube / TikTok / Facebook).

## Model

${Object.entries(config.models).map(([k, v]) => `- ${k}: ${v}`).join('\n')}
(đổi bằng FILM_IMAGE_MODEL / FILM_VIDEO_MODEL / FILM_TTS_MODEL / FILM_MUSIC_MODEL)

## Thư mục

\`${config.projectsDir}/<project_id>/\`: project.json, characters/, locations/,
episodes/<ep>/scenes/<sc>/{image, preview.jpg, line-XX.wav, audio.wav, video.mp4, segment.mp4},
episodes/<ep>/music/, episodes/<ep>/output/{final.mp4, final.srt, cover.jpg}
`

export const BRAINSTORM_PROMPT = ({ idea, episodes, platform }) => `Chúng ta sẽ cùng làm 1 dự án phim bằng MCP server "film-studio". Ý tưởng ban đầu: ${idea}
${episodes ? `Số tập dự kiến: ${episodes}. ` : ''}Nơi đăng: ${platform || 'chưa chốt'}.

Hãy làm như sau:
1. Gọi studio_guide.
2. BRAINSTORM CÙNG TÔI, đừng tự quyết hết. Mỗi lượt đưa 2–3 phương án ngắn gọn để tôi chọn hoặc góp ý:
   chủ đề và thông điệp → thế giới và tông phim → phong cách hình ảnh → dàn nhân vật (ngoại hình, tính cách, phụ kiện đặc trưng, giọng)
   → bối cảnh lặp lại → mạch truyện tổng quát → chia tập (tên + tóm tắt từng tập)
   → độ dài chuẩn mỗi tập: hỏi tôi dùng mặc định ${DEF} phút hay chọn ${MIN}–${MAX} phút (truyền episode_duration_min khi project_create).
3. Khi tôi chốt: project_create → series_bible_save → characters_save → characters_generate → references_review để duyệt cùng tôi.
4. Sau đó viết kịch bản chi tiết tập 1 (episode_script_save) và hỏi tôi trước khi sinh storyboard.
`

export const EPISODE_PROMPT = ({ project_id, episode_id }) => `Viết kịch bản chi tiết cho tập ${episode_id} của dự án ${project_id} (MCP "film-studio").
1. project_get(full=true) để đọc bible, nhân vật, bối cảnh, dàn ý các tập; episode_get với các tập trước để giữ liên tục.
2. HỎI TÔI độ dài tập này: dùng độ dài chuẩn của dự án hay chọn ${MIN}–${MAX} phút. Số cảnh phải đủ phủ độ dài đó (~6–8s / cảnh).
   Viết \`script\`: diễn biến chi tiết, hook trong 3–5 giây đầu, cao trào, kết (hoặc cliffhanger nếu còn tập sau).
3. Chia phân cảnh 4–10s/cảnh: mỗi cảnh có location, characters (ai có mặt trong khung hình), image_prompt (cỡ cảnh, góc máy),
   video_prompt (1 hành động + chuyển động máy), lines (thoại ngắn, tự nhiên), transition có chủ đích.
   Đa dạng cỡ cảnh; cảnh sau nối mạch hình ảnh với cảnh trước.
4. episode_script_save (kèm duration), xem duration.estimated so với target và chỉnh tới khi lệch dưới 15%, rồi tóm tắt cho tôi số cảnh, độ dài ước tính, cảnh nào dùng TTS / native, và hỏi trước khi sinh storyboard.
`
