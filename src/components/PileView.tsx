import { topRun } from '../game/rules'
import type { Pile } from '../game/types'
import CardView from './CardView'
import type { CardMode } from './cardStyle'

interface PileViewProps {
  pile: Pile
  index: number
  selected: boolean
  /** The picked-up run can legally land here. */
  target: boolean
  onTap: (index: number) => void
  measure: (index: number, el: HTMLElement | null) => void
}

function label(pile: Pile, index: number): string {
  const slot = `Slot ${index + 1}`
  if (!pile.unlocked) return `${slot}, locked`
  if (!pile.cards.length) return `${slot}, empty`
  const top = pile.cards[pile.cards.length - 1].v
  return `${slot}, ${pile.cards.length} cards, top card ${top}`
}

export default function PileView({
  pile,
  index,
  selected,
  target,
  onTap,
  measure,
}: PileViewProps) {
  const count = pile.cards.length
  const runStart = count - topRun(pile.cards)
  const mode: CardMode = pile.fx === 'merge' ? 'collapsing' : selected ? 'lifted' : 'idle'

  const className = [
    'pile',
    pile.unlocked ? '' : 'is-locked',
    selected ? 'is-selected' : '',
    target ? 'is-target' : '',
    pile.fx === 'unlock' ? 'fx-unlock' : '',
    pile.fx === 'shake' ? 'fx-shake' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type="button"
      className={className}
      ref={(el) => {
        measure(index, el)
      }}
      onClick={() => onTap(index)}
      aria-label={label(pile, index)}
      aria-pressed={selected}
    >
      {pile.unlocked ? null : (
        <svg className="lock" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M8 11V7.5a4 4 0 0 1 8 0V11"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <rect x="4.6" y="10.6" width="14.8" height="10.8" rx="3" fill="currentColor" />
        </svg>
      )}
      {pile.cards.map((card, i) => (
        <CardView
          key={card.id}
          card={card}
          index={i}
          count={count}
          inRun={i >= runStart}
          mode={mode}
        />
      ))}
    </button>
  )
}
