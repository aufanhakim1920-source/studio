/* Northbound — LANE 2: modern creative.
   =========================================================================
   The centrepiece is a coffee cup drawn in hand-rolled 3D: a yaw+pitch
   projection and a painter's algorithm, no library. You drag it to turn it,
   and it FILLS as you scroll the hero — the coffee level is bound to how far
   down the page you are, so the animation is driven by the visitor rather
   than by a timer.

   Function first, same two rules as every page here:
   - the .motion class is added by this script, so with JavaScript off
     nothing is hidden and the whole menu still reads;
   - reveals use a rAF position sweep, never IntersectionObserver alone,
     because IO delivers asynchronously and a fast scroll or an anchor jump
     can pass an element without it ever being reported. */

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!REDUCED) document.documentElement.classList.add("motion");

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ── entrances ───────────────────────────────────────────────────────── */
$$("[data-enter]").forEach((el) => {
  el.style.setProperty("--d", (el.dataset.enter - 1) * 95 + "ms");
  requestAnimationFrame(() => el.classList.add("in"));
});

/* ── reveal sweep ────────────────────────────────────────────────────── */
const rise = $$("[data-rise]");
if (REDUCED) rise.forEach((el) => el.classList.add("in"));
else {
  rise.forEach((el) => {
    const sibs = [...el.parentElement.children].filter((c) => c.hasAttribute("data-rise"));
    el.style.setProperty("--d", Math.min(Math.max(sibs.indexOf(el), 0), 4) * 75 + "ms");
  });
  let q = false;
  const sweep = () => {
    q = false;
    const line = innerHeight * 0.94;
    for (let i = rise.length - 1; i >= 0; i--) {
      if (rise[i].getBoundingClientRect().top < line) {
        rise[i].classList.add("in");
        rise.splice(i, 1);
      }
    }
  };
  const ping = () => { if (!q) { q = true; requestAnimationFrame(sweep); } };
  addEventListener("scroll", ping, { passive: true });
  addEventListener("resize", ping);
  sweep();
}

/* ── marquee ─────────────────────────────────────────────────────────── */
/* built in JS so the duplicate copies needed for a seamless loop never sit
   in the markup as repeated text for a screen reader to read twice */
{
  const words = ["SINGLE ORIGIN", "BATCH FILTER", "EGGS TILL THREE", "WALK-INS ONLY", "OPEN SEVEN DAYS"];
  const line = words.map((w) => `<span>${w}</span><i aria-hidden="true">&bull;</i>`).join("");
  $("#track").innerHTML = line + line;
}

/* ── the cup, in 3D ──────────────────────────────────────────────────── */
const canvas = $("#cup");
const ctx = canvas.getContext("2d");

const R = 0.62, HALF = 0.60, SEG = 44;      // cup radius, half-height
const YAW = 0.0, PITCH = 0.42;
const CA = Math.cos(PITCH), SA = Math.sin(PITCH);

let spin = 0.5;          // rotation, radians
let vel = 0;
let fill = 0.18;         // 0..1, how full — driven by scroll
let dragging = false, lastX = 0, everDragged = false;
let cx = 0, cy = 0, S = 1;

function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const r = canvas.getBoundingClientRect();
  canvas.width = Math.round(r.width * dpr);
  canvas.height = Math.round(r.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  S = Math.min(r.width / 2.0, r.height / 1.9);
  cx = r.width / 2;
  cy = r.height / 2 + S * 0.06;
}

function P(x, y, z) {
  const X1 = x * Math.cos(YAW) + z * Math.sin(YAW);
  const Z1 = -x * Math.sin(YAW) + z * Math.cos(YAW);
  const Y2 = y * CA - Z1 * SA;
  const Z2 = y * SA + Z1 * CA;
  return { x: cx + X1 * S, y: cy - Y2 * S, d: Z2 };
}
const ring = (a, rad, yy) => P(rad * Math.cos(a), yy, rad * Math.sin(a));

function porcelain(lit) {
  const a = [0x6E, 0x66, 0x5E], b = [0xFA, 0xF6, 0xEE];
  const m = (i) => Math.round(a[i] + (b[i] - a[i]) * lit);
  return `rgb(${m(0)},${m(1)},${m(2)})`;
}

function draw() {
  const r = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, r.width, r.height);
  const items = [];
  const LIGHT = -0.9;

  // saucer
  {
    const pts = [];
    for (let j = 0; j <= 40; j++) pts.push(ring((j / 40) * Math.PI * 2, R * 1.62, -HALF - 0.02));
    items.push({ d: 9e9, run: () => {
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      const g = ctx.createLinearGradient(0, pts[10].y, 0, pts[30].y);
      g.addColorStop(0, "#2A2622"); g.addColorStop(1, "#141210");
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = "rgba(250,246,238,.22)"; ctx.lineWidth = 1.4; ctx.stroke();
    }});
  }

  // handle, behind or in front depending on where it has been turned to
  {
    const ha = spin + Math.PI * 0.5;
    const hx = Math.cos(ha), hz = Math.sin(ha);
    const pts = [];
    for (let j = 0; j <= 18; j++) {
      const t = j / 18, ang = -Math.PI * 0.55 + t * Math.PI * 1.1;
      const rr = R + 0.30 * Math.cos(ang) + 0.06;
      pts.push(P(hx * rr, Math.sin(ang) * 0.30, hz * rr));
    }
    const dep = pts.reduce((s, p) => s + p.d, 0) / pts.length;
    items.push({ d: dep, run: () => {
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(7, S * 0.11); ctx.strokeStyle = "#F6F2EA"; ctx.stroke();
      ctx.lineWidth = Math.max(4, S * 0.075); ctx.strokeStyle = "#D9D2C6"; ctx.stroke();
    }});
  }

  // the wall, one quad per segment
  for (let j = 0; j < SEG; j++) {
    const a0 = (j / SEG) * Math.PI * 2 + spin;
    const a1 = ((j + 1) / SEG) * Math.PI * 2 + spin;
    const rTop = R, rBot = R * 0.74;
    const p1 = ring(a0, rTop, HALF), p2 = ring(a1, rTop, HALF);
    const p3 = ring(a1, rBot, -HALF), p4 = ring(a0, rBot, -HALF);
    const mid = (a0 + a1) / 2;
    const lit = Math.max(0, Math.cos(mid - LIGHT)) ** 1.5;
    const col = porcelain(0.16 + lit * 0.84);
    const dep = (p1.d + p2.d + p3.d + p4.d) / 4;
    items.push({ d: dep, run: () => {
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y);
      ctx.closePath();
      ctx.fillStyle = col; ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.stroke();
    }});
  }

  items.sort((a, b) => b.d - a.d);
  items.forEach((it) => it.run());

  // the coffee: an ellipse at the fill height, drawn after the wall so the
  // near rim occludes it correctly
  const surfY = -HALF + fill * (HALF * 2) * 0.94;
  const rAt = R * (0.74 + (surfY + HALF) / (HALF * 2) * 0.26);
  const sp = [];
  for (let j = 0; j <= 40; j++) sp.push(ring((j / 40) * Math.PI * 2, rAt * 0.955, surfY));
  ctx.beginPath();
  sp.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  const cg = ctx.createLinearGradient(0, sp[10].y, 0, sp[30].y);
  cg.addColorStop(0, "#4A2A14"); cg.addColorStop(0.5, "#6B3C18"); cg.addColorStop(1, "#33200F");
  ctx.fillStyle = cg; ctx.fill();
  // crema
  ctx.strokeStyle = "rgba(214,160,88,.55)"; ctx.lineWidth = Math.max(2, S * 0.02); ctx.stroke();

  // rim, on top of everything
  const rim = [];
  for (let j = 0; j <= 48; j++) rim.push(ring((j / 48) * Math.PI * 2, R, HALF));
  ctx.beginPath();
  rim.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.strokeStyle = "#FFFDF8"; ctx.lineWidth = Math.max(2.5, S * 0.028); ctx.stroke();
}

function frame() {
  if (!dragging && Math.abs(vel) > 1e-5) {
    spin += vel;
    vel *= 0.955;
  }
  draw();
  requestAnimationFrame(frame);
}

/* drag to turn */
const stage = $("#cupStage");
stage.addEventListener("pointerdown", (e) => {
  dragging = true; lastX = e.clientX; vel = 0;
  stage.classList.add("grabbing");
  try { stage.setPointerCapture(e.pointerId); } catch {}
});
stage.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastX;
  lastX = e.clientX;
  spin += dx * 0.012;
  vel = vel * 0.5 + dx * 0.012 * 0.5;
  if (!everDragged && Math.abs(dx) > 2) {
    everDragged = true;
    $("#cupHint").classList.add("gone");
  }
});
const stop = () => { dragging = false; stage.classList.remove("grabbing"); };
stage.addEventListener("pointerup", stop);
stage.addEventListener("pointercancel", stop);

/* keyboard, since a drag-only control is unusable without a pointer */
stage.tabIndex = 0;
stage.addEventListener("keydown", (e) => {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  e.preventDefault();
  spin += (e.key === "ArrowRight" ? 1 : -1) * 0.28;
});

/* the fill is bound to scroll position through the hero — user-driven, and
   nothing on the page depends on it having happened */
function updateFill() {
  const h = $(".hero").getBoundingClientRect();
  const k = Math.min(1, Math.max(0, -h.top / (h.height * 0.9)));
  fill = REDUCED ? 0.6 : 0.18 + k * 0.62;
}
addEventListener("scroll", updateFill, { passive: true });
addEventListener("resize", () => { resize(); updateFill(); });

resize();
updateFill();
frame();
