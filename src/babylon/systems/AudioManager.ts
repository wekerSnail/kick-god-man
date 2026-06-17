export class AudioManager {
  private context: AudioContext | null = null
  private sounds = new Map<string, AudioBuffer>()
  private masterGain: GainNode | null = null
  private sfxGain: GainNode | null = null
  private initialized = false

  constructor() {
    const init = () => {
      if (this.initialized) return
      this.context = new AudioContext()
      this.masterGain = this.context.createGain()
      this.sfxGain = this.context.createGain()
      this.sfxGain.connect(this.masterGain)
      this.masterGain.connect(this.context.destination)
      this.initialized = true
      document.removeEventListener('click', init)
      document.removeEventListener('keydown', init)
    }
    document.addEventListener('click', init)
    document.addEventListener('keydown', init)
  }

  async loadSound(name: string, url: string): Promise<void> {
    if (!this.context) return
    try {
      const response = await fetch(url)
      const buffer = await this.context.decodeAudioData(await response.arrayBuffer())
      this.sounds.set(name, buffer)
    } catch {
      console.warn(`Failed to load sound: ${name}`)
    }
  }

  play(name: string): void {
    if (!this.context || !this.sfxGain) return
    const buffer = this.sounds.get(name)
    if (!buffer) return

    const source = this.context.createBufferSource()
    source.buffer = buffer
    source.connect(this.sfxGain)
    source.start()
  }

  setVolume(v: number): void {
    this.masterGain?.gain.setTargetAtTime(
      Math.max(0, Math.min(1, v)),
      this.context!.currentTime,
      0.05
    )
  }

  dispose(): void {
    this.context?.close()
    this.sounds.clear()
  }
}
