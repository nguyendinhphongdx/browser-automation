import { defineConfig, globalIgnores } from 'eslint/config'
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

export default defineConfig([
  globalIgnores(['dist/**', 'out/**', 'release/**', 'node_modules/**']),

  // Base JS + TypeScript recommended rules across the whole project.
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Renderer (React / browser context, new JSX runtime — no react-in-jsx-scope needed).
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      globals: globals.browser,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/prop-types': 'off',
    },
  },

  // Main process / preload (Node/Electron context — no React).
  {
    files: ['src/main/**/*.ts', 'src/preload/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },

  // Root-level CommonJS tool configs (postcss.config.js, tailwind.config.js, …).
  {
    files: ['*.config.js', '*.config.cjs'],
    languageOptions: {
      globals: globals.node,
      sourceType: 'commonjs',
    },
  },
])
