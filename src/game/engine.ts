import type { GameAudio } from './audio'
import {
  CARD_H,
  CARD_W,
  DEAL_MS,
  DEAL_SETTLE_MS,
  DEAL_STAGGER,
  DEFAULT_MERGE_COUNT,
  FX_LIFE_MS,
  LIFT,
  MERGE_CASCADE_MS,
  MERGE_COLLAPSE_MS,
  MOVE_MS,
  MOVE_STAGGER,
  OVER_CHECK_MS,
  PILE_CAP,
  PILE_COUNT,
  SHAKE_MS,
  START_MAX,
  START_UNLOCKED,
  UNLOCK_ORDER,
  colorOf,
} from './constants'
import { canDeal, canDrop, cardTop, hasMove, shuffle, topRun, topValue } from './rules'
import type { BoardMetrics, Card, GameState, Pile } from './types'

/**
 * Lower values stay common as the game grows, but the newest one is always
 * rare enough to be worth chasing.
 */
function valuePicker(seenMax: number): () => number {
  const weights: { v: number; w: number }[] = []
  for (let v = 1; v <= seenMax; v++) weights.push({ v, w: seenMax - v + 1.5 })
  const total = weights.reduce((sum, x) => sum + x.w, 0)
  return () => {
    let r = Math.random() * total
    for (const x of weights) {
      r -= x.w
      if (r <= 0) return x.v
    }
    return 1
  }
}

/** Used until the view has mounted and can measure the board. */
const NO_METRICS: BoardMetrics = { pile: () => null, deck: () => null }

function replacePile(piles: Pile[], index: number, next: Pile): Pile[] {
  const out = piles.slice()
  out[index] = next
  return out
}

/**
 * The whole game, independent of React. State is replaced synchronously, so a
 * step scheduled after an animation always reads what the previous step wrote.
 * The view supplies board geometry through `metrics` and subscribes for redraws.
 */
export class StackTenEngine {
  private mergeCount = DEFAULT_MERGE_COUNT
  private metrics: BoardMetrics = NO_METRICS
  private audio: GameAudio | null
  private listeners = new Set<() => void>()
  private timers = new Set<ReturnType<typeof setTimeout>>()
  private uid = 0
  private state: GameState

  constructor(audio: GameAudio | null = null) {
    this.audio = audio
    this.state = this.freshState()
  }

  getState = (): GameState => this.state

  /** The view hands over board geometry once it has mounted. */
  setMetrics(metrics: BoardMetrics) {
    this.metrics = metrics
  }

  setMergeCount(count: number) {
    this.mergeCount = count
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Drops every pending animation step. Subscribers unsubscribe themselves. */
  dispose() {
    this.clearTimers()
  }

  reset() {
    this.clearTimers()
    this.state = this.freshState()
    this.emit()
  }

  /** A tap either picks a run up, puts it down, or bounces off. */
  tapPile(i: number) {
    const { sel, piles, over } = this.state
    if (over) return
    const pile = piles[i]

    if (sel === null) {
      if (pile.unlocked && pile.cards.length) {
        this.sound((a) => a.pick())
        this.set({ sel: i })
      }
      return
    }
    if (sel === i) {
      this.sound((a) => a.unpick())
      this.set({ sel: null })
      return
    }
    if (canDrop(piles, sel, i, this.mergeCount)) {
      this.move(sel, i)
      return
    }
    if (pile.unlocked && pile.cards.length) {
      // Treat a bad drop on a live pile as picking that pile up instead.
      this.sound((a) => a.pick())
      this.set({ sel: i })
    } else {
      this.sound((a) => a.bad())
      this.setFx(i, 'shake', SHAKE_MS)
      this.set({ sel: null })
    }
  }

  /** Deals one card onto every open pile, and costs one deal. */
  deal() {
    const { piles, over, dealPulse, seenMax } = this.state
    if (over || dealPulse) return
    if (!canDeal(piles)) {
      this.sound((a) => a.bad())
      return
    }

    const targets: number[] = []
    piles.forEach((p, i) => {
      if (p.unlocked && p.cards.length < PILE_CAP) targets.push(i)
    })

    const nextValue = valuePicker(seenMax)
    const deck = this.metrics.deck()
    const x0 = deck ? deck.left + deck.width / 2 - CARD_W / 2 : 0
    const y0 = deck ? deck.top + deck.height / 2 - CARD_H / 2 : 0

    const dealt = targets.map((j, k) => {
      const card: Card = { ...this.mint(nextValue()), deal: true }
      const slot = this.metrics.pile(j)
      if (deck && slot) {
        const count = piles[j].cards.length + 1
        const x1 = slot.left + slot.width / 2 - CARD_W / 2
        const y1 = slot.top + cardTop(count, count - 1)
        card.from = {
          dx: x0 - x1,
          dy: y0 - y1,
          delay: k * DEAL_STAGGER,
          rot: `${k % 2 ? 8 : -8}deg`,
        }
      }
      return { j, card }
    })

    let next = piles
    for (const { j, card } of dealt) {
      next = replacePile(next, j, { ...next[j], cards: next[j].cards.concat([card]) })
    }
    this.set({ piles: next, sel: null, dealPulse: true, deals: this.state.deals + 1 })
    this.sound((a) => a.deal(dealt.length))

    const last = DEAL_MS + (dealt.length - 1) * DEAL_STAGGER
    this.later(last + 40, () => this.set({ dealPulse: false }))
    this.later(last + DEAL_SETTLE_MS, () => {
      this.settle(dealt.map((d) => d.card.id))
      for (const d of dealt) this.checkMerge(d.j)
      this.checkOver()
    })
  }

  private freshState(): GameState {
    const piles: Pile[] = Array.from({ length: PILE_COUNT }, (_, i) => ({
      cards: [],
      unlocked: UNLOCK_ORDER.indexOf(i) < START_UNLOCKED,
      fx: null,
    }))
    // Nine cards across three of the four open slots.
    const slots = shuffle(UNLOCK_ORDER.slice(0, START_UNLOCKED)).slice(0, 3)
    shuffle([1, 1, 1, 2, 2, 2, 3, 3, 3]).forEach((v, i) => {
      piles[slots[i % 3]].cards.push(this.mint(v))
    })
    return {
      piles,
      sel: null,
      deals: 0,
      seenMax: START_MAX,
      best: START_MAX,
      bursts: [],
      banner: null,
      over: false,
      dealPulse: false,
    }
  }

  private mint(v: number): Card {
    return { id: ++this.uid, v }
  }

  private emit() {
    for (const listener of this.listeners) listener()
  }

  private set(patch: Partial<GameState>) {
    this.state = { ...this.state, ...patch }
    this.emit()
  }

  private later(ms: number, run: () => void) {
    const id = setTimeout(() => {
      this.timers.delete(id)
      run()
    }, ms)
    this.timers.add(id)
  }

  private clearTimers() {
    for (const id of this.timers) clearTimeout(id)
    this.timers.clear()
  }

  private sound(play: (audio: GameAudio) => void) {
    if (!this.audio) return
    try {
      play(this.audio)
    } catch {
      // A missing or blocked AudioContext must never stall the game.
    }
  }

  private setFx(i: number, fx: Pile['fx'], ms?: number) {
    this.set({ piles: replacePile(this.state.piles, i, { ...this.state.piles[i], fx }) })
    if (!ms) return
    this.later(ms, () => {
      const pile = this.state.piles[i]
      if (pile.fx !== fx) return
      this.set({ piles: replacePile(this.state.piles, i, { ...pile, fx: null }) })
    })
  }

  /** Moves the top run from one pile to another, as far as the target allows. */
  private move(from: number, to: number) {
    const { piles } = this.state
    const src = piles[from]
    const dst = piles[to]
    if (!dst.unlocked) {
      this.set({ sel: null })
      return
    }

    const v = topValue(src.cards)
    const run = topRun(src.cards)
    const dstRun = dst.cards.length ? (topValue(dst.cards) === v ? topRun(dst.cards) : -1) : 0
    const count =
      dstRun < 0 ? 0 : Math.min(run, this.mergeCount - dstRun, PILE_CAP - dst.cards.length)
    if (count <= 0) {
      this.sound((a) => a.bad())
      this.setFx(to, 'shake', SHAKE_MS)
      return
    }

    const srcBox = this.metrics.pile(from)
    const dstBox = this.metrics.pile(to)
    const before = src.cards.length
    const after = dst.cards.length + count

    const moving: Card[] = src.cards.slice(-count).map((card, idx) => {
      const next: Card = { id: card.id, v: card.v }
      if (srcBox && dstBox) {
        const y0 = srcBox.top + cardTop(before, before - count + idx) - LIFT
        const y1 = dstBox.top + cardTop(after, dst.cards.length + idx)
        next.from = {
          dx: srcBox.left - dstBox.left,
          dy: y0 - y1,
          delay: idx * MOVE_STAGGER,
          rot: `${idx % 2 ? 7 : -7}deg`,
        }
      }
      return next
    })

    let next = replacePile(piles, from, { ...src, cards: src.cards.slice(0, -count) })
    next = replacePile(next, to, { ...next[to], cards: next[to].cards.concat(moving) })
    this.set({ piles: next, sel: null })
    this.sound((a) => a.drop(count))

    this.later(MOVE_MS + count * MOVE_STAGGER, () => {
      this.settle(moving.map((c) => c.id))
      this.checkMerge(to)
      this.checkOver()
    })
  }

  /** Drops the arrival flags once a card has finished flying. */
  private settle(ids: number[]) {
    const landed = new Set(ids)
    this.set({
      piles: this.state.piles.map((pile) => ({
        ...pile,
        cards: pile.cards.map((c) => (landed.has(c.id) ? { id: c.id, v: c.v } : c)),
      })),
    })
  }

  /** Collapses a full run into one card of the next value up, then cascades. */
  private checkMerge(i: number) {
    const count = this.mergeCount
    const pile = this.state.piles[i]
    if (!pile.cards.length || topRun(pile.cards) < count) return

    const v = topValue(pile.cards) as number
    this.setFx(i, 'merge')
    this.sound((a) => a.merge(v))

    this.later(MERGE_COLLAPSE_MS, () => {
      const merged: Card = { ...this.mint(v + 1), fresh: true }
      const box = this.metrics.pile(i)
      const state = this.state
      const rest = state.piles[i].cards.slice(0, -count)
      let piles = replacePile(state.piles, i, {
        ...state.piles[i],
        fx: null,
        cards: rest.concat([merged]),
      })

      let { seenMax, banner } = state
      if (v + 1 > seenMax) {
        seenMax = v + 1
        banner = { id: merged.id, v: v + 1 }
        this.sound((a) => a.unlock())
        const opening = UNLOCK_ORDER.find((idx) => !piles[idx].unlocked)
        if (opening !== undefined) {
          piles = replacePile(piles, opening, { ...piles[opening], unlocked: true, fx: 'unlock' })
        }
      }

      const bursts = box
        ? state.bursts.concat([
            {
              id: merged.id,
              x: box.left + box.width / 2,
              y: box.top + cardTop(rest.length + 1, rest.length) + CARD_H / 2,
              color: colorOf(v + 1),
            },
          ])
        : state.bursts

      this.set({ piles, seenMax, banner, bursts, best: Math.max(state.best, v + 1) })

      this.later(FX_LIFE_MS, () => {
        this.set({
          bursts: this.state.bursts.filter((b) => b.id !== merged.id),
          banner: this.state.banner?.id === merged.id ? null : this.state.banner,
          piles: this.state.piles.map((p) => ({
            ...p,
            fx: p.fx === 'unlock' ? null : p.fx,
            cards: p.cards.map((c) => (c.fresh ? { id: c.id, v: c.v } : c)),
          })),
        })
      })
      this.later(MERGE_CASCADE_MS, () => this.checkMerge(i))
    })
  }

  /** Waits for the dust to settle before calling the run over. */
  private checkOver() {
    this.later(OVER_CHECK_MS, () => {
      const state = this.state
      if (state.over || canDeal(state.piles) || hasMove(state.piles, this.mergeCount)) return
      this.set({ over: true, sel: null })
      this.sound((a) => a.over())
    })
  }
}
