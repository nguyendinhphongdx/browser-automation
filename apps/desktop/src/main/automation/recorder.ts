import type { Page, BrowserContext } from 'playwright-core'
import type { WorkflowNode, WorkflowEdge, NodeCategory } from '../../shared/types'
import { v4 as uuid } from 'uuid'

export interface RecordedAction {
  type: 'click' | 'type' | 'navigate' | 'select' | 'scroll' | 'wait'
  timestamp: number
  selector?: string
  value?: string
  url?: string
  description: string
}

interface RecorderState {
  recording: boolean
  actions: RecordedAction[]
  page: Page | null
  cleanup: (() => void) | null
}

const state: RecorderState = {
  recording: false,
  actions: [],
  page: null,
  cleanup: null,
}

// Script inject vào browser để bắt sự kiện
const RECORDER_SCRIPT = `
(() => {
  if (window.__browserAutoRecorder) return;
  window.__browserAutoRecorder = true;

  function getSelector(el) {
    if (el.id) return '#' + CSS.escape(el.id);
    if (el.getAttribute('data-testid')) return '[data-testid="' + el.getAttribute('data-testid') + '"]';
    if (el.getAttribute('name')) return el.tagName.toLowerCase() + '[name="' + el.getAttribute('name') + '"]';

    // Dùng nth-child path
    const path = [];
    let current = el;
    while (current && current !== document.body) {
      let tag = current.tagName.toLowerCase();
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(c => c.tagName === current.tagName);
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          tag += ':nth-of-type(' + index + ')';
        }
      }
      path.unshift(tag);
      current = parent;
    }
    return path.join(' > ');
  }

  function getDescription(el) {
    const text = (el.textContent || '').trim().slice(0, 50);
    const tag = el.tagName.toLowerCase();
    const type = el.getAttribute('type') || '';
    if (text) return tag + ': "' + text + '"';
    if (el.getAttribute('placeholder')) return tag + '[placeholder="' + el.getAttribute('placeholder') + '"]';
    if (type) return tag + '[type=' + type + ']';
    return tag;
  }

  // Ghi click
  document.addEventListener('click', (e) => {
    const el = e.target;
    if (!el || !el.tagName) return;
    window.__recordAction({
      type: 'click',
      selector: getSelector(el),
      description: 'Click ' + getDescription(el)
    });
  }, true);

  // Ghi nhập text (debounced)
  let inputTimer = null;
  let lastInput = null;
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (!el || !el.tagName) return;
    clearTimeout(inputTimer);
    lastInput = { el, value: el.value };
    inputTimer = setTimeout(() => {
      if (lastInput) {
        window.__recordAction({
          type: 'type',
          selector: getSelector(lastInput.el),
          value: lastInput.value,
          description: 'Type "' + lastInput.value.slice(0, 30) + '" vào ' + getDescription(lastInput.el)
        });
        lastInput = null;
      }
    }, 500);
  }, true);

  // Ghi chọn dropdown
  document.addEventListener('change', (e) => {
    const el = e.target;
    if (el && el.tagName === 'SELECT') {
      window.__recordAction({
        type: 'select',
        selector: getSelector(el),
        value: el.value,
        description: 'Select "' + el.value + '" trong ' + getDescription(el)
      });
    }
  }, true);

  console.log('[BrowserAuto] Recorder đã kích hoạt');
})();
`

export function isRecording(): boolean {
  return state.recording
}

export function getRecordedActions(): RecordedAction[] {
  return [...state.actions]
}

export async function startRecording(page: Page): Promise<void> {
  if (state.recording) {
    throw new Error('Đang ghi lại rồi. Dừng trước khi bắt đầu lại.')
  }

  state.recording = true
  state.actions = []
  state.page = page

  // Expose hàm để browser gửi action về
  await page.exposeFunction('__recordAction', (action: Omit<RecordedAction, 'timestamp'>) => {
    if (!state.recording) return
    state.actions.push({
      ...action,
      timestamp: Date.now(),
    })
  })

  // Ghi navigate
  const onNavigation = (frame: any) => {
    if (frame === page.mainFrame() && state.recording) {
      const url = page.url()
      if (url && url !== 'about:blank') {
        state.actions.push({
          type: 'navigate',
          timestamp: Date.now(),
          url,
          description: `Điều hướng tới ${url}`,
        })
      }
    }
  }
  page.on('framenavigated', onNavigation)

  // Inject recorder script vào trang hiện tại và tất cả trang mới
  await page.addInitScript(RECORDER_SCRIPT)
  try {
    await page.evaluate(RECORDER_SCRIPT)
  } catch {
    // Trang có thể chưa load
  }

  state.cleanup = () => {
    page.off('framenavigated', onNavigation)
  }
}

export function stopRecording(): RecordedAction[] {
  state.recording = false
  state.cleanup?.()
  state.cleanup = null
  state.page = null
  return [...state.actions]
}

// Map action type → node definition
const ACTION_TO_NODE: Record<string, { nodeType: string; label: string; category: NodeCategory; icon: string }> = {
  navigate: { nodeType: 'open-page', label: 'Mở trang', category: 'browser', icon: 'Globe' },
  click: { nodeType: 'click', label: 'Click', category: 'interaction', icon: 'MousePointerClick' },
  type: { nodeType: 'type-text', label: 'Nhập text', category: 'interaction', icon: 'Keyboard' },
  select: { nodeType: 'select-option', label: 'Chọn dropdown', category: 'interaction', icon: 'ListFilter' },
  scroll: { nodeType: 'scroll', label: 'Cuộn trang', category: 'interaction', icon: 'ArrowDownUp' },
  wait: { nodeType: 'delay', label: 'Delay', category: 'flow', icon: 'Timer' },
}

/** Chuyển các action đã ghi thành workflow nodes + edges */
export function actionsToWorkflow(actions: RecordedAction[]): {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
} {
  const nodes: WorkflowNode[] = []
  const edges: WorkflowEdge[] = []

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i]
    const nodeId = uuid()
    // Layout ngang: left → right
    const x = 80 + i * 250
    const y = 200

    const def = ACTION_TO_NODE[action.type] || ACTION_TO_NODE['click']
    let config: Record<string, any> = {}

    switch (action.type) {
      case 'navigate':
        config = { url: action.url || '' }
        break
      case 'click':
        config = { selector: action.selector || '' }
        break
      case 'type':
        config = { selector: action.selector || '', text: action.value || '', clearFirst: true, delay: 50 }
        break
      case 'select':
        config = { selector: action.selector || '', value: action.value || '' }
        break
      case 'scroll':
        config = { direction: 'down', amount: 300 }
        break
      case 'wait':
        config = { ms: 1000 }
        break
    }

    nodes.push({
      id: nodeId,
      type: 'automationNode',
      position: { x, y },
      data: {
        label: def.label,
        category: def.category,
        icon: def.icon,
        nodeType: def.nodeType,
        config,
      },
    })

    if (i > 0) {
      edges.push({
        id: uuid(),
        source: nodes[i - 1].id,
        target: nodeId,
      })
    }
  }

  return { nodes, edges }
}
