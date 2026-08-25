/* SLIDE RULE — a working logarithmic calculator.
   =========================================================================
   The object: a celluloid stock with a D scale, a slide carrying a C scale,
   and a glass cursor with a vermilion hairline.

   Load-bearing in the strictest sense on this whole site: THE ANSWER ONLY
   EXISTS AS A POSITION. Nothing multiplies anything in code. Both scales are
   logarithmic, so sliding one against the other physically adds the logs,
   and the product is read off wherever the hairline happens to land. Take
   the object away and there is no arithmetic left — not a hidden result, no
   result at all.

   The readouts are honest about that: they report 10^x for wherever the
   hairline sits on each scale. They are a magnifying glass on the object,
   not a calculator beside it.

   Orientation: horizontal on a desk, VERTICAL on a phone. A slide rule laid
   out horizontally on a 390px screen is a sliver; turned on its end it fills
   the screen and drags just as naturally. */

const $ = (s) => document.querySelector(s);
const canvas = $("#rule");
const ctx = canvas.getContext("2d");

/* geometry in "rule units": u runs 0..1 along the rule (one decade of log),
   v runs 0..1 across it. */
const V_TOP = 0.17, V_SLIDE_A = 0.35, V_SLIDE_B = 0.63, V_BOT = 0.83;

let vertical = false;
let W = 0, Hh = 0, PAD = 0, LEN = 0, THK = 0;

/* ── state ───────────────────────────────────────────────────────────── */
let slide = 0;        // slide offset in log units (0 = indexes aligned)
let cursor = 0.35;    // hairline position along the stock, 0..1
let solved = 0;
let sum = null;       // {a, b, want}
let drag = null;      // 'slide' | 'cursor'
let grabU = 0;

const L10 = (v) => Math.log10(v);

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const r = canvas.getBoundingClientRect();
  canvas.width = Math.round(r.width * dpr);
  canvas.height = Math.round(r.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  W = r.width; Hh = r.height;
  vertical = window.matchMedia("(max-width:700px)").matches;
  PAD = (vertical ? Hh : W) * 0.06;
  LEN = (vertical ? Hh : W) - PAD * 2;
  THK = (vertical ? W : Hh) * 0.82;
}

/* map rule coords to screen. One place, so nothing else cares which way
   round the instrument is. */
function P(u, v) {
  const along = PAD + u * LEN;
  const across = ((vertical ? W : Hh) - THK) / 2 + v * THK;
  return vertical ? { x: across, y: along } : { x: along, y: across };
}
/* screen delta -> rule units along the length */
const alongOf = (e, r) => ((vertical ? e.clientY - r.top : e.clientX - r.left) - PAD) / LEN;

/* ── the sums ────────────────────────────────────────────────────────── */
function newSum() {
  let a, b;
  do {
    a = Math.round((1.2 + Math.random() * 6) * 10) / 10;
    b = Math.round((1.2 + Math.random() * 5) * 10) / 10;
  } while (a * b > 9.7 || a * b < 1.6);
  sum = { a, b, want: a * b };
  $("#tSum").innerHTML = `${a.toFixed(1)} &times; ${b.toFixed(1)}`;
  mark();
}

/* how close the hairline's D reading is to the product */
function mark() {
  const d = 10 ** cursor;
  const el = $("#tState");
  if (!sum) return;
  const err = Math.abs(d - sum.want) / sum.want;
  el.classList.remove("hit", "near");
  if (err < 0.012) {
    el.textContent = "CORRECT";
    el.classList.add("hit");
    if (!sum.done) { sum.done = true; solved += 1; $("#rSolved").textContent = solved;
      say(`${sum.a} × ${sum.b} = ${sum.want.toFixed(2)}. Next one.`);
      setTimeout(newSum, 1400); }
  } else if (err < 0.06) {
    el.textContent = "CLOSE";
    el.classList.add("near");
  } else {
    el.textContent = "—";
  }
}

/* ── drawing ─────────────────────────────────────────────────────────── */
/* the ticks of one decade: value -> log position, with denser subdivisions
   at the crowded left-hand end, exactly like a real scale */
function ticks() {
  const out = [];
  const push = (v, size, label) => out.push({ u: L10(v), size, label });
  for (let v = 1; v < 10; v += 1) push(v, 1, String(v));
  for (let v = 1; v < 3; v += 0.1) if (Math.abs(v % 1) > 1e-9) push(v, v % 0.5 < 1e-9 ? 0.66 : 0.4, v % 0.5 < 1e-9 ? v.toFixed(1) : null);
  for (let v = 3; v < 6; v += 0.2) if (Math.abs(v % 1) > 1e-9) push(v, 0.45, null);
  for (let v = 6; v < 10; v += 0.5) if (Math.abs(v % 1) > 1e-9) push(v, 0.45, null);
  push(10, 1, "1");
  return out;
}
const TICKS = ticks();

function scaleFace(originU, vEdge, dir, label) {
  const fs = Math.max(7, THK * 0.11);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const t of TICKS) {
    const u = originU + t.u;
    if (u < -0.02 || u > 1.02) continue;
    const len = 0.10 * t.size;
    const a = P(u, vEdge), b = P(u, vEdge + dir * len);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    ctx.lineWidth = t.size >= 1 ? 1.6 : 1;
    ctx.strokeStyle = "#23262B";
    ctx.stroke();
    if (t.label) {
      const p = P(u, vEdge + dir * (len + 0.075));
      ctx.fillStyle = "#23262B";
      ctx.font = `500 ${fs}px "IBM Plex Mono", monospace`;
      ctx.save();
      if (vertical) { ctx.translate(p.x, p.y); ctx.rotate(-Math.PI / 2); ctx.fillText(t.label, 0, 0); ctx.restore(); }
      else { ctx.fillText(t.label, p.x, p.y); ctx.restore(); }
    }
  }
  // the scale's letter, at that scale's OWN origin — printing both at u=0
  // stacked "C" on top of "D" at the left end
  ctx.fillStyle = "#7A6E58";
  ctx.font = `600 ${fs * 1.05}px "IBM Plex Mono", monospace`;
  const q = P(originU - 0.035, vEdge + dir * 0.052);
  ctx.save();
  if (vertical) { ctx.translate(q.x, q.y); ctx.rotate(-Math.PI / 2); ctx.fillText(label, 0, 0); }
  else ctx.fillText(label, q.x, q.y);
  ctx.restore();
}

function beam(v0, v1, fill, u0 = -0.09, u1 = 1.09) {
  const a = P(u0, v0), b = P(u1, v1);
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
  const w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
  const g = vertical
    ? ctx.createLinearGradient(x, 0, x + w, 0)
    : ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, fill[0]); g.addColorStop(0.5, fill[1]); g.addColorStop(1, fill[2]);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(60,52,38,.45)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function draw() {
  ctx.clearRect(0, 0, W, Hh);

  // stock: two fixed beams
  beam(V_TOP, V_SLIDE_A, ["#F6F0E2", "#EFE7D6", "#DED5C1"]);
  beam(V_SLIDE_B, V_BOT, ["#DED5C1", "#EFE7D6", "#F6F0E2"]);
  // the slide, a touch darker so the moving part is legible as a part
  beam(V_SLIDE_A, V_SLIDE_B, ["#E6DDC8", "#DED5C1", "#CFC4AC"], -0.09 + slide, 1.09 + slide);

  // C on the slide's lower edge, D on the stock's upper edge — they meet on
  // the same line, which is what makes reading across possible
  scaleFace(slide, V_SLIDE_B, -1, "C");
  scaleFace(0, V_SLIDE_B, 1, "D");

  drawCursor();
}

function drawCursor() {
  const a = P(cursor, V_TOP - 0.06), b = P(cursor, V_BOT + 0.06);
  const half = THK * 0.085;
  // glass
  ctx.save();
  ctx.beginPath();
  if (vertical) ctx.rect(Math.min(a.x, b.x) - 0, a.y - half, Math.abs(b.x - a.x), half * 2);
  else ctx.rect(a.x - half, Math.min(a.y, b.y), half * 2, Math.abs(b.y - a.y));
  ctx.fillStyle = "rgba(206,222,232,.30)";
  ctx.fill();
  ctx.strokeStyle = "#8C9AA6";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  // hairline
  ctx.beginPath();
  ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  ctx.strokeStyle = "#E2402C";
  ctx.lineWidth = 1.6;
  ctx.stroke();
}

/* ── input ───────────────────────────────────────────────────────────── */
const stage = $("#stage");

stage.addEventListener("pointerdown", (e) => {
  const r = stage.getBoundingClientRect();
  const u = alongOf(e, r);
  // grabbing near the hairline takes the cursor, anywhere else takes the slide
  drag = Math.abs(u - cursor) < 0.045 ? "cursor" : "slide";
  grabU = u - (drag === "cursor" ? cursor : slide);
  stage.classList.add("dragging");
  try { stage.setPointerCapture(e.pointerId); } catch {}
});

stage.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const r = stage.getBoundingClientRect();
  const u = alongOf(e, r);
  if (drag === "cursor") cursor = Math.max(0, Math.min(1, u - grabU));
  else slide = Math.max(-1.02, Math.min(1.02, u - grabU));
  readouts();
});

const stop = () => { drag = null; stage.classList.remove("dragging"); };
stage.addEventListener("pointerup", stop);
stage.addEventListener("pointercancel", stop);

stage.tabIndex = 0;
stage.addEventListener("keydown", (e) => {
  const fine = e.shiftKey ? 0.002 : 0.01;
  if (e.key === "ArrowRight" || e.key === "ArrowDown") { cursor = Math.min(1, cursor + fine); }
  else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { cursor = Math.max(0, cursor - fine); }
  else if (e.key === "," ) { slide -= fine; }
  else if (e.key === "." ) { slide += fine; }
  else return;
  e.preventDefault();
  readouts();
});

/* ── chrome ──────────────────────────────────────────────────────────── */
function readouts() {
  const d = 10 ** cursor;
  const c = 10 ** (cursor - slide);
  $("#rD").textContent = d.toFixed(2);
  $("#rC").textContent = (c >= 1 && c <= 10) ? c.toFixed(2) : "—";
  mark();
  draw();
}
let sayT = null;
function say(m) {
  const el = $("#hint");
  clearTimeout(sayT);
  el.textContent = m || "Drag the slide. Drag the hairline.";
  if (m) sayT = setTimeout(() => { el.textContent = "Drag the slide. Drag the hairline."; }, 2400);
}

$("#bSkip").addEventListener("click", newSum);
$("#bHome").addEventListener("click", () => { slide = 0; cursor = 0.35; readouts(); });

window.addEventListener("resize", () => { resize(); draw(); });
resize();
newSum();
readouts();
