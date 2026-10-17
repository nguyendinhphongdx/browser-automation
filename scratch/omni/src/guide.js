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
   Nhân vật **đổi ngoại hình giữa phim** (trước/sau trang điểm, thay đồ cưới, bị thương) → khai báo \`looks\` (mỗi look có appearance đầy đủ + phụ kiện riêng),
   KHÔNG nhét trang phục mới vào phụ kiện (phụ kiện xuất hiện ở MỌI cảnh). Cảnh chọn look bằng \`scene.looks = { <nhân vật>: <look> }\`.
5. **characters_generate**: mỗi nhân vật 1 character sheet (nhiều góc + toàn bộ phụ kiện trong 1 ảnh), thêm 1 sheet cho mỗi look (sinh SAU sheet gốc và gửi kèm sheet gốc làm tham chiếu để giữ mặt + màu da; sinh lại sheet gốc thì nên sinh lại cả look: ids=[nhân vật], force), mỗi bối cảnh 1 ảnh.
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
13. **episode_publish_kit** (miễn phí): bộ đăng bài — tiêu đề, mô tả, chapter, hashtag, ảnh bìa, bản dọc 9:16 cho TikTok/Reels/Shorts.
    Duyệt cùng người dùng, hỏi \`made_for_kids\`. Đăng bằng MCP **publisher** (điền sẵn trong Chrome của người dùng, người dùng tự bấm Đăng).

**episode_run** chạy nhiều bước liền nhau. Nên chạy 2 lượt: \`["references","audio","storyboard"]\` → duyệt → \`["videos","music","assemble"]\`.
Các bước sinh là job nền: tool trả \`job_id\`, theo dõi bằng **job_status**(job_id, wait_sec=50).
**project_get** / **episode_get** luôn cho biết thiếu gì, lỗi gì, và \`next_steps\`.

**Làm phim không sửa code.** Chỉ dùng tool của MCP và sửa nội dung dự án qua tool. Không sửa code server hay sửa tay project.json.
Thiếu tính năng/server lỗi → dừng, nói rõ cho người dùng cái gì thiếu, đề xuất làm thành việc phát triển riêng.

**Chờ job thì báo từng phút.** Không kết lượt khi job còn chạy. Lặp job_status(wait_sec=50); sau mỗi lần báo 1 dòng: bước, \`progress.done\`/\`total\`, số lỗi, \`elapsed_sec\`, ước tính còn lại.

**Dẫn đường cho người dùng (bắt buộc).** Xong MỖI bước: tóm tắt kết quả (kèm quota vừa tốn) → đề xuất bước kế tiếp theo đúng quy trình trên, nói rõ chi phí →
hỏi người dùng duyệt (làm tiếp / sửa trước / dừng) → đồng ý thì làm luôn. Không dừng ở "bước tiếp theo là …" để người dùng tự đoán phải làm gì.
Bước tốn quota (character sheet, storyboard, video, nhạc) luôn hỏi lại kèm số ảnh/clip/giây, kể cả khi trước đó người dùng nói "cứ làm hết".
Xong \`episode_assemble\` → đề xuất đăng bài; đăng xong → lưu recap và đề xuất viết tập kế tiếp.
**prompt_preview** cho xem đúng prompt sẽ gửi tới model.
**usage_report** cho xem lại quota đã dùng (theo loại, model, tập, cảnh, ngày), gồm cả số lần sinh lại và lỗi. Báo cho người dùng sau mỗi đợt sinh lớn.

## Viết truyện (phần quyết định phim hay hay dở)

Ảnh/video đẹp không cứu được truyện dở. Trước khi sinh bất cứ thứ gì tốn tiền, truyện phải qua được các mục dưới.

- **Từ yêu cầu ngắn**: đừng hỏi dồn. Tự suy ra mặc định hợp lý (thể loại, khán giả, nền tảng, số tập, độ dài),
  ghi rõ là GIẢ ĐỊNH, đưa 2–3 concept khác nhau thật sự (khác xung đột, không chỉ khác tên) để người dùng chọn.
  Chỉ hỏi những gì không thể đoán: độ dài tập (bắt buộc), và điều gì người dùng đã ngầm muốn mà concept chưa thể hiện.
- **Logline**: nhân vật (có nét riêng) + mục tiêu cụ thể + trở ngại/đối thủ + cái giá nếu thất bại. Lưu \`logline\`, \`central_question\`, \`ending\`.
- **Nhân vật**: mỗi nhân vật chính có \`want\` (mục tiêu ngoài) ≠ \`need\` (bài học trong), \`flaw\` gây ra rắc rối,
  \`arc\` thay đổi qua series, \`speech_style\` (xưng hô, câu cửa miệng) để thoại không ai giống ai. Phản diện có lý lẽ riêng.
- **Mỗi tập là 1 truyện trọn**: \`hook\` 3–5 giây đầu → mục tiêu của tập → leo thang ít nhất 2 lần → điểm ngoặt → cao trào
  do CHÍNH nhân vật chính quyết định → \`cliffhanger\` (hoặc payoff ở tập cuối). Lưu thành \`beats\`.
- **Liên tục giữa các tập**: gọi **story_context**(episode_id) trước khi viết; viết xong lưu \`recap\` (cái gì đã đổi, tuyến còn treo).
  Gieo cài cắm (setup) sớm, trả (payoff) muộn; không để tuyến nào treo mãi.
- **Phim ngắn 3–8 phút**: không có chỗ cho cảnh thừa. Mỗi cảnh phải đẩy truyện hoặc lộ nhân vật — không thì cắt.
  "Show, don't tell": để hành động và hình ảnh kể, lời dẫn chỉ dùng khi thật cần. Thoại ngắn, có ẩn ý, đúng xưng hô.

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
episodes/<ep>/music/, episodes/<ep>/output/{final.mp4, final.srt, cover.jpg},
episodes/<ep>/publish/{publish.json, <nền tảng>.txt, thumbnail.jpg, vertical.mp4, ...}
`

export const BRAINSTORM_PROMPT = ({ idea, episodes, platform }) => `Chúng ta sẽ cùng làm 1 dự án phim bằng MCP server "film-studio". Ý tưởng ban đầu: ${idea}
${episodes ? `Số tập dự kiến: ${episodes}. ` : ''}Nơi đăng: ${platform || 'chưa chốt'}.

Hãy làm như sau:
1. Gọi studio_guide, đọc kỹ mục "Viết truyện".
2. Ý tưởng có thể rất ngắn — ĐỪNG hỏi dồn. Tự suy ra mặc định (thể loại, khán giả, nền tảng, số tập) và ghi rõ là giả định.
   Đưa 2–3 CONCEPT khác nhau thật sự, mỗi concept: logline, xung đột trung tâm, nhân vật chính (want/need/flaw), tông + phong cách hình ảnh,
   vì sao người xem sẽ xem tới cuối. Kèm đề xuất của bạn. Hỏi tôi chọn concept và độ dài mỗi tập
   (mặc định ${DEF} phút hay ${MIN}–${MAX} phút — truyền episode_duration_min khi project_create).
3. Khi tôi chọn: phát triển bible — logline, central_question, ending, thế giới + luật, mạch truyện, dàn nhân vật
   (ngoại hình cố định, tính cách, want/need/flaw/arc, speech_style, phụ kiện, giọng), bối cảnh lặp lại,
   dàn ý từng tập (hook, beats, cliffhanger). Tự soát: mỗi tập có leo thang + điểm ngoặt? nhân vật chính tự quyết cao trào? tuyến nào bị treo?
4. Trình bày gọn cho tôi duyệt, rồi: project_create → series_bible_save → characters_save → characters_generate → references_review.
5. Sau đó viết kịch bản chi tiết tập 1 (prompt write_episode) và hỏi tôi trước khi sinh storyboard.
`

export const EPISODE_PROMPT = ({ project_id, episode_id }) => `Viết kịch bản chi tiết cho tập ${episode_id} của dự án ${project_id} (MCP "film-studio").
1. story_context(project_id, episode_id) — đọc hồ sơ nhân vật, dàn ý, recap + đoạn kết tập trước, ngân sách số cảnh.
   Tập trước thiếu recap thì tóm tắt và lưu recap cho tập đó trước.
2. HỎI TÔI độ dài tập này nếu chưa chốt (target_confirmed=false): độ dài chuẩn của dự án hay ${MIN}–${MAX} phút.
3. Beat sheet trước, cảnh sau: hook (3–5s đầu) → mục tiêu của tập → leo thang ×2+ → điểm ngoặt → cao trào do nhân vật chính quyết → cliffhanger/payoff.
   Gán mỗi nhịp 1 khoảng thời gian; tổng = độ dài mục tiêu.
4. \`script\`: kịch bản chi tiết dạng văn bản (để người đọc). Rồi chia phân cảnh 4–10s/cảnh: location, characters (ai có mặt trong khung hình),
   image_prompt (cỡ cảnh, góc máy, bố cục, ánh sáng, biểu cảm), video_prompt (1 hành động + chuyển động máy),
   lines (1–3 câu/cảnh, đúng speech_style của từng nhân vật, có ẩn ý), transition có chủ đích. Đa dạng cỡ cảnh; cảnh sau nối mạch hình ảnh cảnh trước.
5. Tự soát trước khi lưu: cảnh nào không đẩy truyện thì cắt; thoại nào nói thẳng cảm xúc thì đổi thành hành động; nhân vật có nói đúng giọng không.
6. episode_script_save (kèm duration, hook, beats, cliffhanger, recap), chỉnh tới khi duration.estimated lệch target dưới 15%,
   rồi tóm tắt cho tôi: beat sheet, số cảnh, độ dài ước tính, cảnh TTS / native — và hỏi trước khi sinh storyboard.
`
