const $ = (s, r = document) => r.querySelector(s);
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
/* ── the co-operative's five lots ───────────────────────────────────────────
   Altitude, score and price move together on purpose: higher grows slower,
   cups higher, and costs more. Harvest month falls straight out of altitude —
   the same curve the shader uses. */
const LOTS = [
  { id: "nong",  name: "Nong Luang",    alt: 1110, var: "Catimor", proc: "Washed",  pick: "Nov", score: 83.5,  price: 6.4,   bags: 214 },
  { id: "houay", name: "Houay Set",     alt: 1165, var: "Catimor", proc: "Honey",   pick: "Dec", score: 84.25, price: 7.6,   bags: 168 },
  { id: "pak",   name: "Paksong Ridge", alt: 1215, var: "Typica",  proc: "Washed",  pick: "Dec", score: 85.0,  price: 8.8,   bags: 131 },
  { id: "that",  name: "Thateng North", alt: 1285, var: "Bourbon", proc: "Honey",   pick: "Jan", score: 86.25, price: 10.75, bags: 84 },
  { id: "katu",  name: "Katu Slope",    alt: 1350, var: "Bourbon", proc: "Natural", pick: "Feb", score: 87.25, price: 12.6,  bags: 47 },
];
const MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
/* ── the ripening curve, written ONCE in each language ──────────────────────
   The GLSL copy in FRAG must stay identical to this, or the pips will disagree
   with the hillside they are supposed to be reading. */
const wrap12 = (s) => ((s % 12) + 12) % 12;
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function ripeness(alt, season) {
  const a01 = Math.min(1, Math.max(0, (alt - 1100) / 250));
  const peak = 10.35 + a01 * 3.30;                       // Nov at 1,100 m → Feb at 1,350 m
  const dm = wrap12(season - peak + 6) - 6;              // signed months from the pick
  // sigma 0.42 months ~= the two-week pick window the copy claims. At 0.8 the
  // band covered the WHOLE hill and its cores clipped to pale peach — measured
  // at rgb(255,224,162) over 200px of slope, which is a blown highlight, not a form.
  const ripe = Math.exp(-(dm * dm) / (2 * 0.42 * 0.42));
  const young = sstep(-5.2, -0.95, dm) * (1 - ripe);
  const bare = sstep(0.55, 1.5, dm) * (1 - sstep(3.4, 4.8, dm));
  return { ripe, young, bare, dm, peak };
}
const peakOf = (alt) => 10.35 + Math.min(1, Math.max(0, (alt - 1100) / 250)) * 3.30;
/* ── the slope ─────────────────────────────────────────────────────────────── */
const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
const FRAG = `precision highp float;
uniform vec2  u_res;
uniform float u_time;
uniform float u_season;
uniform vec2  u_lean;
uniform float u_warm;
uniform float u_wake;
const vec3 MINT   = vec3(0.561, 0.851, 0.714);  /* #8fd9b6 — the reference's mint */
const vec3 TERRA  = vec3(0.851, 0.482, 0.337);  /* #d97b56 — the reference's terracotta */
/* ⚠️ Same hue as MINT (152°), deeper. Measured: mint at the luminance a canopy
   actually sits at reads as grey-green — HSL saturation collapses from 49 to 21
   once you scale it down, because that metric rewards spread, not hue. The
   foliage therefore uses the deep jade and MINT stays for the bright cores and
   the UI, where it is light enough to read as the colour it is. */
const vec3 CANOPY = vec3(0.243, 0.804, 0.541);  /* #3ecd8a */
const vec3 DORM   = vec3(0.460, 0.220, 0.100);  /* dry season, warm and saturated */
float hash1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
vec2 hash2(vec2 p){
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}
float noise(vec2 p){
  const float K1 = 0.366025404, K2 = 0.211324865;
  vec2 i = floor(p + (p.x + p.y) * K1);
  vec2 a = p - i + (i.x + i.y) * K2;
  float m = step(a.y, a.x);
  vec2 o = vec2(m, 1.0 - m);
  vec2 b = a - o + K2, c = a - 1.0 + 2.0 * K2;
  vec3 h = max(0.5 - vec3(dot(a,a), dot(b,b), dot(c,c)), 0.0);
  vec3 n = h*h*h*h * vec3(dot(a, hash2(i)), dot(b, hash2(i+o)), dot(c, hash2(i+1.0)));
  return dot(n, vec3(70.0));
}
float fbm(vec2 p){ return noise(p) * 0.58 + noise(p * 2.1) * 0.29 + noise(p * 4.3) * 0.13; }
/* The ridge is a function of x alone, so the terraces below it are contours of
   the SAME function — they follow the skyline instead of being drawn parallel.
   x is normalised to a fixed 0..1.6 span so the whole ridge is visible at any
   aspect; on a phone the hill just gets steeper, which is what a hill does. */
float ridgeNear(float x){
  return 0.262
    + 0.076 * sin(x * 1.02 + 0.42)
    + 0.040 * sin(x * 2.31 - 1.22)
    + 0.021 * sin(x * 4.65 + 2.05)
    + 0.017 * fbm(vec2(x * 2.1, 7.0 + u_time * 0.010));
}
float ridgeFar(float x){
  return 0.372
    + 0.058 * sin(x * 0.83 - 0.95)
    + 0.028 * sin(x * 2.02 + 1.72)
    + 0.014 * fbm(vec2(x * 1.6, 19.0));
}
void ripeAt(float alt, out float ripe, out float young, out float bare){
  float a01  = clamp((alt - 1100.0) / 250.0, 0.0, 1.0);
  float peak = 10.35 + a01 * 3.30;
  float dm   = mod(u_season - peak + 6.0, 12.0) - 6.0;
  ripe  = exp(-dm * dm / (2.0 * 0.42 * 0.42));   /* a two-week pick, not a season */
  young = smoothstep(-5.2, -0.95, dm) * (1.0 - ripe);
  bare  = smoothstep(0.55, 1.5, dm) * (1.0 - smoothstep(3.4, 4.8, dm));
}
void main(){
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  float sx = uv.x * 1.6;
  /* on a tall narrow screen the same ridge eats the copy above it, so the hill
     sits lower — it still leads the screen, it just stops climbing into the text */
  float hs = mix(0.96, 1.0, smoothstep(0.52, 1.15, u_res.x / u_res.y));
  float Hn = ridgeNear(sx) * hs;
  float Hf = ridgeFar(sx) * hs;
  float inHill = smoothstep(0.0032, 0.0, uv.y - Hn);
  /* sky — warm near-black, and it stays near-black. Most of this frame is dark
     on purpose: that is what makes the harvest band read as a thing. */
  vec3 col = mix(vec3(0.048, 0.032, 0.023), vec3(0.013, 0.010, 0.008),
                 smoothstep(0.12, 0.92, uv.y));
  /* the far ridge: a flat silhouette, rimmed in whatever colour the season is */
  float inFar = smoothstep(0.0035, 0.0, uv.y - Hf);
  col = mix(col, vec3(0.019, 0.013, 0.010), inFar);
  col += mix(CANOPY, TERRA, u_warm) * 0.22 * exp(-abs(uv.y - Hf) / 0.0034);
  /* what the harvest throws up into the air behind the near ridge */
  col += TERRA * (0.050 + 0.170 * u_warm)
       * exp(-max(uv.y - Hn, 0.0) / 0.105) * (1.0 - inHill);
  if (inHill > 0.001) {
    /* altitude on the slope: 0 at the foot, 1 at the ridge. Raised to a power so
       the terraces crowd together near the top — the foreshortening you get
       looking up a hillside. */
    float a  = clamp(uv.y / max(Hn, 0.001), 0.0, 1.0);
    float NB = 22.0;
    float t  = pow(a, 1.32) * NB;
    float ft = fract(t);
    float dl = min(ft, 1.0 - ft);
    float dAdY = NB * 1.32 * pow(max(a, 0.03), 0.32) / max(Hn, 0.001);
    float dS = dl / max(dAdY, 1e-3);                 /* screen distance to the riser */
    /* every terrace is ONE altitude, so it is one colour — that is what makes
       it read as terracing rather than as a gradient */
    float aC  = pow((floor(t) + 0.5) / NB, 1.0 / 1.32);
    float alt = 1100.0 + aC * 250.0;   /* the hill IS the lot range, 1,100-1,350 m */
    float ripe, young, bare;
    ripeAt(alt, ripe, young, bare);
    /* ⚠️ Sharpen the three states BEFORE anything mixes them. A linear cross-fade
       spends most of the hill halfway between a warm and a green — an olive with
       almost no channel spread, measured at HSL 13-25 across the whole slope.
       Terracing is a hard-edged thing anyway: a terrace is one altitude, so it
       is one state. */
    float yg = smoothstep(0.22, 0.72, young);
    float rp = smoothstep(0.10, 0.42, ripe);
    float face = 0.30 + 0.82 * ft;                   /* the bed, lit toward its riser */
    /* ⚠️ The bed under a terrace must share its line's HUE. A warm bed under a
       green line averages to neutral across the whole falloff — measured at HSL
       13, and that falloff is most of the hill's area. */
    vec3 bed = vec3(0.034, 0.016, 0.008);
    bed = mix(bed, vec3(0.005, 0.033, 0.019), yg);           /* tint, do NOT add */
    bed = mix(bed, vec3(0.026, 0.012, 0.005), smoothstep(0.25, 0.75, bare));
    vec3 mass = bed * (0.45 + 0.80 * a) * face;
    mass += TERRA * rp * 0.62 * face;                /* the one bright thing */
    /* the riser hairline. SDF + divide is the glow — no blur, no bloom pass. */
    float w = 0.0010;
    float g = w / (dS + w * 0.60);
    float br = smoothstep(0.25, 0.75, bare);
    vec3 lc = mix(DORM, CANOPY, yg);
    lc = mix(lc, vec3(0.34, 0.15, 0.06), br);        /* stripped: bare earth */
    lc = mix(lc, TERRA, rp);
    /* ripe amplitude kept under the level where the core clips: a blown highlight
       loses the hue, and the hue is the whole point of the band */
    float amp = (0.26 + yg * 0.44 + rp * 1.25) * (1.0 - 0.42 * br * (1.0 - rp));
    /* the cursor leans the light along the slope. Lerped in JS, so it has mass. */
    amp *= 0.85 + 0.34 * exp(-pow((uv.x - u_lean.x) * 2.3, 2.0));
    col = mix(col, mass + lc * g * amp, inHill);
  }
  /* the skyline itself — the crispest edge on the page */
  col += mix(MINT, TERRA, u_warm) * 0.62 * exp(-abs(uv.y - Hn) / 0.0028);
  col *= smoothstep(0.012, 0.145, uv.y);             /* the valley falls into dark */
  vec2 q = uv - 0.5;
  col *= 1.0 - 0.70 * dot(q, q);
  col *= u_wake;
  /* ⭐ Tone map the LUMINANCE and carry the chroma through, then blend a little
     of the per-channel curve back in so the very brightest cores still bloom.
     Straight per-channel 1-exp() desaturates every core toward white: measured,
     a mint riser whose own colour is HSL 49 came out at 27. Never clamp(). */
  float Lm = dot(col, vec3(0.2126, 0.7152, 0.0722));
  vec3 keep = col * ((1.0 - exp(-Lm * 1.55)) / max(Lm, 1e-4));
  col = mix(keep, vec3(1.0) - exp(-col * 1.55), 0.08);
  /* grain, scaled by local brightness so the sky stays clean */
  /* grain is NEUTRAL, so it costs saturation everywhere it lands — kept light,
     and scaled by local brightness so the sky stays clean */
  float gr = hash1(gl_FragCoord.xy + fract(u_time * 0.37) * 137.0) - 0.5;
  col += gr * 0.022 * (0.22 + 1.3 * dot(col, vec3(0.3333)));
  gl_FragColor = vec4(max(col, 0.0), 1.0);
}`;
/* ── state: one number, the year ───────────────────────────────────────────── */
let sCur = 11.2, sTarget = 11.2;     /* months, 0 = 1 Jan */
let userTook = false;                /* the year turns itself until you touch it */
let leanX = 0.5, leanCur = 0.5;
let warm = 0;
const T0 = performance.now();
/* Until someone touches it, the year turns itself across the harvest — Nov to
   Feb and back — so the red band is always climbing somewhere on the slope.
   The phase starts it mid-harvest rather than at an end, so the first thing on
   screen is the band in the middle of the hill and not squeezed into an edge. */
const autoSeason = (t) =>
  10.4 + 3.2 * (0.5 - 0.5 * Math.cos((t / 40) * Math.PI * 2 + Math.PI / 3));
function slope() {
  const cv = $("#gl");
  const gl = cv.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
  if (!gl) return null;             /* the CSS background on #gl already covers this */
  const sh = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); return null; }
    return s;
  };
  const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const pr = gl.createProgram();
  gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(pr)); return null; }
  gl.useProgram(pr);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {
    res: gl.getUniformLocation(pr, "u_res"),
    time: gl.getUniformLocation(pr, "u_time"),
    season: gl.getUniformLocation(pr, "u_season"),
    lean: gl.getUniformLocation(pr, "u_lean"),
    warm: gl.getUniformLocation(pr, "u_warm"),
    wake: gl.getUniformLocation(pr, "u_wake"),
  };
  const size = () => {
    const d = Math.min(devicePixelRatio || 1, 1.6);
    cv.width = Math.round(innerWidth * d);
    cv.height = Math.round(innerHeight * d);
    gl.viewport(0, 0, cv.width, cv.height);
  };
  size();
  addEventListener("resize", size, { passive: true });
  return (t, wake) => {
    gl.uniform2f(U.res, cv.width, cv.height);
    gl.uniform1f(U.time, t);
    gl.uniform1f(U.season, sCur);
    gl.uniform2f(U.lean, leanCur, 0.5);
    gl.uniform1f(U.warm, warm);
    gl.uniform1f(U.wake, wake);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
}
/* ── the readout, which hangs off the object ───────────────────────────────── */
const mixHex = (a, b, k) => {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [ar, ag, ab] = p(a), [br, bg, bb] = p(b);
  const r = Math.round(ar + (br - ar) * k), g = Math.round(ag + (bg - ag) * k), bl = Math.round(ab + (bb - ab) * k);
  return `rgb(${r},${g},${bl})`;
};
const DIMHEX = "#4a3d36", MINTHEX = "#8fd9b6", TERRAHEX = "#d97b56";
const picks = [], bars = [], rows = [];
function buildLedger() {
  const host = $("#ledger");
  LOTS.forEach((L) => {
    const b = document.createElement("button");
    b.className = "pick";
    b.type = "button";
    b.innerHTML = `<b>${L.name}</b><i>${L.alt.toLocaleString()} m</i><span class="pip"></span>`;
    b.setAttribute("aria-label", `Turn the year to the ${L.name} pick, ${L.alt} metres, ${L.pick}`);
    b.addEventListener("click", () => { take(); sTarget = wrap12(peakOf(L.alt)); syncSlider(); });
    host.appendChild(b);
    picks.push({ el: b, pip: b.querySelector(".pip"), lot: L });
  });
}
function buildLots() {
  const host = $("#lotlist");
  LOTS.forEach((L) => {
    const r = document.createElement("div");
    r.className = "lot";
    r.innerHTML =
      `<span class="lot__alt">${L.alt.toLocaleString()} m</span>` +
      `<span class="lot__name">${L.name}</span>` +
      `<span class="lot__spec">${L.var} &middot; ${L.proc} &middot; ${L.score.toFixed(2)} cupped</span>` +
      `<span class="lot__pick">Picked ${L.pick} &middot; ${L.bags} bags</span>` +
      `<span class="lot__price">$${L.price.toFixed(2)}<span class="lot__kg"> /kg</span></span>` +
      `<span class="lot__bar"><span></span></span>`;
    host.appendChild(r);
    rows.push(r);
    bars.push(r.querySelector(".lot__bar span"));
  });
}
const STEPS = [
  ["01", "One window per family", "A family picks its own terrace and nothing else, inside the fortnight its altitude actually ripens. Nobody strips a tree to make a container date. It is the single reason the cup scores hold from year to year."],
  ["02", "One mill, the same day", "Cherry walks downhill to the wet mill at Ban Nong Luang and is depulped within six hours of leaving the tree. Drying beds are covered by two in the afternoon, every afternoon, through the wet-season tail."],
  ["03", "The floor is set together", "Forty-one families agree a floor price in September, before a single cherry is red. What you pay above that floor is the altitude and the score — which is exactly what the slope in front of you is showing."],
];
function buildSteps() {
  const host = $("#steps");
  STEPS.forEach(([n, t, b]) => {
    const d = document.createElement("div");
    d.className = "step";
    d.innerHTML = `<span class="step__n">${n}</span><span class="step__t">${t}</span><p class="step__b">${b}</p>`;
    host.appendChild(d);
  });
}
const QA = [
  ["Why does the top of the hill cost twice the bottom?", "Katu Slope sits 240 m above Nong Luang. It flowers later, holds cherry on the branch about eleven weeks longer, and yields roughly a third less per hectare. Slower sugar development is what the extra 3.75 cupping points are made of, and the lower yield is what the price is made of."],
  ["Can we buy one terrace outright?", "Yes, and most of our repeat roasters do. A single terrace is between 47 and 214 bags depending on altitude — Katu Slope is the smallest and usually spoken for by June. Reserving a terrace means the pick date is confirmed to you in writing before the flowering."],
  ["How do we know the pick date was real?", "Every bag carries the terrace number and the pick date stamped at the mill, and the mill's daily intake log ships as a PDF with the container. If a date on a bag does not appear in that log, the lot is free."],
  ["What is the lead time?", "Samples leave Paksong the Tuesday after a pick. Containers move through Vientiane to Laem Chabang, and a full container lands in Antwerp or Hamburg in about six weeks door to door. We hold spot stock in Antwerp from March."],
];
function buildQA() {
  const host = $("#qa");
  QA.forEach(([q, a]) => {
    const d = document.createElement("details");
    d.className = "q";
    d.innerHTML = `<summary>${q}<span class="q__x" aria-hidden="true"></span></summary>` +
                  `<div class="q__w"><div class="q__i"><p>${a}</p></div></div>`;
    host.appendChild(d);
    const sum = d.querySelector("summary");
    const wrap = d.querySelector(".q__w");
    let closing = null;
    sum.addEventListener("click", (e) => {
      e.preventDefault();
      clearTimeout(closing);
      if (d.open && d.classList.contains("open")) {
        d.classList.remove("open");
        const done = () => { d.open = false; wrap.removeEventListener("transitionend", done); };
        wrap.addEventListener("transitionend", done);
        closing = setTimeout(done, 620);                 /* escape hatch */
      } else {
        d.open = true;
        requestAnimationFrame(() => d.classList.add("open"));
      }
    });
  });
}
/* ── driving the year ──────────────────────────────────────────────────────── */
const slider = $("#season");
const take = () => { userTook = true; };
const syncSlider = () => { slider.value = String(wrap12(sTarget).toFixed(2)); };
function wireDrag() {
  const cv = $("#gl");
  let dragging = false, lastX = 0;
  /* Bound to the CANVAS, so only a drag that starts on the slope turns the year.
     A touch that starts anywhere else scrolls the page as normal — which is why
     touch-action:none lives on the canvas and nowhere else. */
  cv.addEventListener("pointerdown", (e) => {
    dragging = true; lastX = e.clientX; take();
    try { cv.setPointerCapture(e.pointerId); } catch { /* not fatal */ }
  });
  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    try { cv.releasePointerCapture(e.pointerId); } catch { /* already gone */ }
  };
  cv.addEventListener("pointerup", end);
  cv.addEventListener("pointercancel", end);
  cv.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX; lastX = e.clientX;
    sTarget = wrap12(sTarget + (dx / innerWidth) * 9);   /* a full sweep ≈ 9 months */
    syncSlider();
  });
  /* the light leans toward the pointer wherever it is — passive, never blocks */
  addEventListener("pointermove", (e) => { leanX = e.clientX / innerWidth; }, { passive: true });
  slider.addEventListener("input", () => { take(); sTarget = parseFloat(slider.value); });
  slider.addEventListener("pointerdown", take);
  slider.addEventListener("keydown", take);
}
/* ── the loop ──────────────────────────────────────────────────────────────── */
let draw = null, frames = 0;
function readout() {
  const s = sCur;
  $("#month").textContent = MON[Math.floor(wrap12(s))];
  let best = null, bestV = -1, warmest = 0;
  picks.forEach((p) => {
    const r = ripeness(p.lot.alt, s);
    const v = Math.max(r.ripe, r.young * 0.42);
    const col = r.ripe > 0.06 ? mixHex(MINTHEX, TERRAHEX, Math.min(1, r.ripe * 1.4))
              : r.young > 0.05 ? mixHex(DIMHEX, MINTHEX, Math.min(1, r.young))
              : DIMHEX;
    p.pip.style.background = col;
    p.pip.style.transform = `scaleX(${(0.14 + 0.86 * Math.min(1, v)).toFixed(3)})`;
    p.el.classList.toggle("on", r.ripe > 0.3);
    if (r.ripe > bestV) { bestV = r.ripe; best = { lot: p.lot, r }; }
    warmest = Math.max(warmest, r.ripe);
  });
  warm = warmest;
  bars.forEach((b, i) => {
    const r = ripeness(LOTS[i].alt, s);
    const v = Math.max(r.ripe, r.young * 0.55);
    b.style.width = (Math.min(1, v) * 100).toFixed(1) + "%";
    b.style.background = r.ripe > 0.06 ? mixHex(MINTHEX, TERRAHEX, Math.min(1, r.ripe * 1.4)) : MINTHEX;
    rows[i].classList.toggle("ripe", r.ripe > 0.3);
  });
  const st = $("#state"), al = $("#alt");
  if (bestV > 0.3) {
    st.textContent = "Picking · " + best.lot.name;
    al.textContent = "red band at " + best.lot.alt.toLocaleString() + " m · $" + best.lot.price.toFixed(2) + "/kg";
  } else if (bestV > 0.05) {
    const soon = best.r.dm < 0;
    st.textContent = (soon ? "Colouring · " : "Just stripped · ") + best.lot.name;
    al.textContent = (soon ? "ripe in " : "picked ") + Math.round(Math.abs(best.r.dm) * 4.3) + " weeks" +
      (soon ? "" : " ago") + " at " + best.lot.alt.toLocaleString() + " m";
  } else {
    st.textContent = "Green slope · nothing ripe";
    al.textContent = "first pick Nov, at 1,110 m";
  }
}
function frame(now) {
  const t = (now - T0) / 1000;
  if (!userTook) sTarget = autoSeason(t);
  const d = wrap12(sTarget - sCur + 6) - 6;             /* shortest way round the year */
  sCur = wrap12(sCur + d * (userTook ? 0.12 : 1));
  leanCur += (leanX - leanCur) * 0.045;                 /* the light lags the cursor */
  if (frames % 3 === 0) readout();
  if (draw) draw(t, Math.min(1, t / 1.1));
  frames++;
  requestAnimationFrame(frame);
}
/* ── reveal, one rAF sweep — no IntersectionObserver ───────────────────────── */
function reveals() {
  if (REDUCED) return;
  const els = [...document.querySelectorAll(".sec > .tag, .sec > h2, .sec > .body, .sec > .fine, .sec > .act, .lot, .step, .q")];
  els.forEach((e) => e.classList.add("rv"));
  let pending = els.slice();
  const sweep = () => {
    if (!pending.length) return;
    const lim = innerHeight * 0.88;
    pending = pending.filter((e) => {
      if (e.getBoundingClientRect().top > lim) return true;
      e.classList.add("in");
      return false;
    });
    requestAnimationFrame(sweep);
  };
  requestAnimationFrame(sweep);
}
function clock() {
  const el = $("#clock");
  const tick = () => {
    el.textContent = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit", minute: "2-digit", timeZone: "Asia/Vientiane",
    }).format(new Date()) + " ICT";
  };
  tick();
  setInterval(tick, 20000);
}
/* ── go ────────────────────────────────────────────────────────────────────── */
buildLedger(); buildLots(); buildSteps(); buildQA();
wireDrag(); reveals(); clock(); syncSlider();
draw = slope();
if (REDUCED) {
  sCur = sTarget = 11.9;                 /* mid-harvest, one still frame */
  readout();
  warm = 1;
  if (draw) requestAnimationFrame(() => draw(6, 1));
  slider.addEventListener("input", () => {
    sCur = sTarget = parseFloat(slider.value);
    readout();
    if (draw) draw(6, 1);
  });
} else {
  readout();
  requestAnimationFrame(frame);
}
