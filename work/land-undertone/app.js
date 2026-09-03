(() => {
  "use strict";

  /* ── the archive ──────────────────────────────────────────────────────── */
  const RELEASES = [
    { t: "Sfumato", a: "Nadia Reyes Trio", y: 1971, m: "UT-1101", s: "a",
      n: "Two reels in the fire cabinet of a Cádiz radio station, labelled only “do not erase”.",
      hex: "#f0b429" },
    { t: "Long Grass Cut Twice", a: "The Ondine Section", y: 1968, m: "UT-1102", s: "b",
      n: "Under the bandstand at Whitby, wrapped in a fertiliser sack against the damp.",
      hex: "#f2a03c" },
    { t: "Baile de Ceniza", a: "Hermanos Delgado", y: 1974, m: "UT-1103", s: "a",
      n: "One acetate, used for eleven years as a spare shelf in a Bogotá barbershop.",
      hex: "#d94f14" },
    { t: "Iron Sunday", a: "Wilbert Nkosi & the Six", y: 1976, m: "UT-1104", s: "a",
      n: "Pulled from a Johannesburg pressing plant’s reject bin, boxed as a wedding tape.",
      hex: "#e85d04" },
    { t: "Nightwater Hymn", a: "Aster Kebede", y: 1973, m: "UT-1105", s: "b",
      n: "Carried out of Addis Ababa in a rice tin. The second side has never surfaced.",
      hex: "#e9c46a" },
    { t: "Telephone Country", a: "Marguerite Vaal", y: 1969, m: "UT-1106", s: "a",
      n: "Sold as scrap to a Rotterdam sound library, who taped three years of weather over side two.",
      hex: "#5cc6d6" },
    { t: "The Slow Room", a: "Kondo Trio", y: 1978, m: "UT-1107", s: "a",
      n: "A dub run off the desk of a Sapporo listening bar the night the master was lost.",
      hex: "#189e8c" },
    { t: "Salt Harbour", a: "Ivor Penhale", y: 1979, m: "UT-1108", s: "b",
      n: "Twenty-four minutes on a home reel, found inside a repaired double bass in Penzance.",
      hex: "#1fb49b" },
  ];
  const N = RELEASES.length;

  const hexToRgb = (h) => [
    parseInt(h.slice(1, 3), 16) / 255,
    parseInt(h.slice(3, 5), 16) / 255,
    parseInt(h.slice(5, 7), 16) / 255,
  ];
  const rgbToHex = (c) =>
    "#" + c.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0")).join("");

  RELEASES.forEach((r) => (r.c = hexToRgb(r.hex)));

  /* ── dom ──────────────────────────────────────────────────────────────── */
  const $ = (id) => document.getElementById(id);
  const canvas = $("field");
  const frameTop = $("frameTop");
  const rail = $("rail");
  const head = $("head");
  const ticksWrap = $("ticks");
  const hint = $("hint");
  const elCat = $("cat"), elTitle = $("title"), elBy = $("by"), elNote = $("note");
  const elBearing = $("bearing"), elSignal = $("signal");
  const elFoundTop = $("foundTop"), elFoundBottom = $("foundBottom");
  const indexEl = $("index"), indexLink = $("indexLink"), closeIndex = $("closeIndex"), indexList = $("indexList");
  const root = document.documentElement;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ── state ────────────────────────────────────────────────────────────── */
  let target = 3.5 / N;          // land mid-archive: the form is whole, and it reads as "there is more either way"
  let sweep = target;
  let idx = 3, lock = 1, dir = 1;
  let dwell = 0, pulse = 0, armed = false;
  const found = new Float32Array(N);
  let foundCount = 0;
  let dragging = null;           // "field" | "rail" | null
  let lastX = 0;
  let topY = 0.9, railY = 0.3;

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const smoothstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

  /* ── webgl ────────────────────────────────────────────────────────────── */
  const VS = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;

  const FS = `precision highp float;
uniform vec2  uRes;
uniform float uTime;
uniform float uSweep;
uniform float uLock;
uniform vec3  uTint;
uniform float uPulse;
uniform float uFound[8];
uniform float uTopY;
uniform float uRailY;
uniform float uMotion;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), u.x),
             mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for(int i=0;i<4;i++){ v += a*vnoise(p); p *= 2.03; a *= 0.5; }
  return v;
}

void main(){
  vec2  frag   = gl_FragCoord.xy;
  vec2  p      = (frag - 0.5*uRes) / uRes.y;
  float aspect = uRes.x / uRes.y;
  float sy     = frag.y / uRes.y;
  float T      = uTime * uMotion;

  float bx     = (uSweep - 0.5) * aspect;
  float bobY   = 0.055 + sin(T*0.31)*0.013;
  vec2  emit   = vec2(bx, bobY);
  float detune = 1.0 - uLock;

  /* wavefronts — sharp ridges, not a gradient. w/(abs(x)+w) is the same
     divide-by-distance glow as the ribbon recipe; the constant floor is
     subtracted so the troughs go genuinely black. The front is an ELLIPSE
     rather than a circle, so the signal spreads ALONG the archive axis and a
     wide screen gets a travelling wave instead of a radar target. */
  vec2  q    = (p - emit) * vec2(0.78, 1.0);
  float d    = length(q);
  float dn   = length(p - emit);
  float warp = (fbm(p*2.4 + vec2(T*0.05, -T*0.045)) - 0.5) * (0.030 + detune*0.34);
  float dr   = d + warp;
  float ph   = dr*(70.0 - uLock*8.0) - T*2.1;
  float s    = abs(sin(ph));
  float k    = 0.048 + detune*0.055;
  float arcs = max(k/(s + k) - k/(1.0 + k), 0.0);
  arcs *= exp(-d*2.72);
  arcs *= 0.14 + 1.02*uLock;

  /* the bearing itself */
  float bw   = 0.0013 + 0.0032*detune;
  float beam = bw/(abs(p.x - bx) + bw);
  beam *= 1.0 - smoothstep(0.24, 0.50, abs(p.y - bobY*0.35));
  beam *= 0.34 + 0.66*uLock + detune*0.26*(vnoise(vec2(p.y*9.0, T*3.4)) - 0.5);
  beam  = max(beam, 0.0);

  /* the lock: a horizontal filament only a tuned station puts out */
  float hw    = 0.0016 + 0.005*detune;
  float horiz = hw/(abs(p.y - bobY) + hw);
  horiz *= exp(-abs(p.x - bx)*1.35) * uLock;

  float node = 0.0095/(dn + 0.0095);
  node = node*node*(0.10 + 0.90*uLock);

  /* the other seven sides, standing in the field. Recovered ones burn. */
  float marks = 0.0;
  for(int i=0;i<8;i++){
    float sx = ((float(i)+0.5)/8.0 - 0.5)*aspect;
    float mw = 0.0011;
    float m  = mw/(abs(p.x - sx) + mw);
    m *= 1.0 - smoothstep(0.05, 0.30, abs(p.y + 0.11));
    marks += m*(0.045 + 0.60*uFound[i]);
  }

  vec3 col = vec3(0.0);
  col += uTint * arcs * 1.25;
  col += mix(uTint, vec3(1.0), 0.13) * beam  * 0.62;
  col += mix(uTint, vec3(1.0), 0.09) * horiz * 0.50;
  col += mix(uTint, vec3(1.0), 0.40) * node  * 1.05;
  col += uTint * marks * 0.75;
  col += mix(uTint, vec3(1.0), 0.12) * (1.0-uPulse) * exp(-abs(d - uPulse*0.80)*17.0) * 1.7;

  /* ground: reference 36's navy, taken most of the way to black */
  col += vec3(0.0075, 0.0105, 0.0235);
  col += vec3(0.58, 0.18, 0.02) * 0.090 * exp(-length((p - vec2(bx*0.35, -0.40))*vec2(0.5, 1.7))*2.1);

  /* guards: the two frames and the caption band stay dark so type reads.
     Each edge lands on a hairline that is actually drawn, so the falloff
     reads as the field ending at the scale rather than as a mask. */
  float topGuard  = 1.0 - 0.82*smoothstep(uTopY - 0.035, uTopY + 0.018, sy);
  float railGuard = mix(0.11, 1.0, smoothstep(uRailY - 0.05, uRailY + 0.022, sy));
  col *= topGuard * railGuard;
  col *= 1.0 - 0.46*smoothstep(0.32, 1.06, length(p*vec2(0.70, 1.0)));

  col = vec3(1.0) - exp(-col*1.85);          /* never clamp */

  float g = hash(frag + fract(uTime*0.7)*vec2(37.0, 71.0));
  col += (g - 0.5)*0.050;

  gl_FragColor = vec4(col, 1.0);
}`;

  let gl = null, prog = null, U = null, glOK = false;

  function compile(g, type, src) {
    const sh = g.createShader(type);
    g.shaderSource(sh, src);
    g.compileShader(sh);
    if (!g.getShaderParameter(sh, g.COMPILE_STATUS)) { g.deleteShader(sh); return null; }
    return sh;
  }

  function initGL() {
    try {
      gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "high-performance" })
        || canvas.getContext("experimental-webgl", { antialias: false, alpha: false });
    } catch (e) { gl = null; }
    if (!gl) return false;
    const vs = compile(gl, gl.VERTEX_SHADER, VS);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return false;
    prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    U = {};
    ["uRes", "uTime", "uSweep", "uLock", "uTint", "uPulse", "uTopY", "uRailY", "uMotion"]
      .forEach((n) => (U[n] = gl.getUniformLocation(prog, n)));
    U.uFound = gl.getUniformLocation(prog, "uFound[0]");
    return true;
  }

  glOK = initGL();
  if (!glOK) root.setAttribute("data-gl", "off");   // the CSS field stands in; nothing logged

  /* ── layout ───────────────────────────────────────────────────────────── */
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.max(1, Math.round(w * dpr)), chh = Math.max(1, Math.round(h * dpr));
    if (canvas.width !== cw || canvas.height !== chh) { canvas.width = cw; canvas.height = chh; }
    if (glOK) gl.viewport(0, 0, cw, chh);
    topY = 1 - frameTop.getBoundingClientRect().bottom / h;
    const rr = rail.getBoundingClientRect();
    railY = 1 - (rr.top + rr.height / 2) / h;
    placeHead();
  }

  /* ── the scale ────────────────────────────────────────────────────────── */
  const tickEls = [];
  for (let i = 0; i < N; i++) {
    const el = document.createElement("div");
    el.className = "tick";
    el.style.left = ((i + 0.5) / N * 100) + "%";
    el.style.setProperty("--tk", RELEASES[i].hex);
    el.innerHTML = '<i class="tk-m"></i><span class="tk-n">' + String(i + 1).padStart(2, "0") + "</span>";
    ticksWrap.appendChild(el);
    tickEls.push(el);
  }

  function placeHead() {
    head.style.transform = "translateX(" + (sweep * rail.clientWidth).toFixed(2) + "px)";
  }

  /* ── the index ────────────────────────────────────────────────────────── */
  const rowEls = [];
  RELEASES.forEach((r, i) => {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button";
    b.className = "row";
    b.style.setProperty("--rc", r.hex);
    b.style.setProperty("--d", (i * 0.035).toFixed(3) + "s");
    b.innerHTML =
      '<span class="r-n">' + String(i + 1).padStart(2, "0") + "</span>" +
      '<span class="r-t">' + r.t + "</span>" +
      '<span class="r-a">' + r.a + "</span>" +
      '<span class="r-y">' + r.y + "</span>" +
      '<span class="r-s">—</span>';
    b.addEventListener("click", () => { arm(); target = (i + 0.5) / N; closeIdx(); });
    li.appendChild(b);
    indexList.appendChild(li);
    rowEls.push(b);
  });

  let idxOpen = false;
  function openIdx() {
    idxOpen = true; indexEl.classList.add("open"); indexEl.setAttribute("aria-hidden", "false");
    closeIndex.focus();
  }
  function closeIdx() {
    idxOpen = false; indexEl.classList.remove("open"); indexEl.setAttribute("aria-hidden", "true");
    indexLink.focus();
  }
  indexLink.addEventListener("click", (e) => { e.preventDefault(); idxOpen ? closeIdx() : openIdx(); });
  closeIndex.addEventListener("click", closeIdx);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && idxOpen) closeIdx(); });

  /* ── copy ─────────────────────────────────────────────────────────────── */
  let shownIdx = -1;
  function showRelease(i) {
    const r = RELEASES[i];
    elCat.textContent = r.m + " · side " + r.s;
    elTitle.textContent = r.t;
    elBy.textContent = r.a + ", " + r.y;
    elNote.textContent = r.n;
    shownIdx = i;
  }
  function markFound(i) {
    tickEls[i].classList.add("found");
    rowEls[i].classList.add("found");
    rowEls[i].querySelector(".r-s").textContent = "●";
    elFoundTop.textContent = foundCount + "/" + N;
    elFoundBottom.textContent = "recovered " + foundCount + " / " + N;
  }
  showRelease(3);

  /* ── input ────────────────────────────────────────────────────────────── */
  function arm() {
    if (armed) return;
    armed = true;
    hint.classList.add("gone");
  }

  function beginField(e) {
    dragging = "field"; lastX = e.clientX; arm();
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* older engines */ }
  }
  function beginRail(e) {
    dragging = "rail"; arm();
    const r = rail.getBoundingClientRect();
    target = clamp01((e.clientX - r.left) / r.width);
    try { rail.setPointerCapture(e.pointerId); } catch (err) { /* older engines */ }
  }
  function move(e) {
    if (!dragging) return;
    if (dragging === "field") {
      target = clamp01(target + (e.clientX - lastX) / window.innerWidth * 0.85);
      lastX = e.clientX;
    } else {
      const r = rail.getBoundingClientRect();
      target = clamp01((e.clientX - r.left) / r.width);
    }
  }
  function end() {
    if (!dragging) return;
    dragging = null;
    const s = target * N;
    const i = Math.max(0, Math.min(N - 1, Math.floor(s)));
    if (Math.abs(s - (i + 0.5)) < 0.34) target = (i + 0.5) / N;   // clicks into the station
  }

  canvas.addEventListener("pointerdown", beginField);
  rail.addEventListener("pointerdown", beginRail);
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);
  window.addEventListener("pointercancel", end);

  /* only a sweep that began on the field or the rail eats the touch;
     everything else on the page keeps its native behaviour. */
  document.addEventListener("touchmove", (e) => { if (dragging) e.preventDefault(); }, { passive: false });

  window.addEventListener("wheel", (e) => {
    if (idxOpen) return;
    arm();
    target = clamp01(target + (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * 0.00042);
    e.preventDefault();
  }, { passive: false });

  rail.addEventListener("keydown", (e) => {
    const step = e.shiftKey ? 1 / N : 0.012;
    let handled = true;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") target = clamp01(target + step);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") target = clamp01(target - step);
    else if (e.key === "PageUp") target = clamp01(target + 1 / N);
    else if (e.key === "PageDown") target = clamp01(target - 1 / N);
    else if (e.key === "Home") target = 0.5 / N;
    else if (e.key === "End") target = (N - 0.5) / N;
    else handled = false;
    if (handled) { arm(); e.preventDefault(); }
  });

  /* ── loop ─────────────────────────────────────────────────────────────── */
  let t0 = performance.now(), readoutAcc = 0, needsDraw = true;

  function frame(now) {
    const dt = Math.min((now - t0) / 1000, 0.05);
    t0 = now;
    const still = reduce.matches;

    const prev = sweep;
    sweep += (target - sweep) * (1 - Math.exp(-dt * (still ? 22 : 7.5)));
    if (Math.abs(target - sweep) < 0.00012) sweep = target;

    const s = sweep * N;
    const i = Math.max(0, Math.min(N - 1, Math.floor(s)));
    const f = s - (i + 0.5);
    lock = 1 - smoothstep(0.06, 0.46, Math.abs(f));
    dir = f < 0 ? -1 : 1;

    if (i !== idx) { idx = i; dwell = 0; }
    if (idx !== shownIdx) showRelease(idx);      /* swaps at lock 0 — invisible */

    /* recovery */
    if (armed && lock > 0.9) {
      dwell += dt;
      if (dwell >= 0.65 && !found[idx]) {
        found[idx] = 1; foundCount++; pulse = 0.001; markFound(idx);
      }
    } else dwell = 0;
    if (pulse > 0) { pulse += dt * 1.25; if (pulse >= 1) pulse = 0; }

    /* tint crossfades between neighbouring sides */
    /* ⚠️ No crossfade. Reference 36's five colours are two clusters — warm and
       cool — so ANY interpolation between a warm and a cool side leaves the
       palette (RGB went through grey, HSL went through green; both measured).
       A dial does not blend stations anyway: the signal dies at the null and
       comes back as the next station. The field is near-dark at lock 0, which
       is exactly where the hue changes, so the swap is never seen. */
    const tint = RELEASES[idx].c;

    root.style.setProperty("--lk", lock.toFixed(3));
    root.style.setProperty("--dir", String(dir));
    root.style.setProperty("--tint", rgbToHex(tint));

    if (sweep !== prev) { placeHead(); needsDraw = true; }

    readoutAcc += dt;
    if (readoutAcc > 0.1) {
      readoutAcc = 0;
      const bearing = Math.round(sweep * 1000);
      elBearing.textContent = "bearing " + String(bearing).padStart(3, "0");
      elSignal.textContent = "signal " + Math.round(lock * 100) + "%";
      rail.setAttribute("aria-valuenow", String(bearing));
      rail.setAttribute("aria-valuetext",
        "Bearing " + String(bearing).padStart(3, "0") + " — " + RELEASES[idx].t + ", " + RELEASES[idx].a +
        (found[idx] ? ", recovered" : ""));
    }

    if (glOK && (!still || needsDraw || pulse > 0)) {
      const time = now / 1000;
      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform1f(U.uTime, time);
      gl.uniform1f(U.uSweep, sweep);
      gl.uniform1f(U.uLock, lock);
      gl.uniform3f(U.uTint, tint[0], tint[1], tint[2]);
      gl.uniform1f(U.uPulse, pulse);
      gl.uniform1fv(U.uFound, found);
      gl.uniform1f(U.uTopY, topY);
      gl.uniform1f(U.uRailY, railY);
      gl.uniform1f(U.uMotion, still ? 0 : 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      needsDraw = false;
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", () => { resize(); needsDraw = true; });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { resize(); needsDraw = true; });
  resize();
  requestAnimationFrame(frame);
})();
