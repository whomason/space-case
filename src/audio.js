// ===== AUDIO: chiptune synth sfx + tiny sequencer =====
const SND = {
  ac: null, master: null, sfx: null, mus: null, noiseBuf: null, muted: false, musicOn: true,
  song: null, nextT: 0, step: 0, last: {},
  unlock() {
    if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; }
    try {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      this.ac = new C();
      this.master = this.ac.createGain(); this.master.gain.value = this.muted ? 0 : 0.55; this.master.connect(this.ac.destination);
      this.sfx = this.ac.createGain(); this.sfx.gain.value = 0.5; this.sfx.connect(this.master);
      this.mus = this.ac.createGain(); this.mus.gain.value = this.musicOn ? 0.16 : 0; this.mus.connect(this.master);
      const len = this.ac.sampleRate * 1; this.noiseBuf = this.ac.createBuffer(1, len, this.ac.sampleRate);
      const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      setInterval(() => this.tick(), 40);
    } catch (e) { this.ac = null; }
  },
  setMute(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.55; },
  setMusic(m) { this.musicOn = m; if (this.mus) this.mus.gain.value = m ? 0.16 : 0; },
  tone(f, dur, type = 'square', vol = 0.3, o = {}) {
    const ac = this.ac; if (!ac) return; const t = ac.currentTime + (o.delay || 0);
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.type = type; osc.frequency.setValueAtTime(f, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t + dur);
    if (o.vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = o.vib; lg.gain.value = f * 0.03; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + dur); }
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (o.att || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(o.bus || this.sfx); osc.start(t); osc.stop(t + dur + 0.02);
  },
  noise(dur, vol = 0.3, o = {}) {
    const ac = this.ac; if (!ac) return; const t = ac.currentTime + (o.delay || 0);
    const src = ac.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const fil = ac.createBiquadFilter(); fil.type = o.type || 'lowpass'; fil.frequency.setValueAtTime(o.f || 3000, t);
    if (o.f2) fil.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
    fil.Q.value = o.q || 0.7;
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(fil); fil.connect(g); g.connect(o.bus || this.sfx); src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
  },
  mf: m => 440 * Math.pow(2, (m - 69) / 12),
  play(name, p = 0) {
    if (!this.ac || this.muted) return;
    const now = this.ac.currentTime;
    const lim = { tick: 0.018, hit: 0.03, pew: 0.035, rifle: 0.03, drone: 0.05, ore: 0.04, coin: 0.03, extract: 0.09, beam: 0.07, kill: 0.04, tally: 0.03, hover: 0.05 }[name];
    if (lim) { if (now - (this.last[name] || 0) < lim) return; this.last[name] = now; }
    const T = (f, d, ty, v, o) => this.tone(f, d, ty, v, o), N = (d, v, o) => this.noise(d, v, o), mf = this.mf;
    switch (name) {
      case 'click': T(1200, 0.035, 'square', 0.12, { slide: 900 }); break;
      case 'hover': T(1800, 0.015, 'square', 0.04); break;
      case 'deny': T(160, 0.09, 'square', 0.15, { slide: 110 }); break;
      case 'tick': T(p || 900, 0.03, 'square', 0.12); N(0.015, 0.05, { type: 'highpass', f: 6000 }); break;
      case 'coin': T(988, 0.05, 'square', 0.12); T(1319, 0.08, 'square', 0.12, { delay: 0.05 }); break;
      case 'tally': T(500 + p * 40, 0.04, 'square', 0.1); break;
      case 'pew': T(900 + R0() * 80, 0.08, 'square', 0.1, { slide: 260 }); break;
      case 'rifle': T(650, 0.05, 'square', 0.08, { slide: 220 }); N(0.03, 0.06, { f: 4000 }); break;
      case 'shotgun': N(0.18, 0.35, { f: 2500, f2: 200 }); T(180, 0.12, 'square', 0.15, { slide: 60 }); break;
      case 'sniper': T(1600, 0.2, 'sawtooth', 0.12, { slide: 150 }); N(0.12, 0.25, { f: 5000, f2: 400 }); break;
      case 'charge': T(200 + p * 900, 0.06, 'sawtooth', 0.05); break;
      case 'rail': N(0.3, 0.3, { type: 'bandpass', f: 3000, f2: 300, q: 2 }); T(2000, 0.3, 'sawtooth', 0.14, { slide: 90 }); break;
      case 'launch': N(0.3, 0.25, { f: 900, f2: 120 }); T(160, 0.2, 'triangle', 0.2, { slide: 60 }); break;
      case 'beam': T(140 + R0() * 30, 0.08, 'square', 0.05); T(420 + R0() * 40, 0.08, 'sawtooth', 0.03); break;
      case 'slash': N(0.1, 0.25, { type: 'highpass', f: 1500, f2: 6000 }); break;
      case 'throw': T(500, 0.09, 'triangle', 0.12, { slide: 1100 }); N(0.08, 0.08, { type: 'bandpass', f: 2000 }); break;
      case 'mine': T(520, 0.03, 'square', 0.12); T(780, 0.03, 'square', 0.1, { delay: 0.05 }); break;
      case 'drone': T(1500, 0.03, 'square', 0.04, { slide: 900 }); break;
      case 'hit': N(0.04, 0.12, { f: 3500 }); T(280, 0.04, 'square', 0.06, { slide: 140 }); break;
      case 'kill': N(0.12, 0.2, { f: 2500, f2: 300 }); T(420, 0.12, 'square', 0.1, { slide: 90 }); break;
      case 'boom': N(0.45, 0.45, { f: 1600, f2: 60 }); T(110, 0.35, 'triangle', 0.3, { slide: 35 }); break;
      case 'bigboom': N(0.9, 0.55, { f: 2400, f2: 40 }); T(80, 0.8, 'triangle', 0.4, { slide: 25 }); T(55, 0.9, 'square', 0.12, { slide: 20 }); break;
      case 'hurt': T(320, 0.16, 'sawtooth', 0.18, { slide: 110 }); N(0.08, 0.15, { f: 1800 }); break;
      case 'ore': T(mf(84 + (p % 5) * 2), 0.06, 'triangle', 0.14); T(mf(91 + (p % 5) * 2), 0.08, 'triangle', 0.1, { delay: 0.04 }); break;
      case 'extract': T(85 + R0() * 20, 0.08, 'square', 0.06); N(0.06, 0.06, { type: 'bandpass', f: 1200 + p * 600, q: 3 }); break;
      case 'boost': N(0.22, 0.25, { type: 'bandpass', f: 600, f2: 3500, q: 1.5 }); T(200, 0.2, 'sawtooth', 0.06, { slide: 700 }); break;
      case 'levelup': [72, 76, 79, 84, 88].forEach((m, i) => T(mf(m), 0.14, 'square', 0.13, { delay: i * 0.07 })); break;
      case 'reveal': {
        const r = p; const base = [60, 62, 64, 65, 67, 69, 72][r];
        const steps = [3, 3, 4, 5, 6, 7, 9][r];
        const sc = [0, 4, 7, 12, 16, 19, 24, 28, 31];
        for (let i = 0; i < steps; i++) T(mf(base + sc[i]), 0.16 + (i === steps - 1 ? 0.5 : 0), r >= 4 ? 'sawtooth' : 'square', 0.1, { delay: i * 0.06, vib: i === steps - 1 ? 6 : 0 });
        if (r >= 4) { T(mf(base + 12), 1.2, 'triangle', 0.18, { delay: steps * 0.06 }); T(mf(base + 19), 1.2, 'triangle', 0.12, { delay: steps * 0.06 }); }
        if (r >= 5) N(0.8, 0.2, { type: 'highpass', f: 3000, f2: 9000, delay: steps * 0.06 });
        if (r === 6) for (let i = 0; i < 12; i++) T(mf(84 + i * 2), 0.1, 'square', 0.05, { delay: 0.6 + i * 0.04 });
        break;
      }
      case 'shake': N(0.08, 0.2 + p * 0.03, { f: 400 + p * 150 }); T(70 + p * 10, 0.08, 'triangle', 0.15); break;
      case 'burst': N(0.6, 0.45, { f: 6000, f2: 200 }); T(mf(48), 0.5, 'triangle', 0.3, { slide: 40 }); break;
      case 'crack': T(1200 + p * 300, 0.06, 'square', 0.08); break;
      case 'upgradeHint': [79, 83, 86, 91].forEach((m, i) => T(mf(m), 0.1, 'square', 0.12, { delay: i * 0.04 })); N(0.3, 0.15, { type: 'highpass', f: 4000 }); break;
      case 'stamp': N(0.15, 0.4, { f: 600, f2: 80 }); T(90, 0.12, 'square', 0.2, { slide: 50 }); break;
      case 'key': T(2200, 0.03, 'square', 0.08); T(1500, 0.06, 'triangle', 0.12, { delay: 0.03 }); break;
      case 'unlock': T(400, 0.5, 'sawtooth', 0.08, { slide: 1600 }); N(0.5, 0.15, { type: 'bandpass', f: 300, f2: 5000 }); break;
      case 'warp': T(80, 2.5, 'sawtooth', 0.12, { slide: 1800 }); N(2.5, 0.2, { type: 'bandpass', f: 200, f2: 8000, q: 1 }); break;
      case 'o2': T(1320, 0.08, 'square', 0.12); T(1320, 0.08, 'square', 0.12, { delay: 0.14 }); break;
      case 'win': [72, 76, 79, 84].forEach((m, i) => T(mf(m), 0.12, 'square', 0.14, { delay: i * 0.05 })); break;
      case 'lose': T(400, 0.5, 'sawtooth', 0.14, { slide: 60 }); N(0.4, 0.3, { f: 2000, f2: 100 }); break;
      case 'fanfare': [67, 72, 76, 79, 76, 79, 84].forEach((m, i) => T(mf(m), i === 6 ? 0.5 : 0.12, 'square', 0.12, { delay: i * 0.09 })); break;
      case 'pickup': T(1400, 0.05, 'triangle', 0.12); T(1900, 0.07, 'triangle', 0.1, { delay: 0.04 }); break;
      case 'bossroar': N(1.0, 0.4, { f: 700, f2: 80 }); T(70, 1.0, 'sawtooth', 0.2, { slide: 40, vib: 8 }); break;
      case 'zap': T(1800, 0.06, 'sawtooth', 0.06, { slide: 400 }); break;
      case 'freeze': T(2400, 0.12, 'triangle', 0.06, { slide: 1200 }); break;
      case 'spin': T(300 + p * 50, 0.04, 'square', 0.08); break;
      case 'flip': N(0.05, 0.15, { type: 'highpass', f: 2500 }); T(700, 0.04, 'square', 0.06); break;
    }
  },
  // ---------- music ----------
  songs: {
    hub: { bpm: 88, prog: [[57, 'm'], [53, 'M'], [48, 'M'], [55, 'M']], arp: [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 4, 3, 2, 1, 2, 3], bass: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0], hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1], kick: [0], lead: null, arpVol: 0.05 },
    planet: { bpm: 120, prog: [[50, 'm'], [46, 'M'], [48, 'M'], [45, 'M']], arp: [0, 2, 1, 2, 0, 2, 1, 3, 0, 2, 1, 2, 0, 3, 2, 1], bass: [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1], hat: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1], kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], lead: [74, 0, 0, 72, 0, 0, 69, 0, 72, 0, 74, 0, 77, 0, 76, 0], arpVol: 0.04 },
    boss: { bpm: 148, prog: [[52, 'm'], [52, 'm'], [48, 'M'], [50, 'M']], arp: [0, 1, 2, 1, 0, 1, 2, 3, 0, 1, 2, 1, 3, 2, 1, 0], bass: [1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1], hat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], kick: [1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 1], lead: [76, 0, 79, 0, 81, 0, 79, 76, 74, 0, 76, 0, 71, 0, 0, 0], arpVol: 0.045 },
    title: { bpm: 76, prog: [[53, 'M'], [57, 'm'], [52, 'm'], [55, 'M']], arp: [0, 1, 2, 4, 2, 1, 0, 1, 2, 4, 3, 2, 1, 2, 3, 4], bass: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], hat: [0], kick: [0], lead: null, arpVol: 0.05 },
  },
  playSong(name) { if (this.song === name) return; this.song = name; this.step = 0; if (this.ac) this.nextT = this.ac.currentTime + 0.05; },
  tick() {
    if (!this.ac || !this.song || !this.musicOn || this.muted) { if (this.ac) this.nextT = this.ac.currentTime + 0.05; return; }
    const s = this.songs[this.song]; const stepDur = 60 / s.bpm / 4;
    if (this.nextT < this.ac.currentTime) this.nextT = this.ac.currentTime + 0.02;
    while (this.nextT < this.ac.currentTime + 0.12) {
      const st = this.step % 16, bar = Math.floor(this.step / 16) % s.prog.length;
      const [root, q] = s.prog[bar]; const ch = q === 'm' ? [0, 3, 7, 12, 15] : [0, 4, 7, 12, 16];
      const dly = this.nextT - this.ac.currentTime;
      const o = { delay: dly, bus: this.mus };
      this.tone(this.mf(root + 12 + ch[s.arp[st]]), stepDur * 0.9, 'square', s.arpVol, o);
      if (s.bass[st]) this.tone(this.mf(root - 12), stepDur * 1.8, 'triangle', 0.22, o);
      if (s.hat[st]) this.noise(0.03, 0.05, { type: 'highpass', f: 7000, delay: dly, bus: this.mus });
      if (s.kick[st]) { this.tone(140, 0.12, 'triangle', 0.3, { slide: 40, delay: dly, bus: this.mus }); }
      if (s.lead && s.lead[st] && bar % 2 === 1) this.tone(this.mf(s.lead[st] - (bar === 3 ? 2 : 0)), stepDur * 2.5, 'square', 0.035, { delay: dly, bus: this.mus, vib: 5 });
      this.nextT += stepDur; this.step++;
    }
  },
};
