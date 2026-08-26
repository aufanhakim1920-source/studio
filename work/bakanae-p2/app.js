/* ============================================================
   baka nae. — lane 01 "atelier"
   Vanilla. No framework, no build step.

   Motion policy (hard):
   · nothing animates on its own — every transition is caused by
     scroll-into-view (one shot), hover, or a click.
   · no setInterval loops, no infinite keyframes, no autoplay.
   · reveals opt IN at runtime via the `.motion` class, so with
     JavaScript off nothing on the page is hidden.
   ============================================================ */
(function () {
  "use strict";

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------------------------------------------------------
     1 · reveal engine — rAF sweep, never IntersectionObserver
     (IO delivers async and can be outrun by a fast scroll or an
     in-page anchor jump; asking for positions cannot miss.)
     --------------------------------------------------------- */
  var queued = false;

  /* The worklist is derived from the DOM on every sweep rather than cached in
     an array. A cached list goes stale the moment a filter re-renders the grid,
     which is how cards end up stuck at opacity 0 forever. Querying costs one
     selector call over ~40 nodes and returns empty as soon as the page is fully
     revealed, so it is cheaper than the bug it prevents. */
  function sweep() {
    queued = false;
    var nodes = document.querySelectorAll("[data-rise]:not(.in)");
    if (!nodes.length) return;
    var line = window.innerHeight * 0.94;
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].getBoundingClientRect().top < line) {
        nodes[i].classList.add("in");
        if (nodes[i].hasAttribute("data-counts")) startCounters(nodes[i]);
      }
    }
  }
  function ping() { if (!queued) { queued = true; requestAnimationFrame(sweep); } }

  function register() {
    if (REDUCED) {
      // no reveal, no count-up — the HTML already holds every final value
      $$("[data-rise]").forEach(function (n) { n.classList.add("in"); });
      return;
    }
    sweep(); // catch whatever is already above the fold
  }

  if (!REDUCED) {
    document.documentElement.classList.add("motion");
    window.addEventListener("scroll", ping, { passive: true });
    window.addEventListener("resize", ping, { passive: true });
  }

  /* ---------------------------------------------------------
     2 · counters — animate TOWARDS the value already in the HTML
     --------------------------------------------------------- */
  function idNum(n, dp) {
    return n.toLocaleString("id-ID", { minimumFractionDigits: dp, maximumFractionDigits: dp });
  }
  function startCounters(scope) {
    $$("[data-count]", scope).forEach(function (el) {
      if (el.dataset.done) return;
      el.dataset.done = "1";
      var target = parseFloat(el.getAttribute("data-count"));
      var dp = parseInt(el.getAttribute("data-dp") || "0", 10);
      var dur = 900, t0 = 0;
      function step(ts) {
        if (!t0) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur);
        var e = 1 - Math.pow(1 - p, 3);
        el.textContent = idNum(target * e, dp);
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = idNum(target, dp);
      }
      requestAnimationFrame(step);
    });
  }

  /* ---------------------------------------------------------
     3 · drawn product forms — CSS/SVG only, no photography,
        no external image host. Every form carries the same
        "Nya! ver." cat-ear mark, tinted with the series hue.
     --------------------------------------------------------- */
  var INK = "#6B4A15", PAPER = "#FFFFFF", GROUND = "#FBEFC0";

  function head(x, y, s) {
    return '<use href="#nya-head" transform="translate(' + x + ' ' + y + ') scale(' + s + ')"/>';
  }
  function wrap(hue, inner) {
    return '<svg viewBox="0 0 200 240" style="--art-hue:' + hue + '" role="img" aria-hidden="true">' + inner + "</svg>";
  }

  var FORMS = {
    "Keychain": function (hue) {
      return wrap(hue,
        '<circle cx="100" cy="17" r="11" fill="none" stroke="' + INK + '" stroke-width="4"/>' +
        '<rect x="94" y="27" width="12" height="18" rx="5" fill="' + GROUND + '" stroke="' + INK + '" stroke-width="3"/>' +
        '<rect x="28" y="43" width="144" height="182" rx="22" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="4"/>' +
        '<rect x="38" y="53" width="124" height="162" rx="14" fill="none" stroke="' + INK + '" stroke-width="1.6" stroke-dasharray="6 6" opacity=".32"/>' +
        head(100, 124, 1.32) +
        '<path d="M74 176q26 17 52 0" fill="none" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' +
        '<circle cx="100" cy="187" r="6" fill="#7A5518" stroke="' + INK + '" stroke-width="2.6"/>' +
        '<path d="M44 212 72 52h12L56 212Z" fill="#fff" opacity=".3"/>');
    },
    "Phone Strap": function (hue) {
      return wrap(hue,
        '<circle cx="100" cy="14" r="9.5" fill="none" stroke="' + INK + '" stroke-width="3.6"/>' +
        '<path d="M100 23C84 42 84 70 100 88c16-18 16-46 0-65Z" fill="none" stroke="' + INK + '" stroke-width="4"/>' +
        '<path d="M91 36h18M89 52h22M91 68h18" stroke="' + INK + '" stroke-width="1.8" opacity=".38"/>' +
        '<rect x="88" y="86" width="24" height="13" rx="4" fill="' + hue + '" stroke="' + INK + '" stroke-width="3"/>' +
        '<circle cx="100" cy="105" r="6.5" fill="#7A5518" stroke="' + INK + '" stroke-width="2.6"/>' +
        '<rect x="52" y="110" width="96" height="112" rx="18" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="4"/>' +
        head(100, 162, 1.02) +
        '<path d="M62 212 86 118h11L73 212Z" fill="#fff" opacity=".28"/>');
    },
    "Sticker": function (hue) {
      return wrap(hue,
        '<rect x="16" y="26" width="168" height="188" rx="8" fill="#FDF7E0" stroke="' + INK + '" stroke-width="3.5"/>' +
        '<rect x="26" y="36" width="148" height="168" rx="5" fill="none" stroke="' + INK + '" stroke-width="1.6" stroke-dasharray="7 6" opacity=".38"/>' +
        // kiss-cut vinyl margin, drawn as a fill-only silhouette behind the mark
        '<g transform="translate(100 122) scale(1.62)" fill="#FFFFFF">' +
          '<path d="M-38-16-29-54-2-30Z"/><path d="M38-16 29-54 2-30Z"/>' +
          '<ellipse cx="0" cy="0" rx="42" ry="39"/>' +
        "</g>" +
        head(100, 122, 1.42) +
        '<path d="M160 188q16 6 16 24-18 0-24-13Z" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>');
    },
    "Postcard": function (hue) {
      return wrap(hue,
        '<rect x="14" y="34" width="172" height="172" rx="5" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="4"/>' +
        '<rect x="26" y="46" width="148" height="106" fill="' + hue + '" opacity=".34"/>' +
        '<rect x="26" y="46" width="148" height="106" fill="none" stroke="' + INK + '" stroke-width="2.4"/>' +
        '<circle cx="150" cy="70" r="12" fill="#7A5518" stroke="' + INK + '" stroke-width="2.4"/>' +
        head(90, 112, 0.86) +
        '<path d="M26 152h148" stroke="' + INK + '" stroke-width="2.4"/>' +
        '<path d="M34 168h74M34 180h60M34 192h84" stroke="' + INK + '" stroke-width="2" opacity=".45" stroke-linecap="round"/>' +
        '<rect x="128" y="162" width="34" height="30" fill="none" stroke="' + INK + '" stroke-width="2" stroke-dasharray="4 4"/>' +
        '<g style="--art-hue:' + hue + '"><use href="#nya-mini" transform="translate(145 178) scale(.95)"/></g>');
    },
    "Photocard": function (hue) {
      return wrap(hue,
        '<rect x="38" y="16" width="124" height="208" rx="10" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="4"/>' +
        '<rect x="48" y="26" width="104" height="152" rx="6" fill="' + hue + '" opacity=".38"/>' +
        '<rect x="48" y="26" width="104" height="152" rx="6" fill="none" stroke="' + INK + '" stroke-width="2.4"/>' +
        head(100, 104, 1.02) +
        '<path d="M50 176 80 26h13L63 176Z" fill="#fff" opacity=".28"/>' +
        '<rect x="48" y="188" width="104" height="26" rx="4" fill="' + INK + '"/>' +
        '<path d="M58 197h44M58 205h64" stroke="' + GROUND + '" stroke-width="2.6" stroke-linecap="round" opacity=".8"/>');
    },
    "Art Print": function (hue) {
      return wrap(hue,
        '<rect x="20" y="14" width="160" height="212" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="4"/>' +
        '<rect x="34" y="28" width="132" height="156" fill="' + hue + '" opacity=".3"/>' +
        '<rect x="34" y="28" width="132" height="156" fill="none" stroke="' + INK + '" stroke-width="2.4"/>' +
        '<circle cx="140" cy="58" r="16" fill="#7A5518" opacity=".85" stroke="' + INK + '" stroke-width="2.4"/>' +
        '<path d="M34 150q30-26 56-4t42-10v48H34Z" fill="' + GROUND + '" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
        head(88, 112, 1.06) +
        '<path d="M44 202q10-9 18 0t18-2" fill="none" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>' +
        '<path d="M120 200h40" stroke="' + INK + '" stroke-width="2" opacity=".35"/>');
    }
  };

  function artFor(type, hue) {
    return (FORMS[type] || FORMS["Photocard"])(hue);
  }

  /* ---------------------------------------------------------
     4 · data
     --------------------------------------------------------- */
  var DATA = null, QUOTES = null;
  var state = { type: "all", series: null };

  var rupiah = function (n) { return "Rp " + n.toLocaleString("id-ID"); };

  /* Her real listing convention is "<Series> Nya! ver. <Type>";
     products.json drops the "ver." — restore it without touching
     titles that never carried the marker. */
  function realTitle(name) {
    return name.replace(/\bNya!(?!\s*ver\.)\s+/g, "Nya! ver. ");
  }

  Promise.all([
    fetch("data/products.json").then(function (r) { return r.json(); }),
    fetch("data/testimonials.json").then(function (r) { return r.json(); })
  ]).then(function (res) {
    DATA = res[0];
    QUOTES = res[1];
    fillShopMeta();
    renderSeries();
    renderPills();
    renderCatalogue();
    renderQuotes();
    register();
  }).catch(function (err) {
    console.error("Gagal memuat data:", err);
    var g = $("#catGrid");
    if (g) g.innerHTML = '<p class="empty">Data katalog gagal dimuat. Semua produk tetap ada di ' +
      '<a href="https://shopee.co.id/baka_nae" target="_blank" rel="noopener">Shopee</a>.</p>';
    register();
  });

  function fillShopMeta() {
    var m = DATA.shop_meta;
    $$("[data-shop]").forEach(function (el) {
      var k = el.getAttribute("data-shop");
      if (m[k] == null) return;
      var b = el.querySelector("[data-count]");
      if (b) { b.setAttribute("data-count", m[k]); b.textContent = m[k].toLocaleString("id-ID"); }
      else el.textContent = m[k].toLocaleString("id-ID");
    });
    var lead = $(".proof-lead");
    if (lead) lead.setAttribute("data-counts", "");
    $$(".proof-list > div").forEach(function (d) { d.setAttribute("data-counts", ""); });
  }

  /* ---------------------------------------------------------
     5 · series — the cards double as catalogue filters
     --------------------------------------------------------- */
  function countFor(slug) {
    return DATA.featured.filter(function (p) { return p.series === slug; }).length;
  }

  function renderSeries() {
    var grid = $("#seriesGrid");
    var slugs = Object.keys(DATA.series_meta);
    grid.innerHTML = slugs.map(function (slug, i) {
      var s = DATA.series_meta[slug];
      var n = countFor(slug);
      return '<button class="series-card" type="button" data-series="' + slug + '" aria-pressed="false" data-rise style="--d:' + (i * 55) + 'ms">' +
        '<span class="series-face"><svg viewBox="-16 -18.5 32 30" style="--art-hue:' + s.hue + '" aria-hidden="true"><use href="#nya-mini"/></svg></span>' +
        '<span class="series-name">' + s.name_id + '</span>' +
        '<span class="series-meta">' + (n ? n + " di katalog" : "di Shopee") + "</span>" +
        "</button>";
    }).join("");

    $$(".series-card", grid).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var slug = btn.getAttribute("data-series");
        state.series = state.series === slug ? null : slug;
        state.type = "all";
        syncSeriesButtons();
        renderPills();
        renderCatalogue();
        document.getElementById("katalog").scrollIntoView({
          behavior: REDUCED ? "auto" : "smooth", block: "start"
        });
      });
    });
  }

  function syncSeriesButtons() {
    $$(".series-card").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-series") === state.series));
    });
  }

  /* ---------------------------------------------------------
     6 · catalogue
     --------------------------------------------------------- */
  function renderPills() {
    var box = $("#typePills");
    var pool = state.series
      ? DATA.featured.filter(function (p) { return p.series === state.series; })
      : DATA.featured;
    var present = {};
    pool.forEach(function (p) { present[p.type_id] = true; });

    box.innerHTML = DATA.type_filters.filter(function (t) {
      return t.id === "all" || present[t.id];
    }).map(function (t) {
      return '<button class="pill" type="button" data-type="' + t.id + '" aria-pressed="' +
        (state.type === t.id) + '">' + t.name_id + "</button>";
    }).join("");

    $$(".pill", box).forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.type = btn.getAttribute("data-type");
        $$(".pill", box).forEach(function (b) {
          b.setAttribute("aria-pressed", String(b === btn));
        });
        renderCatalogue();
      });
    });
  }

  function visible() {
    return DATA.featured.filter(function (p) {
      return (state.type === "all" || p.type_id === state.type) &&
             (!state.series || p.series === state.series);
    });
  }

  function renderCatalogue() {
    var grid = $("#catGrid");
    var list = visible();

    grid.innerHTML = list.map(function (p, i) {
      var s = DATA.series_meta[p.series] || { name_id: p.series, hue: "#7A5518" };
      return '<article class="card" data-rise style="--d:' + Math.min(i, 5) * 60 + 'ms">' +
        '<div class="card-art">' + artFor(p.type_id, s.hue) +
          '<span class="card-type">' + p.type_id + "</span>" +
        "</div>" +
        '<div class="card-body">' +
          '<h3 class="card-name">' + realTitle(p.name_id) + "</h3>" +
          '<p class="card-price">' + rupiah(p.price_idr) + "</p>" +
        "</div>" +
        '<div class="card-detail" data-open="false" id="d-' + p.id + '"><div><dl>' +
          "<dt>Seri</dt><dd>" + s.name_id + "</dd>" +
          "<dt>Terjual</dt><dd>" + p.sold_display + "</dd>" +
          "<dt>Kirim</dt><dd>Jakarta Selatan &amp; Surabaya</dd>" +
        "</dl></div></div>" +
        '<div class="card-foot">' +
          '<button class="detail-toggle" type="button" aria-expanded="false" aria-controls="d-' + p.id + '">' +
            'Detail <span class="chev" aria-hidden="true">▾</span></button>' +
          '<a class="buy" href="' + p.shopee_url + '" target="_blank" rel="noopener">Beli di Shopee ↗</a>' +
        "</div>" +
        "</article>";
    }).join("");

    $("#catEmpty").hidden = list.length > 0;

    $$(".detail-toggle", grid).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var panel = document.getElementById(btn.getAttribute("aria-controls"));
        var open = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!open));
        panel.setAttribute("data-open", String(!open));
      });
    });

    var srs = state.series ? (DATA.series_meta[state.series] || {}).name_id : null;
    $("#filterState").innerHTML =
      "Menampilkan " + list.length + " dari " + DATA.featured.length +
      (srs || state.type !== "all"
        ? ' <button class="clear-filter" type="button" id="clearFilter">Reset' +
          (srs ? " · " + srs : "") + "</button>"
        : "");
    var clear = $("#clearFilter");
    if (clear) clear.addEventListener("click", function () {
      state.series = null; state.type = "all";
      syncSeriesButtons(); renderPills(); renderCatalogue();
    });

    // new nodes appear immediately if they are already above the fold;
    // the DOM-derived sweep picks up the rest on the next scroll
    register();
  }

  /* ---------------------------------------------------------
     7 · reviews (explicitly labelled placeholder)
     --------------------------------------------------------- */
  function renderQuotes() {
    $("#quoteGrid").innerHTML = QUOTES.quotes.map(function (q, i) {
      var s = DATA.series_meta[q.series] || { hue: "#7A5518" };
      return '<figure class="quote" data-rise style="--d:' + (i * 70) + 'ms">' +
        "<p>" + q.text_id + "</p>" +
        "<footer>" +
          '<span class="quote-face"><svg viewBox="-16 -18.5 32 30" style="--art-hue:' + s.hue + '" aria-hidden="true"><use href="#nya-mini"/></svg></span>' +
          "<b>" + q.author + "</b><span>" + q.meta_id + "</span>" +
          '<span class="tag-ph">placeholder</span>' +
        "</footer></figure>";
    }).join("");
  }

  /* ---------------------------------------------------------
     8 · header nav (click-driven)
     --------------------------------------------------------- */
  var toggle = $("#navToggle"), nav = $("#siteNav");
  toggle.addEventListener("click", function () {
    var open = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!open));
    nav.classList.toggle("open", !open);
  });
  nav.addEventListener("click", function (e) {
    if (e.target.tagName === "A") {
      toggle.setAttribute("aria-expanded", "false");
      nav.classList.remove("open");
    }
  });

  /* ---------------------------------------------------------
     9 · hero charm — pointer-driven tilt only. It never moves
        unless the visitor moves the pointer over it.
     --------------------------------------------------------- */
  var charm = $("#heroCharm");
  if (charm && !REDUCED && window.matchMedia("(pointer:fine)").matches) {
    var host = charm.parentElement, raf = 0, tx = 0, ty = 0;
    host.addEventListener("pointermove", function (e) {
      var r = host.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 14;
      ty = ((e.clientY - r.top) / r.height - 0.5) * -10;
      if (!raf) raf = requestAnimationFrame(applyTilt);
    });
    host.addEventListener("pointerleave", function () { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(applyTilt); });
    function applyTilt() {
      raf = 0;
      charm.style.transform = "perspective(760px) rotate(-2.2deg) rotateY(" + tx + "deg) rotateX(" + ty + "deg)";
    }
  }
})();
