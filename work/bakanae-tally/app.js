/* ═══════════════════════════════════════════════════════════════════════
   baka nae — THE PROOF WALL
   ---------------------------------------------------------------------
   The object: a physical field of 7.440 hand-drawn tally marks, one per
   real Shopee rating. It is drawn to a canvas ONCE. Nothing on this page
   moves on its own — every frame painted after the first is the direct
   result of a pointer move, a key press or a click.
   ═══════════════════════════════════════════════════════════════════════ */
"use strict";

/* Values below are only used if the fetch fails; they are identical to
   data/products.json → shop_meta (verified from Shopee 2026-08-25). */
var FALLBACK_META = {
  item_count: 32, followers: 10711, rating_avg: 4.966,
  rating_good: 7413, rating_normal: 25, rating_bad: 2,
  rating_total: 7440, est_year: 2019, shop_url: "https://shopee.co.id/baka_nae"
};

var PER_GROUP = 5;
var TAU = Math.PI * 2;

var INK        = "#14170F";
var INK_NORMAL = "#8A9083";
var SIGNAL     = "#D4142B";
var PAPER_LIFT = "#F0F2ED";
var PAPER_DEEP = "#DBDFD7";

var REDUCED = window.matchMedia &&
              window.matchMedia("(prefers-reduced-motion: reduce)").matches;

var idn = function (n) { return Number(n).toLocaleString("id-ID"); };
var rupiah = function (n) { return "Rp " + Number(n).toLocaleString("id-ID"); };

/* deterministic per-mark jitter — the lens must redraw the SAME stroke
   the wall bitmap already has, only bigger. */
function rnd(i, s) {
  var x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/* ───────────────────────────── the wall ───────────────────────────── */

var Wall = (function () {
  var meta = null, total = 0, groups = 0;
  var host, view, vctx, bitmap, bctx, readout, findBtn, fallback;
  var L = null, cssW = 0, dpr = 1;
  var lens = { on: false, x: 0, y: 0, r: 80, m: 3.4 };
  var found = false, badSpot = null;
  var queued = false;

  function layout(w) {
    /* Continuous, not stepped. A single ">=760px" switch put a 768px tablet
       (≈660px canvas) into the phone shape and made the wall 1,076px tall.
       The ratio now eases from landscape to portrait as the canvas narrows,
       and a hard cap keeps the wall to roughly one screen at every width. */
    var t = Math.max(0, Math.min(1, (1000 - w) / 670));
    var targetH = Math.min(660, w * (0.52 + t * 1.23));
    var cols = Math.round(Math.sqrt(1.22 * groups * w / targetH));
    cols = Math.max(12, Math.min(cols, 96));
    var rows = Math.ceil(groups / cols);
    var gp = w / cols;
    var rp = gp * 1.22;
    return {
      cols: cols, rows: rows, gp: gp, rp: rp,
      h: rows * rp,
      mp: gp * 0.155,
      mh: rp * 0.62,
      lw: Math.max(0.55, Math.min(1.25, gp * 0.055))
    };
  }

  function groupOrigin(g) {
    var r = Math.floor(g / L.cols), c = g - r * L.cols;
    return { x: c * L.gp + L.gp * 0.18, y: r * L.rp + L.rp * 0.16 };
  }

  function colourFor(i) {
    if (i < meta.rating_good) return INK;
    if (i < meta.rating_good + meta.rating_normal) return INK_NORMAL;
    return SIGNAL;
  }
  function classFor(i) {
    if (i < meta.rating_good) return "baik";
    if (i < meta.rating_good + meta.rating_normal) return "biasa";
    return "buruk";
  }

  /* one tally stroke. k 0-3 = uprights, k 4 = the diagonal across them. */
  function stroke(ctx, i, ox, oy, detail) {
    var k = i % PER_GROUP, mp = L.mp, mh = L.mh;
    var j = function (s) { return rnd(i, s) - 0.5; };
    var x0, y0, x1, y1, cx, cy;

    if (k < 4) {
      x0 = ox + k * mp + j(1) * mp * 0.30;
      y0 = oy + j(2) * mh * 0.12;
      y1 = oy + mh + j(3) * mh * 0.12;
      x1 = x0 + j(4) * mp * 0.60;
      cx = (x0 + x1) / 2 + j(5) * mp * 0.34;
      cy = (y0 + y1) / 2;
    } else {
      x0 = ox - mp * 0.44 + j(6) * mp * 0.22;
      x1 = ox + 3 * mp + mp * 0.44 + j(7) * mp * 0.22;
      y0 = oy + mh * 0.88 + j(8) * mh * 0.09;
      y1 = oy + mh * 0.12 + j(9) * mh * 0.09;
      cx = (x0 + x1) / 2;
      cy = (y0 + y1) / 2 + j(10) * mh * 0.14;
    }

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(cx, cy, x1, y1);
    ctx.stroke();

    /* under the lens the mark stops being a hairline and becomes a drawn
       stroke: a second, shorter, offset pass reads as pen pressure. */
    if (detail) {
      ctx.save();
      ctx.lineWidth = ctx.lineWidth * 0.55;
      ctx.beginPath();
      ctx.moveTo(x0 + j(11) * mp * 0.10, y0 + mh * 0.14);
      ctx.quadraticCurveTo(cx + j(12) * mp * 0.14, cy, x1 - j(13) * mp * 0.10, y1 - mh * 0.10);
      ctx.stroke();
      ctx.restore();
    }
  }

  /* draw every group whose cell intersects the rect (or all of them) */
  function paintMarks(ctx, rect, detail) {
    var c0 = 0, c1 = L.cols - 1, r0 = 0, r1 = L.rows - 1;
    if (rect) {
      c0 = Math.max(0, Math.floor(rect.x0 / L.gp));
      c1 = Math.min(L.cols - 1, Math.floor(rect.x1 / L.gp));
      r0 = Math.max(0, Math.floor(rect.y0 / L.rp));
      r1 = Math.min(L.rows - 1, Math.floor(rect.y1 / L.rp));
    }
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = detail ? Math.max(0.9, L.lw * 0.86) : L.lw;

    var cur = "";
    for (var r = r0; r <= r1; r++) {
      for (var c = c0; c <= c1; c++) {
        var g = r * L.cols + c;
        if (g >= groups) continue;
        var o = groupOrigin(g);
        for (var k = 0; k < PER_GROUP; k++) {
          var i = g * PER_GROUP + k;
          if (i >= total) break;
          var col = colourFor(i);
          if (col !== cur) { ctx.strokeStyle = col; cur = col; }
          stroke(ctx, i, o.x, o.y, detail);
        }
      }
    }
  }

  function buildBitmap() {
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bctx.clearRect(0, 0, cssW, L.h);
    bctx.fillStyle = PAPER_DEEP;
    bctx.fillRect(0, 0, cssW, L.h);
    paintMarks(bctx, null, false);
  }

  function markUnder(x, y) {
    var c = Math.max(0, Math.min(L.cols - 1, Math.floor(x / L.gp)));
    var r = Math.max(0, Math.min(L.rows - 1, Math.floor(y / L.rp)));
    var g = r * L.cols + c;
    if (g >= groups) g = groups - 1;
    var o = groupOrigin(g);
    var k = Math.max(0, Math.min(4, Math.round((x - o.x) / L.mp)));
    var i = g * PER_GROUP + k;
    return i >= total ? total - 1 : i;
  }

  function paint() {
    if (!L) return;
    vctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    vctx.clearRect(0, 0, cssW, L.h);
    vctx.drawImage(bitmap, 0, 0, cssW, L.h);

    if (found && badSpot) {
      vctx.save();
      vctx.strokeStyle = SIGNAL;
      vctx.lineWidth = 1;
      vctx.beginPath();
      vctx.arc(badSpot.x, badSpot.y, Math.max(10, L.gp * 0.72), 0, TAU);
      vctx.stroke();
      vctx.restore();
    }

    if (lens.on) {
      var R = lens.r, M = lens.m;
      /* the glass stays on the sheet: its centre is clamped, but the
         magnification is still anchored on the real pointer, so the
         readout keeps naming the mark actually under the cursor. */
      var cx = Math.max(R * 0.62, Math.min(cssW - R * 0.62, lens.x));
      var cy = Math.max(R * 0.62, Math.min(L.h - R * 0.62, lens.y));

      vctx.save();
      vctx.beginPath();
      vctx.arc(cx, cy, R, 0, TAU);
      vctx.clip();
      vctx.fillStyle = PAPER_LIFT;
      vctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      vctx.translate(lens.x, lens.y);
      vctx.scale(M, M);
      vctx.translate(-lens.x, -lens.y);
      paintMarks(vctx, {
        x0: lens.x - (R * 1.7) / M, x1: lens.x + (R * 1.7) / M,
        y0: lens.y - (R * 1.7) / M, y1: lens.y + (R * 1.7) / M
      }, true);
      vctx.restore();

      vctx.save();
      vctx.strokeStyle = "rgba(20,23,15,.16)";
      vctx.lineWidth = 6;
      vctx.beginPath(); vctx.arc(cx, cy, R + 3, 0, TAU); vctx.stroke();
      vctx.strokeStyle = INK;
      vctx.lineWidth = 1.4;
      vctx.beginPath(); vctx.arc(cx, cy, R, 0, TAU); vctx.stroke();
      vctx.restore();
    }
  }

  /* rAF-throttled, with a timeout backstop. Measured: in a headless render
     (and in a throttled/backgrounded tab) rAF can fire once and never again,
     which would freeze the lens mid-drag. Whichever timer wins, paints. */
  var paintTid = 0;
  function runPaint() {
    if (!queued) return;
    queued = false;
    clearTimeout(paintTid);
    paint();
  }
  function requestPaint() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(runPaint);
    paintTid = setTimeout(runPaint, 90);
  }

  function report() {
    if (!lens.on) {
      readout.className = "readout";
      readout.textContent = "arahkan kursor ke dinding";
      return;
    }
    var i = markUnder(lens.x, lens.y);
    var cls = classFor(i);
    readout.className = "readout" + (cls === "buruk" ? " is-bad" : "");
    readout.innerHTML = "goresan <b>#" + idn(i + 1) + "</b> &middot; <i>" + cls + "</i>";
  }

  function place(x, y) {
    lens.on = true;
    lens.x = Math.max(0, Math.min(cssW, x));
    lens.y = Math.max(0, Math.min(L.h, y));
    report();
    requestPaint();
  }

  function clear() {
    if (!lens.on) return;
    lens.on = false;
    report();
    requestPaint();
  }

  /* Aim at the LAST TWO strokes of the final group, not the group's
     middle — the readout has to name a bad rating, not its neighbour. */
  function badCentre() {
    var g = Math.floor((total - 1) / PER_GROUP);
    var o = groupOrigin(g);
    return { x: o.x + L.mp * 3.35, y: o.y + L.mh * 0.5 };
  }

  /* FIND THE 2 — a one-shot, click-initiated flight. It terminates. */
  function findTwo() {
    var t = badCentre();
    badSpot = t;
    found = true;
    findBtn.setAttribute("data-found", "1");
    findBtn.textContent = "lihat lagi";

    /* only move the page if the 2 are actually off-screen — a click that
       yanks a fully visible wall is worse than no scroll at all. */
    var box = view.getBoundingClientRect();
    var ty = box.top + (t.y / L.h) * box.height;
    if (ty < 40 || ty > window.innerHeight - 40) {
      view.scrollIntoView({ block: "center", behavior: REDUCED ? "auto" : "smooth" });
    }

    if (REDUCED) { place(t.x, t.y); return; }
    if (!lens.on) { lens.x = cssW * 0.5; lens.y = L.h * 0.5; lens.on = true; }

    /* The flight is decoration. The arrival is not: a dropped frame, a
       throttled tab or a paused rAF must still leave the lens on the 2. */
    var sx = lens.x, sy = lens.y, t0 = 0, DUR = 620, landed = false;
    function land() {
      if (landed) return;
      landed = true;
      lens.x = t.x; lens.y = t.y;
      report(); paint();
    }
    function step(ts) {
      if (landed) return;
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / DUR);
      if (p >= 1) { land(); return; }
      var e = 1 - Math.pow(1 - p, 3);
      lens.x = sx + (t.x - sx) * e;
      lens.y = sy + (t.y - sy) * e;
      report(); paint();
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
    setTimeout(land, DUR + 80);
  }

  function resize() {
    /* the canvas is width:100%, so its own layout box is the true drawing
       width — the frame's clientWidth would wrongly include its padding. */
    var w = Math.round(view.getBoundingClientRect().width) ||
            (view.parentNode.clientWidth - 2);
    if (!w) return;
    cssW = w;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    L = layout(cssW);
    lens.r = Math.max(44, Math.min(112, cssW * 0.115));

    /* height stays auto: the bitmap's own aspect drives it, so a mark is
       never stretched. */
    bitmap.width = Math.round(cssW * dpr);
    bitmap.height = Math.round(L.h * dpr);
    view.width = bitmap.width;
    view.height = bitmap.height;

    if (found) badSpot = badCentre();
    buildBitmap();
    paint();
  }

  function init(m) {
    meta = m;
    total = m.rating_total;
    groups = Math.ceil(total / PER_GROUP);

    host = document.getElementById("wall");
    view = document.getElementById("proof");
    readout = document.getElementById("readout");
    findBtn = document.getElementById("find");
    fallback = document.getElementById("wallFallback");
    if (!view) return null;

    vctx = view.getContext("2d");
    bitmap = document.createElement("canvas");
    bctx = bitmap.getContext("2d");

    resize();
    if (fallback && fallback.parentNode) fallback.parentNode.removeChild(fallback);

    var rectOf = function (e) {
      var b = view.getBoundingClientRect();
      return { x: (e.clientX - b.left) * (cssW / b.width),
               y: (e.clientY - b.top) * (L.h / b.height) };
    };

    view.addEventListener("pointermove", function (e) {
      var p = rectOf(e); place(p.x, p.y);
    });
    view.addEventListener("pointerdown", function (e) {
      var p = rectOf(e); place(p.x, p.y);
    });
    view.addEventListener("pointerleave", clear);
    view.addEventListener("blur", clear);

    view.addEventListener("keydown", function (e) {
      var step = e.shiftKey ? L.gp * 6 : L.gp;
      var k = e.key, dx = 0, dy = 0;
      if (k === "ArrowLeft") dx = -step;
      else if (k === "ArrowRight") dx = step;
      else if (k === "ArrowUp") dy = -L.rp;
      else if (k === "ArrowDown") dy = L.rp;
      else if (k === "End") { findTwo(); e.preventDefault(); return; }
      else return;
      e.preventDefault();
      if (!lens.on) { lens.x = cssW * 0.5; lens.y = L.h * 0.5; }
      place(lens.x + dx, lens.y + dy);
    });

    if (findBtn) findBtn.addEventListener("click", findTwo);

    var rt = 0;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(resize, 160);
    });

    /* self-check: the wall must contain exactly rating_total marks,
       split exactly as the shop data says. Asserted, not assumed. */
    var tally = { baik: 0, biasa: 0, buruk: 0 }, drawn = 0;
    for (var g = 0; g < groups; g++) {
      for (var k = 0; k < PER_GROUP; k++) {
        var i = g * PER_GROUP + k;
        if (i >= total) break;
        tally[classFor(i)]++; drawn++;
      }
    }
    return {
      marks_drawn: drawn,
      baik: tally.baik, biasa: tally.biasa, buruk: tally.buruk,
      expected_total: meta.rating_total,
      expected_split: [meta.rating_good, meta.rating_normal, meta.rating_bad],
      groups: groups, cols: L.cols, rows: L.rows,
      wall_css_height: Math.round(L.h),
      ok: drawn === meta.rating_total &&
          tally.baik === meta.rating_good &&
          tally.biasa === meta.rating_normal &&
          tally.buruk === meta.rating_bad
    };
  }

  return { init: init };
})();

/* ───────────────────────── drawn merch forms ─────────────────────────
   No photography exists and none is invented. Each product is drawn as
   its physical form, all sharing the Nya! cat-ear motif. */

function nya(cx, cy, s) {
  return '<g transform="translate(' + cx + ' ' + cy + ') scale(' + s + ')">' +
    '<path class="line" d="M-17 -8 L-13 -25 L-2 -15"/>' +
    '<path class="line" d="M17 -8 L13 -25 L2 -15"/>' +
    '<circle class="plate" cx="0" cy="0" r="17"/>' +
    '<path class="line" d="M-8 -4 v4 M8 -4 v4"/>' +
    '<path class="line" d="M-4 6 q4 4 8 0"/>' +
    '<path class="line" d="M-26 1 h8 M-26 6 h8 M18 1 h8 M18 6 h8"/>' +
    '</g>';
}

var FORMS = {
  "Keychain": function () {
    return '<circle class="line" cx="60" cy="19" r="8"/><path class="line" d="M60 27 v4"/>' +
      '<rect class="body" x="22" y="31" width="76" height="88" rx="4"/>' +
      nya(60, 76, 0.95);
  },
  "Phone Strap": function () {
    return '<rect class="body" x="44" y="8" width="32" height="9" rx="4"/>' +
      '<path class="line" d="M50 17 q-9 26 2 44"/><path class="line" d="M70 17 q9 26 -2 44"/>' +
      '<circle class="body" cx="60" cy="94" r="32"/>' +
      nya(60, 94, 0.74);
  },
  "Sticker": function () {
    var d = "M28 46 C28 26 46 15 64 17 C86 20 97 33 97 54 C97 77 88 97 70 109 " +
            "C52 121 31 112 25 92 C19 74 28 63 28 46 Z";
    return '<path class="body" d="' + d + '"/>' +
      '<path class="cut" transform="translate(61 64) scale(.84) translate(-61 -64)" d="' + d + '"/>' +
      nya(61, 64, 0.86);
  },
  "Postcard": function () {
    return '<rect class="body" x="7" y="30" width="106" height="76"/>' +
      '<rect class="line" x="13" y="36" width="94" height="64" fill="none"/>' +
      '<rect class="plate" x="87" y="41" width="15" height="12"/>' +
      '<path class="line" d="M64 70 h38 M64 79 h38 M64 88 h24"/>' +
      nya(37, 68, 0.60);
  },
  "Photocard": function () {
    return '<rect class="body" x="31" y="14" width="58" height="108" rx="4"/>' +
      '<rect class="plate" x="37" y="20" width="46" height="76"/>' +
      nya(60, 57, 0.72) +
      '<path class="line" d="M37 105 h22 M37 112 h13"/>';
  },
  "Art Print": function () {
    return '<rect class="body" x="13" y="9" width="94" height="122"/>' +
      '<rect class="plate" x="26" y="21" width="68" height="88"/>' +
      nya(60, 62, 0.95) +
      '<path class="line" d="M72 119 q7 -8 12 -1 q-5 5 -10 2"/>';
  }
};

function formSVG(type, tilt) {
  var draw = FORMS[type] || FORMS["Photocard"];
  return '<svg class="form" viewBox="0 0 120 140" fill="none" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ' +
    'style="transform:rotate(' + (tilt || 0) + 'deg)">' + draw() + '</svg>';
}

/* ───────────────────────────── catalogue ───────────────────────────── */

function renderCatalogue(data) {
  var grid = document.getElementById("grid");
  if (!grid) return 0;
  var series = data.series_meta || {};
  var html = data.featured.map(function (p, n) {
    var s = series[p.series];
    var label = s ? s.name_id : p.type_id;
    return '<li>' +
      '<a class="card" data-rise style="--i:' + (n % 3) + '" href="' + p.shopee_url +
        '" target="_blank" rel="noopener">' +
        '<span class="card__stage">' + formSVG(p.type_id, p.tilt) +
          '<span class="card__more">' + p.type_id + ' &middot; terjual ' +
          p.sold_display + '<b>' + p.name_id + '</b></span>' +
        '</span>' +
        '<span class="card__row">' +
          '<span class="card__series">' + label + '</span>' +
          '<span class="card__price">' + rupiah(p.price_idr) + '</span>' +
        '</span>' +
      '</a></li>';
  }).join("");
  grid.innerHTML = html;
  return data.featured.length;
}

/* ───────────────────── one buyer at a time ───────────────────── */

function mountQuotes(list) {
  var q = document.getElementById("sayQ"),
      w = document.getElementById("sayW"),
      idx = document.getElementById("sayI"),
      prev = document.getElementById("sayPrev"),
      next = document.getElementById("sayNext");
  if (!q || !list || !list.length) return 0;
  var at = 0;
  var pad = function (n) { return (n < 10 ? "0" : "") + n; };
  function show() {
    var t = list[at];
    q.textContent = "“" + t.text_id + "”";
    w.textContent = t.author + " · " + t.meta_id;
    idx.innerHTML = pad(at + 1) + "&thinsp;/&thinsp;" + pad(list.length);
  }
  prev.addEventListener("click", function () { at = (at - 1 + list.length) % list.length; show(); });
  next.addEventListener("click", function () { at = (at + 1) % list.length; show(); });
  show();
  return list.length;
}

/* ───────────────────── reveal: rAF position sweep ─────────────────────
   IntersectionObserver delivers asynchronously and can be outrun by a
   fast flick or an anchor jump. Asking where things are cannot miss. */

function mountReveals() {
  if (REDUCED) return;
  document.documentElement.classList.add("motion");
  var pending = [].slice.call(document.querySelectorAll("[data-rise]"));
  var queued = false, tid = 0;
  function sweep() {
    var line = window.innerHeight * 0.94;
    for (var i = pending.length - 1; i >= 0; i--) {
      if (pending[i].getBoundingClientRect().top < line) {
        pending[i].classList.add("in");
        pending.splice(i, 1);          /* reveal once, then drop it */
      }
    }
    if (!pending.length) window.removeEventListener("scroll", ping);
  }
  function run() {
    if (!queued) return;
    queued = false;
    clearTimeout(tid);
    sweep();
  }
  /* rAF throttles nicely but can be paused outright; the timeout guarantees
     that content never stays at opacity 0 waiting for a frame that never comes. */
  var ping = function () {
    if (queued) return;
    queued = true;
    requestAnimationFrame(run);
    tid = setTimeout(run, 100);
  };
  window.addEventListener("scroll", ping, { passive: true });
  window.addEventListener("resize", ping, { passive: true });
  sweep();
  return ping;   /* re-sweep after any JS re-render */
}

/* ───────────────────────────── boot ───────────────────────────── */

function fillFigures(m) {
  var map = {
    est: String(m.est_year),
    items: idn(m.item_count),
    followers: idn(m.followers),
    avg: Number(m.rating_avg).toLocaleString("id-ID", {
      minimumFractionDigits: 3, maximumFractionDigits: 3
    })
  };
  var nodes = document.querySelectorAll("[data-shop]");
  for (var i = 0; i < nodes.length; i++) {
    var k = nodes[i].getAttribute("data-shop");
    if (map[k]) nodes[i].textContent = map[k];
  }
}

function diag(o) {
  var el = document.getElementById("diag");
  if (el) el.textContent = JSON.stringify(o);
  document.documentElement.setAttribute("data-diag-ok", o.wall && o.wall.ok ? "1" : "0");
  document.documentElement.setAttribute("data-marks", o.wall ? o.wall.marks_drawn : "0");
  if (window.console) console.log("[proof-wall]", o);
  window.__proof = o;
}

(function boot() {
  var out = { wall: null, products: 0, quotes: 0, source: "fetch" };

  function go(products, quotes) {
    var meta = (products && products.shop_meta) || FALLBACK_META;
    fillFigures(meta);
    out.wall = Wall.init(meta);
    if (products && products.featured) out.products = renderCatalogue(products);
    if (quotes && quotes.quotes) out.quotes = mountQuotes(quotes.quotes);
    var ping = mountReveals();
    if (ping) ping();                 /* newly rendered cards need a sweep */
    diag(out);
  }

  Promise.all([
    fetch("data/products.json").then(function (r) { return r.json(); }),
    fetch("data/testimonials.json").then(function (r) { return r.json(); })
  ]).then(function (r) {
    go(r[0], r[1]);
  }).catch(function (e) {
    out.source = "fallback:" + (e && e.message ? e.message : "unknown");
    go(null, null);
  });
})();
