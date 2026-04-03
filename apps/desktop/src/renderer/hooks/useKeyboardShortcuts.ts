import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export function useKeyboardShortcuts() {
  const navigate = useNavigate()

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const ctrl = e.ctrlKey || e.metaKey

      // Ctrl+N — tạo profile mới (dispatch custom event)
      if (ctrl && e.key === 'n') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('shortcut:new-profile'))
      }

      // Ctrl+F — focus tìm kiếm
      if (ctrl && e.key === 'f') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('shortcut:search'))
      }

      // Ctrl+S — lưu workflow
      if (ctrl && e.key === 's') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('shortcut:save'))
      }

      // Ctrl+Shift+R — chạy workflow
      if (ctrl && e.shiftKey && e.key === 'R') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('shortcut:run'))
      }

      // Ctrl+, — mở cài đặt
      if (ctrl && e.key === ',') {
        e.preventDefault()
        navigate('/settings')
      }

      // Ctrl+1-5 — chuyển tab
      if (ctrl && e.key >= '1' && e.key <= '5') {
        e.preventDefault()
        const routes = ['/profiles', '/automation', '/resources', '/marketplace', '/settings']
        const index = parseInt(e.key) - 1
        if (routes[index]) navigate(routes[index])
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate])
}
