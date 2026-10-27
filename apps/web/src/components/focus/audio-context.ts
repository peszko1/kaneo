let context: AudioContext | null = null;
let createdAt = 0;
const listeners = new Set<() => void>();

// A context made this recently is still starting, so a second gesture event
// of the same click must not replace it again.
const YOUNG_MS = 1000;

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

function createContext() {
  // Safari: play like a media app, not like a sound effect that the iOS mute
  // switch silences.
  const session = (navigator as AudioSessionNavigator).audioSession;
  if (session) session.type = "playback";
  context = new AudioContext();
  createdAt = Date.now();
  return context;
}

// One context for the alarm and the noise, so one user gesture unlocks both.
export function audioContext() {
  if (typeof AudioContext === "undefined") return null;
  return context ?? createContext();
}

// Safari can leave a context "interrupted" or silent for good, for example in
// a web app after sleep or a change of speakers, and its resume() then never
// settles. A new context made inside a user gesture plays, so call this from
// one. Code that holds audio nodes moves to it with onAudioContextReplaced.
export function replaceAudioContext() {
  if (typeof AudioContext === "undefined") return null;
  if (context && Date.now() - createdAt < YOUNG_MS) return context;
  const old = context;
  const next = createContext();
  for (const listener of listeners) listener();
  void old?.close().catch(() => {});
  return next;
}

export function onAudioContextReplaced(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
