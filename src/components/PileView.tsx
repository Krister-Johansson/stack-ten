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
        <span className="lock" aria-hidden="true">
          <span className="lock-shackle" />
          <span className="lock-body" />
        </span>
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
