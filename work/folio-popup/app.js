const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let P = [], i = 0, p = 0;          /* p = how far the pop-up stands, 0…1 */
const setP = (v, animate = true) => {
  p = clamp(v, 0, 1);
  const pop = $("#pop"), tab = $("#tab");
  [pop, tab].forEach((n) => (n.style.transition = animate ? "" : "none"));
  pop.style.setProperty("--p", p.toFixed(3));
  tab.style.setProperty("--p", p.toFixed(3));
  $("#tabT").textContent = p > .5 ? "Push" : "Pull";
};
/* ── the spread ────────────────────────────────────────────────────────── */
function show(n, { drop = true } = {}) {
  i = (n + P.length) % P.length;
  const d = P[i];
  if (drop) setP(0);              /* a new spread always starts flat */
  $("#pgNo").textContent = `${String(i + 1).padStart(2, "0")} / ${String(P.length).padStart(2, "0")}`;
  $("#pgName").textContent = d.name;
  $("#pgDesc").textContent = d.desc;
  $("#pgTags").innerHTML = d.tags.map((t) => `<li>${t}</li>`).join("");
  const a = $("#pgLink");
  a.hidden = !d.url;
  if (d.url) { a.href = d.url; a.target = "_blank"; a.rel = "noopener"; }
  /* the three risers carry the three things worth seeing from across a room */
  $("#l1").textContent = d.name;
  $("#l2").textContent = d.status;
  $("#l3").textContent = d.year;
  $$("#dots button").forEach((b, k) => {
    b.classList.toggle("is-on", k === i);
    b.setAttribute("aria-selected", String(k === i));
  });
}
/* ── the pull ──────────────────────────────────────────────────────────── */
function wireTab() {
  const tab = $("#tab");
  let dragging = false, y0 = 0, p0 = 0, moved = 0;
  const RANGE = 130;              /* px of travel for a full stand-up */
  const down = (e) => {
    dragging = true; moved = 0;
    y0 = (e.touches ? e.touches[0].clientY : e.clientY);
    p0 = p;
    tab.setPointerCapture?.(e.pointerId ?? 1);
    e.preventDefault();
  };
  const move = (e) => {
    if (!dragging) return;
    const y = (e.touches ? e.touches[0].clientY : e.clientY);
    moved = Math.abs(y - y0);
    /* pulling DOWN raises it — the tab travels toward you, the paper stands */
    setP(p0 + (y - y0) / RANGE, false);
  };
  const up = () => {
    if (!dragging) return;
    dragging = false;
    /* a real pull settles open or shut; a tap just toggles */
    if (moved < 6) setP(p > .5 ? 0 : 1);
    else setP(p > .45 ? 1 : 0);
  };
  tab.addEventListener("pointerdown", down);
  addEventListener("pointermove", move);
  addEventListener("pointerup", up);
  addEventListener("pointercancel", up);
  tab.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setP(p > .5 ? 0 : 1); }
  });
}
/* ── the book leans toward the pointer ─────────────────────────────────── */
function wireTilt() {
  if (REDUCED) return;
  const stage = $(".stage"), book = $("#tilt");
  stage.addEventListener("pointermove", (e) => {
    const r = stage.getBoundingClientRect();
    const dx = (e.clientX - r.left) / r.width - .5;
    const dy = (e.clientY - r.top) / r.height - .5;
    book.querySelector(".spread").style.setProperty("--ty", (dx * 9).toFixed(2) + "deg");
    book.querySelector(".spread").style.setProperty("--tx", (6 - dy * 7).toFixed(2) + "deg");
  });
  stage.addEventListener("pointerleave", () => {
    const s = book.querySelector(".spread");
    s.style.setProperty("--ty", "0deg");
    s.style.setProperty("--tx", "6deg");
  });
}
/* ── counters, once, when they arrive ──────────────────────────────────── */
function wireStats(rows) {
  $("#stats").innerHTML = rows
    .map(([v, k]) => `<div class="stat"><b data-to="${v}">0</b><span>${k}</span></div>`).join("");
  const run = () => $$(".stat b").forEach((n) => {
    const to = +n.dataset.to;
    if (REDUCED) { n.textContent = to; return; }
    const t0 = performance.now(), D = 900;
    const step = (t) => {
      const k = clamp((t - t0) / D, 0, 1);
      n.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  if (!("IntersectionObserver" in window)) { run(); return; }
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { run(); io.disconnect(); }
  }), { threshold: .35 });
  io.observe($("#stats"));
}
async function init() {
  try {
    const r = await fetch("projects.json");
    if (!r.ok) throw new Error("HTTP " + r.status);
    P = await r.json();
  } catch (e) {
    $("#pgName").textContent = "The book did not open";
    $("#pgDesc").textContent = e.message;
    return;
  }
  $("#dots").innerHTML = P.map((d, k) =>
    `<button role="tab" aria-selected="false" aria-label="${d.name}" data-i="${k}"></button>`).join("");
  $$("#dots button").forEach((b) => b.addEventListener("click", () => show(+b.dataset.i)));
  $("#prev").addEventListener("click", () => show(i - 1));
  $("#next").addEventListener("click", () => show(i + 1));
  addEventListener("keydown", (e) => {
    if (e.target instanceof Element && e.target.closest("input,textarea")) return;
    if (e.key === "ArrowLeft") show(i - 1);
    if (e.key === "ArrowRight") show(i + 1);
  });
  wireTab();
  wireTilt();
  const live = P.filter((d) => d.url).length;
  const tags = new Set(P.flatMap((d) => d.tags)).size;
  wireStats([[P.length, "projects on the shelf"], [live, "live right now"],
             [tags, "tools used"], [2, "hackathons won"]]);
  const tick = () => {
    $("#clock").textContent = new Date().toLocaleTimeString("en-AU",
      { timeZone: "Australia/Melbourne", hour: "2-digit", minute: "2-digit" });
  };
  tick(); setInterval(tick, 30000);
  show(0);
  setP(1);                        /* the first spread is already standing, so
                                     the object explains itself on arrival */
}
init();
