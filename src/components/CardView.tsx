import type { Card } from '../game/types'
import { cardVisual, type CardMode } from './cardStyle'

interface CardViewProps {
  card: Card
  index: number
  count: number
  /** The card is part of the pile's top run, so it lifts and merges with it. */
  inRun: boolean
  mode: CardMode
}

export default function CardView({ card, index, count, inRun, mode }: CardViewProps) {
  const visual = cardVisual(card, index, count, inRun, mode)

  return (
    <span className={visual.slotClassName} style={visual.slotStyle}>
      <span className={visual.faceClassName} style={visual.faceStyle}>
        <span className="card-corner">{card.v}</span>
        <span className="card-value">{card.v}</span>
        {card.from && card.deal ? (
          <span
            className="card-back"
            style={{ animation: `backHide ${card.from.delay + 240}ms linear both` }}
          >
            <span className="card-back-dot" />
          </span>
        ) : null}
      </span>
    </span>
  )
}
