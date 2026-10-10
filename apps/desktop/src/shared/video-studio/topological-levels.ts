/**
 * Kahn's algorithm theo TẦNG (level) thay vì 1 thứ tự phẳng — mỗi tầng là
 * tập phần tử không phụ thuộc NHAU (mọi upstream của nó đã ở tầng trước).
 * Dùng ở 2 nơi: main/video-studio/engine.ts (thứ tự thực thi — mỗi tầng
 * chạy song song thật, xem đó để biết tại sao) VÀ
 * renderer/.../apply-video-pipeline-patch.ts (layout canvas — 2 node cùng
 * tầng đặt cạnh nhau theo chiều dọc thay vì nối thành 1 hàng ngang giả
 * tuần tự). Generic thuần theo `id`/`source`/`target` để dùng được cả với
 * VideoNode/VideoEdge thật (id cố định) lẫn patch node/edge còn dùng id
 * tạm (chưa sinh id thật).
 *
 * FAN-IN (join): đếm inDegree theo SỐ CẠNH TĨNH trỏ vào mỗi node — đúng CHỈ
 * KHI mọi cạnh khai báo đều chắc chắn được kích hoạt (không có node điều
 * kiện/router chỉ chọn 1-trong-N nhánh ra). Video Studio hiện không có loại
 * node đó nên cách này an toàn — nếu sau này thêm node điều kiện, cách đếm
 * này SẼ DEADLOCK (chờ mãi 1 cạnh không bao giờ tới). Xem ADR-0003 trước
 * khi thêm node kiểu đó.
 */
export function topologicalLevels<T extends { id: string }>(
  items: T[],
  edges: { source: string; target: string }[]
): T[][] {
  const inDegree = new Map<string, number>(items.map((n) => [n.id, 0]))
  const dependents = new Map<string, string[]>(items.map((n) => [n.id, []]))

  for (const edge of edges) {
    if (!inDegree.has(edge.source) || !inDegree.has(edge.target)) continue
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1)
    dependents.get(edge.source)!.push(edge.target)
  }

  const byId = new Map(items.map((n) => [n.id, n]))
  const levels: T[][] = []
  let frontier = items.filter((n) => inDegree.get(n.id) === 0)
  let visitedCount = 0

  while (frontier.length > 0) {
    levels.push(frontier)
    visitedCount += frontier.length
    const next: T[] = []
    for (const item of frontier) {
      for (const depId of dependents.get(item.id) || []) {
        const remaining = (inDegree.get(depId) || 0) - 1
        inDegree.set(depId, remaining)
        if (remaining === 0) next.push(byId.get(depId)!)
      }
    }
    frontier = next
  }

  if (visitedCount !== items.length) {
    throw new Error('Đồ thị có vòng lặp (cycle) — không thể xác định thứ tự/tầng')
  }
  return levels
}
