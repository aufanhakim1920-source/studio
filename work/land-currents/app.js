(() => {
  "use strict";
  const D = window.CURRENTS_DATA;
  if (!D || !D.series || !D.series.length) {
    document.title = "no data";
    return;
  }
  /* ── the dataset, read once ───────────────────────────────────────────── */
  const AX = D.axis;
  const F0 = AX.from, SPAN = Math.max(1, AX.to - AX.from);
  const SER = D.series;
  const NS = SER.length;
  const STOPS = D.stops || [];
  const NST = STOPS.length;
  const S = D.strings || {};
  const DEC = D.unit && D.unit.decimals != null ? D.unit.decimals : 1;
  const USH = (D.unit && D.unit.short) || "";
  const ULONG = (D.unit && D.unit.long) || "";
  const TICK = AX.tickEvery || 5;
  const STEPW = AX.stepName || "";
  const fmtStep = (v) => String(Math.round(v));
  const fmtVal = (v) => v.toFixed(DEC);
  /* ── small maths ──────────────────────────────────────────────────────── */
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  function mulberry(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  /* ── colour ───────────────────────────────────────────────────────────── */
  const hx = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const css = (c, a) => (a === undefined
    ? "rgb(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + ")"
    : "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + a + ")");
  const hexOf = (c) => "#" + c.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")).join("");
  const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  /* small type on a black ground needs a floor. Lift toward white along the same
     hue rather than swapping to a neutral, which is how a palette goes grey. */
  function textSafe(c) {
    let t = 0;
    while (lum(mix(c, [255, 255, 255], t)) < 158 && t < 1) t += 0.04;
    return mix(c, [255, 255, 255], t);
  }
  const GROUND = [5, 9, 18];
  const SC = SER.map((s) => {
    const base = hx(s.colour);
    return {
      base,
      light: mix(base, [255, 255, 255], 0.34),
      hot: mix(base, [255, 255, 255], 0.62),
      deep: mix(base, GROUND, 0.42),
      text: textSafe(base),
      textHex: hexOf(textSafe(base)),
      hex: s.colour,
    };
  });
  /* ── the data, sampled ────────────────────────────────────────────────── */
  const _sh = new Float64Array(NS);
  const _cum = new Float64Array(NS + 1);
  function rawAt(si, f) {
    const v = SER[si].values;
    const i = clamp(Math.floor(f), 0, SPAN);
    const j = Math.min(i + 1, SPAN);
    const a = v[i] == null ? 0 : v[i];
    const b = v[j] == null ? 0 : v[j];
    return lerp(a, b, clamp01(f - i));
  }
  /* every column is normalised, so a series can be added or dropped from data.js
     without rebalancing the rest of the file */
  function sharesAt(f, out) {
    let tot = 0;
    for (let i = 0; i < NS; i++) { const v = Math.max(0, rawAt(i, f)); _sh[i] = v; tot += v; }
    if (tot <= 0) tot = 1;
    let c = 0;
    out[0] = 0;
    for (let i = 0; i < NS; i++) { c += _sh[i] / tot; out[i + 1] = c; }
    return out;
  }
  function totalAt(f) {
    let tot = 0;
    for (let i = 0; i < NS; i++) tot += Math.max(0, rawAt(i, f));
    return tot || 1;
  }
  const shareOf = (si, f) => (Math.max(0, rawAt(si, f)) / totalAt(f)) * 100;
  const keyIndex = {};
  SER.forEach((s, i) => { keyIndex[s.key] = i; });
  const idxOf = (keys) => keys.map((k) => keyIndex[k]).filter((i) => i != null);
  const GROUPS = (D.groups || []).map((g) => ({ name: g.name, idx: idxOf(g.keys) }));
  const twoGroups = GROUPS.length === 2 && GROUPS[0].idx.length && GROUPS[1].idx.length;
  const divIndex = twoGroups ? Math.min.apply(null, GROUPS[1].idx) : -1;
  const FOCUS = STOPS.map((st) => {
    const f = st.focus || {};
    const idx = idxOf(f.keys || []);
    return {
      name: f.name || (idx.length ? SER[idx[0]].name : ""),
      idx,
      lo: idx.length ? Math.min.apply(null, idx) : 0,
      hi: idx.length ? Math.max.apply(null, idx) : 0,
      c: idx.length ? SC[idx[0]] : SC[0],
    };
  });
  const focusValue = (fi, f) => {
    const F = FOCUS[fi];
    let v = 0;
    for (const i of F.idx) v += Math.max(0, rawAt(i, f));
    return (v / totalAt(f)) * 100;
  };
  const groupValue = (gi, f) => {
    let v = 0;
    for (const i of GROUPS[gi].idx) v += Math.max(0, rawAt(i, f));
    return (v / totalAt(f)) * 100;
  };
  function largestAt(f) {
    let bi = 0, bv = -1;
    for (let i = 0; i < NS; i++) { const v = rawAt(i, f); if (v > bv) { bv = v; bi = i; } }
    return bi;
  }
  function largestIn(gi, f) {
    let bi = GROUPS[gi].idx[0], bv = -1;
    for (const i of GROUPS[gi].idx) { const v = rawAt(i, f); if (v > bv) { bv = v; bi = i; } }
    return bi;
  }
  /* ── dom ──────────────────────────────────────────────────────────────── */
  const $ = (id) => document.getElementById(id);
  const root = document.documentElement;
  const canvas = $("river"), ctx = canvas.getContext("2d");
  const fieldEl = $("field"), railEl = $("rail"), headEl = $("head");
  const ticksEl = $("ticks"), marksEl = $("marks"), hintEl = $("hint");
  const odoEl = document.querySelector(".odo"), odoStep = $("odoStep");
  const leadLabel = $("leadLabel"), leadValue = $("leadValue");
  const figEl = $("figure"), figName = $("figName"), figNum = $("figNum"), figUnit = $("figUnit");
  const stopEl = $("stopBlock"), stopNo = $("stopNo"), stopAt = $("stopAt"), stopAway = $("stopAway");
  const stopTitle = $("stopTitle"), stopLine = $("stopLine");
  const groupsEl = $("groups"), passedTop = $("passedTop"), passedBottom = $("passedBottom");
  const indexEl = $("index"), indexLink = $("indexLink"), closeIndex = $("closeIndex"), ixList = $("ixList");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const coarse = window.matchMedia("(pointer:coarse)").matches;
  const GAIN = coarse ? 1.8 : 1.1;
  /* ── the chrome, written from data.js ─────────────────────────────────── */
  $("wordmark").textContent = D.title || "";
  $("tagline").textContent = D.tagline || "";
  $("kicker").textContent = D.kicker || "";
  indexLink.childNodes[0].nodeValue = (S.indexLink || "Index") + " ";
  leadLabel.textContent = S.lead || "";
  figUnit.textContent = ULONG;
  hintEl.textContent = S.hint || "";
  $("ixTitle").textContent = S.indexTitle || "";
  closeIndex.textContent = S.close || "Close";
  railEl.setAttribute("aria-label", S.railLabel || AX.label || "");
  railEl.setAttribute("aria-valuemin", String(AX.from));
  railEl.setAttribute("aria-valuemax", String(AX.to));
  /* the legend of every band lives at the foot of the index, so the page itself
     stays sparse and a band only earns its name when it is thick enough to read */
  (function foot() {
    const keys = SER.map((s, i) =>
      '<span style="color:' + SC[i].textHex + '">▬ ' + s.name + "</span>").join("&nbsp; &nbsp;");
    $("ixFoot").innerHTML = keys + "<br><br>" + (S.footNote || "");
  })();
  /* ── state ────────────────────────────────────────────────────────────── */
  let target = 0, pos = 0;
  let touched = false, dragging = null, lastX = 0;
  let dwell = 0, shownIdx = -1;
  const passed = new Array(NST).fill(false);
  let passedCount = 0;
  let W = 0, H = 0, dpr = 1;
  let fieldTop = 0, fieldBot = 0, riverTop = 0, riverBot = 0, riverH = 1;
  let pxPerStep = 120, windowSteps = 8, playX = 200, wide = true;
  let streaks = [];
  let liveIdx = -1, liveIsFocus = false;
  /* THE CAMERA. The first version pinned the playhead to a fixed screen x, which
     meant that at the end of the record four fifths of the screen showed the last
     column held flat — a river that had stopped saying anything. So the window
     PANS with you and STOPS at the ends, and the playhead slides to the edge
     instead. The record therefore fills the frame at every position, and nothing
     is ever drawn outside it. */
  const ANCHOR = 0.30;
  let camL = 0;
  const stepNow = () => pos * SPAN;
  function updateCam() {
    const vis = Math.min(windowSteps, SPAN);
    pxPerStep = W / vis;
    const maxL = Math.max(-0.35, SPAN - vis + 0.35);
    camL = clamp(stepNow() - vis * ANCHOR, -0.35, maxL);
    playX = (stepNow() - camL) * pxPerStep;
  }
  const xAt = (f) => (f - camL) * pxPerStep;
  const fAtX = (x) => camL + x / pxPerStep;
  /* per-stop arrival windows: a stop with a close neighbour gets a narrow one, so
     two stops never light at once */
  const win = STOPS.map((s, i) => {
    let gap = 1e9;
    STOPS.forEach((o, j) => { if (i !== j) gap = Math.min(gap, Math.abs(o.at - s.at)); });
    if (!isFinite(gap)) gap = SPAN;
    const w0 = Math.min(SPAN * 0.14, Math.max(0.6, gap * 0.5));
    return { w0, w1: w0 * 0.3 };
  });
  const stopF = STOPS.map((s) => clamp(s.at - F0, 0, SPAN));
  /* ── the rail ─────────────────────────────────────────────────────────── */
  const RAIL_PAD = 9;
  const railPos = (f) =>
    "calc(" + RAIL_PAD + "px + " + (f * 100).toFixed(3) + "% - " + (f * RAIL_PAD * 2).toFixed(2) + "px)";
  function buildTicks() {
    ticksEl.innerHTML = "";
    const every = window.innerWidth < 620 ? TICK * 2 : TICK;
    const first = Math.ceil(AX.from / every) * every;
    for (let v = first; v <= AX.to; v += every) {
      const f = (v - F0) / SPAN;
      if (f < 0.02 || f > 0.985) continue;
      const el = document.createElement("span");
      el.className = "tk";
      el.style.left = railPos(f);
      el.textContent = fmtStep(v);
      ticksEl.appendChild(el);
    }
  }
  const markEls = STOPS.map((s) => {
    const el = document.createElement("i");
    el.className = "mk";
    el.style.left = railPos(stopF[STOPS.indexOf(s)] / SPAN);
    marksEl.appendChild(el);
    return el;
  });
  /* ── the index ────────────────────────────────────────────────────────── */
  const rowEls = STOPS.map((s, i) => {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button"; b.className = "ix-row";
    b.innerHTML =
      '<span class="ix-n">' + String(i + 1).padStart(2, "0") + "</span>" +
      '<span class="ix-at">' + fmtStep(s.at) + "</span>" +
      '<span class="ix-t">' + s.title + "</span>" +
      '<span class="ix-f">' + s.line + "</span>" +
      '<span class="ix-s">—</span>';
    b.addEventListener("click", (e) => { e.stopPropagation(); arm(); target = stopF[i] / SPAN; closeIx(); });
    li.appendChild(b); ixList.appendChild(li);
    return b;
  });
  let ixOpen = false;
  function openIx() { ixOpen = true; indexEl.classList.add("open"); indexEl.setAttribute("aria-hidden", "false"); closeIndex.focus(); }
  function closeIx() { ixOpen = false; indexEl.classList.remove("open"); indexEl.setAttribute("aria-hidden", "true"); indexLink.focus(); }
  indexLink.addEventListener("click", (e) => { e.preventDefault(); ixOpen ? closeIx() : openIx(); });
  closeIndex.addEventListener("click", (e) => { e.stopPropagation(); closeIx(); });
  /* the overlay closes on its own ground too — an overlay you can only leave by
     finding one small word is the thing that reads as "hard to navigate" */
  indexEl.addEventListener("click", () => { if (ixOpen) closeIx(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && ixOpen) closeIx(); });
  /* ── the two group readouts in the footer ─────────────────────────────── */
  const gpEls = GROUPS.map((g) => {
    const sp = document.createElement("span");
    sp.className = "gp";
    sp.innerHTML = '<i></i>' + g.name + " <b>—</b>";
    groupsEl.appendChild(sp);
    return { swatch: sp.querySelector("i"), val: sp.querySelector("b") };
  });
  /* ── layout ───────────────────────────────────────────────────────────── */
  /* the stop block is bottom-anchored and its height changes with the sentence,
     which would walk the river up and down every time a stop lit. So it is
     measured once against its own longest content and pinned. */
  function pinStopHeight() {
    if (!NST) return;
    stopEl.style.minHeight = "";
    const t0 = stopTitle.textContent, l0 = stopLine.textContent;
    let max = 0;
    for (const s of STOPS) {
      stopTitle.textContent = s.title; stopLine.textContent = s.line;
      max = Math.max(max, stopEl.offsetHeight);
    }
    stopTitle.textContent = t0; stopLine.textContent = l0;
    stopEl.style.minHeight = max + "px";
  }
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    wide = W >= 820;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.max(1, Math.round(W * dpr)), ch = Math.max(1, Math.round(H * dpr));
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildTicks();
    pinStopHeight();
    const fr = fieldEl.getBoundingClientRect();
    fieldTop = fr.top; fieldBot = fr.bottom;
    const or_ = odoEl.getBoundingClientRect();
    const gr = figEl.getBoundingClientRect();      /* always laid out; only its opacity moves */
    const sr = stopEl.getBoundingClientRect();
    const gap = Math.max(14, (fieldBot - fieldTop) * 0.035);
    riverTop = Math.max(or_.bottom, gr.bottom) + gap;
    riverBot = sr.top - gap * 0.7;
    const minH = (fieldBot - fieldTop) * 0.24;
    if (riverBot - riverTop < minH) {
      const mid = (riverTop + riverBot) / 2;
      riverTop = mid - minH / 2; riverBot = mid + minH / 2;
    }
    riverTop = Math.max(riverTop, fieldTop + 4);
    riverBot = Math.min(riverBot, fieldBot - 4);
    riverH = Math.max(20, riverBot - riverTop);
    windowSteps = clamp(W / 150, 6, 11);
    updateCam();
    buildStreaks();
    placeHead();
  }
  /* ── the current ──────────────────────────────────────────────────────
     Each streak keeps a fixed DEPTH inside its own band, so when the band
     narrows the streaks are squeezed together and when it swells they spread —
     the flow carries the same information as the thickness. */
  function buildStreaks() {
    streaks = [];
    const rnd = mulberry(20260903);
    const per = W < 560 ? 26 : 52;
    const range = windowSteps * 1.5;
    for (let i = 0; i < NS; i++) {
      for (let k = 0; k < per; k++) {
        streaks.push({
          si: i,
          u: 0.08 + rnd() * 0.84,
          f: -range * 0.4 + rnd() * range,
          len: (0.13 + rnd() * 0.30) * (windowSteps / 7),
          spd: (0.42 + rnd() * 0.75) * (windowSteps / 7),
          a: 0.26 + rnd() * 0.5,
        });
      }
    }
  }
  const cumA = new Float64Array(NS + 1);
  const cumB = new Float64Array(NS + 1);
  const yOf = (q) => riverBot - q * riverH;
  function bandY(f, si, u) {
    sharesAt(f, cumB);
    return yOf(cumB[si] + u * (cumB[si + 1] - cumB[si]));
  }
  /* ── drawing ──────────────────────────────────────────────────────────── */
  const COL = 4;
  let cols = 0;
  let grid = new Float64Array(0);
  function sampleGrid() {
    const n = Math.ceil(W / COL) + 3;
    if (n !== cols) { cols = n; grid = new Float64Array(cols * (NS + 1)); }
    for (let c = 0; c < cols; c++) {
      const x = (c - 1) * COL;
      sharesAt(clamp(fAtX(x), -0.6, SPAN + 0.6), cumA);
      for (let i = 0; i <= NS; i++) grid[c * (NS + 1) + i] = cumA[i];
    }
  }
  const gq = (c, i) => grid[c * (NS + 1) + i];
  function bandPath(i, map) {
    ctx.beginPath();
    for (let c = 0; c < cols; c++) ctx[c ? "lineTo" : "moveTo"]((c - 1) * COL, map(yOf(gq(c, i + 1))));
    for (let c = cols - 1; c >= 0; c--) ctx.lineTo((c - 1) * COL, map(yOf(gq(c, i))));
    ctx.closePath();
  }
  function edgePath(i, map) {
    ctx.beginPath();
    for (let c = 0; c < cols; c++) ctx[c ? "lineTo" : "moveTo"]((c - 1) * COL, map(yOf(gq(c, i))));
  }
  const ID = (y) => y;
  /* film grain, made once. Composited as OVERLAY, which leaves true black alone
     and only works on the lit parts — so it textures the river without lifting
     the dark ground off the floor. Texture is not optional in any reference in
     the library, and it is what took measured edge energy over the line here. */
  const GRAIN = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 168;
    const g = c.getContext("2d"), im = g.createImageData(168, 168), r = mulberry(4711);
    for (let i = 0; i < im.data.length; i += 4) {
      const v = 128 + Math.round((r() - 0.5) * 62);
      im.data[i] = v; im.data[i + 1] = v; im.data[i + 2] = v; im.data[i + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    return c;
  })();
  let GRAIN_PAT = null;
  function laminar(i, aMul) {
    let mx = 0;
    for (let c = 0; c < cols; c++) { const th = (gq(c, i + 1) - gq(c, i)) * riverH; if (th > mx) mx = th; }
    const k = Math.min(16, Math.floor(mx / 8));
    if (k < 2) return;
    for (let j = 1; j < k; j++) {
      const q = j / k;
      ctx.beginPath();
      for (let c = 0; c < cols; c += 2) {
        const y = yOf(gq(c, i) + q * (gq(c, i + 1) - gq(c, i)));
        ctx[c ? "lineTo" : "moveTo"]((c - 1) * COL, y);
      }
      ctx.lineWidth = 1;
      ctx.strokeStyle = (j % 2)
        ? css(SC[i].deep, 0.58 * aMul)
        : css(SC[i].hot, 0.30 * aMul);
      ctx.stroke();
    }
  }
  function drawGround() {
    const g = ctx.createLinearGradient(0, fieldTop, 0, fieldBot);
    g.addColorStop(0, "#02050B");
    g.addColorStop(0.52, "#060B16");
    g.addColorStop(1, "#02050A");
    ctx.fillStyle = g;
    ctx.fillRect(0, fieldTop, W, fieldBot - fieldTop);
    /* the axis, drawn faintly through the whole field: this is the evidence that
       you are travelling, and it costs almost no light */
    const s0 = Math.max(0, Math.floor(fAtX(-COL))), s1 = Math.min(SPAN, Math.ceil(fAtX(W + COL)));
    for (let v = s0; v <= s1; v++) {
      const x = xAt(v);
      if (x < -2 || x > W + 2) continue;
      const major = (Math.round(v + F0) % TICK) === 0;
      ctx.fillStyle = major ? "rgba(149,163,188,.13)" : "rgba(149,163,188,.055)";
      ctx.fillRect(Math.round(x), fieldTop, 1, fieldBot - fieldTop);
    }
  }
  function drawRiver(t, lock, fi) {
    const F = fi >= 0 ? FOCUS[fi] : null;
    const dim = F && F.idx.length ? lock * 0.52 : 0;
    const xa = xAt(0), xb = xAt(SPAN);
    ctx.save();
    ctx.beginPath(); ctx.rect(xa, fieldTop - 2, Math.max(1, xb - xa), fieldBot - fieldTop + 4); ctx.clip();
    /* the reflection first, squashed and dim — it is what makes the bands read as
       a body of water rather than as a stacked area chart */
    const refl = Math.min(fieldBot - riverBot, riverH * 0.46);
    if (refl > 12) {
      ctx.save();
      ctx.beginPath(); ctx.rect(0, riverBot, W, refl); ctx.clip();
      const k = refl / riverH;
      const map = (y) => riverBot + (riverBot - y) * k;
      ctx.globalAlpha = 0.30;
      for (let i = 0; i < NS; i++) { bandPath(i, map); ctx.fillStyle = css(SC[i].deep); ctx.fill(); }
      ctx.globalAlpha = 1;
      const fade = ctx.createLinearGradient(0, riverBot, 0, riverBot + refl);
      fade.addColorStop(0, "rgba(4,7,13,.18)");
      fade.addColorStop(1, "rgba(4,7,13,1)");
      ctx.fillStyle = fade; ctx.fillRect(0, riverBot, W, refl);
      ctx.restore();
    }
    /* the bands */
    for (let i = 0; i < NS; i++) {
      bandPath(i, ID);
      const g = ctx.createLinearGradient(0, riverTop, 0, riverBot);
      g.addColorStop(0, css(SC[i].light));
      g.addColorStop(1, css(SC[i].deep));
      ctx.fillStyle = g;
      ctx.fill();
      laminar(i, 1);
    }
    /* every boundary is keylined: a dark hairline under a lit one. That pair is
       what makes the river read as DEFINED FORM rather than as a soft gradient. */
    ctx.lineJoin = "round"; ctx.lineCap = "butt";
    for (let i = 1; i <= NS; i++) {
      const c = SC[Math.min(i, NS - 1)];
      edgePath(i, ID);
      ctx.lineWidth = 3; ctx.strokeStyle = "rgba(3,6,12,.8)";
      ctx.stroke();
      edgePath(i, ID);
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = i === NS ? "rgba(237,233,224,.5)" : css(SC[i - 1].hot, 0.95);
      ctx.stroke();
      void c;
    }
    /* only one stop is lit at a time — and when one is, the river itself dims
       everywhere except the bands that stop is about */
    if (dim > 0.01) {
      ctx.save();
      ctx.beginPath(); ctx.rect(0, riverTop - 1, W, riverH + 2); ctx.clip();
      ctx.fillStyle = "rgba(4,7,14," + dim.toFixed(3) + ")";
      ctx.fillRect(0, riverTop - 1, W, riverH + 2);
      /* the veil takes brightness off the other bands; it must not take their
         STRUCTURE off as well, or the river turns to fog wherever a stop is lit
         (measured: edge energy fell to 6.7 at the last stop, under the floor) */
      for (let i = 0; i < NS; i++) { if (F.idx.indexOf(i) < 0) laminar(i, 0.62); }
      for (let i = 1; i <= NS; i++) {
        edgePath(i, ID);
        ctx.lineWidth = 1.1;
        ctx.strokeStyle = i === NS ? "rgba(237,233,224,.28)" : css(SC[i - 1].hot, 0.4);
        ctx.stroke();
      }
      for (const i of F.idx) {
        bandPath(i, ID);
        const g = ctx.createLinearGradient(0, riverTop, 0, riverBot);
        g.addColorStop(0, css(SC[i].light));
        g.addColorStop(1, css(SC[i].base));
        ctx.fillStyle = g; ctx.fill();
        laminar(i, 1.15);
        edgePath(i + 1, ID);
        ctx.lineWidth = 1.6; ctx.strokeStyle = css(SC[i].hot, 0.95); ctx.stroke();
      }
      ctx.restore();
    }
    drawFlow(t, F, dim);
    if (divIndex > 0) drawDividerLine();
    ctx.restore();
    /* the type goes on AFTER the clip is lifted, so a label never gets sliced in
       half by the end of the record */
    if (divIndex > 0) drawDividerWords();
  }
  function drawFlow(t, F, dim) {
    ctx.save();
    ctx.beginPath(); ctx.rect(0, riverTop, W, riverH); ctx.clip();
    ctx.lineCap = "round";
    for (const s of streaks) {
      const x1 = xAt(s.f);
      if (x1 < -70 || x1 > W + 70) continue;
      sharesAt(clamp(s.f, -0.6, SPAN + 0.6), cumB);
      const th = (cumB[s.si + 1] - cumB[s.si]) * riverH;
      if (th < 3) continue;
      const y1 = yOf(cumB[s.si] + s.u * (cumB[s.si + 1] - cumB[s.si]));
      const f2 = s.f - s.len;
      sharesAt(clamp(f2, -0.6, SPAN + 0.6), cumB);
      const y2 = yOf(cumB[s.si] + s.u * (cumB[s.si + 1] - cumB[s.si]));
      let a = s.a * clamp01((th - 3) / 14);
      if (dim > 0.01) a *= (F && F.idx.indexOf(s.si) >= 0) ? 1 : (1 - dim);
      if (a < 0.02) continue;
      ctx.globalAlpha = a;
      ctx.strokeStyle = css(SC[s.si].hot);
      ctx.lineWidth = clamp(th * 0.10, 1, 2.6);
      ctx.beginPath(); ctx.moveTo(xAt(f2), y2); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.globalAlpha = Math.min(1, a * 1.7);
      ctx.fillStyle = css(SC[s.si].hot);
      ctx.beginPath(); ctx.arc(x1, y1, clamp(th * 0.045, 0.9, 2.1), 0, 6.2832); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
  /* the one bright line in the picture: where the stack splits into its two
     groups. Its height IS the split, so watching it climb is the whole story. */
  function drawDividerLine() {
    edgePath(divIndex, ID);
    ctx.lineWidth = 6; ctx.strokeStyle = "rgba(237,233,224,.10)"; ctx.stroke();
    edgePath(divIndex, ID);
    ctx.lineWidth = 1.8; ctx.strokeStyle = "rgba(255,252,244,.92)"; ctx.stroke();
  }
  /* the two words live at the far right, the band names live at the playhead. They
     collided in the first version because both wanted the same column. */
  function drawDividerWords() {
    if (playX > W * 0.62) return;
    const lx = Math.min(W - 16, Math.max(xAt(0) + 8, xAt(SPAN) - 8));
    const c = Math.max(0, Math.min(cols - 1, Math.round(lx / COL) + 1));
    const y = yOf(gq(c, divIndex));
    ctx.font = '500 10px "IBM Plex Mono",ui-monospace,monospace';
    ctx.textAlign = "right";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "rgba(255,252,244,.74)";
    if (S.dividerHi && y - 9 > riverTop + 10) ctx.fillText(S.dividerHi.toUpperCase(), lx, y - 9);
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(255,252,244,.46)";
    if (S.dividerLo && y + 9 < riverBot - 12) ctx.fillText(S.dividerLo.toUpperCase(), lx, y + 9);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
  /* a band earns its name when it is thick enough to hold it. That is the legend
     and it is the river — there is no key sitting beside the picture. */
  function drawLabels(F, dim) {
    const c = Math.max(0, Math.min(cols - 1, Math.round((playX + 2) / COL) + 1));
    const f = fAtX(playX);
    ctx.font = '500 11px "IBM Plex Mono",ui-monospace,monospace';
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    /* the names ride the playhead, and swap to its other side once it runs out of
       room — which it does, because the playhead reaches the frame edge at the end
       of the record */
    const toRight = playX < W * 0.58;
    const single = F && F.idx.length === 1;
    let lastY = -1e9;
    for (let i = 0; i < NS; i++) {
      const yA = yOf(gq(c, i + 1)), yB = yOf(gq(c, i));
      const th = yB - yA;
      const isF = F && F.idx.indexOf(i) >= 0;
      const force = isF && single;
      if (th < 19 && !force) continue;
      const y = (yA + yB) / 2;
      if (Math.abs(y - lastY) < 16 && !force) continue;
      let a = clamp01((th - 17) / 12);
      if (force) a = 1;
      else if (dim > 0.01) a *= (1 - dim);
      if (a < 0.05) continue;
      lastY = y;
      const nm = SER[i].name.toUpperCase();
      const vt = fmtVal(shareOf(i, f)) + USH;
      const nw = ctx.measureText(nm).width, vw = ctx.measureText(vt).width;
      let nx, vx;
      if (toRight) { nx = playX + 10; vx = nx + nw + 12; }
      else { vx = playX - 10 - vw; nx = vx - 12 - nw; }
      nx = clamp(nx, 8, W - 8 - nw - 12 - vw);
      vx = nx + nw + 12;
      ctx.globalAlpha = a;
      ctx.lineJoin = "round"; ctx.lineWidth = 2.4;
      ctx.strokeStyle = "rgba(4,8,14,.78)";
      ctx.strokeText(nm, nx, y); ctx.strokeText(vt, vx, y);
      ctx.fillStyle = "rgba(255,252,246,.96)";
      ctx.fillText(nm, nx, y);
      ctx.globalAlpha = a * 0.92;
      ctx.fillStyle = css(mix(SC[i].hot, [255, 255, 255], 0.5));
      ctx.fillText(vt, vx, y);
    }
    ctx.globalAlpha = 1;
    /* the playhead: the column everything on the page is reading from */
    ctx.fillStyle = "rgba(237,233,224,.22)";
    ctx.fillRect(Math.round(playX), riverTop, 1, riverH);
    ctx.fillStyle = "rgba(237,233,224,.75)";
    ctx.fillRect(Math.round(playX) - 3, riverTop - 3, 7, 2);
    ctx.fillRect(Math.round(playX) - 3, riverBot + 1, 7, 2);
  }
  /* the leader that ties the one large number back to the band it is about —
     nothing on the page floats free of the river */
  function drawLeader(fi, lock) {
    if (fi < 0 || lock < 0.06) return;
    const F = FOCUS[fi];
    if (!F.idx.length) return;
    const x = clamp(xAt(stopF[fi]), 8, W - 8);
    const c = Math.max(0, Math.min(cols - 1, Math.round(x / COL) + 1));
    const yT = yOf(gq(c, F.hi + 1)), yB2 = yOf(gq(c, F.lo));
    const y = yT + clamp((yB2 - yT) * 0.28, 5, 20);
    const r = figEl.getBoundingClientRect();
    /* the number sits top-right; once the playhead passes under it the leader has
       to come up from below instead of across, or it doubles back on itself */
    const side = r.left - 14 > x + 10;
    const tx = side ? r.left - 12 : clamp(r.left + r.width * 0.5, 12, W - 12);
    const ty = side ? r.top + r.height * 0.52 : r.bottom + 14;
    ctx.save();
    ctx.globalAlpha = lock;
    ctx.lineJoin = "round";
    /* drawn twice: a dark under-stroke first, or it vanishes the moment it
       crosses a bright band, which is most of its length */
    for (const pass of [0, 1]) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      if (side) { ctx.lineTo(x + 26, y); ctx.lineTo(tx, ty); }
      else { ctx.lineTo(x, ty); ctx.lineTo(tx, ty); }
      ctx.lineWidth = pass ? 1.2 : 3;
      ctx.strokeStyle = pass ? css(F.c.text, 0.95) : "rgba(6,10,18,.55)";
      ctx.stroke();
    }
    ctx.fillStyle = css(F.c.hot);
    ctx.beginPath(); ctx.arc(x, y, 3.4, 0, 6.2832); ctx.fill();
    ctx.restore();
  }
  /* the guards: the drawing is washed back where type sits, so nothing on the
     page needs a container to be legible. Feathered to the viewport edge. */
  function wash(x0, x1, y0, y1, strength) {
    if (!(y1 > y0)) return;
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, "rgba(4,7,13,1)");
    g.addColorStop(1, "rgba(4,7,13,0)");
    const strips = 18, h = (y1 - y0) / strips;
    ctx.fillStyle = g;
    for (let i = 0; i < strips; i++) {
      const u = i / (strips - 1);
      ctx.globalAlpha = strength * (u < 0.72 ? 1 : Math.pow((1 - u) / 0.28, 1.5));
      ctx.fillRect(Math.min(x0, x1), y0 + i * h, Math.abs(x1 - x0), h + 1);
    }
    ctx.globalAlpha = 1;
  }
  function drawGuards(lock) {
    const sr = stopEl.getBoundingClientRect();
    wash(0, sr.right + 150, Math.max(fieldTop, sr.top - 26), Math.min(fieldBot, sr.bottom + 24), 0.92);
    if (lock > 0.02) {
      const gr = figEl.getBoundingClientRect();
      wash(W, gr.left - 140, Math.max(fieldTop, gr.top - 20), Math.min(fieldBot, gr.bottom + 60), 0.86 * lock);
    }
    const or_ = odoEl.getBoundingClientRect();
    wash(0, or_.right + 150, fieldTop, Math.min(fieldBot, or_.bottom + 30), 0.9);
  }
  function draw(t, lock, fi) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#04070D";
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, fieldTop, W, fieldBot - fieldTop); ctx.clip();
    drawGround();
    sampleGrid();
    drawRiver(t, lock, fi);
    drawGuards(lock);
    drawLeader(fi, lock);
    if (!GRAIN_PAT) GRAIN_PAT = ctx.createPattern(GRAIN, "repeat");
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = 0.26;
    ctx.fillStyle = GRAIN_PAT;
    ctx.fillRect(0, fieldTop, W, fieldBot - fieldTop);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    const F = fi >= 0 ? FOCUS[fi] : null;
    drawLabels(F, F && F.idx.length ? lock * 0.52 : 0);
    ctx.restore();
  }
  /* ── the readouts ─────────────────────────────────────────────────────── */
  function placeHead() {
    headEl.style.transform =
      "translateX(" + (RAIL_PAD + pos * Math.max(0, railEl.clientWidth - RAIL_PAD * 2)).toFixed(2) + "px)";
  }
  function showStop(i) {
    const s = STOPS[i];
    stopNo.textContent = String(i + 1).padStart(2, "0");
    stopAt.textContent = fmtStep(s.at);
    stopTitle.textContent = s.title;
    stopLine.textContent = s.line;
    figName.textContent = FOCUS[i].name;
    shownIdx = i;
  }
  function markPassed(i) {
    passed[i] = true; passedCount++;
    markEls[i].classList.add("passed");
    rowEls[i].classList.add("passed");
    rowEls[i].querySelector(".ix-s").textContent = "●";
    passedTop.textContent = passedCount + "/" + NST;
    passedBottom.textContent = (S.crossed || "passed") + " " + passedCount + " / " + NST;
  }
  passedTop.textContent = "0/" + NST;
  passedBottom.textContent = (S.crossed || "passed") + " 0 / " + NST;
  function setLive(i, isFocus) {
    if (i === liveIdx && isFocus === liveIsFocus) return;
    liveIdx = i; liveIsFocus = isFocus;
    root.style.setProperty("--live", SC[i].hex);
    root.style.setProperty("--live-t", SC[i].textHex);
  }
  /* ── input ────────────────────────────────────────────────────────────── */
  function arm() { if (touched) return; touched = true; hintEl.classList.add("gone"); }
  canvas.addEventListener("pointerdown", (e) => {
    if (ixOpen) return;
    dragging = "river"; lastX = e.clientX; arm();
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* older engines */ }
  });
  railEl.addEventListener("pointerdown", (e) => {
    dragging = "rail"; arm();
    const r = railEl.getBoundingClientRect();
    target = clamp01((e.clientX - r.left - RAIL_PAD) / Math.max(1, r.width - RAIL_PAD * 2));
    try { railEl.setPointerCapture(e.pointerId); } catch (err) { /* older engines */ }
  });
  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    if (dragging === "river") {
      /* the world follows the finger: push it left and you travel forward */
      target = clamp01(target - ((e.clientX - lastX) / (pxPerStep * SPAN)) * GAIN);
      lastX = e.clientX;
    } else {
      const r = railEl.getBoundingClientRect();
      target = clamp01((e.clientX - r.left - RAIL_PAD) / Math.max(1, r.width - RAIL_PAD * 2));
    }
  });
  const endDrag = () => { dragging = null; };
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);
  /* only a gesture that began on the drawing surface or the rail eats the touch */
  document.addEventListener("touchmove", (e) => { if (dragging) e.preventDefault(); }, { passive: false });
  window.addEventListener("wheel", (e) => {
    if (ixOpen) return;
    arm();
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    target = clamp01(target + d * 0.00042);
    e.preventDefault();
  }, { passive: false });
  function keyTravel(e) {
    if (ixOpen) return false;
    const step = (e.shiftKey ? 2 : 0.5) / SPAN;
    let ok = true;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") target = clamp01(target + step);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") target = clamp01(target - step);
    else if (e.key === "PageUp") target = clamp01(target + 4 / SPAN);
    else if (e.key === "PageDown") target = clamp01(target - 4 / SPAN);
    else if (e.key === "Home") target = 0;
    else if (e.key === "End") target = 1;
    else ok = false;
    if (ok) { arm(); e.preventDefault(); }
    return ok;
  }
  railEl.addEventListener("keydown", keyTravel);
  window.addEventListener("keydown", (e) => {
    if (e.target !== document.body && e.target !== document.documentElement) return;
    keyTravel(e);
  });
  /* ── loop ─────────────────────────────────────────────────────────────── */
  let t0 = performance.now(), acc = 0;
  function frame(now) {
    const dt = Math.min((now - t0) / 1000, 0.05);
    t0 = now;
    const t = reduce.matches ? 0 : now / 1000;
    /* alive before anyone touches it: the record drifts past on its own, which is
       also how a visitor learns what the page is for. Stops on first input. */
    if (!touched && !reduce.matches) target = clamp01(target + dt * 0.018);
    pos += (target - pos) * (1 - Math.exp(-dt * (reduce.matches ? 30 : 9)));
    if (Math.abs(target - pos) < 0.00006) pos = target;
    updateCam();
    const f = stepNow();
    if (!reduce.matches) {
      const vis = Math.min(windowSteps, SPAN);
      const lo = camL - vis * 0.35, hi = camL + vis * 1.35;
      for (const s of streaks) {
        s.f += s.spd * dt;
        if (s.f > hi) s.f = lo;
        else if (s.f < lo - vis * 0.4) s.f = hi;
      }
    }
    /* which stop is nearest, and how close */
    let ni = -1, nd = 1e9;
    for (let i = 0; i < NST; i++) { const d = Math.abs(stopF[i] - f); if (d < nd) { nd = d; ni = i; } }
    let lock = 0;
    if (ni >= 0) {
      lock = 1 - smoothstep(win[ni].w1, win[ni].w0, nd);
      if (ni !== shownIdx) showStop(ni);
      const ahead = stopF[ni] - f;
      root.style.setProperty("--dir", ahead >= 0 ? "-1" : "1");
      stopAway.textContent = lock > 0.7 ? (S.here || "")
        : (Math.abs(ahead) < 1.4 ? (S.almost || "")
          : Math.round(Math.abs(ahead)) + " " + STEPW + " " + (ahead > 0 ? (S.ahead || "") : (S.back || "")));
    }
    root.style.setProperty("--k", lock.toFixed(3));
    if (ni >= 0 && lock > 0.4 && FOCUS[ni].idx.length) setLive(FOCUS[ni].idx[0], true);
    else setLive(largestAt(f), false);
    /* passing a stop is the thing that accumulates */
    if (touched && lock > 0.86 && ni >= 0) {
      dwell += dt;
      if (dwell > 0.3 && !passed[ni]) markPassed(ni);
    } else dwell = 0;
    placeHead();
    acc += dt;
    if (acc > 0.06) {
      acc = 0;
      const sv = F0 + f;
      odoStep.textContent = fmtStep(sv);
      const li = largestAt(f);
      leadValue.textContent = SER[li].name + " " + fmtVal(shareOf(li, f)) + USH;
      if (ni >= 0) figNum.textContent = fmtVal(focusValue(ni, f)) + USH;
      for (let gi = 0; gi < GROUPS.length; gi++) {
        gpEls[gi].val.textContent = fmtVal(groupValue(gi, f)) + USH;
        gpEls[gi].swatch.style.background = SC[largestIn(gi, f)].hex;
      }
      railEl.setAttribute("aria-valuenow", fmtStep(sv));
      railEl.setAttribute("aria-valuetext",
        fmtStep(sv) + (ni >= 0 ? " — " + STOPS[ni].title + (passed[ni] ? ", " + (S.crossed || "") : "") : ""));
    }
    draw(t, lock, ni);
    requestAnimationFrame(frame);
  }
  /* ── go ───────────────────────────────────────────────────────────────── */
  /* a point on the axis can be deep-linked: #at=2019 opens there */
  const hm = /at=(-?\d+(?:\.\d+)?)/.exec(location.hash || "");
  if (hm) {
    target = pos = clamp01((Number(hm[1]) - F0) / SPAN);
    touched = true; hintEl.classList.add("gone");
  }
  if (NST) showStop(0);
  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", () => setTimeout(resize, 120));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);
  requestAnimationFrame(frame);
})();
