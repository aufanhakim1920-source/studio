/* The Spec Fan
 * ---------------------------------------------------------------------------
 * The mechanic: fifteen blades share a pivot at the rivet. Spreading the fan is
 * one number — the angle between blades — and everything else follows from it.
 *
 * Two rules from the vault are load-bearing here, not decorative:
 *
 *   NOTHING MOVES UNTIL YOU MOVE IT. Blade 07: of 33 pages measured, 24 have no
 *   ambient motion at all, and the products with the best reputations for feel
 *   are the stillest. There is no timer anywhere in this file. The fan opens on
 *   a click, a drag or an arrow key, and then it stops.
 *
 *   LENGTH IS THE EVIDENCE. A blade's height is its site count, so the weight
 *   behind a finding is legible before a word is read. That is the object doing
 *   the work rather than decorating it.
 */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const fan   = $("#fan");
const deck  = window.DECK;
const N     = deck.length;
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Blade geometry. Closed the fan is a near-stack; open it spans SPREAD degrees.
   Length maps the evidence count onto a readable range — a finding resting on
   one site is visibly stubbier than one resting on thirty. */
const SPREAD_OPEN   = 158;
const SPREAD_CLOSED = 14;
const LEN_MIN = 0.46, LEN_MAX = 1;

let spread  = SPREAD_CLOSED;
let live    = -1;
let isOpen  = false;

const maxN = Math.max(...deck.map((d) => d.n));
const lenOf = (n) =>
  LEN_MIN + (LEN_MAX - LEN_MIN) * Math.sqrt(n / maxN);   /* sqrt so 1 vs 33 stays legible */

/* ── build ────────────────────────────────────────────────────────────────── */
fan.insertAdjacentHTML("beforeend", deck.map((d, i) => `
  <button type="button" class="blade blade--${d.state}" data-i="${i}"
          role="option" aria-selected="false"
          aria-label="${d.id}. ${d.rule}. ${d.state}, from ${d.from}">
    <span class="blade__n">${d.id}</span>
    <span class="blade__t">${d.rule}</span>
  </button>`).join(""));

const blades = $$(".blade", fan);

function layout() {
  const h = fan.clientHeight;
  const step = spread / (N - 1);
  const start = -spread / 2;
  blades.forEach((b, i) => {
    const angle = start + step * i;
    const len = Math.round((h - 40) * lenOf(deck[i].n));
    b.style.height = len + "px";
    b.style.transform = `rotate(${angle}deg)`;
    b.style.zIndex = String(i === live ? 50 : 10 + i);

    /* A vertical label rotates with its blade, so once a blade passes upright
       its text arrives upside-down and mirrored. Flip the label back past the
       midpoint — the same thing a real swatch deck does by printing both
       halves to read outward from the rivet. */
    b.classList.toggle("blade--flip", angle > 4);
    /* expose the angle so tests can read the geometry without parsing a
       transform string, and so the DOM says what it is doing */
    b.dataset.angle = angle.toFixed(1);
  });
}

/* ── selection ────────────────────────────────────────────────────────────── */
const card = $("#card"), idle = $("#idle");

function select(i) {
  if (i < 0 || i >= N) return;
  live = i;
  const d = deck[i];

  blades.forEach((b, j) => {
    b.classList.toggle("is-live", j === i);
    b.setAttribute("aria-selected", String(j === i));
  });

  $("#cId").textContent   = d.id;
  $("#cState").textContent = d.state;
  $("#cState").dataset.state = d.state;
  $("#cRule").textContent = d.rule;
  $("#cBody").textContent = d.body;
  $("#cDo").textContent   = d.do;
  $("#cFrom").textContent = d.from;

  /* the evidence bar spells out what the blade length already showed */
  const pips = 10, on = Math.max(1, Math.round((d.n / maxN) * pips));
  $("#cWeight").innerHTML =
    Array.from({ length: pips }, (_, k) => `<i class="${k < on ? "on" : ""}"></i>`).join("");

  idle.hidden = true;
  card.hidden = false;
  layout();
}

/* ── opening ──────────────────────────────────────────────────────────────── */
function setOpen(open) {
  isOpen = open;
  spread = open ? SPREAD_OPEN : SPREAD_CLOSED;
  const b = $("#spread");
  b.setAttribute("aria-pressed", String(open));
  b.textContent = open ? "Close the fan" : "Fan it open";
  layout();
}

$("#spread").addEventListener("click", () => setOpen(!isOpen));

blades.forEach((b) =>
  b.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!isOpen) setOpen(true);          /* first pick opens it — no dead click */
    select(+b.dataset.i);
  })
);

/* ── drag across the fan ──────────────────────────────────────────────────── */
/* Dragging sideways sweeps the selection, the way a thumb runs across a real
   swatch deck. It also opens the fan, because a closed deck cannot be swept. */
let dragging = false;

function pickFromX(clientX) {
  const r = fan.getBoundingClientRect();
  const t = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
  select(Math.round(t * (N - 1)));
}

fan.addEventListener("pointerdown", (e) => {
  dragging = true;
  fan.classList.add("is-dragging");
  fan.setPointerCapture?.(e.pointerId);
  if (!isOpen) setOpen(true);
  pickFromX(e.clientX);
});
fan.addEventListener("pointermove", (e) => { if (dragging) pickFromX(e.clientX); });
["pointerup", "pointercancel", "pointerleave"].forEach((ev) =>
  fan.addEventListener(ev, () => { dragging = false; fan.classList.remove("is-dragging"); })
);

/* ── keyboard ─────────────────────────────────────────────────────────────── */
fan.addEventListener("keydown", (e) => {
  const k = e.key;
  if (k === "ArrowRight" || k === "ArrowDown") { e.preventDefault(); if (!isOpen) setOpen(true); select(Math.min(N - 1, live + 1)); }
  if (k === "ArrowLeft"  || k === "ArrowUp")   { e.preventDefault(); if (!isOpen) setOpen(true); select(Math.max(0, live - 1)); }
  if (k === "Home")  { e.preventDefault(); setOpen(true); select(0); }
  if (k === "End")   { e.preventDefault(); setOpen(true); select(N - 1); }
  if (k === "Enter" || k === " ") { e.preventDefault(); setOpen(!isOpen); }
});

/* ── boot ─────────────────────────────────────────────────────────────────── */
$("#stampCount").textContent = String(N);
$("#rmNote").textContent = REDUCED
  ? "REDUCED MOTION ON — TRANSITIONS OFF"
  : "REDUCED MOTION RESPECTED";

addEventListener("resize", layout, { passive: true });
layout();
