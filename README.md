# Stack Ten

A one-thumb card stacker. Tap the deck to drop a card on every open slot, tap a
slot to pick up its top run, and tap another to move it. Ten of a kind collapse
into one card of the next number up, and every new number you reach opens
another slot. The run ends when no move and no deal is left.

Built from the `Stack Ten.dc.html` Claude Design prototype.

## Running it

```sh
pnpm install
pnpm dev      # http://localhost:5173
pnpm build    # type-check and bundle into dist/
pnpm lint
pnpm test     # vitest, once
```

## How the code is laid out

`src/game/` holds the game and nothing about React:

- `constants.ts` — board measurements, the card palette, the slot unlock order,
  and the animation timings the stylesheet also relies on.
- `rules.ts` — pure functions over piles: the top run, stacking offsets, and
  whether a drop, a deal, or any move at all is still legal.
- `engine.ts` — `StackTenEngine`, the whole game. It replaces its state
  synchronously and notifies subscribers, so a step scheduled after an animation
  always reads what the previous step wrote. It measures nothing itself: the
  view hands it board geometry through `setMetrics`.
- `audio.ts` — Web Audio. Effects are synthesized on the fly; the soundtrack
  streams from `src/assets/music/loop.mp3` through a music bus, so one mixer
  controls both. Nothing is created until the first tap, which is when browsers
  allow an `AudioContext`. If the track will not load, a synthesized loop takes
  over.
- `useGame.ts` — subscribes React to the engine with `useSyncExternalStore`,
  feeds it board geometry, and scales the board down on short screens.
- `useAudioSettings.ts` — mirrors the mute switch and the two volume levels into
  React for the mixer panel. Levels persist in `localStorage`.

`src/components/` renders that state. Values that depend on the game (card
colors, stack offsets, flight vectors) are inline styles; the rest is in
`src/game/game.css`.

## Motion

Every card is two elements. The outer `.card-slot` holds its place in the
stack and does nothing else; the inner `.card` carries every flight, lift and
merge. Nothing animates a property that would force layout, so re-spacing a
pile of ten costs no layout work, and the two transforms never fight each
other.

The rest is animation principles applied where they earn their place:

- Arrivals end on a squash and recover, baked into the tail of the `arrive`
  and `flipIn` keyframes rather than chained after them. That keeps each
  landing inside the window the engine already waits for, so the timings in
  `constants.ts` did not have to move.
- Card faces scale from their bottom edge, which is where a card meets the
  stack below it, so a landing reads as weight rather than as a resize.
- A dealt card turns under a 340px perspective, so it reads as a card on its
  edge instead of a rectangle folding flat.
- A held run sways on a slow loop, each card offset from the one under it, so
  it undulates instead of hanging dead in the air.
- The deck dips before it throws. Anticipation before the action.
- Folding into a merge drops the springy easing the pick-up uses, because
  overshoot reads wrong on cards converging into one.

`prefers-reduced-motion: reduce` cuts all of it. None of it is load-bearing:
the engine runs on timers and never waits on an animation event.

## Icon

`public/favicon.svg` is the source: a card bearing a ten, in the colour the
palette gives that value, over two more fanned behind it on the board's felt.
It is drawn on a 64 unit grid with the numerals as paths rather than text, so
it needs no font and stays crisp at 16px.

`public/apple-touch-icon.png` is generated from it. iOS masks the icon itself,
so that one is full bleed with the rounding dropped:

```sh
sed 's|rect width="64" height="64" rx="14"|rect width="64" height="64"|' \
  public/favicon.svg | rsvg-convert -w 180 -h 180 -o public/apple-touch-icon.png
```

## Sound

Tapping the SOUND pill opens a mixer with separate MUSIC and EFFECTS levels and
a mute switch. The two levels scale fixed bus gains (0.22 for music, 0.6 for
effects), so the mix between the two sides holds at any volume. Dropping music
to zero pauses the stream rather than playing it silently.

To change the soundtrack, replace `src/assets/music/loop.mp3`. Vite hashes the
emitted filename, so the new file caches correctly.

## Tests

`pnpm test` runs Vitest against the game layer in Node, with no DOM. The engine
tests drive real timings on fake timers, so a deal, a merge cascade, an unlock,
and the end of a run all play out in a few milliseconds. The audio tests run
against a Web Audio stand-in and cover the bus levels, muting, and persistence.

## Changing the rules

`App` takes a `mergeCount` prop, clamped to 3 through `PILE_CAP`. A run
lives inside one pile, so asking for more cards than a pile holds would mean
nothing ever merges. Three makes merges
cascade within a couple of deals, which is the quickest way to see the merge,
unlock, and end-of-run paths:

```tsx
<App mergeCount={3} />
```
