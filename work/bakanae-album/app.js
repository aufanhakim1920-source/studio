/* =========================================================================
   baka nae — ALBUM KOLEKSI
   Object: a collector's sticker album. 32 numbered pockets, 9 filled.
   Mechanic: press a pocket -> it seats -> the album's margin carries the
   caption. Nothing on this page moves unless the visitor moves it.
   Vanilla JS, no build step, no dependencies.
   ========================================================================= */
(function () {
  "use strict";

  var SHOP        = "https://shopee.co.id/baka_nae";
  var SLOT_TOTAL  = 32;
  /* Where the nine drawn products sit in the album's printed order.
     Scattered on purpose: a real part-finished album is not front-loaded.
     The slot number is album bookkeeping, not a claim about the shop. */
  var FILLED_AT   = [1, 4, 7, 11, 15, 19, 22, 26, 30];
  var STORE_KEY   = "bakanae-album-opened-v1";

  var SERIES_SHORT = {
    aot: "AOT", haikyuu: "HAIKYUU", bnha: "BNHA",
    mtp: "MORIARTY", jjk: "JJK", drstone: "DR. STONE"
  };

  /* ---------------------------------------------------------------- state */
  var DATA    = null;
  var SLOTS   = [];      /* 32 entries: { n, product|null, el } */
  var seated  = null;    /* slot number currently seated, or null */
  var series  = "all";
  var opened  = loadOpened();

  var el = {
    pageL:   document.getElementById("pageL"),
    pageR:   document.getElementById("pageR"),
    tabs:    document.getElementById("tabs"),
    margin:  document.getElementById("marginInner"),
    drawn:   document.getElementById("drawnCount"),
    open:    document.getElementById("openedCount"),
    reset:   document.getElementById("resetBtn")
  };

  /* ================================================================ utils */
  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function rp(n) { return "Rp " + Number(n).toLocaleString("id-ID"); }

  function num(n) { return Number(n).toLocaleString("id-ID"); }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function loadOpened() {
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.filter(function (n) {
        return typeof n === "number" && n >= 1 && n <= SLOT_TOTAL;
      }) : [];
    } catch (e) { return []; }
  }

  function saveOpened() {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(opened)); }
    catch (e) { /* private mode — the album still works, it just forgets */ }
  }

  /* ==================================================================== ART
     Everything is drawn. There is no product photography and assets/ is empty.
     One shared cat-eared mark ("Nya! ver."), presented six ways by format so
     each silhouette is readable at 80px.
     viewBox is 120 x 150 throughout.
     ==================================================================== */

  /* the shared mark. bbox x 17..103, y 17..94, centre (60, 55.5) */
  function mark(fill, detail) {
    var d = detail !== false;
    return '' +
      '<path d="M33 54 L27 17 L56 39 Z" fill="' + fill + '"/>' +
      '<path d="M87 54 L93 17 L64 39 Z" fill="' + fill + '"/>' +
      (d ? '<path d="M38 49 L35 30 L48 41 Z" fill="var(--ly)" stroke-width="1.6"/>' +
           '<path d="M82 49 L85 30 L72 41 Z" fill="var(--ly)" stroke-width="1.6"/>' : '') +
      '<ellipse cx="60" cy="67" rx="31" ry="27" fill="' + fill + '"/>' +
      '<path d="M18 63 h11 M18 71 h11 M91 63 h11 M91 71 h11" fill="none" stroke-width="1.7"/>' +
      (d ? '<path d="M45 67 q6 -8 12 0" fill="none"/>' +
           '<path d="M63 67 q6 -8 12 0" fill="none"/>' +
           '<path d="M55 77 q2.6 3.4 5 0 q2.4 3.4 5 0" fill="none"/>' +
           '<ellipse cx="40" cy="76" rx="5.4" ry="3.1" fill="rgba(92,63,18,.22)" stroke="none"/>' +
           '<ellipse cx="80" cy="76" rx="5.4" ry="3.1" fill="rgba(92,63,18,.22)" stroke="none"/>' : "");
  }

  /* place the mark at a given scale so its centre lands on (cx, cy) */
  function markAt(fill, s, cx, cy, detail) {
    var tx = cx - 60 * s, ty = cy - 55.5 * s;
    return '<g transform="translate(' + tx.toFixed(2) + ',' + ty.toFixed(2) +
           ') scale(' + s + ')">' + mark(fill, detail) + "</g>";
  }

  function svg(inner, cls) {
    return '<svg class="' + (cls || "art") + '" viewBox="0 0 120 150" ' +
      'xmlns="http://www.w3.org/2000/svg" aria-hidden="true" ' +
      'stroke="var(--ink)" stroke-width="2.6" stroke-linejoin="round" ' +
      'stroke-linecap="round" fill="none">' + inner + "</svg>";
  }

  var FRAMES = {
    /* a charm on a split ring and a chain */
    keychain: function (h) {
      return svg(
        '<circle cx="60" cy="11" r="8"/>' +
        '<path d="M60 19 v5"/>' +
        '<rect x="54" y="22" width="12" height="8" rx="3" fill="var(--ly)"/>' +
        '<rect x="16" y="30" width="88" height="110" rx="16" fill="' + h + '"/>' +
        markAt("var(--white)", .74, 60, 85)
      );
    },
    /* a charm hanging from a wrist cord */
    strap: function (h) {
      return svg(
        '<path d="M60 43 C43 33 43 12 60 10 C77 12 77 33 60 43 Z"/>' +
        '<rect x="53" y="39" width="14" height="9" rx="4" fill="var(--ly)"/>' +
        '<path d="M60 48 v7"/>' +
        '<circle cx="60" cy="96" r="41" fill="' + h + '"/>' +
        markAt("var(--white)", .68, 60, 96)
      );
    },
    /* kiss-cut: a white die-cut border follows the shape itself */
    sticker: function (h) {
      return svg(
        markAt("var(--white)", 1.0, 60, 80, false) +
        markAt(h, .80, 60, 80)
      );
    },
    /* landscape card with a stamp box and address rules */
    postcard: function (h) {
      return svg(
        '<rect x="6" y="26" width="108" height="98" rx="4" fill="var(--white)"/>' +
        '<rect x="86" y="35" width="22" height="26" rx="2" fill="' + h + '" ' +
          'stroke-width="1.6" stroke-dasharray="3 3"/>' +
        '<path d="M80 100 h28 M80 110 h28" stroke-width="1.6"/>' +
        '<rect x="14" y="104" width="34" height="14" rx="2" fill="' + h + '" stroke-width="1.6"/>' +
        markAt(h, .60, 48, 70)
      );
    },
    /* tall card with a caption bar and a foil corner */
    photocard: function (h) {
      return svg(
        '<rect x="27" y="6" width="66" height="138" rx="5" fill="' + h + '"/>' +
        '<path d="M27 11 a5 5 0 0 1 5 -5 h17 L27 33 Z" fill="var(--ly)" stroke-width="1.6"/>' +
        '<rect x="33" y="110" width="54" height="28" rx="3" fill="var(--white)" stroke-width="1.6"/>' +
        '<path d="M39 120 h42 M39 129 h26" stroke-width="1.6"/>' +
        markAt("var(--white)", .58, 60, 64)
      );
    },
    /* a framed print: paper, mount, image field, horizon */
    print: function (h) {
      return svg(
        '<rect x="8" y="12" width="104" height="126" rx="2" fill="var(--white)"/>' +
        '<rect x="18" y="22" width="84" height="106" rx="1" fill="' + h + '"/>' +
        '<rect x="13" y="17" width="94" height="116" stroke-width="1.5"/>' +
        '<circle cx="60" cy="43" r="15" fill="var(--ly)" stroke-width="1.8"/>' +
        '<path d="M18 110 q21 -13 42 0 q21 13 42 0" stroke-width="1.8"/>' +
        markAt("var(--white)", .60, 60, 84)
      );
    }
  };

  /* the ghost printed in an empty pocket. Deliberately the SAME generic mark
     for all 23: we do not know what those products are, so drawing a specific
     silhouette would be inventing data. Ink-toned stroke, never light-on-light. */
  function ghost() {
    return svg(
      '<g stroke-width="3.2" stroke="var(--ink)">' +
        markAt("none", .78, 60, 78, false) +
      "</g>",
      "art art-ghost"
    );
  }

  var TYPE_TO_FRAME = {
    "Keychain": "keychain",
    "Phone Strap": "strap",
    "Sticker": "sticker",
    "Postcard": "postcard",
    "Photocard": "photocard",
    "Art Print": "print"
  };

  function artFor(p) {
    var key = TYPE_TO_FRAME[p.type_en] || "sticker";
    var hue = (DATA.series_meta[p.series] && DATA.series_meta[p.series].hue) || "var(--ly)";
    return FRAMES[key](hue);
  }

  /* ================================================================= BUILD */
  function buildSlots() {
    var products = DATA.featured.slice();
    var byNumber = {};
    FILLED_AT.forEach(function (n, i) {
      if (products[i]) byNumber[n] = products[i];
    });

    SLOTS = [];
    el.pageL.innerHTML = "";
    el.pageR.innerHTML = "";

    for (var n = 1; n <= SLOT_TOTAL; n++) {
      var p = byNumber[n] || null;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "slot " + (p ? "is-filled" : "is-empty");
      b.dataset.n = String(n);
      if (p) {
        b.dataset.series = p.series;
        b.style.setProperty("--tilt", (p.tilt || 0) + "deg");
        b.setAttribute("aria-label",
          "Slot " + pad(n) + ", " + p.name_id + ", " + rp(p.price_idr).replace(/ /g, " "));
      } else {
        b.setAttribute("aria-label", "Slot " + pad(n) + ", kosong — belum digambar di album ini");
      }
      b.innerHTML =
        '<span class="pocket">' + (p ? artFor(p) : ghost()) + "</span>" +
        '<span class="num">' + pad(n) + "</span>";

      if (opened.indexOf(n) !== -1) b.classList.add("is-opened");

      (n <= 16 ? el.pageL : el.pageR).appendChild(b);
      SLOTS.push({ n: n, product: p, el: b });
    }
  }

  function buildTabs() {
    var counts = { all: DATA.featured.length };
    DATA.featured.forEach(function (p) {
      counts[p.series] = (counts[p.series] || 0) + 1;
    });

    var list = [{ id: "all", label: "SEMUA", hue: "var(--ly)" }];
    Object.keys(DATA.series_meta).forEach(function (id) {
      list.push({
        id: id,
        label: SERIES_SHORT[id] || DATA.series_meta[id].name_id.toUpperCase(),
        hue: DATA.series_meta[id].hue
      });
    });

    el.tabs.innerHTML = list.map(function (t) {
      return '<button type="button" class="tab" role="tab" data-series="' + t.id + '" ' +
        'style="--tabhue:' + t.hue + '" aria-selected="' + (t.id === series) + '">' +
        esc(t.label) + "<em>" + (counts[t.id] || 0) + "</em></button>";
    }).join("");
  }

  function buildFigures() {
    var m = DATA.shop_meta;
    set("figFollowers", num(m.followers));
    set("figRating", Number(m.rating_avg).toLocaleString("id-ID",
      { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    set("figRatingCount", num(m.rating_total));
    set("figItems", String(m.item_count));
    set("figYear", String(m.est_year));
    el.drawn.textContent = pad(DATA.featured.length);
  }

  function set(id, v) { var n = document.getElementById(id); if (n) n.textContent = v; }

  /* ============================================================= THE MARGIN
     The album's caption. It is the only text-heavy surface on the page and it
     starts empty — the detail is an option, revealed by the object's own
     mechanic, never tabulated beside it. */
  /* below 1150px the caption docks to the bottom of the viewport, so the page
     has to reserve exactly its height — a guessed constant clipped the footer */
  var dock = document.getElementById("margin");
  function fitDock() {
    var fixed = window.getComputedStyle(dock).position === "fixed";
    document.body.style.paddingBottom =
      fixed ? Math.ceil(dock.getBoundingClientRect().height + 26) + "px" : "";
  }

  function marginHint() {
    el.margin.innerHTML =
      '<div class="m-empty"><p class="m-hint">Tekan sebuah slot.</p></div>';
    fitDock();
  }

  function marginFilled(n, p) {
    var meta = DATA.series_meta[p.series] || {};
    el.margin.innerHTML =
      '<p class="m-slot">Slot ' + pad(n) + "</p>" +
      '<span class="m-tag" style="--taghue:' + (meta.hue || "var(--ly)") + '">' +
        esc(meta.name_id || p.series) + "</span>" +
      '<p class="m-name">' + esc(p.name_id) + "</p>" +
      '<p class="m-price">' + rp(p.price_idr) + "</p>" +
      '<hr class="m-rule">' +
      '<p class="m-meta">' + esc(p.type_id) + " &middot; " + esc(p.sold_display) + " terjual</p>" +
      '<a class="btn" href="' + esc(p.shopee_url || SHOP) + '" rel="noopener">Beli di Shopee &rarr;</a>';
    fitDock();
  }

  function marginEmpty(n) {
    var drawn = DATA.featured.length, total = DATA.shop_meta.item_count;
    el.margin.innerHTML =
      '<p class="m-slot">Slot ' + pad(n) + " &middot; kosong</p>" +
      '<p class="m-name">Belum digambar</p>' +
      '<p class="m-body">Album ini baru memuat <b>' + drawn + " dari " + total +
        "</b> produk. Slot kosong bukan tanda habis atau segera terbit — " +
        "produknya ada di toko, cuma belum digambar di sini.</p>" +
      '<hr class="m-rule">' +
      '<a class="btn" href="' + SHOP + '" rel="noopener">Lihat semua di Shopee &rarr;</a>';
    fitDock();
  }

  /* ============================================================== MECHANIC */
  function seat(n) {
    var slot = SLOTS[n - 1];
    if (!slot) return;

    if (seated === n) {                      /* press again = unseat */
      slot.el.classList.remove("is-seated");
      seated = null;
      marginHint();
      return;
    }
    if (seated !== null && SLOTS[seated - 1]) {
      SLOTS[seated - 1].el.classList.remove("is-seated");
    }
    slot.el.classList.add("is-seated");
    seated = n;

    if (opened.indexOf(n) === -1) {
      opened.push(n);
      saveOpened();
      slot.el.classList.add("is-opened");
      renderOpened();
    }

    if (slot.product) marginFilled(n, slot.product);
    else marginEmpty(n);
  }

  function renderOpened() {
    el.open.textContent = pad(opened.length);
    el.reset.hidden = opened.length === 0;
  }

  /* flipping to a section of the album: everything outside the series parks */
  function applySeries(id) {
    series = id;
    SLOTS.forEach(function (s) {
      var inSeries = id === "all" || (s.product && s.product.series === id);
      s.el.classList.toggle("is-parked", !inSeries);
    });
    Array.prototype.forEach.call(el.tabs.querySelectorAll(".tab"), function (t) {
      t.setAttribute("aria-selected", String(t.dataset.series === id));
    });
    if (seated !== null && SLOTS[seated - 1] &&
        SLOTS[seated - 1].el.classList.contains("is-parked")) {
      SLOTS[seated - 1].el.classList.remove("is-seated");
      seated = null;
      marginHint();
    }
  }

  /* ================================================================= WIRING */
  function wire() {
    document.getElementById("album").addEventListener("click", function (e) {
      var b = e.target.closest(".slot");
      if (b) seat(Number(b.dataset.n));
    });

    el.tabs.addEventListener("click", function (e) {
      var t = e.target.closest(".tab");
      if (t) applySeries(t.dataset.series);
    });

    el.reset.addEventListener("click", function () {
      opened = [];
      saveOpened();
      SLOTS.forEach(function (s) { s.el.classList.remove("is-opened"); });
      renderOpened();
    });

    var rz;
    window.addEventListener("resize", function () {
      clearTimeout(rz); rz = setTimeout(fitDock, 120);
    }, { passive: true });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && seated !== null) {
        SLOTS[seated - 1].el.classList.remove("is-seated");
        seated = null;
        marginHint();
      }
    });
  }

  function fail(msg) {
    var a = document.getElementById("album");
    a.innerHTML =
      '<div style="padding:26px;grid-column:1/-1">' +
        '<p style="margin:0 0 12px"><b>Album gagal dimuat.</b> ' + esc(msg) + "</p>" +
        '<a class="btn" href="' + SHOP + '" rel="noopener">Lihat 32 produk di Shopee &rarr;</a>' +
      "</div>";
  }

  /* =================================================================== BOOT */
  fetch("data/products.json")
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(function (json) {
      DATA = json;
      buildSlots();
      buildTabs();
      buildFigures();
      renderOpened();
      wire();
      fitDock();

      /* self-check, surfaced rather than assumed */
      window.__album = {
        slots: SLOTS.length,
        filled: SLOTS.filter(function (s) { return !!s.product; }).length,
        empty: SLOTS.filter(function (s) { return !s.product; }).length,
        domSlots: document.querySelectorAll(".slot").length,
        domFilled: document.querySelectorAll(".slot.is-filled").length,
        domEmpty: document.querySelectorAll(".slot.is-empty").length,
        ok: SLOTS.length === SLOT_TOTAL &&
            SLOTS.filter(function (s) { return !!s.product; }).length === DATA.featured.length
      };
      document.documentElement.dataset.albumReady = "1";
    })
    .catch(function (err) { fail(String(err && err.message || err)); });
})();
