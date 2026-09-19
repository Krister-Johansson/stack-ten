import { useState } from 'react'
import { gameAudio } from './audio'

export interface AudioSettings {
  muted: boolean
  music: number
  sfx: number
  toggleMuted: () => void
  setMusic: (level: number) => void
  setSfx: (level: number) => void
  /** Plays a short sound so an effects level can be judged by ear. */
  previewSfx: () => void
  /** Brings the audio up on a user gesture, before anything needs to sound. */
  start: () => void
}

/**
 * Mirrors the audio engine's settings into React. Every change goes through
 * `ensure`, so the first slider drag is also what starts the AudioContext.
 */
export function useAudioSettings(): AudioSettings {
  const [muted, setMuted] = useState(() => gameAudio().muted)
  const [music, setMusicLevel] = useState(() => gameAudio().musicVolume)
  const [sfx, setSfxLevel] = useState(() => gameAudio().sfxVolume)

  return {
    muted,
    music,
    sfx,
    toggleMuted: () => {
      const next = !muted
      setMuted(next)
      const audio = gameAudio()
      audio.ensure()
      audio.setMuted(next)
    },
    setMusic: (level) => {
      setMusicLevel(level)
      const audio = gameAudio()
      audio.ensure()
      audio.setMusicVolume(level)
    },
    setSfx: (level) => {
      setSfxLevel(level)
      const audio = gameAudio()
      audio.ensure()
      audio.setSfxVolume(level)
    },
    start: () => {
      gameAudio().ensure()
    },
    previewSfx: () => {
      const audio = gameAudio()
      if (audio.muted || audio.sfxVolume === 0) return
      audio.pick()
    },
  }
}
