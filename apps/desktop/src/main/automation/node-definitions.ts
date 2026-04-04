import type { NodeCategory } from '../../shared/types'

export interface NodeDefinition {
  type: string
  label: string
  category: NodeCategory
  description: string
  icon: string // lucide icon name
  inputs: number
  outputs: number
  configSchema: ConfigField[]
}

export interface ConfigField {
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'boolean' | 'code' | 'selector' | 'keyrecorder' | 'workflow-select' | 'variable-mapping'
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
    icon: 'Globe',
    description: 'Mở URL mới trong trình duyệt',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'url', label: 'URL', type: 'text', placeholder: 'https://example.com', required: true },
      { key: 'waitUntil', label: 'Chờ đến khi', type: 'select', options: [
        { label: 'DOM loaded', value: 'domcontentloaded' },
        { label: 'Trang load xong', value: 'load' },
        { label: 'Network idle', value: 'networkidle' }
      ], defaultValue: 'domcontentloaded' }
    ]
  },
  {
    type: 'navigate',
    label: 'Điều hướng',
    category: 'browser',
    icon: 'ArrowLeftRight',
    description: 'Quay lại, tiến, hoặc làm mới trang',
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
    type: 'new-tab',
    label: 'Mở tab mới',
    category: 'browser',
    icon: 'PanelTop',
    description: 'Mở một tab mới và chuyển đến URL',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'url', label: 'URL', type: 'text', placeholder: 'https://example.com' }
    ]
  },
  {
    type: 'switch-tab',
    label: 'Chuyển tab',
    category: 'browser',
    icon: 'ArrowRightLeft',
    description: 'Chuyển sang tab theo index hoặc tiêu đề',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'by', label: 'Chuyển theo', type: 'select', options: [
        { label: 'Thứ tự (index)', value: 'index' },
        { label: 'Tiêu đề chứa...', value: 'title' },
        { label: 'URL chứa...', value: 'url' }
      ], defaultValue: 'index' },
      { key: 'value', label: 'Giá trị', type: 'text', placeholder: '0 hoặc tiêu đề...', required: true }
    ]
  },
  {
    type: 'close-tab',
    label: 'Đóng tab',
    category: 'browser',
    icon: 'PanelTopClose',
    description: 'Đóng tab hiện tại',
    inputs: 1,
    outputs: 1,
    configSchema: []
  },
  {
    type: 'close-browser',
    label: 'Đóng browser',
    category: 'browser',
    icon: 'Power',
    description: 'Đóng hoàn toàn trình duyệt',
    inputs: 1,
    outputs: 0,
    configSchema: []
  },
  {
    type: 'screenshot',
    label: 'Chụp màn hình',
    category: 'browser',
    icon: 'Camera',
    description: 'Chụp ảnh màn hình trang hoặc phần tử',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'path', label: 'Lưu tại', type: 'text', placeholder: 'screenshot.png' },
      { key: 'fullPage', label: 'Toàn trang', type: 'boolean', defaultValue: false },
      { key: 'selector', label: 'Chỉ chụp phần tử (tuỳ chọn)', type: 'selector', placeholder: '#element' }
    ]
  },
  {
    type: 'set-viewport',
    label: 'Kích thước cửa sổ',
    category: 'browser',
    icon: 'Maximize',
    description: 'Thay đổi kích thước viewport',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'width', label: 'Chiều rộng (px)', type: 'number', defaultValue: 1920, required: true },
      { key: 'height', label: 'Chiều cao (px)', type: 'number', defaultValue: 1080, required: true }
    ]
  },

  // ── Interaction ──────────────────────────────
  {
    type: 'click',
    label: 'Click',
    category: 'interaction',
    icon: 'MousePointerClick',
    description: 'Click vào phần tử trên trang',
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
      },
      { key: 'clickCount', label: 'Số lần click', type: 'number', defaultValue: 1 }
    ]
  },
  {
    type: 'double-click',
    label: 'Double Click',
    category: 'interaction',
    icon: 'MousePointer2',
    description: 'Double-click vào phần tử',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'selector', label: 'Selector', type: 'selector', placeholder: '#element', required: true }
    ]
  },
  {
    type: 'type-text',
    label: 'Nhập text',
    category: 'interaction',
    icon: 'Keyboard',
    description: 'Nhập văn bản vào ô input hoặc textarea',
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
    type: 'press-key',
    label: 'Nhấn phím',
    category: 'interaction',
    icon: 'Command',
    description: 'Nhấn tổ hợp phím (Enter, Tab, Ctrl+A...)',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'key', label: 'Phím', type: 'keyrecorder', placeholder: 'Click để ghi phím', required: true },
      { key: 'selector', label: 'Phần tử (tuỳ chọn)', type: 'selector', placeholder: 'input#search' }
    ]
  },
  {
    type: 'scroll',
    label: 'Cuộn trang',
    category: 'interaction',
    icon: 'ArrowDownUp',
    description: 'Cuộn trang lên, xuống hoặc đến phần tử',
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
    icon: 'Hand',
    description: 'Di chuột qua phần tử (trigger tooltip, menu...)',
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
    icon: 'ListFilter',
    description: 'Chọn giá trị trong thẻ <select>',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'selector', label: 'Selector', type: 'selector', required: true },
      { key: 'value', label: 'Giá trị', type: 'text', required: true }
    ]
  },
  {
    type: 'check-uncheck',
    label: 'Check/Uncheck',
    category: 'interaction',
    icon: 'CheckSquare',
    description: 'Tick hoặc bỏ tick checkbox/radio',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'selector', label: 'Selector', type: 'selector', required: true },
      { key: 'checked', label: 'Trạng thái', type: 'select', options: [
        { label: 'Check (tick)', value: 'true' },
        { label: 'Uncheck (bỏ tick)', value: 'false' }
      ], defaultValue: 'true' }
    ]
  },
  {
    type: 'upload-file',
    label: 'Upload file',
    category: 'interaction',
    icon: 'Upload',
    description: 'Upload file qua input[type=file]',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'selector', label: 'Selector', type: 'selector', required: true },
      { key: 'filePath', label: 'Đường dẫn file', type: 'text', placeholder: '/path/to/file.png', required: true }
    ]
  },
  {
    type: 'drag-drop',
    label: 'Kéo thả',
    category: 'interaction',
    icon: 'GripVertical',
    description: 'Kéo phần tử và thả vào vị trí khác',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'sourceSelector', label: 'Phần tử nguồn', type: 'selector', required: true },
      { key: 'targetSelector', label: 'Phần tử đích', type: 'selector', required: true }
    ]
  },

  // ── Data ─────────────────────────────────────
  {
    type: 'get-text',
    label: 'Lấy text',
    category: 'data',
    icon: 'Type',
    description: 'Lấy nội dung text của phần tử và lưu vào biến',
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
    icon: 'Code2',
    description: 'Lấy thuộc tính HTML (href, src, value...)',
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
    icon: 'Link',
    description: 'Lấy URL trang hiện tại',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'variable', label: 'Lưu vào biến', type: 'text', placeholder: 'currentUrl', required: true }
    ]
  },
  {
    type: 'get-title',
    label: 'Lấy tiêu đề',
    category: 'data',
    icon: 'Heading',
    description: 'Lấy title của trang hiện tại',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'variable', label: 'Lưu vào biến', type: 'text', placeholder: 'pageTitle', required: true }
    ]
  },
  {
    type: 'count-elements',
    label: 'Đếm phần tử',
    category: 'data',
    icon: 'Hash',
    description: 'Đếm số phần tử khớp selector',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'selector', label: 'Selector', type: 'selector', required: true },
      { key: 'variable', label: 'Lưu vào biến', type: 'text', placeholder: 'count', required: true }
    ]
  },
  {
    type: 'set-variable',
    label: 'Gán biến',
    category: 'data',
    icon: 'Variable',
    description: 'Tạo hoặc gán giá trị cho biến',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'variable', label: 'Tên biến', type: 'text', placeholder: 'email', required: true },
      { key: 'value', label: 'Giá trị', type: 'text', placeholder: 'test@example.com', required: true }
    ]
  },
  {
    type: 'eval-js',
    label: 'Chạy JavaScript',
    category: 'data',
    icon: 'FileCode',
    description: 'Thực thi JavaScript trong trang (page.evaluate)',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'code', label: 'Code', type: 'code', placeholder: 'return document.title', required: true },
      { key: 'variable', label: 'Lưu kết quả vào biến', type: 'text', placeholder: 'result' }
    ]
  },
  {
    type: 'extract-table',
    label: 'Trích xuất bảng',
    category: 'data',
    icon: 'Table',
    description: 'Lấy dữ liệu từ bảng HTML',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'selector', label: 'Selector bảng', type: 'selector', placeholder: 'table, .data-table', required: true },
      { key: 'variable', label: 'Lưu vào biến', type: 'text', placeholder: 'tableData', required: true }
    ]
  },

  // ── Flow Control ─────────────────────────────
  {
    type: 'if-else',
    label: 'If / Else',
    category: 'flow',
    icon: 'GitBranch',
    description: 'Rẽ nhánh dựa trên điều kiện',
    inputs: 1,
    outputs: 2,
    configSchema: [
      { key: 'condition', label: 'Điều kiện', type: 'code', placeholder: 'variables.count > 5', required: true }
    ]
  },
  {
    type: 'loop',
    label: 'Vòng lặp',
    category: 'flow',
    icon: 'Repeat',
    description: 'Lặp lại N lần hoặc qua danh sách',
    inputs: 1,
    outputs: 2,
    configSchema: [
      { key: 'count', label: 'Số lần lặp', type: 'number', defaultValue: 5, required: true },
      { key: 'variable', label: 'Biến đếm', type: 'text', defaultValue: 'i' }
    ]
  },
  {
    type: 'loop-each',
    label: 'Lặp danh sách',
    category: 'flow',
    icon: 'ListOrdered',
    description: 'Lặp qua từng phần tử khớp selector',
    inputs: 1,
    outputs: 2,
    configSchema: [
      { key: 'selector', label: 'Selector các phần tử', type: 'selector', placeholder: '.item, tr', required: true },
      { key: 'variable', label: 'Biến phần tử', type: 'text', defaultValue: 'element' },
      { key: 'indexVar', label: 'Biến index', type: 'text', defaultValue: 'index' }
    ]
  },
  {
    type: 'wait',
    label: 'Chờ phần tử',
    category: 'flow',
    icon: 'Clock',
    description: 'Chờ phần tử xuất hiện trên trang',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'selector', label: 'Selector', type: 'selector', required: true },
      { key: 'state', label: 'Trạng thái', type: 'select', options: [
        { label: 'Xuất hiện', value: 'visible' },
        { label: 'Ẩn đi', value: 'hidden' },
        { label: 'Tồn tại trong DOM', value: 'attached' }
      ], defaultValue: 'visible' },
      { key: 'timeout', label: 'Timeout (ms)', type: 'number', defaultValue: 30000 }
    ]
  },
  {
    type: 'delay',
    label: 'Delay',
    category: 'flow',
    icon: 'Timer',
    description: 'Tạm dừng một khoảng thời gian',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'ms', label: 'Thời gian (ms)', type: 'number', defaultValue: 1000, required: true },
      { key: 'random', label: 'Ngẫu nhiên thêm (ms)', type: 'number', defaultValue: 0 }
    ]
  },
  {
    type: 'try-catch',
    label: 'Try / Catch',
    category: 'flow',
    icon: 'ShieldAlert',
    description: 'Bắt lỗi — nếu thất bại sẽ đi nhánh catch',
    inputs: 1,
    outputs: 2,
    configSchema: [
      { key: 'errorVar', label: 'Lưu lỗi vào biến', type: 'text', defaultValue: 'error' }
    ]
  },
  {
    type: 'break-loop',
    label: 'Thoát vòng lặp',
    category: 'flow',
    icon: 'LogOut',
    description: 'Thoát khỏi vòng lặp hiện tại',
    inputs: 1,
    outputs: 0,
    configSchema: []
  },
  {
    type: 'element-exists',
    label: 'Phần tử tồn tại?',
    category: 'flow',
    icon: 'HelpCircle',
    description: 'Kiểm tra phần tử có tồn tại trên trang',
    inputs: 1,
    outputs: 2,
    configSchema: [
      { key: 'selector', label: 'Selector', type: 'selector', required: true },
      { key: 'timeout', label: 'Timeout (ms)', type: 'number', defaultValue: 3000 }
    ]
  },

  // ── Data Pipeline ────────────────────────────
  {
    type: 'paginate',
    label: 'Phân trang',
    category: 'data',
    icon: 'ChevronsRight',
    description: 'Tự động click nút tiếp theo và thu thập dữ liệu qua nhiều trang',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'itemSelector', label: 'Selector phần tử cần lấy', type: 'selector', placeholder: '.item, .card', required: true },
      { key: 'nextButtonSelector', label: 'Selector nút tiếp theo', type: 'selector', placeholder: '.next, [aria-label="Next"]', required: true },
      { key: 'maxPages', label: 'Số trang tối đa', type: 'number', defaultValue: 10 },
      { key: 'variable', label: 'Lưu vào biến', type: 'text', defaultValue: 'items', required: true }
    ]
  },
  {
    type: 'export-data',
    label: 'Xuất dữ liệu',
    category: 'data',
    icon: 'Download',
    description: 'Xuất dữ liệu ra file CSV hoặc JSON',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'variable', label: 'Biến chứa dữ liệu', type: 'text', placeholder: 'items', required: true },
      { key: 'format', label: 'Định dạng', type: 'select', options: [
        { label: 'JSON', value: 'json' },
        { label: 'CSV', value: 'csv' }
      ], defaultValue: 'json' },
      { key: 'filePath', label: 'Đường dẫn file (tùy chọn)', type: 'text', placeholder: 'Bỏ trống để chọn' }
    ]
  },
  {
    type: 'map-data',
    label: 'Map (biến đổi)',
    category: 'data',
    icon: 'Sparkles',
    description: 'Biến đổi từng phần tử trong mảng bằng biểu thức JS',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'sourceVariable', label: 'Biến nguồn (array)', type: 'text', required: true },
      { key: 'expression', label: 'Biểu thức (item, index)', type: 'code', placeholder: 'item.toUpperCase()', required: true },
      { key: 'outputVariable', label: 'Lưu kết quả vào biến', type: 'text', placeholder: 'Mặc định ghi đè biến nguồn' }
    ]
  },
  {
    type: 'filter-data',
    label: 'Filter (lọc)',
    category: 'data',
    icon: 'Filter',
    description: 'Lọc mảng theo điều kiện JS',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'sourceVariable', label: 'Biến nguồn (array)', type: 'text', required: true },
      { key: 'expression', label: 'Điều kiện (item, index)', type: 'code', placeholder: 'item.length > 0', required: true },
      { key: 'outputVariable', label: 'Lưu kết quả vào biến', type: 'text', placeholder: 'Mặc định ghi đè biến nguồn' }
    ]
  },
  {
    type: 'reduce-data',
    label: 'Reduce (gộp)',
    category: 'data',
    icon: 'Sigma',
    description: 'Gộp mảng thành một giá trị (tổng, nối, đếm...)',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'sourceVariable', label: 'Biến nguồn (array)', type: 'text', required: true },
      { key: 'expression', label: 'Biểu thức (acc, item, index)', type: 'code', placeholder: 'acc + item', required: true },
      { key: 'initialValue', label: 'Giá trị khởi tạo', type: 'text', defaultValue: '0' },
      { key: 'outputVariable', label: 'Lưu kết quả vào biến', type: 'text', defaultValue: 'result', required: true }
    ]
  },
  {
    type: 'sort-data',
    label: 'Sort (sắp xếp)',
    category: 'data',
    icon: 'ArrowUpDown',
    description: 'Sắp xếp mảng theo key hoặc giá trị',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'sourceVariable', label: 'Biến nguồn (array)', type: 'text', required: true },
      { key: 'key', label: 'Key (nếu array of objects)', type: 'text', placeholder: 'Bỏ trống nếu array đơn giản' },
      { key: 'order', label: 'Thứ tự', type: 'select', options: [
        { label: 'Tăng dần (A→Z, 0→9)', value: 'asc' },
        { label: 'Giảm dần (Z→A, 9→0)', value: 'desc' }
      ], defaultValue: 'asc' },
      { key: 'outputVariable', label: 'Lưu kết quả vào biến', type: 'text', placeholder: 'Mặc định ghi đè biến nguồn' }
    ]
  },

  // ── Parallel ─────────────────────────────────
  {
    type: 'parallel-fork',
    label: 'Parallel Fork',
    category: 'flow',
    icon: 'GitFork',
    description: 'Chia thành N nhánh chạy song song. Mỗi nhánh có biến riêng.',
    inputs: 1,
    outputs: 4, // max 4 branches
    configSchema: [
      { key: 'branches', label: 'Số nhánh', type: 'number', defaultValue: 2 }
    ]
  },
  {
    type: 'parallel-join',
    label: 'Parallel Join',
    category: 'flow',
    icon: 'GitMerge',
    description: 'Chờ các nhánh song song hoàn thành rồi gộp kết quả.',
    inputs: 4, // max 4 branches
    outputs: 1,
    configSchema: [
      { key: 'mode', label: 'Chế độ chờ', type: 'select', options: [
        { label: 'Chờ tất cả', value: 'all' },
        { label: 'Chờ 1 xong', value: 'any' },
      ], defaultValue: 'all' },
      { key: 'mergeStrategy', label: 'Gộp biến', type: 'select', options: [
        { label: 'Merge (gộp shallow)', value: 'merge' },
        { label: 'Last wins', value: 'last-wins' },
        { label: 'Collect (thành array)', value: 'collect' },
      ], defaultValue: 'merge' },
      { key: 'timeout', label: 'Timeout (ms)', type: 'number', defaultValue: 60000 }
    ]
  },

  // ── Sub-workflow ─────────────────────────────
  {
    type: 'run-workflow',
    label: 'Chạy Workflow',
    category: 'flow',
    icon: 'Workflow',
    description: 'Chạy một workflow khác như sub-routine. Hỗ trợ truyền biến vào/ra.',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'workflowId', label: 'Workflow', type: 'workflow-select', required: true },
      { key: 'inputMappings', label: 'Input (parent → child)', type: 'variable-mapping', placeholder: 'parentVar:childVar' },
      { key: 'outputMappings', label: 'Output (child → parent)', type: 'variable-mapping', placeholder: 'parentVar:childVar' },
      { key: 'maxDepth', label: 'Giới hạn đệ quy', type: 'number', defaultValue: 10 }
    ]
  },

  // ── Integration ──────────────────────────────
  {
    type: 'http-request',
    label: 'HTTP Request',
    category: 'integration',
    icon: 'Send',
    description: 'Gửi HTTP request (GET, POST, PUT, DELETE)',
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
          { label: 'DELETE', value: 'DELETE' },
          { label: 'PATCH', value: 'PATCH' }
        ],
        defaultValue: 'GET'
      },
      { key: 'headers', label: 'Headers (JSON)', type: 'code', placeholder: '{"Content-Type": "application/json"}' },
      { key: 'body', label: 'Body', type: 'code', placeholder: '{"key": "value"}' },
      { key: 'variable', label: 'Lưu response vào biến', type: 'text', defaultValue: 'response' }
    ]
  },
  {
    type: 'set-cookie',
    label: 'Set Cookie',
    category: 'integration',
    icon: 'Cookie',
    description: 'Thêm cookie vào trình duyệt',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'name', label: 'Tên cookie', type: 'text', required: true },
      { key: 'value', label: 'Giá trị', type: 'text', required: true },
      { key: 'domain', label: 'Domain', type: 'text', placeholder: '.example.com' },
      { key: 'path', label: 'Path', type: 'text', defaultValue: '/' }
    ]
  },
  {
    type: 'get-cookie',
    label: 'Get Cookie',
    category: 'integration',
    icon: 'Cookie',
    description: 'Đọc giá trị cookie',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'name', label: 'Tên cookie', type: 'text', required: true },
      { key: 'url', label: 'URL', type: 'text', placeholder: 'https://example.com' },
      { key: 'variable', label: 'Lưu vào biến', type: 'text', placeholder: 'cookieValue', required: true }
    ]
  },
  {
    type: 'local-storage',
    label: 'LocalStorage',
    category: 'integration',
    icon: 'Database',
    description: 'Đọc hoặc ghi localStorage',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'action', label: 'Hành động', type: 'select', options: [
        { label: 'Đọc (get)', value: 'get' },
        { label: 'Ghi (set)', value: 'set' },
        { label: 'Xoá (remove)', value: 'remove' }
      ], defaultValue: 'get' },
      { key: 'key', label: 'Key', type: 'text', required: true },
      { key: 'value', label: 'Value (nếu ghi)', type: 'text' },
      { key: 'variable', label: 'Lưu vào biến (nếu đọc)', type: 'text' }
    ]
  },
  {
    type: 'notification',
    label: 'Thông báo',
    category: 'integration',
    icon: 'Bell',
    description: 'Hiển thị thông báo desktop khi hoàn thành',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'title', label: 'Tiêu đề', type: 'text', defaultValue: 'Automation', required: true },
      { key: 'message', label: 'Nội dung', type: 'text', placeholder: 'Đã hoàn thành!', required: true }
    ]
  },
  {
    type: 'log',
    label: 'Ghi log',
    category: 'integration',
    icon: 'FileText',
    description: 'Ghi thông tin vào log để debug',
    inputs: 1,
    outputs: 1,
    configSchema: [
      { key: 'message', label: 'Nội dung', type: 'text', placeholder: 'Bước đã hoàn thành', required: true },
      { key: 'level', label: 'Mức độ', type: 'select', options: [
        { label: 'Info', value: 'info' },
        { label: 'Warning', value: 'warn' },
        { label: 'Error', value: 'error' }
      ], defaultValue: 'info' }
    ]
  }
]

export const NODE_CATEGORIES: { key: NodeCategory; label: string; color: string; icon: string }[] = [
  { key: 'browser', label: 'Trình duyệt', color: '#3B82F6', icon: 'Globe' },
  { key: 'interaction', label: 'Tương tác', color: '#10B981', icon: 'MousePointerClick' },
  { key: 'data', label: 'Dữ liệu', color: '#F59E0B', icon: 'Database' },
  { key: 'flow', label: 'Luồng điều khiển', color: '#8B5CF6', icon: 'GitBranch' },
  { key: 'integration', label: 'Tích hợp', color: '#EF4444', icon: 'Zap' }
]

export function getNodeDefinition(type: string): NodeDefinition | undefined {
  return NODE_DEFINITIONS.find(n => n.type === type)
}

export function getNodesByCategory(category: NodeCategory): NodeDefinition[] {
  return NODE_DEFINITIONS.filter(n => n.category === category)
}
