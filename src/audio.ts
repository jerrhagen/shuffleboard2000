// Allt ljud syntetiseras, så att appen inte bär på några ljudfiler.
import { readSetting, writeSetting } from './data/store';

let ctx: AudioContext | null = null;
let muted = readSetting('muted', '0') === '1';

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  writeSetting('muted', value ? '1' : '0');
}

/** Måste anropas från en knapptryckning: webbläsare startar inte ljud annars. */
export function unlockAudio(): void {
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
}

function audio(): AudioContext | null {
  return !muted && ctx && ctx.state === 'running' ? ctx : null;
}

function tone(type: OscillatorType, from: number, to: number, duration: number, gain: number, delay = 0): void {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + delay;
  const osc = a.createOscillator();
  const amp = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + duration);
  amp.gain.setValueAtTime(gain, t);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(amp).connect(a.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

function noise(duration: number, gain: number, from: number, to: number): void {
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  const buffer = a.createBuffer(1, Math.ceil(a.sampleRate * duration), a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const source = a.createBufferSource();
  source.buffer = buffer;
  const filter = a.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 1.1;
  filter.frequency.setValueAtTime(from, t);
  filter.frequency.exponentialRampToValueAtTime(to, t + duration);
  const amp = a.createGain();
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(gain, t + duration * 0.25);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  source.connect(filter).connect(amp).connect(a.destination);
  source.start(t);
}

export const sfx = {
  tap: () => tone('square', 660, 880, 0.06, 0.04),
  clack: (power: number) => {
    const level = Math.min(1, power / 20);
    tone('triangle', 1900 + Math.random() * 500, 700, 0.05, 0.05 + 0.12 * level);
    noise(0.03, 0.05 * level, 3200, 1800);
  },
  whoosh: () => noise(0.45, 0.14, 500, 3400),
  riser: (duration: number) => {
    tone('sawtooth', 60, 880, duration, 0.07);
    tone('sawtooth', 62, 900, duration, 0.05);
    noise(duration, 0.1, 300, 6000);
  },
  slam: (team: 'red' | 'blue') => {
    tone('sine', 150, 38, 0.3, 0.42);
    tone('square', team === 'red' ? 330 : 494, team === 'red' ? 165 : 247, 0.16, 0.07);
    noise(0.12, 0.14, 2400, 500);
  },
  fanfare: () => {
    [392, 523, 659, 784, 1047].forEach((f, i) => {
      tone('sawtooth', f, f * 1.001, 0.34, 0.06, i * 0.09);
      tone('square', f * 2, f * 2.001, 0.2, 0.025, i * 0.09);
    });
  },
  shutter: () => {
    noise(0.05, 0.2, 5000, 2200);
    tone('square', 1500, 900, 0.04, 0.04, 0.07);
  },
};

export function buzz(pattern: number | number[]): void {
  if (!muted) navigator.vibrate?.(pattern);
}
