import {
  audioContext,
  onAudioContextReplaced,
  replaceAudioContext,
} from "./audio-context";

const BEEP_HZ = 880;
const BEEP_SECONDS = 0.18;
const BEEP_GAP_SECONDS = 0.12;
const REPEAT_MS = 1200;
// Beeps are queued this far ahead on the audio clock. Browsers slow timers
// in background tabs to about one a minute, but not audio already queued.
const LOOKAHEAD_MS = 90_000;
const TOP_UP_MS = 15_000;

// Browsers keep audio suspended until the page gets a user gesture. Calling
// this from a click lets a later alarm play without one. A context that is
// not running gets replaced, because Safari may never resume it. Safari also
// needs a sound to start inside the gesture, so this plays one silent sample.
export function unlockAlarmSound() {
  const current = audioContext();
  if (!current || current.state === "running") return;
  const ctx = replaceAudioContext();
  if (!ctx) return;
  void ctx.resume();
  const source = ctx.createBufferSource();
  source.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
  source.connect(ctx.destination);
  source.start();
}

function beep(ctx: AudioContext, output: AudioNode, at: number) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = BEEP_HZ;
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(0.3, at + 0.01);
  gain.gain.linearRampToValueAtTime(0, at + BEEP_SECONDS);
  oscillator.connect(gain).connect(output);
  oscillator.start(at);
  oscillator.stop(at + BEEP_SECONDS);
}

// Call from a click. It always starts a new context, so the button also
// brings back sound that a silent Safari context lost.
export function playTestSound() {
  const ctx = replaceAudioContext();
  if (!ctx) return;
  void ctx.resume();
  // The audio clock stands still until the context runs, so these wait for it.
  const at = ctx.currentTime + 0.05;
  beep(ctx, ctx.destination, at);
  beep(ctx, ctx.destination, at + BEEP_SECONDS + BEEP_GAP_SECONDS);
}

// Plays a double beep every REPEAT_MS from `fromMs` (a wall-clock time, which
// may be in the future) until the returned function is called.
export function startAlarmSound(fromMs: number) {
  let stopRinging = ring(fromMs);
  const stopFollowing = onAudioContextReplaced(() => {
    stopRinging();
    stopRinging = ring(fromMs);
  });
  return () => {
    stopFollowing();
    stopRinging();
  };
}

function ring(fromMs: number) {
  const ctx = audioContext();
  if (!ctx) return () => {};

  const output = ctx.createGain();
  output.connect(ctx.destination);
  let next = fromMs;

  const topUp = () => {
    // A suspended clock stands still, so times queued now would be wrong.
    if (ctx.state !== "running") {
      void ctx.resume();
      return;
    }
    const now = Date.now();
    // Skip beeps that should have played while the page was asleep.
    while (next < now - REPEAT_MS) next += REPEAT_MS;
    while (next < now + LOOKAHEAD_MS) {
      const at = ctx.currentTime + Math.max(0, next - now) / 1000;
      beep(ctx, output, at);
      beep(ctx, output, at + BEEP_SECONDS + BEEP_GAP_SECONDS);
      next += REPEAT_MS;
    }
  };

  ctx.addEventListener("statechange", topUp);
  // Safari interrupts audio while the page is hidden.
  document.addEventListener("visibilitychange", topUp);
  topUp();
  const timer = setInterval(topUp, TOP_UP_MS);

  return () => {
    clearInterval(timer);
    ctx.removeEventListener("statechange", topUp);
    document.removeEventListener("visibilitychange", topUp);
    // Queued beeps stay scheduled but no longer reach the speakers.
    output.disconnect();
  };
}
