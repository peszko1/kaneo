// A simple synthetic piano: a wave with falling harmonics through a filter
// that darkens as the note fades. No samples, so it works offline.

let wave: { context: BaseAudioContext; wave: PeriodicWave } | null = null;

function pianoWave(context: BaseAudioContext) {
  if (wave?.context === context) return wave.wave;
  const size = 12;
  const real = new Float32Array(size);
  const imag = new Float32Array(size);
  for (let k = 1; k < size; k++)
    imag[k] = (1 / k ** 1.3) * (k % 7 === 0 ? 0.2 : 1);
  wave = { context, wave: context.createPeriodicWave(real, imag) };
  return wave.wave;
}

export const midiFrequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export function playPianoNote(
  context: BaseAudioContext,
  output: AudioNode,
  midi: number,
  at: number,
  duration: number,
  velocity: number,
) {
  const frequency = midiFrequency(midi);
  const gain = context.createGain();
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(Math.min(frequency * 8, 9000), at);
  filter.frequency.exponentialRampToValueAtTime(
    Math.max(frequency * 1.5, 300),
    at + 1.5,
  );
  // Low notes ring longer, as on a real piano.
  const decay = Math.max(0.6, 3.2 - (midi - 40) * 0.04);
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(velocity, at + 0.006);
  gain.gain.setTargetAtTime(velocity * 0.35, at + 0.01, 0.25);
  gain.gain.setTargetAtTime(0.0001, at + 0.3, decay);
  gain.gain.setTargetAtTime(0.0001, at + duration, 0.08);
  // A second, slightly detuned string.
  for (const detune of [-0.45, 1.5]) {
    const oscillator = context.createOscillator();
    oscillator.setPeriodicWave(pianoWave(context));
    oscillator.frequency.value = frequency;
    oscillator.detune.value = detune;
    oscillator.connect(filter);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.6);
  }
  filter.connect(gain);
  gain.connect(output);
}
