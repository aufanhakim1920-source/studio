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
  /* Each product FORMAT gets its own die-cut silhouette and its own footprint
     on the sheet, because a real sticker sheet is a mix of shapes and sizes —
     not one outline repeated. Nine identical blobs was the flaw in the first
     pass of this build. */
  const FORMS = {
    "Keychain":    { span: "s1x1", shape: "charm", box: "0 0 100 100" },
    "Phone Strap": { span: "s1x1", shape: "strap", box: "0 0 100 100" },
    "Sticker":     { span: "s1x1", shape: "wavy",  box: "0 0 100 100" },
    "Photocard":   { span: "s1x1", shape: "tall",  box: "0 0 100 100" },
    "Postcard":    { span: "s2x1", shape: "wide",  box: "0 0 100 68"  },
    "Art Print":   { span: "s2x2", shape: "print", box: "0 0 100 100" },
  };
  const formOf = t => FORMS[t] || { span: "s1x1", shape: "charm", box: "0 0 100 100" };

  /* die-cut outlines, drawn in a 0..100 x 0..100 box so every shape can share
     one viewBox and the white kiss-cut border is just the same path, fatter. */
  function outline(shape) {
    switch (shape) {
      case "charm":  // cat-eared blob with a punched hole
        return "M26 36 L36 15 L48 32 Q50 31 52 32 L64 15 L74 36 Q90 50 90 68 Q90 92 50 97 Q10 92 10 68 Q10 50 26 36 Z";
      case "strap":  // narrower blob, cord loop at the top
        return "M30 40 L38 20 L48 34 Q50 33 52 34 L62 20 L70 40 Q84 52 84 68 Q84 88 50 93 Q16 88 16 68 Q16 52 30 40 Z";
      case "wavy":   // irregular kiss-cut sticker
        return "M18 30 Q34 18 50 24 Q68 16 82 30 Q94 46 88 64 Q92 84 72 90 Q52 100 34 90 Q12 84 12 62 Q8 44 18 30 Z";
      case "tall":   // photocard
        return "M20 10 h60 a6 6 0 0 1 6 6 v68 a6 6 0 0 1 -6 6 h-60 a6 6 0 0 1 -6 -6 v-68 a6 6 0 0 1 6 -6 Z";
      case "wide":   // postcard, landscape (drawn in a 100x68 box)
        return "M8 8 h84 a5 5 0 0 1 5 5 v42 a5 5 0 0 1 -5 5 h-84 a5 5 0 0 1 -5 -5 v-42 a5 5 0 0 1 5 -5 Z";
      case "print":  // art print, biggest
        return "M10 8 h80 a3 3 0 0 1 3 3 v78 a3 3 0 0 1 -3 3 h-80 a3 3 0 0 1 -3 -3 v-78 a3 3 0 0 1 3 -3 Z";
      default:       return "M10 10 h80 v80 h-80 Z";
    }
  }

  /* the cat face — placed where each shape has room for it */
  function face(shape) {
    const at = { charm: [50, 62, 1], strap: [50, 62, 0.86], wavy: [50, 58, 1],
                 tall:  [50, 46, 0.78], wide: [50, 32, 0.62], print: [50, 46, 0.86] }[shape] || [50, 60, 1];
    const [cx, cy, k] = at;
    return `<g transform="translate(${cx},${cy}) scale(${k}) translate(${-cx},${-cy})">
      <path d="M${cx - 17} ${cy - 22} L${cx - 11} ${cy - 34} L${cx - 3} ${cy - 24} Z" fill="#FBF9F3" opacity="0.6"/>
      <path d="M${cx + 17} ${cy - 22} L${cx + 11} ${cy - 34} L${cx + 3} ${cy - 24} Z" fill="#FBF9F3" opacity="0.6"/>
      <circle cx="${cx - 9}" cy="${cy}" r="3.4" fill="#241615"/>
      <circle cx="${cx + 9}" cy="${cy}" r="3.4" fill="#241615"/>
      <path d="M${cx - 4} ${cy + 9} q4 4.5 8 0" fill="none" stroke="#241615" stroke-width="2.4" stroke-linecap="round"/>
    </g>`;
  }

  function stickerSVG(p, hue, seriesTag) {
    const { shape, box } = formOf(p.type_en);
    const d = outline(shape);
    const uid = "cut-" + esc(p.id);
    // default preserveAspectRatio (meet) — never "none", which distorted the
    // face and ears when a 100x100 drawing was forced into a 3:2 cell
    return `
    <svg viewBox="${box}" role="img" aria-label="${esc(p.name_id)}">
      <defs><clipPath id="${uid}"><path d="${d}"/></clipPath></defs>
      <!-- the white kiss-cut border: same outline, stroked wide, drawn under -->
      <path d="${d}" fill="#FBF9F3" stroke="#FBF9F3" stroke-width="7" stroke-linejoin="round"/>
      <g clip-path="url(#${uid})">
        <path d="${d}" fill="${esc(hue)}"/>
        ${face(shape)}
        <text x="50" y="${shape === "wide" ? 60 : 93}" text-anchor="middle" font-family="'Space Mono', monospace"
              font-size="7" letter-spacing="1.6" fill="#241615" opacity="0.6">${esc(seriesTag)}</text>
      </g>
      <path d="${d}" fill="none" stroke="#00000018" stroke-width="1"/>
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
      <div class="slot ${formOf(p.type_en).span}" data-id="${esc(p.id)}" data-picked="${taken}"
           style="--peel:0; --tilt:${(p.tilt || 0).toFixed(2)}deg">
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
