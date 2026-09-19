import type { CSSProperties } from 'react'
import { LIFT, colorOf } from '../game/constants'
import { cardTop } from '../game/rules'
import type { Card } from '../game/types'

export type StyleWithVars = CSSProperties & { [key: `--${string}`]: string }

/** Idle in its pile, lifted with a picked-up run, or collapsing into a merge. */
export type CardMode = 'idle' | 'lifted' | 'collapsing'

/**
 * A card is two elements. The outer slot holds its place in the stack and
 * never does anything else; the face carries every flight, lift and merge.
 * Keeping the two apart means both stay on the compositor: nothing here
 * animates a property that would force layout.
 */
export interface CardVisual {
  slotClassName: string
  slotStyle: StyleWithVars
  faceClassName: string
  faceStyle: StyleWithVars
}

const faceGradient = (color: string) =>
  `linear-gradient(180deg,#fff 0%, color-mix(in oklab, ${color} 16%, #fff) 100%)`

/** Cards in flight ride above the board; a lifted run rides above the rest. */
function stackOrder(card: Card, index: number, inRun: boolean, mode: CardMode): number {
  if (card.from) return 60 + index
  if (mode === 'lifted' && inRun) return 30 + index
  return index + 1
}

/** How the pile's current state displaces a card from its resting slot. */
function displacement(index: number, count: number, inRun: boolean, mode: CardMode): CSSProperties {
  if (mode === 'idle' || !inRun) return {}
  const isTop = index === count - 1

  if (mode === 'collapsing') {
    const travel = cardTop(count, count - 1) - cardTop(count, index)
    // The cards under the top one fan slightly as they fold into it.
    const tilt = isTop ? 0 : index % 2 ? 5 : -5
    return {
      transform: `translateY(${travel}px) scale(.55) rotate(${tilt}deg)`,
      opacity: isTop ? 1 : 0.35,
    }
  }
  return { transform: `translateY(-${LIFT}px) scale(1.06) rotate(${isTop ? -2 : 0}deg)` }
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

export function cardVisual(
  card: Card,
  index: number,
  count: number,
  inRun: boolean,
  mode: CardMode,
): CardVisual {
  const color = colorOf(card.v)
  const held = mode === 'lifted' && inRun

  const slotStyle: StyleWithVars = {
    '--slot-y': `${cardTop(count, index)}px`,
    zIndex: stackOrder(card, index, inRun, mode),
  }
  // Offset each card's sway so a held run undulates instead of moving as a block.
  if (held) slotStyle.animationDelay = `${-index * 180}ms`

  return {
    slotClassName: held ? 'card-slot is-swaying' : 'card-slot',
    slotStyle,
    faceClassName: [
      'card',
      card.from ? 'is-flying' : '',
      held ? 'is-lifted' : '',
      mode === 'collapsing' && inRun ? 'is-collapsing' : '',
    ]
      .filter(Boolean)
      .join(' '),
    faceStyle: {
      color,
      borderColor: color,
      background: faceGradient(color),
      ...displacement(index, count, inRun, mode),
      ...entrance(card),
    },
  }
}
