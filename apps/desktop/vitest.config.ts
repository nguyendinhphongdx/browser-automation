import { defineConfig } from 'vitest/config'
import path from 'path'

// Plain Vite config (not electron-vite) for running unit tests under Node.
// Code under test lives in src/main (Node/Electron context) — no JSX/DOM needed.
export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@': path.resolve(__dirname, 'src/renderer'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/test/setup.ts'],
    globals: false,
    clearMocks: true,
  },
})
