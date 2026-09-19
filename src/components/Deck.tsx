import type { RefObject } from 'react'

interface DeckProps {
  dealable: boolean
  pulsing: boolean
  onDeal: () => void
  deckRef: RefObject<HTMLButtonElement | null>
}

export default function Deck({ dealable, pulsing, onDeal, deckRef }: DeckProps) {
  const className = ['deck', dealable ? '' : 'is-full', pulsing ? 'is-dealing' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <div className="tray">
      <button
        type="button"
        className={className}
        ref={deckRef}
        onClick={onDeal}
        aria-label="Deal one card onto every open slot"
      >
        <span className="deck-layer deck-layer--back" />
        <span className="deck-layer deck-layer--mid" />
        <span className="deck-layer deck-layer--front">
          <span className="deck-dot" />
        </span>
      </button>
    </div>
  )
}
