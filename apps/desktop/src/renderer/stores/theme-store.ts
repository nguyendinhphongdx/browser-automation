import { create } from 'zustand'

type Theme = 'light' | 'dark' | 'system'

interface ThemeStore {
  theme: Theme
  setTheme: (theme: Theme) => void
}

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
  const resolved = theme === 'system' ? getSystemTheme() : theme
  document.documentElement.classList.toggle('dark', resolved === 'dark')
  localStorage.setItem('theme', theme)
}

export const useThemeStore = create<ThemeStore>((set) => {
  // Initialize from localStorage
  const saved = (localStorage.getItem('theme') as Theme) || 'light'
  // Apply on creation
  setTimeout(() => applyTheme(saved), 0)

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const current = localStorage.getItem('theme') as Theme
    if (current === 'system') applyTheme('system')
  })

  return {
    theme: saved,
    setTheme: (theme) => {
      applyTheme(theme)
      set({ theme })
    }
  }
})
