/** Where a card is flying in from, in board coordinates. */
export interface Arrival {
  dx: number
  dy: number
  delay: number
  rot: string
}

export interface Card {
  id: number
  v: number
  /** Present while the card animates in from the deck or another pile. */
  from?: Arrival
  /** The arrival came from the deck, so the card flips over on landing. */
  deal?: boolean
  /** The card was just minted by a merge and pops into place. */
  fresh?: boolean
}

export type PileFx = 'merge' | 'shake' | 'unlock' | null

export interface Pile {
  cards: Card[]
  unlocked: boolean
  fx: PileFx
}

/** Ring and sparks thrown off by a merge. */
export interface Burst {
  id: number
  x: number
  y: number
  color: string
}

/** The "new card" celebration shown the first time a value appears. */
export interface Banner {
  id: number
  v: number
}

export interface GameState {
  piles: Pile[]
  /** Index of the picked-up pile, or null. */
  sel: number | null
  deals: number
  /** Highest value seen this run; drives the deal weights and unlocks. */
  seenMax: number
  best: number
  bursts: Burst[]
  banner: Banner | null
  over: boolean
  dealPulse: boolean
}

export interface Rect {
  left: number
  top: number
  width: number
  height: number
}

/** Board-space geometry, measured by the view and read by the engine. */
export interface BoardMetrics {
  pile(index: number): Rect | null
  deck(): Rect | null
}
