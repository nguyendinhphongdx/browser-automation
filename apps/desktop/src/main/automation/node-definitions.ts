import type { NodeCategory } from '../../shared/types'

export interface NodeDefinition {
  type: string
  label: string
  category: NodeCategory
  description: string
  inputs: number
  outputs: number
  configSchema: ConfigField[]
}

export interface ConfigField {
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'boolean' | 'code' | 'selector'
  placeholder?: string
  options?: { label: string; value: string }[]
  defaultValue?: any
  required?: boolean
}

export const NODE_DEFINITIONS: NodeDefinition[] = [
  // ── Browser ──────────────────────────────────
  {
    type: 'open-page',
    label: 'Mở trang',
    category: 'browser',
    description: 'Mở URL trong trình duyệt',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'url', label: 'URL', type: 'text', placeholder: 'https://example.com', required: true }
    ]
  },
  {
    type: 'navigate',
    label: 'Điều hướng',
    category: 'browser',
    description: 'Điều hướng: quay lại, tiến, làm mới',
    inputs: 1,
    outputs: 1,
    configSchema: [
      {
        key: 'action', label: 'Hành động', type: 'select',
        options: [
          { label: 'Quay lại', value: 'back' },
          { label: 'Tiến', value: 'forward' },
          { label: 'Làm mới', value: 'reload' }
        ],
        defaultValue: 'back'
      }
    ]
  },
  {
    type: 'close-tab',
    label: 'Đóng tab',
    category: 'browser',
    description: 'Đóng tab hiện tại',
    inputs: 1,
    outputs: 1,
    configSchema: []
  },
  {
    type: 'screenshot',
    label: 'Chụp màn hình',
    category: 'browser',
    description: 'Chụp ảnh màn hình trang',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'path', label: 'Lưu tại', type: 'text', placeholder: 'screenshot.png' },
      { key: 'fullPage', label: 'Toàn trang', type: 'boolean', defaultValue: false }
    ]
  },

  // ── Interaction ──────────────────────────────
  {
    type: 'click',
    label: 'Click',
    category: 'interaction',
    description: 'Click vào phần tử',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'selector', label: 'Selector', type: 'selector', placeholder: '#button, .class, text=...', required: true },
      {
        key: 'button', label: 'Nút chuột', type: 'select',
        options: [
          { label: 'Trái', value: 'left' },
          { label: 'Phải', value: 'right' },
          { label: 'Giữa', value: 'middle' }
        ],
        defaultValue: 'left'
      }
    ]
  },
  {
    type: 'type-text',
    label: 'Nhập text',
    category: 'interaction',
    description: 'Nhập văn bản vào ô input',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'selector', label: 'Selector', type: 'selector', placeholder: 'input[name="email"]', required: true },
      { key: 'text', label: 'Nội dung', type: 'text', placeholder: 'Nhập văn bản...', required: true },
      { key: 'clearFirst', label: 'Xoá trước khi nhập', type: 'boolean', defaultValue: true },
      { key: 'delay', label: 'Delay (ms/ký tự)', type: 'number', defaultValue: 50 }
    ]
  },
  {
    type: 'scroll',
    label: 'Cuộn trang',
    category: 'interaction',
    description: 'Cuộn trang lên hoặc xuống',
    inputs: 1,
    outputs: 1,
    configSchema: [
      {
        key: 'direction', label: 'Hướng', type: 'select',
        options: [
          { label: 'Xuống', value: 'down' },
          { label: 'Lên', value: 'up' },
          { label: 'Tới phần tử', value: 'to-element' }
        ],
        defaultValue: 'down'
      },
      { key: 'amount', label: 'Khoảng cách (px)', type: 'number', defaultValue: 500 },
      { key: 'selector', label: 'Selector (nếu cuộn tới)', type: 'selector', placeholder: '#element' }
    ]
  },
  {
    type: 'hover',
    label: 'Hover',
    category: 'interaction',
    description: 'Di chuột qua phần tử',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'selector', label: 'Selector', type: 'selector', required: true }
    ]
  },
  {
    type: 'select-option',
    label: 'Chọn dropdown',
    category: 'interaction',
    description: 'Chọn giá trị trong dropdown',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'selector', label: 'Selector', type: 'selector', required: true },
      { key: 'value', label: 'Giá trị', type: 'text', required: true }
    ]
  },

  // ── Data ─────────────────────────────────────
  {
    type: 'get-text',
    label: 'Lấy text',
    category: 'data',
    description: 'Lấy nội dung text của phần tử',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'selector', label: 'Selector', type: 'selector', required: true },
      { key: 'variable', label: 'Lưu vào biến', type: 'text', placeholder: 'result', required: true }
    ]
  },
  {
    type: 'get-attribute',
    label: 'Lấy thuộc tính',
    category: 'data',
    description: 'Lấy thuộc tính HTML của phần tử',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'selector', label: 'Selector', type: 'selector', required: true },
      { key: 'attribute', label: 'Thuộc tính', type: 'text', placeholder: 'href', required: true },
      { key: 'variable', label: 'Lưu vào biến', type: 'text', placeholder: 'result', required: true }
    ]
  },
  {
    type: 'get-url',
    label: 'Lấy URL',
    category: 'data',
    description: 'Lấy URL hiện tại',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'variable', label: 'Lưu vào biến', type: 'text', placeholder: 'currentUrl', required: true }
    ]
  },

  // ── Flow Control ─────────────────────────────
  {
    type: 'if-else',
    label: 'If / Else',
    category: 'flow',
    description: 'Rẽ nhánh dựa trên điều kiện',
    inputs: 1,
    outputs: 2, // true / false
    configSchema: [
      { key: 'condition', label: 'Điều kiện', type: 'code', placeholder: 'variables.count > 5', required: true }
    ]
  },
  {
    type: 'loop',
    label: 'Vòng lặp',
    category: 'flow',
    description: 'Lặp lại N lần',
    inputs: 1,
    outputs: 2, // body / done
    configSchema: [
      { key: 'count', label: 'Số lần lặp', type: 'number', defaultValue: 5, required: true },
      { key: 'variable', label: 'Biến đếm', type: 'text', defaultValue: 'i' }
    ]
  },
  {
    type: 'wait',
    label: 'Chờ',
    category: 'flow',
    description: 'Chờ phần tử xuất hiện',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'selector', label: 'Selector', type: 'selector', required: true },
      { key: 'timeout', label: 'Timeout (ms)', type: 'number', defaultValue: 30000 }
    ]
  },
  {
    type: 'delay',
    label: 'Delay',
    category: 'flow',
    description: 'Tạm dừng một khoảng thời gian',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'ms', label: 'Thời gian (ms)', type: 'number', defaultValue: 1000, required: true },
      { key: 'random', label: 'Ngẫu nhiên thêm (ms)', type: 'number', defaultValue: 0 }
    ]
  },

  // ── Integration ──────────────────────────────
  {
    type: 'http-request',
    label: 'HTTP Request',
    category: 'integration',
    description: 'Gửi HTTP request',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'url', label: 'URL', type: 'text', required: true },
      {
        key: 'method', label: 'Method', type: 'select',
        options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' }
        ],
        defaultValue: 'GET'
      },
      { key: 'headers', label: 'Headers (JSON)', type: 'code', placeholder: '{"Content-Type": "application/json"}' },
      { key: 'body', label: 'Body', type: 'code', placeholder: '{"key": "value"}' },
      { key: 'variable', label: 'Lưu response vào biến', type: 'text', defaultValue: 'response' }
    ]
  }
]

export const NODE_CATEGORIES: { key: NodeCategory; label: string; color: string }[] = [
  { key: 'browser', label: 'Trình duyệt', color: '#3B82F6' },
  { key: 'interaction', label: 'Tương tác', color: '#10B981' },
  { key: 'data', label: 'Dữ liệu', color: '#F59E0B' },
  { key: 'flow', label: 'Luồng điều khiển', color: '#8B5CF6' },
  { key: 'integration', label: 'Tích hợp', color: '#EF4444' }
]

export function getNodeDefinition(type: string): NodeDefinition | undefined {
  return NODE_DEFINITIONS.find(n => n.type === type)
}

export function getNodesByCategory(category: NodeCategory): NodeDefinition[] {
  return NODE_DEFINITIONS.filter(n => n.category === category)
}
