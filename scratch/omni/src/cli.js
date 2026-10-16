#!/usr/bin/env node
// Chạy pipeline không qua MCP — tiện khi debug hoặc chạy lô lớn.
//   node src/cli.js status <project_id> [episode_id]
//   node src/cli.js run <project_id> <episode_id> [steps,...] [--force] [--no-approval] [--stills]
//   node src/cli.js assemble <project_id> <episode_id> [--stills]
//   node src/cli.js usage <project_id> [episode_id|-] [kind|model|purpose|episode|scene|day]
import * as pipeline from './pipeline.js'
import { assembleEpisode, runEpisode, STEPS } from './pipeline.js'
import { findEpisode, loadProject, summarize, summarizeEpisode } from './project.js'
import { usageReport } from './usage.js'

const [cmd, projectId, episodeId, ...rest] = process.argv.slice(2)
const flags = new Set(rest.filter((a) => a.startsWith('--')))
const log = (m) => console.log(`${new Date().toISOString().slice(11, 19)} ${m}`)
const print = (x) => console.log(JSON.stringify(x, null, 2))

if (cmd === 'status' && projectId) {
  const p = loadProject(projectId)
  print(episodeId ? summarizeEpisode(p, findEpisode(p, episodeId), pipeline) : summarize(p, pipeline))
} else if (cmd === 'run' && episodeId) {
  const steps = rest.find((a) => !a.startsWith('--'))?.split(',') || STEPS
  print(
    await runEpisode(projectId, episodeId, { steps, force: flags.has('--force'), requireApproval: !flags.has('--no-approval'), assembleOptions: { allowStills: flags.has('--stills') } }, log)
  )
} else if (cmd === 'usage' && projectId) {
  print(usageReport(projectId, { episodeId: episodeId && episodeId !== '-' ? episodeId : undefined, groupBy: rest[0] || 'kind' }))
} else if (cmd === 'assemble' && episodeId) {
  print(await assembleEpisode(projectId, episodeId, { allowStills: flags.has('--stills') }, log))
} else {
  console.error(`Dùng:\n  node src/cli.js usage <project_id> [episode_id|-] [group_by]\n  node src/cli.js status <project_id> [episode_id]\n  node src/cli.js run <project_id> <episode_id> [${STEPS.join(',')}] [--force] [--no-approval] [--stills]\n  node src/cli.js assemble <project_id> <episode_id> [--stills]`)
  process.exit(1)
}
