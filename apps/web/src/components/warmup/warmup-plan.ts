// A vocal warm-up: the major pattern 1-2-3-4-5-4-3-2-1 sung on each vowel,
// one semitone higher each round. Times are in seconds from the start.

export const WARMUP_VOWELS = ["mmm", "brrr", "jooo", "jaaa"] as const;
export type WarmupVowel = (typeof WARMUP_VOWELS)[number];

export type WarmupSettings = {
  /** Lowest sung note (MIDI). */
  low: number;
  /** Highest sung note (MIDI), the top of the pattern. */
  high: number;
  bpm: number;
  /** Come back down after reaching the top. */
  down: boolean;
  /** The piano plays the pattern too, not only the chords. */
  melody: boolean;
  vowels: WarmupVowel[];
};

// G2 in the chest up to C5 in the head voice.
export const DEFAULT_WARMUP_SETTINGS: WarmupSettings = {
  low: 43,
  high: 72,
  bpm: 110,
  down: false,
  melody: true,
  vowels: [...WARMUP_VOWELS],
};

export const WARMUP_PATTERN = [0, 2, 4, 5, 7, 5, 4, 2, 0];
const TOP = 7;

/** [time, midi, duration, velocity] */
export type WarmupNote = [number, number, number, number];

export type WarmupMark =
  | {
      end?: false;
      time: number;
      vowel: WarmupVowel;
      root: number;
      dir: "up" | "down";
      /** Position within this vowel, from 0. */
      index: number;
      count: number;
    }
  | { end: true; time: number };

export type WarmupPlan = {
  notes: WarmupNote[];
  marks: WarmupMark[];
  length: number;
};

export type WarmupRegister = "chest" | "mix" | "head";

// Rough male-voice zones for the top note of the pattern.
export function warmupRegister(root: number): WarmupRegister {
  const top = root + TOP;
  if (top <= 62) return "chest";
  if (top <= 67) return "mix";
  return "head";
}

export function warmupRoots(settings: WarmupSettings) {
  const up: number[] = [];
  for (let root = settings.low; root + TOP <= settings.high; root++)
    up.push(root);
  const down: number[] = [];
  if (settings.down && up.length > 0)
    for (let root = up[up.length - 1] - 1; root >= settings.low; root--)
      down.push(root);
  return { up, down };
}

// A chord in the middle of the keyboard, where small speakers still play it,
// with the bass note under it.
function chord(root: number, intervals: number[]) {
  const notes = intervals.map((interval) => {
    let note = root + interval;
    while (note < 52) note += 12;
    while (note > 72) note -= 12;
    return note;
  });
  let bass = root;
  while (bass > 50) bass -= 12;
  while (bass < 36) bass += 12;
  return [bass, ...notes];
}

const MAJOR = [0, 4, 7];
const DOMINANT_SEVENTH = [0, 4, 10];

export function buildWarmup(settings: WarmupSettings): WarmupPlan {
  const beat = 60 / settings.bpm;
  const { up, down } = warmupRoots(settings);
  const roots = [
    ...up.map((root) => ({ root, dir: "up" as const })),
    ...down.map((root) => ({ root, dir: "down" as const })),
  ];
  const vowels = roots.length
    ? WARMUP_VOWELS.filter((vowel) => settings.vowels.includes(vowel))
    : [];
  const notes: WarmupNote[] = [];
  const marks: WarmupMark[] = [];
  const pad = settings.melody ? 0.07 : 0.16;
  let time = 0;

  for (const vowel of vowels) {
    roots.forEach(({ root, dir }, index) => {
      marks.push({ time, vowel, root, dir, index, count: roots.length });
      // Intro: the tonic chord for two beats.
      for (const note of chord(root, MAJOR))
        notes.push([time, note, 2 * beat, 0.32]);
      time += 2 * beat;
      for (const note of chord(root, MAJOR))
        notes.push([time, note, 4 * beat, pad]);
      for (const note of chord(root + TOP, DOMINANT_SEVENTH))
        notes.push([time + 4 * beat, note, 3 * beat, pad]);
      for (const note of chord(root, MAJOR))
        notes.push([time + 8 * beat, note, 2 * beat, pad]);
      if (settings.melody) {
        // Small speakers lose notes below G3, so the melody also plays an
        // octave up there.
        const octave = root + TOP < 55 ? 12 : 0;
        WARMUP_PATTERN.forEach((step, i) => {
          const length = (i === WARMUP_PATTERN.length - 1 ? 2 : 0.95) * beat;
          notes.push([time + i * beat, root + step + octave, length, 0.6]);
          if (octave) notes.push([time + i * beat, root + step, length, 0.35]);
        });
      }
      time += 10 * beat;
    });
    time += 4 * beat;
  }
  marks.push({ end: true, time });
  // The player sends notes in order, so they must be sorted by time.
  notes.sort((a, b) => a[0] - b[0]);
  return { notes, marks, length: time };
}

type Key = Extract<WarmupMark, { end?: false }>;
const isKey = (mark: WarmupMark): mark is Key => !mark.end;
const sameKey = (a: WarmupMark, b: WarmupMark) =>
  isKey(a) &&
  isKey(b) &&
  a.vowel === b.vowel &&
  a.root === b.root &&
  a.dir === b.dir;

// Where a changed plan continues when the settings change mid-play.
// `playing` is the round that plays up to the switch, `next` the round the old
// plan would play after it. Returns a mark of `plan`.
export function resumeMark(
  plan: WarmupPlan,
  playing: WarmupMark | undefined,
  next: WarmupMark,
  settings: WarmupSettings,
): WarmupMark {
  const end = plan.marks[plan.marks.length - 1];
  // The round still exists: continue with whatever follows it now.
  const at = playing
    ? plan.marks.findIndex((mark) => sameKey(mark, playing))
    : -1;
  if (at >= 0) return plan.marks[at + 1] ?? end;
  if (!isKey(next)) return end;

  const sameVowel = plan.marks.filter(
    (mark): mark is Key => isKey(mark) && mark.vowel === next.vowel,
  );
  const found =
    sameVowel.find((mark) => sameKey(mark, next)) ??
    (next.dir === "up"
      ? next.root < settings.low
        ? sameVowel[0]
        : sameVowel.find((mark) => mark.dir === "down" && mark.root < next.root)
      : sameVowel.find(
          (mark) => mark.dir === "down" && mark.root <= next.root,
        ));
  if (found) return found;

  const later = WARMUP_VOWELS.slice(WARMUP_VOWELS.indexOf(next.vowel) + 1);
  return (
    plan.marks.find(
      (mark) => isKey(mark) && mark.index === 0 && later.includes(mark.vowel),
    ) ?? end
  );
}
