/* KiezQuiz Web Audio synthesizer */
class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem("hamburg_muted") === "true";
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx?.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  /** Returns true when the audio context is ready for immediate playback. */
  _ready() {
    this.init();
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
      return false;
    }
    return this.ctx.state === 'running';
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem("hamburg_muted", this.muted ? "true" : "false");
    return this.muted;
  }

  playCorrect() {
    if (this.muted || !this._ready()) return;
    this._playCorrectTone();
  }

  _playCorrectTone() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    
    // First Note
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(329.63, t); // E4
    osc1.frequency.setValueAtTime(440.00, t + 0.08); // A4
    
    gain1.gain.setValueAtTime(0.15, t);
    gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
    
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    
    osc1.start(t);
    osc1.stop(t + 0.4);
  }

  playSelect() {
    if (this.muted || !this._ready()) return;
    this._playSelectTone();
  }

  _playSelectTone() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, t);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  playIncorrect() {
    if (this.muted || !this._ready()) return;
    this._playIncorrectTone();
  }

  _playIncorrectTone() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.linearRampToValueAtTime(110, t + 0.3); // Descending pitch
    
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(t);
    osc.stop(t + 0.4);
  }

  playLevelUp() {
    if (this.muted || !this._ready()) return;
    this._playLevelUpTone();
  }

  playApplause() {
    if (this.muted || !this._ready()) return;
    this._playApplauseTone();
  }

  _playApplauseTone() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const claps = [
      { delay: 0, dur: 0.04, vol: 0.06 },
      { delay: 0.09, dur: 0.035, vol: 0.05 },
      { delay: 0.17, dur: 0.04, vol: 0.055 },
      { delay: 0.28, dur: 0.035, vol: 0.045 },
      { delay: 0.38, dur: 0.03, vol: 0.04 },
      { delay: 0.52, dur: 0.025, vol: 0.03 }
    ];

    claps.forEach(({ delay, dur, vol }) => {
      const bufferSize = Math.floor(this.ctx.sampleRate * dur);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const env = 1 - i / bufferSize;
        data[i] = (Math.random() * 2 - 1) * env;
      }
      const source = this.ctx.createBufferSource();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      source.buffer = buffer;
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(900 + Math.random() * 400, t + delay);
      filter.Q.setValueAtTime(0.8, t + delay);
      gain.gain.setValueAtTime(vol, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + dur);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      source.start(t + delay);
      source.stop(t + delay + dur + 0.01);
    });
  }

  playSad() {
    if (this.muted || !this._ready()) return;
    this._playSadTone();
  }

  _playSadTone() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.linearRampToValueAtTime(165, t + 0.6);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.75);
  }

  _playLevelUpTone() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // Arpeggio C4, E4, G4, C5, E5, G5, C6
    
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.08);
      
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.1, t + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.08 + 0.25);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 0.3);
    });
  }
}

