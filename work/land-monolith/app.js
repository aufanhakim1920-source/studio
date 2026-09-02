/* MONOLITH — landing page 2 of 3
 * ---------------------------------------------------------------------------
 * ⭐ THE OBJECT: a wireframe solid, hand-rolled. No three.js, no library.
 *
 * Technique from the vault's [[Hand Rolled 3D Wireframe]] template (ref 09):
 * an explicit vertex + edge list, raw rotation matrices, one-divide perspective
 * projection, and a painter's sort so the far edges draw first and read dimmer.
 * It is about forty lines and it cannot break because a CDN moved.
 *
 * The visitor turns it: SCROLL rotates it through the page, DRAG spins it
 * directly with momentum that decays to a stop. One object, one motion —
 * which is the actual constraint in [[Motion Must Be User Driven]] (the thing
 * that made Aufan ill was many independent movers, not motion itself).
 */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── an icosahedron, by hand ───────────────────────────────────────────── */
const PHI = (1 + Math.sqrt(5)) / 2;
const V = [];
[[0, 1, PHI], [0, -1, PHI], [0, 1, -PHI], [0, -1, -PHI]].forEach(([a, b, c]) => {
  V.push([a, b, c], [b, c, a], [c, a, b]);
});
/* edges = every vertex pair at the icosahedron's shortest distance */
const E = [];
{
  let min = Infinity;
  for (let i = 0; i < V.length; i++)
    for (let j = i + 1; j < V.length; j++)
      min = Math.min(min, Math.hypot(V[i][0] - V[j][0], V[i][1] - V[j][1], V[i][2] - V[j][2]));
  for (let i = 0; i < V.length; i++)
    for (let j = i + 1; j < V.length; j++) {
      const d = Math.hypot(V[i][0] - V[j][0], V[i][1] - V[j][1], V[i][2] - V[j][2]);
      if (Math.abs(d - min) < 1e-6) E.push([i, j]);
    }
}

function solid() {
  const cv = $("#cv"), ctx = cv.getContext("2d");
  let W = 0, H = 0, rx = -0.5, ry = 0.4, vx = 0, vy = 0, drag = false, px = 0, py = 0;
  let scrollRot = 0;

  const size = () => {
    const r = cv.getBoundingClientRect();
    const d = Math.min(devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    cv.width = Math.round(W * d); cv.height = Math.round(H * d);
    ctx.setTransform(d, 0, 0, d, 0, 0);
  };

  const rot = (p, ax, ay) => {
    let [x, y, z] = p;
    let c = Math.cos(ay), s = Math.sin(ay);
    [x, z] = [x * c - z * s, x * s + z * c];
    c = Math.cos(ax); s = Math.sin(ax);
    [y, z] = [y * c - z * s, y * s + z * c];
    return [x, y, z];
  };

  function draw() {
    if (!W) return;
    ctx.clearRect(0, 0, W, H);
    const R = Math.min(W, H) * 0.26, cx = W / 2, cy = H / 2, D = 4.6;

    const pts = V.map((p) => {
      const [x, y, z] = rot(p, rx + scrollRot * 0.6, ry + scrollRot);
      const k = D / (D + z);                       /* one divide = perspective */
      return { x: cx + x * R * k, y: cy + y * R * k, z, k };
    });

    /* painter's sort: far edges first, and dimmer, so depth reads without
       any shading model at all */
    const edges = E.map(([a, b]) => ({ a, b, z: (pts[a].z + pts[b].z) / 2 }))
                   .sort((m, n) => m.z - n.z);

    edges.forEach((e) => {
      const t = (e.z + 2) / 4;                     /* 0 far … 1 near */
      ctx.strokeStyle = t > .55 ? "#1C00FF" : "rgba(21,21,22," + (0.18 + t * 0.5).toFixed(2) + ")";
      ctx.lineWidth = 0.9 + t * 2.1;
      ctx.beginPath();
      ctx.moveTo(pts[e.a].x, pts[e.a].y);
      ctx.lineTo(pts[e.b].x, pts[e.b].y);
      ctx.stroke();
    });

    /* the vertices, as squares, because circles would soften a brutalist page */
    pts.forEach((p) => {
      const t = (p.z + 2) / 4, s = 2.5 + t * 4;
      ctx.fillStyle = t > .55 ? "#1C00FF" : "#151516";
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    });
  }

  const loop = () => {
    if (!drag) {
      rx += vy; ry += vx;
      vx *= 0.94; vy *= 0.94;                      /* momentum decays to rest */
    }
    draw();
    /* it keeps ticking only while there is momentum left to spend */
    if (Math.abs(vx) > 1e-4 || Math.abs(vy) > 1e-4 || drag) requestAnimationFrame(loop);
    else running = false;
  };
  let running = false;
  const kick = () => { if (!running && !REDUCED) { running = true; requestAnimationFrame(loop); } };

  cv.addEventListener("pointerdown", (e) => {
    drag = true; px = e.clientX; py = e.clientY;
    cv.setPointerCapture(e.pointerId); kick();
  });
  addEventListener("pointermove", (e) => {
    if (!drag) return;
    vx = (e.clientX - px) * 0.006; vy = (e.clientY - py) * 0.006;
    rx += vy; ry += vx;
    px = e.clientX; py = e.clientY;
    draw();
  });
  addEventListener("pointerup", () => { if (drag) { drag = false; kick(); } });

  size(); draw();
  addEventListener("resize", () => { size(); draw(); }, { passive: true });

  return {
    scroll(v) { scrollRot = v; draw(); },
  };
}

/* ── content ───────────────────────────────────────────────────────────── */
const FACES = [
  ["01", "Monolith Text", 400, "Regular", "for reading"],
  ["02", "Monolith Text", 500, "Medium", "for interface"],
  ["03", "Monolith Display", 600, "Semibold", "for headings"],
  ["04", "Monolith Display", 900, "Black", "for shouting"],
  ["05", "Monolith Mono", 400, "Mono", "for numbers"],
  ["06", "Monolith Mono", 500, "Mono Medium", "for tables"],
];
const SPEC = [
  ["6", "faces in the family"],
  ["948", "glyphs per face"],
  ["2", "variable axes"],
  ["1", "price, once"],
];

function init() {
  const S = solid();

  $("#faces-l").innerHTML = FACES.map(([n, name, w, label, use]) => `
    <li><button type="button">
      <span class="no">${n}</span>
      <b>${name}</b>
      <span class="sp" style="--w:${w}">Aa</span>
      <span class="fw">${label} &middot; ${use}</span>
    </button></li>`).join("");

  $("#spec-g").innerHTML = SPEC.map(([v, k]) =>
    `<div class="cell"><b>${v}</b><span>${k}</span></div>`).join("");

  const word = "MONOLITH — SIX FACES — ONE PRICE — ";
  $("#band").innerHTML = (word + word).split(" — ").filter(Boolean)
    .map((w, i) => (i % 2 ? `<i>${w}</i>` : `<span>${w}</span>`)).join("<span>—</span>");

  /* the headline rises out of its mask on arrival, once */
  const lns = $$(".ln");
  if (REDUCED || !("IntersectionObserver" in window)) lns.forEach((l) => l.classList.add("in"));
  else {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }), { threshold: .3 });
    lns.forEach((l) => io.observe(l));
  }

  /* scroll drives: the progress rule, the solid's rotation, the band */
  const band = $("#band");
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? scrollY / max : 0;
    document.documentElement.style.setProperty("--p", p.toFixed(4));
    S.scroll(p * Math.PI * 2.2);
    if (!REDUCED) band.style.transform = `translateX(${-(scrollY * 0.35) % (band.scrollWidth / 2 || 1)}px)`;
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* the price counts up, once */
  const amt = $("#amt");
  const runAmt = () => {
    const to = 240;
    if (REDUCED) { amt.textContent = to; return; }
    const t0 = performance.now();
    const s = (t) => { const k = Math.min((t - t0) / 900, 1);
      amt.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(s); };
    requestAnimationFrame(s);
  };
  if ("IntersectionObserver" in window) {
    const io2 = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { runAmt(); io2.disconnect(); }
    }), { threshold: .4 });
    io2.observe($(".price"));
  } else runAmt();

  const tick = () => $("#clock").textContent = new Date().toLocaleTimeString("en-AU",
    { timeZone: "Australia/Melbourne", hour: "2-digit", minute: "2-digit" });
  tick(); setInterval(tick, 30000);
}

init();
