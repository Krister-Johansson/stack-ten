import { useEffect, useRef } from 'react'

/**
 * Closes a popover on Escape or on a pointer down outside it. The toggle that
 * opened it is excluded, so clicking that button toggles rather than closing
 * and reopening.
 */
export function useDismiss(onClose: () => void, toggleSelector: string) {
  const panel = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element
      if (panel.current?.contains(target)) return
      if (target.closest?.(toggleSelector)) return
      onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [onClose, toggleSelector])

  return panel
}
