/** Synthesized sound design, not a recording of leather tearing. */
export class ExplosionAudio {
  private context?: AudioContext;
  private gain?: GainNode;
  private active: AudioScheduledSourceNode[] = [];
  private noiseBuffer?: AudioBuffer;
  muted = false;
  setMuted(value: boolean) { this.muted = value; if (this.gain && this.context) this.gain.gain.setTargetAtTime(value ? 0 : .55, this.context.currentTime, .02); }
  prepare() {
    if (this.muted || this.noiseBuffer) return;
    try {
      this.context ??= new AudioContext();
      const buffer = this.context.createBuffer(1, Math.ceil(this.context.sampleRate * 3.2), this.context.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * (.7 + .3 * Math.sin(i * .007) ** 2);
      this.noiseBuffer = buffer;
    } catch { /* Audio is optional. */ }
  }
  unlock() {
    if (this.muted) return;
    this.prepare();
    void this.context?.resume().catch(() => {});
  }
  play(impactDelay = 0) {
    if (this.muted) return;
    try {
      this.prepare();
      if (!this.context || !this.noiseBuffer) return;
      const ctx = this.context;
      void ctx.resume().catch(() => {});
      this.stop();
      const master = ctx.createGain(); master.gain.value = this.muted ? 0 : .55;
      const limiter = ctx.createDynamicsCompressor(); limiter.threshold.value = -14; limiter.knee.value = 12; limiter.ratio.value = 10; limiter.attack.value = .003; limiter.release.value = .2;
      master.connect(limiter); limiter.connect(ctx.destination); this.gain = master;
      const now = ctx.currentTime + impactDelay;
      const envelope = (start: number, duration: number, volume: number) => { const gain = ctx.createGain(); gain.gain.setValueAtTime(.0001, now + start); gain.gain.exponentialRampToValueAtTime(volume, now + start + .015); gain.gain.exponentialRampToValueAtTime(.0001, now + start + duration); gain.connect(master); return gain; };
      const tone = (start: number, duration: number, from: number, to: number, volume: number) => { const osc = ctx.createOscillator(); osc.frequency.setValueAtTime(from, now + start); osc.frequency.exponentialRampToValueAtTime(to, now + start + duration); osc.connect(envelope(start, duration, volume)); osc.start(now + start); osc.stop(now + start + duration); this.active.push(osc); };
      const noise = (start: number, duration: number, frequency: number, volume: number, type: BiquadFilterType) => { const source = ctx.createBufferSource(); source.buffer = this.noiseBuffer!; const filter = ctx.createBiquadFilter(); filter.type = type; filter.frequency.value = frequency; filter.Q.value = .7; source.connect(filter); filter.connect(envelope(start, duration, volume)); source.start(now + start); source.stop(now + start + duration); this.active.push(source); };
      tone(0, .17, 46, 31, .25); tone(.15, 1.7, 110, 25, .65);
      noise(.15, .5, 850, .6, 'lowpass'); noise(.17, .65, 1900, .2, 'bandpass');
      [.36, .47, .62, .85].forEach((t, i) => { noise(t, .16, impactDelay ? 1100 : 2400, .035, 'bandpass'); if (!impactDelay) tone(t, .15, 1100 + i * 173, 850, .018); });
      noise(.45, 2.6, 150, .25, 'lowpass');
    } catch { /* Audio is optional if the device cannot provide an AudioContext. */ }
  }
  stop() { this.active.forEach(source => { try { source.stop(); source.disconnect(); } catch {} }); this.active = []; this.gain?.disconnect(); }
  dispose() { this.stop(); void this.context?.close().catch(() => {}); this.context = undefined; this.noiseBuffer = undefined; }
}
