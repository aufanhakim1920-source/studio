const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const COARSE  = matchMedia("(hover: none), (pointer: coarse)").matches;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

document.documentElement.classList.add("motion");

/* ════════════════════════════════════════════════════════════════════════
   1 · THE EXPOSURE
   ════════════════════════════════════════════════════════════════════════ */

const VERT = "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }";

/* the accumulation pass — reads the previous frame, writes the next one.
   .r = a fast-decaying head (the bright point where the pointer is now)
   .g = a slow-decaying body (the exposure itself, several seconds long)   */
const FRAG_PAINT = `precision highp float;
uniform sampler2D u_prev;
uniform vec2  u_res;
uniform float u_stretch;      /* dt * 60 — makes the decay frame-rate independent */
uniform float u_slow;         /* slow-channel rate; raised when the buffer is 8-bit */
uniform vec2  u_a;            /* live pointer, previous smoothed position */
uniform vec2  u_b;            /* live pointer, current smoothed position  */
uniform float u_amp;
uniform vec2  u_ga;           /* replayed session, previous position */
uniform vec2  u_gb;           /* replayed session, current position  */
uniform float u_gamp;
uniform float u_time;
uniform vec4  u_flare[5];     /* xy = position, z = start time, w = strength */

const float FRESH   = 0.12;   /* §10.2 — 12% new     */
const float HISTORY = 0.88;   /* §10.2 — 88% history */
const float DRIFT   = 0.00042;/* the exposure creeps outward as it ages */
const float CAP_H   = 0.85;   /* the film saturates — see the residual below */
const float CAP_B   = 1.30;

/* distance to a segment: velocity paints a STROKE, not a dotted line of blobs */
float segd(vec2 p, vec2 a, vec2 b){
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}

void main(){
  vec2 uv  = gl_FragCoord.xy / u_res;
  float asp = u_res.x / u_res.y;
  vec2 p   = vec2(uv.x * asp, uv.y);
  vec2 c   = vec2(asp * 0.5, 0.46);

  /* warp(previous frame): a slow outward creep so old light blooms as it dies */
  vec2 off = vec2((p.x - c.x) / asp, p.y - c.y);
  vec2 hist = texture2D(u_prev, uv + off * DRIFT).rg;

  /* the residual — everything painting into the frame right now.
     A hard core with a wide soft halo around it: the core is the filament,
     the halo is the lens bloom that makes it sit in air rather than on glass. */
  float w = 0.021;
  float d  = segd(p, u_a, u_b);
  float s  = (exp(-(d * d) / (w * w)) + exp(-(d * d) / (w * w * 5.0)) * 0.22) * u_amp;

  float dg = segd(p, u_ga, u_gb);
  s += (exp(-(dg * dg) / (w * w * 0.7)) + exp(-(dg * dg) / (w * w * 4.5)) * 0.2) * u_gamp * 0.85;

  /* §10.8 — the CPU stores only WHEN each flare started; the whole expanding
     ring is a pure function of elapsed time, so nothing can drift out of sync */
  for (int i = 0; i < 5; i++){
    vec4 f  = u_flare[i];
    float t = u_time - f.z;
    float on = step(0.0, t) * step(t, 1.7) * step(0.001, f.w);
    float env = exp(-t * 3.2) * on;
    float rr  = t * 0.2;
    float dd  = abs(length(p - f.xy) - rr);
    s += f.w * env * (0.0032 / (dd + 0.0055));
  }

  /* HISTORY sets how long the shutter stays open — the 0.88 curve from §10.2,
     time-stretched so kFast is a 0.35s half-life and kSlow about 3.2s.
     ⚠️ The first version tied the DEPOSIT to (1-k) as well, which is what the
     unstretched 12/88 mix does. At a 3.2s half-life that is 0.4% of the fresh
     value per frame, so a moving pointer left nothing visible at all — the
     trail was a smudge. Exposure and decay have to be separate numbers.
     So the residual is FRESH-scaled and SELF-LIMITING (§10.2 point 2): each
     frame adds less as the emulsion fills, which is also how film behaves —
     sweep past and you get a stroke, park the cursor and it burns in. */
  float kFast = pow(HISTORY, u_stretch * 0.26);
  float kSlow = pow(HISTORY, u_stretch * u_slow);
  float expose = FRESH * u_stretch * s;
  float hot   = hist.r * kFast + expose * 2.2 * max(0.0, 1.0 - hist.r / CAP_H);
  float body  = hist.g * kSlow + expose * 3.6 * max(0.0, 1.0 - hist.g / CAP_B);

  /* clamped on BOTH sides. A feedback buffer never recovers from one bad
     texel, so nothing out of range is allowed in, in either direction. */
  gl_FragColor = vec4(clamp(hot, 0.0, CAP_H), clamp(body, 0.0, CAP_B), 0.0, 1.0);
}`;

/* the present pass — the accumulation, developed into an image */
const FRAG_PRESENT = `precision highp float;
uniform sampler2D u_tex;
uniform vec2  u_res;
uniform float u_dim;

void main(){
  vec2 uv  = gl_FragCoord.xy / u_res;
  float asp = u_res.x / u_res.y;
  vec2 p   = vec2(uv.x * asp, uv.y);
  vec2 c   = vec2(asp * 0.5, 0.46);

  vec2 a = max(texture2D(u_tex, uv).rg, vec2(0.0));   /* pow() of a negative is NaN */
  float hot = a.r, body = a.g;

  /* ⚠️ §7 of the pre-flight — VALUE contrast. An earlier mix let the head go
     near-white across the whole recent stroke, and pale body text sitting on it
     vanished. The exposure stays SATURATED (ember, mid-value) so #F2EDE7 always
     has somewhere to separate, and only the last few pixels of the head go pale. */
  vec3 col = vec3(0.0);
  col += vec3(1.00, 0.38, 0.10) * body * 1.00;            /* ember body   */
  col += vec3(1.00, 0.56, 0.20) * body * body * 0.34;     /* overlaps burn hotter */
  col += vec3(1.00, 0.79, 0.56) * pow(hot, 2.6) * 0.42;   /* only the head goes pale */
  col *= u_dim;

  /* the warm charcoal the exposure sits on */
  col += vec3(0.075, 0.048, 0.033) * (0.10 / (length(p - c) + 0.55));
  col += vec3(0.026, 0.021, 0.019);

  /* §8.3 — NEVER clamp here. clamp() clips added light to flat white, which is
     the blown-out look of a cheap glow. This curve keeps the hue on the way up. */
  col = vec3(1.0) - exp(-col * 1.25);

  float vig = 1.0 - 0.5 * length(p - vec2(asp * 0.5, 0.5));
  gl_FragColor = vec4(col * max(vig, 0.0), 1.0);
}`;

function makeExposure() {
  const cv = $("#gl");
  const gl = cv.getContext("webgl", {
    antialias: false, alpha: false, depth: false, stencil: false, powerPreference: "low-power",
  });
  if (!gl) {
    console.warn("AFTERIMAGE: no WebGL — the CSS gradient on #gl is the fallback image");
    return null;
  }

  /* ⚠️ §13.4 failure 1 — precision. An 8-bit history buffer loses more per
     round trip than a long exposure's decay step, and quietly collapses to
     black. Float first; half-float second; and if the machine has neither,
     shorten the exposure so its per-frame step clears 1/255. */
  const fl = gl.getExtension("OES_texture_float"), flL = gl.getExtension("OES_texture_float_linear");
  const hf = gl.getExtension("OES_texture_half_float"), hfL = gl.getExtension("OES_texture_half_float_linear");
  let TYPE = gl.UNSIGNED_BYTE, PRECISE = false;
  if (fl && flL) { TYPE = gl.FLOAT; PRECISE = true; }
  else if (hf && hfL) { TYPE = hf.HALF_FLOAT_OES; PRECISE = true; }
  let SLOW = PRECISE ? 0.028 : 0.115;   /* 3.2s exposure, or 0.8s on 8-bit */

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error("AFTERIMAGE shader:", gl.getShaderInfoLog(s)); return null;
    }
    return s;
  };
  const program = (fsrc) => {
    const pr = gl.createProgram(), vs = compile(gl.VERTEX_SHADER, VERT), fs = compile(gl.FRAGMENT_SHADER, fsrc);
    if (!vs || !fs) return null;
    gl.attachShader(pr, vs); gl.attachShader(pr, fs);
    gl.bindAttribLocation(pr, 0, "p");         /* same slot in both programs */
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { console.error("AFTERIMAGE link:", gl.getProgramInfoLog(pr)); return null; }
    return pr;
  };

  const pPaint = program(FRAG_PAINT), pShow = program(FRAG_PRESENT);
  if (!pPaint || !pShow) return null;

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const U = (pr, names) => Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(pr, n)]));
  const uP = U(pPaint, ["u_prev", "u_res", "u_stretch", "u_slow", "u_a", "u_b", "u_amp", "u_ga", "u_gb", "u_gamp", "u_time", "u_slow"]);
  uP.flare = gl.getUniformLocation(pPaint, "u_flare[0]") || gl.getUniformLocation(pPaint, "u_flare");
  const uS = U(pShow, ["u_tex", "u_res", "u_dim"]);

  /* ⚠️ §13.4 failure 3 — colour attachment ONLY. A depth attachment shared
     between the two targets makes the feedback never appear at all. */
  let A = null, B = null, W = 0, H = 0;
  const target = (w, h, type) => {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return ok ? { tex, fb } : null;
  };

  const size = () => {
    const d = Math.min(devicePixelRatio || 1, 1.5);
    /* ⚠️ §13.4 failure 2 — the buffers are sized from the canvas backing store
       and NOTHING else. A target sized from a different measurement resamples
       every frame and dissolves a still image with no input at all. */
    const w = Math.max(2, Math.round(innerWidth * d)), h = Math.max(2, Math.round(innerHeight * d));
    if (w === W && h === H) return true;
    W = w; H = h; cv.width = W; cv.height = H;
    A = target(W, H, TYPE); B = target(W, H, TYPE);
    if ((!A || !B) && TYPE !== gl.UNSIGNED_BYTE) {         /* float refused — drop back */
      TYPE = gl.UNSIGNED_BYTE; PRECISE = false; SLOW = 0.115;
      A = target(W, H, TYPE); B = target(W, H, TYPE);
    }
    if (!A || !B) { console.warn("AFTERIMAGE: no usable framebuffer"); return false; }
    for (const t of [A, B]) {                               /* start from black */
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb);
      gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return true;
  };
  if (!size()) return null;

  /* state the drivers write into */
  const st = {
    tx: 0.5, ty: 0.55, sx: 0.5, sy: 0.55, px: 0.5, py: 0.55,   /* raw / smoothed / previous */
    amp: 0, wantAmp: 0,
    gx: 0.5, gy: 0.5, gpx: 0.5, gpy: 0.5, gamp: 0, wantG: 1,
    dim: 1, wantDim: 1,
  };
  const flares = new Float32Array(20);
  let fi = 0, clock = 0;

  const asp = () => W / H;

  function step(dt) {
    clock += dt;
    const stretch = dt * 60;

    /* §8.1 — the light LAGS the cursor. Instant reads as a hover state;
       lagged reads as something with mass. */
    st.px = st.sx; st.py = st.sy;
    const k = 1 - Math.pow(0.001, dt);          /* frame-rate independent lerp */
    st.sx += (st.tx - st.sx) * k * 0.55;
    st.sy += (st.ty - st.sy) * k * 0.55;
    st.amp  += (st.wantAmp - st.amp) * k * 0.5;
    st.gamp += (st.wantG   - st.gamp) * k * 0.35;
    st.dim  += (st.wantDim - st.dim) * k * 0.6;

    /* ── pass 1: accumulate into the buffer that is NOT the history ── */
    const src = A, dst = B;
    gl.useProgram(pPaint);
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb);
    gl.viewport(0, 0, W, H);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src.tex);
    gl.uniform1i(uP.u_prev, 0);
    gl.uniform2f(uP.u_res, W, H);
    gl.uniform1f(uP.u_stretch, stretch);
    gl.uniform1f(uP.u_slow, SLOW);
    gl.uniform1f(uP.u_time, clock);
    gl.uniform2f(uP.u_a, st.px * asp(), 1 - st.py);
    gl.uniform2f(uP.u_b, st.sx * asp(), 1 - st.sy);
    gl.uniform1f(uP.u_amp, st.amp);
    gl.uniform2f(uP.u_ga, st.gpx * asp(), 1 - st.gpy);
    gl.uniform2f(uP.u_gb, st.gx * asp(), 1 - st.gy);
    gl.uniform1f(uP.u_gamp, st.gamp);
    if (uP.flare) gl.uniform4fv(uP.flare, flares);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    A = dst; B = src;                            /* ⭐ the swap — the whole trick */

    /* ── pass 2: develop it to the screen ── */
    gl.useProgram(pShow);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.bindTexture(gl.TEXTURE_2D, A.tex);
    gl.uniform1i(uS.u_tex, 0);
    gl.uniform2f(uS.u_res, W, H);
    gl.uniform1f(uS.u_dim, st.dim);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  return {
    st, step,
    get clock() { return clock; },
    precise: PRECISE,
    point(x, y) { st.tx = clamp(x / innerWidth, -0.2, 1.2); st.ty = clamp(y / innerHeight, -0.2, 1.2); },
    jump(x, y) { this.point(x, y); st.sx = st.tx; st.sy = st.ty; st.px = st.sx; st.py = st.sy; },
    live(on) { st.wantAmp = on ? 1 : 0; },
    ghost(x, y, amp) { st.gpx = st.gx; st.gpy = st.gy; st.gx = x; st.gy = y; if (amp !== undefined) st.wantG = amp; },
    ghostJump(x, y) { st.gx = st.gpx = x; st.gy = st.gpy = y; },
    flare(x, y, s) {
      const o = (fi % 5) * 4; fi++;
      flares[o] = x * asp(); flares[o + 1] = 1 - y; flares[o + 2] = clock; flares[o + 3] = s;
    },
    dim(v) { st.wantDim = v; },
    resize: size,
  };
}

/* ════════════════════════════════════════════════════════════════════════
   2 · THE SESSION THAT REPLAYS ITSELF
   A real path: someone reaches a payment form, hesitates for two seconds,
   clicks a button three times in 640ms, and leaves. It paints the exposure
   and it feeds the event rail, so the page is demonstrating the product
   before the visitor has touched anything.
   ════════════════════════════════════════════════════════════════════════ */

const GHOST = [
  { x: .05, y: .88, d: 0,    hold: 260,  ev: null },
  { x: .24, y: .74, d: 1500, hold: 260,  ev: ["pointermove", "142 pts"] },
  { x: .42, y: .63, d: 1000, hold: 300,  ev: ["focus", "#card-number"] },
  { x: .455, y: .61, d: 420, hold: 2000, ev: ["hesitate", "2.0s idle"] },
  { x: .58, y: .52, d: 900,  hold: 280,  ev: ["input", "#expiry"] },
  { x: .655, y: .44, d: 720, hold: 380,  ev: ["hover", "button.pay"] },
  { x: .66, y: .436, d: 130, hold: 250,  ev: ["click", "button.pay"], f: 1.0 },
  { x: .665, y: .441, d: 120, hold: 220, ev: ["click", "button.pay"], f: 1.15 },
  { x: .658, y: .434, d: 110, hold: 260, ev: ["rage-click", "x3 / 640ms"], f: 1.5, bad: 1 },
  { x: .70, y: .41, d: 520,  hold: 260,  ev: ["console", "POST /api/charge 500"], bad: 1 },
  { x: .90, y: .17, d: 950,  hold: 320,  ev: ["exit", "tab hidden"] },
  { x: .99, y: .05, d: 640,  hold: 1500, ev: ["session", "ended - 38 KB"] },
];

function makeGhost(exp, onEvent) {
  let i = 1, phase = "move", el = 0, penUp = 0;
  const ease = (k) => (k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

  return function tick(dt) {
    if (penUp > 0) { penUp -= dt; exp.ghostJump(GHOST[0].x, GHOST[0].y); return; }
    const a = GHOST[(i - 1 + GHOST.length) % GHOST.length], b = GHOST[i];
    el += dt * 1000;

    if (phase === "move") {
      const k = b.d <= 0 ? 1 : Math.min(el / b.d, 1);
      const e = ease(k);
      exp.ghost(a.x + (b.x - a.x) * e, a.y + (b.y - a.y) * e);
      if (k >= 1) {
        phase = "hold"; el = 0;
        if (b.ev) onEvent(b.ev[0], b.ev[1], b.bad ? "is-bad" : "");
        if (b.f) exp.flare(b.x, b.y, b.f);
      }
    } else {
      /* a real pointer never sits perfectly still while it waits */
      exp.ghost(b.x + Math.sin(el / 420) * .0022, b.y + Math.cos(el / 330) * .0018);
      if (el >= b.hold) {
        phase = "move"; el = 0; i++;
        if (i >= GHOST.length) { i = 1; penUp = .35; }    /* lift the pen to loop */
      }
    }
  };
}

/* ════════════════════════════════════════════════════════════════════════
   3 · CONTENT
   ════════════════════════════════════════════════════════════════════════ */

const CAPTURES = [
  {
    id: "SES-4182", tag: "Rage", dur: "11.2s",
    title: "Three clicks on a button that was already disabled",
    desc: "Checkout, Safari 17.4. No error was thrown in the browser. The pay button had been disabled by a stale form-validity check.",
    meta: [["Duration", "11.2s"], ["Client", "Safari 17.4"], ["Region", "Sydney"], ["Build", "2f9a1c"]],
    log: [
      ["00:03.1", "pointermove — 142 points", ""],
      ["00:05.4", "focus #card-number", "hot"],
      ["00:05.4", "idle 2.0s — no keystrokes", "hot"],
      ["00:08.9", "click button.pay — no handler fired", ""],
      ["00:09.2", "click button.pay", ""],
      ["00:09.7", "rage-click ×3 in 640ms", "bad"],
      ["00:10.4", "POST /api/charge → 500", "bad"],
      ["00:11.2", "visibilitychange — tab hidden", ""],
    ],
    out: "The replay showed the disabled state 3.5 seconds before the 500. Fixed in one commit: the validity check was reading the pre-hydration form. 41 sessions had hit it that week.",
  },
  {
    id: "SES-3907", tag: "Hesitation", dur: "26.8s",
    title: "Twenty-six seconds on a two-field signup form",
    desc: "Chrome 126 on Android. Nothing broke. The user typed a work email, deleted it, typed it again, and left — the field's error copy only appeared after blur.",
    meta: [["Duration", "26.8s"], ["Client", "Chrome 126"], ["Region", "Frankfurt"], ["Build", "8c0417"]],
    log: [
      ["00:01.8", "input #email — 24 chars", ""],
      ["00:07.2", "input #email — cleared", "hot"],
      ["00:09.6", "input #email — 24 chars", ""],
      ["00:14.0", "blur #email → error shown", "hot"],
      ["00:15.1", "scroll ×6 — looking for help", ""],
      ["00:26.8", "unload — no submit", "bad"],
    ],
    out: "No console error, no failed request, nothing in the funnel report except a drop. The replay is the only place this was visible. Validation moved to input; completion on that step went 61% → 84%.",
  },
  {
    id: "SES-4460", tag: "Silent", dur: "31.4s",
    title: "A 500 that nobody ever reported",
    desc: "Firefox 127, file upload. The request failed, the spinner kept spinning, and the user waited 18 seconds before closing the tab. No support ticket was ever filed.",
    meta: [["Duration", "31.4s"], ["Client", "Firefox 127"], ["Region", "Sydney"], ["Build", "2f9a1c"]],
    log: [
      ["00:04.5", "change #file — 4.2 MB", ""],
      ["00:04.6", "POST /api/upload", ""],
      ["00:12.9", "POST /api/upload → 500", "bad"],
      ["00:12.9", "spinner still mounted", "hot"],
      ["00:13.0", "idle 18.4s", "hot"],
      ["00:31.4", "unload", "bad"],
    ],
    out: "The upload route timed out on files over 4 MB and the client never handled the rejection. Found by filtering for sessions ending in an idle period over 10 seconds — 212 of them that month.",
  },
];

const NUMS = [
  ["", 90, " days", "replay retention on Pro. 30 on Starter."],
  ["", 240, "/sec", "events captured per tab, then throttled."],
  ["", 38, " KB", "median session on the wire, gzipped."],
  ["$", 9, "/1k", "sessions after the first 1,000 each month."],
];

const QA = [
  ["Will it slow the app down?",
   "The recorder is 14 KB gzipped and writes to a worker. It samples at up to 240 events per second per tab and throttles above that, so a busy canvas cannot flood it. Measured cost on the main thread is under 0.4 ms per second of session."],
  ["What does it capture, exactly?",
   "Pointer position, scroll, focus, input events, navigation, network status codes and console output. Keystroke VALUES are masked at the source — the recorder never sees them — and every input, password field and element marked data-afterimage=\"mask\" is redacted before anything leaves the browser."],
  ["How much does a session actually cost?",
   "The first 1,000 sessions each month are free. After that it is $9 per 1,000, billed on what you keep — a session you delete inside the retention window is not charged. A team recording 25,000 sessions a month pays $216."],
  ["Where is the data stored?",
   "In the region you pick at install: Sydney or Frankfurt. Sessions never leave it, not for processing and not for backup. Retention is 30 days on Starter and 90 on Pro; after that they are deleted, not archived."],
  ["We already have error tracking. Why this?",
   "Error tracking tells you a stack trace happened. It cannot tell you the user had already clicked the button twice, or that the spinner was still spinning eighteen seconds later. AFTERIMAGE lines the replay up against the same console, so the thirty seconds before the exception are visible."],
];

/* ════════════════════════════════════════════════════════════════════════
   4 · PAGE
   ════════════════════════════════════════════════════════════════════════ */

const EXP = makeExposure();
const NOOP = { point() {}, jump() {}, live() {}, ghost() {}, ghostJump() {}, flare() {}, dim() {}, step() {}, resize() {}, st: {} };
const X = EXP || NOOP;

/* ── the live event rail ─────────────────────────────────────────────── */
const rail = $("#rail");
let evN = 0;
function pushEvent(kind, detail, cls) {
  const el = document.createElement("span");
  el.className = "ev " + (cls || "");
  el.innerHTML = "<b>" + kind + "</b> " + (detail || "");
  rail.appendChild(el);
  if (REDUCED) el.classList.add("in");
  else requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("in")));
  while (rail.children.length > 22) rail.removeChild(rail.firstChild);
  evN++;
}

/* ── who is driving the exposure ─────────────────────────────────────── */
let lastMove = -9999, userOn = false, youThrottle = 0;
function markUser(t) {
  lastMove = t;
  if (!userOn) { userOn = true; X.dim(1); }
  X.live(true);
  X.st.wantG = 0;                       /* the replay steps back — lerped, not cut */
}

/* ════════════════════════════════════════════════════════════════════════
   5 · THE CAPTURE PANEL — grows out of the card that opened it
   ════════════════════════════════════════════════════════════════════════ */
const ov = $("#ov"), sheet = $("#sheet"), sheetIn = $("#sheetIn"), sheetC = $("#sheetC"), sheetX = $("#sheetX");
let openCard = null, lastFocus = null, closing = false;

const renderCapture = (c) => [
  '<p class="sh__id">', c.id, " &middot; ", c.tag, " &middot; ", c.dur, "</p>",
  '<h3 class="sh__t" id="sheetTitle">', c.title, "</h3>",
  '<p class="sh__s">', c.desc, "</p>",
  '<dl class="sh__meta">', c.meta.map(([k, v]) => "<div><dt>" + k + "</dt><dd>" + v + "</dd></div>").join(""), "</dl>",
  '<p class="sh__h">Event log</p>',
  '<div class="log">', c.log.map(([t, s, k]) => '<div class="log__r ' + k + '"><i>' + t + "</i><span>" + s + "</span></div>").join(""), "</div>",
  '<p class="sh__h">What it changed</p>',
  '<p class="sh__out">', c.out, "</p>",
].join("");

function trap(e) {
  if (e.key === "Escape") { e.preventDefault(); closeCapture(); return; }
  if (e.key !== "Tab") return;
  const f = $$('button, a[href], [tabindex]:not([tabindex="-1"])', sheet).filter((x) => x.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

function openCapture(i, card) {
  if (openCard) return;
  openCard = card; lastFocus = card;   /* the card, not activeElement: a mouse click on a button does not always focus it */
  sheetC.innerHTML = renderCapture(CAPTURES[i]);
  ov.hidden = false;

  /* FLIP — measure where the panel WILL be, invert it onto the card, release */
  sheet.style.transition = "none"; sheetIn.style.transition = "none";
  sheet.style.transform = "none"; sheetIn.style.transform = "none";
  const f = sheet.getBoundingClientRect(), s = card.getBoundingClientRect();
  const sx = Math.max(s.width / f.width, .05), sy = Math.max(s.height / f.height, .05);
  card.classList.add("is-open");

  if (!REDUCED) {
    sheet.style.transform = "translate(" + (s.left - f.left) + "px," + (s.top - f.top) + "px) scale(" + sx + "," + sy + ")";
    /* the inner counter-scales, so the text is never squashed on the way out */
    sheetIn.style.transform = "scale(" + (1 / sx) + "," + (1 / sy) + ")";
    void sheet.offsetWidth;
    sheet.style.transition = "transform .46s var(--spring)";
    sheetIn.style.transition = "transform .46s var(--spring)";
    sheet.style.transform = "none"; sheetIn.style.transform = "none";
  }
  requestAnimationFrame(() => ov.classList.add("is-in"));

  /* the exposure reacts: a flash where the card was, and the trail steps down
     so the panel is the brightest thing on screen */
  X.flare((s.left + s.width / 2) / innerWidth, (s.top + s.height / 2) / innerHeight, 1.7);
  X.dim(.4);

  document.body.style.overflow = "hidden";
  addEventListener("keydown", trap);
  sheetX.focus({ preventScroll: true });
  pushEvent("open", CAPTURES[i].id, "is-you");
}

function closeCapture() {
  if (!openCard || closing) return;
  closing = true;
  const card = openCard;
  ov.classList.remove("is-in");
  X.dim(1);
  removeEventListener("keydown", trap);
  document.body.style.overflow = "";

  const finish = () => {
    ov.hidden = true; card.classList.remove("is-open");
    sheet.style.transition = "none"; sheetIn.style.transition = "none";
    sheet.style.transform = "none"; sheetIn.style.transform = "none";
    openCard = null; closing = false;
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  };

  if (REDUCED) { finish(); return; }
  const f = sheet.getBoundingClientRect(), s = card.getBoundingClientRect();
  const sx = Math.max(s.width / f.width, .05), sy = Math.max(s.height / f.height, .05);
  sheet.style.transition = "transform .34s var(--ease)";
  sheetIn.style.transition = "transform .34s var(--ease)";
  sheet.style.transform = "translate(" + (s.left - f.left) + "px," + (s.top - f.top) + "px) scale(" + sx + "," + sy + ")";
  sheetIn.style.transform = "scale(" + (1 / sx) + "," + (1 / sy) + ")";
  const done = (e) => {
    if (e.target !== sheet || e.propertyName !== "transform") return;
    sheet.removeEventListener("transitionend", done); finish();
  };
  sheet.addEventListener("transitionend", done);
  setTimeout(() => { if (closing) { sheet.removeEventListener("transitionend", done); finish(); } }, 600);
}

/* ════════════════════════════════════════════════════════════════════════
   6 · BUILD THE PAGE
   ════════════════════════════════════════════════════════════════════════ */
function init() {

  /* — captures — */
  $("#cards").innerHTML = CAPTURES.map((c, i) =>
    '<button class="card rv" type="button" data-i="' + i + '" aria-haspopup="dialog">' +
      '<span class="card__id">' + c.id + " &middot; " + c.tag + "</span>" +
      '<span class="card__t">' + c.title + "</span>" +
      '<span class="card__d">' + c.desc.split(". ")[0] + ".</span>" +
      '<span class="card__m"><span><em>' + c.dur + "</em> recorded</span>" +
      '<span class="card__go">Open<i></i></span></span>' +
    "</button>").join("");

  $$(".card").forEach((c) => {
    c.addEventListener("click", () => openCapture(+c.dataset.i, c));
    c.addEventListener("pointermove", (e) => {
      const r = c.getBoundingClientRect();
      c.style.setProperty("--mx", (e.clientX - r.left) + "px");
      c.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
  });
  sheetX.addEventListener("click", closeCapture);
  $("#ovBg").addEventListener("click", closeCapture);

  /* — signals — */
  $("#nums").innerHTML = NUMS.map(([pre, v, suf, k]) =>
    '<div class="stat rv"><b data-to="' + v + '" data-pre="' + pre + '">' + pre + '0<small>' + suf + "</small></b>" +
    "<span>" + k + "</span></div>").join("");

  /* — questions — */
  $("#qa").innerHTML = QA.map(([q, a], i) =>
    "<details" + (i === 0 ? " open" : "") + '><summary><span class="n mono">' +
    String(i + 1).padStart(2, "0") + '</span><span class="q">' + q + "</span></summary>" +
    '<div class="a"><div><p>' + a + "</p></div></div></details>").join("");

  const rows = $$("#qa details");
  rows.forEach((d) => { if (d.open) d.classList.add("is-open"); });
  const shut = (d) => {
    if (!d.open) return;
    d.classList.remove("is-open");
    if (REDUCED) { d.open = false; return; }
    const panel = $(".a", d);
    /* wait for the collapse to FINISH — removing [open] early plays the
       animation against nothing and the text just disappears */
    const done = (e) => {
      if (e.propertyName !== "grid-template-rows") return;
      panel.removeEventListener("transitionend", done);
      if (!d.classList.contains("is-open")) d.open = false;
    };
    panel.addEventListener("transitionend", done);
  };
  rows.forEach((d) => $("summary", d).addEventListener("click", (e) => {
    e.preventDefault();
    if (d.open) { shut(d); return; }
    rows.forEach((o) => o !== d && shut(o));
    d.open = true;
    /* one frame at 0fr before flipping to 1fr, or both values land in the same
       style recalc and there is no transition at all */
    requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add("is-open")));
  }));

  /* — mobile navigation, animated both ways — */
  const tog = $("#navToggle"), nsheet = $("#navsheet");
  const setNav = (open) => {
    tog.setAttribute("aria-expanded", String(open));
    tog.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    if (open) {
      nsheet.hidden = false;
      if (REDUCED) return;
      nsheet.classList.add("is-shut"); void nsheet.offsetWidth; nsheet.classList.remove("is-shut");
    } else if (REDUCED) { nsheet.hidden = true; }
    else {
      nsheet.classList.add("is-shut");
      const done = (e) => {
        if (e.propertyName !== "opacity") return;
        nsheet.removeEventListener("transitionend", done);
        if (nsheet.classList.contains("is-shut")) nsheet.hidden = true;
      };
      nsheet.addEventListener("transitionend", done);
    }
  };
  tog.addEventListener("click", () => setNav(tog.getAttribute("aria-expanded") !== "true"));
  $$("#navsheet a").forEach((a) => a.addEventListener("click", () => setNav(false)));

  /* — the hint changes on a touch device, where there is no hover — */
  /* a 780px screen is a phone whether or not the UA admits to being touch —
     headless Chrome reports hover:hover even in mobile emulation */
  if (COARSE || innerWidth < 780) {
    $("#hint").innerHTML = '<span class="hint__k">&#9679;</span> This page is recording you. ' +
      "Drag sideways to paint your own trail, tap anywhere to flash. Up and down still scrolls.";
  }

  /* — magnetic buttons — */
  if (!REDUCED) $$(".mag").forEach((b) => {
    b.addEventListener("pointermove", (e) => {
      const r = b.getBoundingClientRect();
      b.style.transform = "translate(" + (e.clientX - r.left - r.width / 2) * .16 + "px," +
        (e.clientY - r.top - r.height / 2) * .22 + "px)";
    });
    b.addEventListener("pointerleave", () => (b.style.transform = ""));
  });

  /* — reveal on arrival. A rAF sweep, not IntersectionObserver: a fast scroll
       or an anchor jump outruns the observer and leaves rows at opacity 0. — */
  const rv = $$(".rv");
  if (REDUCED) rv.forEach((e) => e.classList.add("in"));
  else {
    let pend = rv.slice();
    const sweep = () => {
      let n = 0;
      pend = pend.filter((e) => {
        const r = e.getBoundingClientRect();
        if (r.top < innerHeight * .94 && r.bottom > -40) {
          e.style.transitionDelay = Math.min(n++, 5) * 60 + "ms";
          e.classList.add("in"); return false;
        }
        return true;
      });
      if (pend.length) requestAnimationFrame(sweep);
    };
    requestAnimationFrame(sweep);
  }

  /* — counters, once, when they arrive — */
  let stats = $$(".stat");
  if (REDUCED) stats = stats.filter((s) => {          /* no counting up — just the number */
    const b = $("b", s);
    b.innerHTML = (b.dataset.pre || "") + b.dataset.to + $("small", b).outerHTML;
    return false;
  });
  const countSweep = () => {
    stats = stats.filter((s) => {
      const r = s.getBoundingClientRect();
      if (r.top > innerHeight * .9 || r.bottom < 0) return true;
      const b = $("b", s), to = +b.dataset.to, pre = b.dataset.pre || "";
      const unit = $("small", b).outerHTML;
      if (REDUCED) { b.innerHTML = pre + to + unit; return false; }
      const t0 = performance.now();
      const run = (t) => {
        const k = Math.min((t - t0) / 850, 1);
        b.innerHTML = pre + Math.round(to * (1 - Math.pow(1 - k, 3))) + unit;
        if (k < 1) requestAnimationFrame(run);
      };
      requestAnimationFrame(run);
      return false;
    });
    if (stats.length) requestAnimationFrame(countSweep);
  };
  requestAnimationFrame(countSweep);

  /* — clock — */
  const clk = () => ($("#clock").textContent = new Date().toLocaleTimeString("en-AU",
    { timeZone: "Australia/Sydney", hour: "2-digit", minute: "2-digit" }) + " AEST");
  clk(); setInterval(clk, 30000);

  /* — pointer into the exposure — */
  addEventListener("pointermove", (e) => {
    X.point(e.clientX, e.clientY);
    markUser(performance.now());
    if (performance.now() - youThrottle > 1400) {
      youThrottle = performance.now();
      pushEvent("pointermove", "you", "is-you");
    }
  }, { passive: true });

  addEventListener("pointerdown", (e) => {
    X.jump(e.clientX, e.clientY);
    X.flare(e.clientX / innerWidth, e.clientY / innerHeight, 1.3);
    markUser(performance.now());
    pushEvent("click", (e.target.closest("a,button") ? "target hit" : "no target"), "is-you");
  }, { passive: true });

  addEventListener("resize", () => X.resize(), { passive: true });

  /* — the loop — */
  /* the replay keeps running while you are driving — it just stops painting.
     ⚠️ Freezing it instead burned a hard blob into the exposure wherever it
     happened to stop, which looks like a rendering fault rather than a trail. */
  const ghost = EXP ? makeGhost(EXP, (k, d, c) => { if (!userOn) pushEvent(k, d, c); }) : null;
  const label = $("#replayLabel");
  let lastLabel = "";

  if (EXP && REDUCED) {
    /* still state: run the replayed session through the buffer in one burst so
       the visitor gets the FINISHED photograph, then stop. The exposure is the
       page, so switching it off entirely would leave nothing. */
    EXP.st.wantG = 1; EXP.st.gamp = 1;
    for (let i = 0; i < 300; i++) { ghost(1 / 24); EXP.step(1 / 24); }
    label.textContent = "Session 4182 — still frame";
  } else if (EXP) {
    let prev = performance.now();
    const loop = (now) => {
      /* ⚠️ Math.max(0, ...) is load-bearing. A rAF timestamp can be EARLIER than
         the performance.now() captured just before the loop started, so frame 1
         could see a negative dt. That flips the decay exponent, writes a negative
         value into the feedback buffer, and pow() of a negative is NaN — which
         then spreads through the linear resample every frame and never clears.
         It showed up as a grey blob at the replay's start point that grew. */
      const dt = Math.max(0, Math.min((now - prev) / 1000, 1 / 20)); prev = now;
      const idle = now - lastMove > 2600;
      if (idle && userOn) { userOn = false; EXP.live(false); }
      EXP.st.wantG = idle ? 1 : 0;
      ghost(dt);
      EXP.step(dt);

      const want = userOn ? "Recording you · " + evN + " events"
                          : "Replaying session 4182 · " + CAPTURES[0].dur;
      if (want !== lastLabel) { label.textContent = want; lastLabel = want; }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    console.log("AFTERIMAGE exposure: " + (EXP.precise ? "float buffer, 3.2s exposure" : "8-bit buffer, 0.8s exposure"));
  }

  /* seed the rail so it is never empty on arrival */
  pushEvent("session", "4182 loaded", "");
}

init();
