/* ═══════════════════════════════════════════════════════════════════════════
   THE SOLID — hand-rolled 3D, no library.

   Pipeline (Template 09 [[Hand Rolled 3D Wireframe]], extended from a stroked
   wireframe to a FILLED solid):
     1. geometry is a vertex list; faces are ordered vertex rings
     2. rotation = two 2D rotations, yaw about Y then pitch about X
     3. projection = one divide,  s = F / (F + z)
     4. painter's algorithm — sort faces by centroid z, far first
     5. per-face Lambert term takes the place of the wireframe's `heavy`
        depth-fade multiplier: it is what stops the object reading as noise
     6. ghost layers: the whole outline set drawn twice more, offset and faint

   Nothing animates unless the visitor causes it. requestAnimationFrame is only
   scheduled while something is genuinely in flight and stops dead on settle.
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';

/* ── vector helpers ────────────────────────────────────────────────────── */
const add   = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul   = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot   = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0]];
const len   = (a) => Math.hypot(a[0], a[1], a[2]);
const norm  = (a) => { const l = len(a) || 1; return [a[0]/l, a[1]/l, a[2]/l]; };
const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;

/* ── 1 · geometry: a regular dodecahedron, then stood on a face ─────────── */
function buildDodecahedron() {
  const P = (1 + Math.sqrt(5)) / 2, I = 1 / P;

  const verts = [];
  for (const a of [1, -1]) for (const b of [1, -1]) for (const c of [1, -1]) verts.push([a, b, c]);
  for (const a of [1, -1]) for (const b of [1, -1]) {
    verts.push([0, a * I, b * P]);
    verts.push([a * I, b * P, 0]);
    verts.push([a * P, 0, b * I]);
  }
  // The 12 face normals are the vertices of the DUAL icosahedron — and the
  // cyclic set matters: (0,±phi,±1) & permutations, NOT (0,±1,±phi). Get that
  // backwards and every "face" collects one vertex instead of five, which still
  // renders something, just not a solid. Verified in node before drawing.
  const dirs = [];
  for (const a of [1, -1]) for (const b of [1, -1]) {
    dirs.push([0, a * P, b]);
    dirs.push([a * P, b, 0]);
    dirs.push([a, 0, b * P]);
  }

  let faces = dirs.map((d) => {
    const n = norm(d);
    let max = -1e9;
    for (const v of verts) max = Math.max(max, dot(v, n));
    const ring = verts.filter((v) => dot(v, n) > max - 1e-6);          // exactly 5
    // order them around the normal so the polygon is not a star
    const e1 = norm(cross(Math.abs(n[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0], n));
    const e2 = cross(n, e1);
    ring.sort((p, q) => Math.atan2(dot(p, e2), dot(p, e1)) - Math.atan2(dot(q, e2), dot(q, e1)));
    const c = ring.reduce(add, [0, 0, 0]).map((x) => x / ring.length);
    return { n, v: ring, c };
  });

  // Stand it on a face. NOTE the target is (0,-1,0), not (0,+1,0): canvas Y
  // grows DOWNWARD, so aligning the cap to +Y puts the "top" pole at the bottom
  // of the screen and silently inverts the whole shipped-up / unfinished-down
  // idea the layout is built on. Caught in the first screenshot.
  const top = faces.reduce((a, b) => (b.n[1] > a.n[1] ? b : a));
  const R = alignRotation(top.n, [0, -1, 0]);
  faces = faces.map((f) => ({ n: R(f.n), v: f.v.map(R), c: R(f.c) }));

  // order: [north cap, upper ring by azimuth, lower ring by azimuth, south cap]
  const azi = (n) => { const a = Math.atan2(n[0], -n[2]); return a < 0 ? a + Math.PI * 2 : a; };
  const cap = (s) => faces.filter((f) => f.n[1] * s > 0.9);
  const ring = (s) => faces.filter((f) => f.n[1] * s > 0.1 && f.n[1] * s < 0.9)
                           .sort((a, b) => azi(a.n) - azi(b.n));
  return [...cap(-1), ...ring(-1), ...ring(1), ...cap(1)];
}

/* Rodrigues: the rotation taking unit a onto unit b, as a closure. */
function alignRotation(a, b) {
  const v = cross(a, b), c = dot(a, b);
  if (c > 0.999999) return (p) => p.slice();
  if (c < -0.999999) {
    const ax = norm(cross(a, Math.abs(a[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]));
    return (p) => add(mul(ax, 2 * dot(ax, p)), mul(p, -1));           // 180° about ax
  }
  const k = 1 / (1 + c);
  const m = [
    [v[0]*v[0]*k + c,     v[0]*v[1]*k - v[2], v[0]*v[2]*k + v[1]],
    [v[1]*v[0]*k + v[2],  v[1]*v[1]*k + c,    v[1]*v[2]*k - v[0]],
    [v[2]*v[0]*k - v[1],  v[2]*v[1]*k + v[0], v[2]*v[2]*k + c   ],
  ];
  return (p) => [
    m[0][0]*p[0] + m[0][1]*p[1] + m[0][2]*p[2],
    m[1][0]*p[0] + m[1][1]*p[1] + m[1][2]*p[2],
    m[2][0]*p[0] + m[2][1]*p[1] + m[2][2]*p[2],
  ];
}

const FACES = buildDodecahedron();

/* facet 00 = who · 01–05 upper ring, shipped · 06–10 lower ring, in build · 11 = contact */
const TIER = ['cap', 'live', 'live', 'live', 'play', 'live',
              'build', 'build', 'build', 'build', 'build', 'cap'];
const BASE = {                     // one material, three states of finish
  live:  { h: 42, s: 64, l: 54 },
  play:  { h: 33, s: 58, l: 46 },
  build: { h: 26, s: 34, l: 35 },
  cap:   { h: 44, s: 16, l: 76 },
};
const SIGNAL = { h: 10, s: 100, l: 58 };            // vermilion — the one signal
const LIGHT = norm([-0.42, -0.74, -0.52]);          // up, left, slightly toward us

/* ── 2 · rotation + 3 · projection ─────────────────────────────────────── */
function turn(p, yaw, pitch) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const x = p[0] * cy + p[2] * sy;
  const z = -p[0] * sy + p[2] * cy;
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  return [x, p[1] * cp - z * sp, p[1] * sp + z * cp];
}

/* the yaw/pitch that bring a face normal to face the camera (-Z). */
function poseForNormal(n) {
  const r = Math.hypot(n[0], n[2]);
  return { yaw: Math.atan2(n[0], -n[2]), pitch: Math.atan2(-n[1], r) };
}

/* ═══════════════ the solid ═══════════════ */
const canvas = document.getElementById('solid');
const ctx = canvas.getContext('2d');
const svg = document.getElementById('callouts');
const dpr = Math.min(window.devicePixelRatio || 1, 2);

const PITCH_LIM = Math.PI / 2 + 0.42;
const BIAS_Y = 0.30, BIAS_P = -0.16;   // never rest perfectly flat-on: keep it 3/4

let yaw = 0, pitch = 0, vYaw = 0, vPitch = 0;
let target = null, settledOn = -1, dragging = false, raf = null;
let W = 0, H = 0, S = 1, F = 1;
let hitFaces = [], frontFace = 1, shownFace = -1;

function poseFor(i) {
  const p = poseForNormal(FACES[i].n);
  let ty = p.yaw + BIAS_Y;
  while (ty - yaw >  Math.PI) ty -= Math.PI * 2;
  while (ty - yaw < -Math.PI) ty += Math.PI * 2;
  return { yaw: ty, pitch: clamp(p.pitch + BIAS_P, -PITCH_LIM, PITCH_LIM) };
}
function nearestFace() {
  let best = 0, bz = 2;
  for (let i = 0; i < FACES.length; i++) {
    const z = turn(FACES[i].n, yaw, pitch)[2];
    if (z < bz) { bz = z; best = i; }
  }
  return best;
}

function sizeSolid() {
  W = canvas.clientWidth || 800;
  H = canvas.clientHeight || 620;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  // scaled up 2026-08-24: the stage grew and the object should own it.
  S = Math.min(H * 0.27, W * (W < 700 ? 0.25 : 0.235));   // model units -> px
  F = S * 7.6;                          // the lens: F/circumradius ~ 4.4, per template 09
  // deliberately NO viewBox. With one, the SVG's user units are rescaled by
  // preserveAspectRatio whenever the element box stops matching it — and the
  // element box is a percentage of .object, which changes the moment anything
  // swaps the canvas out (the full-page screenshotter flattens canvases to
  // inline <img>, which is exactly that). Without a viewBox, 1 user unit is
  // 1 CSS px from the element's own top-left, whatever happens around it.
  svg.style.width = W + 'px';
  svg.style.height = H + 'px';
}

const project = (p, cx, cy) => { const s = F / (F + p[2]); return { x: p[0] * s + cx, y: p[1] * s + cy, s }; };

function drawSolid() {
  // Never paint into a detached tree. A pending rAF can land after something has
  // swapped the canvas out (a screenshotter flattening canvases to <img>, a
  // framework re-render); getBoundingClientRect() then returns all zeros and the
  // callout maths silently emits page-absolute coordinates into a live clone,
  // which draws lines across the whole document. Cost me a wrong diagnosis.
  if (!canvas.isConnected) return;
  const cx = W / 2, cy = H / 2;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.lineJoin = 'round';

  const fs = FACES.map((f, i) => {
    const n = turn(f.n, yaw, pitch);
    const c3 = turn(mul(f.c, S), yaw, pitch);
    const pts3 = f.v.map((v) => turn(mul(v, S), yaw, pitch));
    return { i, n, c3, pts: pts3.map((p) => project(p, cx, cy)), z: c3[2], facing: -n[2] };
  });
  fs.sort((a, b) => b.z - a.z);                        // 4 · painter's algorithm

  const path = (f, oy) => {
    ctx.beginPath();
    f.pts.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y + oy) : ctx.moveTo(p.x, p.y + oy)));
    ctx.closePath();
  };

  /* 6 · ghost layers — the whole outline set twice more, offset and faint */
  for (const g of [{ o: 46, a: 0.05 }, { o: 22, a: 0.10 }]) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(233,192,112,${g.a})`;
    for (const f of fs) { path(f, g.o); ctx.stroke(); }
  }

  const front = fs.reduce((a, b) => (b.facing > a.facing ? b : a));
  frontFace = front.i;
  // sync BEFORE the callouts: they measure the label's box, and a label whose
  // text is one frame stale is a different width, so the run starts in mid-air.
  if (shownFace !== frontFace) { shownFace = frontFace; syncDossier(frontFace); }

  hitFaces = [];
  for (const f of fs) {
    const isFront = f.i === front.i;

    if (f.facing <= 0.02) {                            // 5 · far side: structure only
      path(f, 0);
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(196,146,60,${0.06 + 0.10 * (1 + f.n[2]) / 2})`;
      ctx.stroke();
      continue;
    }

    const lam = Math.max(0, dot(f.n, LIGHT));
    const b = isFront ? SIGNAL : BASE[TIER[f.i]];
    const light = clamp(b.l * (0.38 + 0.90 * lam), 5, 92);
    const sat = b.s * (0.70 + 0.30 * f.facing);

    path(f, 0);
    ctx.fillStyle = `hsla(${b.h}, ${sat}%, ${light}%, ${0.90 + 0.08 * f.facing})`;
    ctx.fill();

    // rim: bright on the lit side, and the front facet gets the signal
    ctx.lineWidth = isFront ? 2 : 1;
    ctx.strokeStyle = isFront
      ? 'rgba(255,120,86,.95)'
      : `hsla(${b.h}, ${Math.min(90, sat + 14)}%, ${clamp(light + 22, 12, 96)}%, ${0.35 + 0.5 * f.facing})`;
    ctx.stroke();

    // 0.32, not 0.18: below that the facet is oblique enough that its in-plane
    // basis foreshortens the numeral into an unreadable smear lying on its side.
    if (f.facing > 0.32) engrave(f, light, cx, cy);
    hitFaces.push(f);
  }
  hitFaces.reverse();                                  // nearest first for hit-testing

  drawCallouts(front, cx, cy);
}

/* the facet number, pasted INTO the plane of the face.
   the affine comes from projecting the face's own in-plane basis, so the
   numerals foreshorten with the facet instead of floating above it. */
function engrave(f, light, cx, cy) {
  const n = f.n;
  const r = Math.hypot(n[0], n[2]);
  if (r < 0.06) return;                                 // face is edge-on to the camera
  const e1 = norm(cross([0, -1, 0], n));                // screen-horizontal in plane
  const e2 = norm(cross(e1, n));                        // screen-down in plane (unmirrored)
  const K = S * 0.5;
  const A = project(f.c3, cx, cy);
  const B = project(add(f.c3, mul(e1, K)), cx, cy);
  const C = project(add(f.c3, mul(e2, K)), cx, cy);
  const ux = (B.x - A.x) / K, uy = (B.y - A.y) / K;
  const vx = (C.x - A.x) / K, vy = (C.y - A.y) / K;

  const label = String(f.i).padStart(2, '0');
  const ink = light > 44 ? 'rgba(12,30,20,' : 'rgba(239,233,217,';
  const alpha = clamp((f.facing - 0.30) * 2.6, 0, 1);

  ctx.save();
  ctx.setTransform(dpr * ux, dpr * uy, dpr * vx, dpr * vy, dpr * A.x, dpr * A.y);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${S * 0.54}px "Instrument Serif", Georgia, serif`;
  ctx.fillStyle = `rgba(0,0,0,${alpha * 0.30})`;
  ctx.fillText(label, 0, S * 0.022);
  ctx.fillStyle = ink + (alpha * 0.85) + ')';
  ctx.fillText(label, 0, 0);
  ctx.restore();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/* ── HUD callouts: horizontal run out of the label, THEN the diagonal ──── */
const el = (id) => document.getElementById(id);
function drawCallouts(front, cx, cy) {
  if (window.innerWidth <= 1180) return;
  const box = canvas.getBoundingClientRect();
  const put = (pathId, diaId, labelEl, side, ax, ay) => {
    const r = labelEl.getBoundingClientRect();
    const lx = (side > 0 ? r.left : r.right) - box.left;
    const ly = r.top + r.height / 2 - box.top;
    const mx = lx + (side > 0 ? -30 : 30);
    el(pathId).setAttribute('d', `M ${lx} ${ly} L ${mx} ${ly} L ${ax} ${ay}`);
    const d = el(diaId);
    d.setAttribute('x', ax - 3.5); d.setAttribute('y', ay - 3.5);
    d.setAttribute('transform', `rotate(45 ${ax} ${ay})`);
  };
  // anchor on the facet's own CORNERS, not its centre — a diamond dropped on the
  // centroid lands squarely on the engraved numeral and reads as a blemish.
  const right = front.pts.reduce((a, b) => (b.x > a.x ? b : a));
  const left  = front.pts.reduce((a, b) => (b.x < a.x ? b : a));
  put('co-a', 'dia-a', el('dossier-hd'), 1, right.x, right.y);
  put('co-b', 'dia-b', el('tag-b'), -1, left.x, left.y);
}
/* what the callout maths actually saw, for headless verification */
window.__callout = () => {
  const box = canvas.getBoundingClientRect();
  const r = (id) => { const b = el(id).getBoundingClientRect();
    return [Math.round(b.left - box.left), Math.round(b.top - box.top), Math.round(b.width), Math.round(b.height)]; };
  return { canvasBox: [Math.round(box.width), Math.round(box.height)], W, H,
           svg: r('callouts'), hd: r('dossier-hd'), tag: r('tag-b'),
           a: el('co-a').getAttribute('d'), b: el('co-b').getAttribute('d') };
};

/* ── DOM sync ──────────────────────────────────────────────────────────── */
function syncDossier(i) {
  // the facet counter replaced a twelve-row text index; it is the only
  // orientation aid left, so it must track every front-face change
  const fc = document.getElementById("fcNow");
  if (fc) fc.textContent = String(i).padStart(2, "0");

  document.querySelectorAll('.dos').forEach((d) => d.classList.toggle('is-on', +d.dataset.face === i));
  document.querySelectorAll('.idx').forEach((b) => b.classList.toggle('is-on', +b.dataset.face === i));
  el('tag-num').textContent = String(i).padStart(2, '0');
  el('tag-sub').innerHTML = i === 0 ? 'north pole' : i === 11 ? 'south pole'
                            : i <= 5 ? 'upper ring &middot; shipped' : 'lower ring &middot; in build';
}

/* ── the loop: only alive while something is genuinely moving ───────────── */
function frame() { if (!raf) raf = requestAnimationFrame(tick); }
function tick() { raf = null; const alive = advance(); drawSolid(); if (alive) frame(); }

function advance() {
  if (dragging) return true;
  if (target) {
    const dy = target.yaw - yaw, dp = target.pitch - pitch;
    if (Math.abs(dy) < 0.0009 && Math.abs(dp) < 0.0009) {
      yaw = target.yaw; pitch = target.pitch; target = null; settledOn = nearestFace();
      return false;
    }
    yaw += dy * 0.16; pitch += dp * 0.16;
    return true;
  }
  if (Math.abs(vYaw) > 0.0013 || Math.abs(vPitch) > 0.0013) {
    yaw += vYaw; pitch = clamp(pitch + vPitch, -PITCH_LIM, PITCH_LIM);
    vYaw *= 0.905; vPitch *= 0.905;
    return true;
  }
  vYaw = vPitch = 0;
  const n = nearestFace();
  if (settledOn === n) return false;                    // already resting on it
  target = poseFor(n);
  return true;
}

function selectFace(i, animate = true) {
  settledOn = -1; vYaw = vPitch = 0;
  const p = poseFor(i);
  if (animate) { target = p; frame(); }
  else { yaw = p.yaw; pitch = p.pitch; target = null; settledOn = i; drawSolid(); }
}

/* ── pointer: drag to turn ─────────────────────────────────────────────── */
let px = 0, py = 0, travelled = 0;
const TURN = 0.0088;

canvas.addEventListener('pointerdown', (e) => {
  dragging = true; settledOn = -1; target = null; vYaw = vPitch = 0; travelled = 0;
  px = e.clientX; py = e.clientY;
  try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  frame();
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const dx = e.clientX - px, dy = e.clientY - py;
  px = e.clientX; py = e.clientY;
  travelled += Math.abs(dx) + Math.abs(dy);
  yaw -= dx * TURN;
  pitch = clamp(pitch + dy * TURN, -PITCH_LIM, PITCH_LIM);
  vYaw = -dx * TURN; vPitch = dy * TURN;
  frame();
});
function endDrag(e) {
  if (!dragging) return;
  dragging = false;
  if (travelled < 6) pick(e);
  frame();
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

function pick(e) {
  const b = canvas.getBoundingClientRect();
  const x = e.clientX - b.left, y = e.clientY - b.top;
  for (const f of hitFaces) if (inPoly(x, y, f.pts)) { selectFace(f.i); return; }
}
function inPoly(x, y, pts) {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], c = pts[j];
    if ((a.y > y) !== (c.y > y) && x < ((c.x - a.x) * (y - a.y)) / (c.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

/* ── keyboard ──────────────────────────────────────────────────────────── */
canvas.addEventListener('keydown', (e) => {
  const c = shownFace < 0 ? 1 : shownFace;
  let next = null;
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    const d = e.key === 'ArrowRight' ? 1 : -1;
    if (c >= 1 && c <= 5) next = 1 + ((c - 1 + d + 5) % 5);
    else if (c >= 6 && c <= 10) next = 6 + ((c - 6 + d + 5) % 5);
    else next = c === 0 ? 1 : 6;
  } else if (e.key === 'ArrowUp') {
    next = c === 11 ? 8 : c >= 6 ? c - 5 : 0;
  } else if (e.key === 'ArrowDown') {
    next = c === 0 ? 3 : c <= 5 ? c + 5 : 11;
  }
  if (next !== null) { e.preventDefault(); selectFace(next); }
});
document.querySelectorAll('.idx').forEach((b) => {
  b.addEventListener('click', () => selectFace(+b.dataset.face));
});
el('to-contact').addEventListener('click', () => {
  document.getElementById('stage').scrollIntoView({ behavior: 'smooth', block: 'center' });
  selectFace(11);
});

/* ═══════════════ the drum — nine photographs on a cylinder ═══════════════ */
const drum = document.getElementById('drum');
const dctx = drum.getContext('2d');
const PHOTOS = [
  { src: 'assets/coffee.jpg',    focus: 0.42 },
  { src: 'assets/codebrew.jpg',  focus: 0.40 },
  { src: 'assets/wyf.jpg',       focus: 0.36 },
  { src: 'assets/cleanup.jpg',   focus: 0.46 },
  { src: 'assets/orphanage.jpg', focus: 0.42 },
  // an Instagram screenshot, 914x1600: the post graphic occupies y 133..1028.
  // trim to exactly that or the panel shows the like bar and the caption text.
  { src: 'assets/water.jpg',     focus: 0.50, trim: [0.085, 0.355] },
  { src: 'assets/oweek.jpg',     focus: 0.38 },
  { src: 'assets/gym.jpg',       focus: 0.38 },
  { src: 'assets/athletic.jpg',  focus: 0.40 },
];
const NP = PHOTOS.length, STEP = (Math.PI * 2) / NP, STRIPS = 46;
let spin = 0, vSpin = 0, dTarget = null, dDrag = false, dRaf = null, dSettled = -1;
let DW = 0, DH = 0, PW = 0, PH = 0, RAD = 0, FD = 1, shownPanel = -1;

PHOTOS.forEach((p) => {
  const img = new Image();
  img.decoding = 'sync';
  img.onload = () => { p.img = img; drawDrum(); };
  img.src = p.src;
});

function sizeDrum() {
  DW = drum.clientWidth || 1200;
  DH = drum.clientHeight || 440;
  drum.width = Math.round(DW * dpr);
  drum.height = Math.round(DH * dpr);
  PH = DH * 0.56;
  PW = PH / 1.25;
  RAD = PW / (2 * Math.sin(Math.PI / NP) * 0.88);
  FD = RAD * 2.75;
}

function panelIndex() { return ((Math.round(-spin / STEP) % NP) + NP) % NP; }

function drawDrum() {
  if (!drum.isConnected) return;
  const cx = DW / 2, cy = DH / 2;
  dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  dctx.clearRect(0, 0, DW, DH);

  const front = panelIndex();
  const order = [];
  for (let i = 0; i < NP; i++) {
    const a = i * STEP + spin;
    const c = Math.cos(a);
    if (c <= 0.03) continue;                             // outward normal points away
    order.push({ i, a, c, z: -RAD * c });
  }
  order.sort((p, q) => q.z - p.z);                       // painter's algorithm again

  for (const p of order) drawPanel(p, cx, cy, p.i === front);

  if (shownPanel !== front) {
    shownPanel = front;
    document.querySelectorAll('.cap').forEach((f) => f.classList.toggle('is-on', +f.dataset.panel === front));
  }
}

function drawPanel(p, cx, cy, isFront) {
  const ph = PHOTOS[p.i];
  const s = Math.sin(p.a), c = p.c;
  const centre = [RAD * s, 0, -RAD * c];
  const t = [c, 0, s];
  const half = PW / 2;

  const endScale = (u) => FD / (FD + centre[2] + t[2] * u);
  const endX = (u, sc) => (centre[0] + t[0] * u) * sc + cx;
  const sL = endScale(-half), sR = endScale(half);
  const xL = endX(-half, sL), xR = endX(half, sR);
  const quad = [
    [xL, cy - PH * sL / 2], [xR, cy - PH * sR / 2],
    [xR, cy + PH * sR / 2], [xL, cy + PH * sL / 2],
  ];
  const frontScale = FD / (FD - RAD);

  if (ph.img) {
    const iw = ph.img.naturalWidth, ih = ph.img.naturalHeight;
    const tr = ph.trim || [0, 0];
    const y0 = ih * tr[0], avail = ih * (1 - tr[0] - tr[1]);
    const want = PH / PW;                                // target h/w
    let sw, sh;
    if (iw / avail > 1 / want) { sh = avail; sw = sh / want; } else { sw = iw; sh = sw * want; }
    const sx = (iw - sw) / 2;
    const sy = y0 + clamp(ph.focus * avail - sh / 2, 0, avail - sh);

    dctx.save();
    dctx.beginPath();
    quad.forEach((q, k) => (k ? dctx.lineTo(q[0], q[1]) : dctx.moveTo(q[0], q[1])));
    dctx.closePath();
    dctx.clip();
    // vertical-strip texture mapping: each strip gets its own perspective scale
    for (let j = 0; j < STRIPS; j++) {
      const u0 = -half + (PW * j) / STRIPS, u1 = u0 + PW / STRIPS;
      const s0 = endScale(u0), s1 = endScale(u1);
      const x0 = endX(u0, s0), x1 = endX(u1, s1);
      const sm = (s0 + s1) / 2, dh = PH * sm;
      dctx.drawImage(ph.img, sx + (sw * j) / STRIPS, sy, sw / STRIPS, sh,
                     Math.min(x0, x1), cy - dh / 2, Math.abs(x1 - x0) + 0.8, dh);
    }
    // cylindrical shading + depth, in one gradient across the panel
    const g = dctx.createLinearGradient(xL, 0, xR, 0);
    const a = (sc) => clamp(1 - sc / frontScale, 0, 1) * 1.55;
    g.addColorStop(0, `rgba(8,22,15,${clamp(a(sL), 0, 0.8)})`);
    g.addColorStop(1, `rgba(8,22,15,${clamp(a(sR), 0, 0.8)})`);
    dctx.fillStyle = g;
    dctx.fillRect(Math.min(xL, xR) - 2, 0, Math.abs(xR - xL) + 4, DH);
    // one grade so nine mixed-source photographs read as one set
    dctx.globalCompositeOperation = 'overlay';
    dctx.fillStyle = 'rgba(196,146,60,.16)';
    dctx.fillRect(Math.min(xL, xR) - 2, 0, Math.abs(xR - xL) + 4, DH);
    dctx.globalCompositeOperation = 'source-over';
    dctx.restore();
  }

  dctx.beginPath();
  quad.forEach((q, k) => (k ? dctx.lineTo(q[0], q[1]) : dctx.moveTo(q[0], q[1])));
  dctx.closePath();
  dctx.lineWidth = isFront ? 2 : 1;
  dctx.strokeStyle = isFront ? 'rgba(255,75,43,.95)' : `rgba(196,146,60,${0.16 + 0.34 * c})`;
  dctx.stroke();

  if (isFront) {
    dctx.font = '500 11px "JetBrains Mono", monospace';
    dctx.fillStyle = 'rgba(233,192,112,.9)';
    dctx.textAlign = 'left';
    dctx.fillText(`${String(p.i + 1).padStart(2, '0')} / ${NP}`, quad[3][0] + 2, quad[3][1] + 18);
  }
}

function dFrame() { if (!dRaf) dRaf = requestAnimationFrame(dTick); }
function dTick() { dRaf = null; const alive = dAdvance(); drawDrum(); if (alive) dFrame(); }
function dAdvance() {
  if (dDrag) return true;
  if (dTarget !== null) {
    const d = dTarget - spin;
    if (Math.abs(d) < 0.0008) { spin = dTarget; dTarget = null; dSettled = panelIndex(); return false; }
    spin += d * 0.17;
    return true;
  }
  if (Math.abs(vSpin) > 0.0012) { spin += vSpin; vSpin *= 0.9; return true; }
  vSpin = 0;
  const n = panelIndex();
  if (dSettled === n) return false;
  dTarget = -n * STEP + Math.round((spin + n * STEP) / (Math.PI * 2)) * Math.PI * 2;
  return true;
}
function goPanel(i) {
  dSettled = -1; vSpin = 0;
  const raw = -((((i % NP) + NP) % NP) * STEP);
  dTarget = raw + Math.round((spin - raw) / (Math.PI * 2)) * Math.PI * 2;
  dFrame();
}

let dpx = 0;
drum.addEventListener('pointerdown', (e) => {
  dDrag = true; dSettled = -1; dTarget = null; vSpin = 0; dpx = e.clientX;
  try { drum.setPointerCapture(e.pointerId); } catch (_) {}
  dFrame();
});
drum.addEventListener('pointermove', (e) => {
  if (!dDrag) return;
  const dx = e.clientX - dpx; dpx = e.clientX;
  spin += dx * 0.0052; vSpin = dx * 0.0052;
  dFrame();
});
const dEnd = () => { if (dDrag) { dDrag = false; dFrame(); } };
drum.addEventListener('pointerup', dEnd);
drum.addEventListener('pointercancel', dEnd);
drum.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') { e.preventDefault(); goPanel(panelIndex() + 1); }
  if (e.key === 'ArrowLeft')  { e.preventDefault(); goPanel(panelIndex() - 1); }
});
el('drum-next').addEventListener('click', () => goPanel(panelIndex() + 1));
el('drum-prev').addEventListener('click', () => goPanel(panelIndex() - 1));

/* ═══════════════ boot ═══════════════ */
function layout() { sizeSolid(); sizeDrum(); drawSolid(); drawDrum(); }
let rz;
window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(layout, 140); });

sizeSolid(); sizeDrum();
selectFace(1, false);
syncDossier(1); shownFace = 1;
drawDrum();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { drawSolid(); drawDrum(); });

/* headless verification hooks — no behaviour of its own */
window.__solid = {
  get yaw() { return yaw; },
  get pitch() { return pitch; },
  front: () => nearestFace(),
  shown: () => shownFace,
  select: (i) => selectFace(i),
  /* screen position of every facet currently facing the camera — lets a headless
     test click a real facet instead of a guessed pixel */
  centres: () => hitFaces.map((f) => {
    const p = project(f.c3, W / 2, H / 2);
    return { i: f.i, x: +p.x.toFixed(1), y: +p.y.toFixed(1) };
  }),
  settle(max = 900) {
    if (raf) { cancelAnimationFrame(raf); raf = null; }   // no stray frame after we finish
    let n = 0;
    while (advance() && n++ < max) { /* run the same integrator, off the clock */ }
    drawSolid();
    return { yaw: +yaw.toFixed(4), pitch: +pitch.toFixed(4), front: nearestFace() };
  },
};
window.__drum = {
  get spin() { return spin; },
  front: () => panelIndex(),
  go: (i) => goPanel(i),
  settle(max = 900) {
    if (dRaf) { cancelAnimationFrame(dRaf); dRaf = null; }
    let n = 0;
    while (dAdvance() && n++ < max) { /* noop */ }
    drawDrum();
    return { spin: +spin.toFixed(4), front: panelIndex() };
  },
};
