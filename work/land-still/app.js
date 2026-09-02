/* STILL — landing page 1 of 3 (the chill one)
 * ---------------------------------------------------------------------------
 * ⭐ THE OBJECT: a sand timer, drawn by hand on a canvas.
 *
 * It is the object because a sauna already HAS one — [[Object Must Be In Theme]]:
 * an invented object from the wrong world is worse than none. A sand timer on a
 * sauna page is not a metaphor, it is the equipment.
 *
 * It is load-bearing: the length you flip to is the session you are booking, so
 * the timer drives the three session cards, the readout and the caption. Delete
 * the glass and the page loses its selector, not just a picture.
 *
 * MOTION: one object, one motion — the sand level falling. Per the corrected
 * [[Motion Must Be User Driven]] the failure mode is MANY independent movers,
 * not movement itself. There is no particle field here; the sand is two filled
 * shapes and one thin stream, and it only runs after the visitor flips it.
 */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

const SESSIONS = [
  { n: "01", min: 8,  name: "the short one", d: "One round. Enough to find out whether you like it." },
  { n: "02", min: 12, name: "the usual",     d: "Two rounds with a rest between. What most people book." },
  { n: "03", min: 20, name: "the long one",  d: "Three rounds, and a cold rinse to finish. Bring breakfast." },
];

const STEPS = [
  ["01", "Two minutes in the bay", "13°C this morning. You walk in to your shoulders and you stay still. The first thirty seconds are the hard part.", "13°C", "#BCCBEA"],
  ["02", "Twelve in the sauna",    "Wood-fired, 82°C on the top bench and about 68°C on the bottom. Sit low the first time.", "82°C", "#E1DCCB"],
  ["03", "Rest on the deck",       "Three minutes doing nothing at all, which is the part everyone skips and the part that works.", "3 min", "#BECFBB"],
];

const INC = [
  ["Towel", "Laundered daily, waiting on your hook"],
  ["Robe", "Wool-lined, yours for the session"],
  ["Tea", "Hot, unlimited, on the deck"],
  ["Locker", "With a key you can swim with"],
];

const PLANS = [
  ["Drop-in", "$18", "once", ["Any single morning", "Towel and robe", "No membership"], false],
  ["Ten mornings", "$150", "$15 each", ["Ten sessions, any length", "Valid twelve months", "Shareable with one guest"], true],
  ["Unlimited", "$95", "per month", ["Six mornings a week", "Book up to two weeks out", "Pause any month"], false],
];

const QA = [
  ["Is it safe if I have never done it?", "Yes, with the rule we run for everyone: you go in to your shoulders, not your head, and a guide stays on the sand for the whole two minutes. If you want out at forty seconds you get out at forty seconds. Nobody counts you down."],
  ["What is the water actually like in winter?", "Between 11°C and 13°C from June to September, and around 19°C in February. The bay is shallow here so it moves slowly — the number on the footer is measured at the end of the pier each morning."],
  ["Do I need to bring anything?", "Swimmers and yourself. Towel, robe, locker and tea are included, and there is a hot outdoor shower. People bring thongs for the walk down, which is a good idea in July."],
  ["Can I come with someone?", "The ten-morning card can be shared with one guest, so two of you can come five times. Drop-in is per person. Groups over six need a Sunday, because the sauna seats eight."],
  ["What happens if the weather is bad?", "We run in rain and we run in wind. We close for lightning and for a bay warning, and if we close you keep the session — it goes back on your card automatically, no email needed."],
];

/* ── the sand timer ───────────────────────────────────────────────────────── */
function timer() {
  const cv = $("#cv"), ctx = cv.getContext("2d");
  const W = cv.width, H = cv.height;
  let minutes = 12, t = 0, running = false, raf = 0;

  /* the glass outline, as two funnels meeting at a neck. Drawn once per frame,
     which is cheap, and lets the sand clip to it exactly. */
  const NECK = 16, TOP = 70, BOT = H - 70, MID = H / 2, HALF = 128;

  function funnel(up) {
    const p = new Path2D();
    if (up) { p.moveTo(W/2 - HALF, TOP); p.lineTo(W/2 + HALF, TOP);
              p.lineTo(W/2 + NECK/2, MID); p.lineTo(W/2 - NECK/2, MID); }
    else    { p.moveTo(W/2 - NECK/2, MID); p.lineTo(W/2 + NECK/2, MID);
              p.lineTo(W/2 + HALF, BOT); p.lineTo(W/2 - HALF, BOT); }
    p.closePath();
    return p;
  }
  const UP = funnel(true), DOWN = funnel(false);

  function draw() {
    ctx.clearRect(0, 0, W, H);

    /* frame: two caps and two posts, in ink */
    ctx.strokeStyle = "#12140F"; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(W/2 - HALF - 16, TOP - 14); ctx.lineTo(W/2 + HALF + 16, TOP - 14);
    ctx.moveTo(W/2 - HALF - 16, BOT + 14); ctx.lineTo(W/2 + HALF + 16, BOT + 14);
    ctx.moveTo(W/2 - HALF - 8, TOP - 14);  ctx.lineTo(W/2 - HALF - 8, BOT + 14);
    ctx.moveTo(W/2 + HALF + 8, TOP - 14);  ctx.lineTo(W/2 + HALF + 8, BOT + 14);
    ctx.stroke();

    /* the glass itself */
    ctx.fillStyle = "rgba(255,255,255,.5)";
    ctx.fill(UP); ctx.fill(DOWN);

    const done = Math.min(t, 1);

    /* upper sand: a level that falls. Clipped to the funnel, so the shape of
       the sand is the shape of the glass and nothing has to be computed. */
    ctx.save(); ctx.clip(UP);
    ctx.fillStyle = "#C9A15E";
    const topY = TOP + (MID - TOP) * done;
    ctx.fillRect(0, topY, W, MID - topY);
    ctx.restore();

    /* lower pile: grows as a cone, because sand does */
    ctx.save(); ctx.clip(DOWN);
    ctx.fillStyle = "#C9A15E";
    const pileH = (BOT - MID) * done;
    ctx.beginPath();
    ctx.moveTo(W/2 - HALF, BOT);
    ctx.lineTo(W/2 + HALF, BOT);
    ctx.lineTo(W/2 + HALF * done, BOT - pileH * .78);
    ctx.lineTo(W/2, BOT - pileH);
    ctx.lineTo(W/2 - HALF * done, BOT - pileH * .78);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    /* the stream — one thin line, only while it is actually running */
    if (running && done < 1) {
      ctx.strokeStyle = "#C9A15E"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(W/2, MID); ctx.lineTo(W/2, BOT - pileH); ctx.stroke();
    }

    /* the outline last, so it sits on top of the sand */
    ctx.strokeStyle = "#12140F"; ctx.lineWidth = 4;
    ctx.stroke(UP); ctx.stroke(DOWN);
  }

  /* 8/12/20 real minutes is not a demo. The glass runs on a compressed clock so
     a visitor can watch it empty: the LABEL is honest, the animation is 20s. */
  const RUN_MS = 20000;
  let started = 0;

  function loop(now) {
    if (!started) started = now;
    t = (now - started) / RUN_MS;
    const left = Math.max(0, minutes * 60 * (1 - Math.min(t, 1)));
    $("#read").textContent =
      `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(Math.floor(left % 60)).padStart(2, "0")} remaining`;
    draw();
    if (t < 1) raf = requestAnimationFrame(loop);
    else { running = false; $("#flip").classList.remove("is-run"); $(".flip__t").textContent = "Flip again"; }
  }

  function start() {
    cancelAnimationFrame(raf);
    started = 0; t = 0; running = true;
    $("#flip").classList.add("is-run");
    $(".flip__t").textContent = "Running";
    if (REDUCED) { t = 1; running = false; draw(); $("#read").textContent = "00:00 remaining"; return; }
    raf = requestAnimationFrame(loop);
  }

  function set(m, name) {
    minutes = m;
    cancelAnimationFrame(raf); running = false; t = 0;
    $("#flip").classList.remove("is-run");
    $(".flip__t").textContent = "Flip to start";
    $("#lens").textContent = name;
    $("#read").textContent = `${String(m).padStart(2, "0")}:00 remaining`;
    draw();
  }

  $("#flip").addEventListener("click", start);
  draw();
  return { set };
}

/* ── page ─────────────────────────────────────────────────────────────────── */
function init() {
  const T = timer();

  $("#picks").innerHTML = SESSIONS.map((s, i) => `
    <button class="pick" type="button" aria-pressed="${i === 1}" data-m="${s.min}" data-name="${s.name}">
      <span class="pick__n">${s.n} &middot; ${s.name}</span>
      <span class="pick__m">${s.min}<small>MIN</small></span>
      <span class="pick__d">${s.d}</span>
    </button>`).join("");

  /* picking a length re-fills the glass — the object and the cards are one control */
  $$("#picks .pick").forEach((b) => b.addEventListener("click", () => {
    $$("#picks .pick").forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
    T.set(Number(b.dataset.m), b.dataset.name);
  }));

  /* ⚠️ Sync the glass to whichever card starts pressed. The markup shipped a
     hard-coded "08:00 / the short one" while the pressed card was the 12-minute
     one — two sources of truth for the same state, disagreeing on first paint. */
  const first = $("#picks .pick[aria-pressed='true']") || $("#picks .pick");
  T.set(Number(first.dataset.m), first.dataset.name);

  $("#steps").innerHTML = STEPS.map(([n, h, p, x, bg]) => `
    <li class="step" style="--bg:${bg}">
      <span class="step__n">${n}</span>
      <h3>${h}</h3>
      <p>${p}</p>
      <span class="step__x">${x}</span>
    </li>`).join("");

  $("#inc").innerHTML = INC.map(([b, s]) =>
    `<div class="cell"><b>${b}</b><span>${s}</span></div>`).join("");

  $("#plans").innerHTML = PLANS.map(([k, p, u, l, hot]) => `
    <article class="plan${hot ? " plan--hot" : ""}">
      <span class="plan__k">${k}${hot ? " &middot; most booked" : ""}</span>
      <span class="plan__p">${p}<small>${u}</small></span>
      <ul>${l.map((x) => `<li>${x}</li>`).join("")}</ul>
      <a href="#">${hot ? "Buy a card" : "Choose"}</a>
    </article>`).join("");

  /* the questions — animated, per the rule set on the previous build */
  $("#qa").innerHTML = QA.map(([q, a], i) => `
    <details${i === 0 ? " open" : ""}>
      <summary>${q}</summary>
      <div class="a"><div><p>${a}</p></div></div>
    </details>`).join("");

  const rows = $$("#qa details");
  rows.forEach((d) => { if (d.open) d.classList.add("is-open"); });

  const close = (d) => {
    if (!d.open) return;
    d.classList.remove("is-open");
    if (REDUCED) { d.open = false; return; }
    const panel = d.querySelector(".a");
    const done = (e) => {
      if (e.propertyName !== "grid-template-rows") return;
      panel.removeEventListener("transitionend", done);
      if (!d.classList.contains("is-open")) d.open = false;
    };
    panel.addEventListener("transitionend", done);
  };

  rows.forEach((d) => {
    d.querySelector("summary").addEventListener("click", (e) => {
      e.preventDefault();
      if (d.open) { close(d); return; }
      rows.forEach((o) => o !== d && close(o));
      d.open = true;
      /* two frames: 0fr must be committed before 1fr, or there is no transition */
      requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add("is-open")));
    });
  });

  const tick = () => $("#clock").textContent = new Date().toLocaleTimeString("en-AU",
    { timeZone: "Australia/Melbourne", hour: "2-digit", minute: "2-digit" });
  tick(); setInterval(tick, 30000);
}

init();
