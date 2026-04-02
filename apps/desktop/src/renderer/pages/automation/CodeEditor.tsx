import Editor from '@monaco-editor/react'
import { useWorkflowStore } from '@/stores/workflow-store'

const DEFAULT_CODE = `// Automation Script
// Sử dụng các biến: page, context, variables, log, delay

// Ví dụ: Mở trang và lấy tiêu đề
await page.goto('https://example.com');
const title = await page.title();
log('Tiêu đề: ' + title);

// Click vào phần tử
await page.click('a[href]');
await delay(1000);

// Nhập text
await page.fill('input[name="q"]', 'Hello World');

// Chụp màn hình
await page.screenshot({ path: 'screenshot.png' });
`

const TYPE_DEFINITIONS = `
declare const page: {
  goto(url: string, options?: { waitUntil?: string }): Promise<void>;
  click(selector: string, options?: { button?: string }): Promise<void>;
  fill(selector: string, value: string): Promise<void>;
  type(selector: string, text: string, options?: { delay?: number }): Promise<void>;
  title(): Promise<string>;
  url(): string;
  textContent(selector: string): Promise<string | null>;
  getAttribute(selector: string, name: string): Promise<string | null>;
  waitForSelector(selector: string, options?: { timeout?: number }): Promise<void>;
  hover(selector: string): Promise<void>;
  selectOption(selector: string, value: string): Promise<void>;
  screenshot(options?: { path?: string; fullPage?: boolean }): Promise<void>;
  goBack(): Promise<void>;
  goForward(): Promise<void>;
  reload(): Promise<void>;
  close(): Promise<void>;
  locator(selector: string): { scrollIntoViewIfNeeded(): Promise<void> };
  mouse: { wheel(deltaX: number, deltaY: number): Promise<void> };
};
declare const context: any;
declare const variables: Record<string, any>;
declare function log(message: string): void;
declare function delay(ms: number): Promise<void>;
`

export function CodeEditor() {
  const { activeWorkflow, updateCode } = useWorkflowStore()

  if (!activeWorkflow) return null

  const handleEditorMount = (editor: any, monaco: any) => {
    // Add type definitions for IntelliSense
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      TYPE_DEFINITIONS,
      'automation-api.d.ts'
    )
    // Set compiler options for top-level await
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      allowJs: true,
      checkJs: false
    })
  }

  return (
    <div className="h-full">
      <Editor
        height="100%"
        defaultLanguage="typescript"
        value={activeWorkflow.code || DEFAULT_CODE}
        onChange={(value) => updateCode(value || '')}
        onMount={handleEditorMount}
        theme="vs-dark"
        options={{
          minimap: { enabled: true },
          fontSize: 13,
          lineNumbers: 'on',
          roundedSelection: true,
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          automaticLayout: true,
          tabSize: 2,
          padding: { top: 10 }
        }}
      />
    </div>
  )
}
