/** Card face size, in board pixels. */
export const CARD_W = 58
export const CARD_H = 78

/** A pile slot is a fixed box; cards stack inside it with a shrinking step. */
export const SLOT_H = 150
export const SLOT_GAP = 8
export const SLOT_PAD = 8
export const PILE_CAP = 10
export const PILE_COUNT = 15
export const BOARD_COLS = 5

/** How far a picked-up run lifts out of its pile. */
export const LIFT = 16

/**
 * Cards of the same value needed to merge into the next one up. A run cannot
 * outgrow the pile holding it, so the cap is also the ceiling here: above it,
 * no run would ever complete and the game would never merge anything.
 */
export const DEFAULT_MERGE_COUNT = 10
export const MIN_MERGE_COUNT = 3
export const MAX_MERGE_COUNT = PILE_CAP

/** Pile indices in the order they open up; the first four start open. */
export const UNLOCK_ORDER = [10, 11, 12, 13, 14, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4]
export const START_UNLOCKED = 4

/** Highest value in play at the start, and so the opening best score. */
export const START_MAX = 3

const PALETTE: Record<number, string> = {
  1: '#3E8FD8',
  2: '#F07F1F',
  3: '#4FAE55',
  4: '#9B5DE5',
  5: '#22A99A',
  6: '#B5563A',
  7: '#3B5BDB',
  8: '#E0A100',
  9: '#7A8450',
  10: '#E23D3D',
  11: '#5A5F87',
  12: '#D14FBE',
}

export const colorOf = (v: number) => PALETTE[v] ?? '#1f1f1f'

/* Animation timings the engine and the stylesheet have to agree on. */
export const MOVE_MS = 340
export const MOVE_STAGGER = 26
export const DEAL_MS = 240
export const DEAL_STAGGER = 40
export const DEAL_SETTLE_MS = 320
export const MERGE_COLLAPSE_MS = 380
export const MERGE_CASCADE_MS = 520
export const FX_LIFE_MS = 1500
export const SHAKE_MS = 450
export const OVER_CHECK_MS = 700
