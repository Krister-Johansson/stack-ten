import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { GameAudio } from './audio'

/* A Web Audio stand-in: every ramp just lands on its target value. */
class FakeParam {
  value = 0
  setValueAtTime(v: number) {
    this.value = v
  }
  linearRampToValueAtTime(v: number) {
    this.value = v
  }
  exponentialRampToValueAtTime(v: number) {
    this.value = v
  }
  setTargetAtTime(v: number) {
    this.value = v
  }
}

class FakeGain {
  gain = new FakeParam()
  connect() {}
}

class FakeAudioContext {
  state = 'running'
  currentTime = 0
  sampleRate = 48000
  destination = {}
  createGain() {
    return new FakeGain()
  }
  createOscillator() {
    return { type: '', frequency: new FakeParam(), connect() {}, start() {}, stop() {} }
  }
  createBufferSource() {
    return { buffer: null as unknown, connect() {}, start() {} }
  }
  createBuffer(_channels: number, length: number) {
    return { getChannelData: () => new Float32Array(Math.floor(length)) }
  }
  createBiquadFilter() {
    return { type: '', frequency: new FakeParam(), connect() {} }
  }
  createMediaElementSource() {
    return { connect() {} }
  }
  resume() {
    return Promise.resolve()
  }
  close() {
    return Promise.resolve()
  }
}

class FakeAudioElement {
  loop = false
  preload = ''
  paused = true
  src: string
  constructor(src: string) {
    this.src = src
  }
  play() {
    this.paused = false
    return Promise.resolve()
  }
  pause() {
    this.paused = true
  }
  addEventListener() {}
}

/** The private wiring the mixer drives. */
interface Internals {
  ctx: FakeAudioContext | null
  master: FakeGain
  sfx: FakeGain
  bgm: FakeGain
  music: FakeAudioElement | null
}
const inner = (audio: GameAudio) => audio as unknown as Internals

const store = new Map<string, string>()

beforeEach(() => {
  store.clear()
  Object.assign(globalThis, {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    },
    window: { AudioContext: FakeAudioContext },
    Audio: FakeAudioElement,
  })
})

afterEach(() => {
  store.clear()
})

describe('GameAudio', () => {
  it('starts at full volume, unmuted', () => {
    const audio = new GameAudio()
    expect(audio.muted).toBe(false)
    expect(audio.musicVolume).toBe(1)
    expect(audio.sfxVolume).toBe(1)
  })

  it('reads saved settings back', () => {
    store.set('stackten.muted', '1')
    store.set('stackten.music', '0.4')
    store.set('stackten.sfx', '0.8')

    const audio = new GameAudio()
    expect(audio.muted).toBe(true)
    expect(audio.musicVolume).toBe(0.4)
    expect(audio.sfxVolume).toBe(0.8)
  })

  it('ignores a saved level that is not a number', () => {
    store.set('stackten.music', 'loud')
    expect(new GameAudio().musicVolume).toBe(1)
  })

  it('opens the two buses at their saved levels', () => {
    store.set('stackten.music', '0.5')
    store.set('stackten.sfx', '0.5')

    const audio = new GameAudio()
    audio.ensure()

    expect(inner(audio).bgm.gain.value).toBeCloseTo(0.11)
    expect(inner(audio).sfx.gain.value).toBeCloseTo(0.3)
  })

  it('streams the soundtrack on a loop once started', () => {
    const audio = new GameAudio()
    audio.ensure()

    const music = inner(audio).music
    expect(music?.loop).toBe(true)
    expect(music?.paused).toBe(false)
    expect(music?.src).toMatch(/loop\.mp3/)
  })

  it('builds the element once, however often it is asked', () => {
    const audio = new GameAudio()
    audio.ensure()
    const first = inner(audio).music
    audio.ensure()
    expect(inner(audio).music).toBe(first)
  })

  it('moves the music bus without touching effects', () => {
    const audio = new GameAudio()
    audio.ensure()

    audio.setMusicVolume(0.5)

    expect(inner(audio).bgm.gain.value).toBeCloseTo(0.11)
    expect(inner(audio).sfx.gain.value).toBeCloseTo(0.6)
    expect(store.get('stackten.music')).toBe('0.5')
  })

  it('moves the effects bus without touching music', () => {
    const audio = new GameAudio()
    audio.ensure()

    audio.setSfxVolume(0.25)

    expect(inner(audio).sfx.gain.value).toBeCloseTo(0.15)
    expect(inner(audio).bgm.gain.value).toBeCloseTo(0.22)
    expect(store.get('stackten.sfx')).toBe('0.25')
  })

  it('clamps a level to the 0 to 1 range', () => {
    const audio = new GameAudio()
    audio.setMusicVolume(4)
    audio.setSfxVolume(-1)
    expect(audio.musicVolume).toBe(1)
    expect(audio.sfxVolume).toBe(0)
  })

  it('stops streaming music nobody can hear', () => {
    const audio = new GameAudio()
    audio.ensure()

    audio.setMusicVolume(0)
    expect(inner(audio).music?.paused).toBe(true)

    audio.setMusicVolume(0.3)
    expect(inner(audio).music?.paused).toBe(false)
  })

  it('mute silences the master bus and pauses the track', () => {
    const audio = new GameAudio()
    audio.ensure()

    audio.setMuted(true)
    expect(inner(audio).master.gain.value).toBe(0)
    expect(inner(audio).music?.paused).toBe(true)
    expect(store.get('stackten.muted')).toBe('1')

    audio.setMuted(false)
    expect(inner(audio).master.gain.value).toBe(1)
    expect(inner(audio).music?.paused).toBe(false)
    expect(store.get('stackten.muted')).toBe('0')
  })

  it('leaves the buses where they were across a mute', () => {
    const audio = new GameAudio()
    audio.ensure()
    audio.setMusicVolume(0.5)
    audio.setSfxVolume(0.5)

    audio.setMuted(true)
    audio.setMuted(false)

    expect(inner(audio).bgm.gain.value).toBeCloseTo(0.11)
    expect(inner(audio).sfx.gain.value).toBeCloseTo(0.3)
  })

  it('does not resume a muted track when a sound starts the context', () => {
    store.set('stackten.muted', '1')
    const audio = new GameAudio()
    audio.ensure()
    expect(inner(audio).music?.paused).toBe(true)
  })

  it('stays silent rather than throwing when Web Audio is missing', () => {
    Object.assign(globalThis, { window: {} })
    const audio = new GameAudio()

    expect(audio.ensure()).toBeNull()
    expect(() => audio.pick()).not.toThrow()
    expect(() => audio.setMuted(true)).not.toThrow()
    expect(() => audio.setMusicVolume(0.5)).not.toThrow()
    expect(() => audio.setSfxVolume(0.5)).not.toThrow()
  })

  it('stays silent when the browser refuses to open a context', () => {
    class Refuses {
      constructor() {
        throw new Error('blocked')
      }
    }
    Object.assign(globalThis, { window: { AudioContext: Refuses } })
    const audio = new GameAudio()

    expect(audio.ensure()).toBeNull()
    expect(() => audio.pick()).not.toThrow()
  })

  it('dispose stops the track and drops the context', () => {
    const audio = new GameAudio()
    audio.ensure()
    const music = inner(audio).music

    audio.dispose()

    expect(music?.paused).toBe(true)
    expect(inner(audio).ctx).toBeNull()
  })
})
