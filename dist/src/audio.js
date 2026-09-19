export const NAUTICAL_PATTERN = [146.83, 174.61, 196.0, 174.61, 146.83, 130.81, 146.83, 110.0];
export const soundEventProfile = {
  play: { frequency: 330, duration: 0.07, type: 'triangle' },
  sonar: { frequency: 740, duration: 0.42, type: 'sine' },
  win: { frequency: 523.25, duration: 0.36, type: 'sine' },
  loss: { frequency: 155.56, duration: 0.45, type: 'sawtooth' }
};

export class NauticalAudio {
  constructor() { this.enabled = localStorage.getItem('deep-sea-sound') !== 'off'; this.context = null; this.master = null; this.step = 0; this.timer = null; }
  async unlock() {
    if (!this.enabled) return;
    this.context ||= new AudioContext(); this.master ||= this.makeMaster();
    if (this.context.state === 'suspended') await this.context.resume();
    if (!this.timer) this.timer = setInterval(() => this.musicTick(), 900);
  }
  makeMaster() { const gain = this.context.createGain(); gain.gain.value = 0.13; gain.connect(this.context.destination); return gain; }
  setEnabled(enabled) { this.enabled = enabled; localStorage.setItem('deep-sea-sound', enabled ? 'on' : 'off'); if (!enabled) this.stop(); else this.unlock(); }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }
  tone(frequency, duration, type = 'sine', volume = 0.12, delay = 0) {
    if (!this.enabled || !this.context || !this.master) return;
    const now = this.context.currentTime + delay, osc = this.context.createOscillator(), gain = this.context.createGain();
    osc.type = type; osc.frequency.setValueAtTime(frequency, now); gain.gain.setValueAtTime(0.0001, now); gain.gain.exponentialRampToValueAtTime(volume, now + 0.025); gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(this.master); osc.start(now); osc.stop(now + duration + 0.03);
  }
  musicTick() { const note = NAUTICAL_PATTERN[this.step++ % NAUTICAL_PATTERN.length]; this.tone(note / 2, 0.75, 'sine', 0.045); this.tone(note, 0.3, 'triangle', 0.025, 0.08); }
  effect(name) { const p = soundEventProfile[name]; if (!p) return; this.tone(p.frequency, p.duration, p.type, 0.16); if (name === 'win') this.tone(p.frequency * 1.25, p.duration * 0.8, 'sine', 0.1, 0.12); if (name === 'sonar') this.tone(p.frequency / 2, p.duration, 'sine', 0.06, 0.08); }
}
