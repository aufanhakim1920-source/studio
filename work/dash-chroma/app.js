/* Retail Ledger — dashboard 1 of 3, the CHROMA route
 * ---------------------------------------------------------------------------
 * Real data: 541,909 raw transaction rows from a UK gift wholesaler, cleaned to
 * 524,878. Nothing here is invented; every figure is read from data.json.
 *
 * The grain canvas is drawn ONCE. Ref 31 does not animate it, and a distiller
 * pass confirmed that is deliberate rather than an oversight — a single static
 * GPU noise texture under mix-blend-mode is the entire effect. Animating it
 * would cost a frame budget and look worse.
 */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

const nf = new Intl.NumberFormat("en-GB");
const short = (n) =>
  n >= 1e6 ? "£" + (n / 1e6).toFixed(1) + "M"
: n >= 1e3 ? "£" + Math.round(n / 1e3) + "k"
           : "£" + Math.round(n);
const MONTH = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const mlabel = (ym) => { const [y, m] = ym.split("-"); return MONTH[+m - 1] + " " + y.slice(2); };

const HUES = ["#1e5fce", "#235c34", "#ed5a14", "#d99d21", "#f29fc8", "#7a42b8", "#5692f0", "#111111"];

let D = null, series = "rev";

/* ── grain, once ──────────────────────────────────────────────────────────
   A WebGL hash on gl_FragCoord. If the context is unavailable the canvas
   simply stays empty, which is a silent and acceptable degradation for a
   texture — unlike ref 30, which needs its GL and does not check. */
function grain() {
  const c = $("#grain");
  const gl = c.getContext("webgl", { alpha: true, depth: false, antialias: false });
  if (!gl) return;

  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, `
    attribute vec2 position;
    void main() { gl_Position = vec4(position, 0.0, 1.0); }`));
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, `
    precision highp float;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){ float n = hash(gl_FragCoord.xy); gl_FragColor = vec4(vec3(n), 1.0); }`));
  gl.linkProgram(p); gl.useProgram(p);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(p, "position");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const draw = () => {
    const w = innerWidth, h = innerHeight;
    if (c.width !== w || c.height !== h) {
      c.width = w; c.height = h;
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  addEventListener("resize", draw, { passive: true });
  draw();                                   /* once — no rAF loop */
}

/* ── the graph ────────────────────────────────────────────────────────────
   An inline SVG path with a gradient stroke, plotted circles, and a filled
   area beneath. The line draws itself in with stroke-dasharray, once. */
function drawGraph() {
  const ms = D.months;
  const key = series === "rev" ? "rev" : "orders";
  const max = Math.max(...ms.map((m) => m[key]));
  const W = 1000, H = 220, PAD = 18;

  const pt = (m, i) => [
    PAD + (i / (ms.length - 1)) * (W - PAD * 2),
    H - PAD - (m[key] / max) * (H - PAD * 2.4),
  ];
  const pts = ms.map(pt);

  const line = $("#line"), area = $("#area");
  const d = pts.map(([x, y], i) => (i ? "L" : "M") + x.toFixed(1) + "," + y.toFixed(1)).join(" ");
  line.setAttribute("d", d);
  area.setAttribute("d", `${d} L ${pts.at(-1)[0].toFixed(1)},${H} L ${pts[0][0].toFixed(1)},${H} Z`);

  const len = line.getTotalLength();
  line.style.setProperty("--len", len);

  $("#pts").innerHTML = pts.map(([x, y], i) => {
    const m = ms[i];
    const v = series === "rev" ? short(m.rev) : nf.format(m.orders) + " orders";
    return `<circle class="pt" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" data-i="${i}">
      <title>${mlabel(m.m)}: ${v}</title></circle>`;
  }).join("");

  $("#axis").innerHTML = [ms[0], ms[Math.floor(ms.length / 2)], ms.at(-1)]
    .map((m) => `<span>${mlabel(m.m).toUpperCase()}</span>`).join("");

  /* hovering a point drives the readout — the graph is the control */
  $$(".pt").forEach((c) =>
    c.addEventListener("pointerenter", () => {
      const m = ms[+c.dataset.i];
      $$(".pt").forEach((o) => o.classList.remove("is-live"));
      c.classList.add("is-live");
      $("#roLeft").textContent = mlabel(m.m).toUpperCase();
      $("#roRight").textContent =
        `${short(m.rev)} · ${nf.format(m.orders)} ORDERS`;
    })
  );
}

function revealGraph() {
  $("#line").classList.add("in");
  $("#area").classList.add("in");
  $$(".pt").forEach((c) => c.classList.add("in"));
}

/* ── boot ─────────────────────────────────────────────────────────────────── */
async function init() {
  try {
    const r = await fetch("data.json");
    if (!r.ok) throw new Error("HTTP " + r.status);
    D = await r.json();
  } catch (e) {
    document.querySelector("h1").textContent = "The dataset did not load.";
    $("#src").textContent = e.message.toUpperCase();
    return;
  }

  const k = D.kpi;
  $("#src").textContent = `${nf.format(D.keptRows)} ROWS · ${k.countries} MARKETS`;
  $("#footSrc").textContent = D.source.toUpperCase();
  $("#homeShare").textContent = D.homeShare + "%";

  /* the strip */
  $("#strip").innerHTML = [
    ["Revenue", short(k.revenue), "gross"],
    ["Orders", nf.format(k.orders), ""],
    ["Avg order", "£" + k.aov.toFixed(2), ""],
    ["Markets", String(k.countries), ""],
    ["Rows used", nf.format(D.keptRows), `of ${nf.format(D.rawRows)}`],
  ].map(([kk, v, s]) => `
    <div class="dp">
      <span class="mono dp__k">${kk}</span>
      <span class="dp__v">${v}${s ? `<small> ${s}</small>` : ""}</span>
    </div>`).join("");

  /* markets */
  $("#ctyCount").textContent = `${D.countries.length} OF ${k.countries}`;
  $("#ctys").innerHTML = D.countries.map((c, i) => `
    <li>
      <span class="nm"><span class="dot" style="background:${HUES[i % HUES.length]}"></span>${c.name}</span>
      <span class="v">${short(c.rev)} · ${c.share}%</span>
    </li>`).join("");

  /* products */
  const pmax = Math.max(...D.products.map((p) => p.rev));
  $("#bars").innerHTML = D.products.map((p, i) => `
    <div class="bar">
      <span class="bar__n" title="${p.name}">${p.name}</span>
      <span class="bar__t"><span class="bar__f" data-w="${(p.rev / pmax) * 100}"
        style="background:${HUES[i % HUES.length]}"></span></span>
      <span class="bar__v">${short(p.rev)} · ${p.share}%</span>
    </div>`).join("");

  $("#goodsNote").textContent = D.nonGoodsShare
    ? `Postage, bank fees and manual adjustments are booked as line items and account for ` +
      `${short(D.nonGoodsRev)} — ${D.nonGoodsShare}% of revenue. The top entry is a delivery charge, not a product.`
    : "";

  /* exclusions */
  $("#excl").innerHTML = D.excluded.map((e) => `
    <div class="ex">
      <span class="ex__l">${e.label}</span>
      <span class="ex__n">${nf.format(e.rows)}</span>
      <span class="ex__w">${e.why} <em>${e.impact}</em></span>
    </div>`).join("") + `
    <div class="ex ex--total">
      <span class="ex__l">Total excluded</span>
      <span class="ex__n">${nf.format(D.excludedTotal)}</span>
      <span class="ex__w">${((D.excludedTotal / D.rawRows) * 100).toFixed(1)}% of ${nf.format(D.rawRows)} source rows.</span>
    </div>`;
  $("#limits").innerHTML = D.limits.map((l) => `<li>${l}</li>`).join("");

  /* graph */
  const peak = D.months.reduce((a, b) => (b.rev > a.rev ? b : a));
  $("#badgePeak").textContent = `PEAK ${mlabel(peak.m).toUpperCase()}`;
  $("#roLeft").textContent = "HOVER A POINT";
  $("#roRight").textContent = `${D.months.length} MONTHS · TO ${D.lastDate}`;
  drawGraph();

  $$(".badge--btn").forEach((b) =>
    b.addEventListener("click", () => {
      series = b.dataset.series;
      $$(".badge--btn").forEach((o) => o.classList.toggle("is-on", o === b));
      drawGraph();
      revealGraph();
    })
  );

  grain();

  /* reveal once, on reach */
  const fill = () => {
    $("#loadFill").style.width = D.homeShare + "%";
    $$(".bar__f").forEach((f) => (f.style.width = f.dataset.w + "%"));
  };
  if (REDUCED || !("IntersectionObserver" in window)) { revealGraph(); fill(); }
  else {
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        if (e.target.id === "viz") revealGraph(); else fill();
        io.unobserve(e.target);
      });
    }, { threshold: .2 });
    [$("#viz"), $("#bars"), $(".load")].filter(Boolean).forEach((el) => io.observe(el));
  }
}

init();
