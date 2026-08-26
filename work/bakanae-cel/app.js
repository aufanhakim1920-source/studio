/* =============================================================
   baka nae. — "cel"
   THE OBJECT: a light table with registered animation cels.

   Everything drawn here is CSS/SVG. There is no product photography and
   assets/ is empty, so the cels ARE the drawings — which is what the
   object is for.

   MOTION CONTRACT (hard rule — Aufan gets motion sick from ambient movement):
   there is no setInterval, no rAF loop, no @keyframes anywhere in this
   build. Every rAF used below is a ONE-SHOT with a setTimeout backstop,
   because rAF fires exactly once under Chrome's --virtual-time-budget and
   an un-backstopped sequence silently commits its START state.
   ============================================================= */
(function () {
  "use strict";

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- the artist's palette. these five and nothing else. ---------- */
  var INK = "#5C3F12", DARKYELLOW = "#7A5518", LIGHTYELLOW = "#FBEFC0", WHITE = "#FFFFFF";

  /* Drawing fills are MIXES OF TWO OF THOSE FIVE (or of a series hue, which
     products.json already regenerated on-palette). No new colour is invented. */
  function hx(h) { h = h.replace("#", ""); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function mix(a, b, t) {
    var A = hx(a), B = hx(b), o = "#";
    for (var i = 0; i < 3; i++) {
      var v = Math.round(A[i] + (B[i] - A[i]) * t).toString(16);
      o += v.length < 2 ? "0" + v : v;
    }
    return o;
  }

  /* ---------- id-ID number formatting ---------- */
  var fmtInt = function (n) { return Math.round(n).toLocaleString("id-ID"); };
  var fmt2 = function (n) { return n.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var rupiah = function (n) { return "Rp " + fmtInt(n); };

  /* =============================================================
     THE DRAWING — one cat-eared mark, reskinned per series and per format.
     viewBox 0 0 320 400. Head: cx160 cy190 rx76 ry84.
     ============================================================= */
  var HEAD = { cx: 160, cy: 190, rx: 76, ry: 84 };

  var SERIES_LOOK = {
    aot:     { teeth: 7,  tip: 40, back: "bob",  spikes: 0,  spikeLen: 0,  eye: "sharp", band: false },
    haikyuu: { teeth: 6,  tip: 30, back: "crop", spikes: 7,  spikeLen: 32, eye: "round", band: false },
    bnha:    { teeth: 9,  tip: 44, back: "crop", spikes: 9,  spikeLen: 24, eye: "round", band: false },
    mtp:     { teeth: 5,  tip: 50, back: "long", spikes: 0,  spikeLen: 0,  eye: "sharp", band: false },
    jjk:     { teeth: 8,  tip: 34, back: "crop", spikes: 8,  spikeLen: 28, eye: "sharp", band: true  },
    drstone: { teeth: 6,  tip: 26, back: "crop", spikes: 11, spikeLen: 46, eye: "round", band: false }
  };

  function onHead(deg, scale) {
    var a = deg * Math.PI / 180, s = scale == null ? 1 : scale;
    return [HEAD.cx + HEAD.rx * s * Math.cos(a), HEAD.cy + HEAD.ry * s * Math.sin(a)];
  }

  function fringePath(look) {
    var n = look.teeth, x0 = 236, w = 152;
    var d = "M 84 190 A 76 84 0 0 1 236 190";
    for (var i = 0; i < n; i++) {
      var xTip = x0 - (i + 0.5) * (w / n);
      var xRoot = x0 - (i + 1) * (w / n);
      d += " L " + xTip.toFixed(1) + " " + (138 + look.tip).toFixed(1);
      d += " L " + xRoot.toFixed(1) + " " + (i === n - 1 ? "190" : "140");
    }
    return d + " Z";
  }

  function spikePath(look) {
    if (!look.spikes) return "";
    var d = "";
    for (var k = 0; k < look.spikes; k++) {
      var deg = -172 + (k + 0.5) * (164 / look.spikes);
      var half = 82 / look.spikes;
      var p1 = onHead(deg - half, 0.99);
      var p2 = onHead(deg + half, 0.99);
      var tip = onHead(deg + half * 0.9, 1 + look.spikeLen / 78);
      d += " M " + p1[0].toFixed(1) + " " + p1[1].toFixed(1) +
           " L " + tip[0].toFixed(1) + " " + tip[1].toFixed(1) +
           " L " + p2[0].toFixed(1) + " " + p2[1].toFixed(1) + " Z";
    }
    return d.trim();
  }

  function backPath(look) {
    if (look.back === "long") {
      return "M 160 92 C 86 92 62 148 66 212 C 70 282 72 322 82 356 L 238 356 C 248 322 250 282 254 212 C 258 148 234 92 160 92 Z";
    }
    if (look.back === "bob") {
      return "M 160 94 C 88 94 62 148 64 206 C 66 254 72 280 80 300 L 240 300 C 248 280 254 254 256 206 C 258 148 232 94 160 94 Z";
    }
    return "M 160 98 C 96 98 74 146 76 200 C 77 236 84 262 92 280 L 228 280 C 236 262 243 236 244 200 C 246 146 224 98 160 98 Z";
  }

  var EYE = { L: 130, R: 190, y: 214 };

  function eyeShape(cx, look) {
    if (look.eye === "round") {
      return '<ellipse cx="' + cx + '" cy="' + EYE.y + '" rx="13" ry="16.5"/>';
    }
    return '<path d="M ' + (cx - 15) + ' ' + (EYE.y - 1) +
           ' Q ' + cx + ' ' + (EYE.y - 19) + ' ' + (cx + 15) + ' ' + (EYE.y - 4) +
           ' Q ' + cx + ' ' + (EYE.y + 15) + ' ' + (cx - 15) + ' ' + (EYE.y - 1) + ' Z"/>';
  }

  /* ---------- the product FORMAT, drawn as line work on the garis cel ---------- */
  function formatLines(type) {
    var s = 'fill="none" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
    switch (type) {
      case "Keychain":
        return '<g ' + s + '>' +
          '<circle cx="160" cy="26" r="14"/>' +
          '<path d="M 160 40 L 160 56"/>' +
          '<rect x="44" y="56" width="232" height="316" rx="30"/>' +
          '</g>';
      case "Phone Strap":
        return '<g ' + s + '>' +
          '<path d="M 160 8 C 118 22 106 40 122 54 C 138 68 182 68 198 54 C 214 40 202 22 160 8 Z"/>' +
          '<rect x="146" y="54" width="28" height="16" rx="5"/>' +
          '<path d="M 152 70 L 148 96 M 160 70 L 160 98 M 168 70 L 172 96"/>' +
          '<rect x="50" y="98" width="220" height="278" rx="18"/>' +
          '</g>';
      case "Sticker":
        return '<g fill="none" stroke="' + INK + '" stroke-width="3.5" stroke-dasharray="9 7" stroke-linecap="round">' +
          '<path d="M 160 18 C 258 18 302 76 302 196 C 302 316 258 382 160 382 C 62 382 18 316 18 196 C 18 76 62 18 160 18 Z"/>' +
          '</g>';
      case "Postcard":
        return '<g ' + s + '>' +
          '<rect x="12" y="12" width="296" height="376"/>' +
          '<rect x="238" y="28" width="54" height="64"/>' +
          '<path d="M 238 340 L 300 340 M 238 356 L 300 356 M 238 372 L 276 372"/>' +
          '</g>';
      case "Photocard":
        return '<g ' + s + '>' +
          '<rect x="16" y="16" width="288" height="368" rx="14"/>' +
          '<path d="M 30 356 L 66 320 M 52 356 L 88 320 M 74 356 L 110 320" stroke-width="2"/>' +
          '</g>';
      case "Art Print":
        return '<g ' + s + '>' +
          '<rect x="20" y="20" width="280" height="360"/>' +
          '<path d="M 20 52 L 4 52 M 52 20 L 52 4 M 300 52 L 316 52 M 268 20 L 268 4 ' +
          'M 20 348 L 4 348 M 52 380 L 52 396 M 300 348 L 316 348 M 268 380 L 268 396" stroke-width="2"/>' +
          '</g>';
      default:
        return '<g ' + s + '><rect x="20" y="20" width="280" height="360"/></g>';
    }
  }

  /* ---------- the four layers ---------- */
  function layerLatar(hue) {
    var halo = "rgba(255,255,255,.52)";
    var star = function (x, y, r) {
      return '<path d="M ' + x + ' ' + (y - r) + ' Q ' + x + ' ' + y + ' ' + (x + r) + ' ' + y +
             ' Q ' + x + ' ' + y + ' ' + x + ' ' + (y + r) +
             ' Q ' + x + ' ' + y + ' ' + (x - r) + ' ' + y +
             ' Q ' + x + ' ' + y + ' ' + x + ' ' + (y - r) + ' Z" fill="' + WHITE + '" opacity=".8"/>';
    };
    return '<rect width="320" height="400" fill="' + hue + '"/>' +
      '<circle cx="160" cy="204" r="132" fill="' + halo + '"/>' +
      '<path d="M 0 322 L 320 296 L 320 400 L 0 400 Z" fill="' + mix(hue, INK, 0.14) + '" opacity=".55"/>' +
      star(48, 86, 17) + star(276, 132, 13) + star(258, 62, 9) + star(64, 296, 11);
  }

  function layerWarna(hue, look) {
    var hair = mix(hue, INK, 0.54);
    var collar = mix(hue, WHITE, 0.58);
    var blush = mix(hue, DARKYELLOW, 0.38);
    var o = "";
    o += '<path d="' + backPath(look) + '" fill="' + hair + '"/>';
    o += '<path d="M 96 296 L 224 296 L 246 384 L 74 384 Z" fill="' + collar + '"/>';
    o += '<ellipse cx="160" cy="190" rx="76" ry="84" fill="' + WHITE + '"/>';
    if (look.spikes) o += '<path d="' + spikePath(look) + '" fill="' + hair + '"/>';
    o += '<path d="' + fringePath(look) + '" fill="' + hair + '"/>';
    o += '<ellipse cx="112" cy="238" rx="15" ry="7.5" fill="' + blush + '" opacity=".8"/>';
    o += '<ellipse cx="208" cy="238" rx="15" ry="7.5" fill="' + blush + '" opacity=".8"/>';
    if (look.band) o += '<path d="M 88 150 L 232 150 L 232 168 L 88 168 Z" fill="' + mix(hue, INK, 0.72) + '"/>';
    return o;
  }

  function layerGaris(type, look) {
    var st = 'fill="none" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"';
    var o = "";
    o += '<g ' + st + '>';
    o += '<path d="' + backPath(look) + '"/>';
    o += '<ellipse cx="160" cy="190" rx="76" ry="84"/>';
    if (look.spikes) o += '<path d="' + spikePath(look) + '"/>';
    o += '<path d="' + fringePath(look) + '"/>';
    o += '<path d="M 96 296 L 224 296 L 246 384 M 96 296 L 74 384"/>';
    o += '<path d="M 138 296 Q 160 322 182 296"/>';
    o += '</g>';
    /* eyes: filled ink — the darkest value on the sheet, so the face reads in greyscale */
    o += '<g fill="' + INK + '">' + eyeShape(EYE.L, look) + eyeShape(EYE.R, look) + '</g>';
    o += '<g fill="' + WHITE + '"><circle cx="' + (EYE.L - 4) + '" cy="' + (EYE.y - 6) + '" r="4.6"/>' +
         '<circle cx="' + (EYE.R - 4) + '" cy="' + (EYE.y - 6) + '" r="4.6"/>' +
         '<circle cx="' + (EYE.L + 6) + '" cy="' + (EYE.y + 6) + '" r="2.2"/>' +
         '<circle cx="' + (EYE.R + 6) + '" cy="' + (EYE.y + 6) + '" r="2.2"/></g>';
    o += '<g fill="none" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round">' +
         '<path d="M 116 188 Q 130 181 145 187"/><path d="M 175 187 Q 190 181 204 188"/>' +
         '<path d="M 150 246 Q 160 256 170 246"/></g>';
    o += formatLines(type);
    return o;
  }

  function layerTelinga(hue) {
    var fill = mix(hue, WHITE, 0.3);
    var o = "";
    o += '<g fill="' + fill + '" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round">' +
         '<path d="M 102 136 L 96 52 L 137 110 Z"/>' +
         '<path d="M 218 136 L 224 52 L 183 110 Z"/></g>';
    o += '<g fill="' + LIGHTYELLOW + '">' +
         '<path d="M 106.2 119.8 L 102.9 73.7 L 124.9 105.5 Z"/>' +
         '<path d="M 213.8 119.8 L 217.1 73.7 L 195.1 105.5 Z"/></g>';
    o += '<g fill="none" stroke="' + INK + '" stroke-width="2.8" stroke-linecap="round">' +
         '<path d="M 46 216 L 90 224 M 42 234 L 88 236 M 46 252 L 90 246"/>' +
         '<path d="M 274 216 L 230 224 M 278 234 L 232 236 M 274 252 L 230 246"/></g>';
    /* drawn twice — a light-yellow halo underneath keeps it legible where it
       crosses the collar, without introducing a colour that is not hers */
    var nya = 'x="228" y="360" font-family="Instrument Serif, Georgia, serif" font-style="italic" font-size="40"';
    o += '<text ' + nya + ' fill="none" stroke="' + LIGHTYELLOW + '" stroke-width="7" stroke-linejoin="round">Nya!</text>';
    o += '<text ' + nya + ' fill="' + INK + '">Nya!</text>';
    return o;
  }

  var LAYERS = [
    { key: "latar",   label: "01 Latar" },
    { key: "warna",   label: "02 Warna" },
    { key: "garis",   label: "03 Garis" },
    { key: "telinga", label: "04 Telinga" }
  ];

  function layerBody(key, hue, look, type) {
    if (key === "latar") return layerLatar(hue);
    if (key === "warna") return layerWarna(hue, look);
    if (key === "garis") return layerGaris(type, look);
    return layerTelinga(hue);
  }

  function svgWrap(inner, cls) {
    return '<svg class="' + (cls || "") + '" viewBox="0 0 320 400" xmlns="http://www.w3.org/2000/svg" ' +
      'preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">' + inner + '</svg>';
  }

  function look(p) { return SERIES_LOOK[p.series] || SERIES_LOOK.aot; }
  function hueOf(p) { return (SERIES[p.series] && SERIES[p.series].hue) || "#D2C3EA"; }

  function composite(p, withEars) {
    var h = hueOf(p), lk = look(p), o = "";
    o += layerLatar(h) + layerWarna(h, lk) + layerGaris(p.type_id, lk);
    if (withEars !== false) o += layerTelinga(h);
    return o;
  }

  /* =============================================================
     STATE + WIRING
     ============================================================= */
  var PRODUCTS = [], SERIES = {}, SHOP = {}, idx = 0, nyaOn = true;

  var $ = function (s) { return document.querySelector(s); };
  var stage = $("#stage"), celsEl = $("#cels"), rackEl = $("#rack");
  var spreadEl = $("#spread"), lampEl = $("#lamp"), nyaEl = $("#nya");

  function setVar(name, v) { stage.style.setProperty(name, v); }

  /* ---------- build the stack for the current product ---------- */
  function loadStack() {
    var p = PRODUCTS[idx];
    if (!p) return;
    var h = hueOf(p), lk = look(p);
    var html = "";
    for (var i = 0; i < LAYERS.length; i++) {
      var L = LAYERS[i];
      html += '<div class="cel" data-layer="' + L.key + '" style="--i:' + i + '">' +
        '<div class="cel-sheet">' +
        svgWrap(layerBody(L.key, h, lk, p.type_id), "cel-art") +
        '<span class="cel-label">' + L.label + '</span>' +
        '<span class="cel-punch" aria-hidden="true"><i></i><i></i><i></i></span>' +
        '</div></div>';
    }
    celsEl.innerHTML = html;

    var sName = (SERIES[p.series] && SERIES[p.series].name_id) || p.name_id;
    $("#celCaption").innerHTML = nyaOn
      ? sName + ' <em>Nya! ver.</em>'
      : sName;
    $("#tagType").textContent = p.type_id;
    $("#tagSold").textContent = "terjual " + p.sold_display;
    $("#tagPrice").textContent = rupiah(p.price_idr);
    $("#tagBuy").href = p.shopee_url;
    $("#frameNo").textContent = String(idx + 1).padStart(2, "0");

    var kids = rackEl.children;
    for (var k = 0; k < kids.length; k++) {
      kids[k].setAttribute("aria-current", k === idx ? "true" : "false");
    }
  }

  function setNya(on) {
    nyaOn = on;
    setVar("--nya-off", on ? "0" : "1");
    nyaEl.setAttribute("aria-pressed", on ? "true" : "false");
    var p = PRODUCTS[idx];
    if (!p) return;
    var sName = (SERIES[p.series] && SERIES[p.series].name_id) || p.name_id;
    $("#celCaption").innerHTML = on ? sName + ' <em>Nya! ver.</em>' : sName;
    $("#stageHint").textContent = on
      ? "Seret kacanya untuk merenggangkan lapisan."
      : "Lapis telinga diangkat dari peg — tinggal karakternya.";
  }

  function go(n) {
    idx = (n + PRODUCTS.length) % PRODUCTS.length;
    loadStack();
  }

  /* ---------- the rack ---------- */
  function buildRack() {
    var html = "";
    for (var i = 0; i < PRODUCTS.length; i++) {
      var p = PRODUCTS[i];
      html += '<button class="rack-cel" type="button" data-i="' + i + '" ' +
        'style="--tilt:' + (p.tilt || 0) + 'deg" ' +
        'aria-current="' + (i === 0 ? "true" : "false") + '" ' +
        'aria-label="' + p.name_id.replace(/"/g, "&quot;") + ' — ' + rupiah(p.price_idr) + '. Taruh di meja.">' +
        svgWrap(composite(p, true)) + '</button>';
    }
    rackEl.innerHTML = html;
    rackEl.addEventListener("click", function (e) {
      var b = e.target.closest(".rack-cel");
      if (!b) return;
      go(parseInt(b.dataset.i, 10));
      stage.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "center" });
    });
  }

  /* ---------- controls ---------- */
  function wire() {
    spreadEl.addEventListener("input", function () { setVar("--spread", (this.value / 100).toFixed(3)); });
    lampEl.addEventListener("input", function () { setVar("--lamp", (this.value / 100).toFixed(3)); });
    nyaEl.addEventListener("click", function () { setNya(!nyaOn); });
    $("#prev").addEventListener("click", function () { go(idx - 1); });
    $("#next").addEventListener("click", function () { go(idx + 1); });

    /* drag the stack apart in Z — the primary mechanic */
    var table = $("#table"), dragging = false, x0 = 0, s0 = 0;
    table.addEventListener("pointerdown", function (e) {
      dragging = true; x0 = e.clientX; s0 = parseFloat(spreadEl.value);
      table.classList.add("dragging");
      try { table.setPointerCapture(e.pointerId); } catch (err) {}
    });
    table.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var v = Math.max(0, Math.min(100, s0 + (e.clientX - x0) * 0.42));
      spreadEl.value = v;
      setVar("--spread", (v / 100).toFixed(3));
    });
    var end = function () { dragging = false; table.classList.remove("dragging"); };
    table.addEventListener("pointerup", end);
    table.addEventListener("pointercancel", end);

    /* pointer parallax on the stage. user-driven only — it returns to rest
       the moment the pointer leaves, and never moves by itself. */
    if (!REDUCED && window.matchMedia("(pointer:fine)").matches) {
      stage.addEventListener("pointermove", function (e) {
        if (dragging) return;
        var r = stage.getBoundingClientRect();
        var nx = (e.clientX - r.left) / r.width - 0.5;
        var ny = (e.clientY - r.top) / r.height - 0.5;
        setVar("--tilty", (nx * 11).toFixed(2) + "deg");
        setVar("--tiltx", (14 - ny * 9).toFixed(2) + "deg");
      });
      stage.addEventListener("pointerleave", function () {
        setVar("--tilty", "0deg"); setVar("--tiltx", "14deg");
      });
    }
  }

  /* ---------- testimonials: LABELLED example copy, never dressed as real ---------- */
  function buildContoh(quotes) {
    var el = $("#contoh"); if (!el) return;
    var html = "";
    for (var i = 0; i < Math.min(2, quotes.length); i++) {
      var q = quotes[i];
      html += '<figure class="contoh-card">' +
        '<blockquote>&ldquo;' + q.text_id + '&rdquo;</blockquote>' +
        '<figcaption>Contoh · nama karangan &ldquo;' + q.author + '&rdquo;</figcaption>' +
        '</figure>';
    }
    el.innerHTML = html;
  }

  /* ---------- the story illustration: the ear cel, visibly off the stack ---------- */
  function buildTentangArt() {
    var el = $("#tentangArt"); if (!el) return;
    var p = PRODUCTS.filter(function (x) { return x.series === "haikyuu"; })[0] || PRODUCTS[0];
    if (!p) return;
    var h = hueOf(p);
    /* the same drawing with the ear cel LIFTED OFF the stack and held above it.
       the story is the mechanic, drawn still. */
    el.innerHTML =
      '<svg viewBox="0 0 404 462" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
      '<g transform="translate(0,62)">' + composite(p, false) +
      '<rect x="0" y="0" width="320" height="400" fill="none" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<g fill="' + INK + '" opacity=".55">' +
        '<circle cx="146" cy="396" r="5"/><rect x="166" y="391" width="14" height="10" rx="5"/>' +
        '<circle cx="196" cy="396" r="5"/></g></g>' +
      /* the acetate: a milky sheet, tilted, casting onto the drawing below */
      '<g transform="translate(52,4) rotate(-3.5 160 200)">' +
      '<rect x="0" y="0" width="320" height="400" fill="' + LIGHTYELLOW + '" opacity=".2"/>' +
      '<rect x="0" y="0" width="320" height="400" fill="none" stroke="' + LIGHTYELLOW +
      '" stroke-width="2.5" stroke-dasharray="10 7"/>' + layerTelinga(h) +
      '<text x="12" y="24" font-family="Space Mono, monospace" font-size="15" letter-spacing="2" ' +
      'fill="' + LIGHTYELLOW + '">04 TELINGA</text></g>' +
      '</svg>';
  }

  /* ---------- counters: the final value is already in the HTML.
       the animation only interpolates TOWARD it, so with no JS the number
       is simply correct. one-shot rAF + a setTimeout backstop. ---------- */
  function runCounters(root) {
    var els = (root || document).querySelectorAll("[data-count]");
    for (var i = 0; i < els.length; i++) {
      (function (el) {
        var target = parseFloat(el.getAttribute("data-count"));
        var two = el.getAttribute("data-fmt") === "1dp2";
        var out = function (v) { el.textContent = two ? fmt2(v) : fmtInt(v); };
        if (REDUCED) { out(target); return; }
        var t0 = performance.now(), dur = 900, done = false;
        var finish = function () { if (!done) { done = true; out(target); } };
        var tick = function (t) {
          if (done) return;
          var k = Math.min(1, (t - t0) / dur);
          out(target * (1 - Math.pow(1 - k, 3)));
          if (k < 1) requestAnimationFrame(tick); else finish();
        };
        requestAnimationFrame(tick);
        setTimeout(finish, dur + 260);   // backstop: rAF fires once under virtual time
      })(els[i]);
    }
  }

  /* ---------- reveal: opt IN at runtime, rAF-throttled position sweep.
       IntersectionObserver can be outrun by a fast scroll or an anchor jump;
       asking where things are cannot. ---------- */
  function reveals() {
    if (REDUCED) return;                       // no .motion class → nothing is ever hidden
    document.documentElement.classList.add("motion");
    var pending = [].slice.call(document.querySelectorAll("[data-rise]"));
    var queued = false;

    /* Adding the class starts a 0.55s transition. If that transition stalls the
       element is stuck at its START value — so the start value is a 16px offset,
       never opacity (see the note in styles.css). On top of that, each reveal
       gets an end-state backstop: 800ms later the final transform is written
       inline, whatever the animation clock did. Measured: under Chrome's
       --virtual-time-budget the transition itself never settles, so without this
       backstop the end state is unverifiable and, on a bad clock, unreachable. */
    function show(el) {
      el.classList.add("in");
      setTimeout(function () { el.style.transform = "none"; }, 800);
    }
    function sweep() {
      queued = false;
      var line = window.innerHeight * 0.94;
      for (var i = pending.length - 1; i >= 0; i--) {
        if (pending[i].getBoundingClientRect().top < line) {
          show(pending[i]);
          pending.splice(i, 1);
        }
      }
      if (!pending.length) window.removeEventListener("scroll", ping);
    }
    function ping() { if (!queued) { queued = true; requestAnimationFrame(sweep); } }
    window.addEventListener("scroll", ping, { passive: true });
    sweep();
    setTimeout(sweep, 240);                    // backstop, same reason as the counters
  }

  /* =============================================================
     BOOT
     ============================================================= */
  function fillShop() {
    var els = document.querySelectorAll("[data-shop]");
    for (var i = 0; i < els.length; i++) {
      var k = els[i].getAttribute("data-shop");
      if (SHOP[k] != null) els[i].textContent = fmtInt(SHOP[k]);
    }
  }

  Promise.all([
    fetch("data/products.json").then(function (r) { return r.json(); }),
    fetch("data/testimonials.json").then(function (r) { return r.json(); }).catch(function () { return { quotes: [] }; })
  ]).then(function (res) {
    var d = res[0];
    PRODUCTS = d.featured || [];
    SERIES = d.series_meta || {};
    SHOP = d.shop_meta || {};

    $("#frameTotal").textContent = String(PRODUCTS.length).padStart(2, "0");
    fillShop();
    buildRack();
    loadStack();
    setNya(true);
    buildTentangArt();
    buildContoh((res[1] && res[1].quotes) || []);
    wire();

    setVar("--spread", (spreadEl.value / 100).toFixed(3));
    setVar("--lamp", (lampEl.value / 100).toFixed(3));

    reveals();
    runCounters(document);
  }).catch(function (err) {
    /* the static HTML already carries real figures and real copy, so a data
       failure degrades to a readable page rather than an empty one. */
    console.error("[cel] data load failed:", err);
    reveals();
  });
})();
