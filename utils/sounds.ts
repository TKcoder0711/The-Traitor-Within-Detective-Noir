
export class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  constructor() {
    this.init();
  }

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = 0.3;
    }
  }

  private resume() {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playClueGrab() {
    this.resume();
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playPistolToggle() {
    this.resume();
    if (!this.ctx || !this.masterGain) return;
    [0, 0.05].forEach(delay => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, this.ctx!.currentTime + delay);
      gain.gain.setValueAtTime(0.1, this.ctx!.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0, this.ctx!.currentTime + delay + 0.05);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(this.ctx!.currentTime + delay);
      osc.stop(this.ctx!.currentTime + delay + 0.05);
    });
  }

  playGunshot() {
    this.resume();
    if (!this.ctx || !this.masterGain) return;
    const bufferSize = this.ctx.sampleRate * 0.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.3);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.8, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start();
  }

  playAmbience() {
    this.resume();
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 55; // low A
    lfo.frequency.value = 0.5;
    lfoGain.gain.value = 2;
    gain.gain.value = 0.05;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    lfo.start();
  }

  playWin() {
    this.resume();
    if (!this.ctx || !this.masterGain) return;
    [261.63, 329.63, 392.00, 523.25].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + i * 0.1);
      gain.gain.setValueAtTime(0.1, this.ctx!.currentTime + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + 1);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(this.ctx!.currentTime + i * 0.1);
      osc.stop(this.ctx!.currentTime + 1);
    });
  }

  playFail() {
    this.resume();
    if (!this.ctx || !this.masterGain) return;
    [110, 116.54, 123.47].forEach(freq => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, this.ctx!.currentTime);
      gain.gain.linearRampToValueAtTime(0, this.ctx!.currentTime + 1.5);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start();
      osc.stop(this.ctx!.currentTime + 1.5);
    });
  }
}

export const sounds = new SoundManager();
