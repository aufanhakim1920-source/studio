/* ==========================================================================
   NOCTURNE — split-flap board, cobalt.
   Mechanism from Template 13, with the template's own upgrade path applied:
     1. ordered walk instead of a random scramble  (a drum, not a slot machine)
     2. transform-origin:top on the squash          (the leaf falls downward)
     3. a settle on landing                         (it rattles into place)
   Plus the thing T13 never does: the board is bound to state, so a fare
   change re-flaps ONLY the tiles whose character actually changed.
   ========================================================================== */

/* Two drums, not one alphabet — and this is the thing that makes the ordered
   walk actually pay off. A real board has letter drums in the destination rack
   and number drums in the time/fare rack. With one 38-glyph drum, a tile
   heading for "C" wraps through 0–9 and $ on the way, so mid-flight a word
   still looks like noise and you have thrown away the whole point of stepping
   in order. Split by character class and every letter tile approaches through
   letters — you can read the word assembling. */
const DRUM_ALPHA = " ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DRUM_NUM   = " 0123456789$";
const drumFor = ch => (DRUM_ALPHA.indexOf(ch) >= 0 ? DRUM_ALPHA : DRUM_NUM);

const STEP_MS      = 60;   // one leaf per 60ms — T13's readable-cascade rate
const HOLD_MS      = 30;   // shorter than the 50ms transition, on purpose
const OPEN_STAGGER = 100;  // first run, per tile
const DIFF_STAGGER = 45;   // an update ripples faster than the first arrival
const ROW2_OFFSET  = 1000; // ~0.38 of row 1's total: the rows must overlap

/* --- copy, written to the grid ------------------------------------------ */
const WIDE = {
  n: 18,
  dest: "  SYDNEY CENTRAL  ",
  fare: {
    seat:  "SEAT   $79 RECLINE",
    berth: "BERTH $189 LINEN  ",
    cabin: "CABIN $349 ENSUITE"
  }
};
const NARROW = {
  n: 9,
  dest: " SYDNEY  ",
  fare: { seat: "SEAT  $79", berth: "BERTH$189", cabin: "CABIN$349" }
};

const READABLE = {
  seat:  "Seat, seventy-nine dollars, reclining",
  berth: "Berth, one hundred and eighty-nine dollars, bunk with linen",
  cabin: "Cabin, three hundred and forty-nine dollars, ensuite"
};

const row1    = document.getElementById("row-1");
const row2    = document.getElementById("row-2");
const reflap  = document.getElementById("reflap");
const fares   = document.getElementById("fares");
const stars   = document.getElementById("stars");
const cdEl    = document.getElementById("countdown");

let SET      = null;   // WIDE or NARROW
let fare     = "berth";
let timers   = [];     // every pending setTimeout / setInterval, so a re-run cancels cleanly
let pending  = 0;      // tiles still in flight — the footer state is DERIVED from this

window.__forceMotion = false;   // verification hook; see the reduced-motion gate
const reduced = () =>
  !window.__forceMotion &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------ tiles */
function paint(tile, ch){
  tile.textContent = ch === " " ? "" : ch;
  tile.dataset.char = ch;
  tile.classList.toggle("blank", ch === " ");
}

function makeRow(rowEl, n){
  rowEl.style.setProperty("--n", n);
  rowEl.textContent = "";
  for (let i = 0; i < n; i++){
    const t = document.createElement("div");
    t.className = "flap blank";
    t.dataset.char = " ";
    rowEl.appendChild(t);
  }
}

/* The ordered walk. This is the whole difference from the reference: instead of
   `characters[Math.floor(Math.random()*39)]` we start a fixed number of leaves
   BEFORE the answer and step forward one glyph at a time, wrapping, until we
   reach it. You watch the drum approach the letter rather than watch noise stop.
   The per-tile randomness moves from the CHARACTERS to the RUN LENGTH, which is
   where T13 says the jitter has to live or the cascade reads as computed. */
function walk(tile, target, delay){
  const drum = drumFor(target);
  const L = drum.length;
  const ti = drum.indexOf(target);
  if (ti < 0){ paint(tile, target); return; }          // never spin forever

  pending++;
  timers.push(setTimeout(() => {
    const run = 11 + Math.floor(Math.random() * 11);   // 11–21 leaves ≈ 0.66–1.26s
    let i = ((ti - run) % L + L) % L;
    paint(tile, drum[i]);

    const iv = setInterval(() => {
      tile.classList.add("flipping");
      const off = setTimeout(() => tile.classList.remove("flipping"), HOLD_MS);
      timers.push(off);

      i = (i + 1) % L;
      paint(tile, drum[i]);

      if (i === ti){
        clearInterval(iv);
        tile.classList.remove("flipping");
        tile.classList.add("settling");
        timers.push(setTimeout(() => tile.classList.remove("settling"), 70));
        if (--pending === 0) document.body.classList.add("boarded");
      }
    }, STEP_MS);
    timers.push(iv);
  }, delay));
}

/* diffOnly is the point: a real Solari only moves the flaps that changed. */
function setRow(rowEl, str, { diffOnly = true, stagger = DIFF_STAGGER, offset = 0 } = {}){
  [...rowEl.children].forEach((tile, i) => {
    const target = str[i] ?? " ";
    if (diffOnly && tile.dataset.char === target) return;
    if (reduced()){ paint(tile, target); return; }
    walk(tile, target, offset + i * stagger);
  });
  if (reduced() && pending === 0) document.body.classList.add("boarded");
}

function clearTimers(){
  timers.forEach(t => { clearTimeout(t); clearInterval(t); });
  timers = [];
  pending = 0;
}

/* ------------------------------------------------------------------ board */
function buildBoard(runCascade){
  clearTimers();
  document.body.classList.remove("boarded");
  SET = window.matchMedia("(max-width: 720px)").matches ? NARROW : WIDE;

  makeRow(row1, SET.n);
  makeRow(row2, SET.n);
  row2.setAttribute("aria-label", READABLE[fare]);

  if (!runCascade || reduced()){
    [...row1.children].forEach((t,i) => paint(t, SET.dest[i]));
    [...row2.children].forEach((t,i) => paint(t, SET.fare[fare][i]));
    document.body.classList.add("boarded");
    return;
  }
  setRow(row1, SET.dest,        { diffOnly:false, stagger:OPEN_STAGGER });
  setRow(row2, SET.fare[fare],  { diffOnly:false, stagger:OPEN_STAGGER, offset:ROW2_OFFSET });
}

function selectFare(next){
  if (next === fare) return;
  fare = next;
  [...fares.children].forEach(b => {
    const on = b.dataset.fare === fare;
    b.classList.toggle("is-on", on);
    b.setAttribute("aria-pressed", String(on));
  });
  row2.setAttribute("aria-label", READABLE[fare]);
  setRow(row2, SET.fare[fare], { diffOnly:true });   // only the changed flaps move
}

fares.addEventListener("click", e => {
  const btn = e.target.closest(".fare");
  if (btn) selectFare(btn.dataset.fare);
});

reflap.addEventListener("click", () => buildBoard(true));
window.addEventListener("keydown", e => {
  if (e.key === "r" || e.key === "R"){
    if (document.activeElement && document.activeElement.tagName === "INPUT") return;
    buildBoard(true);
  }
});

/* --------------------------------------------------------------- countdown */
function nextDeparture(){
  const now = new Date();
  const d = new Date(now);
  d.setHours(21, 40, 0, 0);
  if (d <= now) d.setDate(d.getDate() + 1);
  return d;
}
function tick(){
  const ms = Math.max(0, nextDeparture() - new Date());
  const s = Math.floor(ms / 1000);
  const pad = v => String(v).padStart(2, "0");
  cdEl.textContent = `${pad(Math.floor(s/3600))}:${pad(Math.floor(s/60)%60)}:${pad(s%60)}`;
}
tick();
setInterval(tick, 1000);

/* ------------------------------------------------------------------ stars */
/* T02's pixel bloom is a 5-cell plus with a stem. Remove the stem and change
   the palette and the same shape is an 8-bit star — the crude-pixel-versus-
   elegant-serif tension T02 runs on, moved to a night subject. They do NOT
   float: T02's three ambient loops are dropped under [[Motion Must Be User
   Driven]]; this layer is texture, and its only motion is pointer parallax. */
const STARS = [
  [ 6, 12, 16, .55, 1], [ 14,  30, 10, .40, 0], [ 23,  9, 12, .48, 0],
  [ 33, 22,  8, .32, 0], [ 44,  7, 14, .58, 1], [ 55, 17,  9, .34, 0],
  [ 66, 10, 12, .46, 0], [ 76, 25, 10, .38, 1], [ 86, 12, 16, .52, 0],
  [ 94, 30,  9, .34, 0], [ 3,  46, 10, .30, 0], [ 97, 50, 12, .32, 1],
  [ 10, 66,  8, .24, 0], [ 90, 70, 10, .26, 0]
];
/* The shape: a 7×7 four-point sparkle. A bare 5-cell plus reads as a crosshair
   or a medical cross, not a star — the 3×3 core is what turns it into one. */
function sparkle(arm, core){
  return `<rect x="3" y="0" width="1" height="7" fill="${arm}"/>
          <rect x="0" y="3" width="7" height="1" fill="${arm}"/>
          <rect x="2" y="2" width="3" height="3" fill="${arm}"/>
          <rect x="3" y="3" width="1" height="1" fill="${core}"/>`;
}

stars.innerHTML = STARS.map(([x,y,s,o,gold]) => `
  <svg viewBox="0 0 7 7" width="${s}" height="${s}"
       style="left:${x}%;top:${y}%;opacity:${o}">
    ${gold ? sparkle("#F7D046", "#fff") : sparkle("#fff", "#F7D046")}
  </svg>`).join("");

/* The substituted glyph in the wordmark — T02 device 4. */
document.querySelector(".wm-glyph").innerHTML =
  `<svg viewBox="0 0 7 7" aria-hidden="true">${sparkle("#F7D046", "#EFEADA")}</svg>`;

/* Pointer parallax only — nothing here moves on its own. Written to the
   `translate` property, not `transform`, so it never fights a keyframe. */
window.addEventListener("pointermove", e => {
  if (reduced()) return;
  const x = (e.clientX / window.innerWidth  - .5) * -12;
  const y = (e.clientY / window.innerHeight - .5) * -7;
  stars.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
}, { passive:true });

/* ------------------------------------------------------------------- boot */
/* matchMedia('change'), NOT a resize listener: resize fires on every height
   change too (mobile URL bars, and — found the hard way — the viewport
   transient a headless captureBeyondViewport screenshot creates), and each one
   was tearing the board down and rebuilding it mid-capture. */
window.matchMedia("(max-width: 720px)").addEventListener("change", () => buildBoard(false));

buildBoard(true);
