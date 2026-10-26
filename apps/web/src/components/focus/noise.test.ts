import { describe, expect, it } from "vite-plus/test";
import { makeNoise, NOISE_COLORS, NOISE_RMS, type NoiseColor } from "./noise";

const LENGTH = 48_000;
const FADE = 4800;

function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return state / 4_294_967_296;
  };
}

function noise(color: NoiseColor) {
  return makeNoise(color, LENGTH, FADE, seeded(7));
}

function meanStep(samples: Float32Array) {
  let sum = 0;
  for (let i = 1; i < samples.length; i++) {
    sum += Math.abs(samples[i] - samples[i - 1]);
  }
  return sum / (samples.length - 1);
}

describe("makeNoise", () => {
  it.each(NOISE_COLORS)("gives %s noise the same level", (color) => {
    const samples = noise(color);
    let sum = 0;
    for (const value of samples) sum += value * value;

    expect(samples).toHaveLength(LENGTH);
    expect(Math.sqrt(sum / LENGTH)).toBeCloseTo(NOISE_RMS, 2);
    expect(Math.max(...samples.map(Math.abs))).toBeLessThanOrEqual(1);
  });

  it.each(NOISE_COLORS)("loops %s noise without a jump", (color) => {
    const samples = noise(color);
    const seam = Math.abs(samples[0] - samples[LENGTH - 1]);

    expect(seam).toBeLessThan(meanStep(samples) * 5);
  });

  it("makes brown noise darker than pink, and pink darker than white", () => {
    const brown = meanStep(noise("brown"));
    const pink = meanStep(noise("pink"));
    const white = meanStep(noise("white"));

    expect(brown).toBeLessThan(pink);
    expect(pink).toBeLessThan(white);
  });
});
