import { describe, expect, it } from "vite-plus/test";
import {
  buildWarmup,
  DEFAULT_WARMUP_SETTINGS,
  resumeMark,
  type WarmupMark,
  type WarmupSettings,
  warmupRegister,
} from "./warmup-plan";

const settings = (change: Partial<WarmupSettings>): WarmupSettings => ({
  ...DEFAULT_WARMUP_SETTINGS,
  ...change,
});
const label = (mark: WarmupMark) =>
  mark.end
    ? "end"
    : `${mark.vowel}${mark.dir === "up" ? "↑" : "↓"}${mark.root}`;

describe("buildWarmup", () => {
  it("plays the melody 1-2-3-4-5-4-3-2-1 in order, one beat apart", () => {
    const plan = buildWarmup(
      settings({ low: 60, high: 67, bpm: 120, vowels: ["mmm"] }),
    );
    const melody = plan.notes.filter((note) => note[3] === 0.6);
    expect(melody.map((note) => note[1])).toEqual([
      60, 62, 64, 65, 67, 65, 64, 62, 60,
    ]);
    expect(melody.map((note) => note[0])).toEqual([
      1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5,
    ]);
  });

  it("keeps notes sorted by time", () => {
    const { notes } = buildWarmup(DEFAULT_WARMUP_SETTINGS);
    expect(
      notes.every((note, i) => i === 0 || notes[i - 1][0] <= note[0]),
    ).toBe(true);
  });

  it("goes from G2 up to a pattern topping at C5 by default, vowel by vowel", () => {
    const keys = buildWarmup(DEFAULT_WARMUP_SETTINGS).marks.filter(
      (mark) => !mark.end,
    );
    expect(keys).toHaveLength(4 * 23);
    expect(keys.slice(0, 1).map(label)).toEqual(["mmm↑43"]);
    expect(keys.slice(22, 24).map(label)).toEqual(["mmm↑65", "brrr↑43"]);
  });

  it("comes back down when asked", () => {
    const plan = buildWarmup(
      settings({ low: 60, high: 69, down: true, vowels: ["mmm"] }),
    );
    expect(plan.marks.map(label)).toEqual([
      "mmm↑60",
      "mmm↑61",
      "mmm↑62",
      "mmm↓61",
      "mmm↓60",
      "end",
    ]);
  });

  it("doubles low melody notes an octave up for small speakers", () => {
    const plan = buildWarmup(settings({ low: 43, high: 50, vowels: ["mmm"] }));
    const first = plan.notes.filter(
      (note) => note[0] === plan.notes.find((n) => n[3] === 0.6)?.[0],
    );
    expect(first.map((note) => note[1])).toEqual(
      expect.arrayContaining([43, 55]),
    );
  });

  it("plays nothing when the range is smaller than a fifth", () => {
    expect(
      buildWarmup(settings({ low: 60, high: 65 })).marks.map(label),
    ).toEqual(["end"]);
  });
});

describe("resumeMark", () => {
  const before = settings({ low: 60, high: 69, vowels: ["mmm", "brrr"] });
  const old = buildWarmup(before).marks;

  it("turns down at the top when coming back down is switched on", () => {
    const next = settings({ ...before, down: true });
    // Playing the top round of mmm; the old plan would go on with brrr.
    expect(label(resumeMark(buildWarmup(next), old[2], old[3], next))).toBe(
      "mmm↓61",
    );
  });

  it("skips to the next vowel when coming back down is switched off on the way down", () => {
    const withDown = settings({ ...before, down: true });
    const marks = buildWarmup(withDown).marks;
    expect(
      label(resumeMark(buildWarmup(before), marks[3], marks[4], before)),
    ).toBe("brrr↑60");
  });

  it("moves to the next chosen vowel when the current one is switched off", () => {
    const next = settings({ ...before, vowels: ["brrr"] });
    expect(label(resumeMark(buildWarmup(next), old[0], old[1], next))).toBe(
      "brrr↑60",
    );
  });

  it("ends when nothing is left", () => {
    const next = settings({ ...before, vowels: ["mmm"] });
    expect(label(resumeMark(buildWarmup(next), old[2], old[3], next))).toBe(
      "end",
    );
  });
});

describe("warmupRegister", () => {
  it("names the voice zone by the top note", () => {
    expect([43, 57, 62].map(warmupRegister)).toEqual(["chest", "mix", "head"]);
  });
});
