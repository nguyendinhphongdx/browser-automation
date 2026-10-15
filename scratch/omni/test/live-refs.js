// Gọi thật: 1 character sheet có phụ kiện + 1 ảnh phân cảnh đính kèm sheet đó. Cần GEMINI_API_KEY.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
process.env.FILM_PROJECTS_DIR = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'film-live-'))
const { createProject, updateProject, loadProject, abs } = await import('../src/project.js')
const pl = await import('../src/pipeline.js')
const p = createProject({ title: 'Live', style: 'anime 2D, màu nước' })
await updateProject(p.id, (pr) => {
  pr.characters = [{ id: 'son-tinh', name: 'Sơn Tinh', appearance: 'thanh niên vạm vỡ, áo choàng xanh lá, tóc búi cao', personality: 'điềm tĩnh, kiên định', accessories: [{ name: 'gậy thần', description: 'gỗ lim khắc hoa văn núi, đầu gậy có viên ngọc xanh' }], voice: 'Orus' }]
  pr.episodes = [{ id: 'e01', number: 1, title: 't', scenes: [{ id: 's01', characters: ['son-tinh'], image_prompt: 'trung cảnh, Sơn Tinh đứng trên đỉnh núi mây phủ lúc bình minh, giơ gậy thần lên trời', assets: {} }] }]
})
const log = (m) => console.log('  ·', m)
console.log(JSON.stringify(await pl.generateReferences(p.id, {}, log)))
console.log(JSON.stringify(await pl.generateStoryboard(p.id, 'e01', {}, log)))
const pr = loadProject(p.id)
console.log('sheet:', abs(p.id, pr.characters[0].reference_image))
console.log('scene:', abs(p.id, pr.episodes[0].scenes[0].assets.image))
