import fs from 'node:fs'
import path from 'node:path'
import { buildImagePrompt, sceneReferences } from './pipeline.js'
import { ensureDir, episodeDir, findEpisode, findScene, loadProject, projectDir, scenesOf } from './project.js'

/**
 * Ảnh "làm tay": người dùng tự tạo ảnh ở công cụ khác (ChatGPT, Midjourney…) bằng gói prompt server xuất ra,
 * tải về 1 thư mục đặt tên theo id, rồi server nhập hàng loạt. Không tự động hoá giao diện của dịch vụ nào.
 */

/** Chép ảnh tham chiếu vào refs/ của gói (đánh số, tên dễ đọc) để kéo-thả vào công cụ tạo ảnh. */
function packRefs(projectId, refsDir, files) {
  return files.map((file) => {
    const name = path.relative(projectDir(projectId), file).replaceAll(path.sep, '__')
    const dest = path.join(ensureDir(refsDir), name)
    if (!fs.existsSync(dest) || fs.statSync(dest).mtimeMs < fs.statSync(file).mtimeMs) fs.copyFileSync(file, dest)
    return dest
  })
}

function writePack(dir, title, intro, items) {
  ensureDir(dir)
  fs.writeFileSync(path.join(dir, 'prompts.json'), JSON.stringify(items, null, 2))
  const md = [
    `# ${title}`,
    '',
    intro,
    '',
    ...items.flatMap((it) => [
      `## ${it.file} — ${it.title}`,
      '',
      `Khung hình: **${it.aspect_ratio}**${it.references.length ? ` · Đính kèm: ${it.references.map((r) => `\`${path.basename(r)}\``).join(', ')}` : ' · Không cần đính kèm ảnh'}`,
      '',
      '```text',
      it.prompt,
      '```',
      ''
    ])
  ].join('\n')
  fs.writeFileSync(path.join(dir, 'prompts.md'), md)
  return { dir, prompts_md: path.join(dir, 'prompts.md'), prompts_json: path.join(dir, 'prompts.json'), refs_dir: path.join(dir, 'refs') }
}

const HOWTO = (folderHint) =>
  `Cách dùng: mỗi mục dán prompt vào công cụ tạo ảnh, đính kèm các ảnh trong \`refs/\` được ghi ở mục đó, ` +
  `tải ảnh về và đặt tên đúng như tiêu đề mục (đuôi png/jpg/webp đều được) vào 1 thư mục, rồi gọi ${folderHint}.`

/** Gói prompt storyboard cho 1 tập (mặc định: mọi cảnh chưa có ảnh). */
export function storyboardPack(projectId, episodeId, { sceneIds, all = false } = {}) {
  const project = loadProject(projectId)
  const ep = findEpisode(project, episodeId)
  const scenes = sceneIds?.length ? sceneIds.map((id) => findScene(ep, id)) : scenesOf(ep).filter((s) => all || !s.assets?.image)
  const dir = path.join(episodeDir(projectId, episodeId), 'manual')
  const items = scenes.map((s) => ({
    id: s.id,
    file: `${s.id}.png`,
    title: s.title || s.description || s.id,
    aspect_ratio: project.aspect_ratio,
    prompt: buildImagePrompt(project, s),
    references: packRefs(projectId, path.join(dir, 'refs'), sceneReferences(project, s))
  }))
  return {
    ...writePack(dir, `Storyboard ${project.title} — ${ep.id} ${ep.title || ''}`, HOWTO(`storyboard_import_folder(episode_id="${ep.id}", folder=...)`), items),
    scenes: items.map((it) => it.id)
  }
}
