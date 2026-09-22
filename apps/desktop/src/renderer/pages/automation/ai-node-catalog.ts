// Renderer-side mirror of the config-field shape from
// apps/desktop/src/main/automation/node-definitions.ts (not imported directly —
// that file pulls in main-process-only types). Kept intentionally loose since
// `nodeDefinitions` arrives over IPC as plain JSON (see workflow-store.ts).
export interface AIConfigField {
  key: string
  label: string
  type: string
  options?: { label: string; value: string }[]
  defaultValue?: unknown
  required?: boolean
}

export interface AINodeDefinition {
  type: string
  label: string
  category: string
  description: string
  configSchema?: AIConfigField[]
}

const BRANCHING_RULES = `QUY TẮC RẼ NHÁNH (sourceHandle của edges):
- "if-else", "element-exists": phải có đúng 2 edge đi ra với sourceHandle lần lượt là "true" và "false".
- "loop", "loop-each": phải có edge với sourceHandle "body" (thân vòng lặp) và "done" (sau khi vòng lặp kết thúc).
- "try-catch": phải có edge với sourceHandle "try" (nhánh thử) và "catch" (nhánh bắt lỗi). LƯU Ý: không dùng "body" cho try-catch.
- "parallel-fork": tối đa 4 edge đi ra (theo config.branches), tất cả nên hội tụ vào một node "parallel-join" phía sau.
- Bất kỳ node nào cũng có thể có thêm 1 edge phụ với edgeType "on-error" để xử lý khi node đó lỗi.
- Các node khác (không thuộc danh sách trên) chỉ có 1 edge đi ra bình thường, không cần sourceHandle.`

function renderConfigField(field: AIConfigField): string {
  const parts = [`${field.key} (${field.type}${field.required ? ', bắt buộc' : ''})`]
  if (field.options?.length) {
    parts.push(`giá trị hợp lệ: ${field.options.map((o) => o.value).join(' | ')}`)
  }
  if (field.defaultValue !== undefined) {
    parts.push(`mặc định: ${JSON.stringify(field.defaultValue)}`)
  }
  return `    - ${parts.join(' — ')}`
}

/**
 * Builds the full node catalog block for the AI system prompt: every node
 * type's config schema (so the model knows which config keys/values are
 * valid) plus the sourceHandle rules branching nodes require.
 */
export function buildNodeCatalog(nodeDefinitions: AINodeDefinition[]): string {
  const entries = nodeDefinitions.map((n) => {
    const header = `- ${n.type}: ${n.label} (${n.category}) — ${n.description}`
    if (!n.configSchema || n.configSchema.length === 0) return header
    return [header, ...n.configSchema.map(renderConfigField)].join('\n')
  })

  return `${entries.join('\n')}\n\n${BRANCHING_RULES}`
}
