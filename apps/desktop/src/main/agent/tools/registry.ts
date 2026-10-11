import type { ToolSet } from 'ai'
import type { AgentToolContext } from './types'
import { createStartBrowserTool } from './start-browser'
import { createCheckBrowserStatusTool } from './check-browser-status'
import { createCloseBrowserTool } from './close-browser'
import { createGetPageUrlTool } from './get-page-url'
import { createGetPageHtmlTool } from './get-page-html'
import { createTakeScreenshotTool } from './take-screenshot'
import { createRunJsTool } from './run-js'
import { createGetWorkflowStateTool } from './get-workflow-state'
import { createGetNodeCatalogTool } from './get-node-catalog'
import { createGetExecutionLogsTool } from './get-execution-logs'
import { createProposeWorkflowChangeTool } from './propose-workflow-change'
import { createProposeDestructiveWorkflowChangeTool } from './propose-destructive-workflow-change'
import { createProposeCodeChangeTool } from './propose-code-change'
import { createListResourcesTool } from './list-resources'
import { createGetResourceTool } from './get-resource'
import { createSaveResourceTool } from './save-resource'
import { createCreateLibraryFolderTool } from './create-library-folder'
import { createMoveResourceTool } from './move-resource'
import { createUpdateResourceMetadataTool } from './update-resource-metadata'
import { createDeleteResourceTool } from './delete-resource'
import { createProposeVideoPipelineChangeTool } from './propose-video-pipeline-change'
import { createGetProjectContextTool } from './get-project-context'
import { createUpdateProjectNotebookTool } from './update-project-notebook'
import { createCreateProjectTool } from './create-project'
import { createCreateTaskTool } from './create-task'
import { createUpdateTaskStatusTool } from './update-task-status'
import { createListProjectTasksTool } from './list-project-tasks'
import { createMoveTaskTool } from './move-task'
import { createListProjectsTool } from './list-projects'

/**
 * Builds the full toolset for one agent run, closing over that run's
 * `AgentToolContext` (live page, workflow snapshot, etc.) — mirrors
 * `nodes/registry.ts`'s NODE_REGISTRY idea (a table of pluggable typed
 * handlers), adapted to factory functions since ToolLoopAgent consumes plain
 * `tool()` objects rather than class instances.
 *
 * Which of these names actually need human approval (ADR-0005: per-domain,
 * not one shared list) lives in `../domains.ts`'s `AGENT_DOMAINS`, right next
 * to this builder — not here, since gating is a domain-level config concern.
 */
export function buildAutomationToolset(ctx: AgentToolContext): ToolSet {
  return {
    start_browser: createStartBrowserTool(ctx),
    check_browser_status: createCheckBrowserStatusTool(ctx),
    close_browser: createCloseBrowserTool(ctx),
    get_page_url: createGetPageUrlTool(ctx),
    get_page_html: createGetPageHtmlTool(ctx),
    take_screenshot: createTakeScreenshotTool(ctx),
    run_js: createRunJsTool(ctx),
    get_workflow_state: createGetWorkflowStateTool(ctx),
    get_node_catalog: createGetNodeCatalogTool(ctx),
    get_execution_logs: createGetExecutionLogsTool(ctx),
    propose_workflow_change: createProposeWorkflowChangeTool(ctx),
    propose_destructive_workflow_change: createProposeDestructiveWorkflowChangeTool(ctx),
    propose_code_change: createProposeCodeChangeTool(ctx),
    list_resources: createListResourcesTool(ctx),
    get_resource: createGetResourceTool(ctx),
    save_resource: createSaveResourceTool(ctx),
    create_library_folder: createCreateLibraryFolderTool(ctx),
    move_resource: createMoveResourceTool(ctx),
    update_resource_metadata: createUpdateResourceMetadataTool(ctx),
    delete_resource: createDeleteResourceTool(ctx),
    get_project_context: createGetProjectContextTool(ctx),
    update_project_notebook: createUpdateProjectNotebookTool(ctx),
    create_project: createCreateProjectTool(ctx),
    create_task: createCreateTaskTool(ctx),
    update_task_status: createUpdateTaskStatusTool(ctx),
    list_project_tasks: createListProjectTasksTool(ctx),
    move_task: createMoveTaskTool(ctx)
  }
}

/**
 * Toolset riêng cho domain 'video-studio' — KHÔNG gồm các tool điều khiển
 * browser/automation (không liên quan, Video Studio không có khái niệm
 * trang web/Playwright), chỉ gồm thứ thật sự dùng được: đề xuất pipeline +
 * truy cập Thư viện tài nguyên (để AI có thể chọn ảnh tham chiếu nhân vật
 * có sẵn, hoặc lưu kết quả).
 */
export function buildVideoToolset(ctx: AgentToolContext): ToolSet {
  return {
    propose_video_pipeline_change: createProposeVideoPipelineChangeTool(ctx),
    list_resources: createListResourcesTool(ctx),
    get_resource: createGetResourceTool(ctx),
    save_resource: createSaveResourceTool(ctx),
    create_library_folder: createCreateLibraryFolderTool(ctx),
    move_resource: createMoveResourceTool(ctx),
    update_resource_metadata: createUpdateResourceMetadataTool(ctx),
    delete_resource: createDeleteResourceTool(ctx),
    get_project_context: createGetProjectContextTool(ctx),
    update_project_notebook: createUpdateProjectNotebookTool(ctx),
    create_project: createCreateProjectTool(ctx),
    create_task: createCreateTaskTool(ctx),
    update_task_status: createUpdateTaskStatusTool(ctx),
    list_project_tasks: createListProjectTasksTool(ctx),
    move_task: createMoveTaskTool(ctx)
  }
}

/**
 * Toolset riêng cho domain 'project' (ADR-0005) — không có khái niệm
 * browser/workflow/pipeline, chỉ gồm 7 tool Project/Task (ADR-0004) + đúng
 * bộ tool thư viện đã dùng chung với buildVideoToolset (để AI tự tổ chức
 * output trong folder gốc project).
 */
export function buildProjectToolset(ctx: AgentToolContext): ToolSet {
  return {
    list_resources: createListResourcesTool(ctx),
    get_resource: createGetResourceTool(ctx),
    save_resource: createSaveResourceTool(ctx),
    create_library_folder: createCreateLibraryFolderTool(ctx),
    move_resource: createMoveResourceTool(ctx),
    update_resource_metadata: createUpdateResourceMetadataTool(ctx),
    delete_resource: createDeleteResourceTool(ctx),
    get_project_context: createGetProjectContextTool(ctx),
    update_project_notebook: createUpdateProjectNotebookTool(ctx),
    create_project: createCreateProjectTool(ctx),
    create_task: createCreateTaskTool(ctx),
    update_task_status: createUpdateTaskStatusTool(ctx),
    list_project_tasks: createListProjectTasksTool(ctx),
    move_task: createMoveTaskTool(ctx)
  }
}

/**
 * Toolset cho domain 'general' (ADR-0006) — trợ lý chung, mount ở
 * Layout.tsx, dùng được từ MỌI trang. Giống buildProjectToolset (mọi tool
 * Project/Task + thư viện đều nhận id qua tham số tool, không qua
 * AgentToolContext, nên gọi được không cần biết "đang ở trang nào"), cộng
 * thêm list_projects vì trợ lý chung không có 1 projectId cố định như trang
 * Project — phải tự tra được "đang có project nào" trước.
 */
export function buildGeneralToolset(ctx: AgentToolContext): ToolSet {
  return {
    ...buildProjectToolset(ctx),
    list_projects: createListProjectsTool(ctx)
  }
}
