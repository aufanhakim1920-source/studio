/* KOTAK NADA — a hand-cranked music box.
   =========================================================================
   The object: a brass cylinder studded with pins, a steel comb of thirteen
   teeth, and a crank. Drag to turn it. A pin passing a tooth plucks it.

   It is load-bearing: the pins ARE the score. A pin's angle around the
   cylinder is WHEN it sounds; the tooth it sits over is WHICH note. Delete
   the cylinder and the music is gone with it — there is no separate list of
   notes anywhere on the page.

   And it is writable, which is the part that makes it a toy rather than a
   demo: hold the cylinder where you want it, press a tooth, and a pin
   appears at that spot. You are not playing back someone's melody, you are
   re-pinning the barrel.

   No audio files. Every note is synthesised with WebAudio — a fundamental
   plus two inharmonic partials, which is what makes a struck steel comb
   sound like a comb and not like a flute.

   No library. The 3D is a yaw+pitch projection and a painter's algorithm:
   every quad, cap and pin goes into one list, sorted far-to-near, drawn in
   that order. That is why pins on the far side are correctly hidden behind
   the barrel without any occlusion test. */

/* ── geometry, in world units ─────────────────────────────────────────── */
const H     = 1.00;      // cylinder half-length
const R     = 0.34;      // cylinder radius
const PIN   = 0.115;     // how far a pin stands off the surface
const SEG   = 56;        // segments around the barrel
const STEPS = 32;        // pin positions around one revolution
const NT    = 13;        // teeth

const YAW   = 0.30;
const PITCH = 0.78;
const CB = Math.cos(YAW),   SB = Math.sin(YAW);
const CA = Math.cos(PITCH), SA = Math.sin(PITCH);

/* the comb sits on the near side of the barrel, at mid height */
const PLUCK = 1.55;

/* thirteen teeth, C pentatonic over two and a bit octaves. A pentatonic
   comb means any pin the visitor adds is still consonant — you cannot
   write a wrong note, which matters when the whole point is to let people
   re-pin it. */
const FREQ = [
  261.63, 293.66, 329.63, 392.00, 440.00,
  523.25, 587.33, 659.25, 783.99, 880.00,
  1046.50, 1174.66, 1318.51,
];

/* the barrel as it ships. [tooth, step] */
const FACTORY = [
  [5, 0], [0, 0],
  [7, 2],
  [8, 4],
  [7, 6],
  [5, 8], [1, 8],
  [4, 10],
  [3, 12],
  [4, 14],
  [5, 16], [2, 16],
  [8, 18],
  [9, 20],
  [8, 22],
  [7, 24], [1, 24],
  [5, 26],
  [3, 28],
  [5, 30],
];

/* ── state ───────────────────────────────────────────────────────────── */
let pins    = new Set(FACTORY.map(([t, k]) => `${t}:${k}`));
let theta   = 0;          // cylinder rotation, radians, accumulates
let vel     = 0;          // radians per frame while coasting
let dragging = false;
let soundOn = false;
let turns   = 0;
let touched = false;      // has the visitor cranked it at all yet

const lastN = new Map();  // pin key -> last pluck ordinal, for edge detection
const flex  = new Float32Array(NT);   // per-tooth vibration, decays to 0
const toothScreen = [];               // where each tooth landed on screen

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

const $ = (s) => document.querySelector(s);
const canvas = $("#box");
const ctx = canvas.getContext("2d");

/* ── projection ──────────────────────────────────────────────────────── */
let cx = 0, cy = 0, scale = 1;

function project(X, Y, Z) {
  const X1 =  X * CB + Z * SB;
  const Z1 = -X * SB + Z * CB;
  const Y2 =  Y * CA - Z1 * SA;
  const Z2 =  Y * SA + Z1 * CA;      // larger = farther from the eye
  return { x: cx + X1 * scale, y: cy - Y2 * scale, d: Z2 };
}
const surf = (u, phi) => project(u * H, R * Math.cos(phi), R * Math.sin(phi));

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const r = canvas.getBoundingClientRect();
  canvas.width  = Math.round(r.width  * dpr);
  canvas.height = Math.round(r.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // fit the barrel plus its crank and comb into the box
  scale = Math.min(r.width / 3.0, r.height / 1.9);
  cx = r.width / 2 - scale * 0.10;
  cy = r.height / 2 - scale * 0.16;
  layoutTeeth(r);
}

/* ── the comb ────────────────────────────────────────────────────────── */
const toothU = (i) => -0.86 + (1.72 * i) / (NT - 1);

/* Real buttons are positioned over the drawn teeth: the comb stays a canvas
   drawing, but each tooth is keyboard reachable and a thumb can hit it. */
function layoutTeeth(rect) {
  const host = $("#teeth");
  if (!host.children.length) {
    for (let i = 0; i < NT; i++) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tooth-btn";
      b.dataset.t = i;
      b.setAttribute("aria-label", `Tooth ${i + 1} — leave or lift a pin here`);
      b.addEventListener("click", () => togglePin(i));
      host.appendChild(b);
    }
  }
  toothScreen.length = 0;
  [...host.children].forEach((b, i) => {
    const rad = R + 0.24;   // mid-tooth, so the button sits on the drawn tooth
    const p = project(toothU(i) * H, rad * Math.cos(PLUCK), rad * Math.sin(PLUCK));
    toothScreen.push(p);
    b.style.left   = `${p.x}px`;
    b.style.top    = `${Math.max(0, p.y - 22)}px`;
    b.style.width  = `${Math.max(30, (rect.width / NT) * 0.8)}px`;
    b.style.height = `44px`;
  });
}

/* which step is sitting at the comb right now */
function stepAtComb() {
  const k = Math.round(((theta - PLUCK) / (2 * Math.PI)) * STEPS);
  return ((k % STEPS) + STEPS) % STEPS;
}

function togglePin(t) {
  const key = `${t}:${stepAtComb()}`;
  if (pins.has(key)) {
    pins.delete(key);
  } else {
    pins.add(key);
    lastN.set(key, plucksSoFar(t, stepAtComb()));   // do not fire it immediately
    strike(t, 0.9);                                  // but do let them hear it
  }
  readouts();
  say(pins.size ? "" : "Empty barrel. Press a tooth to start pinning.");
}

const plucksSoFar = (t, k) =>
  Math.floor((theta - PLUCK - phaseOf(k)) / (2 * Math.PI));
const phaseOf = (k) => (-2 * Math.PI * k) / STEPS;

/* ── sound ───────────────────────────────────────────────────────────── */
let ac = null, master = null;

function audio() {
  if (ac) { if (ac.state === "suspended") ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 8;
  master = ac.createGain();
  master.gain.value = 0.5;
  master.connect(comp).connect(ac.destination);
}

/* A struck steel tooth: a fundamental with two inharmonic partials that die
   away much faster than it does. Equal-tempered harmonics would sound like
   an organ; 2.76x and 5.40x are roughly where a struck bar actually rings. */
function strike(t, vel = 1) {
  if (!soundOn || !ac) return;
  const f = FREQ[t], now = ac.currentTime;
  const out = ac.createGain();
  out.gain.value = Math.min(1, vel) * 0.34;
  out.connect(master);

  [[1, 1, 1.9], [2.76, 0.30, 0.9], [5.40, 0.11, 0.45]].forEach(([mult, amp, life]) => {
    const o = ac.createOscillator();
    o.type = "sine";
    o.frequency.value = f * mult;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(amp, now + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, now + life);
    o.connect(g).connect(out);
    o.start(now);
    o.stop(now + life + 0.05);
  });
}

/* ── the mechanic: pins passing the comb ─────────────────────────────── */
function checkPlucks() {
  pins.forEach((key) => {
    const [t, k] = key.split(":").map(Number);
    const n = Math.floor((theta - PLUCK - phaseOf(k)) / (2 * Math.PI));
    const prev = lastN.get(key);
    if (prev === undefined) { lastN.set(key, n); return; }
    if (n !== prev) {
      lastN.set(key, n);
      const v = Math.min(1, 0.42 + Math.abs(vel) * 26);
      flex[t] = 1;
      strike(t, v);
    }
  });
}

/* ── drawing ─────────────────────────────────────────────────────────── */
const LIGHT = -1.05;                 // where the highlight sits on the barrel

function brass(lit) {
  // lit in 0..1 -> dark bronze to bright brass
  const a = [0x5E, 0x49, 0x14], b = [0xF2, 0xD8, 0x86];
  const m = (i) => Math.round(a[i] + (b[i] - a[i]) * lit);
  return `rgb(${m(0)},${m(1)},${m(2)})`;
}

function draw() {
  const w = canvas.getBoundingClientRect().width;
  const h = canvas.getBoundingClientRect().height;
  ctx.clearRect(0, 0, w, h);

  const items = [];

  /* bed plate under the barrel */
  {
    const y = -R - 0.13;
    const q = [
      project(-H - 0.16, y, -0.34), project(H + 0.20, y, -0.34),
      project(H + 0.20, y, 0.34),  project(-H - 0.16, y, 0.34),
    ];
    items.push({ d: 9e9, run: () => {
      ctx.beginPath();
      q.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      const g = ctx.createLinearGradient(0, q[0].y, 0, q[2].y);
      g.addColorStop(0, "#0E3238"); g.addColorStop(1, "#071E21");
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = "rgba(201,162,39,.22)"; ctx.lineWidth = 1; ctx.stroke();
    }});
  }

  /* barrel surface, one quad per segment */
  for (let j = 0; j < SEG; j++) {
    const p0 = (j / SEG) * Math.PI * 2 + theta;
    const p1 = ((j + 1) / SEG) * Math.PI * 2 + theta;
    const a = surf(-1, p0), b = surf(1, p0), c = surf(1, p1), d = surf(-1, p1);
    const mid = (p0 + p1) / 2;
    const lit = Math.max(0, Math.cos(mid - LIGHT)) ** 1.6;
    const col = brass(0.10 + lit * 0.9);
    const dep = (a.d + b.d + c.d + d.d) / 4;
    items.push({ d: dep, run: () => {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y);
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.fill();
      // hairline along the quad kills the seams between neighbours
      ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.stroke();
    }});
  }

  /* the two end caps */
  [-1, 1].forEach((side) => {
    const pts = [];
    for (let j = 0; j <= 28; j++) {
      const a = (j / 28) * Math.PI * 2 + theta;
      pts.push(project(side * H, R * Math.cos(a), R * Math.sin(a)));
    }
    const dep = pts.reduce((s, p) => s + p.d, 0) / pts.length;
    items.push({ d: dep, run: () => {
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      ctx.fillStyle = side > 0 ? "#8A6E18" : "#6B540F";
      ctx.fill();
      ctx.strokeStyle = "rgba(242,216,134,.5)"; ctx.lineWidth = 1.2; ctx.stroke();
    }});
  });

  /* the pins. Depth is taken at the base so a pin sorts immediately after
     the piece of barrel it is standing on — which is what hides the ones
     on the far side. */
  pins.forEach((key) => {
    const [t, k] = key.split(":").map(Number);
    const a = phaseOf(k) + theta;
    const u = toothU(t);
    const base = surf(u, a);
    const tip = project(u * H, (R + PIN) * Math.cos(a), (R + PIN) * Math.sin(a));
    const lit = Math.max(0, Math.cos(a - LIGHT));
    items.push({ d: base.d - 0.001, run: () => {
      ctx.beginPath();
      ctx.moveTo(base.x, base.y); ctx.lineTo(tip.x, tip.y);
      ctx.lineCap = "round";
      ctx.lineWidth = Math.max(2.2, scale * 0.019);
      ctx.strokeStyle = `rgba(20,12,4,.55)`;
      ctx.stroke();
      ctx.lineWidth = Math.max(1.4, scale * 0.012);
      ctx.strokeStyle = brass(0.45 + lit * 0.55);
      ctx.stroke();
    }});
  });

  items.sort((p, q) => q.d - p.d);
  items.forEach((it) => it.run());

  drawComb();
  drawCrank();
}

/* The comb: thirteen teeth pointing straight at the barrel along the radius
   at PLUCK, which is how a real one is mounted — the tooth tip sits a hair
   off the surface so a passing pin catches it. Built in the radial frame
   (out = towards the barrel, side = along the axis) so it stays glued to the
   cylinder no matter how the camera is angled. */
function drawComb() {
  const cP = Math.cos(PLUCK), sP = Math.sin(PLUCK);
  // a point at axial u, radius rad, nudged sideways along the tooth by n
  const P = (u, rad, n = 0) =>
    project(u * H, rad * cP - n * sP, rad * sP + n * cP);

  const rTip = R + 0.045;         // just off the barrel
  const rRoot = R + 0.44;         // where the teeth are clamped
  const rBar = R + 0.60;

  // the clamping bar
  const b = [P(-1.02, rRoot), P(1.02, rRoot), P(1.02, rBar), P(-1.02, rBar)];
  ctx.beginPath();
  b.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  const g = ctx.createLinearGradient(b[0].x, b[0].y, b[3].x, b[3].y);
  g.addColorStop(0, "#8E9EA2"); g.addColorStop(1, "#41504F");
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = "rgba(8,24,26,.6)"; ctx.lineWidth = 1; ctx.stroke();

  for (let i = 0; i < NT; i++) {
    const u = toothU(i);
    const half = 0.028;
    // a struck tooth swings sideways in its own plane and rings down
    const dn = flex[i] * 0.045 * Math.sin(performance.now() / 24 + i * 1.7);

    const t1 = P(u - half, rTip, dn), t2 = P(u + half, rTip, dn);
    const t3 = P(u + half, rRoot),    t4 = P(u - half, rRoot);
    ctx.beginPath();
    [t1, t2, t3, t4].forEach((p, j) => (j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    const gg = ctx.createLinearGradient(t1.x, t1.y, t4.x, t4.y);
    gg.addColorStop(0, flex[i] > 0.03 ? "#FFCFBE" : "#DCE7E9");
    gg.addColorStop(1, "#5E6E71");
    ctx.fillStyle = gg; ctx.fill();
    ctx.strokeStyle = "rgba(8,24,26,.5)"; ctx.lineWidth = 1; ctx.stroke();
  }
}

function drawCrank() {
  const X = H + 0.30;
  const hub = project(X, 0, 0);
  const arm = project(X, 0.20 * Math.cos(theta), 0.20 * Math.sin(theta));

  const shaftA = project(H, 0, 0);
  ctx.beginPath();
  ctx.moveTo(shaftA.x, shaftA.y); ctx.lineTo(hub.x, hub.y);
  ctx.lineWidth = Math.max(3, scale * 0.035);
  ctx.lineCap = "round";
  ctx.strokeStyle = "#7C6414";
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(hub.x, hub.y); ctx.lineTo(arm.x, arm.y);
  ctx.lineWidth = Math.max(3, scale * 0.030);
  ctx.strokeStyle = "#C9A227";
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(arm.x, arm.y, Math.max(5, scale * 0.045), 0, Math.PI * 2);
  const g = ctx.createRadialGradient(arm.x - 3, arm.y - 3, 1, arm.x, arm.y, Math.max(6, scale * 0.05));
  g.addColorStop(0, "#F2D886"); g.addColorStop(1, "#8A6E18");
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = "rgba(8,24,26,.5)"; ctx.lineWidth = 1; ctx.stroke();
}

/* ── loop ────────────────────────────────────────────────────────────── */
function frame() {
  if (!dragging && Math.abs(vel) > 1e-5) {
    theta += vel;
    vel *= REDUCED ? 0.90 : 0.972;      // coast, then friction takes it
    if (Math.abs(vel) < 1e-5) vel = 0;
    checkPlucks();
  }
  for (let i = 0; i < NT; i++) flex[i] *= 0.86;

  const t = Math.floor(Math.abs(theta) / (Math.PI * 2));
  if (t !== turns) { turns = t; readouts(); }

  draw();
  requestAnimationFrame(frame);
}

/* ── input ───────────────────────────────────────────────────────────── */
const stage = $("#stage");
let lastX = 0;
const K = 0.011;                      // radians per pixel dragged

stage.addEventListener("pointerdown", (e) => {
  if (e.target.closest(".tooth-btn")) return;   // pressing a tooth is not a drag
  dragging = true; lastX = e.clientX; vel = 0;
  stage.classList.add("dragging");
  try { stage.setPointerCapture(e.pointerId); } catch {}
  audio();
});

stage.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastX;
  lastX = e.clientX;
  theta += dx * K;
  vel = vel * 0.5 + dx * K * 0.5;     // smoothed, so the throw feels weighted
  checkPlucks();
  if (!touched && Math.abs(dx) > 2) {
    touched = true;
    say("Now hold it somewhere and press a tooth — that leaves a pin.");
  }
});

const endDrag = () => {
  if (!dragging) return;
  dragging = false;
  stage.classList.remove("dragging");
};
stage.addEventListener("pointerup", endDrag);
stage.addEventListener("pointercancel", endDrag);

/* keyboard: the barrel is draggable, so it needs a non-pointer route too */
stage.tabIndex = 0;
stage.addEventListener("keydown", (e) => {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  e.preventDefault();
  audio();
  theta += (e.key === "ArrowRight" ? 1 : -1) * (Math.PI * 2) / STEPS;
  checkPlucks();
});

/* ── chrome ──────────────────────────────────────────────────────────── */
function readouts() {
  $("#rPins").textContent = pins.size;
  $("#rTurns").textContent = turns;
}
let sayTimer = null;
function say(msg) {
  const el = $("#hint");
  clearTimeout(sayTimer);
  if (!msg) { el.textContent = ""; return; }
  el.textContent = msg;
  el.classList.add("done");
  sayTimer = setTimeout(() => el.classList.remove("done"), 2200);
}

$("#bSound").addEventListener("click", (e) => {
  soundOn = !soundOn;
  const b = e.currentTarget;
  b.setAttribute("aria-pressed", String(soundOn));
  b.innerHTML = `SOUND&nbsp;<b>${soundOn ? "ON" : "OFF"}</b>`;
  if (soundOn) { audio(); strike(5, 0.7); }
});

$("#bReset").addEventListener("click", () => {
  pins = new Set(FACTORY.map(([t, k]) => `${t}:${k}`));
  lastN.clear();
  readouts();
  say("Factory barrel restored.");
});

$("#bClear").addEventListener("click", () => {
  pins.clear();
  lastN.clear();
  readouts();
  say("Bare barrel. Press a tooth to leave a pin.");
});

window.addEventListener("resize", resize);
resize();
readouts();
frame();
