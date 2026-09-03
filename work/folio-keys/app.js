const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const CAPS = {
  web:    ["var(--acid)",   "#23260A"],
  game:   ["var(--orange)", "#2A1B10"],
  ai:     ["var(--teal)",   "#F4F2E9"],
  motion: ["var(--pink)",   "#2C1622"],
};
function discipline(p) {
  const t = (p.tags.join(" ") + " " + p.name).toLowerCase();
  if (/remotion|video|sound/.test(t)) return "motion";
  if (/unity|canvas|game|narrative/.test(t)) return "game";
  if (/proxy|observability|composio|automation|vision|serverless/.test(t)) return "ai";
  return "web";
}
let P = [], byKey = new Map(), current = -1;
/* one unique letter per project, taken from its own name where possible */
function assignLetters(list) {
  const used = new Set();
  return list.map((p) => {
    const cand = (p.name.toUpperCase().match(/[A-Z]/g) || ["X"]);
    let L = cand.find((c) => !used.has(c));
    if (!L) L = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").find((c) => !used.has(c));
    used.add(L);
    return L;
  });
}
function press(i, { fromKeyboard = false } = {}) {
  const p = P[i];
  if (!p) return;
  current = i;
  const cap = $$(".key")[i];
  $$(".key").forEach((k, n) => k.classList.toggle("is-on", n === i));
  /* the physical travel — held briefly so a keyboard press feels like a press */
  cap.classList.add("is-down");
  setTimeout(() => cap.classList.remove("is-down"), REDUCED ? 0 : 130);
  if (fromKeyboard) cap.scrollIntoView({ block: "nearest", behavior: REDUCED ? "auto" : "smooth" });
  $("#cue").textContent = `key ${cap.dataset.letter} · ${String(i + 1).padStart(2, "0")} of ${String(P.length).padStart(2, "0")}`;
  $("#oName").textContent = p.name;
  $("#oDesc").textContent = p.desc;
  $("#oTags").innerHTML = p.tags.map((t) => `<li>${t}</li>`).join("");
  $("#oYear").textContent = p.year;
  $("#oStatus").textContent = p.status;
  const a = $("#oLink");
  a.hidden = !p.url;
  if (p.url) { a.href = p.url; a.target = "_blank"; a.rel = "noopener"; }
  const out = $("#out");
  out.classList.remove("is-hit");
  void out.offsetWidth;                 /* restart the spring */
  out.classList.add("is-hit");
}
function wireStats(rows) {
  $("#stats").innerHTML = rows.map(([v, k]) =>
    `<div class="stat"><b data-to="${v}">0</b><span>${k}</span></div>`).join("");
  const run = () => $$(".stat b").forEach((n) => {
    const to = +n.dataset.to;
    if (REDUCED) { n.textContent = to; return; }
    const t0 = performance.now();
    const step = (t) => {
      const k = clamp((t - t0) / 900, 0, 1);
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
    $("#oName").textContent = "The board did not load";
    $("#oDesc").textContent = e.message;
    return;
  }
  const letters = assignLetters(P);
  const maxTags = Math.max(...P.map((p) => p.tags.length));
  $("#keys").innerHTML = P.map((p, i) => {
    const d = discipline(p);
    const [cap, ink] = CAPS[d];
    /* width IS scope: a 5-tag build gets a noticeably wider cap than a 3-tag one */
    const w = (1.4 + (p.tags.length / maxTags) * 1.6).toFixed(2);
    return `
      <button class="key" data-i="${i}" data-letter="${letters[i]}"
              style="--w:${w}; --cap:${cap}; --capink:${ink};"
              aria-label="${p.name}, ${p.status}. Shortcut key ${letters[i]}">
        <span class="key__hatch" aria-hidden="true"></span>
        <span class="key__legend">${letters[i]}</span>
        <span>
          <span class="key__name">${p.name}</span>
          <span class="key__meta">${p.tags.length} tools</span>
        </span>
      </button>`;
  }).join("");
  $$(".key").forEach((k) => k.addEventListener("click", () => press(+k.dataset.i)));
  P.forEach((_, i) => byKey.set(letters[i], i));
  /* ⭐ the real keyboard. This is the whole idea, so it has to actually work. */
  addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    /* the event target is not always an Element (document, window), and
       calling .closest on those throws and kills the whole handler */
    if (e.target instanceof Element && e.target.closest("input,textarea,select")) return;
    const L = e.key.toUpperCase();
    if (byKey.has(L)) { e.preventDefault(); press(byKey.get(L), { fromKeyboard: true }); return; }
    if (e.key === "ArrowRight") { e.preventDefault(); press((current + 1) % P.length); }
    if (e.key === "ArrowLeft")  { e.preventDefault(); press((current - 1 + P.length) % P.length); }
  });
  const live = P.filter((p) => p.url).length;
  const tools = new Set(P.flatMap((p) => p.tags)).size;
  wireStats([[P.length, "projects mapped"], [live, "live right now"],
             [tools, "distinct tools"], [2, "hackathons won"]]);
  const tick = () => $("#clock").textContent = new Date().toLocaleTimeString("en-AU",
    { timeZone: "Australia/Melbourne", hour: "2-digit", minute: "2-digit" });
  tick(); setInterval(tick, 30000);
  press(0);         /* one key is already down, so the printout is never empty */
}
init();
