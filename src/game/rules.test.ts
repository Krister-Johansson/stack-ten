import { describe, expect, it } from 'vitest'
import { CARD_H, PILE_CAP, SLOT_H, SLOT_PAD } from './constants'
import { canDeal, canDrop, cardTop, hasMove, shuffle, topRun, topValue } from './rules'
import type { Pile } from './types'

let id = 0
const pile = (values: number[], unlocked = true): Pile => ({
  cards: values.map((v) => ({ id: ++id, v })),
  unlocked,
  fx: null,
})
const full = (v: number) => Array.from({ length: PILE_CAP }, () => v)

describe('topRun', () => {
  it('counts only the equal cards on top', () => {
    expect(topRun(pile([3, 4, 4, 4]).cards)).toBe(3)
    expect(topRun(pile([4, 4, 4, 3]).cards)).toBe(1)
    expect(topRun(pile([]).cards)).toBe(0)
  })

  it('reports the top value, or null when empty', () => {
    expect(topValue(pile([1, 2]).cards)).toBe(2)
    expect(topValue(pile([]).cards)).toBeNull()
  })
})

describe('card stacking', () => {
  it('keeps a single card at the slot padding', () => {
    expect(cardTop(1, 0)).toBe(SLOT_PAD)
  })

  it('keeps a full stack inside the slot', () => {
    expect(cardTop(PILE_CAP, PILE_CAP - 1) + CARD_H).toBeLessThanOrEqual(SLOT_H)
  })

  it('never spreads cards further than the fixed step', () => {
    expect(cardTop(2, 1) - cardTop(2, 0)).toBeLessThanOrEqual(6)
  })
})

describe('canDeal', () => {
  it('is false once every open pile is capped', () => {
    expect(canDeal([pile(full(1)), pile(full(2)), pile([3], false)])).toBe(false)
  })

  it('is true while one open pile has room', () => {
    expect(canDeal([pile(full(1)), pile([2, 2])])).toBe(true)
  })

  it('ignores locked piles, however empty', () => {
    expect(canDeal([pile(full(1)), pile([], false)])).toBe(false)
  })
})

describe('canDrop', () => {
  const piles = [pile([5, 5]), pile([9, 5]), pile([]), pile([], false), pile([7, 7, 7])]

  it('allows a run onto a matching top', () => {
    expect(canDrop(piles, 0, 1, 10)).toBe(true)
  })

  it('allows anything onto an open empty pile', () => {
    expect(canDrop(piles, 0, 2, 10)).toBe(true)
  })

  it('refuses a mismatched top', () => {
    expect(canDrop(piles, 0, 4, 10)).toBe(false)
  })

  it('refuses a locked target', () => {
    expect(canDrop(piles, 0, 3, 10)).toBe(false)
  })

  it('refuses a target whose run already reaches the merge count', () => {
    expect(canDrop([pile([7]), pile([7, 7, 7])], 0, 1, 3)).toBe(false)
  })

  it('refuses a capped target', () => {
    expect(canDrop([pile([7]), pile(full(7))], 0, 1, 12)).toBe(false)
  })
})

describe('hasMove', () => {
  it('is false when every open pile is capped with a different top', () => {
    const dead = [pile(full(1)), pile(full(2)), pile(full(3)), pile([4], false)]
    expect(canDeal(dead)).toBe(false)
    expect(hasMove(dead, 10)).toBe(false)
  })

  it('finds a move onto a matching top', () => {
    expect(hasMove([pile([5, 5]), pile([9, 5])], 10)).toBe(true)
  })

  // A blocked target may still be a source: the long pile sheds onto the short one.
  it('still finds the reverse move when one side is blocked', () => {
    expect(hasMove([pile([5]), pile([5, 5, 5])], 3)).toBe(true)
    expect(hasMove([pile([7]), pile(full(7))], 12)).toBe(true)
  })

  it('is false when both sides are blocked', () => {
    expect(hasMove([pile([5, 5, 5]), pile([5, 5, 5])], 3)).toBe(false)
    expect(hasMove([pile(full(7)), pile(full(7))], 12)).toBe(false)
  })

  it('counts an empty pile only when something stays behind', () => {
    expect(hasMove([pile([6, 6]), pile([])], 10)).toBe(false)
    expect(hasMove([pile([8, 6, 6]), pile([])], 10)).toBe(true)
  })

  it('ignores locked piles as target and as source', () => {
    expect(hasMove([pile([2]), pile([2], false)], 10)).toBe(false)
    expect(hasMove([pile([2], false), pile([2])], 10)).toBe(false)
  })
})

describe('shuffle', () => {
  it('keeps every item and leaves the input alone', () => {
    const input = [1, 1, 1, 2, 2, 2, 3, 3, 3]
    const out = shuffle(input)
    expect(out).not.toBe(input)
    expect([...out].sort()).toEqual([...input].sort())
    expect(input).toEqual([1, 1, 1, 2, 2, 2, 3, 3, 3])
  })
})
