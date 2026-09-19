import { CircleHelp, Volume2, VolumeX } from 'lucide-react'

interface HudProps {
  deals: number
  best: number
  muted: boolean
  mixerOpen: boolean
  helpOpen: boolean
  onToggleMixer: () => void
  onToggleHelp: () => void
}

export default function Hud({
  deals,
  best,
  muted,
  mixerOpen,
  helpOpen,
  onToggleMixer,
  onToggleHelp,
}: HudProps) {
  return (
    <header className="hud">
      <div className="hud-stat">
        <span className="hud-label">DEALS</span>
        <span className="hud-value">{deals}</span>
      </div>
      <div className="hud-title">
        <h1 className="logo">STACK TEN</h1>
        <div className="hud-actions">
          <button
            type="button"
            className="help-toggle"
            onClick={onToggleHelp}
            aria-expanded={helpOpen}
            aria-controls="help"
            aria-label="How to play"
          >
            <CircleHelp size={20} strokeWidth={2.2} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={muted ? 'sound is-muted' : 'sound'}
            onClick={onToggleMixer}
            aria-expanded={mixerOpen}
            aria-controls="mixer"
          >
            {muted ? (
              <VolumeX size={12} strokeWidth={2.6} aria-hidden="true" />
            ) : (
              <Volume2 size={12} strokeWidth={2.6} aria-hidden="true" />
            )}
            {muted ? 'SOUND OFF' : 'SOUND ON'}
          </button>
        </div>
      </div>
      <div className="hud-stat hud-stat--right">
        <span className="hud-label">BEST</span>
        <span className="hud-value">{best}</span>
      </div>
    </header>
  )
}
