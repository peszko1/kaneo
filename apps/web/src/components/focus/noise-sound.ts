import { audioContext } from "./audio-context";
import { makeNoise, type NoiseColor } from "./noise";

// A 20-second stereo loop is too long to hear it repeat.
const LOOP_SECONDS = 20;
const LOOP_FADE_SECONDS = 0.5;
const FADE_IN_SECONDS = 1.5;
const FADE_OUT_SECONDS = 0.3;
// White noise sounds much louder than brown noise at the same level.
const COLOR_GAIN: Record<NoiseColor, number> = {
  brown: 1,
  pink: 0.7,
  white: 0.35,
};

export type NoiseSound = {
  setVolume: (volume: number) => void;
  stop: () => void;
};

// Volume is 0 to 1. Squaring it makes the slider feel even to the ear.
function gainFor(color: NoiseColor, volume: number) {
  return COLOR_GAIN[color] * volume * volume;
}

function noiseBuffer(ctx: AudioContext, color: NoiseColor) {
  const length = Math.round(ctx.sampleRate * LOOP_SECONDS);
  const fade = Math.round(ctx.sampleRate * LOOP_FADE_SECONDS);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  // Separate noise per channel sounds wide instead of inside the head.
  for (let channel = 0; channel < 2; channel++) {
    buffer.copyToChannel(makeNoise(color, length, fade), channel);
  }
  return buffer;
}

// Plays the noise until `stop()`, and fades it out at `endsAtMs` (a
// wall-clock time) when given, so it ends with the phase in a background tab.
export function startNoiseSound(
  color: NoiseColor,
  volume: number,
  endsAtMs: number | null,
): NoiseSound {
  const ctx = audioContext();
  if (!ctx) return { setVolume: () => {}, stop: () => {} };

  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx, color);
  source.loop = true;
  const level = ctx.createGain();
  const phaseEnd = ctx.createGain();
  source.connect(level).connect(phaseEnd).connect(ctx.destination);

  level.gain.setValueAtTime(0, ctx.currentTime);
  level.gain.setTargetAtTime(
    gainFor(color, volume),
    ctx.currentTime,
    FADE_IN_SECONDS / 3,
  );
  source.start();

  // The audio clock stands still while the context is suspended, so the end
  // is queued again from the wall clock whenever playback resumes.
  const queueEnd = () => {
    if (ctx.state !== "running") {
      void ctx.resume();
      return;
    }
    if (endsAtMs === null) return;
    const at = ctx.currentTime + Math.max(0, endsAtMs - Date.now()) / 1000;
    phaseEnd.gain.cancelScheduledValues(0);
    phaseEnd.gain.setValueAtTime(1, ctx.currentTime);
    phaseEnd.gain.setTargetAtTime(0, at, FADE_OUT_SECONDS / 3);
  };

  ctx.addEventListener("statechange", queueEnd);
  // Safari interrupts audio while the page is hidden.
  document.addEventListener("visibilitychange", queueEnd);
  queueEnd();

  return {
    setVolume: (next) => {
      level.gain.setTargetAtTime(gainFor(color, next), ctx.currentTime, 0.05);
    },
    stop: () => {
      ctx.removeEventListener("statechange", queueEnd);
      document.removeEventListener("visibilitychange", queueEnd);
      level.gain.cancelScheduledValues(0);
      level.gain.setTargetAtTime(0, ctx.currentTime, FADE_OUT_SECONDS / 3);
      source.stop(ctx.currentTime + FADE_OUT_SECONDS * 2);
      source.addEventListener("ended", () => phaseEnd.disconnect());
    },
  };
}
