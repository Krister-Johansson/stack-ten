import { CARD_H, PILE_CAP, SLOT_H, SLOT_PAD } from './constants'
import type { Card, Pile } from './types'

export function topValue(cards: Card[]): number | null {
  return cards.length ? cards[cards.length - 1].v : null
}

/** How many equal-valued cards sit on top of the pile. Those move together. */
export function topRun(cards: Card[]): number {
  if (!cards.length) return 0
  const v = cards[cards.length - 1].v
  let n = 0
  for (let i = cards.length - 1; i >= 0 && cards[i].v === v; i--) n++
  return n
}

/** Vertical gap between stacked cards, tightening as the pile fills. */
export function cardStep(count: number): number {
  return Math.min(6, (SLOT_H - SLOT_PAD * 2 - CARD_H) / Math.max(count - 1, 1))
}

export function cardTop(count: number, index: number): number {
  return SLOT_PAD + index * cardStep(count)
}

/** A deal drops one card on every open pile, so it needs at least one. */
export function canDeal(piles: Pile[]): boolean {
  return piles.some((p) => p.unlocked && p.cards.length < PILE_CAP)
}

export function canDrop(piles: Pile[], from: number, to: number, mergeCount: number): boolean {
  const src = piles[from]
  const dst = piles[to]
  if (!dst.unlocked || !src.cards.length) return false
  if (!dst.cards.length) return true
  return (
    topValue(dst.cards) === topValue(src.cards) &&
    topRun(dst.cards) < mergeCount &&
    dst.cards.length < PILE_CAP
  )
}

/** True while any pile-to-pile move is still available. */
export function hasMove(piles: Pile[], mergeCount: number): boolean {
  for (let i = 0; i < piles.length; i++) {
    const src = piles[i]
    if (!src.unlocked || !src.cards.length) continue
    const v = topValue(src.cards)
    const run = topRun(src.cards)
    for (let j = 0; j < piles.length; j++) {
      if (i === j || !piles[j].unlocked) continue
      const dst = piles[j].cards
      if (!dst.length) {
        // Emptying one pile onto another only helps if something stays behind.
        if (run < src.cards.length) return true
        continue
      }
      if (topValue(dst) === v && topRun(dst) < mergeCount && dst.length < PILE_CAP) return true
    }
  }
  return false
}

/** Fisher-Yates, so the opening hand and slot picks are evenly random. */
export function shuffle<T>(items: T[]): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
