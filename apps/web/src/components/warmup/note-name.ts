// `names` is the 12 pitch names from C, space-separated, from the locale
// (B and B♭ in English, H and B in Polish).
export function noteName(midi: number, names: string, octave = true) {
  const name = names.split(" ")[midi % 12] ?? "";
  return octave ? `${name}${Math.floor(midi / 12) - 1}` : name;
}
