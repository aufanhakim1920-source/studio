/* SYMBOLON — brand identity at the threshold
 * ---------------------------------------------------------------------------
 * ⭐ THE OBJECT: a sign held between legible and obscured.
 *
 * The studio's own line is "we architect meaning by controlling the threshold
 * between the known and the obscured". So the hero IS that threshold: a sigil
 * burning inside a field of ember noise. Move toward it and the fire recedes and
 * the mark resolves; move away and it is consumed. The cursor is the control.
 *
 * Built in the register of gallery 67 — the build Aufan ranked #1 — following
 * the recipe in [[Generative Canvas Studio]] §8:
 *   · raw WebGL, no library (ref 42 has no shader at all; 67's reference loaded
 *     a whole 3D library to draw one quad. Take the technique, leave the CDN.)
 *   · SDF + divide for the glow. No blur, no bloom pass.
 *   · 1 - exp(-c) tone mapping, never clamp(). One line, most of the difference.
 *   · one committed accent on a near-black ground
 *   · the response is LERPED — instant reads as a hover state, lagged reads as
 *     something with mass
 *
 * It is NOT 67 repainted: 67 is a warped ring that leans toward you, this is a
 * hard-edged mark fighting a turbulent field. Different object, same craft —
 * which is the distinction [[Invent a New Object]] actually asks for.
 */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

const VERT = `
attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform vec2  u_res;
uniform float u_time;
uniform float u_reveal;   /* 0 = obscured, 1 = known */
uniform vec2  u_mouse;

/* value noise + fbm. Cheap, and turbulent enough to read as fire. */
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), u.x),
             mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.02; a *= 0.5; }
  return v;
}

/* ── the sigil, as signed distance fields ────────────────────────────────
   A ring, a stem, and a small circle above it. Three primitives is enough:
   the mark has to read at a glance and survive being half-eaten by fire.   */
float sdRing(vec2 p, float r, float w){ return abs(length(p) - r) - w; }
float sdSeg(vec2 p, vec2 a, vec2 b, float w){
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - w;
}
float sigil(vec2 p){
  float d = sdRing(p + vec2(0.0, 0.05), 0.30, 0.004);
  d = min(d, sdRing(p - vec2(0.0, 0.30), 0.075, 0.004));
  d = min(d, sdSeg(p, vec2(0.0, -0.35), vec2(0.0, 0.22), 0.004));
  d = min(d, sdSeg(p, vec2(-0.16, -0.05), vec2(0.16, -0.05), 0.004));
  return d;
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
  float t  = u_time;
  float rv = u_reveal;

  /* ⚠️ The sign sits to the RIGHT of the headline, never behind it. First pass
     centred it and the gold italic line read through a bright glowing ring — the
     same fault recorded on SOLSTICE, where a blurred core under large type turned
     the letters to mud. The offset only applies on wide screens; on a phone the
     copy is below the object anyway. */
  float off = 0.34 * smoothstep(0.95, 1.5, u_res.x / u_res.y);
  uv -= vec2(off, 0.02);
  /* and the whole object is scaled DOWN: at 1.0 the ring bled back across the
     headline even when offset. An object that leads the page still has to leave
     the copy a clean column. */
  uv *= 1.48;

  /* the fire: fbm rising, warped by a second fbm so it curls */
  vec2 q = uv * 2.2;
  q += vec2(fbm(q * 1.6 + t * 0.10), fbm(q * 1.6 - t * 0.12)) * 0.55;
  float flame = fbm(q + vec2(0.0, -t * 0.42));

  /* it lives in a disc around the centre, not across the whole screen */
  float core = 1.0 - smoothstep(0.08, 0.72, length(uv * vec2(1.0, 1.25)));
  float heat = pow(max(flame, 0.0), 1.7) * core;

  /* ⭐ the threshold. As reveal rises the fire is pushed OUT into a ring and
     starves the middle, so the mark is uncovered rather than faded in. */
  float hollow = smoothstep(0.0, 0.42 * rv + 0.001, length(uv) - 0.06 * rv);
  heat *= mix(1.0, hollow, rv * 0.92);
  heat *= 1.0 - rv * 0.30;

  /* ⭐ the mark. w / (|d| + w) is the whole glow — no blur anywhere. */
  float d = sigil(uv);
  float w = 0.0045;
  float mark = w / (abs(d) + w);
  mark *= 0.18 + rv * 1.55;

  /* a hair of chromatic separation on the mark, so gold reads as metal */
  float mark2 = w / (abs(sigil(uv * 1.004)) + w) * (0.10 + rv * 0.85);

  vec3 ember = vec3(0.851, 0.420, 0.153);
  vec3 gold  = vec3(0.788, 0.659, 0.506);
  vec3 cream = vec3(1.000, 0.969, 0.878);

  vec3 col = vec3(0.0);
  col += ember * heat * 2.3;
  col += vec3(1.0, 0.55, 0.18) * pow(heat, 3.0) * 1.6;      /* the hot core */
  col += mix(gold, cream, rv) * mark;
  col += gold * mark2 * 0.5;

  /* a faint ground glow so the near-black is never flat */
  col += ember * 0.045 * core;

  /* ⚠️ NEVER clamp() here. Added light clipped to flat white is exactly the
     cheap-glow look; this curve rolls off and keeps the hue. */
  col = vec3(1.0) - exp(-col * 1.9);

  /* grain, to stop the gradients banding on a dark screen */
  col += (hash(gl_FragCoord.xy + t) - 0.5) * 0.022;

  gl_FragColor = vec4(col, 1.0);
}`;

function shader() {
  const cv = $("#gl");
  const gl = cv.getContext("webgl", { antialias: false, alpha: false });
  if (!gl) return null;                       /* the CSS fallback carries it */

  const mk = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  };
  const vs = mk(gl.VERTEX_SHADER, VERT), fs = mk(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const p = gl.createProgram();
  gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.warn(gl.getProgramInfoLog(p)); return null; }
  gl.useProgram(p);

  /* one fullscreen triangle — cheaper than a quad and has no seam */
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(p, "a");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = {
    res: gl.getUniformLocation(p, "u_res"),
    time: gl.getUniformLocation(p, "u_time"),
    reveal: gl.getUniformLocation(p, "u_reveal"),
    mouse: gl.getUniformLocation(p, "u_mouse"),
  };

  let W = 0, H = 0;
  function size() {
    const d = Math.min(devicePixelRatio || 1, 1.75);
    W = Math.round(innerWidth * d); H = Math.round(innerHeight * d);
    cv.width = W; cv.height = H;
    gl.viewport(0, 0, W, H);
  }
  size();
  addEventListener("resize", size, { passive: true });

  /* ⭐ the threshold: how close the pointer is to the sign, LERPED.
     Instant would read as a hover state. Lagged reads as something with mass —
     §8.1 point 4, and it is most of why 67 does not look AI-made. */
  let target = 0, reveal = 0, mx = 0.5, my = 0.5;
  addEventListener("pointermove", (e) => {
    mx = e.clientX / innerWidth; my = e.clientY / innerHeight;
    /* aim at where the sign actually IS, which is offset right on wide screens */
    const ar = innerWidth / innerHeight;
    const off = 0.34 * Math.max(0, Math.min(1, (ar - 0.95) / 0.55));
    const dx = (mx - 0.5) * ar - off, dy = my - 0.46;
    target = Math.max(0, 1 - Math.hypot(dx, dy) / 0.60);
  }, { passive: true });
  addEventListener("pointerleave", () => { target = 0; });

  /* on a touch screen there is no pointer to approach with, so scroll drives it */
  const touch = matchMedia("(hover: none)").matches;
  if (touch) addEventListener("scroll", () => {
    target = Math.max(0, 1 - scrollY / (innerHeight * 0.9));
  }, { passive: true });
  if (touch) target = 1;

  const t0 = performance.now();
  function frame(now) {
    reveal += (target - reveal) * 0.055;
    const t = REDUCED ? 0 : (now - t0) / 1000;
    gl.uniform2f(U.res, W, H);
    gl.uniform1f(U.time, t);
    gl.uniform1f(U.reveal, reveal);
    gl.uniform2f(U.mouse, mx, my);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    const pct = Math.round(reveal * 100);
    $("#thresh").innerHTML = `THRESHOLD &mdash; <b>${pct}%</b> resolved`;
    $("#rev").textContent = reveal.toFixed(3);
    const st = $("#stat");
    st.textContent = pct > 62 ? "RESOLVED" : pct > 22 ? "EMERGING" : "OBSCURED";
    st.classList.toggle("on", pct > 62);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return true;
}

/* ── content ──────────────────────────────────────────────────────────────── */
const ORDERS = [
  ["Icon", "The sign that physically resembles the signified.",
   "Form, topology, visual memory.", "A pictorial mark. Read before it is understood."],
  ["Index", "The sign that is causally connected to the signified.",
   "Evidence, trace, implication of action.", "Smoke for fire. The mark that proves something happened."],
  ["Symbol", "The sign related to the signified by convention alone.",
   "Cultivated meaning, learned association.", "The hardest and the most durable. It has to be taught, then it cannot be unlearned."],
];

const JOBS = [
  ["I", "Nocturne Rail", "Identity &amp; wayfinding"],
  ["II", "Peirce &amp; Hall", "Mark, type, editorial"],
  ["III", "The Salt Institute", "Naming &amp; identity"],
  ["IV", "Ferrous", "Industrial identity system"],
  ["V", "Obscura Press", "Imprint &amp; series design"],
];

const TIERS = [
  ["A reading", "$2,400", "fixed", ["Two weeks", "One written position on your current mark", "No design work"], false],
  ["A mark", "$26,000", "from", ["Ten to fourteen weeks", "Identity, type and a written system", "Two rounds at each stage"], true],
  ["A system", "$68,000", "from", ["Six months", "Mark, type, motion, environment", "We stay through rollout"], false],
];

const QA = [
  ["Why does the reading cost money?", "Because it is the work. Most of what we are paid for is deciding what a mark has to do before anyone draws it — and a studio that gives that away free is either not doing it, or charging you for it inside a number labelled something else."],
  ["Do you present three options?", "No. We present one, with the reasoning that produced it and the two directions we closed on the way. Three options is a way of transferring the decision back to the client, which is the one thing you were paying us not to do."],
  ["How long until we see something?", "Between four and six weeks on a mark engagement. The first three are reading, naming and writing; nothing is drawn until we agree in words what the sign has to carry."],
  ["Can you work alongside our team?", "Yes, and it works best when your team owns rollout. We build the system and the written rules, and hand over something your designers can extend without ringing us in eighteen months."],
  ["What if we already have a logo we like?", "Then we may tell you to keep it. A reading ends in a position, and sometimes the position is that the mark is fine and the problem is everything around it."],
];

function init() {
  shader();

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
      <span class="tier__k">${k}${hot ? " &middot; most taken" : ""}</span>
      <span class="tier__p">${p}<small>${u}</small></span>
      <ul>${l.map((x) => `<li>${x}</li>`).join("")}</ul>
      <a href="#">${hot ? "Commission a mark" : "Enquire"}</a>
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
