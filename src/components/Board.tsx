import type { RefObject } from 'react'
import { PILE_CAP } from '../game/constants'
import { topRun, topValue } from '../game/rules'
import type { GameState } from '../game/types'
import Bursts from './Bursts'
import PileView from './PileView'

interface BoardProps {
  state: GameState
  mergeCount: number
  scale: number
  onTapPile: (index: number) => void
  measurePile: (index: number, el: HTMLElement | null) => void
  boardRef: RefObject<HTMLDivElement | null>
}

export default function Board({
  state,
  mergeCount,
  scale,
  onTapPile,
  measurePile,
  boardRef,
}: BoardProps) {
  const { piles, sel } = state
  const held = sel !== null ? topValue(piles[sel].cards) : null

  return (
    <div className="board" ref={boardRef} style={{ transform: `scale(${scale})` }}>
      {piles.map((pile, i) => {
        const count = pile.cards.length
        const target =
          held !== null &&
          sel !== i &&
          pile.unlocked &&
          (count === 0 ||
            (topValue(pile.cards) === held && topRun(pile.cards) < mergeCount && count < PILE_CAP))
        return (
          // The fifteen slots are a fixed, positional array: never reordered,
          // filtered, or resized, so the index is the slot's identity.
          <PileView
            key={i}
            pile={pile}
            index={i}
            selected={sel === i}
            target={target}
            onTap={onTapPile}
            measure={measurePile}
          />
        )
      })}
      <Bursts bursts={state.bursts} />
    </div>
  )
}
