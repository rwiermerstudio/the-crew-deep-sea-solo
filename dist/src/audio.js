export const NAUTICAL_PATTERN = [146.83, 174.61, 196.0, 174.61, 146.83, 130.81, 146.83, 110.0];
export const MUSIC_PATTERNS = { calm: NAUTICAL_PATTERN, mystery: [110,130.81,155.56,146.83,110,98,123.47,110], pressure: [196,220,196,246.94,220,261.63,246.94,220] };
export function musicMoodFor(state) { if (state.over) return 'calm'; if (state.rules?.timer && state.timerLeft && state.timerLeft <= 30) return 'pressure'; if (state.rules?.bannedLeads?.length || state.rules?.randomSonar) return 'mystery'; return 'calm'; }
export const soundEventProfile = {
  play: { frequency: 330, duration: 0.07, type: 'triangle' },
  sonar: { frequency: 740, duration: 0.42, type: 'sine' },
  win: { frequency: 523.25, duration: 0.36, type: 'sine' },
  loss: { frequency: 155.56, duration: 0.45, type: 'sawtooth' }
};

export class NauticalAudio {
  constructor() { this.enabled = localStorage.getItem('deep-sea-sound') !== 'off'; this.context = null; this.master = null; this.step = 0; this.timer = null; this.mood = 'calm'; }
  async unlock() {
    if (!this.enabled) return;
    this.context ||= new AudioContext(); this.master ||= this.makeMaster();
    if (this.context.state === 'suspended') await this.context.resume();
    if (!this.timer) this.timer = setInterval(() => this.musicTick(), 900);
  }
  makeMaster() { const gain = this.context.createGain(); gain.gain.value = 0.2; gain.connect(this.context.destination); return gain; }
  setMood(state) { this.mood = typeof state === 'string' ? state : musicMoodFor(state); }
  setEnabled(enabled) { this.enabled = enabled; localStorage.setItem('deep-sea-sound', enabled ? 'on' : 'off'); if (!enabled) this.stop(); else this.unlock(); }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }
  tone(frequency, duration, type = 'sine', volume = 0.12, delay = 0) {
    if (!this.enabled || !this.context || !this.master) return;
    const now = this.context.currentTime + delay, osc = this.context.createOscillator(), gain = this.context.createGain();
    osc.type = type; osc.frequency.setValueAtTime(frequency, now); gain.gain.setValueAtTime(0.0001, now); gain.gain.exponentialRampToValueAtTime(volume, now + 0.025); gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(this.master); osc.start(now); osc.stop(now + duration + 0.03);
  }
  musicTick() { const pattern = MUSIC_PATTERNS[this.mood] || NAUTICAL_PATTERN, note = pattern[this.step++ % pattern.length]; const urgent=this.mood==='pressure', eerie=this.mood==='mystery'; this.tone(note / 2, urgent ? 0.58 : 0.8, eerie ? 'sine' : 'triangle', urgent ? 0.075 : 0.065); this.tone(note, urgent ? 0.2 : 0.34, eerie ? 'sawtooth' : 'sine', urgent ? 0.05 : 0.035, 0.08); if (this.step % 4 === 0) this.tone(note * (eerie ? 1.498 : 1.25), 0.18, 'sine', 0.025, 0.18); }
  effect(name) { const p = soundEventProfile[name]; if (!p) return; this.tone(p.frequency, p.duration, p.type, 0.16); if (name === 'win') this.tone(p.frequency * 1.25, p.duration * 0.8, 'sine', 0.1, 0.12); if (name === 'sonar') this.tone(p.frequency / 2, p.duration, 'sine', 0.06, 0.08); }
}
