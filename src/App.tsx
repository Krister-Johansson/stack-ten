import { useState } from 'react'
import Banner from './components/Banner'
import Board from './components/Board'
import Deck from './components/Deck'
import GameOver from './components/GameOver'
import Help from './components/Help'
import Hud from './components/Hud'
import Mixer from './components/Mixer'
import { DEFAULT_MERGE_COUNT, MAX_MERGE_COUNT, MIN_MERGE_COUNT } from './game/constants'
import { canDeal } from './game/rules'
import { useAudioSettings } from './game/useAudioSettings'
import { useGame } from './game/useGame'
import './game/game.css'

interface AppProps {
  /** Cards of one value that collapse into the next value up. */
  mergeCount?: number
}

export default function App({ mergeCount = DEFAULT_MERGE_COUNT }: AppProps) {
  const merge = Math.min(MAX_MERGE_COUNT, Math.max(MIN_MERGE_COUNT, Math.round(mergeCount)))
  const { state, engine, scale, measurePile, wrapRef, boardRef, deckRef } = useGame(merge)
  const audio = useAudioSettings()
  // At most one popover at a time.
  const [panel, setPanel] = useState<'mixer' | 'help' | null>(null)
  const toggle = (next: 'mixer' | 'help') => setPanel((open) => (open === next ? null : next))

  return (
    <main className="screen">
      {/* Inert while the run is over, so the end panel really is the only thing
          a keyboard or screen reader can reach. */}
      <div className="play" inert={state.over}>
        <Hud
          deals={state.deals}
          best={state.best}
          muted={audio.muted}
          mixerOpen={panel === 'mixer'}
          helpOpen={panel === 'help'}
          onToggleMixer={() => {
            // Opening the mixer is a gesture, so the audio can start here and
            // the levels can be judged by ear right away.
            audio.start()
            toggle('mixer')
          }}
          onToggleHelp={() => toggle('help')}
        />
        {panel === 'mixer' ? <Mixer settings={audio} onClose={() => setPanel(null)} /> : null}
        {panel === 'help' ? <Help mergeCount={merge} onClose={() => setPanel(null)} /> : null}

        <div className="board-wrap" ref={wrapRef}>
          <Board
            state={state}
            mergeCount={merge}
            scale={scale}
            onTapPile={(i) => engine.tapPile(i)}
            measurePile={measurePile}
            boardRef={boardRef}
          />
        </div>

        <Deck
          dealable={canDeal(state.piles)}
          pulsing={state.dealPulse}
          onDeal={() => engine.deal()}
          deckRef={deckRef}
        />
      </div>

      {state.banner ? <Banner key={state.banner.id} banner={state.banner} /> : null}
      {state.over ? <GameOver best={state.best} onReplay={() => engine.reset()} /> : null}
    </main>
  )
}
