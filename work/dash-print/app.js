/* SUBSTRATE — dashboard 3 of 3, the ENGINEERED MATERIALS route
 * ---------------------------------------------------------------------------
 * Same 541,909-row dataset as the other two dashboards. The object here is a
 * CULTURE PLATE: a Gray–Scott reaction–diffusion run seeded from the data.
 *
 * The one substantive change from the reference, and the reason for it:
 * ref 30 free-runs forever with a sine-modulated feed rate. Per
 * Preferences/Motion Must Be User Driven, nothing large may loop on a timer —
 * and a simulation churning behind live figures is the worst version of that,
 * because it competes with the numbers for attention every single frame.
 * So the sim runs a BOUNDED number of steps and then stops dead. The user
 * re-runs it by choosing a different metric or pressing the button. Same
 * technique, same 1-bit look, no loop.
 */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

const nf = new Intl.NumberFormat("en-GB");
const money = (n) =>
  n >= 1e6 ? "£" + (n / 1e6).toFixed(2) + "m"
: n >= 1e3 ? "£" + Math.round(n / 1e3) + "k"
           : "£" + n.toFixed(2);
const MONTH = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const mlabel = (ym) => { const [y, m] = ym.split("-"); return MONTH[+m - 1] + " " + y.slice(2); };

/* Colony slots, normalised to the dish, ordered centre-outward. Slot 0 is the
   middle and has room for the leader's grown mat; the rest ring it. Slots are
   handed out by RANK ON THE CURRENT METRIC, so switching to basket size
   physically walks the Netherlands into the centre and pushes the UK out to the
   rim — which is the whole point of the control. */
const SLOTS = [[.34,.50],[.70,.27],[.79,.71],[.47,.85],[.15,.79],[.85,.15],[.53,.08]];

/* The sim is coarse on purpose; the CSS `image-rendering: pixelated` blows it
   up, which is the reference's look. SIM_H tracks the dish's aspect ratio —
   the dish goes portrait on a phone, and a fixed 4:3 grid stretched into a 3:4
   box would smear the pattern into ovals. */
const SIM_W = 300;
let SIM_H = 225;
function sizeSim() {
  const r = $("#dishBox").getBoundingClientRect();
  if (!r.width) return;
  SIM_H = Math.max(150, Math.min(430, Math.round(SIM_W * (r.height / r.width))));
}
const STEPS = 1400, PER_FRAME = 28, BUDGET_MS = 4000;

let D = null, metric = "rev", plate = null, colonies = [];

/* ─────────────────────────────────────────────────────────────────────────
   The plate. Returns an object with .seed(colonies) and .run(onDone), or
   null if this browser cannot do the float-target ping-pong it needs.
   ───────────────────────────────────────────────────────────────────────── */
function makePlate(canvas) {
  const gl = canvas.getContext("webgl2", { antialias: false, depth: false });
  if (!gl) return null;

  const VS = `#version 300 es
    in vec2 a_position; out vec2 v_uv;
    void main(){ v_uv = a_position * 0.5 + 0.5; gl_Position = vec4(a_position, 0.0, 1.0); }`;

  const FS_STEP = `#version 300 es
    precision highp float; precision highp sampler2D;
    in vec2 v_uv; out vec4 outColor;
    uniform sampler2D u_state; uniform vec2 u_res;
    uniform float u_f; uniform float u_k; uniform float u_da; uniform float u_db; uniform float u_dt;
    void main(){
      vec2 s = 1.0 / u_res;
      vec2 c  = texture(u_state, v_uv).xy;
      vec2 n  = texture(u_state, v_uv + vec2(0.0,  s.y)).xy;
      vec2 so = texture(u_state, v_uv - vec2(0.0,  s.y)).xy;
      vec2 e  = texture(u_state, v_uv + vec2(s.x,  0.0)).xy;
      vec2 w  = texture(u_state, v_uv - vec2(s.x,  0.0)).xy;
      vec2 ne = texture(u_state, v_uv + vec2( s.x,  s.y)).xy;
      vec2 nw = texture(u_state, v_uv + vec2(-s.x,  s.y)).xy;
      vec2 se = texture(u_state, v_uv + vec2( s.x, -s.y)).xy;
      vec2 sw = texture(u_state, v_uv + vec2(-s.x, -s.y)).xy;
      vec2 lap = 0.2 * (n + so + e + w) + 0.05 * (ne + nw + se + sw) - c;
      float a = c.x, b = c.y, abb = a * b * b;
      float na = a + (u_da * lap.x - abb + u_f * (1.0 - a)) * u_dt;
      float nb = b + (u_db * lap.y + abb - (u_k + u_f) * b) * u_dt;
      outColor = vec4(clamp(na, 0.0, 1.0), clamp(nb, 0.0, 1.0), 0.0, 1.0);
    }`;

  /* 1-bit. A hard step() is what gives the ragged edge — a smoothstep here
     would produce a soft grey blob and lose the whole character. */
  const FS_DRAW = `#version 300 es
    precision highp float;
    in vec2 v_uv; out vec4 outColor;
    uniform sampler2D u_state;
    void main(){
      float val = step(0.3, texture(u_state, v_uv).y);
      vec3 paper = vec3(0.8862, 0.8941, 0.9254);   /* #E2E4E7 */
      vec3 ink   = vec3(0.0549, 0.0666, 0.0862);   /* #0E1116 */
      outColor = vec4(mix(paper, ink, val), 1.0);
    }`;

  const sh = (t, src) => {
    const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); return null; }
    return s;
  };
  const prog = (fs) => {
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(p)); return null; }
    return p;
  };
  const pStep = prog(FS_STEP), pDraw = prog(FS_DRAW);
  if (!pStep || !pDraw) return null;

  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pStep, "a_position");
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  /* Float render targets are an extension, and it is NOT universal. Try 32F,
     fall back to 16F, and if neither framebuffer is complete give up cleanly
     so the caller can draw the plain fallback — the reference just prints an
     error box, which is a worse outcome than a legible static plot. */
  gl.getExtension("EXT_color_buffer_float");
  gl.getExtension("EXT_color_buffer_half_float");
  gl.getExtension("OES_texture_float_linear");

  let fmt = null;
  sizeSim();
  for (const [internal, type] of [[gl.RGBA32F, gl.FLOAT], [gl.RGBA16F, gl.HALF_FLOAT]]) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, SIM_W, SIM_H, 0, gl.RGBA, type, null);
    const f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.deleteFramebuffer(f); gl.deleteTexture(t);
    if (ok) { fmt = { internal, type }; break; }
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (!fmt) return null;

  const tex = (data) => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, fmt.internal, SIM_W, SIM_H, 0, gl.RGBA, fmt.type, data);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST],
                          [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]])
      gl.texParameteri(gl.TEXTURE_2D, k, v);
    return t;
  };
  const fb = (t) => {
    const f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    return f;
  };

  let tA, tB, fA, fB, ping = 0, raf = 0;

  const U = {
    res: gl.getUniformLocation(pStep, "u_res"), f: gl.getUniformLocation(pStep, "u_f"),
    k: gl.getUniformLocation(pStep, "u_k"),     da: gl.getUniformLocation(pStep, "u_da"),
    db: gl.getUniformLocation(pStep, "u_db"),   dt: gl.getUniformLocation(pStep, "u_dt"),
    st: gl.getUniformLocation(pStep, "u_state"), stD: gl.getUniformLocation(pDraw, "u_state"),
  };

  function seed(cols) {
    cancelAnimationFrame(raf);
    canvas.width = SIM_W; canvas.height = SIM_H;
    const Arr = fmt.type === gl.FLOAT ? Float32Array : Uint16Array;
    /* 16F needs half-float bit patterns; 1.0 is 0x3C00 and 0.0 is 0x0000, and
       those are the only two values the seed ever writes, so a lookup beats
       pulling in a float→half converter. */
    const ONE = fmt.type === gl.FLOAT ? 1 : 0x3C00, ZERO = 0;
    const data = new Arr(SIM_W * SIM_H * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = ONE; data[i + 1] = ZERO; data[i + 2] = ZERO; data[i + 3] = ONE;
    }
    const SEED_R = 2.6, r2 = SEED_R * SEED_R;
    for (const c of cols) {
      /* WebGL's v_uv.y = 0 is the BOTTOM of the framebuffer, so texture row 0
         renders at the bottom. The ring overlay is a 2D canvas with y growing
         downward. Writing (1 - ny) here as well flipped the sim against the
         annotations and two rings ended up circling blank paper. */
      const cx = c.nx * SIM_W, cy = c.ny * SIM_H;
      for (const [ox, oy] of c.pts) {
        const px = cx + ox, py = cy + oy;
        const x0 = Math.max(0, Math.floor(px - SEED_R)), x1 = Math.min(SIM_W - 1, Math.ceil(px + SEED_R));
        const y0 = Math.max(0, Math.floor(py - SEED_R)), y1 = Math.min(SIM_H - 1, Math.ceil(py + SEED_R));
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
          const dx = x - px, dy = y - py;
          if (dx * dx + dy * dy < r2) data[(y * SIM_W + x) * 4 + 1] = ONE;
        }
      }
    }
    if (tA) { gl.deleteTexture(tA); gl.deleteTexture(tB); gl.deleteFramebuffer(fA); gl.deleteFramebuffer(fB); }
    tA = tex(data); tB = tex(null); fA = fb(tA); fB = fb(tB); ping = 0;
  }

  function pass(n) {
    gl.viewport(0, 0, SIM_W, SIM_H);
    gl.useProgram(pStep); gl.bindVertexArray(vao);
    gl.uniform2f(U.res, SIM_W, SIM_H);
    gl.uniform1f(U.f, 0.0545); gl.uniform1f(U.k, 0.062);
    gl.uniform1f(U.da, 1.0);   gl.uniform1f(U.db, 0.5); gl.uniform1f(U.dt, 1.0);
    gl.uniform1i(U.st, 0);
    for (let i = 0; i < n; i++) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, ping % 2 === 0 ? fB : fA);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, ping % 2 === 0 ? tA : tB);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      ping++;
    }
  }

  function paint() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, SIM_W, SIM_H);
    gl.useProgram(pDraw); gl.bindVertexArray(vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, ping % 2 === 0 ? tA : tB);
    gl.uniform1i(U.stD, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  /* Bounded. Reduced-motion gets the settled plate with no animation at all —
     the end state is the information, the growing was only ever the reveal. */
  function run(onTick, onDone) {
    cancelAnimationFrame(raf);
    let done = 0;
    if (REDUCED) { pass(STEPS); paint(); onDone(STEPS); return; }
    const t0 = performance.now();
    const frame = () => {
      pass(PER_FRAME); done += PER_FRAME; paint(); onTick(done);
      if (done >= STEPS || performance.now() - t0 > BUDGET_MS) { onDone(done); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  }

  return { seed, run, stop: () => cancelAnimationFrame(raf) };
}

/* Fallback plate: no float targets, so draw the colonies as flat discs. Not
   the same picture, but it still says the true thing — one market swamps the
   rest — which an error box does not. */
function flatPlate(canvas, cols) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const r = canvas.getBoundingClientRect();
  canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
  const c = canvas.getContext("2d");
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.fillStyle = "#E2E4E7"; c.fillRect(0, 0, r.width, r.height);
  c.fillStyle = "#0E1116";
  const k = r.width / SIM_W;
  for (const col of cols) {
    const cx = col.nx * r.width, cy = (1 - col.ny) * r.height;
    for (const [ox, oy] of col.pts) {
      c.beginPath();
      c.arc(cx + ox * k, cy + oy * k, Math.max(2, 3.4 * k), 0, Math.PI * 2);
      c.fill();
    }
  }
}

/* ── the annotation layer: rings and colony numbers, in lab red ──────────── */
function drawRings(lit) {
  const cv = $("#ring"), box = $("#dishBox");
  const r = box.getBoundingClientRect();
  if (!r.width) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
  const c = cv.getContext("2d");
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, r.width, r.height);
  const k = r.width / SIM_W;

  colonies.forEach((col, i) => {
    const x = col.nx * r.width, y = (1 - col.ny) * r.height;
    const rad = Math.max(13, col.R * k + 10);
    const on = lit === i;
    c.strokeStyle = "#A8341C";
    c.lineWidth = on ? 2.5 : 1;
    c.globalAlpha = on ? 1 : .55;
    c.beginPath(); c.arc(x, y, rad, 0, Math.PI * 2); c.stroke();
    if (on) {
      c.beginPath();
      c.moveTo(x - rad - 9, y); c.lineTo(x - rad - 2, y);
      c.moveTo(x + rad + 2, y); c.lineTo(x + rad + 9, y);
      c.moveTo(x, y - rad - 9); c.lineTo(x, y - rad - 2);
      c.moveTo(x, y + rad + 2); c.lineTo(x, y + rad + 9);
      c.stroke();
    }
    c.globalAlpha = 1;
    c.fillStyle = "#A8341C";
    c.font = `500 ${on ? 12 : 11}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    /* the label flips to the inside when the colony sits against the dish wall,
       rather than being clipped off the edge */
    const lbl = String(i + 1).padStart(2, "0");
    const w = c.measureText(lbl).width;
    const lx = Math.min(Math.max(3, x + rad + 5), r.width - w - 3);
    const ly = Math.min(Math.max(12, y - rad - 3), r.height - 4);
    c.fillText(lbl, lx, ly);
  });
}

/* ── seeding: COUNT is the honest part, not size ──────────────────────────
   First attempt encoded share as the seed RADIUS. It looked good and it was
   wrong: Gray–Scott has a preferred wavelength, so a big seed and a small one
   both settle into rings of the same size and the plate forgets what it was
   given. Measured at 1,400 steps, seven colonies of wildly different seeds
   came out as seven near-identical rings — the share had vanished.

   What the reaction DOES preserve is how many spots there are. So share is
   spot count: each market gets round(share × 70) seed points scattered in a
   disc whose radius keeps the density constant. The black area then really is
   the share, and it stays the share all the way through growth. */
function buildColonies() {
  const rows = D.countries.slice(0, SLOTS.length);
  const val = (c) => metric === "rev" ? c.rev : metric === "orders" ? c.orders : c.rev / c.orders;
  const total = rows.reduce((a, c) => a + val(c), 0);

  /* deterministic scatter — the same market lands the same way every run, so
     switching metric reads as a change in the data, not a reshuffle */
  const rng = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);

  /* rank on THIS metric decides the slot; the colony number stays the market's
     revenue rank so the table's 01…07 still points at the right blot */
  const order = rows.map((c, i) => i).sort((a, b) => val(rows[b]) - val(rows[a]));
  const slotOf = [];
  order.forEach((idx, place) => { slotOf[idx] = SLOTS[place]; });

  colonies = rows.map((c, i) => {
    const share = (val(c) / total) * 100;
    const n = Math.max(1, Math.round((share / 100) * 70));
    /* constant density: area ∝ n, so R ∝ √n. The constant is set so the
       leader's grown mat stays inside the dish — measured, the reaction spreads
       roughly 47 sim-px past the seeded disc, and 44 + 47 clears 300x225. */
    const R = Math.min(44, 6.6 * Math.sqrt(n));
    const rand = rng(i * 7919 + 13);
    const pts = [];
    for (let j = 0; j < n; j++) {
      const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * R;
      pts.push([Math.cos(a) * d, Math.sin(a) * d]);
    }
    return { name: c.name, nx: slotOf[i][0], ny: slotOf[i][1], share, n, R, pts };
  });
}

function culture() {
  sizeSim();
  buildColonies();
  const label = metric === "rev" ? "Revenue" : metric === "orders" ? "Orders" : "Basket size";
  const spots = colonies.reduce((a, c) => a + c.n, 0);
  $("#metaL").textContent =
    `Seeded from ${label.toLowerCase()} · ${colonies.length} colonies · ${spots} spots`;

  if (!plate) {
    flatPlate($("#sim"), colonies);
    $("#metaR").textContent = "Static plot · no float targets";
    drawRings(-1);
    return;
  }
  plate.seed(colonies);
  $("#metaR").textContent = REDUCED ? "Settled" : "Culturing…";
  plate.run(
    () => {},
    (n) => { $("#metaR").textContent = `${nf.format(n)} steps · settled`; }
  );
  drawRings(-1);
}

/* ── the year, as a stepped cross-section ────────────────────────────────── */
function drawProfile() {
  const ms = D.months, W = 1200, H = 300, TOP = 26;
  const max = Math.max(...ms.map((m) => m.rev));
  const w = W / ms.length;
  const y = (m) => H - (m.rev / max) * (H - TOP);

  const full = ms.slice(0, -1);
  let d = `M0,${H}`;
  full.forEach((m, i) => { d += ` L${(i * w).toFixed(1)},${y(m).toFixed(1)} L${((i + 1) * w).toFixed(1)},${y(m).toFixed(1)}`; });
  d += ` L${(full.length * w).toFixed(1)},${H} Z`;

  const last = ms.at(-1), lx = full.length * w, ly = y(last);
  const peak = ms.reduce((a, b) => (b.rev > a.rev ? b : a));
  const trough = full.reduce((a, b) => (b.rev < a.rev ? b : a));
  const py = y(peak), ty = y(trough);

  $("#prBody").innerHTML = `
    <path d="${d}" fill="var(--ink)"/>
    <rect x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" width="${w.toFixed(1)}" height="${(H - ly).toFixed(1)}"
          fill="url(#hatch)" opacity=".45"/>
    <line x1="0" y1="${py.toFixed(1)}" x2="${W}" y2="${py.toFixed(1)}"
          stroke="var(--oxide)" stroke-width="1.5" stroke-dasharray="6 5"/>
    <line x1="0" y1="${ty.toFixed(1)}" x2="${W}" y2="${ty.toFixed(1)}"
          stroke="var(--oxide)" stroke-width="1.5" stroke-dasharray="6 5" opacity=".5"/>`;

  /* The reference lines need their values on them. A chart that draws a peak
     line and then makes the reader go and find the number is doing half a job.
     These are HTML, not <text>: the svg is preserveAspectRatio="none", which
     would stretch any type inside it horizontally. */
  $$(".prof__mk").forEach((e) => e.remove());
  const mk = (yy, txt) => {
    const el = document.createElement("span");
    el.className = "prof__mk";
    el.style.top = (yy / H * 100).toFixed(2) + "%";
    el.textContent = txt;
    $(".prof__plot").appendChild(el);
  };
  mk(py, `Peak ${mlabel(peak.m)} · ${money(peak.rev)}`);
  mk(ty, `Trough ${mlabel(trough.m)} · ${money(trough.rev)}`);

  $("#prAxis").innerHTML = ms.map((m) =>
    `<span>${MONTH[+m.m.split("-")[1] - 1]}</span>`).join("");

  $("#prLede").textContent =
    `${mlabel(peak.m)} took ${money(peak.rev)} against ${mlabel(trough.m)}'s ` +
    `${money(trough.rev)} — a factor of ${(peak.rev / trough.rev).toFixed(1)}. The last column is ` +
    `hatched because the data stops on ${D.lastDate}; that fall is the calendar, not demand.`;
}

/* ── boot ────────────────────────────────────────────────────────────────── */
async function init() {
  try {
    const r = await fetch("data.json");
    if (!r.ok) throw new Error("HTTP " + r.status);
    D = await r.json();
  } catch (e) {
    $("h1").textContent = "The dataset did not load.";
    $("#dishFail").hidden = false;
    $("#dishFail").textContent = e.message;
    return;
  }

  $("#ftSrc").textContent = D.source;

  /* specimens */
  const shown = D.countries.reduce((a, c) => a + c.share, 0);
  $("#spLede").textContent =
    `${D.countries.length} of ${D.kpi.countries} markets are listed. Between them they carry ` +
    `${shown.toFixed(1)}% of ${money(D.kpi.revenue)}; the remaining ${D.kpi.countries - D.countries.length} ` +
    `share what is left.`;

  const maxRev = D.countries[0].rev;
  $("#spBody").innerHTML = D.countries.map((c, i) => `
    <tr tabindex="0" data-i="${i}">
      <td><span class="cno">${String(i + 1).padStart(2, "0")}</span></td>
      <td class="mkt">${c.name}</td>
      <td class="n">${money(c.rev)}</td>
      <td class="n">${nf.format(c.orders)}</td>
      <td class="n">${c.share.toFixed(1)}%</td>
      <td class="w"><span class="rule"><i data-w="${((c.rev / maxRev) * 100).toFixed(1)}"></i></span></td>
    </tr>`).join("");

  const lite = (i) => { $$("#spBody tr").forEach((t) => t.classList.toggle("is-lit", +t.dataset.i === i)); drawRings(i); };
  $$("#spBody tr").forEach((tr) => {
    tr.addEventListener("pointerenter", () => lite(+tr.dataset.i));
    tr.addEventListener("focus", () => lite(+tr.dataset.i));
  });
  $("#spBody").addEventListener("pointerleave", () => lite(-1));

  drawProfile();

  /* findings */
  $("#fnds").innerHTML = D.findings.map((f) => `
    <article class="fnd">
      <span class="conf conf--${f.confidence}">Confidence ${f.confidence}</span>
      <h3 class="fnd__h">${f.headline}</h3>
      <p class="fnd__d">${f.detail}</p>
      <p class="fnd__a">${f.action}</p>
      <p class="fnd__w">${f.why}</p>
    </article>`).join("");

  /* audit */
  $("#exBody").innerHTML = D.excluded.map((e) => `
    <tr><td>${e.label}</td><td class="n">${nf.format(e.rows)}</td><td>${e.why}</td></tr>`).join("") + `
    <tr><td>Total removed</td><td class="n">${nf.format(D.excludedTotal)}</td>
        <td>${((D.excludedTotal / D.rawRows) * 100).toFixed(1)}% of ${nf.format(D.rawRows)} source rows.
            ${nf.format(D.keptRows)} rows carry every figure on this page.</td></tr>`;
  $("#lims").innerHTML = D.limits.map((l) => `<li>${l}</li>`).join("");

  /* the plate */
  plate = makePlate($("#sim"));
  if (!plate) $("#metaR").textContent = "Static plot";

  $$(".seg__b").forEach((b) =>
    b.addEventListener("click", () => {
      metric = b.dataset.k;
      $$(".seg__b").forEach((o) => o.classList.toggle("is-on", o === b));
      culture();
    })
  );
  $("#grow").addEventListener("click", culture);

  /* A resize only needs the rings redrawn. It needs a full re-culture solely
     when the dish's ASPECT changed — that is when the sim grid changes shape
     and the old texture no longer maps onto the box. */
  let rt = 0, lastAspect = SIM_H;
  addEventListener("resize", () => {
    drawRings(-1);
    clearTimeout(rt);
    rt = setTimeout(() => {
      sizeSim();
      if (Math.abs(SIM_H - lastAspect) > 8) { lastAspect = SIM_H; culture(); }
    }, 280);
  }, { passive: true });

  culture();

  /* the share rules fill once, on reach */
  const fill = () => $$(".rule i").forEach((i) => (i.style.width = i.dataset.w + "%"));
  if (REDUCED || !("IntersectionObserver" in window)) fill();
  else {
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { fill(); io.unobserve(e.target); } });
    }, { threshold: .2 });
    io.observe($("#spTbl"));
  }
}

init();
