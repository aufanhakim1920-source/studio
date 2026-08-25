/* BALANCE — a beam balance you load by hand.
   =========================================================================
   The object: a nickel beam on a fulcrum, two hanging pans, a sealed box on
   the left, and a tray of brass weights.

   Load-bearing: THE TILT IS THE ONLY INSTRUMENT. The box's mass is never
   printed anywhere, not even after you solve it — the beam's angle is the
   entire readout, and the answer is whatever you had to stack to level it.
   Remove the beam and there is no way to know anything.

   The unknown is always a subset sum of the available weights, so every box
   is exactly solvable — a puzzle with no reachable answer would be a cheat. */

const W = 100, H = 72;
const FX = 50, FY = 21;            // fulcrum
const ARM = 34;                    // half-beam
const HANG = 15;                   // pan drop below the beam end
const TILT_MAX = 0.26;             // radians at full deflection

const SET = [1, 2, 5, 10, 20, 50];
const SIZE = { 1: [5.2, 3.0], 2: [6.2, 3.4], 5: [7.4, 3.9], 10: [8.8, 4.5], 20: [10.4, 5.1], 50: [12.4, 5.9] };

/* ── state ───────────────────────────────────────────────────────────── */
let weights = [];
let boxMass = 0;
let theta = 0, thetaTarget = 0;
let solved = 0;
let held = null, grabDX = 0, grabDY = 0;
let settleT = 0;                   // how long the beam has been level

const $ = (s) => document.querySelector(s);
const canvas = $("#scale");
const ctx = canvas.getContext("2d");
let S = 1, OX = 0, OY = 0;

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const r = canvas.getBoundingClientRect();
  canvas.width = Math.round(r.width * dpr);
  canvas.height = Math.round(r.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  S = Math.min(r.width / W, r.height / H);
  OX = (r.width - W * S) / 2;
  OY = (r.height - H * S) / 2;
}
const px = (x) => OX + x * S;
const py = (y) => OY + y * S;
const ux = (X) => (X - OX) / S;
const uy = (Y) => (Y - OY) / S;

/* ── setup ───────────────────────────────────────────────────────────── */
function layoutTray() {
  const gap = 72 / SET.length;
  weights = SET.map((g, i) => {
    const [w, h] = SIZE[g];
    return { g, w, h, hx: 14 + gap * i + gap / 2, hy: 65, x: 0, y: 0, onPan: false };
  });
  weights.forEach((k) => { k.x = k.hx; k.y = k.hy; });
}

function newBox() {
  // always a subset sum, so it is always exactly solvable
  let pick;
  do { pick = SET.filter(() => Math.random() < 0.5); } while (pick.length < 2);
  boxMass = pick.reduce((a, b) => a + b, 0);
  weights.forEach((k) => { k.onPan = false; k.x = k.hx; k.y = k.hy; });
  settleT = 0;
  readouts();
  say("A new box. Level the beam.");
}

const panTotal = () => weights.filter((k) => k.onPan).reduce((a, k) => a + k.g, 0);

/* ── geometry ────────────────────────────────────────────────────────── */
function ends() {
  const c = Math.cos(theta), s = Math.sin(theta);
  return {
    L: { x: FX - ARM * c, y: FY - ARM * s },
    R: { x: FX + ARM * c, y: FY + ARM * s },
  };
}
const panPos = (e) => ({ x: e.x, y: e.y + HANG });

/* ── loop ────────────────────────────────────────────────────────────── */
function tick() {
  const diff = panTotal() - boxMass;
  thetaTarget = Math.max(-TILT_MAX, Math.min(TILT_MAX, diff * 0.02));
  theta += (thetaTarget - theta) * 0.11;

  if (boxMass > 0 && Math.abs(diff) < 0.001 && Math.abs(theta) < 0.004) {
    settleT += 1;
    if (settleT === 40) {
      solved += 1;
      readouts();
      say(`Level. The box is ${boxMass}g.`, true);
      setTimeout(newBox, 1800);
    }
  } else if (settleT < 40) settleT = 0;

  draw();
  requestAnimationFrame(tick);
}

/* ── drawing ─────────────────────────────────────────────────────────── */
function draw() {
  const r = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, r.width, r.height);

  const e = ends();
  const pl = panPos(e.L), pr = panPos(e.R);

  // bench line
  ctx.strokeStyle = "rgba(198,205,214,.16)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(px(6), py(69.5)); ctx.lineTo(px(94), py(69.5)); ctx.stroke();

  // pillar + base
  ctx.fillStyle = "#8C97A6";
  ctx.fillRect(px(FX - 1.5), py(FY), 3 * S, (69.5 - FY) * S);
  ctx.fillStyle = "#C6CDD6";
  ctx.fillRect(px(FX - 9), py(67.5), 18 * S, 2.4 * S);

  drawPan(pl, e.L, "box");
  drawPan(pr, e.R, "weights");

  // the beam
  ctx.save();
  ctx.translate(px(FX), py(FY));
  ctx.rotate(theta);
  const g = ctx.createLinearGradient(0, -1.4 * S, 0, 1.4 * S);
  g.addColorStop(0, "#E4E9EE"); g.addColorStop(0.5, "#C6CDD6"); g.addColorStop(1, "#79838F");
  ctx.fillStyle = g;
  ctx.fillRect(-ARM * S, -1.3 * S, ARM * 2 * S, 2.6 * S);
  ctx.fillStyle = "#79838F";
  ctx.fillRect(-ARM * S, -1.3 * S, ARM * 2 * S, 0.5 * S);
  ctx.restore();

  // fulcrum knife-edge and the pointer that reads against a fixed scale
  ctx.beginPath();
  ctx.moveTo(px(FX), py(FY - 4.4));
  ctx.lineTo(px(FX - 3), py(FY + 1));
  ctx.lineTo(px(FX + 3), py(FY + 1));
  ctx.closePath();
  ctx.fillStyle = "#EFEFE9"; ctx.fill();

  /* The tell-tale: a needle swinging below the fulcrum against a marked
     plate. Without the plate behind it the needle read as a stray diagonal
     line crossing the column — a pointer needs something to point AT. */
  ctx.fillStyle = "rgba(8,13,26,.72)";
  ctx.fillRect(px(FX - 6.4), py(FY + 5.2), 12.8 * S, 4.6 * S);
  ctx.strokeStyle = "rgba(198,205,214,.28)";
  ctx.lineWidth = 1;
  ctx.strokeRect(px(FX - 6.4) + 0.5, py(FY + 5.2) + 0.5, 12.8 * S - 1, 4.6 * S - 1);
  [-4.2, 0, 4.2].forEach((d, i) => {
    ctx.beginPath();
    ctx.moveTo(px(FX + d), py(FY + 5.6));
    ctx.lineTo(px(FX + d), py(FY + (i === 1 ? 9.4 : 8.0)));
    ctx.strokeStyle = i === 1 ? "rgba(111,208,154,.85)" : "rgba(198,205,214,.62)";
    ctx.lineWidth = i === 1 ? 1.6 : 1;
    ctx.stroke();
  });
  const lvl = Math.abs(theta) < 0.004 && boxMass > 0;
  ctx.beginPath();
  ctx.moveTo(px(FX), py(FY + 1.6));
  ctx.lineTo(px(FX + Math.sin(theta) * 17), py(FY + 8.6));
  ctx.strokeStyle = lvl ? "#6FD09A" : "#EFC584";
  ctx.lineWidth = Math.max(2, S * 0.62);
  ctx.lineCap = "round";
  ctx.stroke();

  drawTray();
  weights.filter((k) => k === held).forEach(drawWeight);
}

function drawPan(p, e, kind) {
  // three strings
  ctx.strokeStyle = "rgba(198,205,214,.65)";
  ctx.lineWidth = 1;
  [-7, 0, 7].forEach((d) => {
    ctx.beginPath();
    ctx.moveTo(px(e.x), py(e.y));
    ctx.lineTo(px(p.x + d), py(p.y));
    ctx.stroke();
  });
  // dish
  ctx.beginPath();
  ctx.moveTo(px(p.x - 9.5), py(p.y));
  ctx.quadraticCurveTo(px(p.x), py(p.y + 4.2), px(p.x + 9.5), py(p.y));
  ctx.closePath();
  const g = ctx.createLinearGradient(0, py(p.y), 0, py(p.y + 4));
  g.addColorStop(0, "#D9DFE5"); g.addColorStop(1, "#7F8A96");
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = "#6B7681"; ctx.lineWidth = 1; ctx.stroke();

  if (kind === "box") drawBox(p);
  else {
    // stack whatever is on the pan
    let y = p.y;
    weights.filter((k) => k.onPan && k !== held).forEach((k) => {
      k.x = p.x; k.y = y - k.h / 2;
      drawWeight(k);
      y -= k.h;
    });
  }
}

function drawBox(p) {
  const w = 13, h = 9;
  const x = p.x - w / 2, y = p.y - h;
  const g = ctx.createLinearGradient(px(x), py(y), px(x), py(y + h));
  g.addColorStop(0, "#4A3F63"); g.addColorStop(1, "#2C2440");
  ctx.fillStyle = g;
  ctx.fillRect(px(x), py(y), w * S, h * S);
  ctx.strokeStyle = "#7A6C9C"; ctx.lineWidth = 1;
  ctx.strokeRect(px(x) + 0.5, py(y) + 0.5, w * S - 1, h * S - 1);
  // a wax seal, so it reads as sealed rather than merely dark
  ctx.beginPath();
  ctx.arc(px(p.x), py(y + h / 2), 2.1 * S, 0, Math.PI * 2);
  ctx.fillStyle = "#B4453C"; ctx.fill();
  ctx.fillStyle = "rgba(239,239,233,.72)";
  ctx.font = `500 ${Math.round(S * 3.4)}px "DM Mono", monospace`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("?", px(p.x), py(y + h / 2));
}

function drawWeight(k) {
  const x = k.x - k.w / 2, y = k.y - k.h / 2;
  const g = ctx.createLinearGradient(px(x), py(y), px(x), py(y + k.h));
  g.addColorStop(0, "#EFC584"); g.addColorStop(0.5, "#CE9B4E"); g.addColorStop(1, "#8E6624");
  ctx.fillStyle = g;
  ctx.fillRect(px(x), py(y), k.w * S, k.h * S);
  ctx.strokeStyle = "rgba(40,26,6,.5)"; ctx.lineWidth = 1;
  ctx.strokeRect(px(x) + 0.5, py(y) + 0.5, k.w * S - 1, k.h * S - 1);
  // the knob on top, which is what makes it read as a weight and not a brick
  ctx.beginPath();
  ctx.ellipse(px(k.x), py(y), k.w * 0.16 * S, k.h * 0.18 * S, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#EFC584"; ctx.fill();
  ctx.fillStyle = "#2A1D06";
  ctx.font = `500 ${Math.round(S * 2.5)}px "DM Mono", monospace`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(`${k.g}`, px(k.x), py(k.y + 0.4));
}

function drawTray() {
  ctx.strokeStyle = "rgba(198,205,214,.2)";
  ctx.lineWidth = 1;
  ctx.strokeRect(px(11) + 0.5, py(60.5) + 0.5, 78 * S - 1, 9 * S - 1);
  weights.filter((k) => !k.onPan && k !== held).forEach(drawWeight);
}

/* ── input ───────────────────────────────────────────────────────────── */
const stage = $("#stage");

function hit(mx, my) {
  // topmost first: pan stack, then tray
  const list = [...weights].reverse();
  return list.find((k) =>
    Math.abs(mx - k.x) < k.w / 2 + 1.2 && Math.abs(my - k.y) < k.h / 2 + 1.6) || null;
}

stage.addEventListener("pointerdown", (e) => {
  const r = canvas.getBoundingClientRect();
  const mx = ux(e.clientX - r.left), my = uy(e.clientY - r.top);
  const k = hit(mx, my);
  if (!k) return;
  held = k; grabDX = mx - k.x; grabDY = my - k.y;
  try { stage.setPointerCapture(e.pointerId); } catch {}
});

stage.addEventListener("pointermove", (e) => {
  if (!held) return;
  const r = canvas.getBoundingClientRect();
  held.x = ux(e.clientX - r.left) - grabDX;
  held.y = uy(e.clientY - r.top) - grabDY;
});

const drop = () => {
  if (!held) return;
  const pr = panPos(ends().R);
  const over = Math.abs(held.x - pr.x) < 16 && held.y > pr.y - 26 && held.y < pr.y + 10;
  held.onPan = over;
  if (!over) { held.x = held.hx; held.y = held.hy; }
  held = null;
  readouts();
};
stage.addEventListener("pointerup", drop);
stage.addEventListener("pointercancel", () => {
  if (held) { held.x = held.hx; held.y = held.hy; held = null; }
});

/* keyboard: each weight can be toggled onto the pan by number key */
stage.tabIndex = 0;
stage.addEventListener("keydown", (e) => {
  const i = "123456".indexOf(e.key);
  if (i < 0) return;
  e.preventDefault();
  weights[i].onPan = !weights[i].onPan;
  if (!weights[i].onPan) { weights[i].x = weights[i].hx; weights[i].y = weights[i].hy; }
  readouts();
});

/* ── chrome ──────────────────────────────────────────────────────────── */
function readouts() {
  $("#rPan").innerHTML = `${panTotal()}<i>g</i>`;
  $("#rSolved").textContent = solved;
}
let sayT = null;
function say(m, good) {
  const el = $("#hint");
  clearTimeout(sayT);
  el.textContent = m || "Drag a weight onto the right pan.";
  el.classList.toggle("good", !!good);
  if (m) sayT = setTimeout(() => {
    el.textContent = "Drag a weight onto the right pan.";
    el.classList.remove("good");
  }, 2600);
}

$("#bClear").addEventListener("click", () => {
  weights.forEach((k) => { k.onPan = false; k.x = k.hx; k.y = k.hy; });
  readouts();
});
$("#bNew").addEventListener("click", newBox);

window.addEventListener("resize", resize);
resize();
layoutTray();
newBox();
readouts();
tick();
