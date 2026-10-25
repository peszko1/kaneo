const BEEP_HZ = 880;
const BEEP_SECONDS = 0.18;
const BEEP_GAP_SECONDS = 0.12;
const REPEAT_MS = 1200;

let context: AudioContext | null = null;

function audioContext() {
  if (!context && typeof AudioContext !== "undefined") {
    context = new AudioContext();
  }
  return context;
}

// Browsers keep audio suspended until the page gets a user gesture. Calling
// this from a click lets a later alarm play without one.
export function unlockAlarmSound() {
  void audioContext()?.resume();
}

function beep(ctx: AudioContext, at: number) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = BEEP_HZ;
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(0.3, at + 0.01);
  gain.gain.linearRampToValueAtTime(0, at + BEEP_SECONDS);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(at);
  oscillator.stop(at + BEEP_SECONDS);
}

// Plays a double beep every REPEAT_MS until the returned function is called.
export function startAlarmSound() {
  const ctx = audioContext();
  if (!ctx) return () => {};

  const ring = () => {
    if (ctx.state !== "running") {
      void ctx.resume();
      return;
    }
    const now = ctx.currentTime;
    beep(ctx, now);
    beep(ctx, now + BEEP_SECONDS + BEEP_GAP_SECONDS);
  };

  // A suspended context starts on the next click or key press anywhere.
  const unlock = () => void ctx.resume();
  document.addEventListener("pointerdown", unlock);
  document.addEventListener("keydown", unlock);

  ring();
  const timer = setInterval(ring, REPEAT_MS);
  return () => {
    clearInterval(timer);
    document.removeEventListener("pointerdown", unlock);
    document.removeEventListener("keydown", unlock);
  };
}
