import { vi } from 'vitest'
import os from 'os'
import path from 'path'

/**
 * Global test setup.
 *
 * Code under test in `src/main/**` imports `electron` directly (e.g.
 * base-node.ts's captureErrorScreenshot calls `app.getPath`), and — via the
 * node registry (base-node.ts -> metrics-service.ts -> database/init.ts) and
 * sub-workflow.ts (-> workflow-service.ts -> database/init.ts) — transitively
 * imports `better-sqlite3`, a native addon that is rebuilt for Electron's ABI
 * (see the `postinstall: electron-rebuild -f -w better-sqlite3` script) and
 * will fail to load under the plain Node process Vitest runs in.
 *
 * Neither of these is actually exercised by the unit tests here (metrics
 * recording is skipped whenever `ctx.workflowId` is undefined, and workflow
 * lookups are mocked per-test), but the modules are still imported at the
 * top level, so both need lightweight mocks to avoid import-time crashes.
 */

vi.mock('electron', () => {
  const app = {
    getPath: (name: string) => path.join(os.tmpdir(), 'browser-automation-test', name),
    getName: () => 'browser-automation-test',
  }
  const ipcMain = {
    handle: vi.fn(),
    on: vi.fn(),
    removeHandler: vi.fn(),
  }
  class BrowserWindow {
    static getAllWindows() {
      return []
    }
  }
  const dialog = {
    showSaveDialog: vi.fn().mockResolvedValue({ canceled: true, filePath: undefined }),
    showOpenDialog: vi.fn().mockResolvedValue({ canceled: true, filePaths: [] }),
  }
  return { app, ipcMain, BrowserWindow, dialog }
})

vi.mock('better-sqlite3', () => {
  class FakeStatement {
    run() {
      return { changes: 0, lastInsertRowid: 0 }
    }
    get() {
      return undefined
    }
    all() {
      return []
    }
  }
  class FakeDatabase {
    pragma() {}
    exec() {}
    prepare() {
      return new FakeStatement()
    }
    close() {}
    transaction<T extends (...args: unknown[]) => unknown>(fn: T) {
      return fn
    }
  }
  return { default: FakeDatabase }
})
