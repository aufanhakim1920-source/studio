const $ = (s) => document.querySelector(s);
const A = "assets/";
/* ── the record ─────────────────────────────────────────────── */
const BANKS = {
  projects: {
    label: "PROJECTS",
    note: "TEN BUILDS. FOUR OF THEM ARE LIVE RIGHT NOW.",
    meter: "OUTPUT",
    gauges: ["FRONTEND", "BACKEND", "DATA", "MOTION", "SHIPPED", "DESIGN"],
    items: [
      { n: "FANNEST", sub: "SHOPIFY · NODE · META GRAPH API", badge: "LIVE",
        copy: "An anime-merch storefront that also feeds itself. Product footage goes in one end; cut reels come out the other and post to Meta without me touching them.",
        extra: "The shop sells. The pipeline keeps the feed alive on the days I am on the bakery floor at six in the morning.",
        rows: [["PLATFORM", "SHOPIFY"], ["POSTING", "AUTOMATED"], ["STATE", "LIVE"]],
        levels: [78, 82, 55, 70, 92, 74], out: 88, slide: null },
      { n: "WEEK BOARD", sub: "NETLIFY FUNCTIONS · GOOGLE CALENDAR", badge: "LIVE",
        copy: "An availability board that reads my real calendar. Bakery shifts, tutorials, and a one-hour commute buffer on both sides of every one of them.",
        extra: "It subtracts the buffers, shows the hours that are genuinely free, and lets you book one. An empty future week means the roster is unpublished, not that I am free — the board says so.",
        rows: [["HOST", "NETLIFY"], ["SOURCE", "GOOGLE CAL"], ["BUFFER", "1H EACH SIDE"]],
        levels: [72, 80, 62, 40, 90, 68], out: 81, slide: null },
      { n: "BIOMATE", sub: "SUPABASE · POSTGRES RLS · GPS", badge: "LIVE",
        copy: "Matches hikers by pace, route and time of day. Fifty thousand GPS fixes ingested, indexed and queried.",
        extra: "Row-level security on every table, so one walker can never read another walker's track. That was the hard part, not the matching.",
        rows: [["FIXES", "50,000"], ["SECURITY", "POSTGRES RLS"], ["STATE", "LIVE"]],
        levels: [64, 88, 95, 30, 86, 60], out: 90, slide: null },
      { n: "PIXEL DUNGEON KNIGHT", sub: "CANVAS 2D · VANILLA JS", badge: "PLAYABLE",
        copy: "A roguelike hand-built on a 2D canvas. No engine, no framework, no tilemap library.",
        extra: "136 weapons, 98 enemies, 28 bosses, 17 biomes — all balanced the slow way, by playing it until it stopped being unfair.",
        rows: [["WEAPONS", "136"], ["ENEMIES", "98"], ["BOSSES", "28"], ["BIOMES", "17"]],
        levels: [92, 58, 44, 88, 84, 80], out: 84, slide: null },
      { n: "BAKA NAE.", sub: "BILINGUAL BRAND SITE · ID / EN", badge: "LIVE",
        copy: "My sister draws; the label is hers. I built the site in Indonesian and English so her 10.7k Shopee followers and everyone else land in the same place.",
        extra: "Brutalist press-sheet layout, because a fanart label should not look like a SaaS landing page.",
        rows: [["FOLLOWERS", "10.7K SHOPEE"], ["LANGUAGES", "ID + EN"], ["STATE", "LIVE"]],
        levels: [88, 30, 20, 62, 90, 94], out: 79, slide: null },
      { n: "UNTITLED GAME", sub: "UNITY · C# · CO-OP", badge: "IN BUILD",
        copy: "Co-op melee in Unity. I instrumented the combat loop and logged time-to-kill before touching a single feel parameter.",
        extra: "8.0 seconds per kill down to 2.2. The fight only started reading as a fight once that number moved — opinions about 'game feel' were useless until there was a number.",
        rows: [["TIME / KILL", "8.0S → 2.2S"], ["ENGINE", "UNITY"], ["MODE", "CO-OP"]],
        levels: [55, 74, 66, 94, 48, 70], out: 72, slide: null },
      { n: "HOLLOWBORNE", sub: "JAVASCRIPT · ACTION-RPG", badge: "IN BUILD",
        copy: "I wrote the world before I wrote the engine. Factions, geography and a timeline in a story bible first.",
        extra: "Then a JavaScript action-RPG built to fit the bible, rather than a bible retro-fitted to whatever the engine happened to make easy.",
        rows: [["WRITTEN FIRST", "STORY BIBLE"], ["RUNTIME", "JAVASCRIPT"], ["STATE", "IN BUILD"]],
        levels: [70, 62, 34, 78, 40, 82], out: 66, slide: null },
      { n: "AGENTSENTRY", sub: "NEXT.JS · KILL-SWITCH PROXY", badge: "IN BUILD",
        copy: "Every call an AI agent makes routes through a proxy you can slam shut.",
        extra: "Watch what it is doing, cap it, or stop it mid-run. 'It seemed fine in testing' is not a safety model.",
        rows: [["SURFACE", "NEXT.JS"], ["CONTROL", "KILL SWITCH"], ["STATE", "IN BUILD"]],
        levels: [68, 86, 58, 24, 44, 62], out: 70, slide: null },
      { n: "FRESHTRACK", sub: "MOBILE · COMPUTER VISION", badge: "PROTOTYPE",
        copy: "Point a phone camera at produce and get back how long it has left.",
        extra: "Reads spoilage cues off the surface instead of trusting a printed date. Built so the fridge stops being a guessing game.",
        rows: [["INPUT", "CAMERA"], ["MODEL", "VISION"], ["STATE", "PROTOTYPE"]],
        levels: [60, 52, 80, 30, 36, 58], out: 61, slide: null },
      { n: "MOTION PIPELINE", sub: "REMOTION · NODE", badge: "IN BUILD",
        copy: "Video rendered from code, with the sound design pinned to the frame rather than dragged onto a timeline.",
        extra: "Real recordings only. A synthesised whoosh gives the whole thing away inside two seconds.",
        rows: [["RENDERER", "REMOTION"], ["SOUND", "FRAME-TIMED"], ["STATE", "IN BUILD"]],
        levels: [74, 66, 42, 96, 50, 78], out: 76, slide: null },
    ],
  },
  record: {
    label: "RECORD",
    note: "THE PART THAT ISN'T CODE. TEN ENTRIES.",
    meter: "LOAD",
    gauges: ["PACE", "PRESSURE", "PEOPLE", "STAMINA", "PRECISION", "REACH"],
    items: [
      { n: "NATURAL TUCKER BAKERY", sub: "FRONT OF HOUSE · CARLTON NORTH", badge: "CURRENT",
        copy: "Six in the morning, on the floor, before the first tray comes out.",
        extra: "Hired off a cold email — round twelve of an outreach campaign I ran myself. The first eleven rounds got nothing back, and that is the part worth putting on a page.",
        rows: [["START", "06:00"], ["ROUND HIRED", "12 OF 12"], ["STATE", "CURRENT"]],
        levels: [88, 82, 92, 90, 70, 54], out: 86,
        slide: { src: "coffee.jpg", cap: "ON THE BAR — LATTE ART, NATURAL TUCKER", orient: "port" } },
      { n: "CERTIFIED BARISTA", sub: "NATIONALLY CERTIFIED", badge: "CERT",
        copy: "Milk, timing, and latte art, on a live bar with a queue behind it.",
        extra: "The certificate is the easy half. Holding the pour steady on the fourth flat white in ninety seconds is the other one.",
        rows: [["CERTIFICATE", "NATIONAL"], ["DISCIPLINE", "ESPRESSO"], ["POUR", "FREEHAND"]],
        levels: [84, 76, 70, 72, 94, 46], out: 78,
        slide: { src: "coffee.jpg", cap: "FREEHAND POUR — ROSETTA", orient: "port" } },
      { n: "LA SPAGHETTATA", sub: "TRIAL RUSH SHIFT", badge: "TRIAL",
        copy: "One trial, dropped straight into a dinner rush.",
        extra: "Ran it at roughly twice the pace of a full-timer on the floor. No photograph of that one — nobody stops to take pictures during a rush.",
        rows: [["SHIFT", "RUSH"], ["PACE", "~2× FLOOR"], ["NOTICE", "NONE GIVEN"]],
        levels: [96, 94, 74, 84, 62, 30], out: 92, slide: null },
      { n: "CISSA CODEBREW", sub: "1ST PLACE × 2 · UNIVERSITY OF MELBOURNE", badge: "1ST × 2",
        copy: "Two hackathon wins. Both in first year. Both against teams of masters students.",
        extra: "First one: design plus full stack, front end, back end and the Figma. Second one: a team of four building with AI assistance. Same result.",
        rows: [["WINS", "2"], ["YEAR", "FIRST"], ["BEATEN", "MASTERS TEAMS"]],
        levels: [92, 90, 78, 66, 86, 88], out: 96,
        slide: { src: "codebrew.jpg", cap: "CODEBREW — FIRST PLACE, ON STAGE", orient: "land" } },
      { n: "WORLD YOUTH FORUM ASIA", sub: "2025 · SELECTED DELEGATE", badge: "DELEGATE",
        copy: "Selected as a delegate for the 2025 Asia forum.",
        extra: "A room full of people from a dozen countries arguing about things that actually matter, in a second language for most of us.",
        rows: [["YEAR", "2025"], ["ROLE", "DELEGATE"], ["SCOPE", "ASIA"]],
        levels: [60, 72, 96, 58, 70, 64], out: 82,
        slide: { src: "wyf.jpg", cap: "WORLD YOUTH FORUM ASIA 2025", orient: "land" } },
      { n: "COBRA CLEANUP COMMITTEE", sub: "HEAD ASSISTANT · SURABAYA", badge: "203.6 KG",
        copy: "203.6 kilograms of waste sorted and weighed, not estimated.",
        extra: "Head Assistant on the committee. Jawa Pos ran it. The number is exact because somebody had to stand at the scale and write each load down.",
        rows: [["SORTED", "203.6 KG"], ["ROLE", "HEAD ASSISTANT"], ["PRESS", "JAWA POS"]],
        levels: [66, 78, 94, 88, 90, 76], out: 89,
        slide: { src: "cleanup.jpg", cap: "COBRA CLEANUP — SORTING AND WEIGHING", orient: "land" } },
      { n: "COMMUNITY BUILD 28", sub: "VOLUNTEER", badge: "FIELD",
        copy: "On site with the twenty-eighth community build.",
        extra: "Work that only counts if you turn up on the day, repeatedly, when nobody is filming.",
        rows: [["PROGRAMME", "BUILD 28"], ["ROLE", "VOLUNTEER"], ["MODE", "ON SITE"]],
        levels: [58, 70, 92, 86, 64, 60], out: 76,
        slide: { src: "orphanage.jpg", cap: "COMMUNITY BUILD 28 — ON SITE", orient: "port" } },
      { n: "CLEAN WATER OUTREACH", sub: "PANTI ASUHAN KASIH AGAPE", badge: "FIELD",
        copy: "Building water filters with the kids rather than handing them over finished.",
        extra: "They assembled the filters themselves, which is the entire point — a filter you built is a filter you will maintain.",
        rows: [["OUTPUT", "WATER FILTERS"], ["METHOD", "HANDS-ON"], ["ROLE", "VOLUNTEER"]],
        levels: [54, 66, 96, 80, 68, 58], out: 74,
        slide: { src: "water.jpg", cap: "CLEAN WATER ACCESS OUTREACH", orient: "land", pos: "50% 28%" } },
      { n: "O-WEEK VOLUNTEER", sub: "UNIMELB · COMMUNITY BADGE", badge: "BADGE",
        copy: "Orientation week on the volunteer side of the table, plus the UniMelb Community Badge.",
        extra: "Pointing lost first-years at the right building is unglamorous and it is the single most useful thing anybody did for me in my first week.",
        rows: [["EVENT", "O-WEEK"], ["AWARD", "COMMUNITY BADGE"], ["ROLE", "VOLUNTEER"]],
        levels: [62, 58, 90, 66, 60, 72], out: 70,
        slide: { src: "oweek.jpg", cap: "O-WEEK — UNIVERSITY OF MELBOURNE", orient: "land" } },
      { n: "STRENGTH & CONDITIONING", sub: "COMPETITIVE TAEKWONDO · NASM PT THEORY", badge: "ONGOING",
        copy: "Competitive taekwondo, and NASM personal-training theory on top of it.",
        extra: "Programming your own training is the same skill as instrumenting a combat loop: pick the number that matters, move it, ignore how you feel about it.",
        rows: [["SPORT", "TAEKWONDO"], ["THEORY", "NASM PT"], ["STATE", "ONGOING"]],
        levels: [80, 86, 48, 96, 82, 40], out: 84,
        slide: { src: "athletic.jpg", cap: "GYM — PULL-UP", orient: "port" } },
    ],
  },
  proof: {
    label: "PROOF",
    note: "NINE FRAMES OFF THE LIGHT TABLE.",
    meter: "LAMP",
    gauges: ["EXPOSURE", "CONTRAST", "SUBJECTS", "WARMTH", "SHARPNESS", "ARCHIVE"],
    items: [
      { n: "CODEBREW, FIRST PLACE", sub: "FRAME 01 / 09 · LECTURE THEATRE", badge: "2026",
        copy: "The hackathon photograph. First place, first year, against masters teams.",
        extra: "Shot on a phone in a lecture theatre, which is where most real things happen. Two of these exist — the second win came a semester later with a team of four.",
        rows: [["EVENT", "CODEBREW"], ["RESULT", "1ST PLACE"], ["FRAME", "01 / 09"]],
        levels: [78, 72, 88, 64, 70, 92], out: 84,
        slide: { src: "codebrew.jpg", cap: "01 — CODEBREW, FIRST PLACE", orient: "land" } },
      { n: "WORLD YOUTH FORUM", sub: "FRAME 02 / 09 · ASIA 2025", badge: "DELEGATE",
        copy: "Delegate credentials, Asia forum, 2025.",
        extra: "A room of delegates from a dozen countries arguing about things that actually matter, in a second language for most of us. Mine included.",
        rows: [["EVENT", "WYF ASIA"], ["ROLE", "DELEGATE"], ["FRAME", "02 / 09"]],
        levels: [70, 66, 82, 72, 68, 88], out: 76,
        slide: { src: "wyf.jpg", cap: "02 — WORLD YOUTH FORUM ASIA 2025", orient: "land" } },
      { n: "O-WEEK, UNIMELB", sub: "FRAME 03 / 09 · VOLUNTEER", badge: "2026",
        copy: "Orientation week, University of Melbourne.",
        extra: "On the volunteer side of the table. Pointing lost first-years at the right building is unglamorous and it was the most useful thing anybody did for me in my own first week.",
        rows: [["EVENT", "O-WEEK"], ["ROLE", "VOLUNTEER"], ["FRAME", "03 / 09"]],
        levels: [84, 60, 94, 78, 62, 80], out: 72,
        slide: { src: "oweek.jpg", cap: "03 — O-WEEK, UNIMELB", orient: "land" } },
      { n: "FREEHAND POUR", sub: "FRAME 04 / 09 · ON THE BAR", badge: "ESPRESSO",
        copy: "Latte art on a live bar. Nationally certified barista.",
        extra: "Freehand, no stencil, fourth cup in ninety seconds with a queue behind it. The certificate is the easy half.",
        rows: [["SUBJECT", "ESPRESSO"], ["POUR", "FREEHAND"], ["FRAME", "04 / 09"]],
        levels: [66, 88, 30, 92, 90, 74], out: 88,
        slide: { src: "coffee.jpg", cap: "04 — LATTE ART, ROSETTA", orient: "port" } },
      { n: "COBRA CLEANUP", sub: "FRAME 05 / 09 · SURABAYA", badge: "203.6 KG",
        copy: "Sorting and weighing, Surabaya. 203.6 kg, featured in Jawa Pos.",
        extra: "The number is exact rather than rounded because somebody had to stand at the scale and write every load down. That somebody was the Head Assistant.",
        rows: [["SORTED", "203.6 KG"], ["PRESS", "JAWA POS"], ["FRAME", "05 / 09"]],
        levels: [72, 76, 96, 58, 66, 90], out: 86,
        slide: { src: "cleanup.jpg", cap: "05 — COBRA CLEANUP COMMITTEE", orient: "land" } },
      { n: "COMMUNITY BUILD 28", sub: "FRAME 06 / 09 · ON SITE", badge: "FIELD",
        copy: "On site with Community Build 28.",
        extra: "The twenty-eighth of these. Work that only counts if you keep turning up on the day, when nobody is filming it.",
        rows: [["PROGRAMME", "BUILD 28"], ["ROLE", "VOLUNTEER"], ["FRAME", "06 / 09"]],
        levels: [64, 70, 92, 70, 60, 84], out: 74,
        slide: { src: "orphanage.jpg", cap: "06 — COMMUNITY BUILD 28", orient: "port" } },
      { n: "CLEAN WATER OUTREACH", sub: "FRAME 07 / 09 · KASIH AGAPE", badge: "FIELD",
        copy: "Water filters built with the kids at Panti Asuhan Kasih Agape.",
        extra: "They assembled the filters themselves rather than being handed finished ones, which is the entire point — a filter you built is a filter you will maintain.",
        rows: [["OUTPUT", "WATER FILTERS"], ["METHOD", "HANDS-ON"], ["FRAME", "07 / 09"]],
        levels: [60, 68, 94, 66, 54, 82], out: 70,
        slide: { src: "water.jpg", cap: "07 — CLEAN WATER OUTREACH", orient: "land", pos: "50% 28%" } },
      { n: "FITOLOGY GROUP", sub: "FRAME 08 / 09 · TRAINING", badge: "GROUP",
        copy: "Training group.",
        extra: "The people who make a 5am session happen on a day you had already decided you were not going.",
        rows: [["SUBJECT", "GROUP"], ["CONTEXT", "TRAINING"], ["FRAME", "08 / 09"]],
        levels: [58, 64, 90, 62, 58, 76], out: 66,
        slide: { src: "gym.jpg", cap: "08 — FITOLOGY GROUP", orient: "port" } },
      { n: "PULL-UP", sub: "FRAME 09 / 09 · GYM", badge: "STRENGTH",
        copy: "A pull-up. Not taekwondo — that one has no photograph on file.",
        extra: "Programming your own training is the same skill as instrumenting a combat loop: pick the number that matters, move it, and ignore how you feel about it.",
        rows: [["SUBJECT", "PULL-UP"], ["CONTEXT", "GYM"], ["FRAME", "09 / 09"]],
        levels: [62, 82, 24, 60, 78, 78], out: 80,
        slide: { src: "athletic.jpg", cap: "09 — GYM, PULL-UP", orient: "port" } },
    ],
  },
};
/* ── state ──────────────────────────────────────────────────── */
const S = { mode: "projects", idx: 0, printed: 0 };
/* ═══════════ SOUND ═══════════
   Real recordings only, per [[No Synthetic Sound Effects]] — eight Mixkit
   files (Free License, commercial use, no attribution), one per physical part.
   ⚠️ Honest limit, stated rather than implied: I cannot hear these. They were
   chosen by NAME and verified by MEASURED DURATION, not auditioned. Several
   ship with long tails that would stack when the dial is turned quickly, so
   every cue carries a `cap` in milliseconds and is stopped at it.
   OFF BY DEFAULT — a link someone opens should never ambush them.
   Missing files are skipped, never thrown, so the folder can be filled one at
   a time. Every cue is caused by the visitor; nothing plays on a timer. */
const SFX = (() => {
  //            file        vol   cap(ms)  what it is on the panel
  const CUES = {
    detent: { f: "detent", v: 0.34, cap: 110 },  // one dial step
    key:    { f: "key",    v: 0.40, cap: 260 },  // a bank button
    toggle: { f: "toggle", v: 0.32, cap: 320 },  // a tube switch
    slide:  { f: "slide",  v: 0.38, cap: 520 },  // the advance lever
    feed:   { f: "feed",   v: 0.42, cap: 1500 }, // tape running out of the slot
    tear:   { f: "tear",   v: 0.45, cap: 700 },  // tearing it off
    glitch: { f: "glitch", v: 0.26, cap: 420 },  // phosphor change
    power:  { f: "power",  v: 0.30, cap: 900 },  // first switch-on
  };
  const pool = {};
  let on = false, primed = false;
  const load = (k) => {
    if (pool[k]) return pool[k];
    const c = CUES[k]; if (!c) return null;
    const a = new Audio(`sfx/${c.f}.mp3`);
    a.preload = "auto";
    a.addEventListener("error", () => { pool[k] = null; }, { once: true });
    pool[k] = a;
    return a;
  };
  function play(k) {
    if (!on) return;
    const c = CUES[k]; if (!c) return;
    const src = load(k); if (!src) return;
    // clone so rapid detents overlap instead of cutting each other off
    const a = src.cloneNode();
    a.volume = c.v;
    const stop = () => { try { a.pause(); } catch (_) {} };
    a.play().then(() => { setTimeout(stop, c.cap); }).catch(() => {});
  }
  function setOn(v) {
    on = v;
    if (v && !primed) { primed = true; play("power"); }
  }
  return { play, setOn, get on() { return on; } };
})();
const bank = () => BANKS[S.mode];
const item = () => bank().items[S.idx];
/* ── CRT glitch: kicked by the visitor, decays to nothing ───── */
const crt = $("#crt"), tear = $("#crtTear");
let glitch = 0, raf = null, lastT = 0, watchdog = null;
function settle() {
  glitch = 0; raf = null;
  if (watchdog) { clearTimeout(watchdog); watchdog = null; }
  crt.style.setProperty("--glitch", 0);
}
function kick(v) {
  glitch = Math.max(glitch, v);
  tear.style.setProperty("--gy", (12 + Math.random() * 66).toFixed(0) + "%");
  lastT = 0;
  if (!raf) raf = requestAnimationFrame(decay);
  /* rAF gets throttled hard in a backgrounded or headless tab, which strands
     the glitch mid-decay and leaves the screen permanently RGB-split. The
     watchdog guarantees the tube settles no matter how few frames arrive. */
  clearTimeout(watchdog);
  watchdog = setTimeout(settle, 900);
}
function decay(t) {
  /* per-FRAME 0.85 expressed against real elapsed time, so one late frame
     lands where thirty on-time frames would have */
  const frames = lastT ? Math.min(Math.max((t - lastT) / 16.67, 1), 24) : 1;
  lastT = t;
  glitch *= Math.pow(0.85, frames);
  if (glitch < 0.006) { settle(); return; }
  crt.style.setProperty("--glitch", glitch.toFixed(3));
  raf = requestAnimationFrame(decay);
}
/* ── render: every instrument reads the same channel ────────── */
const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function renderScreen() {
  const it = item(), b = bank();
  $("#crtBody").innerHTML =
    `<div class="crt__row">
       <span>CH <b>${String(S.idx + 1).padStart(2, "0")}</b>/${String(b.items.length).padStart(2, "0")}</span>
       <span>BANK <b>${b.label}</b></span>
       <span class="crt__badge">${esc(it.badge)}</span>
     </div>
     <h2 class="crt__title">${esc(it.n)}</h2>
     <p class="crt__sub">${esc(it.sub)}</p>
     <p class="crt__copy">${esc(it.copy)}</p>
     <ul class="crt__leaders">${it.rows.map(
       (r) => `<li><span>${esc(r[0])}</span><i></i><span>${esc(r[1])}</span></li>`).join("")}</ul>
     ${it.extra ? `<div class="crt__extra">${esc(it.extra)}</div>` : ""}
     <div class="crt__index">${b.items.map((x, i) =>
       `<span class="${i === S.idx ? "is-on" : ""}">${String(i + 1).padStart(2, "0")} ${esc(x.n)}</span>`).join("")}</div>
     <div class="crt__cmd">&gt; TURN DIAL OR PRESS PRINT<b class="cur"></b></div>`;
  $("#bezelMode").textContent = "MODE / " + b.label;
}
function renderSelector() {
  const b = bank();
  $("#chNum").textContent = String(S.idx + 1).padStart(2, "0");
  $("#chTot").textContent = String(b.items.length).padStart(2, "0");
  $("#chName").textContent = item().n;
  $("#chanTotal").textContent = b.items.length;
  const seg = $(".seg");
  seg.classList.remove("is-step"); void seg.offsetWidth; seg.classList.add("is-step");
  const knob = $("#knob");
  knob.setAttribute("aria-valuemax", b.items.length);
  knob.setAttribute("aria-valuenow", S.idx + 1);
  knob.setAttribute("aria-valuetext", `Channel ${S.idx + 1}: ${item().n}`);
  knob.style.setProperty("--turn", Math.round((S.idx / b.items.length) * 360));
  document.querySelectorAll("#detents .dt").forEach((el, i) =>
    el.classList.toggle("is-on", i === S.idx));
  document.querySelectorAll("#detents .dn").forEach((el, i) =>
    el.classList.toggle("is-on", i === S.idx));
}
function buildDetents() {
  const n = bank().items.length, step = 360 / n;
  $("#detents").innerHTML = Array.from({ length: n }, (_, i) => {
    const a = i * step;
    return `<span class="dt" style="transform:rotate(${a}deg)"></span>
            <span class="dn" style="transform:rotate(${a}deg)"><i style="transform:rotate(${-a}deg)">${String(i + 1).padStart(2, "0")}</i></span>`;
  }).join("");
}
function renderSlide(animate) {
  const sl = item().slide;
  const mount = $("#mount"), img = $("#slideImg");
  mount.classList.toggle("has-slide", !!sl);
  mount.dataset.orient = sl ? (sl.orient || "land") : "land";
  $("#mountNo").textContent = String(S.idx + 1).padStart(2, "0") + "A";
  if (sl) {
    img.hidden = false;
    img.src = A + sl.src;
    img.alt = sl.cap;
    img.style.objectPosition = sl.pos || "50% 50%";
    if (animate) { img.classList.remove("is-in"); void img.offsetWidth; img.classList.add("is-in"); }
    $("#slideCap").textContent = sl.cap;
  } else {
    img.hidden = true; img.removeAttribute("src"); img.alt = "";
    $("#slideCap").textContent = "NO SLIDE ON FILE FOR THIS CHANNEL — TEST PATTERN SHOWN";
  }
  if (animate) {
    const lb = $("#lightbox");
    lb.classList.add("is-changing");
    setTimeout(() => lb.classList.remove("is-changing"), 190);
  }
}
function buildGauges() {
  $("#gaugebank").innerHTML = bank().gauges.map((g, i) =>
    `<div class="gauge">
       <div class="gauge__head"><span>${esc(g)}</span><b data-v="${i}">0</b></div>
       <div class="gauge__track"><div class="gauge__fill" data-f="${i}"></div></div>
     </div>`).join("");
}
function renderGauges() {
  const lv = item().levels;
  document.querySelectorAll("[data-f]").forEach((el, i) => { el.style.width = lv[i] + "%"; });
  document.querySelectorAll("[data-v]").forEach((el, i) => { el.textContent = lv[i]; });
}
function buildMeterTicks() {
  $("#meterTicks").innerHTML = Array.from({ length: 11 }, (_, i) => {
    const a = -52 + (i / 10) * 104;
    return `<span class="mt${i % 5 === 0 ? " maj" : ""}" style="transform:rotate(${a}deg)"></span>`;
  }).join("");
}
function renderMeter() {
  const v = item().out;
  $("#needle").style.transform = `rotate(${(-52 + (v / 100) * 104).toFixed(1)}deg)`;
  $("#meterVal").textContent = v;
  $("#meterCap").textContent = bank().meter;
}
function renderAll(animate) {
  renderScreen(); renderSelector(); renderSlide(animate);
  renderGauges(); renderMeter();
  $("#printNote").textContent =
    `FEEDS CH ${String(S.idx + 1).padStart(2, "0")} OF BANK ${bank().label} ONTO TAPE.`;
}
/* ── the dial ───────────────────────────────────────────────── */
const knob = $("#knob"), knurl = $("#knurl");
const STEP_DEG = 30;
let base = 0, acc = 0, dragging = false, last = 0;
const angleOf = (e) => {
  const b = knob.getBoundingClientRect();
  return Math.atan2(e.clientY - (b.top + b.height / 2),
                    e.clientX - (b.left + b.width / 2)) * 180 / Math.PI;
};
function stepTo(i, animate) {
  const n = bank().items.length;
  const next = ((i % n) + n) % n;
  if (next === S.idx) return;
  S.idx = next;
  SFX.play("detent");
  kick(0.9);
  renderAll(animate !== false);
}
knob.addEventListener("pointerdown", (e) => {
  dragging = true; last = angleOf(e);
  try { knob.setPointerCapture(e.pointerId); } catch (_) {}
});
knob.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const a = angleOf(e);
  let d = a - last;
  if (d > 180) d -= 360; else if (d < -180) d += 360;
  last = a; base += d; acc += d;
  knurl.style.transform = `rotate(${base}deg)`;
  while (acc >= STEP_DEG) { acc -= STEP_DEG; stepTo(S.idx + 1); }
  while (acc <= -STEP_DEG) { acc += STEP_DEG; stepTo(S.idx - 1); }
});
const endDrag = () => { dragging = false; };
knob.addEventListener("pointerup", endDrag);
knob.addEventListener("pointercancel", endDrag);
knob.addEventListener("keydown", (e) => {
  const d = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1
          : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
  if (!d) return;
  e.preventDefault();
  base += d * STEP_DEG;
  knurl.style.transform = `rotate(${base}deg)`;
  stepTo(S.idx + d);
});
/* ── bank buttons ───────────────────────────────────────────── */
$("#modebank").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-mode]");
  if (!btn || btn.dataset.mode === S.mode) return;
  document.querySelectorAll("#modebank .pbtn").forEach((b) => b.classList.remove("is-on"));
  btn.classList.add("is-on");
  S.mode = btn.dataset.mode; S.idx = 0; base = 0; acc = 0;
  knurl.style.transform = "rotate(0deg)";
  buildDetents(); buildGauges();
  $("#modeNote").textContent = bank().note;
  SFX.play("key");
  kick(1.15);
  renderAll(true);
});
/* ── tube toggles: real switches, real effects ──────────────── */
$("#tgScan").addEventListener("change", (e) => {
  crt.dataset.scan = e.target.checked ? "1" : "0";
  $("#stScan").textContent = e.target.checked ? "ON" : "OFF"; SFX.play("toggle"); kick(0.55);
});
$("#tgPh").addEventListener("change", (e) => {
  crt.dataset.ph = e.target.checked ? "green" : "amber";
  const ph = e.target.checked ? "P1 GREEN" : "P3 AMBER";
  $("#stPh").textContent = ph; $("#bezelPh").textContent = ph;
  SFX.play("toggle"); SFX.play("glitch"); kick(1.1);
});
$("#tgVerbose").addEventListener("change", (e) => {
  crt.dataset.verbose = e.target.checked ? "1" : "0";
  $("#stVerbose").textContent = e.target.checked ? "FULL" : "TERSE"; SFX.play("toggle"); kick(0.4);
});
/* ── the audio switch: sound is opt-in, and its own first click is the
   gesture that unlocks playback in the browser ── */
const tgAudio = $("#tgAudio");
if (tgAudio) {
  tgAudio.addEventListener("change", (e) => {
    SFX.setOn(e.target.checked);
    const st = $("#stAudio");
    if (st) st.textContent = e.target.checked ? "ON" : "MUTED";
  });
}
/* ── slide advance lever ────────────────────────────────────── */
const lever = $("#lever");
lever.addEventListener("click", () => {
  SFX.play("slide");
  lever.classList.add("is-thrown");
  setTimeout(() => lever.classList.remove("is-thrown"), 230);
  base += STEP_DEG; knurl.style.transform = `rotate(${base}deg)`;
  stepTo(S.idx + 1);
});
/* ── the printer ────────────────────────────────────────────── */
const W = 40;
const clip = (s) => (s.length > W ? s.slice(0, W) : s);
const rule = (c) => c.repeat(W);
const pad = (s) => clip(s) + " ".repeat(Math.max(0, W - clip(s).length));
const centre = (s) => {
  s = clip(s);
  return " ".repeat(Math.max(0, Math.floor((W - s.length) / 2))) + s;
};
const leader = (l, r) => {
  l = String(l).toUpperCase(); r = String(r).toUpperCase();
  const dots = Math.max(2, W - l.length - r.length - 2);
  return clip(`${l} ${".".repeat(dots)} ${r}`);
};
const wrapText = (t, w = W) => {
  const out = []; let line = "";
  for (const word of t.split(/\s+/)) {
    if (!line.length) line = word.slice(0, w);
    else if (line.length + 1 + word.length <= w) line += " " + word;
    else { out.push(line); line = word.slice(0, w); }
  }
  if (line) out.push(line);
  return out;
};
const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}-${MONTHS[d.getMonth()]}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function receipt() {
  const it = item(), b = bank();
  S.printed += 1;
  const L = [];
  L.push(centre("RACHMAD INSTRUMENTS"));
  L.push(centre("MODEL AH-19 PORTFOLIO CONSOLE"));
  L.push(rule("="));
  L.push(`BANK ${b.label}   CH ${String(S.idx + 1).padStart(2, "0")}/${String(b.items.length).padStart(2, "0")}   [${it.badge}]`);
  L.push("");
  const title = { t: pad("  " + it.n.slice(0, W - 4) + "  "), invert: true };
  L.push(title);
  L.push("");
  wrapText(it.sub).forEach((l) => L.push(l));
  L.push(rule("-"));
  it.rows.forEach((r) => L.push(leader(r[0], r[1])));
  L.push(rule("-"));
  wrapText(it.copy).forEach((l) => L.push(l));
  if (it.extra) { L.push(""); wrapText(it.extra).forEach((l) => L.push(l)); }
  L.push(rule("-"));
  b.gauges.forEach((g, i) => {
    const v = it.levels[i], bars = Math.round(v / 10);
    L.push(clip(`${g.padEnd(11).slice(0, 11)} ${"█".repeat(bars)}${"·".repeat(10 - bars)} ${String(v).padStart(3)}`));
  });
  L.push(leader(b.meter, `${it.out}/100`));
  L.push(rule("-"));
  L.push(it.slide ? clip("SLIDE  " + it.slide.cap) : "SLIDE  NONE ON FILE — TEST PATTERN");
  L.push(rule("="));
  L.push({ t: `SER AH19-${String(S.printed).padStart(4, "0")}`, fade: true });
  L.push({ t: stamp(), fade: true });
  L.push({ t: "aufanhakim1920@gmail.com", fade: true });
  L.push({ t: "MELBOURNE VIC / SURABAYA JI", fade: true });
  return L;
}
const tape = $("#tape"), tapeInner = $("#tapeInner");
function printTape() {
  SFX.play("feed");
  const empty = tapeInner.querySelector(".tape__empty");
  if (empty) empty.remove();
  const block = document.createElement("div");
  block.className = "tape__block";
  block.innerHTML = receipt().map((l) => {
    if (typeof l === "string") return esc(l);
    if (l.invert) return `<span class="hl">${esc(l.t)}</span>`;
    return `<span class="fade">${esc(l.t)}</span>`;
  }).join("\n") + "\n" + esc(rule("·"));
  tapeInner.appendChild(block);
  tape.classList.remove("is-torn");
  tape.style.height = tapeInner.scrollHeight + "px";
  tape.classList.remove("is-feeding"); void tape.offsetWidth; tape.classList.add("is-feeding");
  setTimeout(() => tape.classList.remove("is-feeding"), 900);
  kick(0.7);
}
$("#printBtn").addEventListener("click", printTape);
$("#tearBtn").addEventListener("click", () => {
  SFX.play("tear");
  if (!tapeInner.children.length) return;
  tape.classList.add("is-torn");
  setTimeout(() => {
    tapeInner.innerHTML = "";
    tape.style.height = "0px";
    tape.classList.remove("is-torn");
  }, 460);
  kick(0.5);
});
/* ── clock: text changes, nothing moves ─────────────────────── */
function tickClock() {
  const d = new Date(), p = (n) => String(n).padStart(2, "0");
  $("#clock").textContent = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())} LOCAL`;
}
tickClock(); setInterval(tickClock, 1000);
/* ── boot ───────────────────────────────────────────────────── */
buildDetents(); buildGauges(); buildMeterTicks();
$("#modeNote").textContent = bank().note;
renderAll(false);
tapeInner.innerHTML = `<p class="tape__empty">tape empty — press print</p>`;
tape.style.height = tapeInner.scrollHeight + "px";
kick(1.3);
/* expose for verification harnesses */
window.AH19 = {
  state: S,
  step: (n) => stepTo(S.idx + n),
  print: printTape,
  read: () => ({
    mode: S.mode,
    ch: S.idx + 1,
    name: item().n,
    screenTitle: document.querySelector(".crt__title")?.textContent || null,
    knurl: knurl.style.transform || "none",
    tapeHeight: tape.getBoundingClientRect().height,
    tapeBlocks: tapeInner.querySelectorAll(".tape__block").length,
    slide: $("#slideImg").hidden ? "TEST PATTERN" : $("#slideImg").getAttribute("src"),
    gauge0: document.querySelector("[data-f='0']")?.style.width || null,
    needle: $("#needle").style.transform,
  }),
};
