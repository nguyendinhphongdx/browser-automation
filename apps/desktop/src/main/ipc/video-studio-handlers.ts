import type { IpcMain } from 'electron'
import {
  getAllVideoPipelines, getVideoPipelineById, createVideoPipeline, updateVideoPipeline, deleteVideoPipeline
} from '../services/video-pipeline-service'
import { createVideoPipelineRun, updateVideoPipelineRun } from '../services/video-job-service'
import { VIDEO_NODE_DEFINITIONS } from '../video-studio/node-definitions'
import { executeVideoPipeline } from '../video-studio/engine'
import type { VideoExecutionContext } from '../video-studio/nodes/base-node'
import type { LogEntry } from '../../shared/types'

const runningRuns = new Map<string, { aborted: boolean }>()

export function registerVideoStudioHandlers(ipcMain: IpcMain) {
  ipcMain.handle('video-studio:getNodeDefinitions', () => VIDEO_NODE_DEFINITIONS)

  ipcMain.handle('video-studio:getAll', () => getAllVideoPipelines())
  ipcMain.handle('video-studio:get', (_e, id: string) => getVideoPipelineById(id))
  ipcMain.handle('video-studio:create', (_e, data) => createVideoPipeline(data))
  ipcMain.handle('video-studio:update', (_e, id: string, data) => updateVideoPipeline(id, data))
  ipcMain.handle('video-studio:delete', (_e, id: string) => deleteVideoPipeline(id))

  ipcMain.handle('video-studio:run', async (event, pipelineId: string) => {
    const pipeline = getVideoPipelineById(pipelineId)
    if (!pipeline) throw new Error('Không tìm thấy pipeline')

    const run = createVideoPipelineRun(pipelineId)
    runningRuns.set(run.id, { aborted: false })
    const logs: LogEntry[] = []
    const sender = event.sender

    sender.send('video-studio:status', { runId: run.id, pipelineId, status: 'running' })

    const ctx: VideoExecutionContext = {
      runId: run.id,
      pipelineId,
      log: (message: string) => {
        logs.push({ timestamp: new Date().toISOString(), level: 'info', message })
      },
      onNodeStart: (nodeId) => sender.send('video-studio:node-progress', { runId: run.id, nodeId, status: 'running' }),
      onNodeProgress: (nodeId, percent) =>
        sender.send('video-studio:job-progress', { runId: run.id, nodeId, percent }),
      onNodeDone: (nodeId) => sender.send('video-studio:node-progress', { runId: run.id, nodeId, status: 'done' }),
      onNodeError: (nodeId, error) =>
        sender.send('video-studio:node-progress', { runId: run.id, nodeId, status: 'error', error })
    }

    try {
      await executeVideoPipeline(pipeline.nodes, pipeline.edges, ctx)
      updateVideoPipelineRun(run.id, 'completed', JSON.stringify(logs), new Date().toISOString())
      sender.send('video-studio:status', { runId: run.id, pipelineId, status: 'completed' })
      return { runId: run.id, status: 'completed' }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logs.push({ timestamp: new Date().toISOString(), level: 'error', message })
      updateVideoPipelineRun(run.id, 'error', JSON.stringify(logs), new Date().toISOString())
      sender.send('video-studio:status', { runId: run.id, pipelineId, status: 'error', error: message })
      return { runId: run.id, status: 'error', error: message }
    } finally {
      runningRuns.delete(run.id)
    }
  })
}
