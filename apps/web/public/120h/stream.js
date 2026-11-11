"use strict";
// Widok na stream: duże odliczanie od celu (120 h) w dół i mniejszy licznik dnia.
// Otwiera go przycisk „Tryb stream” albo adres z ?stream=1 (np. źródło przeglądarki w OBS).
// Start/pauza używa tego samego licznika co strona, więc czas zapisuje się tak samo.

const hms = (minutes) => {
  const sec = Math.max(0, Math.floor(minutes * 60));
  return {
    h: Math.floor(sec / 3600),
    m: pad(Math.floor((sec % 3600) / 60)),
    s: pad(sec % 60),
  };
};
let streamLoop = null;

function renderStream() {
  const goal = S().settings.goal * 60;
  const left = hms(goal - sumAll());
  const day = hms(sumDay(dkey(new Date())));
  const running = timerRunning();
  $("stLeftH").textContent = left.h;
  $("stLeftM").textContent = left.m;
  $("stLeftS").textContent = left.s;
  $("stDayH").textContent = day.h;
  $("stDayM").textContent = day.m;
  $("stDayS").textContent = day.s;
  $("stLabel").textContent = `zostało z ${S().settings.goal} h`;
  $("stream").classList.toggle("running", running);
  $("stPlay").textContent = running ? "❚❚" : "▶";
  $("stPlay").setAttribute("aria-label", running ? "Pauza" : "Start");
}

function openStream() {
  $("stream").hidden = false;
  document.body.classList.add("streaming");
  renderStream();
  clearInterval(streamLoop);
  streamLoop = setInterval(renderStream, 500);
  $("stPlay").focus();
}

function closeStream() {
  $("stream").hidden = true;
  document.body.classList.remove("streaming");
  clearInterval(streamLoop);
  streamLoop = null;
  if (document.fullscreenElement) document.exitFullscreen();
}

$("streamBtn").onclick = () => {
  openStream();
  $("stream")
    .requestFullscreen?.()
    .catch(() => {});
};
$("stPlay").onclick = () => {
  $("startBtn").click();
  renderStream();
};
$("stFull").onclick = () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else
    $("stream")
      .requestFullscreen?.()
      .catch(() => {});
};
$("stClose").onclick = closeStream;
document.addEventListener("keydown", (e) => {
  if ($("stream").hidden) return;
  if (e.key === " " && e.target === document.body) {
    e.preventDefault();
    $("stPlay").click();
  } else if (e.key === "Escape" && !document.fullscreenElement) closeStream();
});
Store.listeners.add((kind) => {
  if (kind === "data" && !$("stream").hidden) renderStream();
});
if (new URLSearchParams(location.search).get("stream") === "1") openStream();
