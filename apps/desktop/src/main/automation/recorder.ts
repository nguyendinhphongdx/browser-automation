import type { Page, BrowserContext } from 'playwright-core'
import type { WorkflowNode, WorkflowEdge } from '../../shared/types'
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
    const x = 100
    const y = 80 + i * 120

    let nodeType: string
    let config: Record<string, any> = {}

    switch (action.type) {
      case 'navigate':
        nodeType = 'open-page'
        config = { url: action.url || '' }
        break
      case 'click':
        nodeType = 'click'
        config = { selector: action.selector || '' }
        break
      case 'type':
        nodeType = 'type'
        config = { selector: action.selector || '', text: action.value || '' }
        break
      case 'select':
        nodeType = 'select'
        config = { selector: action.selector || '', value: action.value || '' }
        break
      case 'scroll':
        nodeType = 'scroll'
        config = { direction: 'down', amount: 300 }
        break
      case 'wait':
        nodeType = 'wait'
        config = { ms: 1000 }
        break
      default:
        nodeType = 'click'
        config = { selector: action.selector || '' }
    }

    nodes.push({
      id: nodeId,
      type: nodeType,
      position: { x, y },
      data: {
        label: action.description,
        category: nodeType === 'open-page' ? 'browser' : nodeType === 'wait' ? 'flow' : 'interaction',
        config,
      },
    })

    // Nối node trước với node sau
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
