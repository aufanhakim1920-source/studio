/* LODESTONE — a payments router
 * ---------------------------------------------------------------------------
 * ⭐ THE OBJECT: a field of iron filings lying along a magnetic field, drawn in
 * RAW WebGL as the whole page background. Drag and the field re-orients; the
 * filings swing round with lag and settle. The product routes every payment to
 * the cheapest path, so the visitor is literally doing what the product does.
 *
 * How the lag works without storing any per-filing state (technique borrowed
 * from the "store the time, not the state" idea in the vault): the CPU keeps
 * TWO magnet positions — one that chases the pointer quickly, one that chases
 * it slowly. Each filing has a fixed random blend between the two, so they
 * arrive at different moments and the field settles in a wave rather than
 * snapping as one. Nothing is integrated, nothing can drift.
 *
 * ⚠️ Never put a backtick inside this template literal, comments included —
 * it closes the string and the GLSL below is parsed as JavaScript.
 */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── the field ─────────────────────────────────────────────────────────── */
const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `precision highp float;
uniform vec2  u_res;
uniform float u_time;
uniform vec2  u_mag;    /* magnet, fast follow */
uniform vec2  u_lag;    /* magnet, slow follow */
uniform float u_grip;   /* 0..1 how hard the field is being held */
uniform float u_dim;    /* 0..1 the decision panel is open */

vec2 hash22(vec2 p){
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453123);
}

/* the ambient field: one slow continuous flow, so the filings drift even when
   nobody has touched anything. No noise texture, no per-cell randomness in the
   direction itself - the whole sheet turns together. */
vec2 ambient(vec2 q, float t){
  float a = sin(q.x * 3.40 + t * 0.21) * 0.72
          + cos(q.y * 2.90 - t * 0.17) * 0.72
          + sin((q.x + q.y) * 1.70 + t * 0.11) * 0.55
          + t * 0.05;
  return vec2(cos(a), sin(a));
}

/* a real 2D dipole - this is why the pattern arcs from pole to pole instead of
   pointing straight at the cursor like a spotlight */
vec2 dipole(vec2 q, vec2 mp, vec2 axis){
  vec2 r = q - mp;
  float r2 = max(dot(r, r), 0.0011);
  vec2 rh = r * inversesqrt(r2);
  return (2.0 * dot(axis, rh) * rh - axis) / r2;
}

float capsule(vec2 p, vec2 a, vec2 b){
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

void main(){
  float ar = u_res.x / u_res.y;
  vec2  p  = gl_FragCoord.xy / u_res.y;      /* y in 0..1, x in 0..ar */
  float t  = u_time;

  vec2  axis = vec2(cos(t * 0.10), sin(t * 0.10));
  float pull = 0.052 + 0.085 * u_grip;

  float CELL = 0.056;
  vec2  gid  = floor(p / CELL);
  vec3  col  = vec3(0.0);

  for (int j = -1; j <= 1; j++){
    for (int i = -1; i <= 1; i++){
      vec2 id = gid + vec2(float(i), float(j));
      vec2 h  = hash22(id);
      vec2 c  = (id + 0.5 + (h - 0.5) * 0.66) * CELL;

      /* the lag: every filing blends the two magnets differently */
      float k = 0.22 + 0.78 * h.x;
      vec2  d = ambient(c, t)
              + (dipole(c, u_lag, axis) * (1.0 - k) + dipole(c, u_mag, axis) * k) * pull;
      d = normalize(d);

      float len  = CELL * (0.28 + 0.15 * h.y);
      float dist = capsule(p, c - d * len, c + d * len);
      float th   = 0.0016 + 0.0011 * h.y;
      float g    = th / (dist + th * 0.80);
      /* ⚠️ each filing is only summed over a 3x3 cell neighbourhood, so a 1/d
         glow gets cut off in a straight line at the boundary and the field
         breaks into visible squares. Window it out before it gets there.
         (smoothstep is UNDEFINED with edge0 >= edge1 — always low, high.) */
      g *= 1.0 - smoothstep(0.42 * CELL, 1.30 * CELL, dist);

      /* filings near the magnet take its colour - one accent, and it is local */
      vec2  rel  = c - u_mag;
      float prox = 1.0 / (1.0 + 26.0 * dot(rel, rel));
      vec3  tone = mix(vec3(0.20, 0.23, 0.20), vec3(0.78, 0.95, 0.21), prox);
      col += tone * g * (0.55 + 0.45 * h.y);
    }
  }

  /* the magnet itself - a small bar lying along the axis */
  float md = capsule(p, u_mag - axis * 0.032, u_mag + axis * 0.032);
  col += vec3(0.78, 0.95, 0.21) * (0.0026 / (md + 0.0024)) * 0.92;
  col += vec3(0.24, 0.34, 0.08) * (0.017 / (length(p - u_mag) + 0.18));

  /* soft guards so the copy keeps its contrast: the left column on wide
     screens, the top of the screen on a phone. Soft, because an edge you can
     see is worse than the problem it solves. */
  float wide  = smoothstep(1.15, 1.45, ar);
  float guard = mix(1.0, 0.50 + 0.50 * smoothstep(0.06, 0.66, p.x / ar), wide);
  float top   = mix(0.38 + 0.62 * smoothstep(0.10, 0.86, 1.0 - p.y), 1.0, wide);
  col *= guard * top;

  col = vec3(1.0) - exp(-col * 1.58);          /* never clamp - this is the glow */
  col *= mix(1.0, 0.26, u_dim);
  float vig = 1.0 - 0.30 * length(p - vec2(ar * 0.5, 0.5));
  gl_FragColor = vec4(col * vig, 1.0);
}`;

const FIELD = {
  set: () => {},          /* replaced once WebGL is up */
  pin: null,
  dim: 0,
};

function field() {
  const cv = $("#gl");
  const gl = cv.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
  if (!gl) return;                       /* the CSS fallback on #gl covers this */

  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); return null; }
    return s;
  };
  const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  const pr = gl.createProgram();
  gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(pr)); return; }
  gl.useProgram(pr);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = {};
  ["u_res", "u_time", "u_mag", "u_lag", "u_grip", "u_dim"].forEach((n) => (U[n] = gl.getUniformLocation(pr, n)));

  let ar = innerWidth / innerHeight;
  const size = () => {
    const d = Math.min(devicePixelRatio || 1, 1.5);   /* a fullscreen shader at 3x is heat for nothing */
    cv.width = Math.round(innerWidth * d);
    cv.height = Math.round(innerHeight * d);
    ar = cv.width / cv.height;
    gl.viewport(0, 0, cv.width, cv.height);
  };
  size();
  addEventListener("resize", size, { passive: true });

  /* two magnets: one chases fast, one chases slow. The gap is the swing. */
  let tx = ar * 0.62, ty = 0.54;
  let mx = tx, my = ty, lx = tx, ly = ty, grip = 0, dim = 0;
  let lastPointer = -9999;

  const toField = (clientX, clientY) => [ (clientX / innerWidth) * ar, 1 - clientY / innerHeight ];

  addEventListener("pointermove", (e) => {
    const [a, b] = toField(e.clientX, e.clientY);
    tx = a; ty = b; lastPointer = performance.now();
  }, { passive: true });
  addEventListener("pointerdown", () => (lastPointer = performance.now()), { passive: true });

  /* hovering a route card drags the magnet onto it — the field literally
     points at the route you are reading */
  FIELD.set = (rect) => {
    if (!rect) { FIELD.pin = null; return; }
    const [a, b] = toField(rect.left + rect.width / 2, rect.top + rect.height / 2);
    FIELD.pin = [a, b];
    lastPointer = performance.now();
  };

  const t0 = performance.now();
  let raf = 0;

  const draw = (time) => {
    const now = performance.now();

    /* before anyone touches it the magnet drifts on its own, slowly */
    let gx = tx, gy = ty;
    if (FIELD.pin) { gx = FIELD.pin[0]; gy = FIELD.pin[1]; }
    else if (now - lastPointer > 2600) {
      const s = time / 1000;
      /* on a phone the copy owns the top of the screen, so the magnet drifts
         low; on desktop the copy is left, so it drifts right of centre */
      const cxb = ar < 1 ? 0.5 : 0.60, cyb = ar < 1 ? 0.30 : 0.52;
      gx = ar * (cxb + 0.24 * Math.sin(s * 0.19));
      gy = cyb + 0.17 * Math.sin(s * 0.27 + 1.1);
    }

    mx += (gx - mx) * 0.075;  my += (gy - my) * 0.075;     /* fast */
    lx += (gx - lx) * 0.021;  ly += (gy - ly) * 0.021;     /* slow — this is the lag */

    const want = (now - lastPointer < 1400 || FIELD.pin) ? 1 : 0;
    grip += (want - grip) * 0.05;
    dim  += (FIELD.dim - dim) * 0.1;

    gl.uniform2f(U.u_res, cv.width, cv.height);
    gl.uniform1f(U.u_time, (now - t0) / 1000);
    gl.uniform2f(U.u_mag, mx, my);
    gl.uniform2f(U.u_lag, lx, ly);
    gl.uniform1f(U.u_grip, grip);
    gl.uniform1f(U.u_dim, dim);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(draw);
  };

  if (REDUCED) {                          /* one still frame, no loop at all */
    gl.uniform2f(U.u_res, cv.width, cv.height);
    gl.uniform1f(U.u_time, 7.0);
    gl.uniform2f(U.u_mag, ar * 0.62, 0.54);
    gl.uniform2f(U.u_lag, ar * 0.62, 0.54);
    gl.uniform1f(U.u_grip, 0.4);
    gl.uniform1f(U.u_dim, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    addEventListener("resize", () => { size(); gl.uniform2f(U.u_res, cv.width, cv.height); gl.drawArrays(gl.TRIANGLES, 0, 3); });
    return;
  }

  raf = requestAnimationFrame(draw);
  /* nothing renders while the tab is not being looked at */
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else if (!raf) raf = requestAnimationFrame(draw);
  });
}

/* ── content ───────────────────────────────────────────────────────────── */
const ROUTES = [
  {
    kind: "LOCAL RAIL", name: "PayNow via DBS", bps: 34, unit: "bps", best: true,
    cost: 0.82, w: 0.154,
    meta: ["A$0.82 on A$240.00", "1.4 s to cleared funds", "98.1% authorisation"],
    sub: "Chosen for this payment. 9 ms to decide, A$4.52 cheaper than the card path.",
    legs: [
      ["01", "AUD debit leaves the customer's bank in Sydney"],
      ["02", "FX at interbank mid, plus 12 bps"],
      ["03", "PayNow credit lands in the SGD account at DBS"],
    ],
    rows: [["Rail fee", "18 bps"], ["FX spread", "12 bps"], ["Lodestone", "4 bps"], ["Total", "34 bps · A$0.82"]],
    why: "Picked for anything above A$60 where the customer's bank is PayNow-enabled and the payout does not have to be instant. In this corridor it is the cheapest path by a factor of six.",
    not: "Not used under A$60 — below that the support cost of a two-second clearing window outweighs what the fee saves.",
  },
  {
    kind: "CARD", name: "Local Singapore acquiring", bps: 128, unit: "bps", best: false,
    cost: 3.37, w: 0.631,
    meta: ["A$3.37 on A$240.00", "1.1 s to authorisation", "97.6% authorisation"],
    sub: "Second choice. Used when the customer's bank is not on PayNow.",
    legs: [
      ["01", "Card authorised through a Singapore-domiciled acquirer"],
      ["02", "Domestic interchange, no cross-border assessment"],
      ["03", "Settlement T+1 in SGD"],
    ],
    rows: [["Interchange", "76 bps"], ["Scheme fees", "31 bps"], ["Acquirer", "17 bps"], ["Fixed", "A$0.30"], ["Total", "128 bps · A$3.37"]],
    why: "The fallback whenever a local rail is unavailable but the card is issued in-region. It avoids the cross-border assessment entirely, which is 82 bps of the difference.",
    not: "Not used for cards issued outside Singapore — the local acquirer declines them at 11%, and a retry costs more than the saving.",
  },
  {
    kind: "CARD", name: "Visa cross-border, AU acquirer", bps: 210, unit: "bps", best: false,
    cost: 5.34, w: 1,
    meta: ["A$5.34 on A$240.00", "0.9 s to authorisation", "96.4% authorisation"],
    sub: "The default path if nothing is routing. This is the bill you are already paying.",
    legs: [
      ["01", "Card authorised through the Australian acquirer"],
      ["02", "Cross-border assessment and issuer FX applied"],
      ["03", "Settlement T+2 in AUD, converted on receipt"],
    ],
    rows: [["Interchange", "110 bps"], ["Cross-border", "52 bps"], ["Scheme fees", "31 bps"], ["Acquirer", "17 bps"], ["Fixed", "A$0.30"], ["Total", "210 bps · A$5.34"]],
    why: "Kept live as the failover. When an endpoint degrades, traffic lands here inside 400 ms rather than failing — an expensive payment beats a declined one.",
    not: "Never chosen on price. Across 214 merchants it carries 6% of routed volume and 31% of the fees they used to pay.",
  },
];

const NUMS = [
  ["18.7", "%", "lower blended cost, first 90 days"],
  ["9", "ms", "median routing decision"],
  ["42", "", "acquirers and local rails wired"],
  ["31", "", "countries covered today"],
];

const QA = [
  ["Do you ever touch the money?",
   "No. LODESTONE issues the routing decision and your existing acquirer or rail moves the funds under your own agreements. We are never in the flow of funds, hold no float and need no money-transmitter licence in your market."],
  ["What happens when a rail goes down?",
   "Every endpoint is health-checked every 5 seconds on real traffic, not a ping. A degraded endpoint drops out of scoring immediately and in-flight retries land on the next-best path in about 400 ms. Failover is to the most expensive path on purpose — a payment that costs 210 bps beats one that declines."],
  ["How is “cheapest” actually decided?",
   "Six inputs, not the headline rate: interchange, scheme fees, acquirer markup, FX spread, the endpoint's authorisation rate over the last hour, and the expected cost of a retry. A path 20 bps cheaper that declines 2% more often is not cheaper, and the scorer prices that in."],
  ["Can we pin some traffic where it is?",
   "Yes. Rules by BIN, issuing country, amount band, MCC or your own metadata. Pinned traffic bypasses scoring entirely and is reported on its own line, so you can see exactly what the pin costs you each month."],
];

const TICK = ["AUD→SGD local rail 34 bps", "card cross-border 210 bps", "9 ms decision",
  "reroute in 400 ms", "auth +2.4 pts", "31 countries", "42 endpoints", "A$4.1B routed FY25",
  "blended 187 → 152 bps", "0 funds held"];

/* ── the decision panel ────────────────────────────────────────────────── */
function panelHTML(r) {
  return (
    '<p class="m__k">' + r.kind + " · " + r.bps + " BPS</p>" +
    '<h3 class="m__h" id="mTitle">' + r.name + "</h3>" +
    '<p class="m__s">' + r.sub + "</p>" +
    '<ul class="m__leg">' + r.legs.map((l) => "<li><b>" + l[0] + "</b><span>" + l[1] + "</span></li>").join("") + "</ul>" +
    '<table class="m__t"><tbody>' +
    r.rows.map((x) => "<tr><td>" + x[0] + "</td><td>" + x[1] + "</td></tr>").join("") +
    "</tbody></table>" +
    '<p class="m__w">' + r.why + "</p>" +
    '<p class="m__n">' + r.not + "</p>"
  );
}

function decisionPanel() {
  const modal = $("#modal"), panel = $("#panel"), body = $("#mBody");
  let opener = null, openIdx = -1;

  const centred = () => {
    /* measure where a centred panel would land, with the panel still in flow */
    panel.style.position = ""; panel.style.left = panel.style.top = "";
    panel.style.width = panel.style.height = "";
    modal.classList.add("is-measuring");
    modal.hidden = false;
    const r = panel.getBoundingClientRect();
    modal.classList.remove("is-measuring");
    return r;
  };

  const stamp = (r) => {
    panel.style.position = "fixed";
    panel.style.left = r.left + "px";
    panel.style.top = r.top + "px";
    panel.style.width = r.width + "px";
    panel.style.height = r.height + "px";
  };

  const open = (i, card) => {
    opener = card; openIdx = i;
    body.innerHTML = panelHTML(ROUTES[i]);

    const to = centred();
    const from = card.getBoundingClientRect();

    if (REDUCED) { stamp(to); modal.classList.add("is-open"); }
    else {
      panel.style.transition = "none";
      stamp(from);
      panel.getBoundingClientRect();          /* force the browser to take that */
      panel.style.transition = "";
      requestAnimationFrame(() => { modal.classList.add("is-open"); stamp(to); });
    }

    document.body.style.overflow = "hidden";
    FIELD.dim = 1;                            /* the field pulls back behind it */
    $("#mClose").focus({ preventScroll: true });
  };

  const close = () => {
    if (modal.hidden) return;
    FIELD.dim = 0;
    document.body.style.overflow = "";
    modal.classList.remove("is-open");
    const back = opener ? opener.getBoundingClientRect() : null;

    const finish = () => {
      modal.hidden = true;
      panel.style.transition = "none";
      panel.style.position = ""; panel.style.left = panel.style.top = "";
      panel.style.width = panel.style.height = "";
      panel.getBoundingClientRect();
      panel.style.transition = "";
      if (opener) opener.focus({ preventScroll: true });
      opener = null; openIdx = -1;
    };

    if (REDUCED || !back) { finish(); return; }
    stamp(back);
    /* wait for the shrink to land before hiding, or it vanishes mid-flight */
    const done = (e) => {
      if (e.target !== panel || e.propertyName !== "height") return;
      panel.removeEventListener("transitionend", done);
      finish();
    };
    panel.addEventListener("transitionend", done);
    setTimeout(() => { if (!modal.hidden && !modal.classList.contains("is-open")) { panel.removeEventListener("transitionend", done); finish(); } }, 700);
  };

  $("#scrim").addEventListener("click", close);
  $("#mClose").addEventListener("click", close);
  addEventListener("keydown", (e) => {
    if (modal.hidden) return;
    if (e.key === "Escape") { close(); return; }
    if (e.key !== "Tab") return;
    const f = $$('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])', panel)
      .filter((el) => el.getBoundingClientRect().width > 0);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  addEventListener("resize", () => {
    if (modal.hidden || openIdx < 0) return;
    panel.style.transition = "none";
    panel.style.position = ""; panel.style.left = panel.style.top = "";
    panel.style.width = panel.style.height = "";
    const r = panel.getBoundingClientRect();
    stamp(r);
    panel.getBoundingClientRect();
    panel.style.transition = "";
  }, { passive: true });

  return open;
}

/* ── reveal once, on arrival ───────────────────────────────────────────── */
function reveals() {
  const els = $$(".rv");
  if (REDUCED || !("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    const sibs = [...e.target.parentElement.querySelectorAll(".rv")];
    e.target.style.transitionDelay = Math.min(sibs.indexOf(e.target), 5) * 60 + "ms";
    e.target.classList.add("in");
    io.unobserve(e.target);
  }), { threshold: .14, rootMargin: "0px 0px -7% 0px" });
  els.forEach((e) => io.observe(e));
  /* nothing may stay hidden because an observer never fired */
  setTimeout(() => els.forEach((e) => e.classList.add("in")), 4000);
}

function init() {
  /* ── the three routes ─────────────────────────────────────────────────── */
  $("#routes").innerHTML = ROUTES.map((r, i) =>
    '<button class="rt rv' + (r.best ? " is-best" : "") + '" data-i="' + i + '" type="button">' +
      (r.best ? '<span class="rt__flag">CHEAPEST</span>' : "") +
      '<span class="rt__k">' + r.kind + "</span>" +
      '<span class="rt__h">' + r.name + "</span>" +
      '<span class="rt__n">' + r.bps + "<em>" + r.unit + "</em></span>" +
      '<span class="rt__bar"><i style="--w:' + r.w + '"></i></span>' +
      '<span class="rt__m">' + r.meta.join("<br>") + "</span>" +
      '<span class="rt__go">Open decision <i>&rarr;</i></span>' +
    "</button>").join("");

  const open = decisionPanel();
  $$(".rt").forEach((c) => {
    c.addEventListener("click", () => open(+c.dataset.i, c));
    c.addEventListener("pointermove", (e) => {
      const r = c.getBoundingClientRect();
      c.style.setProperty("--mx", (e.clientX - r.left) + "px");
      c.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
    /* the field turns to whichever route you are reading */
    c.addEventListener("pointerenter", () => FIELD.set(c.getBoundingClientRect()));
    c.addEventListener("pointerleave", () => FIELD.set(null));
    c.addEventListener("focus", () => FIELD.set(c.getBoundingClientRect()));
    c.addEventListener("blur", () => FIELD.set(null));
  });

  /* ── numbers ──────────────────────────────────────────────────────────── */
  $("#nums").innerHTML = NUMS.map(([v, u, k]) =>
    '<div class="stat rv"><b data-to="' + v + '">0<small>' + u + "</small></b><span>" + k + "</span></div>").join("");

  /* ── questions ────────────────────────────────────────────────────────── */
  $("#qa").innerHTML = QA.map(([q, a], i) =>
    '<details class="rv"' + (i === 0 ? " open" : "") + ">" +
      "<summary><span>" + q + "</span></summary>" +
      '<div class="a"><div><p>' + a + "</p></div></div>" +
    "</details>").join("");

  const rows = $$("#qa details");
  rows.forEach((d) => { if (d.open) d.classList.add("is-open"); });
  const shut = (d) => {
    if (!d.open) return;
    d.classList.remove("is-open");
    if (REDUCED) { d.open = false; return; }
    const a = d.querySelector(".a");
    const done = (e) => {
      if (e.propertyName !== "grid-template-rows") return;
      a.removeEventListener("transitionend", done);
      if (!d.classList.contains("is-open")) d.open = false;     /* only after it has collapsed */
    };
    a.addEventListener("transitionend", done);
  };
  rows.forEach((d) => d.querySelector("summary").addEventListener("click", (e) => {
    e.preventDefault();
    if (d.open) { shut(d); return; }
    rows.forEach((o) => o !== d && shut(o));
    d.open = true;
    /* one frame at 0fr before flipping to 1fr, or both values land in the same
       style recalc and there is no transition at all */
    requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add("is-open")));
  }));

  /* ── the menu ─────────────────────────────────────────────────────────── */
  const mb = $("#menuBtn"), menu = $("#menu");
  const setMenu = (on) => { mb.setAttribute("aria-expanded", String(on)); menu.classList.toggle("is-open", on); };
  mb.addEventListener("click", () => setMenu(mb.getAttribute("aria-expanded") !== "true"));
  $$("#menu a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && mb.getAttribute("aria-expanded") === "true") { setMenu(false); mb.focus(); } });
  document.addEventListener("click", (e) => {
    if (mb.getAttribute("aria-expanded") !== "true") return;
    if (!menu.contains(e.target) && !mb.contains(e.target)) setMenu(false);
  });

  /* ── ticker: one strip, duplicated, translated by CSS ─────────────────── */
  const strip = TICK.map((t) => "<span>" + t + "</span>").join('<b>/</b>');
  $("#tick").innerHTML = strip + "<b>/</b>" + strip + "<b>/</b>";

  reveals();

  /* ── counters, once, on arrival ───────────────────────────────────────── */
  const settle = (b) => { b.innerHTML = b.dataset.to + b.querySelector("small").outerHTML; };
  if ("IntersectionObserver" in window && !REDUCED) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const b = e.target.querySelector("b"), to = parseFloat(b.dataset.to);
      const unit = b.querySelector("small").outerHTML;
      const dec = to % 1 !== 0, t0 = performance.now();
      const step = (t) => {
        const k = Math.min((t - t0) / 850, 1);
        const v = to * (1 - Math.pow(1 - k, 3));
        b.innerHTML = (dec ? v.toFixed(1) : Math.round(v)) + unit;
        if (k < 1) requestAnimationFrame(step);                 /* stops when it lands */
      };
      requestAnimationFrame(step);
    }), { threshold: .4 });
    $$(".stat").forEach((s) => io.observe(s));
    setTimeout(() => $$(".stat b").forEach((b) => { if (b.textContent.trim().startsWith("0") && b.dataset.to !== "0") settle(b); }), 5000);
  } else $$(".stat b").forEach(settle);

  /* ── buttons lean toward the cursor ───────────────────────────────────── */
  if (!REDUCED) $$(".mag").forEach((b) => {
    b.addEventListener("pointermove", (e) => {
      const r = b.getBoundingClientRect();
      b.style.transform = "translate(" + (e.clientX - r.left - r.width / 2) * .15 + "px," +
        (e.clientY - r.top - r.height / 2) * .2 + "px)";
    });
    b.addEventListener("pointerleave", () => (b.style.transform = ""));
  });

  try { field(); } catch (err) { console.error(err); }   /* the page must survive a dead GPU */
}

init();
