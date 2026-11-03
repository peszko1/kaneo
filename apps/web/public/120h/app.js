"use strict";
// Tracker 120h: licznik, wpisy czasu, lekcje na dzień i ustawienia.
// Stan trzyma store.js (Store.S), dźwięk i rozśpiewkę warmup.js.

const S = () => Store.S;
const pad = (n) => String(n).padStart(2, "0");
const dkey = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = (k) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
const fmtH = (min) =>
  (Math.round((min / 60) * 10) / 10).toString().replace(".", ",") + " h";
const fmtM = (minutes) => {
  const min = Math.round(minutes);
  return min < 60
    ? `${min} min`
    : `${Math.floor(min / 60)} h${min % 60 ? " " + (min % 60) + " min" : ""}`;
};
let viewDate = dkey(new Date());

// ---------- lekcje (YAML) ----------
let DEFAULT_YAML = "";
let PLAN = { start: "2026-10-30", lessons: [] };
function parseLessons(text) {
  const d = jsyaml.load(text);
  if (!d || !Array.isArray(d.lessons) || !d.lessons.length)
    throw new Error("Brak listy „lessons”.");
  d.lessons.forEach((l, i) => {
    if (!l.id || !l.title)
      throw new Error(`Lekcja nr ${i + 1}: brak „id” albo „title”.`);
    if (!Array.isArray(l.steps)) l.steps = [];
    l.day = Number(l.day) || 1;
    l.links = Array.isArray(l.links) ? l.links : [];
  });
  return { start: String(d.start || "2026-10-30"), lessons: d.lessons };
}
function loadPlan() {
  const text = S().config.text || DEFAULT_YAML;
  try {
    PLAN = parseLessons(text);
    $("yamlError").textContent = "";
  } catch (e) {
    $("yamlError").textContent =
      "Błąd w lekcjach (YAML): " + e.message + ". Używam domyślnych.";
    PLAN = parseLessons(DEFAULT_YAML);
  }
}

// ---------- czas ----------
const entries = () =>
  Object.entries(S().entries)
    .filter(([, e]) => !e.del)
    .map(([id, e]) => ({ id, ...e }));
const sumDayStored = (d) =>
  entries()
    .filter((e) => e.date === d)
    .reduce((a, e) => a + e.min, 0);

// ---------- licznik ----------
// Dwa tryby (ustawienie settings.mode, nowy tryb działa od następnej sesji):
// - "flow" (domyślny): zwykły licznik w górę, {phase:"work", flow:true, at, done}
//   (done = ms z wcześniejszych odcinków tej sesji, żeby po pauzie liczył dalej);
// - "pomodoro": {phase, left (ms), at (ms, start biegnącego odcinka) | null}.
// Czas pracy zapisuje się jako zakończone odcinki o id "seg-<at>". To samo id na każdym
// urządzeniu, więc gdy dwa urządzenia zobaczą koniec tej samej fazy, wpis się nie podwoi.
// Po pracy sama rusza przerwa; po przerwie licznik czeka na Start.
const T = () => S().timer.v;
const timerRunning = () => !!T()?.at;
const isFlow = (t) => (t ? !!t.flow : S().settings.mode !== "pomodoro");
const phaseLen = (p) =>
  (p === "work" ? S().settings.work : S().settings.brk) * 60000;
function setTimer(v) {
  S().timer = { v, u: Date.now() };
}
function addSegment(at, ms) {
  if (ms < 5000) return;
  S().entries["seg-" + at] = {
    date: dkey(new Date(at)),
    min: ms / 60000,
    note: "licznik",
    src: "timer",
    u: Date.now(),
  };
}
// Doprowadza licznik do chwili `now`. Zwraca true, gdy coś się zmieniło.
function advance(now) {
  let t = T();
  if (!t || !t.at || t.flow) return false;
  let changed = false;
  while (t.at && now >= t.at + t.left) {
    const end = t.at + t.left;
    if (t.phase === "work") {
      addSegment(t.at, t.left);
      t = { phase: "brk", left: phaseLen("brk"), at: end };
      chime("brk");
    } else {
      t = { phase: "work", left: phaseLen("work"), at: null };
      chime("work");
      keepAwake(false);
    }
    changed = true;
  }
  if (changed) setTimer(t);
  return changed;
}
const liveWork = () => {
  const t = T();
  if (!t?.at || t.phase !== "work") return 0;
  return (
    (t.flow ? Date.now() - t.at : Math.min(Date.now() - t.at, t.left)) / 60000
  );
};
const liveDate = () => (T()?.at ? dkey(new Date(T().at)) : null);
const sumAll = () =>
  entries().reduce((a, e) => a + e.min, 0) +
  S().settings.base * 60 +
  liveWork();
const sumDay = (d) => sumDayStored(d) + (liveDate() === d ? liveWork() : 0);

function tick() {
  if (advance(Date.now())) Store.changed();
  renderTimer();
  renderTotals();
  if (viewDate === dkey(new Date())) renderEntries();
}
const clock = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  return (
    (h ? `${h}:` : "") + `${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
  );
};
function renderTimer() {
  const t = T(),
    running = !!t?.at;
  $("skipBtn").hidden = isFlow(t);
  if (isFlow(t)) {
    $("clock").textContent = clock(
      (t?.done || 0) + (running ? Date.now() - t.at : 0),
    );
    $("phase").className = "phase work";
    $("phase").textContent = !t
      ? "Gotowy · siadasz i klikasz Start"
      : running
        ? "Gram"
        : "Pauza";
    const b = $("startBtn");
    b.textContent = running ? "❚❚ Pauza" : t ? "▶ Wznów" : "▶ Start";
    b.classList.toggle("running", running);
    return;
  }
  const left = t
    ? running
      ? t.at + t.left - Date.now()
      : t.left
    : phaseLen("work");
  const s = Math.max(0, Math.ceil(left / 1000));
  $("clock").textContent = `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
  const ph = $("phase");
  ph.className = "phase " + (t ? t.phase : "");
  const fresh =
    !t || (!running && t.phase === "work" && t.left >= phaseLen("work"));
  ph.textContent = fresh
    ? "Gotowy · siadasz i klikasz Start"
    : t.phase === "work"
      ? running
        ? "Praca"
        : "Pauza · praca"
      : running
        ? "Przerwa: wstań, rozluźnij ręce"
        : "Pauza · przerwa";
  const b = $("startBtn");
  b.textContent = running ? "❚❚ Pauza" : fresh ? "▶ Start" : "▶ Wznów";
  b.classList.toggle("running", running);
}
function renderTotals() {
  const tot = sumAll(),
    goal = S().settings.goal * 60;
  $("total").textContent = fmtH(tot);
  $("goal").textContent = S().settings.goal + " h";
  $("today").textContent = fmtM(sumDay(dkey(new Date())));
  $("left").textContent = fmtH(Math.max(0, goal - tot));
  $("bar").style.width = Math.min(100, (tot / goal) * 100) + "%";
  const now = new Date();
  let w = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    w += sumDay(dkey(d));
  }
  renderPace(tot, goal);
  const avg = w / 7,
    rest = goal - tot;
  if (rest <= 0) $("eta").textContent = "Cel osiągnięty 🎉";
  else if (avg > 1) {
    const end = new Date(now);
    end.setDate(end.getDate() + Math.ceil(rest / avg));
    $("eta").textContent =
      `Średnio ${fmtM(avg)} dziennie (7 dni) → koniec ok. ${end.toLocaleDateString("pl-PL", { day: "numeric", month: "long" })}`;
  } else $("eta").textContent = "";
}
// Ile dziennie, żeby zdążyć: to, co zostało na początku dnia, dzielone na dni
// od dziś do terminu włącznie. Dzięki temu dzienna norma nie spada w trakcie grania.
function renderPace(tot, goal) {
  const today = dkey(new Date());
  const deadline = S().settings.deadline;
  const el = $("pace");
  if (!deadline || tot >= goal) {
    el.textContent = "";
    return;
  }
  const days =
    Math.round((parseKey(deadline) - parseKey(today)) / 86400000) + 1;
  const when = parseKey(deadline).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
  });
  if (days < 1) {
    el.textContent = `Termin ${when} minął. Zostało ${fmtH(goal - tot)}: ustaw nową datę w ustawieniach.`;
    return;
  }
  const doneToday = sumDay(today);
  const perDay = (goal - (tot - doneToday)) / days;
  const leftToday = Math.max(0, perDay - doneToday);
  el.innerHTML = `Do ${esc(when)}: <b>${fmtM(perDay)}</b> dziennie (${days} ${days === 1 ? "dzień" : "dni"}) · ${
    leftToday > 0
      ? `dziś jeszcze <b>${fmtM(leftToday)}</b>`
      : "dzisiejsza norma zrobiona ✓"
  }`;
}
$("startBtn").onclick = () => {
  audio();
  const now = Date.now();
  advance(now);
  let t =
    T() ||
    (isFlow(null)
      ? { phase: "work", flow: true, at: null, done: 0 }
      : { phase: "work", left: phaseLen("work"), at: null });
  if (t.at) {
    if (t.phase === "work") addSegment(t.at, now - t.at);
    t = t.flow
      ? { ...t, done: (t.done || 0) + (now - t.at), at: null }
      : { ...t, left: t.left - (now - t.at), at: null };
    keepAwake(false);
  } else {
    t = { ...t, at: now };
    keepAwake(true);
  }
  setTimer(t);
  Store.changed();
  tick();
};
$("stopBtn").onclick = () => {
  const now = Date.now();
  advance(now);
  const t = T();
  if (t?.at && t.phase === "work") addSegment(t.at, now - t.at);
  setTimer(null);
  keepAwake(false);
  Store.changed();
  tick();
};
$("skipBtn").onclick = () => {
  const now = Date.now();
  advance(now);
  const t = T() || { phase: "work", left: 0, at: null };
  if (t.at && t.phase === "work") addSegment(t.at, now - t.at);
  const phase = t.phase === "work" ? "brk" : "work";
  setTimer({ phase, left: phaseLen(phase), at: t.at ? now : null });
  Store.changed();
  tick();
};
setInterval(() => {
  if (timerRunning()) tick();
}, 500);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    tick();
    if (timerRunning() || vState) keepAwake(true);
  }
});

// ---------- dzień ----------
const dayNo = (k) =>
  Math.round((parseKey(k) - parseKey(PLAN.start)) / 86400000) + 1;
const isDone = (id) => !!S().done[id]?.v;
function suggested(k) {
  const L = PLAN.lessons,
    n = dayNo(k);
  let i = 0;
  L.forEach((l, j) => {
    if (l.day <= n) i = j;
  });
  while (isDone(L[i].id) && i < L.length - 1) i++;
  return L[i].id;
}
function renderDay() {
  const d = parseKey(viewDate),
    today = dkey(new Date());
  const lbl = d.toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  $("dayTitle").innerHTML =
    `${esc(lbl)}${viewDate === today ? " <span class='tag'>dziś</span>" : ""}<br><small class="muted">dzień ${dayNo(viewDate)} planu</small>`;
  const day = S().days[viewDate] || {};
  if (document.activeElement !== $("plan")) $("plan").value = day.plan || "";
  renderEntries();
  const sug = suggested(viewDate);
  const cur = PLAN.lessons.some((l) => l.id === day.lesson) ? day.lesson : sug;
  $("lessonSel").innerHTML = PLAN.lessons
    .map(
      (l) =>
        `<option value="${esc(l.id)}"${l.id === cur ? " selected" : ""}>${isDone(l.id) ? "✓ " : ""}d${l.day} · ${esc(l.title)}${l.id === sug ? "  (sugestia)" : ""}</option>`,
    )
    .join("");
  $("lessonTag").textContent =
    day.lesson && day.lesson !== sug ? "twój wybór" : "sugestia";
  const l = PLAN.lessons.find((x) => x.id === cur);
  const total = l.steps.reduce((a, s) => a + (Number(s.min) || 0), 0);
  $("lesson").innerHTML = `
    ${l.udemy ? `<div class="udemy">Udemy (obejrzyj przed graniem): <a href="${esc(l.udemy.url)}" target="_blank" rel="noopener">${esc(l.udemy.title)}</a></div>` : ""}
    <ol class="steps">${l.steps.map((s) => `<li><span class="min">${esc(s.min)} min</span> · ${esc(s.text)}</li>`).join("")}</ol>
    ${l.links.map((x) => `<div><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a></div>`).join("")}
    <div class="row" style="justify-content:space-between;margin-top:8px">
      <small class="muted">razem ${total} min</small>
      <label class="row" style="gap:6px"><input type="checkbox" id="doneChk"${isDone(l.id) ? " checked" : ""}> zrobiona</label>
    </div>`;
  $("doneChk").onchange = (e) => {
    S().done[l.id] = { v: e.target.checked, u: Date.now() };
    Store.changed();
    renderDay();
  };
}
function renderEntries() {
  const list = entries()
    .filter((e) => e.date === viewDate && e.min >= 0.5)
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  const live = liveDate() === viewDate ? liveWork() : 0;
  $("entries").innerHTML =
    list.length || live
      ? list
          .map(
            (e) =>
              `<li data-id="${esc(e.id)}"><b style="min-width:72px">${fmtM(e.min)}</b><span class="n muted">${esc(e.note || "")}${e.src === "timer" && e.id.startsWith("seg-") ? " " + new Date(Number(e.id.slice(4))).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }) : ""}</span><button type="button" data-a="edit">zmień</button><button type="button" data-a="del" aria-label="Usuń">✕</button></li>`,
          )
          .join("") +
        (live
          ? `<li><b style="min-width:72px">${fmtM(live)}</b><span class="n muted">licznik (trwa)</span></li>`
          : "") +
        `<li><b>Razem ${fmtM(sumDay(viewDate))}</b></li>`
      : `<li class="muted">Brak czasu. Naciśnij Start albo dodaj ręcznie.</li>`;
}
$("entries").onclick = (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const id = b.closest("li").dataset.id,
    en = S().entries[id];
  if (!en) return;
  if (b.dataset.a === "del") {
    if (!confirm(`Usunąć ${fmtM(en.min)}?`)) return;
    S().entries[id] = { ...en, del: true, u: Date.now() };
  } else {
    const v = prompt("Minuty:", Math.round(en.min));
    if (v === null) return;
    const m = Number.parseFloat(String(v).replace(",", "."));
    if (!(m >= 0)) return;
    const n = prompt("Notatka:", en.note || "");
    S().entries[id] = {
      ...en,
      min: m,
      note: n === null ? en.note : n,
      u: Date.now(),
    };
  }
  Store.changed();
  renderEntries();
  renderTotals();
};
$("addForm").onsubmit = (e) => {
  e.preventDefault();
  const min =
    (Number.parseFloat($("addH").value) || 0) * 60 +
    (Number.parseFloat($("addM").value) || 0);
  if (min <= 0) return;
  S().entries[Store.uid()] = {
    date: viewDate,
    min,
    note: $("addNote").value.trim(),
    src: "manual",
    u: Date.now(),
  };
  $("addH").value = $("addM").value = $("addNote").value = "";
  Store.changed();
  renderEntries();
  renderTotals();
};
const setDay = (k, v) => {
  S().days[viewDate] = { ...S().days[viewDate], [k]: v, u: Date.now() };
  Store.changed();
};
$("plan").oninput = (e) => setDay("plan", e.target.value);
$("lessonSel").onchange = (e) => {
  setDay("lesson", e.target.value);
  renderDay();
};
const shift = (n) => {
  const d = parseKey(viewDate);
  d.setDate(d.getDate() + n);
  viewDate = dkey(d);
  renderDay();
};
$("prevDay").onclick = () => shift(-1);
$("nextDay").onclick = () => shift(1);

// ---------- ustawienia ----------
function renderSettings() {
  const st = S().settings;
  $("sBase").value = st.base;
  $("sGoal").value = st.goal;
  $("sDeadline").value = st.deadline || "";
  $("sWork").value = st.work;
  $("sBrk").value = st.brk;
  $("sMode").value = st.mode === "pomodoro" ? "pomodoro" : "flow";
  if (document.activeElement !== $("yaml"))
    $("yaml").value = S().config.text || DEFAULT_YAML;
}
const num = (v, d) => {
  const x = Number.parseFloat(String(v).replace(",", "."));
  return x >= 0 ? x : d;
};
const setSetting = (k, v) => {
  S().settings = { ...S().settings, [k]: v, u: Date.now() };
  Store.changed();
  renderTotals();
  renderTimer();
};
$("sBase").onchange = (e) => setSetting("base", num(e.target.value, 0));
$("sGoal").onchange = (e) =>
  setSetting("goal", num(e.target.value, 120) || 120);
$("sDeadline").onchange = (e) => setSetting("deadline", e.target.value || null);
$("sWork").onchange = (e) => setSetting("work", num(e.target.value, 25) || 25);
$("sBrk").onchange = (e) => setSetting("brk", num(e.target.value, 5) || 5);
$("sMode").onchange = (e) => setSetting("mode", e.target.value);
$("yamlSave").onclick = () => {
  const text = $("yaml").value;
  try {
    parseLessons(text);
  } catch (e) {
    $("yamlError").textContent = "Nie zapisano: " + e.message;
    return;
  }
  S().config = {
    text: text.trim() === DEFAULT_YAML.trim() ? null : text,
    u: Date.now(),
  };
  Store.changed();
  loadPlan();
  renderDay();
  $("yamlError").textContent = "Zapisano.";
};
$("yamlReset").onclick = () => {
  if (!confirm("Przywrócić domyślne lekcje? Twoje zmiany w YAML znikną."))
    return;
  S().config = { text: null, u: Date.now() };
  Store.changed();
  loadPlan();
  renderSettings();
  renderDay();
};
$("exportBtn").onclick = () => {
  const blob = new Blob([JSON.stringify(S(), null, 1)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `120h-${dkey(new Date())}.json`;
  a.click();
};
$("importBtn").onclick = () => $("importFile").click();
$("importFile").onchange = async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const d = Store.normalize(JSON.parse(await f.text()));
    if (
      !confirm(
        "Dołączyć dane z pliku? Wpisy z pliku zostaną dodane, a nowsze ustawienia wygrają.",
      )
    )
      return;
    Store.S = Store.merge(Store.S, d);
    Store.changed();
    refresh();
  } catch {
    alert("To nie jest plik z tej aplikacji.");
  }
};

// ---------- synchronizacja ----------
const STATUS = {
  local: "Zapis na tym urządzeniu",
  syncing: "Synchronizacja…",
  synced: "Zsynchronizowane z Kaneo",
  offline: "Offline: zapis lokalny, wyślę po powrocie sieci",
  off: "Bez synchronizacji (zaloguj się w Kaneo i włącz zakładkę 120h)",
  error: "Błąd synchronizacji, spróbuję ponownie",
};
function renderStatus() {
  $("sync").textContent =
    STATUS[Store.status] +
    (Store.dirty && Store.status !== "syncing" ? " · zmiany czekają" : "");
  $("sync").dataset.state = Store.status;
}
Store.listeners.add((kind) => {
  renderStatus();
  if (kind === "data") refresh();
});

function refresh() {
  loadPlan();
  renderSettings();
  renderVoiceSettings();
  renderDay();
  tick();
}

(async function init() {
  const theme = new URLSearchParams(location.search).get("theme");
  if (theme === "dark" || theme === "light")
    document.documentElement.dataset.theme = theme;
  try {
    DEFAULT_YAML = await (
      await fetch(
        "lessons.yaml?v=" +
          (document.querySelector('meta[name="lessons-version"]')?.content ||
            Date.now()),
      )
    ).text();
  } catch {
    DEFAULT_YAML =
      "start: 2026-10-30\nlessons:\n  - id: brak\n    day: 1\n    title: Brak lekcji (offline, brak pliku lessons.yaml)\n";
  }
  refresh();
  renderStatus();
  if (timerRunning()) keepAwake(true);
  Store.sync();
})();
