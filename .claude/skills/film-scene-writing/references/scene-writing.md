# Viết cảnh cho film-studio

Schema đầy đủ: tool `episode_script_save` (`scenes[]`). Server tự ghép style dự án + ngoại hình/phụ kiện nhân vật + bối cảnh vào prompt — xem bằng `prompt_preview`.

## Ngữ pháp khung hình

| Cỡ cảnh | Dùng khi |
|---|---|
| Toàn cảnh (extreme wide / wide) | Mở bối cảnh mới, nhân vật nhỏ bé trước thử thách, kết hồi |
| Trung cảnh (medium) | Đối thoại, hành động có cử chỉ |
| Cận (close-up) | Cảm xúc, quyết định, câu thoại quan trọng |
| Đặc tả (extreme close-up) | Đạo cụ/manh mối, ánh mắt, chi tiết cài cắm |
| Qua vai (over-the-shoulder) | Đối thoại 2 người, giữ quan hệ không gian |
| POV | Đặt người xem vào mắt nhân vật, phát hiện |

| Góc máy | Nghĩa |
|---|---|
| Thấp (low angle) | Nhân vật mạnh, đe doạ |
| Cao (high angle) | Nhân vật nhỏ bé, yếu thế |
| Ngang mắt | Trung tính, đồng cảm |
| Nghiêng (dutch) | Bất an, mất cân bằng |

Quy tắc liên tục: giữ trục 180° trong đối thoại (A luôn bên trái, B bên phải); hướng chuyển động giữ nguyên qua các cảnh liền (đi trái→phải); hướng nhìn khớp giữa 2 cảnh qua vai.

Trước khi lưu, gom cảnh thành continuity block và lập ledger anchor/ảnh trước, trái-phải, look, ánh sáng, trạng thái nối. Quy trình sinh và cổng lỗi nằm ở [visual-continuity.md](../../film-production/references/visual-continuity.md); đây là nguồn canonical, không tạo từng ảnh độc lập.

## image_prompt — mẫu

`[cỡ cảnh], [góc máy]: [ai] [đang làm gì] [biểu cảm], [bố cục: tiền/hậu cảnh, vị trí trong khung], [ánh sáng + thời gian], [chi tiết đạo cụ quan trọng]`

> Cận cảnh, góc ngang mắt: Mai nắm chặt chiếc vòng bạc của mẹ, mắt đỏ hoe nhưng mím môi, tiền cảnh là ô cửa sổ mưa nhoè, ánh đèn vàng ấm từ trong nhà hắt lên mặt, hoàng hôn xanh lạnh bên ngoài

Không lặp ngoại hình/phụ kiện (server tự thêm). Không yêu cầu chữ trong hình.

**Đổi ngoại hình giữa tập** (thay đồ, trang điểm xong, bị thương): nhân vật phải có look tương ứng (`characters_save` → `looks`), rồi từ cảnh đổi trở đi ghi `"looks": { "<id nhân vật>": "<id look>" }`. Server dùng appearance + sheet của look đó thay dáng gốc. Đừng vá bằng "ĐÃ THAY ĐỒ…" trong image_prompt.

## video_prompt — mẫu

`[1 hành động chính, có điểm đầu → điểm cuối] + [1 chuyển động máy]`

> Mai từ từ mở bàn tay, chiếc vòng trượt xuống bàn; máy dolly in chậm vào mặt cô

Chuyển động máy: tĩnh · dolly in/out · pan trái/phải · tilt lên/xuống · orbit · tracking theo nhân vật · handheld (căng thẳng) · crane lên (kết hồi). 1 cảnh = 1 chuyển động máy. Hành động phải vừa 4–10s.

## Thoại

- 1–3 câu/cảnh; ≤ ~12 ký tự/giây (8s ≈ 90 ký tự gồm khoảng nghỉ). Dài hơn → tách cảnh, đổi góc máy (vd. A trung cảnh → B cận phản ứng).
- `speaker`: id nhân vật (đã khai báo) hoặc `"narrator"`.
- `style` (tiếng Anh, ngắn): `warm, storytelling` · `whispering, scared` · `shouting angrily` · `teasing, playful` · `cold, threatening` · `sobbing, broken` · `excited, fast` · `tired, sighing` · `sarcastic` · `gentle, reassuring`.
- `pause_before` 0.3–1.5s trước câu quan trọng/đáp trả bất ngờ.
- Viết số và từ viết tắt thành chữ ("hai giờ", không "2h").

## Chế độ âm thanh (audio_mode auto)

| Cảnh | Kết quả | Gợi ý |
|---|---|---|
| Mọi người nói đều có trong `characters` | native: video tự nói, khẩu hình khớp | Tốt cho đối thoại cận mặt |
| Có `narrator` hoặc người nói ngoài khung | tts: thoại đọc riêng, video dài đúng bằng thoại | Lời dẫn, giọng nói qua điện thoại, phản ứng người nghe |
| Không lời | tiếng gốc clip | Đặt `duration_sec` |

Muốn giọng nhân vật đồng nhất tuyệt đối giữa các tập → `audio_mode: "tts"` cho cảnh đó (đổi lại khẩu hình không khớp).

## Chuyển cảnh

| type | Dùng |
|---|---|
| `cut` | Mặc định trong cùng 1 nhịp, đối thoại qua lại, hành động nhanh |
| `fade` / `dissolve` 0.5–1s | Đổi thời gian/địa điểm, trôi cảm xúc |
| `fadeblack` 1–1.5s | Sang hồi mới, sau cao trào, trước cliffhanger |
| `fadewhite` | Hồi tưởng, giấc mơ, loé sáng |
| `wipe*` / `slide*` / `circleopen` | Phong cách vui nhộn/thiếu nhi |

Match-cut: khung đầu cảnh sau lặp hình khối/chuyển động khung cuối cảnh trước (bánh xe → mặt trăng) — ghi rõ trong 2 image_prompt.

## Ví dụ 4 cảnh (mở tập, 9:16, hook ≤3s)

```json
[
  { "id": "s01", "location": "cho-noi", "characters": ["miu"],
    "image_prompt": "Đặc tả, góc thấp: bàn chân mèo Miu run rẩy đứng mép ván gỗ ướt, mặt nước sông đục ngầu ngay dưới, ánh sáng sớm mờ sương",
    "video_prompt": "Tấm ván chao nghiêng, một giọt nước bắn lên; máy tĩnh", "duration_sec": 4 },
  { "id": "s02", "location": "cho-noi", "characters": ["miu"],
    "image_prompt": "Trung cảnh, ngang mắt: Miu bám chặt mạn ghe, mắt mở to nhìn sang ghe bên kia, giữa khung là khoảng nước rộng",
    "video_prompt": "Miu lùi một bước rồi dừng lại, hít sâu; máy dolly in chậm",
    "lines": [{ "speaker": "narrator", "text": "Miu ghét nước hơn bất cứ thứ gì trên đời.", "style": "warm, storytelling" }],
    "transition": { "type": "cut" } },
  { "id": "s03", "location": "cho-noi", "characters": ["miu", "ba-ca"],
    "image_prompt": "Qua vai Miu: bà Cá trên ghe bên kia giơ chiếc khăn len đỏ của mẹ Miu, cười nửa miệng",
    "video_prompt": "Bà Cá phẩy chiếc khăn qua lại như trêu; máy tĩnh",
    "lines": [{ "speaker": "ba-ca", "text": "Muốn lấy lại thì qua đây mà lấy, mèo con.", "style": "teasing, playful" }],
    "transition": { "type": "cut" } },
  { "id": "s04", "location": "cho-noi", "characters": ["miu"],
    "image_prompt": "Cận cảnh, ngang mắt: mặt Miu, sợ hãi chuyển dần thành quyết tâm, ánh nắng vừa xuyên qua sương",
    "video_prompt": "Miu nheo mắt, cụp tai rồi dựng tai lên; máy dolly in rất chậm",
    "lines": [{ "speaker": "miu", "text": "Đó là khăn của mẹ tớ.", "style": "quiet, determined", "pause_before": 0.6 }],
    "transition": { "type": "cut" } }
]
```

Vì sao hay: s01 hook bằng nguy hiểm tức thì + flaw (sợ nước) trong 4s; s02 lời dẫn duy nhất, có giọng; s03 đặt mục tiêu + đối thủ bằng đạo cụ; s04 quyết định nhân vật trong 1 câu ngắn có xưng hô ("tớ") lộ tuổi/tính cách.
