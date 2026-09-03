/* HALIDE — a type foundry
 * ---------------------------------------------------------------------------
 * ⭐ THE OBJECT: a loupe you drag across the specimen.
 *
 * The mechanism is the CC-lens distortion from Codrops (Generative Canvas Studio
 * §10.1), rebuilt in 2D canvas rather than GLSL because the thing being
 * magnified is TEXT — and text rendered by the browser is sharper at any zoom
 * than text sampled from a texture. A GPU lens would have given me a blurry
 * magnifier, which on a type foundry's site is the one unforgivable result.
 *
 * What carries over from §10.1, unchanged:
 *   · the barrel is a radial scale that grows with the SQUARE of the radius —
 *     `scale = 1 + strength * r²` — so the centre is calm and the rim bends
 *   · `dot(c, c)` rather than `length(c)`: the squared radius is what you want
 *     and it skips a square root
 *   · chromatic fringing along the same radial vector, maximum at the rim and
 *     zero at the centre, which is how a real lens behaves
 *   · the lens centre is LERPED toward the pointer, never snapped
 *
 * Why a foundry: a magnifier is not a metaphor here. Examining the joints of a
 * letterform at size IS the purchase decision, so the object is the sales pitch.
 * [[Object Must Be In Theme]].
 */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

const SPECIMEN = "Handgloves";
const HOT = "#FF4400", PAPER = "#F4F4F2";

/* ── the loupe ────────────────────────────────────────────────────────────── */
function loupe() {
  const cv = $("#cv"), ctx = cv.getContext("2d");
  /* the specimen is rendered ONCE to an offscreen canvas and the lens samples
     it per pixel. Redrawing the text per ring (the first attempt) produced nine
     overlapping copies at nine scales — a smear, not a magnifier. */
  const off = document.createElement("canvas");
  const octx = off.getContext("2d", { willReadFrequently: true });

  let W = 0, H = 0, DPR = 1, src = null;
  let mx = 0.62, my = 0.5, tx = 0.62, ty = 0.5;
  const RAD = 0.20;        /* lens radius, fraction of stage width */
  const MAG = 3.2;
  const K = 0.62;          /* barrel: how fast magnification falls to the rim */

  function paintSpecimen(c, w, h) {
    c.clearRect(0, 0, w, h);
    c.fillStyle = "#0B0B0B"; c.fillRect(0, 0, w, h);
    c.textAlign = "center"; c.textBaseline = "alphabetic";
    c.fillStyle = PAPER;
    c.font = `900 ${h * 0.40}px Archivo, sans-serif`;
    c.fillText(SPECIMEN, w / 2, h * 0.56);
    c.fillStyle = "rgba(244,244,242,.52)";
    c.font = `300 ${h * 0.075}px Archivo, sans-serif`;
    c.fillText("abcdefghijklmnopqrstuvwxyz", w / 2, h * 0.76);
    c.fillStyle = "rgba(244,244,242,.30)";
    c.font = `500 ${h * 0.038}px 'IBM Plex Mono', monospace`;
    c.fillText("0123456789  &  ?!  @  £€¥", w / 2, h * 0.90);
  }

  function size() {
    const r = cv.getBoundingClientRect();
    DPR = Math.min(devicePixelRatio || 1, 2);
    /* ⚠️ taller on a phone. At 0.62 the specimen was 16% of the viewport and the
       page flipped to text-led — on a small screen the OBJECT keeps its share. */
    W = r.width || 640; H = Math.round(W * (W < 620 ? 1.05 : 0.62));
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cv.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    /* the source is rendered at 2x so the magnified view still has real detail
       to sample. Sampling a 1x source at 3x is just a blur. */
    const S = 2;
    off.width = Math.round(W * S); off.height = Math.round(H * S);
    octx.setTransform(S, 0, 0, S, 0, 0);
    paintSpecimen(octx, W, H);
    src = octx.getImageData(0, 0, off.width, off.height);
  }

  function draw() {
    if (!W || !src) return;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(off, 0, 0, W, H);
    if (REDUCED) return;

    const cx = mx * W, cy = my * H, R = RAD * W;
    const S = off.width / W;                 /* source oversample factor */
    const D = Math.ceil(R * 2);
    const out = ctx.createImageData(Math.round(D * DPR), Math.round(D * DPR));
    const od = out.data, sd = src.data;
    const ow = out.width, oh = out.height;

    for (let py = 0; py < oh; py++) {
      for (let pxi = 0; pxi < ow; pxi++) {
        /* destination offset from the lens centre, in CSS px */
        const dx = (pxi / DPR) - R, dy = (py / DPR) - R;
        const r2n = (dx * dx + dy * dy) / (R * R);      /* squared radius, 0..1 */
        const i = (py * ow + pxi) * 4;

        if (r2n > 1) { od[i + 3] = 0; continue; }

        /* ⭐ §10.1: magnification falls off with the SQUARE of the radius, so
           the centre is calm and the rim bends. dot(d,d) — no square root. */
        const m = MAG / (1 + K * r2n);
        const sx = (cx + dx / m) * S;
        const sy = (cy + dy / m) * S;

        /* ⭐ chromatic fringing along the same radial vector: zero at the
           centre, maximum at the rim, exactly like a real lens */
        const shift = r2n * 2.6 * S;
        const ux = r2n > 0.0001 ? dx / Math.sqrt(dx * dx + dy * dy) : 0;
        const uy = r2n > 0.0001 ? dy / Math.sqrt(dx * dx + dy * dy) : 0;

        const sample = (x, y, ch) => {
          const xi = x | 0, yi = y | 0;
          if (xi < 0 || yi < 0 || xi >= off.width || yi >= off.height) return 11;
          return sd[(yi * off.width + xi) * 4 + ch];
        };

        od[i]     = sample(sx + ux * shift, sy + uy * shift, 0);
        od[i + 1] = sample(sx, sy, 1);
        od[i + 2] = sample(sx - ux * shift, sy - uy * shift, 2);
        od[i + 3] = 255;
      }
    }

    /* ⚠️ putImageData ignores the current transform, so it must be given DEVICE
       pixels. Passing CSS pixels here put the lens at a third of the distance
       from the corner on a 2x screen and nowhere near the cursor. */
    ctx.putImageData(out, Math.round((cx - R) * DPR), Math.round((cy - R) * DPR));

    /* the glass: a rim, one highlight arc, and a crosshair so it reads as an
       instrument rather than a bubble */
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7);
    ctx.strokeStyle = "rgba(3,3,3,.9)"; ctx.lineWidth = 9; ctx.stroke();
    ctx.strokeStyle = HOT; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, R - 6, Math.PI * 1.06, Math.PI * 1.52);
    ctx.strokeStyle = "rgba(244,244,242,.34)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = "rgba(255,68,0,.55)"; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy); ctx.lineTo(cx - 4, cy);
    ctx.moveTo(cx + 4, cy); ctx.lineTo(cx + 10, cy);
    ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy - 4);
    ctx.moveTo(cx, cy + 4); ctx.lineTo(cx, cy + 10);
    ctx.stroke();
    ctx.restore();
  }

  const at = (e) => {
    const r = cv.getBoundingClientRect();
    tx = (e.clientX - r.left) / r.width;
    ty = (e.clientY - r.top) / r.height;
  };
  cv.addEventListener("pointermove", at, { passive: true });
  cv.addEventListener("pointerleave", () => { tx = 0.62; ty = 0.5; });

  size();
  addEventListener("resize", () => { size(); draw(); }, { passive: true });

  /* ⭐ the lens LAGS the pointer. Instant tracking reads as a cursor decoration;
     a beat of lag reads as a piece of glass with weight in your hand. */
  function frame() {
    mx += (tx - mx) * 0.13;
    my += (ty - my) * 0.13;
    draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  $("#mag").textContent = MAG.toFixed(1);
}

/* ── content ──────────────────────────────────────────────────────────────── */
const WEIGHTS = [
  ["100", "Thin", "Display only, 48pt and up"],
  ["300", "Light", "Subheads, captions"],
  ["400", "Regular", "Body, 9pt to 18pt"],
  ["500", "Medium", "Interface, buttons"],
  ["700", "Bold", "Headlines"],
  ["900", "Black", "Posters, one word at a time"],
];

const CARDS = [
  ["a", "The double-storey a", "The bowl meets the stem at a real angle, not a curve. It is the first thing that muddies at 8pt and the first thing we redrew."],
  ["g", "A single-storey g", "Two drawings existed. The double-storey one was prettier and closed up on screen, so it lost."],
  ["1", "A flagged one", "Without the flag it reads as a lowercase l in tables, which is where numbers actually live."],
  ["æ", "Diacritics that fit", "Accents sit inside the line height. A caron that collides with the line above is not a diacritic, it is a bug."],
];

const TIERS = [
  ["One weight", "$95", "perpetual", ["Any single weight", "Desktop, web and app", "Unlimited seats"], false],
  ["The family", "$390", "perpetual", ["All six weights", "Variable font included", "Unlimited seats, forever"], true],
  ["Student", "$0", "free", ["All six weights", "Non-commercial work only", "Send a photo of your ID"], false],
];

const QA = [
  ["Why is there no seat limit?", "Because counting seats is a tax on growing, and enforcing it means asking you to audit your own staff for us. We charge once for the family and you use it. If your company gets ten times bigger the type does not cost us any more to have drawn."],
  ["Is the variable font the same outlines?", "Yes. The six static weights are instances cut from the same variable source, so a headline set at 640 and a body set at 400 are the same skeleton. That is the entire claim this foundry makes and it would be easy to check and embarrassing to fake."],
  ["What about 8 point on screen?", "It was drawn for it. The apertures on c, e and s are open wider than the display cut, the joints on a and g are thinned, and the numerals are flagged. Set the specimen small in the loupe and look at the e — the aperture is the tell."],
  ["Can I modify it?", "Yes, for your own use — subset it, hint it, change the terminals, whatever the job needs. You may not redistribute the modified file or sell it, and if you build something interesting with it we would like to see it."],
  ["Do you do custom work?", "Two commissions a year, usually a bespoke cut of Halide with a client's own letterforms folded in. It takes four to six months and starts around $18,000. We say no more often than yes, mostly on timeline."],
];

function init() {
  loupe();

  $("#strip").innerHTML = WEIGHTS.map(([w, n]) =>
    `<span style="font-weight:${w}">${n}</span>`).join("");

  $("#wts").innerHTML = WEIGHTS.map(([w, n, use], i) => `
    <li><button type="button">
      <span class="no">${String(i + 1).padStart(2, "0")}</span>
      <b style="font-weight:${w}">${n} &mdash; Handgloves</b>
      <span class="k">${w} &middot; ${use}</span>
    </button></li>`).join("");

  $("#cards").innerHTML = CARDS.map(([g, b, s]) =>
    `<article class="card"><span class="g">${g}</span><b>${b}</b><span>${s}</span></article>`).join("");

  $("#tiers").innerHTML = TIERS.map(([k, p, u, l, hot]) => `
    <article class="tier${hot ? " tier--hot" : ""}">
      <span class="tier__k">${k}${hot ? " &middot; most bought" : ""}</span>
      <span class="tier__p">${p}<small>${u}</small></span>
      <ul>${l.map((x) => `<li>${x}</li>`).join("")}</ul>
      <a href="#">${hot ? "Buy the family" : "Buy"}</a>
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

/* the specimen is drawn in Archivo, so wait for the face or the first paint is
   Helvetica and the whole point of the page is missed */
if (document.fonts && document.fonts.ready) document.fonts.ready.then(init);
else init();
