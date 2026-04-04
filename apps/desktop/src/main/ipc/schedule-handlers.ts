import type { IpcMain } from 'electron'
import {
  getAllSchedules, getScheduleById, createSchedule, updateSchedule, deleteSchedule
} from '../services/schedule-service'
import { triggerSchedule } from '../automation/scheduler'
import { getWebhookPort } from '../automation/webhook-server'
import type { CreateScheduleInput } from '../../shared/types'

export function registerScheduleHandlers(ipcMain: IpcMain) {
  ipcMain.handle('schedule:getAll', () => getAllSchedules())

  ipcMain.handle('schedule:get', (_e, id: string) => getScheduleById(id))

  ipcMain.handle('schedule:create', (_e, input: CreateScheduleInput) => createSchedule(input))

  ipcMain.handle('schedule:update', (_e, id: string, input: any) => {
    const result = updateSchedule(id, input)
    if (!result) throw new Error('Schedule not found')
    return result
  })

  ipcMain.handle('schedule:delete', (_e, id: string) => {
    deleteSchedule(id)
    return { success: true }
  })

  ipcMain.handle('schedule:toggle', (_e, id: string, enabled: boolean) => {
    const result = updateSchedule(id, { enabled })
    if (!result) throw new Error('Schedule not found')
    return result
  })

  ipcMain.handle('schedule:trigger', async (_e, id: string) => {
    const schedule = getScheduleById(id)
    if (!schedule) throw new Error('Schedule not found')
    await triggerSchedule(schedule)
    return { success: true }
  })

  ipcMain.handle('schedule:webhookPort', () => getWebhookPort())
}
