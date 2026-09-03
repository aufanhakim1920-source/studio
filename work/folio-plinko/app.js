const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const COL = {
  web:    ["#E7F65E", "#23260A"],
  game:   ["#F9A16C", "#2A1B10"],
  ai:     ["#619B8A", "#F4F2E9"],
  motion: ["#E0A7C2", "#2C1622"],
};
function discipline(p) {
  const t = (p.tags.join(" ") + " " + p.name).toLowerCase();
  if (/remotion|video|sound/.test(t)) return "motion";
  if (/unity|canvas|game|narrative/.test(t)) return "game";
  if (/proxy|observability|composio|automation|vision|serverless/.test(t)) return "ai";
  return "web";
}
let P = [], edges = [], drops = 0, running = false;
let cv, ctx, W = 0, H = 0, pegs = [], ball = null;
const G = 0.42, REST = 0.62, FRICT = 0.995, PEG_R = 4.5, BALL_R = 9;
/* ── the board ─────────────────────────────────────────────────────────── */
function layout() {
  const r = cv.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, 2);
  W = r.width; H = r.height;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  /* a staggered peg lattice — offset rows are what make it bounce sideways */
  /* ⚠️ the stagger is the whole point — a square lattice lets a ball fall
     straight through without ever being deflected. Alternate rows are offset
     by half a gap so every row forces a left/right decision. */
  pegs = [];
  const rows = 8, top = 58, bot = H - 30;
  const gapY = (bot - top) / (rows - 1);
  const cols = 8;
  const gapX = W / cols;
  for (let ry = 0; ry < rows; ry++) {
    const odd = ry % 2;
    for (let i = 0; i < cols + (odd ? 1 : 0); i++) {
      const x = gapX * i + (odd ? 0 : gapX / 2);
      if (x < 2 || x > W - 2) continue;
      pegs.push({ x, y: top + ry * gapY });
    }
  }
  draw();
}
function draw() {
  ctx.clearRect(0, 0, W, H);
  /* the slot edges, drawn as dividers so the board and the buttons line up */
  ctx.strokeStyle = "rgba(28,28,28,.14)";
  ctx.lineWidth = 1;
  edges.slice(1, -1).forEach((x) => {
    ctx.beginPath(); ctx.moveTo(x, H - 34); ctx.lineTo(x, H); ctx.stroke();
  });
  ctx.fillStyle = "rgba(28,28,28,.55)";
  pegs.forEach((p) => {
    ctx.beginPath(); ctx.arc(p.x, p.y, PEG_R, 0, Math.PI * 2); ctx.fill();
  });
  if (ball) {
    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(ball.a);
    ctx.fillStyle = "#1C1C1C";
    ctx.beginPath(); ctx.arc(0, 0, BALL_R, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#F9A16C";                    /* a mark, so the spin reads */
    ctx.beginPath(); ctx.arc(0, -BALL_R * .45, BALL_R * .3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}
/* ── the fall ──────────────────────────────────────────────────────────── */
function step() {
  const b = ball;
  b.vy += G;
  b.x += b.vx; b.y += b.vy; b.a += b.vx * 0.06;
  b.vx *= FRICT;
  for (const p of pegs) {
    const dx = b.x - p.x, dy = b.y - p.y;
    const d = Math.hypot(dx, dy), min = PEG_R + BALL_R;
    if (d < min && d > 0) {
      const nx = dx / d, ny = dy / d;
      b.x = p.x + nx * min; b.y = p.y + ny * min;
      const dot = b.vx * nx + b.vy * ny;
      b.vx = (b.vx - 2 * dot * nx) * REST;
      b.vy = (b.vy - 2 * dot * ny) * REST;
      /* a nudge, so a ball landing dead-centre never balances forever */
      b.vx += (Math.random() - .5) * 1.1;
    }
  }
  if (b.x < BALL_R) { b.x = BALL_R; b.vx = Math.abs(b.vx) * REST; }
  if (b.x > W - BALL_R) { b.x = W - BALL_R; b.vx = -Math.abs(b.vx) * REST; }
  draw();
  if (b.y >= H - BALL_R) { land(b.x); return; }        /* ← the loop ENDS here */
  requestAnimationFrame(step);
}
function land(x) {
  running = false;
  ball = null;
  draw();
  $(".rig").classList.remove("is-busy");
  $("#drop").disabled = false;
  let i = edges.findIndex((e, k) => k < edges.length - 1 && x >= e && x < edges[k + 1]);
  if (i < 0) i = clamp(Math.floor(x / W * P.length), 0, P.length - 1);
  drops++;
  select(i, true);
}
function dropAt(x) {
  if (running || REDUCED_FALL()) { if (REDUCED_FALL()) select(pickWeighted(), true); return; }
  running = true;
  $(".rig").classList.add("is-busy");
  $("#drop").disabled = true;
  ball = { x: clamp(x, BALL_R + 2, W - BALL_R - 2), y: 18, vx: (Math.random() - .5) * 1.4, vy: 0, a: 0 };
  requestAnimationFrame(step);
}
/* reduced motion gets the same odds without the animation */
const REDUCED_FALL = () => REDUCED;
function pickWeighted() {
  const r = Math.random() * W;
  const i = edges.findIndex((e, k) => k < edges.length - 1 && r >= e && r < edges[k + 1]);
  return i < 0 ? 0 : i;
}
/* ── selection ─────────────────────────────────────────────────────────── */
function select(i, landed = false) {
  const p = P[i];
  $$(".slots li").forEach((li, k) => {
    li.classList.remove("is-hit");
    if (k === i && landed) { void li.offsetWidth; li.classList.add("is-hit"); }
  });
  $("#cue").textContent = landed
    ? `landed in slot ${String(i + 1).padStart(2, "0")} · ${drops} drop${drops === 1 ? "" : "s"}`
    : `slot ${String(i + 1).padStart(2, "0")} · picked by hand`;
  $("#oName").textContent = p.name;
  $("#oDesc").textContent = p.desc;
  $("#oTags").innerHTML = p.tags.map((t) => `<li>${t}</li>`).join("");
  $("#oYear").textContent = p.year;
  $("#oStatus").textContent = p.status;
  $("#oHits").textContent = drops;
  const a = $("#oLink");
  a.hidden = !p.url;
  if (p.url) { a.href = p.url; a.target = "_blank"; a.rel = "noopener"; }
  const out = $("#out");
  out.classList.remove("is-hit"); void out.offsetWidth; out.classList.add("is-hit");
}
function wireStats(rows) {
  $("#stats").innerHTML = rows.map(([v, k]) =>
    `<div class="stat"><b data-to="${v}">0</b><span>${k}</span></div>`).join("");
  const run = () => $$(".stat b").forEach((n) => {
    const to = +n.dataset.to;
    if (REDUCED) { n.textContent = to; return; }
    const t0 = performance.now();
    const s = (t) => { const k = clamp((t - t0) / 900, 0, 1);
      n.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(s); };
    requestAnimationFrame(s);
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
  cv = $("#cv"); ctx = cv.getContext("2d");
  /* ⭐ slot widths ARE the project sizes, so the odds are the portfolio */
  const total = P.reduce((a, p) => a + p.tags.length, 0);
  $("#slots").innerHTML = P.map((p, i) => {
    const [c, ci] = COL[discipline(p)];
    return `<li style="flex:${p.tags.length} 1 0">
      <button data-i="${i}" style="--c:${c}; --ci:${ci}"
              aria-label="${p.name}, ${p.status}">
        <b>${p.name}</b><span>${p.tags.length} tools</span>
      </button></li>`;
  }).join("");
  $$(".slots button").forEach((b) => b.addEventListener("click", () => select(+b.dataset.i)));
  const measure = () => {
    const base = $("#slots").getBoundingClientRect().left;
    edges = [0];
    $$(".slots li").forEach((li) => edges.push(li.getBoundingClientRect().right - base));
    edges[edges.length - 1] = $("#slots").getBoundingClientRect().width;
    layout();
  };
  measure();
  new ResizeObserver(measure).observe($("#slots"));
  cv.addEventListener("click", (e) => {
    const r = cv.getBoundingClientRect();
    dropAt(e.clientX - r.left);
  });
  $("#drop").addEventListener("click", () => dropAt(W * (0.2 + Math.random() * 0.6)));
  const live = P.filter((p) => p.url).length;
  const tools = new Set(P.flatMap((p) => p.tags)).size;
  wireStats([[P.length, "slots on the board"], [live, "live right now"],
             [tools, "distinct tools"], [total, "tags in play"]]);
  const tick = () => $("#clock").textContent = new Date().toLocaleTimeString("en-AU",
    { timeZone: "Australia/Melbourne", hour: "2-digit", minute: "2-digit" });
  tick(); setInterval(tick, 30000);
  select(0);
}
init();
