export class AudioEngine {
  constructor() {
    this.enabled = false;
  }
  async toggle() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.gain = this.ctx.createGain();
      this.gain.gain.value = 0;
      this.gain.connect(this.ctx.destination);
      this.osc = this.ctx.createOscillator();
      this.osc.type = "sine";
      this.osc.frequency.value = 42;
      this.osc.connect(this.gain);
      this.osc.start();
      const buffer = this.ctx.createBuffer(
        1,
        this.ctx.sampleRate * 2,
        this.ctx.sampleRate,
      );
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++)
        data[i] = (Math.random() - 0.5) * 0.2;
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = "lowpass";
      this.filter.frequency.value = 180;
      noise.connect(this.filter);
      this.filter.connect(this.gain);
      noise.start();
    }
    await this.ctx.resume();
    this.enabled = !this.enabled;
    return this.enabled;
  }
  update(speed, running) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.gain.gain.setTargetAtTime(
      this.enabled && running ? 0.06 + Math.min(speed / 10000, 1) * 0.05 : 0,
      t,
      0.15,
    );
    this.osc.frequency.setTargetAtTime(
      38 + Math.min(speed / 10000, 1) * 32,
      t,
      0.15,
    );
    this.filter.frequency.setTargetAtTime(
      160 + Math.min(speed / 10000, 1) * 500,
      t,
      0.15,
    );
  }
}
