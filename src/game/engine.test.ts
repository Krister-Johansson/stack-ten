import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_MERGE_COUNT, PILE_CAP, START_MAX, START_UNLOCKED } from './constants'
import { StackTenEngine } from './engine'
import { topRun } from './rules'
import type { BoardMetrics, GameState } from './types'

/**
 * Stand-in board geometry. Without it the engine cannot work out flight paths
 * and no card is ever given an arrival, which would leave anything about
 * landing and settling untested.
 */
const METRICS: BoardMetrics = {
  pile: (i) => ({ left: (i % 5) * 70, top: Math.floor(i / 5) * 158, width: 58, height: 78 }),
  deck: () => ({ left: 140, top: 480, width: 64, height: 86 }),
}

/** Longer than the slowest chain a single deal can start. */
const SETTLE_MS = 4000

const openPiles = (s: GameState) => s.piles.filter((p) => p.unlocked)
const cardCount = (s: GameState) => s.piles.reduce((n, p) => n + p.cards.length, 0)

/** Cycles the dealt value so no pile ever collects a full run of one number. */
function rotateDealtValues() {
  const cycle = [0, 0.5, 0.99]
  let tick = 0
  vi.spyOn(Math, 'random').mockImplementation(() => cycle[tick++ % cycle.length])
}

function dealAndSettle(engine: StackTenEngine, times = 1) {
  for (let i = 0; i < times; i++) {
    engine.deal()
    vi.advanceTimersByTime(SETTLE_MS)
  }
}

describe('StackTenEngine', () => {
  let engine: StackTenEngine

  beforeEach(() => {
    vi.useFakeTimers()
    // Every shuffle and every dealt value becomes the lowest option.
    vi.spyOn(Math, 'random').mockReturnValue(0)
    engine = new StackTenEngine()
    engine.setMetrics(METRICS)
  })

  afterEach(() => {
    engine.dispose()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('opens with nine cards across the starting slots', () => {
    const s = engine.getState()
    expect(cardCount(s)).toBe(9)
    expect(openPiles(s)).toHaveLength(START_UNLOCKED)
    expect(s.deals).toBe(0)
    expect(s.best).toBe(START_MAX)
    expect(s.over).toBe(false)
  })

  it('deals one card onto every open pile and counts the deal', () => {
    const before = engine.getState()
    const sizes = openPiles(before).map((p) => p.cards.length)

    dealAndSettle(engine)

    const after = engine.getState()
    expect(openPiles(after).map((p) => p.cards.length)).toEqual(sizes.map((n) => n + 1))
    expect(after.deals).toBe(1)
  })

  it('leaves no in-flight markers on a card once it has landed', () => {
    dealAndSettle(engine, 2)
    const cards = engine.getState().piles.flatMap((p) => p.cards)
    expect(cards.filter((c) => c.from || c.deal || c.fresh)).toHaveLength(0)
  })

  it('collapses a full run into one card of the next value up', () => {
    engine.setMergeCount(3)
    // The opening hand covers three of the four slots, so one starts clean and
    // takes nothing but dealt 1s.
    const clean = engine.getState().piles.findIndex((p) => p.unlocked && !p.cards.length)
    expect(clean).toBeGreaterThanOrEqual(0)

    dealAndSettle(engine, 3)

    const s = engine.getState()
    expect(s.piles[clean].cards.map((c) => c.v)).toEqual([2])
    expect(s.piles.every((p) => topRun(p.cards) < 3)).toBe(true)
  })

  it('announces a new value, raises best, and opens another slot', () => {
    engine.setMergeCount(3)
    const openedBefore = openPiles(engine.getState()).length

    // Nine 1s per pile cascade up to a 4, one value past the opening maximum.
    let banner: number | null = null
    engine.subscribe(() => {
      const b = engine.getState().banner
      if (b) banner = b.v
    })
    for (let i = 0; i < 27 && engine.getState().best <= START_MAX; i++) dealAndSettle(engine)

    const s = engine.getState()
    expect(s.best).toBe(START_MAX + 1)
    expect(s.seenMax).toBe(START_MAX + 1)
    expect(banner).toBe(START_MAX + 1)
    expect(openPiles(s).length).toBe(openedBefore + 1)
  })

  it('ends the run when the board caps out with nothing left to merge', () => {
    engine.setMergeCount(DEFAULT_MERGE_COUNT)
    rotateDealtValues()

    for (let i = 0; i < 40 && !engine.getState().over; i++) dealAndSettle(engine)

    const s = engine.getState()
    expect(s.best).toBe(START_MAX) // rotating values means nothing ever merged
    expect(openPiles(s).every((p) => p.cards.length === PILE_CAP)).toBe(true)
    expect(s.over).toBe(true)
  })

  it('ignores taps once the run is over', () => {
    engine.setMergeCount(DEFAULT_MERGE_COUNT)
    rotateDealtValues()
    for (let i = 0; i < 40 && !engine.getState().over; i++) dealAndSettle(engine)

    const before = engine.getState()
    engine.tapPile(before.piles.findIndex((p) => p.unlocked))
    expect(engine.getState()).toBe(before)
  })

  it('refuses a deal while a landing is still waiting on its merge check', () => {
    engine.setMergeCount(3)
    engine.deal()
    // Past the deck's pulse, short of the merge check that follows the landing.
    vi.advanceTimersByTime(500)

    engine.deal()

    expect(engine.getState().deals).toBe(1)
  })

  it('merges a completed run even when the deck is tapped as it lands', () => {
    engine.setMergeCount(3)
    const clean = engine.getState().piles.findIndex((p) => p.unlocked && !p.cards.length)
    dealAndSettle(engine, 2)

    // The third deal completes a run of three 1s on the clean pile. Tapping the
    // deck again before the merge check would once have buried it for good.
    engine.deal()
    vi.advanceTimersByTime(500)
    engine.deal()
    vi.advanceTimersByTime(SETTLE_MS)

    expect(engine.getState().piles[clean].cards.map((c) => c.v)).toEqual([2])
    expect(engine.getState().deals).toBe(3)
  })

  it('leaves a card that was picked up mid-flight on its new arrival', () => {
    engine.deal()
    // The dealt cards have landed on screen but have not been settled yet.
    vi.advanceTimersByTime(400)

    const open = engine.getState().piles.flatMap((p, i) => (p.unlocked ? [i] : []))
    const [from, to] = open
    engine.tapPile(from)
    engine.tapPile(to)

    // Far enough for the deal's settle to run, not the move's.
    vi.advanceTimersByTime(300)

    const landing = engine.getState().piles[to].cards.filter((c) => c.from)
    expect(landing.length).toBeGreaterThan(0)
  })

  it('moves the top run to a matching pile', () => {
    const s = engine.getState()
    const from = s.piles.findIndex((p) => p.cards.length > 0)
    const to = s.piles.findIndex((p, i) => i !== from && p.unlocked && p.cards.length === 0)
    const moved = topRun(s.piles[from].cards)

    engine.tapPile(from)
    expect(engine.getState().sel).toBe(from)
    engine.tapPile(to)
    vi.advanceTimersByTime(SETTLE_MS)

    const after = engine.getState()
    expect(after.piles[to].cards).toHaveLength(moved)
    expect(after.piles[from].cards).toHaveLength(s.piles[from].cards.length - moved)
    expect(after.sel).toBeNull()
    expect(cardCount(after)).toBe(9)
  })

  it('drops the selection and shakes the pile on an illegal drop', () => {
    const s = engine.getState()
    const from = s.piles.findIndex((p) => p.cards.length > 0)
    const locked = s.piles.findIndex((p) => !p.unlocked)

    engine.tapPile(from)
    engine.tapPile(locked)

    expect(engine.getState().sel).toBeNull()
    expect(engine.getState().piles[locked].fx).toBe('shake')
    vi.advanceTimersByTime(SETTLE_MS)
    expect(engine.getState().piles[locked].fx).toBeNull()
  })

  it('reset discards work that was still in flight', () => {
    engine.setMergeCount(3)
    dealAndSettle(engine, 2)
    engine.deal() // third deal: the merge it triggers is still pending
    engine.reset()

    const fresh = engine.getState()
    vi.advanceTimersByTime(SETTLE_MS * 2)

    expect(engine.getState()).toBe(fresh)
    expect(cardCount(fresh)).toBe(9)
    expect(fresh.deals).toBe(0)
    expect(fresh.over).toBe(false)
  })
})
