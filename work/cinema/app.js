/* ============================================================
   THE MERRI — a rewind bench.
   Reel position IS the date. Winding to a frame selects that screening.
   ============================================================ */

const art = {

  leader: `
    <rect class="a-bg" width="176" height="128"/>
    <circle class="a-str" cx="88" cy="58" r="44" stroke-width="2"/>
    <path class="a-str" d="M88 2 V114 M4 58 H172" stroke-width="1" opacity=".55"/>
    <text class="a-num" x="88" y="86" font-size="74" text-anchor="middle">3</text>
    <text class="a-txt a-sig" x="88" y="121" font-size="8" text-anchor="middle">16 / 12 / 9</text>`,

  daisies: `
    <rect class="a-bg" width="176" height="128"/>
    <circle class="a-ink" cx="66" cy="54" r="37"/>
    <circle class="a-sig" cx="108" cy="78" r="37"/>
    <rect class="a-bg" x="0" y="62" width="176" height="5"/>`,

  cure: `
    <rect class="a-bg" width="176" height="128"/>
    <path class="a-strs" d="M24 20 L152 108 M152 20 L24 108" stroke-width="3"/>
    <rect class="a-ink" x="86" y="0" width="3" height="128"/>
    <rect class="a-ink" x="14" y="96" width="18" height="18"/>`,

  paris: `
    <rect class="a-bg" width="176" height="128"/>
    <circle class="a-sig" cx="130" cy="38" r="27"/>
    <rect class="a-ink" x="0" y="98" width="176" height="2"/>
    <rect class="a-ink" x="52" y="58" width="7" height="40"/>`,

  chungking: `
    <rect class="a-bg" width="176" height="128"/>
    <g transform="skewX(-26) translate(34,0)">
      <rect class="a-sig" x="-52" y="10"  width="124" height="9"/>
      <rect class="a-sig" x="-18" y="32"  width="88"  height="5" opacity=".65"/>
      <rect class="a-sig" x="-62" y="50"  width="158" height="15"/>
      <rect class="a-sig" x="2"   y="80"  width="66"  height="6" opacity=".6"/>
      <rect class="a-sig" x="-36" y="98"  width="118" height="9" opacity=".85"/>
    </g>
    <circle class="a-ink" cx="134" cy="94" r="17"/>`,

  goodbye: `
    <rect class="a-bg" width="176" height="128"/>
    <path class="a-str" d="M16 126 C 64 96, 26 64, 74 46 S 120 18, 162 28"
          stroke-width="7" stroke-linecap="round"/>
    <rect class="a-sig" x="126" y="76" width="32" height="44"/>`,

  vampyr: `
    <rect class="a-bg" width="176" height="128"/>
    <path class="a-ink" d="M62 6 A 58 58 0 1 0 62 122 A 33 58 0 1 1 62 6 Z"/>
    <rect class="a-sig" x="150" y="0" width="4" height="128"/>`,

  yiyi: `
    <rect class="a-bg" width="176" height="128"/>
    <circle class="a-ink" cx="88" cy="66" r="43"/>
    <circle class="a-bg" cx="88" cy="66" r="15"/>
    <circle class="a-sig" cx="88" cy="66" r="7"/>`,

  blank: `
    <rect class="a-bg" width="176" height="128"/>
    <path class="a-strs" d="M-10 118 L186 96" stroke-width="1" opacity=".28"/>`,

  tail: `
    <rect class="a-bg" width="176" height="128"/>
    <g transform="skewX(-22) translate(26,0)">
      <rect class="a-ink" x="-30" y="0" width="16" height="128"/>
      <rect class="a-ink" x="14"  y="0" width="16" height="128" opacity=".7"/>
      <rect class="a-sig" x="58"  y="0" width="16" height="128"/>
      <rect class="a-ink" x="102" y="0" width="16" height="128" opacity=".5"/>
    </g>
    <rect class="a-bg" x="0" y="44" width="176" height="40"/>
    <text class="a-txt" x="88" y="70" font-size="16" text-anchor="middle">END</text>
    <text class="a-txt a-sig" x="88" y="120" font-size="7" text-anchor="middle">118 HIGH ST</text>`,
};

const FILMS = [
  { t:"Tickets", w:"Head leader", a:art.leader, book:false,
    m:"CASH OR CARD · DOORS 30 MIN PRIOR",
    n:"Full $16. Concession $12. Members $9, every session, no exceptions." },

  { t:"Daisies", w:"Tue 7:00pm", a:art.daisies, book:true,
    m:"CHYTILOVÁ · 1966 · 76 MIN · 35MM",
    n:"Two girls decide the world has gone bad. They are correct." },

  { t:"Cure", w:"Wed 8:30pm", a:art.cure, book:true,
    m:"KUROSAWA · 1997 · 111 MIN · DCP",
    n:"Bring somebody to walk home with. We are not joking." },

  { t:"Paris, Texas", w:"Thu 7:30pm", a:art.paris, book:true,
    m:"WENDERS · 1984 · 145 MIN · 35MM",
    n:"Yes, we know. We are showing it again anyway." },

  { t:"Chungking Express", w:"Fri 9:00pm", a:art.chungking, book:true,
    m:"WONG · 1994 · 102 MIN · DCP",
    n:"The pineapple expires at midnight. The foyer bar does not." },

  { t:"The Long Goodbye", w:"Sat 6:15pm", a:art.goodbye, book:true,
    m:"ALTMAN · 1973 · 112 MIN · 35MM",
    n:"Altman wrecks the detective picture. Best thing that ever happened to it." },

  { t:"Vampyr", w:"Sat 11:00pm", a:art.vampyr, book:true,
    m:"DREYER · 1932 · 74 MIN · LIVE ORGAN",
    n:"Seventy-four minutes. Nobody has ever left early." },

  { t:"Yi Yi", w:"Sun 4:00pm", a:art.yiyi, book:true,
    m:"YANG · 2000 · 173 MIN · DCP",
    n:"Three hours. Take a cushion. You will not notice." },

  { t:"Find us", w:"Tail leader", a:art.tail, book:false,
    m:"TRAM 86 · STOP 41 · TWO SCREENS · 96 SEATS",
    n:"118 High Street, Thornbury. Membership is $70 a year." },
];

const N = FILMS.length;
const LAST = N - 1;

/* Blank academy leader spliced on either end. The film PATH is a fixed length —
   what changes at the ends of a wind is what is on the reels, not whether the
   bench has film in it. Without this the run empties and the full supply reel
   sits there connected to nothing. */
const PAD = 2;

/* ---- reel geometry (spool viewBox units: radius 100 = flange edge) ---- */
const R_HUB = 20;          // bare core
const R_FULL = 94;         // a completely wound reel
const AREA = R_FULL * R_FULL - R_HUB * R_HUB;
const rollR = (frac) => Math.sqrt(R_HUB * R_HUB + AREA * frac);

/* ---- elements ---- */
const runEl    = document.getElementById("run");
const filmEl   = document.getElementById("film");
const gateEl   = document.getElementById("gate");
const lampEl   = document.getElementById("lamp");
const countEl  = document.getElementById("count");
const hintEl   = document.getElementById("hint");
const readout  = document.getElementById("readout");
const rTitle   = document.getElementById("rTitle");
const rWhen    = document.getElementById("rWhen");
const dMeta    = document.getElementById("dMeta");
const dNote    = document.getElementById("dNote");
const dBook    = document.getElementById("dBook");
const spools   = [...document.querySelectorAll(".spool")];
const supplyEl = document.querySelector(".spool--supply");
const takeEl   = document.querySelector(".spool--take");

/* ---- state ---- */
let pos = 3;               // continuous frame position; opens mid-week
let vel = 0;
let mode = "idle";         // idle | inertia | snap
let target = 3;
let raf = 0;
let lit = false;
let shown = -1;
let touched = false;
let tickT = 0;

let pitch = 184;           // frame length along the film + frame line, px
let along = 176;           // the cell's size along the film
let gapPx = 8;
let total = 0;             // the whole strip's length
let vertical = false;      // portrait stands the bench up
let spoolPx = 262;

/* ---- build the film ---- */
const blank = `<div class="cell cell--blank"><svg class="cell__art" viewBox="0 0 176 128" aria-hidden="true">${art.blank}</svg></div>`;
filmEl.innerHTML =
  blank.repeat(PAD) +
  FILMS.map((f, i) => `
  <div class="cell" data-i="${i}">
    <svg class="cell__art" viewBox="0 0 176 128" role="img" aria-label="${f.t}">${f.a}</svg>
  </div>`).join("") +
  blank.repeat(PAD);
const cells = [...filmEl.querySelectorAll(".cell")];

/* ---- measurement ---- */
function measure() {
  const cs = getComputedStyle(document.documentElement);
  vertical = cs.getPropertyValue("--axis").trim() === "1";
  gapPx   = parseFloat(cs.getPropertyValue("--gap"));
  spoolPx = parseFloat(cs.getPropertyValue("--spool"));
  // "along" is the film's own length axis: frame width lying down, frame height standing up
  along = parseFloat(cs.getPropertyValue(vertical ? "--fh" : "--fw"));
  pitch = along + gapPx;
  total = (N + PAD * 2) * pitch - gapPx;
  filmEl.style.setProperty("--pitch4", (pitch / 4) + "px");
}

/* ---- render ---- */
function apply() {
  if (pos < 0) { pos = 0; vel = 0; }
  if (pos > LAST) { pos = LAST; vel = 0; }

  // 1. the film travels. The strip is laid out reversed, so it is measured from
  //    its trailing edge — which is what makes it move TOWARD the take-up reel.
  const centre = (vertical ? runEl.clientHeight : runEl.clientWidth) / 2;
  const travel = centre + ((pos + PAD) * pitch + along / 2) - total;
  filmEl.style.setProperty("--x", (vertical ? 0 : travel) + "px");
  filmEl.style.setProperty("--y", (vertical ? travel : 0) + "px");

  // 2. the reels change size — take-up grows, supply shrinks
  const fracTake = pos / LAST;
  const rTake = rollR(fracTake);
  const rSup  = rollR(1 - fracTake);
  takeEl.style.setProperty("--roll", rTake);
  supplyEl.style.setProperty("--roll", rSup);

  // 3. and they turn — a fatter reel turns less per metre of film
  takeEl.style.setProperty("--rot", rotTake + "rad");
  supplyEl.style.setProperty("--rot", rotSup + "rad");

  // 4. which frame is in the gate
  const idx = Math.round(pos);
  const off = Math.abs(pos - idx);
  cells.forEach((c, i) => c.classList.toggle("is-gate", i === idx + PAD));
  readout.classList.toggle("is-passing", off > 0.1);

  if (idx !== shown) {
    // the gate ticks as each frame passes it — mechanical response to the wind
    if (shown !== -1) {
      gateEl.classList.add("is-tick");
      clearTimeout(tickT);
      tickT = setTimeout(() => gateEl.classList.remove("is-tick"), 130);
    }
    shown = idx;
    const f = FILMS[idx];
    rTitle.textContent = f.t;
    rWhen.textContent  = f.w;
    dMeta.textContent  = f.m;
    dNote.textContent  = f.n;
    dBook.hidden = !f.book;
    countEl.textContent = String(idx + 1).padStart(2, "0") + "/" + String(N).padStart(2, "0");
    runEl.setAttribute("aria-valuenow", idx);
    runEl.setAttribute("aria-valuetext", f.t + ", " + f.w);
  }
}

/* rotation is accumulated, not derived, so it never snaps back */
let rotTake = 0, rotSup = 0;

function advance(dPos) {
  const before = pos;
  pos = Math.max(0, Math.min(LAST, pos + dPos));
  const dL = (pos - before) * pitch;                 // px of film that actually moved
  const scale = spoolPx / 200;
  // MIDPOINT radius, not the post-move one. dTheta = dL / r, and r changes across
  // the step — sampling r at the end makes a big step integrate backwards
  // (a jump to a full take-up reel credited the whole travel to its final fat radius).
  const midFrac = ((before + pos) / 2) / LAST;
  rotTake += dL / Math.max(12, rollR(midFrac) * scale);
  rotSup  += dL / Math.max(12, rollR(1 - midFrac) * scale);
}

/* ---- the loop: only ever runs because somebody touched something ---- */
function tick() {
  if (mode === "inertia") {
    vel *= 0.935;
    advance(vel);
    if (Math.abs(vel) < 0.0022 || pos <= 0 || pos >= LAST) {
      mode = "snap";
      target = Math.round(pos);
    }
  } else if (mode === "snap") {
    const d = (target - pos) * 0.2;
    advance(d);
    if (Math.abs(target - pos) < 0.0015) { advance(target - pos); mode = "idle"; }
  }
  apply();
  raf = mode === "idle" ? 0 : requestAnimationFrame(tick);
}
function run() { if (!raf && mode !== "idle") raf = requestAnimationFrame(tick); }

function firstTouch() {
  if (touched) return;
  touched = true;
  hintEl.classList.add("is-gone");
}

function douse() {
  if (!lit) return;
  lit = false;
  runEl.classList.remove("is-lit");
  document.body.classList.remove("is-lit-page");
  gateEl.setAttribute("aria-pressed", "false");
}

/* ---- winding a spool: a real two-handed turn ---- */
spools.forEach((sp) => {
  let last = 0, id = null;

  sp.addEventListener("pointerdown", (e) => {
    const r = sp.getBoundingClientRect();
    last = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
    id = e.pointerId;
    sp.setPointerCapture(id);
    mode = "idle"; vel = 0;
    firstTouch(); douse();
    e.preventDefault();
  });

  sp.addEventListener("pointermove", (e) => {
    if (id === null || e.pointerId !== id) return;
    const r = sp.getBoundingClientRect();
    const a = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
    let d = a - last;
    while (d >  Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    last = a;

    // film pulled off/onto THIS reel = angle x its own radius. A fat reel moves more film.
    const isTake = sp.classList.contains("spool--take");
    const frac = isTake ? pos / LAST : 1 - pos / LAST;
    const rPx = rollR(frac) * (spoolPx / 200);
    const dPos = (d * rPx) / pitch;                 // clockwise = forward, both reels

    advance(dPos);
    vel = vel * 0.55 + dPos * 0.45;
    apply();
  });

  const up = (e) => {
    if (id === null || (e.pointerId !== undefined && e.pointerId !== id)) return;
    try { sp.releasePointerCapture(id); } catch (_) {}
    id = null;
    mode = "inertia";
    run();
  };
  sp.addEventListener("pointerup", up);
  sp.addEventListener("pointercancel", up);
});

/* ---- dragging the film itself, for anyone who grabs the strip ---- */
(() => {
  let x0 = 0, id = null;
  const axisPos = (e) => (vertical ? e.clientY : e.clientX);
  runEl.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".gate")) return;
    x0 = axisPos(e); id = e.pointerId;
    runEl.setPointerCapture(id);
    mode = "idle"; vel = 0;
    firstTouch(); douse();
  });
  runEl.addEventListener("pointermove", (e) => {
    if (id === null || e.pointerId !== id) return;
    const dPos = (axisPos(e) - x0) / pitch;
    x0 = axisPos(e);
    advance(dPos);
    vel = vel * 0.55 + dPos * 0.45;
    apply();
  });
  const up = (e) => {
    if (id === null) return;
    try { runEl.releasePointerCapture(id); } catch (_) {}
    id = null; mode = "inertia"; run();
  };
  runEl.addEventListener("pointerup", up);
  runEl.addEventListener("pointercancel", up);
})();

/* ---- keyboard ---- */
runEl.addEventListener("keydown", (e) => {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
  if (step) {
    e.preventDefault();
    firstTouch(); douse();
    target = Math.max(0, Math.min(LAST, Math.round(pos) + step));
    mode = "snap"; run();
  } else if (e.key === "Home") { e.preventDefault(); target = 0; mode = "snap"; run(); }
  else if (e.key === "End")    { e.preventDefault(); target = LAST; mode = "snap"; run(); }
  else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); gateEl.click(); }
});

/* ---- hold the frame up to the lamp: the bench's own disclosure ---- */
gateEl.addEventListener("click", () => {
  firstTouch();
  lit = !lit;
  runEl.classList.toggle("is-lit", lit);
  document.body.classList.toggle("is-lit-page", lit);
  gateEl.setAttribute("aria-pressed", lit ? "true" : "false");
});

/* ---- boot ---- */
function boot() {
  measure();
  apply();
}
boot();
window.addEventListener("resize", () => { measure(); apply(); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); apply(); });

/* ---- verification hook ---- */
window.__bench = {
  get pos() { return pos; },
  get frame() { return Math.round(pos); },
  get title() { return FILMS[Math.round(pos)].t; },
  get lit() { return lit; },
  get rollUnits() {
    return { take: +takeEl.style.getPropertyValue("--roll"), supply: +supplyEl.style.getPropertyValue("--roll") };
  },
  // offsetWidth, not getBoundingClientRect: the roll sits inside a rotating
  // wrapper, and a rotated square's AABB is w*(|cos|+|sin|) — up to 41% too wide.
  get rollPx() {
    const q = (el) => el.querySelector(".spool__roll").offsetWidth;
    return { take: q(takeEl), supply: q(supplyEl) };
  },
  get filmX() { return filmEl.style.getPropertyValue(vertical ? "--y" : "--x"); },
  get axis() { return vertical ? "vertical" : "horizontal"; },
  get rot() { return { take: +rotTake.toFixed(3), supply: +rotSup.toFixed(3) }; },
  wind(to) { advance(to - pos); mode = "idle"; vel = 0; apply(); },
  light(on) { if (on !== lit) gateEl.click(); },
};
