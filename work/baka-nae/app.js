/* baka nae. — THE SPRUE
   One object: a parts runner. Nip a part off it and it lands in the tray.

   ── what changed, and why ────────────────────────────────────────────────
   The first pass drew six near-identical cat-shaped blanks with a small
   picture floating in the middle of each. That did not look like anything
   she actually sells, which is what "not executed correctly" meant.

   Now the four runners are four REAL product forms, so switching A→B→C→D
   visibly changes the object in your hands:

     A  GANTUNGAN  acrylic charm  — die-cut, glossy, punched hole + split ring
     B  STIKER     die-cut sticker — same cut line, matte, no hole
     C  CETAK      art print       — paper sheet, white margin
     D  KARTU      photocard       — rounded card, glossy, caption band

   The die-cut outline is generated from her own artwork's alpha channel
   (assets/charm-cut.png), so the cut follows the character the way a real
   acrylic charm is cut — it is not a generic silhouette we invented. */

const SHOPEE = "https://shopee.co.id/baka_nae";

/* ── strings ─────────────────────────────────────────────────── */
const STR = {
  id: {
    handle: "SHOPEE · @baka_nae",
    tag:    "Merch fanart, digambar tangan sendiri sejak 2020.",
    hint:   "Klik satu bagian untuk melepasnya.",
    buy:    "BELI DI SHOPEE",
    ink:    "LOLOS QC · 4,97★ dari 7.440 ulasan · 10.711 pengikut",
    format: "Format",
    shop:   "LIHAT DI SHOPEE",
    close:  "Tutup",
    wellhint: "Bagian yang kamu lepas jatuh ke sini.",
    prev:   "Bagian sebelumnya",
    next:   "Bagian berikutnya",
    runners: [
      { name: "GANTUNGAN", fmt: "Gantungan akrilik" },
      { name: "STIKER",    fmt: "Stiker die-cut"    },
      { name: "CETAK",     fmt: "Art print"         },
      { name: "KARTU",     fmt: "Photocard"         },
    ],
  },
  en: {
    handle: "SHOPEE · @baka_nae",
    tag:    "Fanart merch, drawn by hand since 2020.",
    hint:   "Click one part to snap it off.",
    buy:    "BUY ON SHOPEE",
    ink:    "QC PASS · 4.97★ from 7,440 reviews · 10,711 followers",
    format: "Format",
    shop:   "VIEW ON SHOPEE",
    close:  "Close",
    wellhint: "Parts you snap off land here.",
    prev:   "Previous part",
    next:   "Next part",
    runners: [
      { name: "CHARMS",   fmt: "Acrylic charm"   },
      { name: "STICKERS", fmt: "Die-cut sticker" },
      { name: "PRINTS",   fmt: "Art print"       },
      { name: "CARDS",    fmt: "Photocard"       },
    ],
  },
};

/* Edition numbering, not series names. Her cat-eared line really is called
   "Nya! ver."; WHICH anime she draws could not be verified from the Shopee
   API, and naming third-party series on her shop page would be an invented
   claim about her catalogue. */
const SERIES = ["01", "02", "03", "04", "05", "06"];

const LETTERS = ["A", "B", "C", "D"];

/* six colourways — the pocket each part sits in is tinted, which is how one
   design reads as a six-piece run without faking six designs we do not have */
const TINTS = ["#F0CFE0", "#CFE6DA", "#F6E3C2", "#CFDAF2", "#E8CEF0", "#F2D5C6"];

const ART = "assets/charm-art.png";
const CUT = "assets/charm-cut.png";

/* ── the four product forms ──────────────────────────────────── */
const FORMS = [
  { kind: "diecut", w: 144, h: 144, hole: true,  gloss: 0.50 },  // A charm
  { kind: "diecut", w: 144, h: 144, hole: false, gloss: 0.10 },  // B sticker
  { kind: "paper",  w: 116, h: 150, hole: false, gloss: 0.06 },  // C print
  { kind: "card",   w: 108, h: 152, hole: false, gloss: 0.34 },  // D photocard
];
const form = () => FORMS[runner];
const topOf = () => -form().h / 2;
const botOf = () =>  form().h / 2;

/* six cells on the runner */
const CELLS = [
  { cx: 157.5, cy: 199, gt: 114, gb: 284 },
  { cx: 402.5, cy: 199, gt: 114, gb: 284 },
  { cx: 157.5, cy: 376, gt: 294, gb: 458 },
  { cx: 402.5, cy: 376, gt: 294, gb: 458 },
  { cx: 157.5, cy: 548, gt: 468, gb: 628 },
  { cx: 402.5, cy: 548, gt: 468, gb: 628 },
];

/* ── state ───────────────────────────────────────────────────── */
let lang = localStorage.getItem("bakanae-lang") || "id";
let runner = 0;
const snapped = [new Set(), new Set(), new Set(), new Set()];
let open = null;

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ── defs ────────────────────────────────────────────────────────
   ⚠️ A <g> is NOT a legal child of <clipPath> or <mask> content in the way
   it was used here before: a <g> inside <clipPath> is silently ignored,
   which makes the clipPath EMPTY, and an empty clip path clips its target
   away completely. That bug hid the printed artwork entirely. The mask
   below uses an <image> directly, in part-local user space, so one mask
   serves every part. */
function buildDefs() {
  const f = FORMS[0];                       // die-cut geometry, shared
  $("#clips").innerHTML = `
    <mask id="m-diecut" maskUnits="userSpaceOnUse"
          x="${-f.w / 2}" y="${-f.h / 2}" width="${f.w}" height="${f.h}">
      <image href="${CUT}" x="${-f.w / 2}" y="${-f.h / 2}"
             width="${f.w}" height="${f.h}"/>
    </mask>
    <linearGradient id="g-gloss" x1="0" y1="0" x2="0.7" y2="1">
      <stop offset="0"    stop-color="#fff" stop-opacity=".95"/>
      <stop offset=".38"  stop-color="#fff" stop-opacity=".18"/>
      <stop offset=".55"  stop-color="#fff" stop-opacity="0"/>
    </linearGradient>`;
}

/* six emptied runners behind the live one — one for every year of the shop */
function buildSpent() {
  const now = 2026;
  let out = "";
  for (let i = 5; i >= 0; i--) {
    const dx = -(10 + 8 * i), dy = -(7 + 6 * i);
    out += `<g class="spent" transform="translate(${dx},${dy})" opacity="${(0.5 - i * 0.062).toFixed(2)}">
      <rect class="spent-fill" x="22" y="22" width="516" height="658"/>
      <rect class="spent-f" x="22" y="22" width="516" height="658"/>
      <text class="yr" x="16" y="14">${now - 1 - i}</text>
    </g>`;
  }
  $("#spent").innerHTML = out;
}

/* ── one part, drawn in whichever form this runner is ─────────── */
function formMarkup(i, big) {
  const f = form();
  const x = -f.w / 2, y = -f.h / 2;
  const tint = TINTS[i];
  let s = "";

  if (f.kind === "diecut") {
    // the white acrylic/vinyl cut, then her artwork registered on top of it
    s += `<image class="p-cut-img" href="${CUT}" x="${x}" y="${y}" width="${f.w}" height="${f.h}"/>`;
    s += `<image class="p-art" href="${ART}" x="${x}" y="${y}" width="${f.w}" height="${f.h}"/>`;
    if (f.gloss > 0.2) {
      s += `<g mask="url(#m-diecut)"><rect x="${x}" y="${y}" width="${f.w}" height="${f.h}"
              fill="url(#g-gloss)" opacity="${f.gloss}"/></g>`;
    }
    if (f.hole) {
      s += `<circle class="p-hole" cx="0" cy="${(y + 17).toFixed(0)}" r="6.4"/>`;
      s += `<circle class="p-ring" cx="0" cy="${(y + 6).toFixed(0)}" r="10"/>`;
    }
  } else if (f.kind === "paper") {
    s += `<rect class="p-paper" x="${x}" y="${y}" width="${f.w}" height="${f.h}"/>`;
    s += `<rect class="p-plate" x="${x + 9}" y="${y + 9}" width="${f.w - 18}" height="${f.w - 18}" fill="${tint}" opacity=".5"/>`;
    s += `<image class="p-art" href="${ART}" x="${x + 9}" y="${y + 7}" width="${f.w - 18}" height="${f.w - 18}"/>`;
    s += `<text class="p-cap" x="0" y="${(y + f.h - 14).toFixed(0)}">NYA! VER. ${SERIES[i]}</text>`;
  } else {
    s += `<rect class="p-card" x="${x}" y="${y}" width="${f.w}" height="${f.h}" rx="7"/>`;
    s += `<rect class="p-plate" x="${x + 7}" y="${y + 7}" width="${f.w - 14}" height="${f.h - 34}" rx="4" fill="${tint}" opacity=".62"/>`;
    s += `<image class="p-art" href="${ART}" x="${x + 4}" y="${y + 2}" width="${f.w - 8}" height="${f.w - 8}"/>`;
    s += `<text class="p-cap" x="0" y="${(y + f.h - 11).toFixed(0)}">NYA! VER. ${SERIES[i]}</text>`;
    s += `<g mask="none"><rect class="p-sheen" x="${x}" y="${y}" width="${f.w}" height="${f.h}" rx="7"
            fill="url(#g-gloss)" opacity="${f.gloss}"/></g>`;
  }
  return s;
}

function partMarkup(i) {
  const c = CELLS[i], f = form();
  const pt = c.cy + topOf(), pb = c.cy + botOf();
  const gx1 = c.cx - 4, gx2 = c.cx - 4;
  const isGone = snapped[runner].has(i);

  return `<g class="slot">
    <rect class="pocket" x="${c.cx - 92}" y="${c.gt + 3}" width="184" height="${(c.gb - c.gt - 8).toFixed(0)}"
          rx="6" fill="${TINTS[i]}"/>
    <rect class="gate" x="${gx1}" y="${c.gt}" width="8" height="${(pt - c.gt).toFixed(1)}"/>
    <rect class="gate" x="${gx2}" y="${pb.toFixed(1)}" width="8" height="${(c.gb - pb).toFixed(1)}"/>
    <rect class="gate-cut ${isGone ? "shown" : ""}" x="${gx1 - 1}" y="${(pt - 4.5).toFixed(1)}" width="10" height="4.5" rx="1.5"/>
    <rect class="gate-cut ${isGone ? "shown" : ""}" x="${gx2 - 1}" y="${pb.toFixed(1)}" width="10" height="4.5" rx="1.5"/>

    <g class="part ${isGone ? "gone" : ""}" data-i="${i}" role="button" tabindex="0"
       transform="translate(${c.cx},${c.cy})"
       aria-label="${LETTERS[runner]}${i + 1}">
      <rect class="hit" x="-104" y="-84" width="208" height="168" fill="transparent"/>
      <g class="p-ghost">
        <rect x="${-f.w / 2}" y="${-f.h / 2}" width="${f.w}" height="${f.h}" rx="8"/>
      </g>
      <g class="p-body">${formMarkup(i, false)}</g>
      <text class="p-code" x="0" y="${(botOf() + 15).toFixed(0)}">${LETTERS[runner]}${i + 1}</text>
    </g>
  </g>`;
}

function drawParts(animate) {
  const g = $("#parts");
  g.innerHTML = CELLS.map((_, i) => partMarkup(i)).join("");
  if (animate) { g.classList.remove("swap"); void g.offsetWidth; g.classList.add("swap"); }
  $$(".part", g).forEach((p) => {
    p.addEventListener("click", () => snap(+p.dataset.i));
    p.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); snap(+p.dataset.i); }
    });
  });
  updateCounter();
}

function updateCounter() {
  $("#counter").textContent = `${LETTERS[runner]} ${snapped[runner].size}/6`;
  updateTabCounts();
}

/* Only rewrite the numbers. Re-running drawTabs() here would rebuild the
   buttons and rebind every listener on each snap. */
function updateTabCounts() {
  $$("#tabs .tab").forEach((b) => {
    const c = $(".c", b);
    if (c) c.textContent = `${snapped[+b.dataset.r].size}/6`;
  });
}

/* ── the mechanic: nip a part off ────────────────────────────── */
function snap(i) {
  const slot = $$(".slot", $("#parts"))[i];
  const part = $(".part", slot);

  if (!snapped[runner].has(i)) {
    snapped[runner].add(i);
    part.classList.add("snapping");
    setTimeout(() => {
      part.classList.remove("snapping");
      part.classList.add("gone");
      $$(".gate-cut", slot).forEach((n) => n.classList.add("shown"));
    }, 290);
    updateCounter();
  }
  fillTray(i);
}

/* ── the tray: exactly one part at a time ────────────────────── */
function fillTray(i) {
  open = { r: runner, i };
  const t = STR[lang], well = $("#well"), tray = $("#tray");
  const code = `${LETTERS[runner]}${i + 1}`;
  const f = form();
  const vb = `${-f.w / 2 - 16} ${-f.h / 2 - 16} ${f.w + 32} ${f.h + 32}`;

  tray.innerHTML = `
    <div class="tilt">
      <svg class="tray-svg" viewBox="${vb}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        ${formMarkup(i, true)}
      </svg>
    </div>
    <p class="t-code">${code}</p>
    <h2 class="t-name">NYA! VER. ${SERIES[i]}</h2>
    <span class="t-nya">Nya! ver.</span>
    <dl class="t-rows">
      <div class="t-row"><dt>${t.format}</dt><dd>${t.runners[runner].fmt}</dd></div>
    </dl>
    <div class="t-nav">
      <button type="button" class="t-step" data-step="-1" aria-label="${t.prev}">&lsaquo;</button>
      <button type="button" class="t-step" data-step="1" aria-label="${t.next}">&rsaquo;</button>
      <span class="t-of">${i + 1} / 6</span>
    </div>
    <div class="t-acts">
      <a class="t-shop" href="${SHOPEE}" target="_blank" rel="noopener">${t.shop}</a>
      <button class="t-close" type="button" aria-label="${t.close}">✕</button>
    </div>`;

  tray.hidden = false;
  well.classList.add("full");
  $(".t-close", tray).addEventListener("click", closeTray);
  wireTilt($(".tilt", tray));

  /* step to the next/previous part without going back to the runner.
     snap() already handles "not taken yet", so stepping onto an untaken part
     nips it off too and the runner stays in sync with what you have seen. */
  $$(".t-step", tray).forEach((b) =>
    b.addEventListener("click", () => step(+b.dataset.step)));

  wireSwipe(tray);
}

function step(d) {
  if (!open) return;
  snap((open.i + d + CELLS.length) % CELLS.length);
}

/* phones have no prev/next hover affordance, so the card is swipeable too.
   Horizontal intent only — a vertical drag is the page scrolling. */
function wireSwipe(el) {
  let x0 = null, y0 = null;
  el.addEventListener("pointerdown", (e) => { x0 = e.clientX; y0 = e.clientY; });
  el.addEventListener("pointerup", (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
  });
  el.addEventListener("pointercancel", () => { x0 = null; });
}

document.addEventListener("keydown", (e) => {
  if (!open) return;
  if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
  if (e.key === "ArrowLeft")  { e.preventDefault(); step(-1); }
  if (e.key === "Escape")     { closeTray(); }
});

function closeTray() {
  open = null;
  $("#tray").hidden = true;
  $("#tray").innerHTML = "";
  $("#well").classList.remove("full");
}

/* the charm catches the light when you move over it — pointer driven only */
function wireTilt(el) {
  if (!el || !matchMedia("(hover:hover)").matches) return;
  el.style.perspective = "700px";
  el.addEventListener("pointermove", (e) => {
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    const svg = $(".tray-svg", el);
    svg.style.transform = `rotateY(${(x * 15).toFixed(2)}deg) rotateX(${(-y * 13).toFixed(2)}deg)`;
  });
  el.addEventListener("pointerleave", () => {
    const svg = $(".tray-svg", el);
    if (svg) svg.style.transform = "";
  });
}

/* ── runner tabs ─────────────────────────────────────────────── */
function drawTabs() {
  const t = STR[lang];
  $("#tabs").innerHTML = LETTERS.map((L, n) => `
    <button type="button" class="tab" data-r="${n}" aria-current="${n === runner}">
      <span class="l">${L}</span><span class="n">${t.runners[n].name}</span><span class="c">${snapped[n].size}/6</span>
    </button>`).join("");
  $$(".tab").forEach((b) => b.addEventListener("click", () => {
    if (+b.dataset.r === runner) return;
    runner = +b.dataset.r;
    drawTabs();
    drawParts(true);
    if (open) closeTray();
  }));
}

/* ── the QC mould stamp: press it, it inks the paper ─────────── */
function wireQC() {
  const qc = $("#qc"), ink = $("#ink");
  const press = () => {
    qc.classList.add("pressed");
    setTimeout(() => qc.classList.remove("pressed"), 130);
    ink.classList.toggle("inked");
  };
  qc.addEventListener("click", press);
  qc.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); press(); }
  });
}

/* ── language ────────────────────────────────────────────────── */
function applyLang() {
  const t = STR[lang];
  document.documentElement.lang = lang;
  $$("[data-i18n]").forEach((el) => { el.textContent = t[el.dataset.i18n]; });
  $$(".lang-b").forEach((b) => b.setAttribute("aria-current", b.dataset.lang === lang));
  drawTabs();
  if (open) fillTray(open.i);
}

function init() {
  buildDefs();
  buildSpent();
  drawTabs();
  drawParts(false);
  wireQC();
  $$(".lang-b").forEach((b) => b.addEventListener("click", () => {
    lang = b.dataset.lang;
    localStorage.setItem("bakanae-lang", lang);
    applyLang();
  }));
  applyLang();
}

init();
