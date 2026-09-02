/* MOLTEN — a foundry that casts small runs
 * ---------------------------------------------------------------------------
 * ⭐ THE OBJECT: a mass of metal that is cold until you touch it.
 *
 * Third build in the round, same craft as gallery 67 (raw WebGL, SDF, divide for
 * light, 1-exp tone mapping, lerped response) and a deliberately different
 * mechanic from the other two:
 *
 *   67        a ring LEANS toward the cursor
 *   SYMBOLON  a sign RESOLVES as you approach
 *   ABYSSAL   water STILLS where you hold it
 *   MOLTEN    metal HEATS where you drag, and cools again on its own
 *
 * The heat is a trail, not a spotlight: it accumulates while you move and decays
 * when you stop, so the object has a memory of where your hand has been. That is
 * what makes it feel like matter rather than a hover state.
 *
 * ⚠️ This is the only build in the round on a LIGHT ground. Three near-black
 * pages in a row is the failure [[Vary the Palette]] exists to prevent.
 */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

const VERT = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform vec2  u_res;
uniform float u_time;
uniform float u_heat;      /* 0 = cold, 1 = pouring */
uniform vec2  u_mouse;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), u.x),
             mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

/* the mass: three metaballs summed, so the silhouette is one blob that breathes
   rather than three circles that overlap */
float mass(vec2 p, float t){
  float d = 0.0;
  d += 0.28 / length(p - vec2(sin(t * 0.31) * 0.10, cos(t * 0.27) * 0.07));
  d += 0.20 / length(p - vec2(-0.30 + cos(t * 0.23) * 0.07, 0.19));
  d += 0.19 / length(p - vec2( 0.29 + sin(t * 0.19) * 0.07, -0.18));
  return d;
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
  float off = 0.28 * smoothstep(0.95, 1.5, u_res.x / u_res.y);
  /* ⚠️ scaled DOWN. At 1.35 the mass reached across the headline and, with the
     soft metaball edge, read as a brown cloud rather than an object. */
  vec2 p = (uv - vec2(off, 0.01)) * 1.95;

  float t = u_time;
  vec2 m = ((u_mouse - 0.5) * vec2(u_res.x / u_res.y, -1.0) - vec2(off, 0.01)) * 1.95;

  /* surface texture: the metal is not a smooth blob, it has a skin */
  float grain = fbm(p * 3.4 + vec2(0.0, t * 0.08));
  /* ⚠️ the grain was 0.16 and it was blurring the silhouette it was meant to
     texture. Skin, not fog. */
  float f = mass(p, t) + grain * 0.05;

  /* the silhouette. smoothstep across the metaball threshold gives a soft edge
     that still reads as a hard object at this contrast. */
  /* a TIGHT threshold is what makes it read as metal instead of a cloud */
  float body = smoothstep(1.09, 1.17, f);
  float edge = smoothstep(1.20, 1.10, f) * smoothstep(1.02, 1.11, f);

  /* ⭐ heat where the hand has been. The pointer's own proximity, gated by the
     accumulated heat value the page has been tracking, so it fades on its own. */
  float touch = 1.0 - smoothstep(0.0, 0.40, length(p - m));
  /* ⚠️ was touch*0.9 + heat*0.5, which put a floor of glow under the WHOLE mass
     and turned it into a rusty brown disc. Heat has to be LOCAL to the hand;
     the accumulated value scales how hot the touch gets, it is not a base. */
  float hot = pow(touch, 1.6) * (0.30 + u_heat * 1.9) * body;

  /* veins: the noise field, but only visible where the metal is hot */
  float vein = pow(max(fbm(p * 5.2 - vec2(t * 0.12, 0.0)), 0.0), 2.2);

  vec3 bone  = vec3(0.894, 0.886, 0.843);
  vec3 ink   = vec3(0.039, 0.039, 0.039);
  vec3 orange= vec3(0.769, 0.286, 0.102);
  vec3 yellow= vec3(1.000, 0.780, 0.310);

  /* start from the page's own ground so the canvas and the CSS agree */
  vec3 col = bone;
  col = mix(col, ink, body * 0.985);
  col = mix(col, vec3(0.30, 0.29, 0.27), edge * 0.85);        /* a lit rim */

  /* the glow is added, never mixed — hot metal EMITS */
  col += orange * hot * (0.22 + vein * 1.9);
  col += yellow * pow(hot, 2.2) * vein * 1.5;

  /* the pour scar: a bright line where the hand crossed most recently */
  col += yellow * pow(touch, 6.0) * body * 0.5;

  /* ⚠️ still no clamp(). On a light ground it matters even more — clipping here
     would flatten the hot metal into a flat orange patch. */
  col = vec3(1.0) - exp(-col * 1.55);

  col += (hash(gl_FragCoord.xy + t) - 0.5) * 0.02;
  gl_FragColor = vec4(col, 1.0);
}`;

function shader() {
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

  const U = {
    res: gl.getUniformLocation(p, "u_res"),
    time: gl.getUniformLocation(p, "u_time"),
    heat: gl.getUniformLocation(p, "u_heat"),
    mouse: gl.getUniformLocation(p, "u_mouse"),
  };

  let W = 0, H = 0;
  function size() {
    const d = Math.min(devicePixelRatio || 1, 1.6);
    W = Math.round(innerWidth * d); H = Math.round(innerHeight * d);
    cv.width = W; cv.height = H;
    gl.viewport(0, 0, W, H);
  }
  size();
  addEventListener("resize", size, { passive: true });

  /* ⭐ heat ACCUMULATES with movement and decays on its own. Distance alone would
     make it a proximity light; adding the speed of the drag makes it work — you
     have to rub it, and it stays warm afterwards. */
  let heat = 0, mx = 0.5, my = 0.5, tmx = 0.5, tmy = 0.5, lastX = 0, lastY = 0;
  addEventListener("pointermove", (e) => {
    tmx = e.clientX / innerWidth; tmy = e.clientY / innerHeight;
    const sp = Math.hypot(tmx - lastX, tmy - lastY);
    lastX = tmx; lastY = tmy;
    const ar = innerWidth / innerHeight;
    const off = 0.28 * Math.max(0, Math.min(1, (ar - 0.95) / 0.55));
    const dx = (tmx - 0.5) * ar - off, dy = tmy - 0.45;
    const near = Math.max(0, 1 - Math.hypot(dx, dy) / 0.42);
    heat = Math.min(1, heat + sp * 6.5 * near);
  }, { passive: true });

  const touch = matchMedia("(hover: none)").matches;
  if (touch) { heat = 0.7; tmx = 0.5; tmy = 0.42; }

  const t0 = performance.now();
  function frame(now) {
    if (!touch) heat *= 0.982;              /* it cools, always */
    mx += (tmx - mx) * 0.09;
    my += (tmy - my) * 0.09;

    const t = REDUCED ? 4.0 : (now - t0) / 1000;
    gl.uniform2f(U.res, W, H);
    gl.uniform1f(U.time, t);
    gl.uniform1f(U.heat, heat);
    gl.uniform2f(U.mouse, mx, my);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    const deg = Math.round(heat * 640);
    $("#thresh").innerHTML = `MELT &mdash; <b>${deg}</b>&deg;C above ambient`;
    $("#rev").textContent = 660 + Math.round(heat * 40);
    const st = $("#stat");
    st.textContent = deg > 400 ? "POURING" : deg > 130 ? "WARMING" : "COOL";
    st.classList.toggle("on", deg > 400);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return true;
}

/* ── content ──────────────────────────────────────────────────────────────── */
const ORDERS = [
  ["Pattern", "Week one — we cut the pattern.",
   "3D printed, or machined in tooling board for anything over 200 units.",
   "You own it. We store it free for five years."],
  ["Mould", "Week two — sand, rammed around the pattern.",
   "Green sand for aluminium, resin-bonded for bronze and anything fine.",
   "One mould, one part. It is destroyed to get the casting out."],
  ["Pour", "Week three — melt, pour, fettle, finish.",
   "660°C for aluminium, 1,150°C for bronze. Poured by hand, one at a time.",
   "Then cut off the runners, linish, and finish however you asked."],
];

const JOBS = [
  ["01", "LM6 aluminium", "General, marine"],
  ["02", "LM25 heat-treated", "Structural"],
  ["03", "CC491K bronze", "Bearings, marine"],
  ["04", "Silicon bronze", "Sculpture, architectural"],
  ["05", "Recycled billet", "$0 alloy premium"],
];

const TIERS = [
  ["Ten off", "$180", "per part", ["Plus $900 pattern, once", "Three weeks", "As-cast or linished"], false],
  ["One hundred", "$46", "per part", ["Plus $1,400 pattern, once", "Four weeks", "Machined faces if you need them"], true],
  ["Five hundred", "$21", "per part", ["Plus $3,200 hard pattern", "Six weeks, run in two batches", "Full dimensional report"], false],
];

const QA = [
  ["Why will nobody else quote ten parts?", "Because the pattern and the setup cost the same whether you pour ten or ten thousand, so a small run looks terrible on a per-part basis and most foundries would rather not have the machine tied up. We priced the pattern separately and on the invoice, which makes ten viable — you are paying the real setup cost once instead of having it hidden in a per-part number."],
  ["Can you cast from a 3D print?", "Yes, and about half our work starts that way. Send an STL and we will tell you within a day whether it will cast — the usual problems are wall sections under 3mm, no draft angle, and internal cavities that the sand cannot get out of."],
  ["What tolerance can you hold?", "±0.8mm on a sand casting, before machining. If you need better than that on a specific face, we cast it oversize and machine it — say which faces matter at quote time and we will add the stock."],
  ["Is recycled metal actually as good?", "For LM6 aluminium, yes — we buy certified recycled billet and it hits the same spec sheet, which is why there is no premium. For bronze we use virgin ingot, because recycled bronze varies too much and you cannot see it until the part fails."],
  ["What happens if a casting is bad?", "We recast it. Porosity and cold shuts are our problem, not yours, and about 4% of parts get scrapped in-house before they are ever sent. If one gets past us, send a photo and it goes back in the furnace."],
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
      <span class="tier__k">${k}${hot ? " &middot; most quoted" : ""}</span>
      <span class="tier__p">${p}<small>${u}</small></span>
      <ul>${l.map((x) => `<li>${x}</li>`).join("")}</ul>
      <a href="#">${hot ? "Send a drawing" : "Quote this"}</a>
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
