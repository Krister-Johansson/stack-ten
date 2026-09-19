import type { AudioSettings } from '../game/useAudioSettings'
import { useDismiss } from './useDismiss'

interface LevelProps {
  id: string
  label: string
  value: number
  disabled: boolean
  onChange: (level: number) => void
  onSettle?: () => void
}

function Level({ id, label, value, disabled, onChange, onSettle }: LevelProps) {
  const percent = Math.round(value * 100)
  return (
    <div className="level">
      <label className="level-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="level-range"
        type="range"
        min={0}
        max={100}
        step={5}
        value={percent}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        onPointerUp={onSettle}
        onKeyUp={onSettle}
      />
      <span className="level-value">{percent}</span>
    </div>
  )
}

interface MixerProps {
  settings: AudioSettings
  onClose: () => void
}

export default function Mixer({ settings, onClose }: MixerProps) {
  const panel = useDismiss(onClose, '.sound')

  return (
    <div className="popover mixer" id="mixer" ref={panel}>
      <Level
        id="mix-music"
        label="MUSIC"
        value={settings.music}
        disabled={settings.muted}
        onChange={settings.setMusic}
      />
      <Level
        id="mix-sfx"
        label="EFFECTS"
        value={settings.sfx}
        disabled={settings.muted}
        onChange={settings.setSfx}
        onSettle={settings.previewSfx}
      />
      <button
        type="button"
        className={settings.muted ? 'mixer-mute is-muted' : 'mixer-mute'}
        onClick={settings.toggleMuted}
        aria-pressed={settings.muted}
      >
        {settings.muted ? 'UNMUTE ALL' : 'MUTE ALL'}
      </button>
    </div>
  )
}
