(function () {
  "use strict";
  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  /* ---------------------------------------------------------
     0 · language — Indonesian (the default) and English.
     Every visible string lives in the table below. The page keeps its Indonesian text in the
     HTML (so it reads correctly with no script, and in search results); data-t / data-th /
     data-ta mark the nodes whose text, markup or aria-label the switch rewrites. The choice is
     remembered. The language is NEVER guessed from the browser: an Indonesian visitor with an
     English-language phone would otherwise land on English prices.
     --------------------------------------------------------- */
  var I18N = {
    id: {
      "meta.title": "baka nae. — Fanart Nya! ver. yang bisa kamu genggam",
      "meta.desc": "baka nae. — keychain, stiker, postcard dan art print seri Nya! ver. Digambar sendiri sejak 2019. Kirim dari Jakarta Selatan & Surabaya.",
      "lang.aria": "Bahasa (Language)", "cur.aria": "Mata uang (Currency)", "nav.aria": "Navigasi utama",
      "nav.series": "Seri", "nav.catalogue": "Katalog", "nav.story": "Cerita", "nav.reviews": "Ulasan", "nav.shop": "Ke Shopee",
      "hero.kicker": "Sejak 2019 · Jakarta Selatan & Surabaya",
      "hero.h1": "Fanart yang bisa kamu <em>genggam</em>.",
      "hero.lede": "Keychain, stiker, dan cetakan seri <b>Nya! ver.</b> — digambar sendiri, satu per satu.",
      "hero.cta1": "Lihat katalog", "hero.cta2": 'Buka Shopee <span aria-hidden="true">↗</span>',
      "hero.art": "Ilustrasi gantungan kunci akrilik Nya! ver.",
      "proof.aria": "Rekam jejak toko",
      "proof.sub": 'rata&#8209;rata dari <b data-shop="rating_total">7.440</b> ulasan Shopee',
      "proof.followers": "pengikut", "proof.products": "produk aktif", "proof.since": "mulai jualan",
      "proof.note": "Angka diambil langsung dari halaman toko Shopee, diverifikasi 25 Agustus 2026.",
      "series.kicker": '<span class="idx">01</span> Seri',
      "series.h2": "Semesta <em>Nya! ver.</em>",
      "series.lede": "Karakter favoritmu, versi berkuping kucing.",
      "cat.kicker": '<span class="idx">02</span> Katalog',
      "cat.h2": "Pilihan <em>terlaris</em>",
      "cat.lede0": "Pilihan produk dari toko.",
      "cat.lede": "{n} produk pilihan dari toko — selengkapnya ada di Shopee.",
      "cat.filter.aria": "Saring menurut jenis",
      "cat.empty": "Tidak ada produk untuk kombinasi ini.",
      "cat.note": "Ilustrasi di atas digambar sementara untuk tata letak — foto produk asli menyusul.",
      "cat.more": 'Lihat 32 produk di Shopee <span aria-hidden="true">↗</span>',
      "story.kicker": '<span class="idx">03</span> Cerita',
      "story.h2": "Digambar <em>sendiri</em>, dari awal.",
      "story.p1": "Sketsa, warna, sampai garis potongnya dikerjakan Nae sendiri. Tidak ada desain beli jadi.",
      "story.p2": "<b>Nya! ver.</b> jadi seri utamanya sejak 2019 — dan sudah lebih dari 7.400 pembeli membawa pulang satu.",
      "step.draw": "Digambar", "step.print": "Dicetak", "step.ship": "Dikirim",
      "ship.line": "Dikirim dari <b>Jakarta Selatan</b> &amp; <b>Surabaya</b>.",
      "rev.kicker": '<span class="idx">04</span> Ulasan',
      "rev.h2": "Kata <em>pembeli</em>",
      "rev.warn": "Kutipan di bawah masih <b>placeholder</b> — belum diambil dari ulasan Shopee asli.",
      "cta.h2": "Semua 32 produk<br>ada di Shopee.",
      "cta.p": "COD, pengiriman, dan garansi ditangani lewat toko.",
      "cta.note": "Instagram & TikTok — menyusul.",
      "foot.credit": "Ilustrasi & produksi oleh Nae",
      "foot.verified": "Data toko diverifikasi 25 Agu 2026",
      "foot.admin": "Kelola toko",
      "all": "Semua", "series.meta.n": "{n} di katalog", "series.meta.shop": "di Shopee",
      "dt.series": "Seri", "dt.sold": "Terjual", "dt.ship": "Kirim", "ship.from": "Jakarta Selatan &amp; Surabaya",
      "detail": "Detail", "buy": "Beli di Shopee ↗",
      "filter.state": "Menampilkan {a} dari {b}", "reset": "Reset",
      "cur.note": 'Harga dalam {c} hanya perkiraan{when}. Pembayaran di Shopee tetap dalam Rupiah. <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener">Kurs oleh ExchangeRate-API</a>',
      "cur.when": " (kurs {d})",
      "err.load": 'Data katalog gagal dimuat. Semua produk tetap ada di <a href="https://shopee.co.id/baka_nae" target="_blank" rel="noopener">Shopee</a>.',
      "buy.pp": "Bayar PayPal",
      "pp.test": "Mode uji — belum menerima pembayaran sungguhan",
      "pp.close": "Tutup",
      "pp.loading": "Memuat PayPal…",
      "pp.unavail": "PayPal tidak tersedia saat ini. Coba lagi, atau beli lewat Shopee.",
      "pp.success": "Terima kasih! Pembayaran berhasil (No. {id}).",
      "pp.success2": "Kak Afi akan menghubungi kamu lewat email untuk pengiriman.",
      "pp.error": "Pembayaran gagal atau dibatalkan. Coba lagi, atau beli lewat Shopee."
    },
    en: {
      "meta.title": "baka nae. — Nya! ver. fanart you can hold in your hand",
      "meta.desc": "baka nae. — keychains, stickers, postcards and art prints from the Nya! ver. series. Hand-drawn since 2019. Shipped from South Jakarta & Surabaya.",
      "lang.aria": "Language (Bahasa)", "cur.aria": "Currency (Mata uang)", "nav.aria": "Main navigation",
      "nav.series": "Series", "nav.catalogue": "Catalogue", "nav.story": "Story", "nav.reviews": "Reviews", "nav.shop": "Go to Shopee",
      "hero.kicker": "Since 2019 · South Jakarta & Surabaya",
      "hero.h1": "Fanart you can <em>hold</em>.",
      "hero.lede": "Keychains, stickers and prints from the <b>Nya! ver.</b> series — drawn by hand, one at a time.",
      "hero.cta1": "See the catalogue", "hero.cta2": 'Open Shopee <span aria-hidden="true">↗</span>',
      "hero.art": "Illustration of a Nya! ver. acrylic keychain",
      "proof.aria": "Shop track record",
      "proof.sub": 'average from <b data-shop="rating_total">7,440</b> Shopee reviews',
      "proof.followers": "followers", "proof.products": "active products", "proof.since": "selling since",
      "proof.note": "Figures taken directly from the Shopee shop page, verified on 25 August 2026.",
      "series.kicker": '<span class="idx">01</span> Series',
      "series.h2": "The <em>Nya! ver.</em> universe",
      "series.lede": "Your favourite characters, cat-eared edition.",
      "cat.kicker": '<span class="idx">02</span> Catalogue',
      "cat.h2": "Best <em>sellers</em>",
      "cat.lede0": "Selected products from the shop.",
      "cat.lede": "{n} featured products from the shop — see the rest on Shopee.",
      "cat.filter.aria": "Filter by type",
      "cat.empty": "No products match this combination.",
      "cat.note": "The illustrations above are temporary drawings for layout — real product photos are coming.",
      "cat.more": 'See all 32 products on Shopee <span aria-hidden="true">↗</span>',
      "story.kicker": '<span class="idx">03</span> Story',
      "story.h2": "Drawn <em>by hand</em>, from the start.",
      "story.p1": "The sketch, the colours, even the cut lines are all done by Nae herself. No store-bought designs.",
      "story.p2": "<b>Nya! ver.</b> has been her main series since 2019 — and more than 7,400 buyers have taken one home.",
      "step.draw": "Drawn", "step.print": "Printed", "step.ship": "Shipped",
      "ship.line": "Shipped from <b>South Jakarta</b> &amp; <b>Surabaya</b>.",
      "rev.kicker": '<span class="idx">04</span> Reviews',
      "rev.h2": "What <em>buyers</em> say",
      "rev.warn": "The quotes below are still <b>placeholders</b> — not taken from real Shopee reviews yet.",
      "cta.h2": "All 32 products<br>are on Shopee.",
      "cta.p": "COD, shipping and guarantees are handled through the shop.",
      "cta.note": "Instagram & TikTok — coming soon.",
      "foot.credit": "Illustration & production by Nae",
      "foot.verified": "Shop data verified 25 Aug 2026",
      "foot.admin": "Manage shop",
      "all": "All", "series.meta.n": "{n} in catalogue", "series.meta.shop": "on Shopee",
      "dt.series": "Series", "dt.sold": "Sold", "dt.ship": "Ships from", "ship.from": "South Jakarta &amp; Surabaya",
      "detail": "Details", "buy": "Buy on Shopee ↗",
      "filter.state": "Showing {a} of {b}", "reset": "Reset",
      "cur.note": 'Prices in {c} are estimates only{when}. Payment on Shopee is still in rupiah. <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener">Rates by ExchangeRate-API</a>',
      "cur.when": " (rate of {d})",
      "err.load": 'The catalogue failed to load. All products are still on <a href="https://shopee.co.id/baka_nae" target="_blank" rel="noopener">Shopee</a>.',
      "buy.pp": "Pay with PayPal",
      "pp.test": "Test mode — not accepting real payment yet",
      "pp.close": "Close",
      "pp.loading": "Loading PayPal…",
      "pp.unavail": "PayPal isn't available right now. Try again, or buy on Shopee.",
      "pp.success": "Thank you! Payment succeeded (No. {id}).",
      "pp.success2": "Kak Afi will email you about shipping.",
      "pp.error": "Payment failed or was cancelled. Try again, or buy on Shopee."
    }
  };
  var lang = "id";
  /* The language picks the DEFAULT currency: Indonesian shows rupiah, English shows US dollars.
     The dropdown still wins: a visitor who chose another currency (AUD, SGD ...) keeps it when
     they switch language; only a currency that was the old language's default follows along. */
  var LANG_CUR = { id: "IDR", en: "USD" };
  function tr(key, vars) {
    var s = (I18N[lang] && I18N[lang][key]) || I18N.id[key] || key;
    if (vars) Object.keys(vars).forEach(function (k) { s = s.split("{" + k + "}").join(vars[k]); });
    return s;
  }
  function nloc() { return lang === "en" ? "en-US" : "id-ID"; }
  function soldText(v) { return lang === "en" ? String(v).replace(/rb/i, "K") : String(v); }
  function applyStatic() {
    document.documentElement.lang = lang;
    document.title = tr("meta.title");
    var md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute("content", tr("meta.desc"));
    $$("[data-t]").forEach(function (el) { el.textContent = tr(el.getAttribute("data-t")); });
    $$("[data-th]").forEach(function (el) { el.innerHTML = tr(el.getAttribute("data-th")); });
    $$("[data-ta]").forEach(function (el) { el.setAttribute("aria-label", tr(el.getAttribute("data-ta"))); });
    $$(".lang-toggle [data-lang]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-lang") === lang));
    });
    $$("[data-count]").forEach(function (el) {
      el.textContent = idNum(parseFloat(el.getAttribute("data-count")), parseInt(el.getAttribute("data-dp") || "0", 10));
    });
  }
  function setLang(next, user) {
    if (next !== "id" && next !== "en") next = "id";
    var prev = lang;
    lang = next;
    if (user) { try { localStorage.setItem("bakanae_lang", lang); } catch (e) { /* storage blocked */ } }
    applyStatic();
    if (DATA) {
      fillShopMeta(); renderSeries(); syncSeriesButtons(); renderPills(); renderCatalogue(); renderQuotes(); register();
    }
    refreshCurNote();
    if (user && prev !== lang && fx && curCode === LANG_CUR[prev]) setCurrency(LANG_CUR[lang], true);
  }
  try { if (localStorage.getItem("bakanae_lang") === "en") lang = "en"; } catch (e) { /* storage blocked */ }
  /* a link ending in ?lang=en (or ?lang=id) opens in that language, so she can send an English link */
  var qLang = /[?&]lang=(en|id)\b/.exec(location.search);
  if (qLang) lang = qLang[1];
  $$(".lang-toggle [data-lang]").forEach(function (b) {
    b.addEventListener("click", function () { setLang(b.getAttribute("data-lang"), true); });
  });
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
    return n.toLocaleString(nloc(), { minimumFractionDigits: dp, maximumFractionDigits: dp });
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
  var INK = "#6B4A15", PAPER = "#FBEFC0", GROUND = "#FFFFFF";
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
        '<rect x="16" y="26" width="168" height="188" rx="8" fill="#FFFFFF" stroke="' + INK + '" stroke-width="3.5"/>' +
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
  var rupiah = function (n) { return "Rp " + n.toLocaleString(nloc()); };
  /* ---------------------------------------------------------
     Currency — the same idea as the FanNest store's dropdown (symbol table, zero-decimal
     currencies, daily rates from open.er-api.com, remembered choice).
     Prices are stored in rupiah. A visitor can switch the DISPLAY to another currency; the
     amounts are approximate and the Shopee link still charges rupiah. The default is rupiah
     because most of her buyers are Indonesian; dollars appear when the visitor picks English
     with the ID/EN switch (their own choice, never guessed from the browser language) or picks
     a currency in the dropdown. (FanNest also looked the visitor's country up through
     ipapi.co; this page does not send anyone's IP to a third party.) The rate request uses USD
     as the base and converts through it, because the rupiah→dollar rate alone is only
     six decimals (about 1% rounding error on a small price).
     --------------------------------------------------------- */
  var CUR = {
    IDR:{s:"Rp "}, USD:{s:"US$"}, AUD:{s:"A$"}, SGD:{s:"S$"}, MYR:{s:"RM "}, EUR:{s:"€"}, GBP:{s:"£"},
    CAD:{s:"C$"}, NZD:{s:"NZ$"}, JPY:{s:"¥"}, CNY:{s:"¥"}, KRW:{s:"₩"}, INR:{s:"₹"}, THB:{s:"฿"},
    PHP:{s:"₱"}, VND:{s:"₫"}, TWD:{s:"NT$"}, HKD:{s:"HK$"}, BRL:{s:"R$"}, MXN:{s:"MX$"}, AED:{s:"AED "},
    SAR:{s:"SAR "}, CHF:{s:"CHF "}, SEK:{s:"kr "}, NOK:{s:"kr "}, DKK:{s:"kr "}, PLN:{s:"zł "},
    TRY:{s:"₺"}, ZAR:{s:"R "}, RUB:{s:"₽"}
  };
  var ZERO_DEC = { JPY: 1, KRW: 1, VND: 1, IDR: 1 };
  var fx = null, fxDate = "", curCode = "IDR";
  function money(idr) {
    if (curCode === "IDR" || !fx) return rupiah(idr);
    var v = idr / fx.IDR * fx[curCode];
    var out = ZERO_DEC[curCode]
      ? Math.round(v).toLocaleString("en-US")
      : v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return "≈ " + CUR[curCode].s + out;
  }
  function loadFx() {
    var cached = null;
    try { cached = JSON.parse(localStorage.getItem("bakanae_fx")); } catch (e) { cached = null; }
    var age = cached && cached.saved ? Date.now() - cached.saved : Infinity;
    if (age < 6 * 3600 * 1000 && cached.rates && cached.rates.IDR) return Promise.resolve(cached);
    return fetch("https://open.er-api.com/v6/latest/USD")
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (d) {
        if (d.result !== "success" || !d.rates || !d.rates.IDR) throw new Error("bad rates");
        var keep = {};
        Object.keys(CUR).forEach(function (c) { if (d.rates[c]) keep[c] = d.rates[c]; });
        var out = { rates: keep, date: d.time_last_update_utc, saved: Date.now() };
        try { localStorage.setItem("bakanae_fx", JSON.stringify(out)); } catch (e) { /* storage blocked */ }
        return out;
      })
      .catch(function () {
        // network down: an older saved rate is still fine for a few days, after that show rupiah only
        return age < 14 * 24 * 3600 * 1000 && cached.rates && cached.rates.IDR ? cached : null;
      });
  }
  function setCurrency(code, persist) {
    if (!fx || (code !== "IDR" && !fx[code])) return;
    curCode = code;
    var sel = $("#currencySelect");
    if (sel) sel.value = code;
    if (persist) { try { localStorage.setItem("bakanae_currency", code); } catch (e) { /* storage blocked */ } }
    if (DATA) renderCatalogue();
    refreshCurNote();
  }
  function refreshCurNote() {
    var note = $("#curNote");
    if (!note) return;
    if (curCode === "IDR") { note.hidden = true; return; }
    var when = "";
    try { when = new Date(fxDate).toLocaleDateString(nloc(), { day: "numeric", month: "short", year: "numeric" }); } catch (e) { when = ""; }
    note.innerHTML = tr("cur.note", { c: esc(CUR[curCode].s.trim()), when: when ? tr("cur.when", { d: esc(when) }) : "" });
    note.hidden = false;
  }
  function initCurrency() {
    loadFx().then(function (f) {
      var sel = $("#currencySelect");
      if (!f || !sel) return;                       // no rates: the page simply stays in rupiah
      fx = f.rates; fxDate = f.date;
      var codes = Object.keys(CUR).filter(function (c) { return fx[c]; }).sort(function (a, b) {
        var rank = function (c) { return c === "IDR" ? 0 : c === "USD" ? 1 : 2; };
        return rank(a) - rank(b) || (a < b ? -1 : 1);
      });
      sel.innerHTML = codes.map(function (c) {
        return '<option value="' + c + '">' + c + " · " + esc(CUR[c].s.trim()) + "</option>";
      }).join("");
      sel.hidden = false;
      sel.addEventListener("change", function () { setCurrency(sel.value, true); });
      var chosen = null;
      try { chosen = localStorage.getItem("bakanae_currency"); } catch (e) { chosen = null; }
      var dflt = LANG_CUR[lang];
      setCurrency(chosen && fx[chosen] ? chosen : (dflt === "IDR" || fx[dflt] ? dflt : "IDR"), false);
    });
  }
  /* ---------------------------------------------------------
     Direct payment — PayPal, for buyers currency switched to one Shopee cannot take.
     Shopee already covers rupiah, so this never shows while curCode is IDR. It is wired
     against PayPal's SHARED SANDBOX (client-id "sb"), which only accepts PayPal's own
     published test buyer logins — it cannot take a real card or a real PayPal account yet.
     That is why "pp.test" is shown on every open of the dialog, not just once. Going live
     needs Kak Afi's own PayPal Business account: swap PAYPAL_CLIENT_ID for its client id,
     nothing else in this file changes.
     A captured order is written to the `orders` table in the same Supabase project as the
     catalogue (anon INSERT only — nobody but an approved editor/owner can read the list
     back, from the admin page).
     --------------------------------------------------------- */
  var PAYPAL_CLIENT_ID = "sb"; // PayPal's public sandbox id — swap for a real client id to go live
  var PAYPAL_OK = { USD:1, EUR:1, GBP:1, AUD:1, CAD:1, SGD:1, MYR:1, NZD:1, JPY:1, CNY:1, THB:1,
    PHP:1, TWD:1, HKD:1, BRL:1, MXN:1, CHF:1, SEK:1, NOK:1, DKK:1, PLN:1 };
  var PAYPAL_ZERO_DEC = { JPY: 1, TWD: 1 };
  function paypalEligible() { return curCode !== "IDR" && PAYPAL_OK[curCode] && fx; }
  function paypalAmount(idr) {
    var v = idr / fx.IDR * fx[curCode];
    return PAYPAL_ZERO_DEC[curCode] ? String(Math.max(1, Math.round(v))) : (Math.round(v * 100) / 100).toFixed(2);
  }
  var ppLoadedFor = null, ppLoading = null;
  function loadPaypalSdk(code) {
    if (ppLoadedFor === code && window.paypal) return Promise.resolve();
    if (ppLoading && ppLoadedFor === code) return ppLoading;
    var old = document.getElementById("pp-sdk");
    if (old) old.remove();
    delete window.paypal;
    ppLoadedFor = code;
    ppLoading = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.id = "pp-sdk";
      s.src = "https://www.paypal.com/sdk/js?client-id=" + encodeURIComponent(PAYPAL_CLIENT_ID) +
        "&currency=" + encodeURIComponent(code) + "&intent=capture";
      s.onload = function () { window.paypal ? resolve() : reject(new Error("paypal sdk did not attach")); };
      s.onerror = function () { reject(new Error("paypal sdk failed to load")); };
      document.body.appendChild(s);
    });
    return ppLoading;
  }
  function recordOrder(row) {
    return fetch(CFG.url + "/rest/v1/orders", {
      method: "POST",
      headers: { apikey: CFG.key, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(row)
    });
  }
  var ppOverlay = $("#ppOverlay"), ppModal = $("#ppModal"), ppButtons = $("#ppButtons"),
    ppStatus = $("#ppStatus"), ppPrice = $("#ppPrice"), ppTitle = $("#ppModalTitle");
  function closePpModal() {
    ppOverlay.hidden = true; ppModal.hidden = true;
    ppButtons.innerHTML = ""; ppStatus.hidden = true; ppStatus.textContent = "";
  }
  $("#ppClose").addEventListener("click", closePpModal);
  ppOverlay.addEventListener("click", closePpModal);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !ppModal.hidden) closePpModal(); });
  function openPpModal(product) {
    ppTitle.textContent = esc(product.name_id);
    var amt = paypalAmount(product.price_idr);
    ppPrice.textContent = CUR[curCode].s.trim() + " " + amt + " " + curCode;
    ppButtons.innerHTML = "";
    ppStatus.hidden = true; ppStatus.className = "pp-status";
    ppOverlay.hidden = false; ppModal.hidden = false;
    ppButtons.innerHTML = '<p class="pp-load">' + esc(tr("pp.loading")) + '</p><div id="ppRender"></div>';
    loadPaypalSdk(curCode).then(function () {
      var shown = window.paypal.Buttons({
        style: { layout: "vertical", color: "black", shape: "pill", label: "paypal" },
        createOrder: function (data, actions) {
          return actions.order.create({
            purchase_units: [{ description: product.name_id.slice(0, 120), amount: { currency_code: curCode, value: amt } }]
          });
        },
        onApprove: function (data, actions) {
          return actions.order.capture().then(function (details) {
            var payer = details.payer || {};
            var name = payer.name ? [payer.name.given_name, payer.name.surname].filter(Boolean).join(" ") : null;
            recordOrder({
              product_id: /^[0-9a-f-]{36}$/i.test(product.id) ? product.id : null,
              product_name: product.name_id, qty: 1, currency: curCode, amount: Number(amt),
              paypal_order_id: data.orderID, payer_name: name, payer_email: payer.email_address || null,
              shipping: (details.purchase_units && details.purchase_units[0] && details.purchase_units[0].shipping) || null
            }).catch(function () { /* the PayPal receipt already exists even if this log write fails */ });
            ppButtons.innerHTML = "";
            ppStatus.hidden = false; ppStatus.className = "pp-status pp-ok";
            ppStatus.innerHTML = esc(tr("pp.success", { id: data.orderID })) + "<br>" + esc(tr("pp.success2"));
          });
        },
        onCancel: function () { ppStatus.hidden = false; ppStatus.className = "pp-status pp-err"; ppStatus.textContent = tr("pp.error"); },
        onError: function () { ppStatus.hidden = false; ppStatus.className = "pp-status pp-err"; ppStatus.textContent = tr("pp.error"); }
      }).render("#ppRender");
      // keep "Loading PayPal…" on screen until the buttons have actually painted
      return shown.then(function () { var l = ppButtons.querySelector(".pp-load"); if (l) l.remove(); });
    }).catch(function () {
      ppButtons.innerHTML = "";
      ppStatus.hidden = false; ppStatus.className = "pp-status pp-err"; ppStatus.textContent = tr("pp.unavail");
    });
  }
  if (lang !== "id") applyStatic();
  var CFG = window.BAKANAE || {};
  var DEFAULT_SHOP = "https://shopee.co.id/baka_nae";
  var DEFAULT_HUE = "#7A5518";
  /* Everything below can now come from a database an editor typed into, so every
     value is escaped on the way into markup, links must be https, and a colour must
     be a plain hex — nothing a form field holds can become script or CSS. */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function safeUrl(u) { return /^https:\/\//i.test(u || "") ? u : DEFAULT_SHOP; }
  function safeHue(h) { return /^#[0-9a-f]{6}$/i.test(h || "") ? h : DEFAULT_HUE; }
  /* Her real listing convention is "<Series> Nya! ver. <Type>";
     the snapshot in products.json drops the "ver." — restore it there only
     (the database already holds the correct titles). */
  function realTitle(name) {
    return name.replace(/\bNya!(?!\s*ver\.)\s+/g, "Nya! ver. ");
  }
  function photoUrl(path) {
    return path
      ? CFG.url + "/storage/v1/object/public/" + (CFG.bucket || "product-photos") + "/" + path.split("/").map(encodeURIComponent).join("/")
      : null;
  }
  /* The shop's live catalogue is the database. products.json stays as a snapshot so
     the page still works if the database is paused or unreachable — a fetch ERROR
     falls back to it, an EMPTY answer does not (an empty shelf is a real state). */
  function dbGet(path) {
    return fetch(CFG.url + "/rest/v1/" + path, { headers: { apikey: CFG.key } }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }
  function fromDatabase() {
    if (!CFG.url || !CFG.key || CFG.url.indexOf("__") === 0) return Promise.reject(new Error("no config"));
    return Promise.all([
      dbGet("series?select=slug,name_id,hue&order=sort_order.asc,slug.asc"),
      dbGet("products?select=id,name_id,price_idr,series,type_id,sold_display,shopee_url,image_path&visible=eq.true&order=sort_order.asc,created_at.asc")
    ]).then(function (r) {
      return { series: r[0], products: r[1] };
    });
  }
  function fromSnapshot(snap) {
    return {
      series: Object.keys(snap.series_meta).map(function (slug) {
        return { slug: slug, name_id: snap.series_meta[slug].name_id, hue: snap.series_meta[slug].hue };
      }),
      products: snap.featured.map(function (p) {
        // snapshot "image" paths point at a folder that was never filled — ignore them
        return { id: p.id, name_id: realTitle(p.name_id), price_idr: p.price_idr, series: p.series,
          type_id: p.type_id, sold_display: p.sold_display, shopee_url: p.shopee_url, image_path: null };
      })
    };
  }
  function shape(raw, snap) {
    var meta = {}, order = [];
    raw.series.forEach(function (s) { meta[s.slug] = { name_id: s.name_id, hue: safeHue(s.hue) }; order.push(s.slug); });
    var types = [];
    raw.products.forEach(function (p) { if (types.indexOf(p.type_id) < 0) types.push(p.type_id); });
    return {
      shop_meta: snap.shop_meta,
      series_meta: meta,
      series_order: order,
      type_filters: [{ id: "all", name_id: "Semua" }].concat(types.map(function (t) { return { id: t, name_id: t }; })),
      featured: raw.products.map(function (p) {
        return { id: p.id, name_id: p.name_id, price_idr: p.price_idr, series: p.series, type_id: p.type_id,
          sold_display: p.sold_display || "", shopee_url: safeUrl(p.shopee_url), image_url: photoUrl(p.image_path) };
      })
    };
  }
  Promise.all([
    fetch("data/products.json").then(function (r) { return r.json(); }),
    fetch("data/testimonials.json").then(function (r) { return r.json(); }),
    fromDatabase().catch(function (err) { console.warn("Database tidak terjangkau, memakai salinan katalog:", err.message); return null; })
  ]).then(function (res) {
    var snap = res[0];
    DATA = shape(res[2] || fromSnapshot(snap), snap);
    QUOTES = res[1];
    fillShopMeta();
    renderSeries();
    renderPills();
    renderCatalogue();
    renderQuotes();
    register();
    initCurrency();
  }).catch(function (err) {
    console.error("Gagal memuat data:", err);
    var g = $("#catGrid");
    if (g) g.innerHTML = '<p class="empty">' + tr("err.load") + "</p>";
    register();
  });
  function fillShopMeta() {
    var m = DATA.shop_meta;
    $$("[data-shop]").forEach(function (el) {
      var k = el.getAttribute("data-shop");
      if (m[k] == null) return;
      var b = el.querySelector("[data-count]");
      if (b) { b.setAttribute("data-count", m[k]); b.textContent = m[k].toLocaleString(nloc()); }
      else el.textContent = m[k].toLocaleString(nloc());
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
    var slugs = DATA.series_order;
    grid.innerHTML = slugs.map(function (slug, i) {
      var s = DATA.series_meta[slug];
      var n = countFor(slug);
      return '<button class="series-card" type="button" data-series="' + esc(slug) + '" aria-pressed="false" data-rise style="--d:' + (i * 55) + 'ms">' +
        '<span class="series-face"><svg viewBox="-16 -18.5 32 30" style="--art-hue:' + s.hue + '" aria-hidden="true"><use href="#nya-mini"/></svg></span>' +
        '<span class="series-name">' + esc(s.name_id) + '</span>' +
        '<span class="series-meta">' + (n ? tr("series.meta.n", { n: n }) : tr("series.meta.shop")) + "</span>" +
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
      return '<button class="pill" type="button" data-type="' + esc(t.id) + '" aria-pressed="' +
        (state.type === t.id) + '">' + esc(t.id === "all" ? tr("all") : t.name_id) + "</button>";
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
      var s = DATA.series_meta[p.series] || { name_id: p.series, hue: DEFAULT_HUE };
      var art = p.image_url
        ? '<div class="card-art has-photo"><img class="card-photo" src="' + esc(p.image_url) + '" alt="' + esc(p.name_id) + '" loading="lazy" decoding="async">'
        : '<div class="card-art">' + artFor(p.type_id, s.hue);
      return '<article class="card" data-rise style="--d:' + Math.min(i, 5) * 60 + 'ms">' +
        art + '<span class="card-type">' + esc(p.type_id) + "</span>" +
        "</div>" +
        '<div class="card-body">' +
          '<h3 class="card-name">' + esc(p.name_id) + "</h3>" +
          '<p class="card-price"' + (curCode !== "IDR" && fx ? ' title="' + esc(rupiah(p.price_idr)) + '"' : "") + ">" + money(p.price_idr) + "</p>" +
        "</div>" +
        '<div class="card-detail" data-open="false" id="d-' + esc(p.id) + '"><div><dl>' +
          "<dt>" + tr("dt.series") + "</dt><dd>" + esc(s.name_id) + "</dd>" +
          (p.sold_display ? "<dt>" + tr("dt.sold") + "</dt><dd>" + esc(soldText(p.sold_display)) + "</dd>" : "") +
          "<dt>" + tr("dt.ship") + "</dt><dd>" + tr("ship.from") + "</dd>" +
        "</dl></div></div>" +
        '<div class="card-foot">' +
          '<button class="detail-toggle" type="button" aria-expanded="false" aria-controls="d-' + esc(p.id) + '">' +
            tr("detail") + ' <span class="chev" aria-hidden="true">▾</span></button>' +
          (paypalEligible() ? '<button class="buy buy-pp" type="button" data-pp="' + esc(p.id) + '">' + tr("buy.pp") + "</button>" : "") +
          '<a class="buy" href="' + esc(p.shopee_url) + '" target="_blank" rel="noopener">' + tr("buy") + "</a>" +
        "</div>" +
        "</article>";
    }).join("");
    $("#catEmpty").hidden = list.length > 0;
    // the "drawn placeholder" note only applies while some product still has no photo
    var note = $("#catNote");
    if (note) note.hidden = !list.some(function (p) { return !p.image_url; });
    var lede = $("#catLede");
    if (lede) lede.textContent = tr("cat.lede", { n: DATA.featured.length });
    $$(".detail-toggle", grid).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var panel = document.getElementById(btn.getAttribute("aria-controls"));
        var open = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!open));
        panel.setAttribute("data-open", String(!open));
      });
    });
    $$("[data-pp]", grid).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var p = DATA.featured.filter(function (x) { return String(x.id) === btn.getAttribute("data-pp"); })[0];
        if (p) openPpModal(p);
      });
    });
    var srs = state.series ? (DATA.series_meta[state.series] || {}).name_id : null;
    $("#filterState").innerHTML =
      tr("filter.state", { a: list.length, b: DATA.featured.length }) +
      (srs || state.type !== "all"
        ? ' <button class="clear-filter" type="button" id="clearFilter">' + tr("reset") +
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
        "<p>" + (lang === "en" && q.text_en ? q.text_en : q.text_id) + "</p>" +
        "<footer>" +
          '<span class="quote-face"><svg viewBox="-16 -18.5 32 30" style="--art-hue:' + s.hue + '" aria-hidden="true"><use href="#nya-mini"/></svg></span>' +
          "<b>" + q.author + "</b><span>" + (lang === "en" && q.meta_en ? q.meta_en : q.meta_id) + "</span>" +
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
