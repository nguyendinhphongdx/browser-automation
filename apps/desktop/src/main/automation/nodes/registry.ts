import type { BaseNode, ExecutionContext, NodeInput } from './base-node'

// Browser
import { OpenPageNode, NavigateNode, NewTabNode, SwitchTabNode, CloseTabNode, CloseBrowserNode, ScreenshotNode, SetViewportNode } from './browser'
// Interaction
import { ClickNode, DoubleClickNode, TypeTextNode, PressKeyNode, ScrollNode, HoverNode, SelectOptionNode, CheckUncheckNode, UploadFileNode, DragDropNode } from './interaction'
// Data
import { GetTextNode, GetAttributeNode, GetUrlNode, GetTitleNode, CountElementsNode, SetVariableNode, EvalJsNode, ExtractTableNode } from './data'
// Flow
import { DelayNode, WaitNode, ElementExistsNode } from './flow'
// Integration
import { HttpRequestNode, SetCookieNode, GetCookieNode, LocalStorageNode, NotificationNode, LogNode } from './integration'
// Sub-workflow
import { RunWorkflowNode } from './sub-workflow'
// Data pipeline
import { PaginateNode, ExportDataNode, MapDataNode, FilterDataNode, ReduceDataNode, SortDataNode } from './data-pipeline'
// Parallel
import { ParallelForkNode, ParallelJoinNode } from './parallel'

type NodeClass = new (ctx: ExecutionContext, input: NodeInput) => BaseNode

/**
 * Registry: map node type string → Node class
 * Thêm node mới chỉ cần: tạo class + thêm 1 dòng ở đây
 */
const NODE_REGISTRY: Record<string, NodeClass> = {
  // Browser
  'open-page': OpenPageNode,
  'navigate': NavigateNode,
  'new-tab': NewTabNode,
  'switch-tab': SwitchTabNode,
  'close-tab': CloseTabNode,
  'close-browser': CloseBrowserNode,
  'screenshot': ScreenshotNode,
  'set-viewport': SetViewportNode,

  // Interaction
  'click': ClickNode,
  'double-click': DoubleClickNode,
  'type-text': TypeTextNode,
  'press-key': PressKeyNode,
  'scroll': ScrollNode,
  'hover': HoverNode,
  'select-option': SelectOptionNode,
  'check-uncheck': CheckUncheckNode,
  'upload-file': UploadFileNode,
  'drag-drop': DragDropNode,

  // Data
  'get-text': GetTextNode,
  'get-attribute': GetAttributeNode,
  'get-url': GetUrlNode,
  'get-title': GetTitleNode,
  'count-elements': CountElementsNode,
  'set-variable': SetVariableNode,
  'eval-js': EvalJsNode,
  'extract-table': ExtractTableNode,

  // Flow
  'delay': DelayNode,
  'wait': WaitNode,
  'element-exists': ElementExistsNode,

  // Integration
  'http-request': HttpRequestNode,
  'set-cookie': SetCookieNode,
  'get-cookie': GetCookieNode,
  'local-storage': LocalStorageNode,
  'notification': NotificationNode,
  'log': LogNode,

  // Sub-workflow
  'run-workflow': RunWorkflowNode,

  // Data pipeline
  'paginate': PaginateNode,
  'export-data': ExportDataNode,
  'map-data': MapDataNode,
  'filter-data': FilterDataNode,
  'reduce-data': ReduceDataNode,
  'sort-data': SortDataNode,

  // Parallel
  'parallel-fork': ParallelForkNode,
  'parallel-join': ParallelJoinNode,
}

export function createNode(type: string, ctx: ExecutionContext, input: NodeInput): BaseNode | null {
  const NodeClass = NODE_REGISTRY[type]
  if (!NodeClass) return null
  return new NodeClass(ctx, input)
}

export function isRegistered(type: string): boolean {
  return type in NODE_REGISTRY
}
