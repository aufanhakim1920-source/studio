const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

const C = { orange: "#E85D04", gold: "#E9C46A", sky: "#A8DADC", teal: "#2A9D8F", navy: "#1D3557" };

const ACTS = [
  ["01", "NOCTILUCA", "Fri · 21:40 · Dune stage", C.orange],
  ["02", "Marram", "Fri · 23:10 · Dune stage", C.gold],
  ["03", "SALT LINE", "Sat · 19:00 · Point stage", C.sky],
  ["04", "Ilse Verhoeven", "Sat · 21:30 · Point stage", C.teal],
  ["05", "THE LONG PADDOCK", "Sat · 23:45 · Dune stage", C.orange],
  ["06", "Kōan Kōan", "Sun · 18:20 · Fort stage", C.navy],
  ["07", "Perigee", "Sun · 20:50 · Point stage", C.gold],
  ["08", "FIRST LIGHT (dj set)", "Sun · 04:10 · Fort stage", C.sky],
];

const DAYS = [
  ["Friday 21", "The short night", "Gates at 16:00. Two stages, and the light goes at 20:52.",
   ["16:00 gates", "20:52 sunset", "01:30 last set"], C.orange, "#140A03"],
  ["Saturday 22", "The long one", "All three stages. This is the day people plan the weekend around.",
   ["11:00 gates", "20:53 sunset", "03:00 last set"], C.gold, "#141005"],
  ["Sunday 23", "First light", "It runs through. The last set finishes as the sun comes back up.",
   ["12:00 gates", "20:53 sunset", "05:41 sunrise"], C.sky, "#08110F"],
];

const TIERS = [
  ["Single night", 89, ["Any one night", "Re-entry all evening", "Camping not included"], false],
  ["Full weekend", 210, ["All three nights", "Camping included", "Early entry Saturday"], true],
  ["Weekend + berth", 340, ["All three nights", "A bunk, not a tent", "Breakfast, all three days"], false],
];

function init() {
  /* ── the headline, word by word ──────────────────────────────────────── */
  const words = ["Three", "nights,", "one", "<em>long light.</em>"];
  $("#h1").innerHTML = words
    .map((w, i) => `<span class="w" style="--n:${i}">${w}</span>`).join(" ");

  const h1 = $("#h1");
  if (REDUCED || !("IntersectionObserver" in window)) h1.classList.add("in");
  else {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { h1.classList.add("in"); io.disconnect(); }
    }), { threshold: .3 });
    io.observe(h1);
  }

  /* ── the line-up ─────────────────────────────────────────────────────── */
  $("#acts").innerHTML = ACTS.map(([n, name, meta, c]) => `
    <li><button type="button" style="--c:${c}" data-c="${c}">
      <span class="no">${n}</span>
      <b>${name}</b>
      <span class="meta">${meta}</span>
    </button></li>`).join("");

  /* ⭐ one hover repaints the whole page — rings, pips, buttons, headline */
  const root = document.documentElement;
  const setAccent = (c) => root.style.setProperty("--accent", c);
  $$("#acts button").forEach((b) => {
    b.addEventListener("pointerenter", () => setAccent(b.dataset.c));
    b.addEventListener("focus", () => setAccent(b.dataset.c));
  });
  $("#acts").addEventListener("pointerleave", () => setAccent(C.orange));

  /* ── the days ────────────────────────────────────────────────────────── */
  $("#days").innerHTML = DAYS.map(([d, t, p, l, fg, bg]) => `
    <article class="day" style="--bg:${bg}; --fg:${fg}">
      <span class="day__n">${d}</span>
      <h3>${t}</h3>
      <p>${p}</p>
      <ul>${l.map((x) => `<li>${x}</li>`).join("")}</ul>
    </article>`).join("");

  /* ── passes ──────────────────────────────────────────────────────────── */
  $("#tiers").innerHTML = TIERS.map(([k, p, l, hot]) => `
    <article class="tier${hot ? " tier--hot" : ""}">
      <span class="tier__k">${k}${hot ? " · most taken" : ""}</span>
      <span class="tier__p">$${p}<small>AUD</small></span>
      <ul>${l.map((x) => `<li>${x}</li>`).join("")}</ul>
      <a href="#">${hot ? "Take the weekend" : "Choose"}</a>
    </article>`).join("");

  /* ── the sun opens as you scroll ─────────────────────────────────────── */
  const sun = $("#sun");
  let ticking = false;
  const onScroll = () => {
    const max = innerHeight * 1.6;
    const o = Math.min(scrollY / max, 1);
    sun.style.setProperty("--o", o.toFixed(3));
    ticking = false;
  };
  addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(onScroll);       /* one write per frame, no more */
  }, { passive: true });
  onScroll();

  const tick = () => $("#clock").textContent = new Date().toLocaleTimeString("en-AU",
    { timeZone: "Australia/Melbourne", hour: "2-digit", minute: "2-digit" });
  tick(); setInterval(tick, 30000);
}

init();
