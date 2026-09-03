/* TREMOR — earthquake early warning
 * ---------------------------------------------------------------------------
 * ⭐ TWO NEW MECHANISMS, both learned from Codrops today:
 *
 * §10.7 WAVE PROPAGATION WITH NO PER-CELL STATE.
 *   The grid stores nothing. A short ring buffer of touch points is the entire
 *   simulation: each carries x, y, its age, and how fast the pointer was moving
 *   when it was laid down. Every pixel asks how far it is from each point's
 *   expanding wavefront (`radius = speed * age`), applies a Gaussian window and
 *   a cosine, and that is the height.
 *
 *   ⚠️ Overlapping waves are AVERAGED, not summed. Summing turns to noise the
 *   instant two fronts meet — that single line is the difference between this
 *   and a mess.
 *
 * §10.5 DEPTH -> NORMAL RELIGHTING.
 *   Two gradients of that height field give a surface normal:
 *       normal = normalize(vec3(-dH/dx, -dH/dy, 1))
 *   and the field is LIT rather than tinted. It is why the ripples read as a
 *   material with a direction of light, instead of a colour ramp.
 *
 * The verb is RIPPLES — 67 leans, 73 resolves, 74 stills, 75 heats, VESTIGE
 * remembers. Nothing here has spread outward from a point before.
 *
 * On theme: an early-warning network exists because waves propagate at a known
 * speed. The object is the physics the product is sold on.
 */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

const MAX_PTS = 10;

const VERT = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform vec2  u_res;
uniform float u_time;
/* x, y, birth time, strength */
uniform vec4  u_pts[${MAX_PTS}];

const float SPEED  = 0.42;    /* wavefront radius per second */
const float WIDTH  = 0.055;   /* Gaussian half-width of the front */
const float FREQ   = 46.0;    /* ripples inside the envelope */
const float FADE   = 2.6;     /* seconds; points retire at FADE * 4 */

/* the height field. No state anywhere — every pixel derives its own value. */
float height(vec2 p, float t){
  float sum = 0.0, weight = 0.0;
  for (int i = 0; i < ${MAX_PTS}; i++){
    vec4 s = u_pts[i];
    if (s.w <= 0.0) continue;
    float age = t - s.z;
    if (age < 0.0 || age > FADE * 4.0) continue;

    float dist    = length(p - s.xy);
    float front   = SPEED * age;
    float rel     = dist - front;

    float fade    = exp(-age / FADE);            /* time decay        */
    float atten   = 1.0 / (1.0 + dist * 2.2);    /* distance decay    */
    float w       = exp(-(rel * rel) / (WIDTH * WIDTH));  /* the envelope */

    float amp = fade * atten * s.w;
    /* ⚠️ AVERAGE, do not sum */
    sum    += amp * w * cos(FREQ * rel);
    weight += amp * w;
  }
  return weight > 0.0001 ? sum / max(weight, 0.35) * min(weight * 2.2, 1.0) : 0.0;
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
  float off = 0.28 * smoothstep(0.95, 1.5, u_res.x / u_res.y);
  vec2 p = uv - vec2(off, 0.02);
  float t = u_time;

  float h = height(p, t);

  /* ⭐ depth -> normal. Two gradients, one normalize. */
  float e = 1.6 / min(u_res.x, u_res.y);
  float hx = height(p + vec2(e, 0.0), t) - height(p - vec2(e, 0.0), t);
  float hy = height(p + vec2(0.0, e), t) - height(p - vec2(0.0, e), t);
  /* ⚠️ 9.0 made the surface read as quilted padding rather than ripples */
  vec3 n = normalize(vec3(-hx * 6.0, -hy * 6.0, 1.0));

  vec3 lightDir = normalize(vec3(-0.5, 0.55, 0.68));
  float lam  = max(dot(n, lightDir), 0.0);
  float spec = pow(lam, 26.0);

  /* the plate is a light material, so the ripples DARKEN and brighten it rather
     than glowing on it — an emissive treatment on a light ground reads as fog */
  vec3 ground = vec3(0.949, 0.953, 0.961);
  vec3 blue   = vec3(0.247, 0.373, 0.839);

  float disc = 1.0 - smoothstep(0.10, 0.66, length(p * vec2(1.0, 1.15)));
  /* ⚠️ the same copy guard as ABYSSAL: the field is dimmed over the text column
     on wide screens, softly, so no visible edge is cut into the surface. */
  float guard = mix(1.0, smoothstep(-0.46, 0.04, uv.x), smoothstep(0.95, 1.5, u_res.x / u_res.y));
  disc *= mix(0.20, 1.0, guard);

  vec3 col = ground;
  col = mix(col, ground * 0.80, (1.0 - lam) * abs(h) * 2.4 * disc);   /* shade */
  col = mix(col, blue, clamp(max(h, 0.0) * 1.5, 0.0, 0.85) * disc);   /* crest */
  col += vec3(1.0) * spec * abs(h) * 1.1 * disc;                      /* highlight */

  /* the resting surface is not blank: a faint station grid, so the page has an
     object even before anything is touched */
  vec2 g = fract(p * 26.0) - 0.5;
  float dots = smoothstep(0.10, 0.03, length(g));
  col = mix(col, ground * 0.90, dots * 0.5 * disc);

  col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.012;
  gl_FragColor = vec4(col, 1.0);
}`;

function field() {
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
  const uPts = gl.getUniformLocation(p, "u_pts");

  let W = 0, H = 0;
  function size() {
    /* the height field is evaluated FIVE times per pixel (value + four gradient
       samples), each looping over the points — so cap the buffer hard */
    const d = Math.min(devicePixelRatio || 1, 1.25);
    W = Math.round(innerWidth * d); H = Math.round(innerHeight * d);
    cv.width = W; cv.height = H;
    gl.viewport(0, 0, W, H);
  }
  size();
  addEventListener("resize", size, { passive: true });

  /* the entire simulation state: ten points, oldest overwritten */
  const pts = new Float32Array(MAX_PTS * 4);
  let head = 0, live = 0;
  const t0 = performance.now();
  const now = () => (performance.now() - t0) / 1000;

  function toField(cx, cy) {
    const m = Math.min(innerWidth, innerHeight);
    const ar = innerWidth / innerHeight;
    const off = 0.28 * Math.max(0, Math.min(1, (ar - 0.95) / 0.55));
    return [
      (cx - innerWidth / 2) / m - off,
      -((cy - innerHeight / 2) / m) - 0.02,
    ];
  }

  function drop(cx, cy, strength) {
    const [x, y] = toField(cx, cy);
    const i = head * 4;
    pts[i] = x; pts[i + 1] = y; pts[i + 2] = now(); pts[i + 3] = strength;
    head = (head + 1) % MAX_PTS;
  }

  /* ⭐ points are laid on DISTANCE, not on a timer (§10.10). A timer keeps
     dropping fronts while the cursor sits still; distance means the ripples are
     a record of movement. */
  let lastX = 0, lastY = 0, acc = 0;
  addEventListener("pointermove", (e) => {
    if (REDUCED) return;
    const d = Math.hypot(e.clientX - lastX, e.clientY - lastY);
    lastX = e.clientX; lastY = e.clientY;
    acc += d;
    if (acc > innerWidth / 11) { acc = 0; drop(e.clientX, e.clientY, Math.min(0.35 + d / 40, 1.0)); }
  }, { passive: true });
  addEventListener("pointerdown", (e) => drop(e.clientX, e.clientY, 1.0));

  /* on touch there is no hover, so the network sends its own event periodically */
  const touch = matchMedia("(hover: none)").matches;
  if (touch || REDUCED) {
    const auto = () => drop(innerWidth * (0.3 + Math.random() * 0.4),
                            innerHeight * (0.25 + Math.random() * 0.3), 1.0);
    auto(); setInterval(auto, 3400);
  }

  function frame() {
    const t = now();
    live = 0;
    for (let i = 0; i < MAX_PTS; i++) {
      const age = t - pts[i * 4 + 2];
      if (pts[i * 4 + 3] > 0 && age < 2.6 * 4) live++;
    }
    gl.uniform2f(uRes, W, H);
    gl.uniform1f(uTime, t);
    gl.uniform4fv(uPts, pts);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    $("#thresh").innerHTML = `GROUND &mdash; <b>${live}</b> front${live === 1 ? "" : "s"} active`;
    $("#rev").textContent = (1.8 - Math.min(live, 6) * 0.06).toFixed(1);
    const st = $("#stat");
    st.textContent = live > 4 ? "EVENT" : live > 0 ? "DETECTING" : "QUIET";
    st.classList.toggle("on", live > 4);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return true;
}

/* ── content ──────────────────────────────────────────────────────────────── */
const ORDERS = [
  ["Detect", "A P-wave reaches the nearest station first.",
   "412 accelerometers, most of them in people's sheds.",
   "One station is noise. Four in agreement is an earthquake."],
  ["Decide", "Location and magnitude, inside 1.8 seconds.",
   "Solved from the first arrivals, then refined as more report.",
   "The hard part is not detecting it. It is not crying wolf."],
  ["Deliver", "The alert outruns the shaking.",
   "Push, radio tone, and a single UDP packet for machines.",
   "At 100 km you get about thirty seconds. That is a lift stopped at a floor."],
];

const JOBS = [
  ["I", "Metro rail &mdash; automatic braking", "12 ms to act"],
  ["II", "Two hospitals &mdash; surgery hold", "Statewide"],
  ["III", "A gas network &mdash; valve isolation", "Automatic"],
  ["IV", "Public app &mdash; 240,000 phones", "Free"],
  ["V", "School siren network", "Free"],
];

const TIERS = [
  ["Public feed", "$0", "free, forever", ["Push alerts to any phone", "Open API, no key", "Because a paid warning is not a warning"], false],
  ["Machine feed", "$4,800", "per year", ["UDP packet, sub-100ms", "Guaranteed delivery path", "For anything that has to stop itself"], true],
  ["Host a station", "$0", "we pay you", ["A sensor in your shed", "$120 a year toward power", "You become part of the network"], false],
];

const QA = [
  ["How can you warn people before an earthquake?", "We cannot. We warn you before the *shaking* arrives, which is a different thing. The first waves out of a rupture are fast and mostly harmless; the ones that knock things over are slower. Detect the fast one near the epicentre, send an electronic message, and it beats the slow one to the city by anywhere from five to sixty seconds."],
  ["What is thirty seconds actually good for?", "A train slows to a stop. A surgeon lifts the scalpel. A gas valve shuts. A lift stops at the nearest floor and opens its doors instead of jamming between two. Nobody evacuates a building in thirty seconds, and we do not claim they should."],
  ["What about false alarms?", "One station never triggers an alert; we require four in agreement and a consistent arrival pattern. In four years we have issued two false public alerts, both in 2023, both from a quarry blast, and both are written up on this site with what we changed afterwards."],
  ["Why are the sensors in people's houses?", "Because density beats sensitivity. Forty cheap accelerometers in suburban sheds locate a quake faster than four expensive ones on bedrock, and they cost about $200 each. Hosts get $120 a year toward power and a light on the box that goes green when their station reports."],
  ["Who pays for the free feed?", "The machine subscribers. A rail operator pays for a guaranteed sub-100ms path because their braking system needs one; that revenue covers the public app and the school sirens. It is a deliberate cross-subsidy and we would rather say so than pretend the free tier is charity."],
];

function init() {
  field();

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
      <span class="tier__k">${k}${hot ? " &middot; funds the rest" : ""}</span>
      <span class="tier__p">${p}<small>${u}</small></span>
      <ul>${l.map((x) => `<li>${x}</li>`).join("")}</ul>
      <a href="#">${hot ? "Connect a system" : "Get started"}</a>
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
