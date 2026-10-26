let context: AudioContext | null = null;

// One context for the alarm and the noise, so one user gesture unlocks both.
export function audioContext() {
  if (!context && typeof AudioContext !== "undefined") {
    context = new AudioContext();
  }
  return context;
}
