import { BEEP_FREQUENCY_HZ, BEEP_GAIN } from "./config";

/** Tone while pointer is down (docs: start on down, stop on up). */
export class MorseBeeper {
  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private gain: GainNode | null = null;

  start(): void {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) this.ctx = new AC();
    const ctx = this.ctx;
    if (ctx.state === "suspended") void ctx.resume();

    this.stop();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = BEEP_FREQUENCY_HZ;
    gain.gain.value = BEEP_GAIN;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    this.osc = osc;
    this.gain = gain;
  }

  stop(): void {
    if (this.osc) {
      try {
        this.osc.stop();
      } catch {
        /* already stopped */
      }
      this.osc.disconnect();
      this.osc = null;
    }
    if (this.gain) {
      this.gain.disconnect();
      this.gain = null;
    }
  }
}
