/* CARILLON — a bell foundry
 * ---------------------------------------------------------------------------
 * ⭐ THE NEW MECHANISM (Generative Canvas Studio §10.8): STORE THE TIME, NOT THE
 * STATE. The single best idea in today's Codrops batch.
 *
 * The page holds ONE number per bar — the moment it was struck. Nothing is
 * integrated, nothing is stepped, no velocity is carried between frames. The
 * shader is handed sixteen strike times and computes each bar's entire damped
 * swing from how long ago it happened:
 *
 *     dt    = now - strikeTime
 *     env   = exp(-dt * DECAY)
 *     angle = env * AMP * sin(dt * FREQ)
 *
 * Sixteen bars ringing independently, at different pitches, with ZERO per-frame
 * state updates. They cannot drift, cannot desync, and adding a hundred more
 * would cost the CPU nothing at all.
 *
 * The verb is RINGS. 67 leans · 73 resolves · 74 stills · 75 heats ·
 * VESTIGE remembers · TREMOR ripples. Nothing here has been struck before.
 *
 * On theme: a carillon is literally a rank of tuned bars, and tuning is what the
 * foundry sells. The object is the product.
 */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

const BARS = 16;

const VERT = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform vec2  u_res;
uniform float u_time;
uniform float u_strike[${BARS}];   /* WHEN each bar was hit. That is all. */

const float DECAY = 1.35;   /* how fast the swing dies       */
const float AMP   = 0.34;   /* radians at the moment of hit  */
const float GLOW  = 2.4;    /* how fast the ring-light dies  */

/* a rounded rod, as a signed distance field.
   ⚠️ This parameter must NOT be named 'half' - it is a reserved word in GLSL
   ES 1.00. And the note saying so must not be written with backticks: the whole
   shader lives inside a JS template literal, so a backtick in a COMMENT closes
   the string early and the GLSL below it is parsed as JavaScript.
   Both faults hid behind the CSS fallback, which looked deliberate. */
float sdRod(vec2 p, vec2 hs, float r){
  vec2 d = abs(p) - hs + r;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
  float ar = u_res.x / u_res.y;
  float off = 0.34 * smoothstep(0.95, 1.5, ar);
  vec2 p = uv - vec2(off, -0.06);

  vec3 cobalt = vec3(0.000, 0.180, 0.541);
  vec3 bone   = vec3(0.918, 0.929, 0.976);
  vec3 yellow = vec3(0.992, 0.878, 0.278);

  vec3 col = vec3(0.0);
  float ink = 0.0;      /* how much bar is under this pixel */

  /* the pivot bar the rods hang from */
  float rail = sdRod(p - vec2(0.0, 0.30), vec2(0.31, 0.012), 0.012);
  /* ⚠️ NOT smoothstep(0.004, 0.0, d). GLSL says smoothstep is UNDEFINED when
     edge0 >= edge1, and this driver returns 0 — which silently deleted every
     bar on the page while the shader compiled and ran perfectly. Reversing an
     SDF must be written as 1.0 - smoothstep(lo, hi, d). */
  ink = max(ink, 1.0 - smoothstep(0.0, 0.004, rail));

  for (int i = 0; i < ${BARS}; i++){
    float fi = float(i);
    float x  = (fi / float(${BARS} - 1) - 0.5) * 0.56;

    /* longer bars ring lower and swing slower — the rank is a scale */
    float len  = 0.28 - fi * 0.0105;
    float freq = 7.0 + fi * 0.9;

    float dt  = u_time - u_strike[i];
    float env = u_strike[i] < 0.0 ? 0.0 : exp(-dt * DECAY);
    float ang = env * AMP * sin(dt * freq);

    /* rotate the PIXEL into the bar's frame, about the rail */
    vec2 q = p - vec2(x, 0.30);
    float c = cos(-ang), s = sin(-ang);
    q = vec2(q.x * c - q.y * s, q.x * s + q.y * c);
    q.y += len * 0.5;                     /* hang it below the pivot */

    float d = sdRod(q, vec2(0.014, len * 0.5), 0.013);
    float body = 1.0 - smoothstep(0.0, 0.004, d);

    /* the ring: a halo that decays faster than the swing, so a struck bar
       flashes and then keeps moving quietly */
    float ringLight = u_strike[i] < 0.0 ? 0.0 : exp(-dt * GLOW);
    float halo = 0.014 / (abs(d) + 0.014);

    ink = max(ink, body);
    col += yellow * halo * ringLight * 0.85;
    col += bone * body * (0.55 + ringLight * 0.5);
  }

  /* the ground, with the bars punched into it */
  vec3 bg = cobalt * (1.0 - 0.30 * length(p * vec2(0.7, 1.0)));
  col += bg * (1.0 - ink * 0.86);

  /* ⚠️ never clamp() — the struck bar's halo has to roll off, not clip flat */
  col = vec3(1.0) - exp(-col * 1.6);

  col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.016;
  gl_FragColor = vec4(col, 1.0);
}`;

function rank() {
  const cv = $("#gl");
  const gl = cv.getContext("webgl", { antialias: false, alpha: false });
  if (!gl) return null;

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

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(p, "a");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(p, "u_res");
  const uTime = gl.getUniformLocation(p, "u_time");
  const uStrike = gl.getUniformLocation(p, "u_strike");

  let W = 0, H = 0;
  function size() {
    const d = Math.min(devicePixelRatio || 1, 1.6);
    W = Math.round(innerWidth * d); H = Math.round(innerHeight * d);
    cv.width = W; cv.height = H;
    gl.viewport(0, 0, W, H);
  }
  size();
  addEventListener("resize", size, { passive: true });

  /* ⭐ THE ENTIRE STATE OF THE ANIMATION. Sixteen floats. -1 means never struck. */
  const strike = new Float32Array(BARS).fill(-1);
  const t0 = performance.now();
  const now = () => (performance.now() - t0) / 1000;

  /* which bar is under a screen x, in the shader's own coordinate space */
  function barAt(cx, cy) {
    const m = Math.min(innerWidth, innerHeight);
    const ar = innerWidth / innerHeight;
    const off = 0.34 * Math.max(0, Math.min(1, (ar - 0.95) / 0.55));
    const x = (cx - innerWidth / 2) / m - off;
    const y = -((cy - innerHeight / 2) / m) + 0.06;
    /* only the band the rods actually hang in */
    if (y > 0.31 || y < -0.06) return -1;
    const i = Math.round((x / 0.56 + 0.5) * (BARS - 1));
    if (i < 0 || i >= BARS) return -1;
    const bx = (i / (BARS - 1) - 0.5) * 0.56;
    return Math.abs(x - bx) < 0.020 ? i : -1;
  }

  /* strike on ENTER, not on hover — a bar that re-rings every frame you sit on
     it is a buzzer, not a bell (the xylophone's rule, §10.8) */
  let lastBar = -1, rung = 0;
  addEventListener("pointermove", (e) => {
    if (REDUCED) return;
    const i = barAt(e.clientX, e.clientY);
    if (i >= 0 && i !== lastBar) { strike[i] = now(); rung++; }
    lastBar = i;
  }, { passive: true });
  addEventListener("pointerdown", (e) => {
    const i = barAt(e.clientX, e.clientY);
    if (i >= 0) { strike[i] = now(); rung++; }
  });

  /* touch has no hover, so play a short run once so the rank is understood */
  const touch = matchMedia("(hover: none)").matches;
  if (touch || REDUCED) {
    let k = 0;
    const play = setInterval(() => {
      strike[k % BARS] = now(); rung++;
      if (++k >= BARS) clearInterval(play);
    }, 190);
  }

  function frame() {
    const t = now();
    gl.uniform2f(uRes, W, H);
    gl.uniform1f(uTime, t);
    gl.uniform1fv(uStrike, strike);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    /* a bar counts as ringing while its envelope is still audible */
    let live = 0;
    for (let i = 0; i < BARS; i++) {
      if (strike[i] >= 0 && Math.exp(-(t - strike[i]) * 1.35) > 0.04) live++;
    }
    $("#thresh").innerHTML = `RANK &mdash; <b>${live}</b> ringing`;
    $("#rev").textContent = (440 + Math.min(live, 8) * 0.4).toFixed(1);
    const st = $("#stat");
    st.textContent = live > 5 ? "FULL PEAL" : live > 0 ? "RINGING" : "SILENT";
    st.classList.toggle("on", live > 5);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return true;
}

/* ── content ──────────────────────────────────────────────────────────────── */
const ORDERS = [
  ["Mould", "Loam and horse manure, still.",
   "A strickle board sweeps the profile in clay around a brick core.",
   "The recipe has not changed since the 1400s because nothing has beaten it."],
  ["Pour", "78% copper, 22% tin, at 1,120°C.",
   "Bell metal, and the ratio is not negotiable — 20% is dull, 24% is brittle.",
   "One pour. A bell that cracks in the mould is scrap and we start again."],
  ["Tune", "Five partials, on a vertical lathe.",
   "Hum, prime, tierce, quint and nominal, brought into true by removing metal.",
   "It takes a week per bell and you can only ever take metal off."],
];

const JOBS = [
  ["I", "St Paul's, Bendigo &mdash; ring of 8", "1962 &middot; still hanging"],
  ["II", "Melbourne Town Hall &mdash; recast", "1998"],
  ["III", "A 47-bell carillon, Perth", "2004"],
  ["IV", "Ship's bell, HMAS Warramunga", "2019"],
  ["V", "One bell, for a farm gate", "2024"],
];

const TIERS = [
  ["Small bell", "$1,900", "up to 25 kg", ["Cast, tuned and certified", "Your inscription on the waist", "Eight weeks"], false],
  ["Tower bell", "$210", "per kg", ["50 kg to 2 tonnes", "Tuned to your existing ring", "Headstock and fittings included"], true],
  ["Recast", "$96", "per kg", ["We melt your cracked bell", "Same metal, new bell, same voice", "The inscription is copied by hand"], false],
];

const QA = [
  ["Can you match a bell we already have?", "Usually. Send us a recording — a phone recording is genuinely enough — and we will pull the five partials out of it. Matching an old ring matters more than matching concert pitch, because a new bell that is technically correct and a quarter-tone off the other seven is worse than no bell at all."],
  ["Why can a cracked bell not just be welded?", "Bell metal is 22% tin, which makes it hard, bright and completely unweldable — it is closer to glass than to steel in how it fails. The only honest repair is to melt it and cast it again, which is why a recast costs less than half a new bell: you already own the metal."],
  ["How long does one take?", "Eight weeks for a small bell, four to six months for a tower bell, and about eighteen months for a full carillon. Most of that is not the casting. The mould takes days, the pour takes minutes, and the tuning takes a week per bell and cannot be hurried."],
  ["Does a bigger bell mean a lower note?", "Yes, and it is roughly inverse — halving the note means about eight times the metal. That is why a tower with a low tenor is expensive: the bottom bell alone can outweigh the other seven together, and it is priced by the kilo."],
  ["What happens if it comes out wrong?", "If the note is sharp we tune it down, which is the normal case. If it is flat we cannot add metal, so it goes back in the furnace and we cast it again at our cost. That happens about twice a year and it is the reason we quote eight weeks and not four."],
];

function init() {
  rank();

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
      <span class="tier__k">${k}${hot ? " &middot; most cast" : ""}</span>
      <span class="tier__p">${p}<small>${u}</small></span>
      <ul>${l.map((x) => `<li>${x}</li>`).join("")}</ul>
      <a href="#">${hot ? "Commission a bell" : "Enquire"}</a>
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
