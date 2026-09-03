/* VESTIGE — digital preservation
 * ---------------------------------------------------------------------------
 * ⭐ THE NEW MECHANISM: FRAME FEEDBACK — two framebuffers, swapped every frame,
 * so the shader can read its own previous output. Learned from Codrops
 * (Generative Canvas Studio §10.2) and it is the first thing in this gallery
 * that has MEMORY.
 *
 * Every other object here answers where your hand IS. This one holds where your
 * hand HAS BEEN. That is a different verb — 67 leans, 73 resolves, 74 stills,
 * 75 heats, and this one REMEMBERS, then forgets over about twenty seconds.
 *
 * It is load-bearing to the point of being the argument: the company keeps what
 * would otherwise decay, and the plate is a thing that decays unless something
 * holds it.
 *
 * Two passes per frame:
 *   1. SIM   — read the history texture, multiply by a decay constant, add the
 *              new stroke from the cursor, write to the other texture, swap.
 *   2. DRAW  — read the history texture and colour it. No memory here at all.
 *
 * ⚠️ WebGL forbids sampling and writing one framebuffer at once. The swap IS the
 * technique; everything else is bookkeeping.
 */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

const VERT = `attribute vec2 a; varying vec2 v; void main(){ v = a * 0.5 + 0.5; gl_Position = vec4(a, 0.0, 1.0); }`;

/* ── pass 1: the memory ──────────────────────────────────────────────────── */
const SIM = `
precision highp float;
varying vec2 v;
uniform sampler2D u_prev;
uniform vec2  u_res;
uniform vec2  u_p0;      /* previous cursor, in sim space */
uniform vec2  u_p1;      /* current cursor  */
uniform float u_down;    /* 1 while the cursor is over the plate */
uniform float u_decay;
uniform float u_time;

/* distance from a point to the segment p0->p1. Splatting along the SEGMENT and
   not at the point is what makes a fast drag leave a stroke instead of a dotted
   line — the fluid-sim lesson from §10.8. */
float segDist(vec2 p, vec2 a, vec2 b){
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}

void main(){
  vec2 uv = v;
  float ar = u_res.x / u_res.y;
  vec2 q = vec2(uv.x * ar, uv.y);

  /* the history, faded. A tiny outward blur makes the trace SPREAD as it fades,
     the way ink does in paper, instead of just dimming in place. */
  vec2 px = 1.0 / u_res;
  float acc = texture2D(u_prev, uv).r * 4.0;
  acc += texture2D(u_prev, uv + vec2( px.x, 0.0)).r;
  acc += texture2D(u_prev, uv + vec2(-px.x, 0.0)).r;
  acc += texture2D(u_prev, uv + vec2(0.0,  px.y)).r;
  acc += texture2D(u_prev, uv + vec2(0.0, -px.y)).r;
  float prev = acc / 8.0;
  prev *= u_decay;

  /* the new stroke */
  vec2 a0 = vec2(u_p0.x * ar, u_p0.y);
  vec2 a1 = vec2(u_p1.x * ar, u_p1.y);
  float d = segDist(q, a0, a1);
  float add = exp(-d * d / 0.00042) * u_down * 0.85;

  gl_FragColor = vec4(min(prev + add, 1.4), 0.0, 0.0, 1.0);
}`;

/* ── pass 2: the look ────────────────────────────────────────────────────── */
const DRAW = `
precision highp float;
varying vec2 v;
uniform sampler2D u_hist;
uniform vec2  u_res;
uniform float u_time;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main(){
  vec2 uv = v;
  float m = texture2D(u_hist, uv).r;

  /* ⭐ depth -> normal, the §10.5 trick, applied to the memory field itself.
     Two gradients and a normalize turn the trace into a SURFACE, so the plate
     is lit rather than merely tinted. This is the second borrowed mechanism. */
  vec2 px = 1.5 / u_res;
  float l = texture2D(u_hist, uv - vec2(px.x, 0.0)).r;
  float r = texture2D(u_hist, uv + vec2(px.x, 0.0)).r;
  float d = texture2D(u_hist, uv - vec2(0.0, px.y)).r;
  float t = texture2D(u_hist, uv + vec2(0.0, px.y)).r;
  vec3 n = normalize(vec3(-(r - l) * 4.0, -(t - d) * 4.0, 1.0));

  vec3 lightDir = normalize(vec3(-0.45, 0.6, 0.65));
  float lam = max(dot(n, lightDir), 0.0);

  vec3 green = vec3(0.494, 0.722, 0.482);
  vec3 pale  = vec3(0.910, 0.941, 0.902);

  vec3 col = vec3(0.0);
  col += green * m * 0.85;                       /* the trace itself */
  col += pale  * pow(m, 3.0) * 0.9;              /* its hot core */
  col += green * pow(lam, 3.0) * m * 1.4;        /* the lit ridge */
  col += green * 0.02;                           /* the plate is never pure black */

  /* ⚠️ never clamp(); this curve is what keeps the bright core coloured */
  col = vec3(1.0) - exp(-col * 1.9);
  col += (hash(gl_FragCoord.xy + u_time) - 0.5) * 0.022;
  gl_FragColor = vec4(col, 1.0);
}`;

function plate() {
  const cv = $("#gl");
  const gl = cv.getContext("webgl", { antialias: false, alpha: false });
  if (!gl) return null;                        /* the CSS fallback carries it */

  const mk = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  };
  const prog = (fsrc) => {
    const vs = mk(gl.VERTEX_SHADER, VERT), fs = mk(gl.FRAGMENT_SHADER, fsrc);
    if (!vs || !fs) return null;
    const p = gl.createProgram();
    gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.warn(gl.getProgramInfoLog(p)); return null; }
    return p;
  };
  const pSim = prog(SIM), pDraw = prog(DRAW);
  if (!pSim || !pDraw) return null;

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  [pSim, pDraw].forEach((p) => {
    gl.useProgram(p);
    const loc = gl.getAttribLocation(p, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  });

  /* ── the two buffers ──────────────────────────────────────────────────── */
  let SW = 0, SH = 0, fb = [], tex = [], cur = 0;

  function makeTarget(w, h) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    /* ⚠️ LINEAR + CLAMP_TO_EDGE. NEAREST makes the decay blur blocky, and REPEAT
       wraps the trace around the plate, which looks like a bug because it is. */
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    return { t, f };
  }

  function size() {
    const d = Math.min(devicePixelRatio || 1, 1.5);
    cv.width = Math.round(innerWidth * d);
    cv.height = Math.round(innerHeight * d);
    /* the memory runs at HALF resolution. The decay blur hides it completely and
       it halves the fill cost of two passes. */
    SW = Math.max(2, Math.round(cv.width / 2));
    SH = Math.max(2, Math.round(cv.height / 2));
    fb.forEach((o) => { gl.deleteFramebuffer(o.f); gl.deleteTexture(o.t); });
    fb = [makeTarget(SW, SH), makeTarget(SW, SH)];
    tex = fb.map((o) => o.t);
    /* clear both, or the first frames sample uninitialised memory */
    fb.forEach((o) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, o.f);
      gl.viewport(0, 0, SW, SH);
      gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  size();
  addEventListener("resize", size, { passive: true });

  const U = (p, n) => gl.getUniformLocation(p, n);
  const uSim = { prev: U(pSim, "u_prev"), res: U(pSim, "u_res"), p0: U(pSim, "u_p0"),
                 p1: U(pSim, "u_p1"), down: U(pSim, "u_down"), decay: U(pSim, "u_decay"), time: U(pSim, "u_time") };
  const uDraw = { hist: U(pDraw, "u_hist"), res: U(pDraw, "u_res"), time: U(pDraw, "u_time") };

  let px = 0.5, py = 0.5, nx = 0.5, ny = 0.5, down = 0, retained = 0;
  addEventListener("pointermove", (e) => {
    nx = e.clientX / innerWidth;
    ny = 1 - e.clientY / innerHeight;
    down = 1;
  }, { passive: true });
  addEventListener("pointerleave", () => { down = 0; });

  /* on touch there is no hover, so the plate draws its own slow figure once */
  const touch = matchMedia("(hover: none)").matches;
  let auto = 0;

  const t0 = performance.now();
  function frame(now) {
    const t = (now - t0) / 1000;

    if (touch) {
      /* a single slow stroke, drawn once, so a phone still sees what the plate is */
      auto = Math.min(auto + 0.004, 1.0);
      nx = 0.5 + Math.cos(auto * 6.0) * 0.22;
      ny = 0.5 + Math.sin(auto * 4.0) * 0.16;
      down = auto < 1 ? 1 : 0;
    }

    /* ── pass 1: sim into the free buffer, then swap ─────────────────────── */
    const src = cur, dst = 1 - cur;
    gl.useProgram(pSim);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb[dst].f);
    gl.viewport(0, 0, SW, SH);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex[src]);
    gl.uniform1i(uSim.prev, 0);
    gl.uniform2f(uSim.res, SW, SH);
    gl.uniform2f(uSim.p0, px, py);
    gl.uniform2f(uSim.p1, nx, ny);
    gl.uniform1f(uSim.down, REDUCED ? 0 : down);
    /* ⭐ 0.982 per frame ≈ a twenty-second half-life at 60fps. Higher and the
       plate never clears; lower and it is a cursor light, not a memory. */
    gl.uniform1f(uSim.decay, 0.982);
    gl.uniform1f(uSim.time, t);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    px = nx; py = ny;
    cur = dst;

    /* ── pass 2: draw the memory to the screen ───────────────────────────── */
    gl.useProgram(pDraw);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, cv.width, cv.height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex[cur]);
    gl.uniform1i(uDraw.hist, 0);
    gl.uniform2f(uDraw.res, cv.width, cv.height);
    gl.uniform1f(uDraw.time, t);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    /* the readout: how much is still held. Tracked on the CPU rather than read
       back from the GPU — a readPixels every frame would stall the pipeline. */
    retained = Math.max(0, retained * 0.982 + (down ? 0.03 : 0));
    retained = Math.min(retained, 1);
    const pct = Math.round(retained * 100);
    $("#thresh").innerHTML = `PLATE &mdash; <b>${pct}%</b> retained`;
    $("#rev").textContent = (1 - retained).toFixed(3);
    const st = $("#stat");
    st.textContent = pct > 55 ? "HOLDING" : pct > 12 ? "FADING" : "PLATE CLEAR";
    st.classList.toggle("on", pct > 55);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return true;
}

/* ── content ──────────────────────────────────────────────────────────────── */
const ORDERS = [
  ["Three copies", "One with us, one offsite, one you keep.",
   "Different media, different buildings, different failure modes.",
   "A single copy is not a backup, it is a hostage."],
  ["Two formats", "The original bytes, and an open preservation master.",
   "TIFF, WAV, PDF/A — formats that will still open in forty years.",
   "Proprietary formats die with their companies. We keep both."],
  ["One audit a year", "Every byte re-checksummed, every year, and you get the report.",
   "Bit rot is silent. The only way to find it is to look.",
   "Last full fixity audit: 1 August 2026. Nothing failed."],
];

const JOBS = [
  ["I", "A photographer's negatives", "42 TB &middot; since 2014"],
  ["II", "A community radio tape library", "8.1 TB &middot; digitised 2019"],
  ["III", "An architect's drawing archive", "1.4 TB &middot; estate"],
  ["IV", "Twenty years of a studio's masters", "96 TB &middot; active"],
  ["V", "One family's home video", "310 GB &middot; free tier"],
];

const TIERS = [
  ["Under 1 TB", "$0", "free, forever", ["Three copies, two formats", "Annual fixity report", "Because small archives are the ones that vanish"], false],
  ["Standard", "$28", "per TB / year", ["Everything above", "Open preservation masters made for you", "Retrieval always free"], true],
  ["Estate", "$44", "per TB / year", ["Everything above", "Catalogued and described by an archivist", "A named contact for your executor"], false],
];

const QA = [
  ["What happens if you go out of business?", "There is a written escrow arrangement with a state collecting institution, and it is in the contract you sign, not in a blog post. If we fold, the archives move there and your executor is notified. An archive company that has not answered this question has not thought about the problem it claims to solve."],
  ["Why is under a terabyte free?", "Because small archives are the ones that actually disappear. A studio with ninety terabytes has a budget and an IT person; a photographer with 600 gigabytes of negatives has a drive in a drawer. The paid tiers cover the free one, deliberately."],
  ["Is this not just cloud storage?", "No. Cloud storage keeps the bytes you gave it and charges you to read them back. Preservation means checking those bytes are still correct, migrating formats before they become unreadable, and describing the material so somebody can find it in thirty years. The storage is the cheapest part."],
  ["What does an annual audit actually involve?", "Every file's checksum is recomputed and compared to the one recorded at deposit. Any mismatch is repaired from another copy and the incident is written into your report. You get the report whether or not anything failed, because a report that only arrives with bad news teaches you nothing."],
  ["Can I get everything back and leave?", "Yes, at any time, at no cost, on media we supply, with the checksums so you can verify it yourself. Charging people to retrieve their own material is the single most common way archives are lost — the bill arrives, someone decides not to pay it, and that is that."],
];

function init() {
  plate();

  $("#orders").innerHTML = ORDERS.map(([k, d, m, e]) => `
    <article class="order">
      <span class="order__k">${k}</span>
      <h3>${d}</h3>
      <p>${m}</p>
      <span class="order__e">${e}</span>
    </article>`).join("");

  $("#jobs").innerHTML = JOBS.map(([n, t, k]) => `
    <li><a href="#"><span class="no">${n}</span><b>${t}</b><span class="k">${k}</span></a></li>`).join("");

  $("#tiers").innerHTML = TIERS.map(([k, p, u, l, hot]) => `
    <article class="tier${hot ? " tier--hot" : ""}">
      <span class="tier__k">${k}${hot ? " &middot; most deposited" : ""}</span>
      <span class="tier__p">${p}<small>${u}</small></span>
      <ul>${l.map((x) => `<li>${x}</li>`).join("")}</ul>
      <a href="#">${hot ? "Deposit an archive" : "Enquire"}</a>
    </article>`).join("");

  $("#qa").innerHTML = QA.map(([q, a], i) => `
    <details${i === 0 ? " open" : ""}>
      <summary>${q}</summary>
      <div class="a"><div><p>${a}</p></div></div>
    </details>`).join("");

  const rows = $$("#qa details");
  rows.forEach((d) => { if (d.open) d.classList.add("is-open"); });
  const close = (d) => {
    if (!d.open) return;
    d.classList.remove("is-open");
    if (REDUCED) { d.open = false; return; }
    const panel = d.querySelector(".a");
    const done = (e) => {
      if (e.propertyName !== "grid-template-rows") return;
      panel.removeEventListener("transitionend", done);
      if (!d.classList.contains("is-open")) d.open = false;
    };
    panel.addEventListener("transitionend", done);
  };
  rows.forEach((d) => {
    d.querySelector("summary").addEventListener("click", (e) => {
      e.preventDefault();
      if (d.open) { close(d); return; }
      rows.forEach((o) => o !== d && close(o));
      d.open = true;
      requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add("is-open")));
    });
  });

  const tick = () => $("#clock").textContent = new Date().toLocaleTimeString("en-AU",
    { timeZone: "Australia/Melbourne", hour: "2-digit", minute: "2-digit" });
  tick(); setInterval(tick, 30000);
}

init();
