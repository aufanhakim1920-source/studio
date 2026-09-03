const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const VERT = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;
const FRAG = `
precision highp float;
uniform vec2  u_res;
uniform float u_time;
uniform float u_still;    /* 0 = churning, 1 = settled */
uniform vec2  u_mouse;
#define TAU 6.28318530718
/* The classic caustic loop: a point is pushed around by sines of itself, and the
   reciprocal of the distance is accumulated. Five iterations is the point where
   it stops looking like a plasma and starts looking like light on water. */
float caustic(vec2 uv, float t, float amp){
  vec2 p = mod(uv * TAU, TAU) - 250.0;
  vec2 i = p;
  float c = 1.0;
  const float inten = 0.0045;
  for (int n = 0; n < 5; n++){
    float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y),
                 sin(tt - i.y) + cos(tt + i.x)) * amp;
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten),
                           p.y / (cos(i.y + tt) / inten)));
  }
  c /= 5.0;
  c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 8.0);
}
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
  /* the object sits right of the copy column on wide screens, same as SYMBOLON */
  float off = 0.26 * smoothstep(0.95, 1.5, u_res.x / u_res.y);
  vec2 c0 = uv - vec2(off, 0.02);
  vec2 m = (u_mouse - 0.5) * vec2(u_res.x / u_res.y, -1.0);
  /* ⭐ THE MECHANIC: the water settles where the hand is. Near the cursor the
     churn amplitude falls to almost nothing, so the caustics flatten into a
     smooth pool; away from it they keep moving. */
  float near = 1.0 - smoothstep(0.0, 0.46, length(uv - m));
  float calm = clamp(near * 0.85 + u_still * 0.35, 0.0, 1.0);
  float t = u_time * 0.34;
  float amp = mix(1.0, 0.12, calm);
  float k = caustic(c0 * 1.55 + 12.0, t, amp);
  /* held inside a disc, so the page is dark at the edges and the object leads */
  float disc = 1.0 - smoothstep(0.10, 0.78, length(c0 * vec2(1.0, 1.22)));
  k *= disc;
  /* ⚠️ a gentle guard over the copy column. Full-bleed caustics put bright
     filaments directly under the paragraph; this dims the left third on wide
     screens without cutting a visible edge into the water. */
  float guard = mix(1.0, smoothstep(-0.50, 0.02, uv.x), smoothstep(0.95, 1.5, u_res.x / u_res.y));
  k *= mix(0.34, 1.0, guard);
  vec3 aqua = vec3(0.565, 0.878, 0.937);
  vec3 deep = vec3(0.043, 0.145, 0.239);
  vec3 col = vec3(0.0);
  col += aqua * k * 1.35;
  col += vec3(1.0) * pow(k, 2.4) * 0.55;              /* the bright filaments */
  col += deep * disc * 0.75;                          /* the body of the water */
  /* the settled pool reads as a held breath: a soft lens right under the hand */
  col += aqua * pow(near, 3.0) * 0.16 * disc;
  /* ⚠️ never clamp() — this curve is what stops added light clipping to white */
  col = vec3(1.0) - exp(-col * 1.85);
  col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.02;
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
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(p, "a");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {
    res: gl.getUniformLocation(p, "u_res"),
    time: gl.getUniformLocation(p, "u_time"),
    still: gl.getUniformLocation(p, "u_still"),
    mouse: gl.getUniformLocation(p, "u_mouse"),
  };
  let W = 0, H = 0;
  function size() {
    /* caustics are five iterations per pixel — cap the buffer harder than
       SYMBOLON's, or a retina laptop renders four times the work for no gain */
    const d = Math.min(devicePixelRatio || 1, 1.4);
    W = Math.round(innerWidth * d); H = Math.round(innerHeight * d);
    cv.width = W; cv.height = H;
    gl.viewport(0, 0, W, H);
  }
  size();
  addEventListener("resize", size, { passive: true });
  let target = 0, still = 0, mx = 0.5, my = 0.5, tmx = 0.5, tmy = 0.5;
  addEventListener("pointermove", (e) => {
    tmx = e.clientX / innerWidth; tmy = e.clientY / innerHeight;
    const ar = innerWidth / innerHeight;
    const off = 0.26 * Math.max(0, Math.min(1, (ar - 0.95) / 0.55));
    const dx = (tmx - 0.5) * ar - off, dy = tmy - 0.46;
    target = Math.max(0, 1 - Math.hypot(dx, dy) / 0.58);
  }, { passive: true });
  addEventListener("pointerleave", () => { target = 0; });
  const touch = matchMedia("(hover: none)").matches;
  if (touch) { target = 1; tmx = 0.5; tmy = 0.44; }
  const t0 = performance.now();
  function frame(now) {
    /* ⭐ the pointer position is lerped too, not just the amount. Water that
       snapped to the cursor would read as a spotlight; water that follows a
       beat late reads as something with weight in it. */
    still += (target - still) * 0.05;
    mx += (tmx - mx) * 0.075;
    my += (tmy - my) * 0.075;
    const t = REDUCED ? 6.0 : (now - t0) / 1000;
    gl.uniform2f(U.res, W, H);
    gl.uniform1f(U.time, t);
    gl.uniform1f(U.still, still);
    gl.uniform2f(U.mouse, mx, my);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    const pct = Math.round(still * 100);
    $("#thresh").innerHTML = `SURFACE &mdash; <b>${pct}%</b> still`;
    $("#rev").textContent = (12.4 - still * 0.3).toFixed(1);
    const st = $("#stat");
    st.textContent = pct > 62 ? "SETTLED" : pct > 22 ? "SLOWING" : "MOVING";
    st.classList.toggle("on", pct > 62);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return true;
}
/* ── content ──────────────────────────────────────────────────────────────── */
const ORDERS = [
  ["Depth", "31.4 metres, into a confined aquifer.",
   "Sealed above by forty metres of clay.", "Nothing that fell this century has reached it."],
  ["Age", "Carbon dating puts it near 2,000 years.",
   "It entered the ground around 30 BC.", "Slow water. Basalt gives it the minerals and takes its time."],
  ["Handling", "Bottled at the head, in glass, within the hour.",
   "No transport, no holding tank, no ozone.", "The only thing we do to it is move it eleven metres."],
];
const JOBS = [
  ["I", "Calcium &mdash; 22 mg/L", "From basalt"],
  ["II", "Magnesium &mdash; 8.4 mg/L", "From basalt"],
  ["III", "Silica &mdash; 41 mg/L", "The mouthfeel"],
  ["IV", "Nitrate &mdash; below detection", "No surface water"],
  ["V", "pH &mdash; 7.6", "Measured at the head"],
];
const TIERS = [
  ["Half case", "$42", "6 &times; 750ml", ["Delivered fortnightly", "Glass returned and refilled", "Pause any time"], false],
  ["Full case", "$74", "12 &times; 750ml", ["Delivered fortnightly", "Crate swapped at the door", "Works out at $6.20 a bottle"], true],
  ["Restaurant", "$4.80", "per bottle", ["Weekly, by the pallet", "Still and sparkling", "Your name on the crate"], false],
];
const QA = [
  ["Is bottled water not just a scam?", "Often, yes. Most of it is municipal supply through a filter, sold at a markup with a mountain on the label. The honest reasons to buy this one are that it is a specific water from a specific hole in the ground with a published analysis, and that it comes in glass we take back. If your tap water tastes fine, drink your tap water."],
  ["Why glass, when it is heavier?", "Because plastic gives water a taste within about six weeks and glass does not, and because we can wash and refill glass roughly forty times. The weight is a real cost and we carry it — the crate deposit is what makes returns actually happen."],
  ["What does two thousand years old actually mean?", "That the water entering the bore now fell as rain around then, and has been moving through rock ever since. It is a measure of isolation rather than quality — it means nothing recent has reached it, which is why the nitrate reads at zero."],
  ["How much do you take?", "About 4% of the licensed allocation, and the bore level is published monthly on this site. A spring you overdraw stops being a spring, and we would rather sell less of it for longer."],
  ["Do you do sparkling?", "Yes, carbonated at the head with CO₂ recovered from the same process. Same water, same analysis, slightly sharper — the silica reads differently once it is carbonated and some people prefer it."],
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
      <span class="tier__k">${k}${hot ? " &middot; most ordered" : ""}</span>
      <span class="tier__p">${p}<small>${u}</small></span>
      <ul>${l.map((x) => `<li>${x}</li>`).join("")}</ul>
      <a href="#">${hot ? "Start fortnightly" : "Order"}</a>
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
