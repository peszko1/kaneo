export const NOISE_COLORS = ["brown", "pink", "white"] as const;

export type NoiseColor = (typeof NOISE_COLORS)[number];

// Every color has the same RMS level, so switching colors keeps the volume.
export const NOISE_RMS = 0.2;
// The filters need this many samples to settle before the output is used.
const WARM_UP_SAMPLES = 4096;

function nextSample(color: NoiseColor) {
  if (color === "white") return (white: number) => white;

  if (color === "brown") {
    let last = 0;
    return (white: number) => {
      last = (last + 0.02 * white) / 1.02;
      return last;
    };
  }

  // Paul Kellet's refined pink filter: -3 dB per octave.
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;
  return (white: number) => {
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    b6 = white * 0.115926;
    return pink;
  };
}

// Fills `length` samples that loop without a click: the samples generated
// past the end fade into the start, so the last sample leads into the first.
export function makeNoise(
  color: NoiseColor,
  length: number,
  fadeLength: number,
  random: () => number = Math.random,
) {
  const sample = nextSample(color);
  for (let i = 0; i < WARM_UP_SAMPLES; i++) sample(random() * 2 - 1);

  const raw = new Float32Array(length + fadeLength);
  for (let i = 0; i < raw.length; i++) raw[i] = sample(random() * 2 - 1);

  const noise = raw.slice(0, length);
  for (let i = 0; i < fadeLength; i++) {
    // Equal-power fade, since the two ends are not correlated.
    const angle = (i / fadeLength) * (Math.PI / 2);
    noise[i] = raw[i] * Math.sin(angle) + raw[length + i] * Math.cos(angle);
  }

  let sum = 0;
  for (const value of noise) sum += value * value;
  const scale = NOISE_RMS / Math.sqrt(sum / length);
  for (let i = 0; i < length; i++) {
    noise[i] = Math.max(-1, Math.min(1, noise[i] * scale));
  }
  return noise;
}
