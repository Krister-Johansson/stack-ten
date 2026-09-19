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

`App` takes a `mergeCount` prop, clamped to 3 through 12. Three makes merges
cascade within a couple of deals, which is the quickest way to see the merge,
unlock, and end-of-run paths:

```tsx
<App mergeCount={3} />
```
