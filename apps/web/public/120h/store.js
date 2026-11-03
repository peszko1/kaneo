"use strict";
// Stan trackera 120h: najpierw na urządzeniu (localStorage), potem synchronizacja
// z Kaneo przez /api/practice. Scalanie pole po polu: wygrywa nowsza zmiana (u = ms).
// Kaneo tylko przechowuje dokument; cała logika jest tutaj.

const STORE_KEY = "kaneo-120h";
const now = () => Date.now();
const uid = () =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : String(Math.random()).slice(2) + now();

const DEFAULTS = {
  settings: { base: 8.5, goal: 120, mode: "flow", work: 25, brk: 5, u: 0 },
  voice: {
    low: 43,
    high: 72,
    bpm: 110,
    down: 0,
    mel: true,
    vowels: ["mmm", "brrr", "jooo", "jaaa"],
    u: 0,
  },
  entries: {}, // id -> {date, min, note, src, u, del}
  days: {}, // YYYY-MM-DD -> {lesson, plan, u}
  done: {}, // lessonId -> {v, u}
  timer: { v: null, u: 0 }, // v: {phase:'work'|'brk', left(ms), at(ms)|null}
  config: { text: null, u: 0 }, // lekcje w YAML; null = domyślne z lessons.yaml
};

function fresh() {
  return JSON.parse(JSON.stringify(DEFAULTS));
}

// Dane z pierwszej wersji PWA (eksport JSON albo stary localStorage).
function fromLegacy(d) {
  const s = fresh();
  s.settings = {
    base: d.base ?? 8.5,
    goal: d.goal ?? 120,
    work: d.work ?? 25,
    brk: d.brk ?? 5,
    u: 1,
  };
  if (d.voice) s.voice = { ...s.voice, ...d.voice, u: 1 };
  for (const e of d.entries || [])
    s.entries[String(e.id)] = {
      date: e.date,
      min: e.min,
      note: e.note || "",
      src: e.src || "manual",
      u: 1,
    };
  for (const [k, v] of Object.entries(d.days || {})) s.days[k] = { ...v, u: 1 };
  for (const k of Object.keys(d.done || {})) s.done[k] = { v: true, u: 1 };
  return s;
}

function normalize(d) {
  if (!d || typeof d !== "object") return fresh();
  if (Array.isArray(d.entries)) return fromLegacy(d);
  const s = fresh();
  for (const k of Object.keys(s))
    if (d[k] && typeof d[k] === "object")
      s[k] = k === "settings" || k === "voice" ? { ...s[k], ...d[k] } : d[k];
  return s;
}

// Scalanie: obiekty z polem u porównujemy całe, mapy klucz po kluczu.
const newer = (a, b) => ((b?.u ?? 0) > (a?.u ?? 0) ? b : a);
function mergeMap(a = {}, b = {}) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = newer(out[k], v);
  return out;
}
function merge(left, right) {
  const a = normalize(left);
  const b = normalize(right);
  return {
    settings: newer(a.settings, b.settings),
    voice: newer(a.voice, b.voice),
    entries: mergeMap(a.entries, b.entries),
    days: mergeMap(a.days, b.days),
    done: mergeMap(a.done, b.done),
    timer: newer(a.timer, b.timer),
    config: newer(a.config, b.config),
  };
}

// Dokument z serwera: lekcje (YAML) są osobnym polem, ich czas zmiany siedzi w stanie.
function fromDoc(doc) {
  if (!doc.state) return normalize(null);
  return normalize({
    ...doc.state,
    config: { text: doc.config ?? null, u: doc.state.config?.u ?? 0 },
  });
}

// JSON z posortowanymi kluczami, żeby porównywać treść, a nie kolejność.
function stable(x) {
  if (Array.isArray(x)) return "[" + x.map(stable).join(",") + "]";
  if (x && typeof x === "object")
    return (
      "{" +
      Object.keys(x)
        .sort()
        .map((k) => JSON.stringify(k) + ":" + stable(x[k]))
        .join(",") +
      "}"
    );
  return JSON.stringify(x);
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch {}
  return fresh();
}

// ---------- synchronizacja ----------
const params = new URLSearchParams(location.search);
const API = (params.get("api") || "/api").replace(/\/$/, "");

const Store = {
  S: loadLocal(),
  version: Number(localStorage.getItem(STORE_KEY + ":v") || 0),
  status: "local", // local | synced | syncing | offline | off | error
  listeners: new Set(),
  dirty: false,
  pushTimer: null,

  save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(this.S));
      localStorage.setItem(STORE_KEY + ":v", String(this.version));
    } catch {}
  },
  // Wywołaj po każdej zmianie zrobionej przez użytkownika.
  changed() {
    this.save();
    this.dirty = true;
    this.schedule();
  },
  schedule(delay = 4000) {
    if (this.pushTimer) return;
    this.pushTimer = setTimeout(() => {
      this.pushTimer = null;
      this.sync();
    }, delay);
  },
  setStatus(s) {
    this.status = s;
    for (const f of this.listeners) f();
  },

  apply(doc) {
    const remote = fromDoc(doc);
    const before = stable(this.S);
    this.S = merge(this.S, remote);
    this.version = doc.version;
    this.enabled = doc.enabled;
    // Lokalnie są zmiany, których serwer nie ma: trzeba je wysłać.
    this.dirty = stable(this.S) !== stable(remote);
    this.save();
    return before !== stable(this.S);
  },

  async request(method, body) {
    const res = await fetch(API + "/practice", {
      method,
      credentials: "include",
      keepalive: method === "PUT",
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401 || res.status === 403)
      throw Object.assign(new Error("auth"), { off: true });
    if (!res.ok && res.status !== 409) throw new Error("http " + res.status);
    return { status: res.status, doc: await res.json() };
  },

  // Pobierz, scal, a jeśli trzeba, wyślij. Konflikt wersji (409) = scal i spróbuj jeszcze raz.
  async sync() {
    if (!navigator.onLine) {
      this.setStatus("offline");
      return false;
    }
    this.setStatus("syncing");
    let changedHere = false;
    try {
      let { doc } = await this.request("GET");
      changedHere = this.apply(doc) || changedHere;
      for (let i = 0; i < 3 && this.dirty; i++) {
        const { config, ...state } = this.S;
        const r = await this.request("PUT", {
          version: this.version,
          state: { ...state, config: { u: config.u } },
          config: config.text,
        });
        if (r.status === 200) {
          this.version = r.doc.version;
          this.dirty = false;
          this.save();
          break;
        }
        changedHere = this.apply(r.doc) || changedHere;
      }
      this.setStatus(this.enabled === false ? "off" : "synced");
    } catch (e) {
      this.setStatus(e.off ? "off" : navigator.onLine ? "error" : "offline");
    }
    if (changedHere) for (const f of this.listeners) f("data");
    return changedHere;
  },

  merge,
  normalize,
  uid,
  now,
};

window.addEventListener("online", () => Store.sync());
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") Store.sync();
  else if (Store.dirty) Store.sync();
});
setInterval(() => Store.sync(), 60000);
