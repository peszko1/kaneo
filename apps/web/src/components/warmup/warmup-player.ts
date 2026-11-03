import {
  audioContext,
  replaceAudioContext,
} from "@/components/focus/audio-context";
import { playPianoNote } from "./piano-voice";
import {
  buildWarmup,
  resumeMark,
  type WarmupMark,
  type WarmupNote,
  type WarmupSettings,
} from "./warmup-plan";

// How far ahead notes go to the audio clock, and how often the player looks.
const LOOKAHEAD = 0.3;
const TICK_MS = 40;
// A settings change waits for a round that starts after this, so notes
// already sent to the audio clock never overlap the new plan.
const SWITCH_MARGIN = 0.35;

export type WarmupPosition = {
  mark: Extract<WarmupMark, { end?: false }>;
  progress: number;
};

type Listeners = {
  onPosition: (position: WarmupPosition) => void;
  onEnd: () => void;
};

// Plays a warm-up on the audio clock. All times inside are absolute
// `AudioContext.currentTime` values.
export function startWarmup(
  settings: WarmupSettings,
  fromVowel: number,
  { onPosition, onEnd }: Listeners,
) {
  // A user gesture starts the player, so a stale Safari context can be replaced.
  const maybeContext = replaceAudioContext() ?? audioContext();
  if (!maybeContext) return null;
  const context: AudioContext = maybeContext;
  void context.resume();
  const plan = buildWarmup(settings);
  const starts = plan.marks.filter((mark) => !mark.end && mark.index === 0);
  const first = starts[fromVowel] ?? starts[0];
  if (!first) return null;

  const output = context.createGain();
  output.gain.value = 0.5;
  output.connect(context.destination);

  let notes: WarmupNote[] = [];
  let marks: WarmupMark[] = [];
  let sent = 0;
  let base = 0;
  let length = plan.length;
  let current: WarmupPosition["mark"] | undefined;

  const append = (next: typeof plan, from: WarmupMark, at: number) => {
    for (const note of next.notes)
      if (note[0] >= from.time)
        notes.push([at + note[0], note[1], note[2], note[3]]);
    for (const mark of next.marks)
      if (mark.time >= from.time) marks.push({ ...mark, time: at + mark.time });
  };

  base = context.currentTime + 0.15 - first.time;
  append(plan, first, base);

  const tick = () => {
    const now = context.currentTime;
    while (sent < notes.length && notes[sent][0] < now + LOOKAHEAD) {
      const [at, midi, duration, velocity] = notes[sent++];
      playPianoNote(context, output, midi, at, duration, velocity);
    }
    let mark: WarmupMark | undefined;
    for (const candidate of marks) {
      if (candidate.time <= now) mark = candidate;
      else break;
    }
    if (!mark) return;
    if (mark.end) {
      stop();
      onEnd();
      return;
    }
    current = mark;
    onPosition({ mark, progress: Math.min(1, (now - base) / length) });
  };
  const timer = window.setInterval(tick, TICK_MS);

  function stop() {
    window.clearInterval(timer);
    output.gain.setTargetAtTime(0, context.currentTime, 0.05);
    window.setTimeout(() => output.disconnect(), 400);
  }

  // The round playing now finishes; the new settings start with the next one.
  function adjust(next: WarmupSettings) {
    const now = context.currentTime;
    let at = current ? marks.indexOf(current) + 1 : 0;
    while (marks[at] && marks[at].time < now + SWITCH_MARGIN) at++;
    const old = marks[at];
    if (!old) return;
    const switchAt = old.time;
    const nextPlan = buildWarmup(next);
    const target = resumeMark(nextPlan, marks[at - 1], old, next);
    notes = notes.filter((note, index) => index < sent || note[0] < switchAt);
    marks = marks.filter((mark) => mark.time < switchAt);
    base = switchAt - target.time;
    length = nextPlan.length;
    append(nextPlan, target, base);
    notes.sort((a, b) => a[0] - b[0]);
  }

  return { stop, adjust, vowel: () => current?.vowel };
}

export type WarmupPlayer = NonNullable<ReturnType<typeof startWarmup>>;
