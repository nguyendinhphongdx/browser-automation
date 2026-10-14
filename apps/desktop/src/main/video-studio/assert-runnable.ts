import type { VideoNode } from '../../shared/types'

/**
 * Pipeline rỗng (0 node) hoặc thiếu node save-to-library vẫn "chạy" được —
 * topologicalLevels trả [] hoặc engine chạy xong hết các node khác mà không
 * lưu gì — executeVideoPipeline resolve bình thường như thể đã thành công,
 * dù thực ra chưa tạo/lưu được kết quả nào. Gọi hàm này TRƯỚC
 * executeVideoPipeline ở mọi call site (run_video_pipeline tool, nút "Chạy"
 * thủ công) để báo lỗi rõ ràng thay vì "completed" rỗng tuếch.
 */
export function assertPipelineRunnable(nodes: VideoNode[]): void {
  if (nodes.length === 0) {
    throw new Error('Pipeline không có node nào — không có gì để chạy.')
  }
  if (!nodes.some((n) => n.data.nodeType === 'save-to-library')) {
    throw new Error('Pipeline thiếu node "Lưu vào Thư viện" (save-to-library) — chạy xong sẽ không lưu được kết quả nào vào Thư viện.')
  }
}
