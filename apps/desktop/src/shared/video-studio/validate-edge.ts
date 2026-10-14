import type { VideoSocketDef, VideoSocketType } from '../types'

/**
 * Chỉ đúng type mới nối được (IMAGE→IMAGE, không IMAGE→VIDEO) — khác hẳn
 * WorkflowEdge của Automation (sourceHandle/targetHandle chỉ là nhãn nhánh
 * if/else, không mang khái niệm "kiểu dữ liệu"). Dùng cả ở renderer
 * (`isValidConnection` của React Flow, chặn lúc kéo) lẫn main process
 * (chặn lại trước khi chạy thật, phòng hờ — xem validate-pipeline-patch.ts).
 *
 * target.type có thể là mảng (vd save-to-library's "media" nhận cả IMAGE
 * lẫn VIDEO) — source.type luôn là 1 giá trị đơn (1 output chỉ phát ra đúng
 * 1 kiểu), chỉ cần nằm trong danh sách target chấp nhận là nối được.
 */
export function validateVideoEdge(source: VideoSocketDef | undefined, target: VideoSocketDef | undefined): boolean {
  if (!source || !target) return false
  if (Array.isArray(source.type)) return false // output không bao giờ là mảng, phòng hờ dữ liệu sai
  const acceptedTypes: VideoSocketType[] = Array.isArray(target.type) ? target.type : [target.type]
  return acceptedTypes.includes(source.type)
}
