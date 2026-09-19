import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { gameAudio } from './audio'
import { SLOT_GAP, SLOT_H } from './constants'
import { StackTenEngine } from './engine'
import type { Rect } from './types'

const BOARD_H = SLOT_H * 3 + SLOT_GAP * 2
const MIN_SCALE = 0.5

/** An element's box in unscaled board coordinates. */
function rel(board: HTMLElement | null, el: HTMLElement | null): Rect | null {
  if (!board || !el) return null
  const b = board.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  // The board carries the fit-to-height transform; divide it back out.
  const k = board.offsetWidth ? b.width / board.offsetWidth : 1
  if (!k) return null
  return {
    left: (r.left - b.left) / k,
    top: (r.top - b.top) / k,
    width: r.width / k,
    height: r.height / k,
  }
}

export function useGame(mergeCount: number) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const boardRef = useRef<HTMLDivElement | null>(null)
  const deckRef = useRef<HTMLButtonElement | null>(null)
  const pileRefs = useRef<(HTMLElement | null)[]>([])

  const [engine] = useState(() => new StackTenEngine(gameAudio()))
  const state = useSyncExternalStore(engine.subscribe, engine.getState)
  const [scale, setScale] = useState(1)

  const measurePile = useCallback((index: number, el: HTMLElement | null) => {
    pileRefs.current[index] = el
  }, [])

  useEffect(() => {
    engine.setMetrics({
      pile: (i) => rel(boardRef.current, pileRefs.current[i] ?? null),
      deck: () => rel(boardRef.current, deckRef.current),
    })
  }, [engine])

  useEffect(() => () => engine.dispose(), [engine])

  useEffect(() => {
    engine.setMergeCount(mergeCount)
  }, [engine, mergeCount])

  // The board is laid out at a fixed size and scaled down on short screens.
  useLayoutEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const fit = () => {
      const height = wrap.getBoundingClientRect().height
      const next = Math.min(1, Math.max(MIN_SCALE, height / BOARD_H))
      setScale((prev) => (Math.abs(next - prev) > 0.005 ? next : prev))
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(wrap)
    return () => observer.disconnect()
  }, [])

  return { state, engine, scale, measurePile, wrapRef, boardRef, deckRef }
}
