"use strict";
// Dźwięk (syntetyczne pianino), blokada wygaszania ekranu i rozśpiewka.
const $ = (id) => document.getElementById(id);
// ---------- dźwięk ----------
let ctx = null,
  master = null;
function audio() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.5;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp);
    comp.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}
let pianoWave = null;
function wave() {
  if (pianoWave) return pianoWave;
  const n = 12,
    re = new Float32Array(n),
    im = new Float32Array(n);
  for (let k = 1; k < n; k++)
    im[k] = (1 / Math.pow(k, 1.3)) * (k % 7 === 0 ? 0.2 : 1);
  return (pianoWave = ctx.createPeriodicWave(re, im));
}
const freq = (m) => 440 * Math.pow(2, (m - 69) / 12);
// prosty syntetyczny fortepian: fala z harmonicznymi + filtr, który ciemnieje w czasie
function note(m, t, dur, vel = 0.5, out = master) {
  const f = freq(m);
  const g = ctx.createGain(),
    lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(Math.min(f * 8, 9000), t);
  lp.frequency.exponentialRampToValueAtTime(Math.max(f * 1.5, 300), t + 1.5);
  const decay = Math.max(0.6, 3.2 - (m - 40) * 0.04);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vel, t + 0.006);
  g.gain.setTargetAtTime(vel * 0.35, t + 0.01, 0.25);
  g.gain.setTargetAtTime(0.0001, t + 0.3, decay);
  g.gain.setTargetAtTime(0.0001, t + dur, 0.08);
  [0, 1.5].forEach((det, i) => {
    const o = ctx.createOscillator();
    o.setPeriodicWave(wave());
    o.frequency.value = f;
    o.detune.value = i ? det : -det * 0.3;
    o.connect(lp);
    o.start(t);
    o.stop(t + dur + 0.6);
  });
  lp.connect(g);
  g.connect(out);
}
function chime(kind) {
  try {
    audio();
    const t = ctx.currentTime + 0.05;
    const seq = kind === "brk" ? [72, 76, 79, 84] : [84, 79, 76, 72];
    seq.forEach((m, i) => note(m, t + i * 0.18, 0.5, 0.45));
  } catch {}
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
}

// ---------- wake lock ----------
let lock = null;
async function keepAwake(on) {
  try {
    if (on && !lock && "wakeLock" in navigator) {
      lock = await navigator.wakeLock.request("screen");
      lock.addEventListener("release", () => (lock = null));
    }
    if (!on && lock) {
      await lock.release();
      lock = null;
    }
  } catch {}
}

// ---------- rozśpiewka ----------
const NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B", "H"];
const nn = (m) => NAMES[m % 12] + (Math.floor(m / 12) - 1);
const PAT = [0, 2, 4, 5, 7, 5, 4, 2, 0];
const ALLV = ["mmm", "brrr", "jooo", "jaaa"];
const reg = (top) =>
  top <= 62
    ? ["chest", "pierś"]
    : top <= 67
      ? ["mix", "mix (przejście)"]
      : ["head", "głowa"];
let vState = null; // {t0, events, marks, end, gain, timer}

function buildWarmup() {
  const V = Store.S.voice,
    b = 60 / V.bpm;
  const roots = [];
  for (let r = V.low; r + 7 <= V.high; r++) roots.push(r);
  const nUp = roots.length;
  if (V.down)
    for (let r = roots[roots.length - 1] - 1; r >= V.low; r--) roots.push(r);
  const vowels = ALLV.filter((v) => V.vowels.includes(v));
  const ev = [],
    marks = [];
  let t = 0;
  const chordOf = (r, ints) => {
    // akord w środkowym rejestrze, bas osobno
    const c = ints.map((i) => {
      let m = r + i;
      while (m < 52) m += 12;
      while (m > 72) m -= 12;
      return m;
    });
    let bass = r;
    while (bass > 50) bass -= 12;
    while (bass < 36) bass += 12;
    return [bass, ...c];
  };
  vowels.forEach((v, vi) => {
    roots.forEach((r, ri) => {
      marks.push({
        t,
        v,
        vi,
        r,
        ri,
        n: roots.length,
        dir: ri < nUp ? "up" : "down",
      });
      // przygrywka: akord I, 2 ćwierćnuty
      chordOf(r, [0, 4, 7]).forEach((m) => ev.push([t, m, 2 * b, 0.32]));
      ev.push([t + b, r + 7 > 76 ? r + 7 - 12 : r + 7, b * 0.9, 0.18]);
      t += 2 * b;
      // wzór 1-2-3-4-5-4-3-2-1 (ostatni dźwięk 2 ćwierćnuty)
      const pv = V.mel ? 0.07 : 0.16; // przy melodii akordy cicho w tle
      chordOf(r, [0, 4, 7]).forEach((m) => ev.push([t, m, 4 * b, pv]));
      chordOf(r + 7, [0, 4, 10]).forEach((m) =>
        ev.push([t + 4 * b, m, 3 * b, pv]),
      );
      chordOf(r, [0, 4, 7]).forEach((m) => ev.push([t + 8 * b, m, 2 * b, pv]));
      // melodia: niski rejestr (poniżej G3) głośniki tabletu prawie gubią, więc dublujemy oktawę wyżej
      const up = r + 7 < 55 ? 12 : 0;
      if (V.mel)
        PAT.forEach((p, i) => {
          const d = (i === 8 ? 2 : 0.95) * b;
          ev.push([t + i * b, r + p + up, d, 0.6]);
          if (up) ev.push([t + i * b, r + p, d, 0.35]);
        });
      t += 10 * b;
    });
    t += 4 * b; // pauza między samogłoskami
  });
  marks.push({ t, end: true });
  ev.sort((x, y) => x[0] - y[0]); // planista gra zdarzenia po kolei, więc muszą być posortowane w czasie
  return { ev, marks, end: t, b };
}
function vStop() {
  if (!vState) return;
  clearInterval(vState.timer);
  try {
    vState.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
    setTimeout(
      (
        (g) => () =>
          g.disconnect()
      )(vState.gain),
      400,
    );
  } catch {}
  vState = null;
  $("vPlay").textContent = "▶ Graj rozśpiewkę";
  $("vVowel").textContent = "–";
  $("vKey").textContent = "naciśnij ▶";
  $("vBar").style.width = "0";
  if (!timerRunning()) keepAwake(false);
}
// Harmonogram w czasie absolutnym (ctx.currentTime): zdarzenia [t, midi, dł., głośność] i znaczniki tonacji.
// Zmiana ustawień w trakcie nie przerywa grania: obecna tonacja gra do końca, od następnej obowiązują nowe ustawienia.
function vStart(fromVowel = 0) {
  audio();
  const w = buildWarmup();
  if (w.marks.length < 2) {
    alert("Za mały zakres albo brak samogłosek.");
    return;
  }
  const startMark = w.marks.find((m) => m.vi === fromVowel) || w.marks[0];
  const base = ctx.currentTime + 0.15 - startMark.t;
  const gain = ctx.createGain();
  gain.connect(master);
  vState = { gain, base, len: w.end, ev: [], marks: [], i: 0 };
  append(w, startMark, base);
  vState.timer = setInterval(vTick, 40);
  $("vPlay").textContent = "■ Stop";
  keepAwake(true);
}
function append(w, fromMark, base) {
  w.ev
    .filter((e) => e[0] >= fromMark.t)
    .forEach((e) => vState.ev.push([base + e[0], e[1], e[2], e[3]]));
  w.marks
    .filter((m) => m.t >= fromMark.t)
    .forEach((m) => vState.marks.push({ ...m, t: base + m.t }));
}
function vTick() {
  const V = vState,
    now = ctx.currentTime;
  while (V.i < V.ev.length && V.ev[V.i][0] < now + 0.3) {
    const [t, m, d, v] = V.ev[V.i++];
    note(m, t, d, v, V.gain);
  }
  let cur = null;
  for (const mk of V.marks) {
    if (mk.t <= now) cur = mk;
    else break;
  }
  if (!cur) return;
  if (cur.end) {
    vStop();
    chime("work");
    return;
  }
  const [cls, lab] = reg(cur.r + 7);
  $("vVowel").textContent = cur.v;
  $("vKey").innerHTML =
    `<b>${PAT.map((p) => NAMES[(cur.r + p) % 12]).join(" ")}</b><br>${nn(cur.r)} → ${nn(cur.r + 7)} · <span class="reg ${cls}">${lab}</span> · ${cur.dir === "up" ? "↑" : "↓"} ${cur.ri + 1}/${cur.n}`;
  $("vBar").style.width = Math.min(100, ((now - V.base) / V.len) * 100) + "%";
  V.cur = cur;
}
function vAdjust() {
  const V = vState;
  if (!V || !V.cur) return;
  const now = ctx.currentTime;
  // granica: początek następnej tonacji, z zapasem na nuty już wysłane do karty dźwiękowej
  const k = V.marks.indexOf(V.cur);
  let nx = k + 1;
  while (V.marks[nx] && V.marks[nx].t < now + 0.35) nx++;
  const old = V.marks[nx];
  if (!old) return;
  const Tsw = old.t;
  const w = buildWarmup();
  const vowels = w.marks.filter((m) => !m.end && m.ri === 0).map((m) => m.v);
  const same = (m, x) =>
    !m.end && !x.end && m.v === x.v && m.r === x.r && m.dir === x.dir;
  // 1) najprościej: tonacja grana przed granicą istnieje w nowym planie → bierzesz jej następnika
  const prev = V.marks[nx - 1],
    pi = w.marks.findIndex((m) => same(m, prev));
  let target = pi >= 0 ? w.marks[pi + 1] : null;
  // 2) inaczej szukasz miejsca najbliższego tej tonacji, która miała grać jako następna
  const sameV = w.marks.filter((m) => m.v === old.v);
  if (!target && !old.end && sameV.length) {
    target = sameV.find((m) => same(m, old));
    if (!target && old.dir === "up")
      target =
        old.r < Store.S.voice.low
          ? sameV[0]
          : sameV.find((m) => m.dir === "down" && m.r < old.r);
    if (!target && old.dir === "down")
      target = sameV.find((m) => m.dir === "down" && m.r <= old.r);
  }
  // 3) albo następna zaznaczona samogłoska w kolejności mmm, brrr, jooo, jaaa
  if (!target && !old.end) {
    const after = ALLV.slice(ALLV.indexOf(old.v) + 1).find((v) =>
      vowels.includes(v),
    );
    target = after ? w.marks.find((m) => m.v === after && m.ri === 0) : null;
  }
  if (!target) target = w.marks[w.marks.length - 1]; // koniec
  V.ev = V.ev.filter((e, j) => j < V.i || e[0] < Tsw);
  V.i = Math.min(V.i, V.ev.length);
  V.marks = V.marks.filter((m) => m.t < Tsw);
  const base = Tsw - target.t;
  append(w, target, base);
  V.ev.sort((a, b) => a[0] - b[0]);
  V.base = base;
  V.len = w.end;
}
$("vPlay").onclick = () => (vState ? vStop() : vStart(0));
$("vNext").onclick = () => {
  const vowels = ALLV.filter((v) => Store.S.voice.vowels.includes(v));
  const next = vState?.cur ? vState.cur.vi + 1 : 0;
  vStop();
  if (next < vowels.length) vStart(next);
};
// Called from app.js (scripts share the page scope).
// eslint-disable-next-line no-unused-vars
function renderVoiceSettings() {
  const V = Store.S.voice,
    opts = (sel) => {
      let h = "";
      for (let m = 36; m <= 84; m++)
        h += `<option value="${m}"${m === sel ? " selected" : ""}>${nn(m)}</option>`;
      return h;
    };
  $("vLow").innerHTML = opts(V.low);
  $("vHigh").innerHTML = opts(V.high);
  $("vBpm").value = V.bpm;
  $("vDown").value = String(V.down);
  $("vMel").checked = V.mel;
  $("vVowels").innerHTML = ALLV.map(
    (v) =>
      `<label><input type="checkbox" value="${v}"${V.vowels.includes(v) ? " checked" : ""}> ${v}</label>`,
  ).join("");
  const span = (V.high - V.low) / 12;
  $("vLow").closest(".grid").title = `zakres ${span.toFixed(1)} oktawy`;
}
const vSet = (k, v) => {
  Store.S.voice[k] = v;
  Store.S.voice.u = Date.now();
  Store.changed();
  if (vState) vAdjust();
};
$("vLow").onchange = (e) => vSet("low", +e.target.value);
$("vHigh").onchange = (e) => vSet("high", +e.target.value);
$("vBpm").onchange = (e) =>
  vSet("bpm", Math.min(200, Math.max(60, +e.target.value || 110)));
$("vDown").onchange = (e) => vSet("down", +e.target.value);
$("vMel").onchange = (e) => vSet("mel", e.target.checked);
$("vVowels").onchange = () =>
  vSet(
    "vowels",
    [...$("vVowels").querySelectorAll("input:checked")].map((x) => x.value),
  );
