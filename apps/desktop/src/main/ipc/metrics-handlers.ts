import type { IpcMain } from 'electron'
import {
  getNodeStats,
  getNodeInstanceStats,
  getExecutionHistory,
  cleanupOldMetrics
} from '../services/metrics-service'

export function registerMetricsHandlers(ipcMain: IpcMain) {
  ipcMain.handle('metrics:nodeStats', (_e, workflowId: string) => {
    return getNodeStats(workflowId)
  })

  ipcMain.handle('metrics:nodeInstanceStats', (_e, workflowId: string, nodeId: string) => {
    return getNodeInstanceStats(workflowId, nodeId)
  })

  ipcMain.handle('metrics:executionHistory', (_e, opts?: {
    workflowId?: string
    status?: string
    limit?: number
    offset?: number
  }) => {
    return getExecutionHistory(opts)
  })

  ipcMain.handle('metrics:cleanup', (_e, retentionDays?: number) => {
    const deleted = cleanupOldMetrics(retentionDays)
    return { deleted }
  })
}
