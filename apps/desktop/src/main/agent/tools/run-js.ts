import { tool } from 'ai'
import { z } from 'zod'
import type { AgentToolContext } from './types'

const EXECUTION_TIMEOUT_MS = 10_000

/**
 * Runs arbitrary JS in the user's real, logged-in browser — the highest-risk
 * tool in the set. Gating happens one layer up, via `toolApproval: { run_js:
 * 'user-approval' }` on the ToolLoopAgent (agent-service.ts, Phase C); this
 * file has no knowledge of approval at all, it only executes once called.
 */
export function createRunJsTool(ctx: AgentToolContext) {
  return tool({
    description:
      'Chạy một đoạn JavaScript trong trang đang mở (qua page.evaluate) và trả về kết quả. "code" phải là một biểu thức JS đơn (vd: "document.title"), hoặc một IIFE nếu cần nhiều câu lệnh (vd: "(() => { const el = document.querySelector(\'.x\'); return el ? el.textContent : null })()"). CHỈ dùng để kiểm tra/xác nhận thông tin (vd: 1 phần tử có tồn tại, giá trị 1 biến) — không dùng để thực hiện hành động có tác dụng phụ (submit form, xoá dữ liệu) khi chưa chắc chắn người dùng muốn vậy. Luôn cần người dùng duyệt trước khi chạy thật. LƯU Ý: "ok: true" chỉ nghĩa là code không throw lỗi, KHÔNG phải bằng chứng hành động đã có tác dụng đúng — gọi take_screenshot ngay sau mỗi bước quan trọng (click, nhập liệu, submit...) để tự xác nhận bằng mắt trước khi báo thành công.',
    inputSchema: z.object({
      code: z.string().describe('Biểu thức hoặc IIFE JS chạy trong ngữ cảnh trang, phải trả về giá trị JSON-serializable')
    }),
    execute: async ({ code }) => {
      if (!ctx.page) {
        return { ok: false, error: 'Chưa có browser nào đang mở cho profile này. Gọi start_browser trước.' }
      }
      try {
        const result = await Promise.race([
          ctx.page.evaluate(code),
          new Promise((_resolve, reject) =>
            setTimeout(() => reject(new Error(`Timeout sau ${EXECUTION_TIMEOUT_MS / 1000}s`)), EXECUTION_TIMEOUT_MS)
          )
        ])
        return { ok: true, result: toSerializable(result) }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  })
}

function toSerializable(value: unknown): unknown {
  try {
    JSON.stringify(value)
    return value
  } catch {
    return String(value)
  }
}
