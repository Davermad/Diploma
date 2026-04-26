import { useEffect, useRef } from 'react'

export function useClickOutside(handler, enabled = true) {
  const ref = useRef(null)
  useEffect(() => {
    if (!enabled) return
    function onDown(e) {
      const el = ref.current
      if (el && !el.contains(e.target)) handler()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [handler, enabled])
  return ref
}
