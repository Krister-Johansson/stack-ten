import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PILE_CAP, START_MAX, START_UNLOCKED } from './constants'
import { StackTenEngine } from './engine'
import { topRun } from './rules'
import type { GameState } from './types'

/** Longer than the slowest chain a single deal can start. */
const SETTLE_MS = 4000

const openPiles = (s: GameState) => s.piles.filter((p) => p.unlocked)
const cardCount = (s: GameState) => s.piles.reduce((n, p) => n + p.cards.length, 0)

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

  it('ends the run when the board is capped with nothing left to merge', () => {
    // No run can reach 12 in a pile that holds 10, so the piles simply fill up.
    engine.setMergeCount(12)
    dealAndSettle(engine, PILE_CAP)

    const s = engine.getState()
    expect(openPiles(s).every((p) => p.cards.length === PILE_CAP)).toBe(true)
    expect(s.over).toBe(true)
  })

  it('ignores taps once the run is over', () => {
    engine.setMergeCount(12)
    dealAndSettle(engine, PILE_CAP)

    const before = engine.getState()
    engine.tapPile(engine.getState().piles.findIndex((p) => p.unlocked))
    expect(engine.getState()).toBe(before)
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
