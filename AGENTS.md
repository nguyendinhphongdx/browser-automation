# AGENTS.md — BrowserAuto

> Nguồn duy nhất cho mọi coding agent (Claude Code, Cursor, Codex…) làm việc trong repo. `CLAUDE.md` chỉ là pointer sang file này.

## Repo là gì

- **Tên**: BrowserAuto — nền tảng quản lý nhiều browser profile (fingerprint riêng biệt), xây automation bằng kéo-thả/code/AI agent, chia sẻ qua marketplace.
- **Loại**: TypeScript monorepo (pnpm workspaces + Turborepo), GitHub (`nguyendinhphongdx/browser-automation`).
- **Node** ≥ 22, **pnpm** ≥ 10 (không dùng npm/yarn).
- **Trạng thái**: đang trong giai đoạn xây **harness kiến trúc đích** (`docs/conventions/`, `docs/adr/`) trước khi refactor code hiện tại sang đó — xem [docs/conventions/00-tong-quan.md](docs/conventions/00-tong-quan.md) để hiểu vì sao và [Quy tắc cứng](#quy-tắc-cứng) #2 dưới đây.

## Layout

```text
apps/desktop/   Electron + React + Vite + Playwright-core + better-sqlite3 — nơi mọi automation thực sự chạy, offline-first
apps/server/    Next.js 16 App Router — lớp cloud TUỲ CHỌN: auth, backup/sync profile, marketplace (Stripe). KHÔNG chạy automation.
packages/shared-types/   Type TS dùng chung desktop ↔ server, zero-dep
packages/fingerprint/    Sinh + inject fingerprint chống phát hiện
docs/           architecture/ (hiện trạng) · conventions/ (đích) · adr/ (vì sao) · development/ (quy trình contributor) · user-guide/ (end-user)
.claude/        skills/ (mỏng, trỏ vào docs/) · skills/film-* + commands/ + agents/script-doctor cho Film Studio
scratch/omni/   Film Studio MCP server (kịch bản → mp4, Gemini + ffmpeg) — xem scratch/omni/README.md
```

Mỗi app/package có `CLAUDE.md` riêng khi cần context hẹp (vd `apps/server/CLAUDE.md` → cảnh báo Next.js 16 breaking change) — đọc trước khi sửa code trong đó, convention package-level thắng nếu xung đột với root.

## Đọc gì trước khi làm

| Câu hỏi | Đọc ở đâu |
|---|---|
| Hiện trạng code vùng X đang thế nào (file, luồng, schema) | [docs/architecture/](docs/architecture/) |
| Vùng này NÊN viết theo layer/pattern gì, đặt file ở đâu | [docs/conventions/](docs/conventions/) |
| Vì sao 1 quyết định kiến trúc được chọn (và đã cân nhắc gì khác) | [docs/adr/](docs/adr/) |
| Cách thêm node/tool/trang/IPC handler mới, chạy test | [docs/development/](docs/development/) |
| Tính năng dùng ra sao (góc nhìn người dùng cuối) | [docs/user-guide/](docs/user-guide/) |
| Thuật ngữ | [docs/glossary.md](docs/glossary.md) |

> **Đừng suy diễn pattern từ kiến thức framework chung** — repo có quyết định riêng (vd Registry cho mọi "nhiều loại chọn theo tên string", 2 lớp validate cho patch do AI đề xuất). Đọc convention + 1 file reference template thật trước khi code tương tự. Skill `docs-read` định vị nhanh.

## Conventions

- **Lock file**: `pnpm-lock.yaml`. Không commit `package-lock.json`/`yarn.lock`.
- **TS**: `@typescript-eslint/no-explicit-any` bật ở `apps/desktop` — tránh `any` khi tránh được.
- **Commit**: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`...).
- **IPC/main process không hot-reload** — sửa gì trong `main/` cần restart hẳn `pnpm desktop:dev`; chỉ `renderer/` có Vite HMR.

## Quy tắc cứng

1. Pattern "nhiều loại, chọn theo tên string" (node/provider/tool) → **Registry**, thêm loại mới = thêm file + 1 dòng đăng ký, KHÔNG sửa engine/dispatcher điều phối chung.
2. `docs/conventions/` mô tả **kiến trúc ĐÍCH** — code hiện tại CHƯA chắc khớp (refactor là việc sau). Thấy lệch → không tự "tiện thể sửa luôn" trong 1 PR nhỏ; nêu rõ lệch, hỏi có nên refactor khu vực đó không.
3. Domain trong `main/` chỉ lộ ra ngoài qua **service file** của nó (`services/<domain>-service.ts`) — domain khác chỉ được import từ đó, không import thẳng node class/provider nội bộ của domain khác. Xem [docs/conventions/03-domain-boundaries.md](docs/conventions/03-domain-boundaries.md).
4. `renderer/components/` không bao giờ import từ `renderer/pages/` — chỉ chiều ngược lại. Xem [docs/conventions/02-renderer-layering.md](docs/conventions/02-renderer-layering.md).
5. Quyết định kiến trúc không obvious (đổi layering, thêm lib core, đổi pattern) → viết ADR (skill `adr-write`) trước khi code lệch convention hiện có.
6. Không tăng thêm lỗi typecheck/lint so với baseline hiện tại khi mở PR (baseline ≠ 0, có nợ kỹ thuật cũ — nhưng code mới không được cộng thêm).

## What NOT to do

- ❌ Ghi `docs/conventions/` thành bản chép hiện trạng khi hiện trạng còn lệch — hạ chuẩn đích xuống bằng code cũ là làm sai mục đích cây docs này.
- ❌ Tạo component dùng chung bên trong `renderer/pages/<feature>/` rồi import ngược sang `components/` — lỗi thật đã gặp, xem [docs/conventions/02](docs/conventions/02-renderer-layering.md).
- ❌ Tách `Window.api` bằng nhiều `declare global { interface Window {...} } }` riêng — đã thử, lỗi `TS2717` (TS không merge khác type cùng field). Xem [ADR-0001](docs/adr/0001-window-api-composition.md).
- ❌ Thêm `.claude/agents/` tuỳ biến cho việc code khi Plan/Explore built-in đã đủ (YAGNI). Ngoại lệ có chủ đích: `script-doctor` — biên tập kịch bản độc lập cho Film Studio (người viết tự chấm bài mình thì không khách quan).
- ❌ Lặp nội dung giữa `architecture/`/`conventions/`/`adr/` — mỗi chủ đề có đúng 1 nơi canonical, chỗ khác chỉ link sang.

## Writing rule (mọi docs trong repo)

**Đủ dùng, không lan man.** Bảng + code block > văn xuôi dài. Mỗi chủ đề 1 nơi canonical. Theo đúng convention NGẮN đã có của `docs/` (xem file bất kỳ trong `docs/architecture/` làm mẫu: H1 → link về mục lục → nội dung → "Đọc tiếp"). Khi nghi ngờ, viết ít hơn.

## Skills available (`.claude/skills/`)

| Skill | Khi dùng |
|---|---|
| `arch-check` | **Trước khi code** 1 domain/node/provider/tool/trang mới ("đặt ở đâu, pattern gì") — hoặc **trước khi commit** để kiểm tra diff có phá domain boundary/components-pages/Window.api rule không |
| `scaffold` | **Sinh file khung thật** cho 1 node/provider/tool/domain mới — đúng pattern + đăng ký registry, để TODO cho logic |
| `docs-read` | "Docs nào nói về X" — định vị đúng file trong `architecture/`/`conventions/`/`adr/`, trả kèm link |
| `docs-write` | Tạo 1 trang docs mới đúng số thứ tự + template, đúng cây (`architecture`/`conventions`/`development`/`user-guide`) |
| `adr-write` | Tạo ADR mới từ `docs/adr/_template.md`, numbering kế tiếp, mặc định status Proposed |

### Film Studio (`scratch/omni`, MCP `film-studio` + `publisher`)

| Skill / lệnh | Khi dùng |
|---|---|
| `film-story-craft` · `/film-new <ý tưởng>` | Phim mới từ 1 câu: concept → bible → nhân vật → dàn ý tập, lưu vào film-studio |
| `film-scene-writing` · `/film-write <project> [tập]` | Kịch bản chi tiết + phân cảnh 1 tập, giữ liên tục qua `story_context` + `recap` |
| agent `script-doctor` · `/film-review <project> [tập]` | Chấm bible/kịch bản theo rubric, trả danh sách sửa theo mức độ |
| `film-production` · `/film-make <project> <tập>` | Sinh asset tới final.mp4, có cổng xác nhận chi phí |
| `film-publish` · `/film-publish <project> <tập>` | Bộ đăng bài (tiêu đề, mô tả, chapter, hashtag, bản dọc 9:16) → MCP `publisher` điền sẵn trong Chrome của user, user tự bấm Đăng; mặc định riêng tư |
| `/film-status [project]` | Tiến độ + quota |

Kiến thức nghề truyện nằm 1 chỗ: `.claude/skills/film-story-craft/references/` — skill khác và `script-doctor` link sang, không chép lại.
Bản đồ quy trình + luật "kết mỗi bước" (tóm tắt → đề xuất bước kế + chi phí → hỏi duyệt → đồng ý thì làm luôn): `references/pipeline.md` — mọi skill/lệnh film-* theo nó. Việc code vẫn dùng Plan/Explore built-in.

## Checklist trước khi commit

- [ ] `pnpm --filter @browser-automation/desktop typecheck` / `lint` / `exec vitest run` xanh (không tăng lỗi so với baseline)
- [ ] Nếu đổi quyết định kiến trúc → có ADR tương ứng, status đã confirm với user
- [ ] Nếu thêm domain/pattern mới → có nêu trong `docs/conventions/` nếu lệch cái đã viết
- [ ] Không có `.env`/secret trong staged
- [ ] Commit message theo Conventional Commits
