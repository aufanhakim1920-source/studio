/* SIGNAL — landing page 1 of 3
 * ---------------------------------------------------------------------------
 * ⭐ The centrepiece is a single warped ribbon of light, drawn in RAW WebGL.
 *
 * Technique learned from reference 33 (Sci-Fi SSO Login) — the one Aufan
 * pointed at — but rebuilt without Three.js. Ref 33 pulls a 2021-pinned
 * three.min.js off a CDN for what is, in the end, one fullscreen quad and one
 * fragment shader. Written directly it is ~60 lines, has no dependency, and
 * cannot break because a CDN moved.
 *
 * The shader recipe, kept from the reference:
 *   · a ring SDF at a fixed centre
 *   · simplex noise warping its radius over time, so it breathes rather than spins
 *   · the mouse nudging the centre, so the light leans toward the cursor
 *   · 1 - exp(-c) tone mapping, which is what makes the core blow out to white
 *     while the edges stay coloured — the thing that reads as "glow"
 *
 * ⚠️ Why continuous motion is fine here: the rule Aufan set is about MANY
 * INDEPENDENT MOVERS ("those particles are too stimulating"). The test he gave
 * is "can you point at what is moving?" — here it is one arc. One thing, one
 * slow motion, nothing to re-fixate on.
 */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── the light ─────────────────────────────────────────────────────────── */
const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `precision highp float;
uniform vec2  u_res;
uniform float u_time;
uniform vec2  u_mouse;

/* simplex-ish value noise — cheap, and smooth enough to warp a curve */
vec2 hash(vec2 p){
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}
float noise(in vec2 p){
  const float K1 = 0.366025404, K2 = 0.211324865;
  vec2 i = floor(p + (p.x + p.y) * K1);
  vec2 a = p - i + (i.x + i.y) * K2;
  float m = step(a.y, a.x);
  vec2 o = vec2(m, 1.0 - m);
  vec2 b = a - o + K2, c = a - 1.0 + 2.0 * K2;
  vec3 h = max(0.5 - vec3(dot(a,a), dot(b,b), dot(c,c)), 0.0);
  vec3 n = h*h*h*h * vec3(dot(a, hash(i)), dot(b, hash(i+o)), dot(c, hash(i+1.0)));
  return dot(n, vec3(70.0));
}
float fbm(vec2 p){ return noise(p) * 0.6 + noise(p * 2.1) * 0.3 + noise(p * 4.3) * 0.1; }

/* one ring, its radius pushed around by noise so it reads as a ribbon */
float ribbon(vec2 uv, vec2 c, float r, float w, float warp){
  vec2 d = uv - c;
  float a = atan(d.y, d.x);
  float rr = r + fbm(vec2(cos(a), sin(a)) * 1.6 + u_time * 0.09) * warp;
  float dist = abs(length(d) - rr);
  return w / (dist + w * 0.55);
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  uv.x *= u_res.x / u_res.y;
  vec2 m = (u_mouse - 0.5) * 0.14;
  vec2 c = vec2(u_res.x / u_res.y * 0.5, 0.44) + m;

  vec3 col = vec3(0.0);
  /* three passes of the SAME arc at different radii — still one shape, read as
     depth. Not three independent movers: they share a centre and a phase. */
  col += vec3(0.16, 0.36, 1.00) * ribbon(uv, c, 0.30, 0.0022, 0.075) * 1.30;
  col += vec3(0.42, 0.62, 1.00) * ribbon(uv, c, 0.335, 0.0013, 0.062) * 0.95;
  col += vec3(0.85, 0.92, 1.00) * ribbon(uv, c, 0.318, 0.0006, 0.068) * 0.70;

  /* a soft bloom under it so the ribbon sits in air rather than on the page */
  col += vec3(0.05, 0.13, 0.42) * (0.09 / (length(uv - c) + 0.22));

  col = vec3(1.0) - exp(-col * 1.9);          /* the thing that makes it glow */
  float vig = 1.0 - 0.55 * length(uv - vec2(u_res.x / u_res.y * 0.5, 0.5));
  gl_FragColor = vec4(col * vig, 1.0);
}`;

function light() {
  const cv = $("#gl");
  const gl = cv.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
  if (!gl) return;                 /* the CSS fallback on #gl already covers this */

  const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); return null; }
    return s; };
  const pr = gl.createProgram();
  const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr); gl.useProgram(pr);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, "p");
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = { res: gl.getUniformLocation(pr, "u_res"),
              time: gl.getUniformLocation(pr, "u_time"),
              mouse: gl.getUniformLocation(pr, "u_mouse") };

  let mx = .5, my = .5, cx = .5, cy = .5;
  addEventListener("pointermove", (e) => { mx = e.clientX / innerWidth; my = 1 - e.clientY / innerHeight; }, { passive: true });

  const size = () => {
    /* capped DPR — a full-screen shader at 3x on a laptop is heat for nothing */
    const d = Math.min(devicePixelRatio || 1, 1.6);
    cv.width = Math.round(innerWidth * d); cv.height = Math.round(innerHeight * d);
    gl.viewport(0, 0, cv.width, cv.height);
  };
  size();
  addEventListener("resize", size, { passive: true });

  const t0 = performance.now();
  const frame = () => {
    cx += (mx - cx) * .05; cy += (my - cy) * .05;      /* the light lags the cursor */
    gl.uniform2f(U.res, cv.width, cv.height);
    gl.uniform1f(U.time, (performance.now() - t0) / 1000);
    gl.uniform2f(U.mouse, cx, cy);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(frame);
  };
  if (REDUCED) {                       /* one still frame, no loop */
    gl.uniform2f(U.res, cv.width, cv.height);
    gl.uniform1f(U.time, 6.0); gl.uniform2f(U.mouse, .5, .5);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  } else frame();
}

/* ── content ───────────────────────────────────────────────────────────── */
const CARDS = [
  ["01", "The agent", "One read-only binary next to your service. It reports timing, status and the commit SHA it was built from. It cannot write, and it cannot see your payloads."],
  ["02", "The line", "Everything it sees streams to a single view. No dashboards to build, no query language to learn — the interesting thing is already on top."],
  ["03", "You", "The only part you touch. Point it at a service, get a link, and share the link. That is the whole product."],
];
const NUMS = [
  ["4", "min", "median setup, first service"],
  ["1.2", "ms", "added per request, p99"],
  ["100", "%", "of errors traced to a commit"],
  ["0", "", "payload bytes stored, ever"],
];
const QA = [
  ["Does it slow anything down?", "It adds 1.2ms at p99 and runs off the hot path. If the agent dies your service does not notice — it is a reader, not a proxy."],
  ["Where does the data live?", "In the region you pick, and only there. Nothing crosses a border, and payload bodies are never stored — only timings, statuses and the commit they came from."],
  ["What if we already have tracing?", "Then you already have the hard part. SIGNAL is the layer that answers “which deploy did this” without you writing a query, and it will sit alongside whatever you run."],
  ["Can I turn it off?", "One flag, and the agent stops. No lock-in, no export ceremony — your data is a download while the account exists and deleted within 30 days after."],
];
const TICK = ["build 4812 green", "p99 1.2ms", "3 regions", "commit a91f2c deployed", "0 payloads stored", "uptime 99.98%"];

/* ── reveal once, on arrival ───────────────────────────────────────────── */
function reveals() {
  const els = $$(".rv");
  if (REDUCED || !("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    const sibs = [...e.target.parentElement.querySelectorAll(".rv")];
    e.target.style.transitionDelay = Math.min(sibs.indexOf(e.target), 5) * 70 + "ms";
    e.target.classList.add("in");
    io.unobserve(e.target);                      /* once, never again */
  }), { threshold: .16, rootMargin: "0px 0px -8% 0px" });
  els.forEach((e) => io.observe(e));
}

function init() {
  light();

  $("#cards").innerHTML = CARDS.map(([n, h, p]) =>
    `<article class="card rv"><span class="card__n">${n}</span><h3>${h}</h3><p>${p}</p></article>`).join("");
  /* the cursor lights the card it is over — pointer-driven, per the rule */
  $$(".card").forEach((c) => c.addEventListener("pointermove", (e) => {
    const r = c.getBoundingClientRect();
    c.style.setProperty("--mx", (e.clientX - r.left) + "px");
    c.style.setProperty("--my", (e.clientY - r.top) + "px");
  }));

  $("#nums").innerHTML = NUMS.map(([v, u, k]) =>
    `<div class="stat rv"><b data-to="${v}">0<small>${u}</small></b><span>${k}</span></div>`).join("");

  /* ── the questions ───────────────────────────────────────────────────────
     A bare <details> snaps open with zero motion — the browser toggles display
     on the content, so there is nothing to transition. Aufan caught exactly this:
     the hero got a hand-written shader and this got the default.

     ⭐ The fix: keep <details> for semantics and no-JS, but drive the open state
     ourselves so the panel can be ANIMATED. The panel is a grid whose row goes
     0fr -> 1fr, which is the only way to transition to an unknown height.
     Opening one closes the other, so a click always moves two things.          */
  $("#qa").innerHTML = QA.map(([q, a], i) =>
    `<details class="rv"${i === 0 ? " open" : ""}>
       <summary><span class="q">${q}</span></summary>
       <div class="a"><div><p>${a}</p></div></div>
     </details>`).join("");

  const rows = $$("#qa details");
  rows.forEach((d) => { if (d.open) d.classList.add("is-open"); });

  const close = (d) => {
    if (!d.open) return;
    d.classList.remove("is-open");
    if (REDUCED) { d.open = false; return; }
    /* wait for the collapse to finish before removing [open], or the content
       disappears instantly and the animation plays against nothing */
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
      /* one frame at 0fr before flipping to 1fr, or the browser coalesces both
         values into the same style recalc and there is no transition at all */
      requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add("is-open")));
    });
  });

  const strip = TICK.map((t) => `<span>${t}</span>`).join("<b>/</b>");
  $("#tick").innerHTML = strip + "<b>/</b>" + strip + "<b>/</b>";

  reveals();

  /* counters run once, when they arrive */
  const io = "IntersectionObserver" in window && !REDUCED
    ? new IntersectionObserver((es) => es.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        const b = e.target.querySelector("b"), to = parseFloat(b.dataset.to);
        const unit = b.querySelector("small").outerHTML;
        const t0 = performance.now(), dec = to % 1 !== 0;
        const step = (t) => {
          const k = Math.min((t - t0) / 900, 1);
          const v = to * (1 - Math.pow(1 - k, 3));
          b.innerHTML = (dec ? v.toFixed(1) : Math.round(v)) + unit;
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }), { threshold: .4 })
    : null;
  if (io) $$(".stat").forEach((s) => io.observe(s));
  else $$(".stat b").forEach((b) => (b.innerHTML = b.dataset.to + b.querySelector("small").outerHTML));

  /* the ticker: ONE element translating, not a marquee of many */
  if (!REDUCED) {
    const t = $("#tick");
    let x = 0;
    const w = () => t.scrollWidth / 2;
    const run = () => { x -= .35; if (-x >= w()) x = 0; t.style.transform = `translateX(${x}px)`; requestAnimationFrame(run); };
    requestAnimationFrame(run);
  }

  /* buttons lean toward the cursor when it is close */
  if (!REDUCED) $$(".mag").forEach((b) => {
    b.addEventListener("pointermove", (e) => {
      const r = b.getBoundingClientRect();
      b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .16}px, ${(e.clientY - r.top - r.height / 2) * .22}px)`;
    });
    b.addEventListener("pointerleave", () => (b.style.transform = ""));
  });

  const tick = () => $("#clock").textContent = new Date().toLocaleTimeString("en-AU",
    { timeZone: "Australia/Melbourne", hour: "2-digit", minute: "2-digit" });
  tick(); setInterval(tick, 30000);
}

init();
