/* =========================================================
   baka nae. — "peel"
   The object is a kiss-cut sticker sheet. Peeling a sticker is the
   only way to read its price: the spec is printed on the backing,
   which is exactly what a kiss-cut sticker leaves behind.
   ========================================================= */

(() => {
  "use strict";

  const PEEK = 0.58;   // how far a click peels
  const TAKE = 0.45;   // backing "AMBIL" becomes live past this
  const state = { data: null, series: "all", picked: new Map() };

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const idr = n => "Rp " + n.toLocaleString("id-ID");
  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------------------------------------------------------
     Sticker artwork.
     There is no product photography and inventing some would
     misrepresent her work, so each sticker is drawn: a die-cut
     cat-eared badge (that IS "Nya! ver.") tinted by its series,
     with a small mark for the product format.
     This is also the first use of series_meta[].hue, which was
     dead data on the old build.
     --------------------------------------------------------- */
  function formatMark(type) {
    switch (type) {
      case "Keychain":    return `<circle cx="50" cy="20" r="7" fill="none" stroke="currentColor" stroke-width="3"/>`;
      case "Phone Strap": return `<path d="M50 8 q14 10 0 20 q-14 10 0 18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>`;
      case "Sticker":     return `<path d="M28 26 h44 v30 h-44 z" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="5 4"/>`;
      case "Postcard":    return `<rect x="26" y="28" width="48" height="30" rx="2" fill="none" stroke="currentColor" stroke-width="3"/>`;
      case "Photocard":   return `<rect x="36" y="22" width="28" height="40" rx="2" fill="none" stroke="currentColor" stroke-width="3"/>`;
      case "Art Print":   return `<rect x="24" y="24" width="52" height="38" rx="1" fill="none" stroke="currentColor" stroke-width="3"/><path d="M24 52 l14-12 10 9 12-14 16 17" fill="none" stroke="currentColor" stroke-width="3"/>`;
      default:            return `<circle cx="50" cy="40" r="14" fill="none" stroke="currentColor" stroke-width="3"/>`;
    }
  }

  function stickerSVG(p, hue, seriesTag) {
    // die-cut: a white border offset around a cat-eared badge
    return `
    <svg viewBox="0 0 100 133" role="img" aria-label="${esc(p.name_id)}">
      <defs>
        <clipPath id="cut-${esc(p.id)}">
          <path d="M22 34 L34 12 L48 30 Q50 29 52 30 L66 12 L78 34
                   Q92 48 92 80 Q92 118 50 124 Q8 118 8 80 Q8 48 22 34 Z"/>
        </clipPath>
      </defs>
      <!-- kiss-cut white border -->
      <path d="M22 34 L34 12 L48 30 Q50 29 52 30 L66 12 L78 34
               Q92 48 92 80 Q92 118 50 124 Q8 118 8 80 Q8 48 22 34 Z"
            fill="#FBF9F3" stroke="#00000014" stroke-width="1"/>
      <g clip-path="url(#cut-${esc(p.id)})">
        <path d="M26 38 L36 19 L48 34 Q50 33 52 34 L64 19 L74 38
                 Q87 51 87 80 Q87 113 50 119 Q13 113 13 80 Q13 51 26 38 Z"
              fill="${esc(hue)}"/>
        <!-- inner ear -->
        <path d="M34 22 L40 33 L30 32 Z" fill="#FBF9F3" opacity="0.55"/>
        <path d="M66 22 L60 33 L70 32 Z" fill="#FBF9F3" opacity="0.55"/>
        <!-- face -->
        <circle cx="40" cy="66" r="3.6" fill="#1B1620"/>
        <circle cx="60" cy="66" r="3.6" fill="#1B1620"/>
        <path d="M45 76 q5 5 10 0" fill="none" stroke="#1B1620" stroke-width="2.6" stroke-linecap="round"/>
        <!-- format mark: sits BELOW the face, between mouth and tag.
             Centres the mark's own (50,40) at (50,94) and shrinks it. -->
        <g transform="translate(50,94) scale(0.30) translate(-50,-40)" color="#1B1620" opacity="0.45">
          ${formatMark(p.type_en)}
        </g>
        <text x="50" y="112" text-anchor="middle"
              font-family="'Space Mono', monospace" font-size="8"
              letter-spacing="1.4" fill="#1B1620" opacity="0.62">${esc(seriesTag)}</text>
      </g>
    </svg>`;
  }

  /* --------------------------------------------------------- */
  function seriesName(slug) {
    const m = state.data.series_meta[slug];
    return m ? m.name_id : slug;
  }
  function seriesHue(slug) {
    const m = state.data.series_meta[slug];
    return (m && m.hue) || "#B8A8C4";
  }
  function shortTag(slug) {
    return ({ aot: "AOT", haikyuu: "HQ!!", bnha: "BNHA", mtp: "MTP", jjk: "JJK", drstone: "DR.ST" })[slug]
      || slug.slice(0, 5).toUpperCase();
  }

  function visible() {
    const list = state.data.featured;
    return state.series === "all" ? list : list.filter(p => p.series === state.series);
  }

  /* ---------------- tabs ---------------- */
  function renderTabs() {
    const wrap = $("#tabs");
    const slugs = ["all", ...Object.keys(state.data.series_meta)];
    wrap.innerHTML = slugs.map(s => {
      const on = state.series === s;
      const label = s === "all" ? "semua" : seriesName(s);
      return `<button class="tab" role="tab" data-series="${esc(s)}" aria-selected="${on}">${esc(label)}</button>`;
    }).join("");
  }

  /* ---------------- the sheet ---------------- */
  function renderSheet() {
    const grid = $("#grid");
    const list = visible();

    grid.innerHTML = list.map(p => {
      const hue = seriesHue(p.series);
      const taken = state.picked.has(p.id);
      return `
      <div class="slot" data-id="${esc(p.id)}" data-picked="${taken}" style="--peel:0">
        <div class="backing">
          <div class="backing__reg"><span>+</span><span>${esc(shortTag(p.series))}</span><span>+</span></div>
          <div class="backing__spec">
            <span class="backing__price">${esc(idr(p.price_idr))}</span>
            <span class="backing__line">${esc(p.type_id)}</span>
            <span class="backing__line">${esc(p.sold_display)} terjual</span>
          </div>
          <button class="backing__take" type="button" data-take="${esc(p.id)}" tabindex="-1" aria-hidden="true">ambil +</button>
        </div>
        <button class="sticker" type="button" data-peel="${esc(p.id)}"
                aria-label="${esc(p.name_id)} — ${esc(idr(p.price_idr))}. Kupas untuk lihat keterangan.">
          <span class="sticker__face">${stickerSVG(p, hue, shortTag(p.series))}</span>
          <span class="sticker__back" aria-hidden="true"></span>
        </button>
      </div>`;
    }).join("") || `<p class="micro" style="grid-column:1/-1;padding:24px 0">( tidak ada stiker di seri ini )</p>`;

    // Initialise every slot through the same path an interaction uses, so the
    // starting state is explicit rather than "whatever the markup happened to be".
    $$(".slot", grid).forEach(s => setPeel(s, 0));

    $("#sheet-code").textContent = `SHEET / ${state.series === "all" ? "ALL" : shortTag(state.series)}`;
    $("#sheet-count").textContent = `${String(list.length).padStart(2, "0")} stiker`;
  }

  /* ---------------- peel mechanics ----------------
     peel is a 0..1 value stored on the slot. It drives the rotation,
     the sheen, the drop shadow, and whether the backing's AMBIL is live.
     Nothing animates on its own — every frame here is caused by a pointer
     or a key. */
  function setPeel(slot, v) {
    v = Math.max(0, Math.min(1, v));
    slot.style.setProperty("--peel", v.toFixed(3));
    const sticker = $(".sticker", slot);
    // hinge on the left edge; lift toward the viewer as it goes
    sticker.style.transform =
      `rotateY(${(-v * 124).toFixed(2)}deg) translateZ(${(v * 20).toFixed(2)}px)`;
    // The spec fades in with the lift. Written here rather than as a CSS
    // calc() on --peel: that resolved to 0 even with --peel correctly at
    // 0.580 on the element, so the reveal silently never happened.
    const reveal = Math.max(0, Math.min(1, (v - 0.10) * 2.6));
    const spec = $(".backing__spec", slot);
    const take = $(".backing__take", slot);
    if (spec) spec.style.opacity = reveal.toFixed(3);
    take.style.opacity = reveal.toFixed(3);

    const live = v >= TAKE;
    take.tabIndex = live ? 0 : -1;
    take.setAttribute("aria-hidden", live ? "false" : "true");
    take.style.pointerEvents = live ? "auto" : "none";
    slot.dataset.peel = v.toFixed(3);
  }
  const getPeel = slot => parseFloat(slot.dataset.peel || "0");

  function pick(id) {
    const p = state.data.featured.find(x => x.id === id);
    if (!p || state.picked.has(id)) return;
    state.picked.set(id, p);
    const slot = $(`.slot[data-id="${CSS.escape(id)}"]`);
    if (slot) { slot.dataset.picked = "true"; }
    renderTray();
  }
  function unpick(id) {
    state.picked.delete(id);
    const slot = $(`.slot[data-id="${CSS.escape(id)}"]`);
    if (slot) { slot.dataset.picked = "false"; setPeel(slot, 0); }
    renderTray();
  }

  function renderTray() {
    const items = $("#tray-items");
    const n = state.picked.size;
    $("#tray-count").textContent = String(n);
    $("#tray").dataset.has = n > 0 ? "true" : "false";
    const total = [...state.picked.values()].reduce((s, p) => s + p.price_idr, 0);
    $("#tray-total").textContent = idr(total);
    items.innerHTML = n === 0
      ? `<span class="tray__empty micro">belum ada yang dikupas</span>`
      : [...state.picked.values()].map(p => `
        <span class="chip">
          <span class="chip__swatch" style="background:${esc(seriesHue(p.series))}"></span>
          ${esc(p.type_id)} &middot; ${esc(idr(p.price_idr))}
          <button class="chip__x" type="button" data-unpick="${esc(p.id)}" aria-label="Hapus ${esc(p.name_id)}">×</button>
        </span>`).join("");
  }

  /* ---------------- input ---------------- */
  function bindSheet() {
    const grid = $("#grid");
    let drag = null;

    grid.addEventListener("pointerdown", e => {
      const sticker = e.target.closest(".sticker");
      if (!sticker) return;
      const slot = sticker.closest(".slot");
      drag = { slot, x0: e.clientX, base: getPeel(slot), moved: false, w: slot.offsetWidth || 160 };
      slot.dataset.dragging = "true";
      sticker.setPointerCapture?.(e.pointerId);
    });

    grid.addEventListener("pointermove", e => {
      if (!drag) return;
      const dx = drag.x0 - e.clientX;           // drag LEFT to peel back
      if (Math.abs(dx) > 3) drag.moved = true;
      setPeel(drag.slot, drag.base + dx / (drag.w * 0.85));
    });

    const endDrag = () => {
      if (!drag) return;
      const { slot, moved } = drag;
      slot.dataset.dragging = "false";
      const v = getPeel(slot);
      if (moved) {
        // released past the threshold: it comes off the sheet
        if (v > 0.72) { setPeel(slot, 1); pick(slot.dataset.id); }
        else if (v > 0.28) setPeel(slot, PEEK);
        else setPeel(slot, 0);
      }
      drag = null;
    };
    grid.addEventListener("pointerup", endDrag);
    grid.addEventListener("pointercancel", endDrag);

    // click / keyboard: peek, then flatten
    grid.addEventListener("click", e => {
      const take = e.target.closest("[data-take]");
      if (take) { pick(take.dataset.take); return; }
      const sticker = e.target.closest(".sticker");
      if (!sticker || (drag && drag.moved)) return;
      const slot = sticker.closest(".slot");
      setPeel(slot, getPeel(slot) > 0.05 ? 0 : PEEK);
    });

    $("#tray-items").addEventListener("click", e => {
      const x = e.target.closest("[data-unpick]");
      if (x) unpick(x.dataset.unpick);
    });

    $("#tabs").addEventListener("click", e => {
      const tab = e.target.closest(".tab");
      if (!tab) return;
      state.series = tab.dataset.series;
      renderTabs(); renderSheet();
    });
  }

  /* ---------------- proof ---------------- */
  function renderProof() {
    const m = state.data.shop_meta;
    const years = new Date().getFullYear() - m.est_year;
    const cells = [
      [String(years), "tahun berkarya"],
      [(m.followers / 1000).toFixed(1) + "k", "pengikut"],
      [m.rating_avg.toFixed(2) + "<em> / 5</em>", `dari ${m.rating_total.toLocaleString("id-ID")} ulasan`],
      [String(m.item_count), "produk aktif"],
    ];
    $("#proof-row").innerHTML = cells.map(([n, l]) => `
      <div class="proof__cell reveal">
        <div class="proof__num">${n}</div>
        <div class="proof__lab micro">${esc(l)}</div>
      </div>`).join("");
    $("#bar-stat").textContent = `${m.item_count} produk · ${m.rating_avg.toFixed(2)}★`;
  }

  /* ---------------- reveal ----------------
     A rAF position sweep, not IntersectionObserver: IO delivers
     asynchronously and a fast flick-scroll or an anchor jump can pass an
     element without it ever being reported, leaving it stuck at opacity 0. */
  function initReveal() {
    document.documentElement.classList.add("motion");
    const els = $$(".reveal");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach(el => el.classList.add("in"));
      return;
    }
    let queued = false;
    const sweep = () => {
      queued = false;
      const h = window.innerHeight;
      els.forEach(el => {
        if (el.classList.contains("in")) return;
        if (el.getBoundingClientRect().top < h * 0.92) el.classList.add("in");
      });
    };
    const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(sweep); } };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    sweep();
  }

  /* ---------------- boot ---------------- */
  async function boot() {
    try {
      state.data = await fetch("data/products.json").then(r => r.json());
    } catch (err) {
      console.error("[peel] gagal muat data:", err);
      return;
    }
    renderTabs();
    renderSheet();
    renderTray();
    renderProof();
    bindSheet();
    initReveal();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
