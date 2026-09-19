import type { CSSProperties } from 'react'
import { LIFT, colorOf } from '../game/constants'
import { cardTop } from '../game/rules'
import type { Card } from '../game/types'

export type StyleWithVars = CSSProperties & { [key: `--${string}`]: string }

/** Idle in its pile, lifted with a picked-up run, or collapsing into a merge. */
export type CardMode = 'idle' | 'lifted' | 'collapsing'

const faceGradient = (color: string) =>
  `linear-gradient(180deg,#fff 0%, color-mix(in oklab, ${color} 16%, #fff) 100%)`

/** How the pile's current state displaces a card from its resting slot. */
function displacement(
  index: number,
  count: number,
  inRun: boolean,
  mode: CardMode,
  flying: boolean,
): CSSProperties {
  const stacked: CSSProperties = { zIndex: flying ? 60 + index : index + 1 }
  if (mode === 'idle' || !inRun) return stacked

  const isTop = index === count - 1
  if (mode === 'collapsing') {
    const travel = cardTop(count, count - 1) - cardTop(count, index)
    return { ...stacked, transform: `translateY(${travel}px) scale(.55)`, opacity: isTop ? 1 : 0.35 }
  }
  return {
    zIndex: 30 + index,
    transform: `translateY(-${LIFT}px) scale(1.06) rotate(${isTop ? -2 : 0}deg)`,
  }
}

/** The animation that brings a card onto the board, if it is still arriving. */
function entrance(card: Card): StyleWithVars {
  if (card.fresh) return { animation: 'pop .55s cubic-bezier(.2,1.4,.4,1) both' }
  if (!card.from) return {}

  const { dx, dy, rot, delay } = card.from
  return {
    '--dx': `${dx}px`,
    '--dy': `${dy}px`,
    '--rot': rot,
    animation: card.deal
      ? // Fly in face-down, turn edge-on, then flip open. The flip fills forwards
        // only, so it leaves the flight alone until its turn.
        `arriveBack .24s cubic-bezier(.35,.2,.3,1) ${delay}ms both,` +
        ` flipIn .3s cubic-bezier(.2,.8,.3,1) ${delay + 240}ms forwards`
      : `arrive .34s cubic-bezier(.35,.2,.3,1) ${delay}ms both`,
  }
}

export function cardStyle(
  card: Card,
  index: number,
  count: number,
  inRun: boolean,
  mode: CardMode,
): StyleWithVars {
  const color = colorOf(card.v)
  return {
    top: cardTop(count, index),
    color,
    borderColor: color,
    background: faceGradient(color),
    ...displacement(index, count, inRun, mode, Boolean(card.from)),
    ...entrance(card),
  }
}

export function cardClassName(card: Card, inRun: boolean, mode: CardMode): string {
  if (card.from) return 'card is-flying'
  return mode === 'lifted' && inRun ? 'card is-lifted' : 'card'
}
