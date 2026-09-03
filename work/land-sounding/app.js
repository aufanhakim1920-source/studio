const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── the sonar field ───────────────────────────────────────────────────── */
const MAXP  = 12;    /* ping slots — also the length of the visitor's memory */
const LIFE  = 5.0;   /* seconds a wavefront stays alive */
const SPEED = 0.34;  /* uv units per second */

const VERT = "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }";

/* ⚠️ NO BACKTICK may appear anywhere inside this string, comments included —
   one closes the template literal and the GLSL below is parsed as JavaScript. */
const FRAG = `precision highp float;

uniform vec2  u_res;
uniform float u_time;
uniform vec2  u_probe;       /* lagged pointer, 0..1 */
uniform vec4  u_ping[12];    /* x, y, fired-at, recency weight */

const float SPEED = 0.34;
const float LIFE  = 5.0;
const float WIDTH = 0.042;   /* gaussian window around the front */
const float FREQ  = 58.0;    /* the ripple inside the front */

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
float fbm(vec2 p){ return noise(p) * 0.6 + noise(p * 2.2) * 0.28 + noise(p * 4.7) * 0.12; }

/* the seabed itself - a height field, drawn as bathymetric contours */
float bathy(vec2 p){ return fbm(p * 2.3) * 0.6 + fbm(p * 6.4) * 0.18; }

/* the cable route, and its slope so the distance to it is a real distance */
float cableY(float x){
  return 0.455 + 0.086 * sin(x * 2.35 + 0.6) + 0.028 * sin(x * 5.3 + 2.1);
}
float cableD(float x){
  return 0.086 * 2.35 * cos(x * 2.35 + 0.6) + 0.028 * 5.3 * cos(x * 5.3 + 2.1);
}

/* a fault marker: a small ring with a hot core, slowly breathing */
float marker(vec2 uv, vec2 p, float t){
  float d = length(uv - p);
  float ring = 0.0035 / (abs(d - 0.021) + 0.0035);
  float core = 0.0017 / (d + 0.0017);
  return ring * 0.5 * (0.62 + 0.38 * sin(t * 1.9)) + core * 0.75;
}

void main(){
  float asp = u_res.x / u_res.y;
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  uv.x *= asp;

  /* ---- the returns -----------------------------------------------------
     front  : the expanding wavefront, AVERAGED across overlapping pings
     chart  : ground the front has already crossed, kept as a max()        */
  float front = 0.0, wsum = 0.0, chart = 0.0;
  for (int i = 0; i < 12; i++) {
    vec4 pg = u_ping[i];
    if (pg.z < 0.0) continue;                 /* empty slot */
    float age = u_time - pg.z;
    if (age < 0.0) continue;
    float dist = length(uv - pg.xy);
    float rad  = age * SPEED;                 /* radius IS elapsed time */
    float rel  = dist - rad;

    /* charted memory. max(), never +=, so twelve sweeps cannot stack to white */
    chart = max(chart, smoothstep(0.0, 0.11, -rel) * pg.w);

    if (age > LIFE) continue;
    float win = exp(-(rel * rel) / (WIDTH * WIDTH));
    float osc = 0.6 + 0.4 * cos(rel * FREQ);
    float att = exp(-age / 2.7) / (1.0 + dist * 1.3);
    float w = win * att;
    front += w * osc;
    wsum  += w;
  }
  front /= max(wsum, 1.0);                    /* AVERAGE, never sum */

  /* ---- what is down there --------------------------------------------- */
  float h  = bathy(uv);
  float tw = abs(fract(h * 13.0) - 0.5) * 2.0;
  float contour = 1.0 - smoothstep(0.0, 0.16, tw);   /* edge0 < edge1, always */

  float sl = cableD(uv.x);
  float dc = abs(uv.y - cableY(uv.x)) / sqrt(1.0 + sl * sl);
  float cable = 0.0018 / (dc + 0.0018);              /* 1/dist IS the glow */

  float fx1 = asp * 0.26, fx2 = asp * 0.73;
  float marks = marker(uv, vec2(fx1, cableY(fx1)), u_time)
              + marker(uv, vec2(fx2, cableY(fx2)), u_time + 1.7);

  float ink = contour * 0.38 + cable * 0.62 + marks * 0.9;
  float lit = front * 1.75 + chart * 0.19;

  vec3 CORAL = vec3(1.0, 0.365, 0.34);
  vec3 col = CORAL * ink * lit;
  col += CORAL * front * 0.62;                       /* the front itself */
  col += CORAL * ink * 0.026;                        /* a hairline of known route */

  /* the room: a cold wash and the listening pool under the pointer */
  vec2 mid = vec2(asp * 0.5, 0.5);
  vec2 pc  = vec2(u_probe.x * asp, u_probe.y);
  col += vec3(0.05, 0.082, 0.125) * (0.055 / (length(uv - mid) + 0.5));
  col += CORAL * (0.006 / (length(uv - pc) + 0.14));

  col = vec3(1.0) - exp(-col * 1.75);                /* never clamp */
  float vig = 1.0 - 0.46 * length(uv - mid);
  gl_FragColor = vec4(col * max(vig, 0.0), 1.0);
}`;

const pings = [];               /* {x, y, t} — x,y normalised 0..1, y up */
let gl = null, cv = null, U = null, data = new Float32Array(MAXP * 4);
let t0 = performance.now();
let mx = 0.5, my = 0.5, ax = 0.5, ay = 0.5;
let raf = 0, wakeUntil = 0, autoTimer = 0;

const tsec = () => (performance.now() - t0) / 1000;

function pack() {
  const asp = cv ? cv.width / cv.height : 1;
  for (let i = 0; i < MAXP; i++) {
    const p = pings[i];
    const o = i * 4;
    if (!p) { data[o] = 0; data[o + 1] = 0; data[o + 2] = -1; data[o + 3] = 0; continue; }
    /* recency weight: newest chart is full strength, the oldest has faded to
       nothing by the time its slot is recycled, so nothing ever pops out. */
    const rank = pings.length - 1 - i;
    data[o] = p.x * asp;
    data[o + 1] = p.y;
    data[o + 2] = p.t;
    data[o + 3] = Math.pow(1 - rank / MAXP, 1.6);
  }
}

function draw(t) {
  if (!gl) return;
  gl.uniform2f(U.res, cv.width, cv.height);
  gl.uniform1f(U.time, t);
  gl.uniform2f(U.probe, ax, ay);
  if (U.ping) gl.uniform4fv(U.ping, data);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function frame() {
  const t = tsec();
  ax += (mx - ax) * 0.045;          /* the field listens slowly, never instantly */
  ay += (my - ay) * 0.045;
  draw(t);
  if (t < wakeUntil) raf = requestAnimationFrame(frame);
  else { raf = 0; draw(t); }        /* one last frame, then genuinely idle */
}

function wake(until) {
  wakeUntil = Math.max(wakeUntil, until);
  if (!raf && !REDUCED) raf = requestAnimationFrame(frame);
}

/* x, y normalised, y measured UP from the bottom */
function firePing(x, y) {
  if (!gl) return;
  /* reduced motion: the ping still reveals, it just does not travel — the ring
     is placed already expanded and the page redraws once. */
  const t = REDUCED ? tsec() - 2.7 : tsec();
  pings.push({ x, y, t });
  while (pings.length > MAXP) pings.shift();
  pack();
  hud();
  if (REDUCED) draw(tsec());
  else wake(t + LIFE);
}

function autoPing() {
  clearTimeout(autoTimer);
  /* reduced motion gets no sweep, so it gets the RESULT instead: the floor
     arrives already charted by four soundings, still, and clicks add more. */
  if (REDUCED) {
    [[0.22, 0.62], [0.5, 0.34], [0.74, 0.66], [0.4, 0.5]].forEach(([x, y]) => firePing(x, y));
    return;
  }
  if (!document.hidden) firePing(0.16 + Math.random() * 0.68, 0.24 + Math.random() * 0.5);
  /* the gap is deliberately LONGER than a ping's life, so the page really does
     go still between soundings instead of holding a permanent rAF */
  if (!REDUCED) autoTimer = setTimeout(autoPing, 8600 + Math.random() * 3400);
}

function field() {
  cv = $("#gl");
  gl = cv.getContext("webgl", {
    antialias: false, alpha: false, powerPreference: "low-power",
    preserveDrawingBuffer: true,     /* the chart must survive an idle loop */
  });
  if (!gl) { cv = null; return; }    /* the CSS fallback on #gl already covers this */

  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); return null; }
    return s;
  };
  const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) { gl = null; return; }
  const pr = gl.createProgram();
  gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(pr)); gl = null; return; }
  gl.useProgram(pr);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  U = {
    res: gl.getUniformLocation(pr, "u_res"),
    time: gl.getUniformLocation(pr, "u_time"),
    probe: gl.getUniformLocation(pr, "u_probe"),
    ping: gl.getUniformLocation(pr, "u_ping[0]"),
  };

  const size = () => {
    const d = Math.min(devicePixelRatio || 1, 1.6);   /* 3x fullscreen is heat for nothing */
    cv.width = Math.round(innerWidth * d);
    cv.height = Math.round(innerHeight * d);
    gl.viewport(0, 0, cv.width, cv.height);
    pack();
  };
  size();
  addEventListener("resize", () => { size(); REDUCED ? draw(tsec()) : wake(tsec() + 0.4); }, { passive: true });

  addEventListener("pointermove", (e) => {
    mx = e.clientX / innerWidth; my = 1 - e.clientY / innerHeight;
    wake(tsec() + 0.9);
  }, { passive: true });

  pack();
  draw(tsec());
}

/* ── content ───────────────────────────────────────────────────────────── */
const CARDS = [
  {
    n: "SVY-01", t: "Route survey",
    s: "Pre-lay corridor mapping. Multibeam, side-scan and sub-bottom profiler on one pass, so the route is chosen from bathymetry rather than from a chart drawn in 1974.",
    lead: "A 500 m corridor swept end to end before a single metre of cable is paid out. We deliver the route your installer can actually follow, with the boulders, wrecks and pockmark fields already on it.",
    spec: [
      ["Swath coverage", "500 m corridor"],
      ["Multibeam", "400 kHz, 0.5° × 1°"],
      ["Sub-bottom", "3.5 kHz chirp, 30 m"],
      ["Line rate", "62 km / survey day"],
    ],
    note: "Deliverable: KP-referenced route position list, charts at 1:10,000, and the raw soundings.",
  },
  {
    n: "SVY-02", t: "Burial verification",
    s: "Tow-fish electromagnetic tracking against the as-laid position. We report the burial depth you actually have, not the one the plough was set to.",
    lead: "Ploughs skip. Trenchers ride up over hard ground and nobody on the bridge sees it happen. We fly a tow-fish over the as-laid route and read the depth of cover continuously, so the shallow sections are known before a trawl door finds them.",
    spec: [
      ["Depth of cover", "±0.1 m"],
      ["Detection range", "6 m of sediment"],
      ["Along-route sampling", "every 1.0 m"],
      ["Survey speed", "3.2 knots"],
    ],
    note: "Reported as a continuous burial profile against KP, with every section under 0.6 m flagged.",
  },
  {
    n: "SVY-03", t: "ROV inspection",
    s: "Work-class ROV rated to 3,000 m. HD video with laser scaling, plus manipulator work on exposed sections and free spans.",
    lead: "When the survey finds something, the ROV goes and looks at it. Two 4K cameras, twin lasers for true scale, and a seven-function manipulator that can clear debris and place a grapnel marker without a second mobilisation.",
    spec: [
      ["Rated depth", "3,000 m"],
      ["Laser scaling", "±3 mm at 1 m"],
      ["Bottom time", "12 h per dive"],
      ["Manipulators", "7-function + 5-function"],
    ],
    note: "Every dive returns time-coded video indexed to KP, so a clip is findable a decade later.",
  },
  {
    n: "SVY-04", t: "Fault localisation",
    s: "OTDR from both ends, then magnetometer and acoustic pinger on site. We hand the repair ship one position, and it is right.",
    lead: "An OTDR trace gives you a fault to within a few hundred metres of optical distance — which on a slack, coiled, twelve-year-old cable can be a kilometre of seabed. We close the gap on site and hand over a single position the repair ship can cut to.",
    spec: [
      ["Position accuracy", "±1.4 m"],
      ["Time to on-site fix", "under 9 h"],
      ["Method", "OTDR + magnetometer + pinger"],
      ["Confirmed fixes", "214 since 2009"],
    ],
    note: "One cut, one splice. The alternative is a repair ship searching at A$68,400 a day.",
  },
];

const NUMS = [
  { to: 41200, dec: 0, unit: "km", label: "of cable route surveyed since 2009" },
  { to: 3000, dec: 0, unit: "m", label: "rated depth, work-class ROV" },
  { to: 1.4, dec: 1, unit: "m", pre: "±", label: "position accuracy on a fault fix" },
  { to: 96, dec: 0, unit: "h", label: "mobilisation, Fremantle to on station" },
];

const DELIVER = [
  ["D-01", "Route position list", "Every KP with its easting, northing, depth and seabed type, in the format your installer already reads."],
  ["D-02", "Burial profile", "Depth of cover against KP for the whole route, with the shallow sections called out."],
  ["D-03", "Inspection video", "Time-coded and KP-indexed, with laser-scaled stills of anything we flagged."],
  ["D-04", "Raw soundings", "The unprocessed data, on a drive, yours. We do not hold your seabed hostage."],
];

const QA = [
  ["How accurate is a fault fix, really?",
   "±1.4 m, and that is a measured number across 214 confirmed fixes, not a specification. An OTDR trace alone puts a fault within a few hundred metres of optical distance, which on a slack cable is a wide search. We close it on site with a magnetometer run and an acoustic pinger before the repair ship arrives."],
  ["What depth can you work in?",
   "The work-class ROV is rated to 3,000 m and has been to 2,840 m on a live job. Towed side-scan goes deeper — to 6,000 m — but it looks rather than touches. Below 3,000 m we will tell you what is there and that we cannot go and hold it."],
  ["How fast can you mobilise?",
   "96 hours from Fremantle to on station for anything in the Australian and South-East Asian basins, assuming a berth. RV Kestrel carries the survey spread permanently installed, so mobilisation is crew, fuel and a sailing window rather than a container of equipment and a crane."],
  ["What do we own at the end?",
   "All of it. Charts, the position list, the burial profile, the video and the raw soundings, delivered on a drive and mirrored to your own storage. There is no portal, no per-seat licence and no data held back to make the next survey easier to sell you."],
];

const TICK = [
  "RV KESTREL 38°21'S 148°44'E", "MULTIBEAM 400 KHZ", "ROV DEPTH 2,180 M",
  "SEA STATE 3", "LINE 14 OF 22", "BURIAL 1.1 M", "TIDE +0.4 M", "HEADING 214°",
];

/* ── HUD ───────────────────────────────────────────────────────────────── */
let fired = 0;                 /* what the visitor has accumulated */
let closeMenu = () => {};      /* replaced in init once the menu exists */

function hud() {
  const s = $("#slots");
  if (!s) return;
  $$("i", s).forEach((p, i) => p.classList.toggle("on", i < pings.length));
  $("#pcount").textContent = String(fired).padStart(2, "0");
}

/* ── the detail panel ──────────────────────────────────────────────────── */
let lastFocus = null, openFrom = null;
const ovl = () => $("#ovl");

function openSheet(card, d) {
  const o = ovl(), sheet = $("#sheet");
  openFrom = card;
  lastFocus = document.activeElement;

  $("#sheetKicker").textContent = d.n;
  $("#sheetTitle").textContent = d.t;
  $("#sheetLead").textContent = d.lead;
  $("#sheetSpec").innerHTML = d.spec
    .map(([k, v]) => "<div><dt>" + k + "</dt><dd>" + v + "</dd></div>").join("");
  $("#sheetNote").textContent = d.note;

  /* FLIP: measure where the card is, show the panel where it will end up,
     then start it AT the card and let it travel. */
  const first = card.getBoundingClientRect();
  o.hidden = false;
  const last = sheet.getBoundingClientRect();
  const dx = (first.left + first.width / 2) - (last.left + last.width / 2);
  const dy = (first.top + first.height / 2) - (last.top + last.height / 2);
  const sx = Math.max(first.width / last.width, 0.05);
  const sy = Math.max(first.height / last.height, 0.05);

  if (!REDUCED) {
    sheet.style.transition = "none";
    sheet.style.transform = "translate(" + dx + "px," + dy + "px) scale(" + sx + "," + sy + ")";
    sheet.style.opacity = "0.35";
    void sheet.offsetWidth;                     /* force the start state to land */
    requestAnimationFrame(() => {
      sheet.style.transition = "";
      sheet.style.transform = "";
      sheet.style.opacity = "";
    });
  }

  const sb = innerWidth - document.documentElement.clientWidth;
  if (sb > 0) document.body.style.paddingRight = sb + "px";
  document.body.classList.add("is-modal");
  requestAnimationFrame(() => o.classList.add("on"));
  sheet.focus({ preventScroll: true });

  /* the field answers the panel: a ping from the card that opened it */
  firePing((first.left + first.width / 2) / innerWidth,
           1 - (first.top + first.height / 2) / innerHeight);
}

function closeSheet() {
  const o = ovl(), sheet = $("#sheet");
  if (o.hidden) return;
  o.classList.remove("on");

  const finish = () => {
    o.hidden = true;
    sheet.style.transition = "none";
    sheet.style.transform = "";
    sheet.style.opacity = "";
    void sheet.offsetWidth;
    sheet.style.transition = "";
    document.body.classList.remove("is-modal");
    document.body.style.paddingRight = "";
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  };

  if (REDUCED || !openFrom) { finish(); return; }

  const first = openFrom.getBoundingClientRect();
  const last = sheet.getBoundingClientRect();
  const dx = (first.left + first.width / 2) - (last.left + last.width / 2);
  const dy = (first.top + first.height / 2) - (last.top + last.height / 2);
  const sx = Math.max(first.width / last.width, 0.05);
  const sy = Math.max(first.height / last.height, 0.05);
  sheet.style.transform = "translate(" + dx + "px," + dy + "px) scale(" + sx + "," + sy + ")";
  sheet.style.opacity = "0";

  /* wait for the travel to end before hiding, or it vanishes and the
     animation plays against nothing */
  const done = (e) => {
    if (e.target !== sheet || e.propertyName !== "transform") return;
    sheet.removeEventListener("transitionend", done);
    finish();
  };
  sheet.addEventListener("transitionend", done);
  setTimeout(() => { if (!o.hidden) { sheet.removeEventListener("transitionend", done); finish(); } }, 700);
}

function trapFocus(e) {
  const o = ovl();
  if (o.hidden || e.key !== "Tab") return;
  const f = $$('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])', $("#sheet"))
    .filter((el) => el.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && (document.activeElement === first || document.activeElement === $("#sheet"))) {
    e.preventDefault(); last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault(); first.focus();
  }
}

/* ── reveal once, on arrival ───────────────────────────────────────────── */
function reveals() {
  const els = $$(".rv");
  if (REDUCED || !("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    const sibs = [...e.target.parentElement.querySelectorAll(".rv")];
    e.target.style.transitionDelay = Math.min(sibs.indexOf(e.target), 5) * 65 + "ms";
    e.target.classList.add("in");
    io.unobserve(e.target);
  }), { threshold: .14, rootMargin: "0px 0px -8% 0px" });
  els.forEach((e) => io.observe(e));
}

/* ── boot ──────────────────────────────────────────────────────────────── */
function init() {
  field();

  /* ---- capability cards ---- */
  $("#cards").innerHTML = CARDS.map((c, i) =>
    '<button class="card rv" type="button" data-i="' + i + '">' +
      '<span class="card__n">' + c.n + '</span>' +
      '<h3>' + c.t + '</h3>' +
      '<p>' + c.s + '</p>' +
      '<span class="card__go"><i></i>Open spec</span>' +
    '</button>').join("");

  $$(".card").forEach((c) => {
    c.addEventListener("pointermove", (e) => {
      const r = c.getBoundingClientRect();
      c.style.setProperty("--mx", (e.clientX - r.left) + "px");
      c.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
    c.addEventListener("click", () => openSheet(c, CARDS[+c.dataset.i]));
  });

  $$("[data-close]").forEach((b) => b.addEventListener("click", closeSheet));
  addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeSheet(); closeMenu(); }
    trapFocus(e);
  });

  /* ---- the record ---- */
  $("#nums").innerHTML = NUMS.map((n) =>
    '<div class="stat rv"><b data-to="' + n.to + '" data-dec="' + n.dec + '" data-pre="' + (n.pre || "") + '">' +
    (n.pre || "") + '0<small>' + n.unit + '</small></b><span>' + n.label + '</span></div>').join("");

  /* ---- deliverables ---- */
  $("#del").innerHTML = DELIVER.map(([n, t, p]) =>
    '<div class="del__i rv"><b>' + n + '</b><h4>' + t + '</h4><p>' + p + '</p></div>').join("");

  /* ---- questions ----
     A bare <details> snaps open with no motion at all, because the browser
     toggles display on the content and there is nothing to transition. Keep
     <details> for semantics and no-JS, drive the open state ourselves so the
     panel can animate 0fr -> 1fr, and wait for transitionend before removing
     [open] or the answer disappears before the collapse finishes. */
  $("#qa").innerHTML = QA.map(([q, a], i) =>
    '<details class="rv"' + (i === 0 ? " open" : "") + '>' +
      '<summary><span>' + q + '</span></summary>' +
      '<div class="a"><div><p>' + a + '</p></div></div>' +
    '</details>').join("");

  const rows = $$("#qa details");
  rows.forEach((d) => { if (d.open) d.classList.add("is-open"); });

  const closeRow = (d) => {
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

  rows.forEach((d) => d.querySelector("summary").addEventListener("click", (e) => {
    e.preventDefault();
    if (d.open) { closeRow(d); return; }
    rows.forEach((o) => o !== d && closeRow(o));
    d.open = true;
    /* one frame at 0fr before flipping to 1fr, or both values land in the same
       style recalc and there is no transition at all */
    requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add("is-open")));
  }));

  /* ---- ticker ---- */
  const strip = TICK.map((t) => "<span>" + t + "</span>").join("<b>/</b>");
  $("#tick").innerHTML = strip + "<b>/</b>" + strip + "<b>/</b>";

  /* ---- HUD slots ---- */
  $("#slots").innerHTML = new Array(MAXP).fill("<i></i>").join("");
  hud();

  reveals();

  /* ---- counters ---- */
  const fmt = (v, dec, pre) => pre + v.toLocaleString("en-AU",
    { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const runStat = (el) => {
    const b = el.querySelector("b");
    const to = parseFloat(b.dataset.to), dec = +b.dataset.dec, pre = b.dataset.pre;
    const unit = b.querySelector("small").outerHTML;
    const start = performance.now();
    const step = (t) => {
      const k = Math.min((t - start) / 1000, 1);
      const v = to * (1 - Math.pow(1 - k, 3));
      b.innerHTML = fmt(dec ? +v.toFixed(dec) : Math.round(v), dec, pre) + unit;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if (!REDUCED && "IntersectionObserver" in window) {
    const io2 = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      io2.unobserve(e.target); runStat(e.target);
    }), { threshold: .4 });
    $$(".stat").forEach((s) => io2.observe(s));
  } else {
    $$(".stat b").forEach((b) => {
      b.innerHTML = fmt(parseFloat(b.dataset.to), +b.dataset.dec, b.dataset.pre) + b.querySelector("small").outerHTML;
    });
  }

  /* ---- the ticker strip ----
     A CSS keyframe, not a rAF. The strip is written twice and travels exactly
     -50%, so the wrap is seamless and the compositor owns it — the shader's
     loop is then the only rAF on the page, and it is allowed to stop. */

  /* ---- magnetic buttons ---- */
  if (!REDUCED) $$(".mag").forEach((b) => {
    b.addEventListener("pointermove", (e) => {
      const r = b.getBoundingClientRect();
      b.style.transform = "translate(" + (e.clientX - r.left - r.width / 2) * 0.15 + "px,"
                                       + (e.clientY - r.top - r.height / 2) * 0.2 + "px)";
    });
    b.addEventListener("pointerleave", () => (b.style.transform = ""));
  });

  /* ---- mobile menu ---- */
  const mb = $("#navToggle"), mn = $("#menu");
  const openMenu = () => {
    mn.hidden = false;
    mb.setAttribute("aria-expanded", "true");
    requestAnimationFrame(() => requestAnimationFrame(() => mn.classList.add("on")));
  };
  closeMenu = () => {
    if (mn.hidden || !mn.classList.contains("on")) { if (!mn.hidden) mn.hidden = true; return; }
    mn.classList.remove("on");
    mb.setAttribute("aria-expanded", "false");
    if (REDUCED) { mn.hidden = true; return; }
    const done = (e) => {
      if (e.propertyName !== "grid-template-rows") return;
      mn.removeEventListener("transitionend", done);
      if (!mn.classList.contains("on")) mn.hidden = true;
    };
    mn.addEventListener("transitionend", done);
  };
  mb.addEventListener("click", () => (mb.getAttribute("aria-expanded") === "true" ? closeMenu() : openMenu()));
  $$("a", mn).forEach((a) => a.addEventListener("click", closeMenu));

  /* ---- the ping ----
     ⚠️ Fires on the BACKGROUND only. Anything interactive is excluded, so a
     click on a link is a click on a link and never also a sonar shot. */
  /* the hint has done its job once a ping has actually been fired */
  const fade = () => { $("#hint").classList.add("gone"); $("#hintM").classList.add("gone"); };

  const HOT = "a,button,summary,input,select,textarea,label,[role=button],.ovl,.menu,.hud";
  addEventListener("pointerdown", (e) => {
    if (e.button) return;
    if (document.body.classList.contains("is-modal")) return;
    if (e.target.closest && e.target.closest(HOT)) return;
    closeMenu();
    fired++;
    fade();
    firePing(e.clientX / innerWidth, 1 - e.clientY / innerHeight);
  }, { passive: true });

  $("#pingBtn").addEventListener("click", () => {
    fired++;
    fade();
    firePing(0.5, 0.52);
  });

  /* the hint belongs to the first screen — it is an instruction, not chrome */
  addEventListener("scroll", () => {
    if (scrollY > innerHeight * 0.7) fade();
  }, { passive: true });

  /* the page is breathing before anyone touches it */
  setTimeout(autoPing, 520);

  const clock = () => ($("#clock").textContent = new Date().toLocaleTimeString("en-AU",
    { timeZone: "Australia/Perth", hour: "2-digit", minute: "2-digit" }));
  clock(); setInterval(clock, 30000);

  /* headless screenshots need a way to fire one */
  window.__ping = firePing;
}

init();
