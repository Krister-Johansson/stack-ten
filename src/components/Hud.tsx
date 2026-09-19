interface HudProps {
  deals: number
  best: number
  muted: boolean
  mixerOpen: boolean
  onToggleMixer: () => void
}

export default function Hud({ deals, best, muted, mixerOpen, onToggleMixer }: HudProps) {
  return (
    <header className="hud">
      <div className="hud-stat">
        <span className="hud-label">DEALS</span>
        <span className="hud-value">{deals}</span>
      </div>
      <div className="hud-title">
        <h1 className="logo">STACK TEN</h1>
        <button
          type="button"
          className={muted ? 'sound is-muted' : 'sound'}
          onClick={onToggleMixer}
          aria-expanded={mixerOpen}
          aria-controls="mixer"
        >
          {muted ? 'SOUND OFF' : 'SOUND ON'}
        </button>
      </div>
      <div className="hud-stat hud-stat--right">
        <span className="hud-label">BEST</span>
        <span className="hud-value">{best}</span>
      </div>
    </header>
  )
}
