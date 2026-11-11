// 全部用 WebAudio 合成的音效和一段原创的循环小曲，不依赖任何音频文件
export class Sfx {
  constructor() { this.ctx = null; this.on = true; this.bgmTimer = null; this.step = 0; }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = this.on ? 0.5 : 0; this.master.connect(this.ctx.destination);
    this.music = this.ctx.createGain(); this.music.gain.value = 0.16; this.music.connect(this.master);
    this.startBgm();
  }

  toggle() { this.on = !this.on; if (this.master) this.master.gain.value = this.on ? 0.5 : 0; return this.on; }

  tone(f, dur, { type = 'sine', vol = 0.3, to = null, delay = 0, dest = null } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.master); o.start(t); o.stop(t + dur + 0.02);
  }

  noise(dur, { freq = 2000, q = 1, vol = 0.3, type = 'bandpass', delay = 0, to = null } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay, n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = this.ctx.createBufferSource(); s.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t);
  }

  pop() { this.tone(520, 0.09, { to: 880, vol: 0.25 }); }
  pour() { this.noise(0.32, { freq: 900, to: 2400, q: 2, vol: 0.22 }); this.tone(300, 0.3, { to: 620, vol: 0.06 }); }
  pump() { this.noise(0.12, { freq: 500, q: 3, vol: 0.3 }); this.tone(180, 0.1, { to: 90, vol: 0.2 }); }
  plop() { this.tone(420, 0.1, { to: 160, vol: 0.3 }); this.tone(380, 0.1, { to: 150, vol: 0.2, delay: 0.07 }); }
  ice() { for (let i = 0; i < 4; i++) this.tone(2200 + Math.random() * 1600, 0.05, { type: 'triangle', vol: 0.12, delay: i * 0.04 }); }
  smash() { this.noise(0.14, { freq: 300, type: 'lowpass', vol: 0.7 }); this.tone(130, 0.14, { to: 50, vol: 0.5 }); this.noise(0.2, { freq: 3000, vol: 0.12, delay: 0.02 }); }
  cream(p) { this.noise(0.09, { freq: 500 + p * 900, q: 4, vol: 0.09 }); }
  splat() { this.noise(0.3, { freq: 400, type: 'lowpass', vol: 0.6 }); this.tone(200, 0.3, { to: 60, type: 'sawtooth', vol: 0.2 }); }
  seal() { this.noise(0.2, { freq: 4000, vol: 0.15 }); this.tone(90, 0.16, { to: 50, vol: 0.5, delay: 0.18 }); this.tone(1400, 0.08, { vol: 0.12, delay: 0.36 }); }
  shake() { for (let i = 0; i < 9; i++) this.noise(0.06, { freq: 2600 + (i % 2) * 900, q: 2, vol: 0.2, delay: i * 0.1 }); }
  ding() { this.tone(988, 0.25, { type: 'triangle', vol: 0.3 }); this.tone(1319, 0.4, { type: 'triangle', vol: 0.3, delay: 0.1 }); this.tone(1976, 0.5, { type: 'triangle', vol: 0.18, delay: 0.2 }); }
  ok() { this.tone(660, 0.18, { type: 'triangle', vol: 0.28 }); this.tone(784, 0.25, { type: 'triangle', vol: 0.24, delay: 0.1 }); }
  coin() { this.tone(1568, 0.07, { type: 'square', vol: 0.1 }); this.tone(2093, 0.3, { type: 'square', vol: 0.1, delay: 0.07 }); }
  buzz() { this.tone(150, 0.3, { type: 'sawtooth', vol: 0.22 }); this.tone(110, 0.35, { type: 'sawtooth', vol: 0.22, delay: 0.12 }); }
  chime() { this.tone(1047, 0.5, { vol: 0.16 }); this.tone(831, 0.7, { vol: 0.16, delay: 0.22 }); }
  whoosh() { this.noise(0.22, { freq: 600, to: 2600, q: 1.5, vol: 0.18 }); }
  alert() { this.tone(740, 0.12, { type: 'square', vol: 0.14 }); this.tone(740, 0.12, { type: 'square', vol: 0.14, delay: 0.18 }); }
  fanfare() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.3, { type: 'triangle', vol: 0.26, delay: i * 0.12 })); }

  // 原创的五声音阶小循环（C 大调五声：C D E G A）
  startBgm() {
    const N = { C4: 261.6, D4: 293.7, E4: 329.6, G4: 392, A4: 440, C5: 523.3, D5: 587.3, E5: 659.3, G5: 784 };
    const mel = ['E5', 0, 'D5', 'C5', 'A4', 0, 'C5', 0, 'D5', 'E5', 'G5', 0, 'E5', 0, 'D5', 0,
      'C5', 0, 'A4', 'G4', 'A4', 0, 'C5', 0, 'D5', 'C5', 'A4', 0, 'G4', 0, 0, 0,
      'E5', 0, 'G5', 'E5', 'D5', 0, 'C5', 0, 'A4', 'C5', 'D5', 0, 'E5', 0, 'D5', 0,
      'C5', 'D5', 'E5', 'G5', 'E5', 0, 'D5', 0, 'C5', 0, 0, 0, 'C5', 0, 0, 0];
    const bass = ['C4', 'C4', 'A4', 'A4', 'D4', 'D4', 'G4', 'G4', 'C4', 'C4', 'A4', 'A4', 'D4', 'G4', 'C4', 'C4'];
    const stepDur = 0.19;
    let next = this.ctx.currentTime + 0.2;
    this.bgmTimer = setInterval(() => {
      while (next < this.ctx.currentTime + 0.4) {
        const i = this.step % mel.length, d = next - this.ctx.currentTime;
        if (mel[i]) this.tone(N[mel[i]], stepDur * 1.6, { type: 'triangle', vol: 0.5, delay: d, dest: this.music });
        if (i % 4 === 0) this.tone(N[bass[(i / 4) % bass.length]] / 2, stepDur * 3, { type: 'sine', vol: 0.6, delay: d, dest: this.music });
        if (i % 2 === 1) this.tone(N[bass[Math.floor(i / 4) % bass.length]], stepDur * 0.6, { type: 'sine', vol: 0.14, delay: d, dest: this.music });
        next += stepDur; this.step++;
      }
    }, 100);
  }
}
