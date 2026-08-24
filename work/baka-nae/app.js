/* baka nae. — THE SPRUE
   One object: an injection-moulded parts runner.
   Mechanic: nip a part off the runner -> it lands in the tray and tells you
   what it is. The runner keeps the cut nubs, so it remembers what you took. */

const SHOPEE = "https://shopee.co.id/baka_nae";

/* ── strings ─────────────────────────────────────────────────── */
const STR = {
  id: {
    handle: "SHOPEE · @baka_nae",
    tag:    "Merch fanart, digambar tangan sendiri sejak 2020.",
    hint:   "Klik satu bagian untuk melepasnya.",
    buy:    "BELI DI SHOPEE",
    ink:    "LOLOS QC · 4,97★ dari 7.440 ulasan · 10.711 pengikut",
    seri:   "Seri",
    format: "Format",
    shop:   "LIHAT DI SHOPEE",
    close:  "Tutup",
    wellhint: "Bagian yang kamu lepas jatuh ke sini.",
    runners: [
      { name: "GANTUNGAN", fmt: "Gantungan akrilik" },
      { name: "STIKER",    fmt: "Stiker die-cut"    },
      { name: "CETAK",     fmt: "Art print"          },
      { name: "KARTU",     fmt: "Kartu pos & photocard" },
    ],
  },
  en: {
    handle: "SHOPEE · @baka_nae",
    tag:    "Fanart merch, drawn by hand since 2020.",
    hint:   "Click one part to snap it off.",
    buy:    "BUY ON SHOPEE",
    ink:    "QC PASS · 4.97★ from 7,440 reviews · 10,711 followers",
    seri:   "Series",
    format: "Format",
    shop:   "VIEW ON SHOPEE",
    close:  "Close",
    wellhint: "Parts you snap off land here.",
    runners: [
      { name: "CHARMS",   fmt: "Acrylic charm"        },
      { name: "STICKERS", fmt: "Die-cut sticker"      },
      { name: "PRINTS",   fmt: "Art print"            },
      { name: "CARDS",    fmt: "Postcard & photocard" },
    ],
  },
};

/* Edition numbering, not series names. Her cat-eared line is really called
   "Nya! ver."; WHICH series she draws could not be verified from the Shopee
   API, and naming third-party anime on her shop page would be an invented
   claim about her catalogue. Numbered editions say only what is true. */
const SERIES = ["01", "02", "03", "04", "05", "06"];

const LETTERS = ["A", "B", "C", "D"];
const TINTS = ["#F3D9E5", "#DCEBE4", "#F6E7CE", "#DCE3F5", "#EEDBF1", "#F1DCD2"];

/* ── the six die-cut silhouettes (no likenesses — cat ears + a blank body) ── */
const EARS =
  '<path d="M-60,-44 L-40,-86 L-16,-42 Z"/><path d="M16,-42 L40,-86 L60,-44 Z"/>';

const BODIES = [
  { s: '<ellipse cx="0" cy="0" rx="72" ry="62"/>',                                bot: 62 },
  { s: '<rect x="-64" y="-62" width="128" height="126" rx="26"/>',                bot: 64 },
  { s: '<ellipse cx="0" cy="2" rx="88" ry="52"/>',                                bot: 54 },
  { s: '<rect x="-70" y="-54" width="140" height="112" rx="46"/>',                bot: 58 },
  { s: '<path d="M0,-64 L62,-30 L62,32 L0,66 L-62,32 L-62,-30 Z"/>',              bot: 66 },
  { s: '<rect x="-52" y="-66" width="104" height="132" rx="16"/>',                bot: 66 },
];

const shapes = (i) => BODIES[i].s + EARS;
const K = 0.88, DY = 7;                       // part group: y' = K*y + DY
const topOf = (i) => K * -86 + DY;            // every silhouette peaks at the ear tip
const botOf = (i) => K * BODIES[i].bot + DY;

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
let open = null;                              // {r, i} currently in the tray

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ── build the static bits of the sprue ──────────────────────── */
function buildDefs() {
  $("#clips").innerHTML = BODIES.map((_, i) =>
    `<clipPath id="pc${i}" clipPathUnits="userSpaceOnUse"><g transform="translate(0,${DY}) scale(${K})">${shapes(i)}</g></clipPath>`
  ).join("");
}

/* six emptied runners behind the live one — one for every year she has run the shop */
function buildSpent() {
  const now = 2026;
  let out = "";
  for (let i = 5; i >= 0; i--) {
    const dx = -(10 + 8 * i), dy = -(7 + 6 * i);
    out += `<g class="spent" transform="translate(${dx},${dy})" opacity="${(0.5 - i * 0.062).toFixed(2)}">
      <rect class="spent-fill" x="22" y="22" width="516" height="658"/>
      <rect class="spent-f" x="22" y="22" width="516" height="658"/>
      <rect class="spent-f" x="22" y="114" width="516" height="0.1"/>
      <text class="yr" x="16" y="14">${now - 1 - i}</text>
    </g>`;
  }
  $("#spent").innerHTML = out;
}

/* ── parts ───────────────────────────────────────────────────── */
function partMarkup(i) {
  const c = CELLS[i];
  const pt = c.cy + topOf(i), pb = c.cy + botOf(i);
  const gx1 = c.cx - 34, gx2 = c.cx + 34;
  const isGone = snapped[runner].has(i);

  return `<g class="slot">
    <rect class="gate" x="${gx1}" y="${c.gt}" width="8" height="${(pt - c.gt).toFixed(1)}"/>
    <rect class="gate" x="${gx2}" y="${pb.toFixed(1)}" width="8" height="${(c.gb - pb).toFixed(1)}"/>
    <rect class="gate-cut ${isGone ? "shown" : ""}" x="${gx1 - 1}" y="${(pt - 4.5).toFixed(1)}" width="10" height="4.5" rx="1.5"/>
    <rect class="gate-cut ${isGone ? "shown" : ""}" x="${gx2 - 1}" y="${pb.toFixed(1)}" width="10" height="4.5" rx="1.5"/>

    <g class="part ${isGone ? "gone" : ""}" data-i="${i}" role="button" tabindex="0"
       transform="translate(${c.cx},${c.cy})" style="--tint:${TINTS[i]}"
       aria-label="${LETTERS[runner]}${i + 1}">
      <rect class="hit" x="-104" y="-82" width="208" height="164" fill="transparent"/>
      <g class="p-ghost-w" transform="translate(0,${DY}) scale(${K})">
        <g class="p-ghost">${shapes(i)}</g>
      </g>
      <g class="p-body">
        <g transform="translate(0,${DY}) scale(${K})">
          <g class="p-edge">${shapes(i)}</g>
          <g class="p-cut">${shapes(i)}</g>
          <g class="p-fill">${shapes(i)}</g>
          <circle class="p-hole" cx="0" cy="-34" r="7.5"/>
        </g>
        <g clip-path="url(#pc${i})">
          <rect class="p-sheen" x="-190" y="-130" width="52" height="260" transform="rotate(-16)"/>
        </g>
        <text class="p-code" x="0" y="${(botOf(i) - 14).toFixed(0)}">${LETTERS[runner]}${i + 1}</text>
      </g>
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

  tray.innerHTML = `
    <div class="tilt">
      <svg class="tray-svg" viewBox="-112 -104 224 184" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <g style="--tint:${TINTS[i]}">
          <rect class="gate-cut shown" x="-35" y="${(topOf(i) - 5).toFixed(1)}" width="10" height="5" rx="1.5"/>
          <rect class="gate-cut shown" x="25" y="${botOf(i).toFixed(1)}" width="10" height="5" rx="1.5"/>
          <g transform="translate(0,${DY}) scale(${K})">
            <g class="p-cut">${shapes(i)}</g>
            <g class="p-fill">${shapes(i)}</g>
            <g class="p-line">${shapes(i)}</g>
            <circle class="p-hole" cx="0" cy="-34" r="7.5"/>
          </g>
          <g clip-path="url(#pc${i})">
            <rect class="p-sheen tray-sheen" x="-190" y="-130" width="46" height="260" transform="rotate(-16)"/>
          </g>
        </g>
      </svg>
    </div>
    <p class="t-code">${code}</p>
    <h2 class="t-name">NYA! VER. ${SERIES[i]}</h2>
    <span class="t-nya">Nya! ver.</span>
    <dl class="t-rows">
      <div class="t-row"><dt>${t.format}</dt><dd>${t.runners[runner].fmt}</dd></div>
    </dl>
    <div class="t-acts">
      <a class="t-shop" href="${SHOPEE}" target="_blank" rel="noopener">${t.shop}</a>
      <button class="t-close" type="button" aria-label="${t.close}">✕</button>
    </div>`;

  tray.hidden = false;
  well.classList.add("full");
  $(".t-close", tray).addEventListener("click", closeTray);
  wireTilt($(".tilt", tray));
}

function closeTray() {
  open = null;
  $("#tray").hidden = true;
  $("#tray").innerHTML = "";
  $("#well").classList.remove("full");
}

/* the charm catches the light when you move over it — pointer driven only */
function wireTilt(el) {
  if (!el || !matchMedia("(hover:hover)").matches) return;
  const sheen = $(".tray-sheen", el);
  el.style.perspective = "700px";
  el.addEventListener("pointermove", (e) => {
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    const svg = $(".tray-svg", el);
    svg.style.transform = `rotateY(${(x * 15).toFixed(2)}deg) rotateX(${(-y * 13).toFixed(2)}deg)`;
    if (sheen) { sheen.style.opacity = 0.55; sheen.style.transform = `rotate(-16deg) translateX(${(150 + x * 220).toFixed(0)}px)`; }
  });
  el.addEventListener("pointerleave", () => {
    const svg = $(".tray-svg", el);
    svg.style.transform = "";
    if (sheen) { sheen.style.opacity = 0; sheen.style.transform = "rotate(-16deg)"; }
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

/* ── the runner tilts toward the pointer ─────────────────────── */
function wireBayTilt() {
  const bay = $("#bay3d");
  if (!matchMedia("(hover:hover)").matches) return;
  bay.addEventListener("pointermove", (e) => {
    const r = bay.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    bay.classList.add("live");
    bay.style.setProperty("--ry", `${(x * 9).toFixed(2)}deg`);
    bay.style.setProperty("--rx", `${(-y * 5).toFixed(2)}deg`);
  });
  bay.addEventListener("pointerleave", () => {
    bay.classList.remove("live");
    bay.style.setProperty("--ry", "0deg");
    bay.style.setProperty("--rx", "0deg");
  });
}

/* ── language ────────────────────────────────────────────────── */
function applyLang() {
  const t = STR[lang];
  document.documentElement.lang = lang;
  $$("[data-i18n]").forEach((el) => { el.textContent = t[el.dataset.i18n]; });
  $$(".lang-b").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  drawTabs();
  if (open) fillTray(open.i);
  localStorage.setItem("bakanae-lang", lang);
}

/* ── go ──────────────────────────────────────────────────────── */
buildDefs();
buildSpent();
applyLang();
drawParts(false);
wireQC();
wireBayTilt();
$$(".lang-b").forEach((b) => b.addEventListener("click", () => {
  if (b.dataset.lang === lang) return;
  lang = b.dataset.lang;
  applyLang();
}));
