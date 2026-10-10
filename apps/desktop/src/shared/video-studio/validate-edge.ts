import type { VideoSocketDef } from '../types'

/**
 * Chỉ đúng type mới nối được (IMAGE→IMAGE, không IMAGE→VIDEO) — khác hẳn
 * WorkflowEdge của Automation (sourceHandle/targetHandle chỉ là nhãn nhánh
 * if/else, không mang khái niệm "kiểu dữ liệu"). Dùng cả ở renderer
 * (`isValidConnection` của React Flow, chặn lúc kéo) lẫn main process
 * (chặn lại trước khi chạy thật, phòng hờ — xem validate-pipeline-patch.ts).
 */
export function validateVideoEdge(source: VideoSocketDef | undefined, target: VideoSocketDef | undefined): boolean {
  if (!source || !target) return false
  return source.type === target.type
}
