import musicUrl from '../assets/music/loop.mp3'

const MUTE_KEY = 'stackten.muted'
const MUSIC_KEY = 'stackten.music'
const SFX_KEY = 'stackten.sfx'

/** Bus levels at full volume, so the two sides sit right against each other. */
const MUSIC_MIX = 0.22
const SFX_MIX = 0.6

interface ToneOptions {
  /** Start frequency, in Hz. */
  f: number
  /** Optional glide target. */
  f2?: number
  /** Start offset from now, in seconds. */
  t?: number
  /** Duration, in seconds. */
  d?: number
  type?: OscillatorType
  /** Peak gain. */
  g?: number
  dest?: AudioNode
}

interface NoiseOptions {
  t?: number
  d?: number
  g?: number
  /** Highpass cutoff, in Hz. */
  hp?: number
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

function storedMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

/** A saved 0 to 1 level, defaulting to full. */
function storedLevel(key: string): number {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return 1
    const value = Number(raw)
    return Number.isFinite(value) ? clamp01(value) : 1
  } catch {
    return 1
  }
}

function persist(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Private browsing: the preference just will not survive a reload.
  }
}

/**
 * Every sound is synthesized on the fly, so the game ships without audio files.
 * The context is created on the first tap, which is when browsers allow it.
 */
export class GameAudio {
  muted = storedMuted()
  musicVolume = storedLevel(MUSIC_KEY)
  sfxVolume = storedLevel(SFX_KEY)

  private ctx: AudioContext | null = null
  private master!: GainNode
  private sfx!: GainNode
  private bgm!: GainNode
  private music: HTMLAudioElement | null = null
  private synthTimer: ReturnType<typeof setInterval> | null = null
  private musicFailed = false

  /**
   * Brings the audio up, or reports that it cannot be. Sound is never worth a
   * thrown error: a browser without Web Audio, or one refusing to open a
   * context, leaves the game silent and otherwise untouched.
   */
  ensure(): AudioContext | null {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      try {
        this.ctx = new Ctor()
      } catch {
        return null
      }
      this.master = this.ctx.createGain()
      this.master.gain.value = this.muted ? 0 : 1
      this.master.connect(this.ctx.destination)
      this.sfx = this.ctx.createGain()
      this.sfx.gain.value = SFX_MIX * this.sfxVolume
      this.sfx.connect(this.master)
      this.bgm = this.ctx.createGain()
      this.bgm.gain.value = MUSIC_MIX * this.musicVolume
      this.bgm.connect(this.master)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    this.startMusic()
    return this.ctx
  }

  setMuted(muted: boolean) {
    this.muted = muted
    persist(MUTE_KEY, muted ? '1' : '0')
    if (this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.03)
    this.syncMusicPlayback()
  }

  setMusicVolume(level: number) {
    this.musicVolume = clamp01(level)
    persist(MUSIC_KEY, String(this.musicVolume))
    this.ramp(this.bgm, MUSIC_MIX * this.musicVolume)
    this.syncMusicPlayback()
  }

  setSfxVolume(level: number) {
    this.sfxVolume = clamp01(level)
    persist(SFX_KEY, String(this.sfxVolume))
    this.ramp(this.sfx, SFX_MIX * this.sfxVolume)
  }

  private ramp(bus: GainNode | undefined, value: number) {
    if (this.ctx && bus) bus.gain.setTargetAtTime(value, this.ctx.currentTime, 0.03)
  }

  /** Nothing audible to play means nothing to stream. */
  private syncMusicPlayback() {
    if (!this.music) return
    if (this.muted || this.musicVolume === 0) this.music.pause()
    else if (this.music.paused) void this.music.play().catch(() => {})
  }

  dispose() {
    this.music?.pause()
    this.music = null
    if (this.synthTimer) clearInterval(this.synthTimer)
    this.synthTimer = null
    this.musicFailed = false
    void this.ctx?.close()
    this.ctx = null
  }

  private tone({ f, f2, t = 0, d = 0.12, type = 'sine', g = 0.3, dest }: ToneOptions) {
    const c = this.ensure()
    if (!c) return
    const osc = c.createOscillator()
    const amp = c.createGain()
    const at = c.currentTime + t
    osc.type = type
    osc.frequency.setValueAtTime(f, at)
    if (f2) osc.frequency.exponentialRampToValueAtTime(f2, at + d)
    amp.gain.setValueAtTime(0, at)
    amp.gain.linearRampToValueAtTime(g, at + 0.008)
    amp.gain.exponentialRampToValueAtTime(0.0001, at + d)
    osc.connect(amp)
    amp.connect(dest ?? this.sfx)
    osc.start(at)
    osc.stop(at + d + 0.02)
  }

  private noise({ t = 0, d = 0.08, g = 0.2, hp = 1200 }: NoiseOptions) {
    const c = this.ensure()
    if (!c) return
    const src = c.createBufferSource()
    const buf = c.createBuffer(1, c.sampleRate * d, c.sampleRate)
    const ch = buf.getChannelData(0)
    for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length)
    src.buffer = buf
    const filter = c.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = hp
    const amp = c.createGain()
    amp.gain.value = g
    src.connect(filter)
    filter.connect(amp)
    amp.connect(this.sfx)
    src.start(c.currentTime + t)
  }

  pick() {
    this.tone({ f: 520, f2: 780, d: 0.09, type: 'triangle', g: 0.25 })
  }

  unpick() {
    this.tone({ f: 700, f2: 480, d: 0.09, type: 'triangle', g: 0.2 })
  }

  /** One thud per card, in time with the staggered landing. */
  drop(count: number) {
    for (let i = 0; i < Math.min(count, 10); i++) {
      this.tone({ f: 300 + i * 30, f2: 180, t: 0.3 + i * 0.026, d: 0.07, type: 'square', g: 0.12 })
      this.noise({ t: 0.3 + i * 0.026, d: 0.04, g: 0.08, hp: 2500 })
    }
  }

  deal(count: number) {
    for (let i = 0; i < count; i++) {
      this.noise({ t: i * 0.04, d: 0.09, g: 0.14, hp: 900 })
      this.tone({ f: 900, f2: 1400, t: 0.24 + i * 0.04, d: 0.06, g: 0.1 })
    }
  }

  bad() {
    this.tone({ f: 160, f2: 120, d: 0.18, type: 'sawtooth', g: 0.18 })
  }

  /** Arpeggio pitched to the card value, so bigger merges ring higher. */
  merge(v: number) {
    const base = 330 * Math.pow(1.06, v)
    ;[0, 4, 7, 12].forEach((semi, i) => {
      this.tone({
        f: base * Math.pow(2, semi / 12),
        t: 0.38 + i * 0.05,
        d: 0.35,
        type: 'triangle',
        g: 0.22,
      })
    })
    this.noise({ t: 0.38, d: 0.25, g: 0.12, hp: 3000 })
  }

  unlock() {
    ;[0, 7, 12, 16, 19].forEach((semi, i) => {
      this.tone({ f: 660 * Math.pow(2, semi / 12), t: 0.5 + i * 0.07, d: 0.5, g: 0.2 })
    })
  }

  over() {
    ;[0, -3, -7, -12].forEach((semi, i) => {
      this.tone({ f: 440 * Math.pow(2, semi / 12), t: i * 0.18, d: 0.4, type: 'triangle', g: 0.22 })
    })
  }

  /**
   * Streams the soundtrack through the music bus, so the mute toggle and the
   * music mix level apply to it. Safe to call on every sound: it builds the
   * element once and only resumes a track that has stopped.
   */
  private startMusic() {
    if (!this.ctx || this.musicFailed) return
    if (!this.music) {
      const el = new Audio(musicUrl)
      el.loop = true
      el.preload = 'auto'
      el.addEventListener('error', () => this.useSynthMusic(), { once: true })
      this.ctx.createMediaElementSource(el).connect(this.bgm)
      this.music = el
    }
    this.syncMusicPlayback()
  }

  /** If the track will not load or decode, fall back to the synthesized loop. */
  private useSynthMusic() {
    this.musicFailed = true
    this.music = null
    if (!this.synthTimer) this.startSynthLoop()
  }

  /** A two-bar bass and arpeggio loop, rescheduled one bar at a time. */
  private startSynthLoop() {
    const beat = 60 / 96
    const bar = beat * 4
    const chords = [
      [220, 261.6, 329.6],
      [196, 246.9, 293.7],
      [174.6, 220, 261.6],
      [196, 246.9, 329.6],
    ]
    const pattern = [0, 1, 2, 1, 0, 2, 1, 2]
    let bars = 0

    const schedule = () => {
      const chord = chords[bars % 4]
      this.tone({ f: chord[0] / 2, t: 0.05, d: bar * 0.9, type: 'triangle', g: 0.18, dest: this.bgm })
      for (let s = 0; s < 8; s++) {
        const note = chord[pattern[s]] * (s % 4 === 3 ? 2 : 1)
        this.tone({
          f: note,
          t: 0.05 + (s * beat) / 2,
          d: beat * 0.45,
          type: 'square',
          g: 0.05,
          dest: this.bgm,
        })
      }
      if (bars % 2 === 1) {
        this.tone({ f: chord[2] * 2, t: 0.05 + beat * 3, d: beat, g: 0.06, dest: this.bgm })
      }
      bars++
    }

    schedule()
    this.synthTimer = setInterval(schedule, bar * 1000)
  }
}

let shared: GameAudio | null = null

/** One engine for the whole app; it holds a single AudioContext. */
export function gameAudio(): GameAudio {
  shared ??= new GameAudio()
  return shared
}
