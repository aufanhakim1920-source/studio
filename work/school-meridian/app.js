/* MERIDIAN — an evening school in celestial navigation
 * ---------------------------------------------------------------------------
 * ⭐ THE OBJECT: a quadrant.
 *
 * The pivot at the bottom-left is the observer's eye, the graduated limb is an
 * altitude scale from 0° at the horizon to 90° overhead, and the index arm goes
 * wherever the visitor aims it. Eight real southern navigational stars sit in
 * the quadrant. Put the arm on one and the instrument reads its altitude in
 * degrees and minutes and names the star — which is, in one gesture, the entire
 * thing the course teaches.
 *
 * It is load-bearing rather than decorative: the readout is the only place on
 * the page that shows what "taking a sight" actually produces, and deleting the
 * object would delete that explanation.
 *
 * MOTION RULE, applied strictly: nothing here starts by itself. The arm has a
 * short lerp so it reads as an instrument with mass rather than a hover state,
 * and the frame loop that drives that lerp SHUTS DOWN as soon as the arm has
 * arrived — there is no permanent rAF, no ambient loop, nothing on the page that
 * moves while the visitor is still.
 */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* geometry of the instrument, in viewBox units */
const PX = 72, PY = 470, R = 386;
const rad = (d) => (d * Math.PI) / 180;
const at  = (deg, r) => [PX + r * Math.cos(rad(deg)), PY - r * Math.sin(rad(deg))];

/* Eight stars a Melbourne observer actually uses, with real magnitudes. Their
 * ALTITUDE is their angle from the pivot — which is what the chart is: a 2D
 * elevation with the horizon as the baseline, so position and readout can never
 * disagree with each other. Distance from the pivot is arbitrary (stars are at
 * infinity) and is used only to spread them across the quadrant. */
const STARS = [
  /*  name              alt°  dist   mag      label side  */
  ["Rigil Kentaurus", 11.5, 300, "−0.27", "r"],
  ["Sirius",          22.8, 212, "−1.46", "r"],
  ["Canopus",         33.6, 330, "−0.74", "r"],
  /* ⚠️ Acrux is the one label that hangs LEFT, and it is not a style choice.
     A blanket "flip past the midline" rule put Acrux's name and Canopus's name
     at the same height 15 units apart and they printed on top of each other as
     "AcCanopus" — visible in the first screenshot. Label placement on a chart
     is per-point work; a threshold cannot see a collision. */
  ["Acrux",           46.9, 250, "+0.77", "l"],
  ["Achernar",        57.4, 300, "+0.45", "r"],
  ["Altair",          64.2, 176, "+0.76", "r"],
    /* Antares also hangs left: at the larger phone label size its name grew into
     Achernar's. Two of eight labels flip; the other six do not need to. */
  ["Antares",         72.6, 286, "+1.06", "l"],
  ["Fomalhaut",       81.8, 216, "+1.16", "r"],
];

/* ── the chart ────────────────────────────────────────────────────────────── */
function chart() {
  const svg = $(".quad");
  if (!svg) return;

  /* background field. Deterministic — a fixed seed rather than Math.random, so
     the sky is the same sky on every load and in every screenshot. */
  let seed = 20270209;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  let field = "";
  for (let i = 0; i < 74; i++) {
    const x = 16 + rnd() * 528, y = 18 + rnd() * 436;
    const r = (0.5 + rnd() * 1.15).toFixed(2);
    const o = (0.16 + rnd() * 0.44).toFixed(2);
    field += `<circle class="fs" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" opacity="${o}"/>`;
  }
  $("#field").innerHTML = field;

  /* graduations: every 5°, longer and brighter every 15°, numbered every 15° */
  let ticks = "";
  for (let a = 0; a <= 90; a += 5) {
    const maj = a % 15 === 0;
    const [x1, y1] = at(a, R);
    const [x2, y2] = at(a, maj ? 367 : 375);
    ticks += `<line class="tick${maj ? " tick--maj" : ""}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
    if (maj) {
      /* ⚠️ The graduations are engraved OUTSIDE the limb, at radius 402. The
         first pass put them inside at 348 — which is exactly where the index
         frame on the end of the arm rides, so swinging the arm parked a box on
         top of "45". A scale you can cover with the thing that reads it is not
         a scale. The 0 also drops below the horizon line, or it prints on it. */
      const [tx, ty] = at(a, 402);
      ticks += `<text class="tnum" x="${tx.toFixed(1)}" y="${(ty + (a === 0 ? 22 : 5)).toFixed(1)}" text-anchor="middle">${a}</text>`;
    }
  }
  $("#ticks").innerHTML = ticks;

  /* the named stars */
  $("#stars").innerHTML = STARS.map(([name, ang, r, , side], i) => {
    const [x, y] = at(ang, r);
    const left = side === "l";
    return `<g class="star" data-i="${i}">
      <circle class="star__h" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="13"/>
      <circle class="star__c" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.4"/>
      <text class="star__n" x="${(left ? x - 15 : x + 15).toFixed(1)}" y="${(y + 5).toFixed(1)}"
            text-anchor="${left ? "end" : "start"}">${name}</text>
    </g>`;
  }).join("");

  const arm = $("#arm"), gs = $$(".star"), out = $("#alt"), sight = $("#sighted");

  /* ⚠️ The instrument rests on SIRIUS at 22.8°, and the angle was chosen, not
     picked. At 46.9° the index frame came down exactly on top of "Achernar" on
     load — the halo keeps a label readable under the thin arm, but not under a
     32-unit solid frame. At 22.8° the frame sits in empty sky, and the page
     arrives sighting the brightest star there is. */
  let angle = 22.8, target = 22.8, running = false;

  function paint() {
    arm.setAttribute("transform", `rotate(${-angle} ${PX} ${PY})`);
    const d = Math.floor(angle);
    const m = (angle - d) * 60;
    out.innerHTML = `${d}&deg; ${m.toFixed(1)}&prime;`;

    /* whichever star the arm is within 2.2° of is "in the sights" */
    let hit = -1;
    STARS.forEach(([, a], i) => { if (Math.abs(a - angle) < 2.2) hit = i; });
    gs.forEach((g, i) => g.classList.toggle("is-sighted", i === hit));
    if (hit < 0) {
      sight.textContent = "NO STAR IN THE SIGHTS";
      sight.classList.add("is-empty");
    } else {
      sight.textContent = `SIGHTED · ${STARS[hit][0].toUpperCase()} · MAG ${STARS[hit][3]}`;
      sight.classList.remove("is-empty");
    }
  }

  /* The lerp exists so the arm has weight; the loop exists only while it is
     still travelling. When it arrives, the page is completely still again. */
  function tick() {
    angle += (target - angle) * 0.24;
    if (Math.abs(target - angle) < 0.02) { angle = target; running = false; }
    paint();
    if (running) requestAnimationFrame(tick);
  }
  function aimAt(a) {
    target = Math.max(0, Math.min(90, a));
    if (REDUCED) { angle = target; paint(); return; }
    if (!running) { running = true; requestAnimationFrame(tick); }
  }

  function fromEvent(e) {
    const b = svg.getBoundingClientRect();
    const vx = ((e.clientX - b.left) / b.width) * 560;
    const vy = ((e.clientY - b.top) / b.height) * 560;
    aimAt((Math.atan2(PY - vy, vx - PX) * 180) / Math.PI);
  }

  /* A mouse aims on hover. A finger has to press first, otherwise the arm would
     jump on every scroll that happens to pass under a thumb. */
  let down = false;
  svg.addEventListener("pointerdown", (e) => { down = true; fromEvent(e); });
  addEventListener("pointerup", () => { down = false; });
  addEventListener("pointercancel", () => { down = false; });
  svg.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse" || down) fromEvent(e);
  }, { passive: true });

  /* and it is fully operable from the keyboard, which is the same instrument,
     not a lesser fallback: 1° a press, 5° with shift, ends of the scale on
     Home and End. */
  svg.addEventListener("keydown", (e) => {
    const step = e.shiftKey ? 5 : 1;
    const k = e.key;
    if (k === "ArrowUp" || k === "ArrowLeft") aimAt(target + step);
    else if (k === "ArrowDown" || k === "ArrowRight") aimAt(target - step);
    else if (k === "Home") aimAt(0);
    else if (k === "End") aimAt(90);
    else if (k === "PageUp") aimAt(target + 10);
    else if (k === "PageDown") aimAt(target - 10);
    else return;
    e.preventDefault();
  });

  paint();
}

/* ── content ──────────────────────────────────────────────────────────────── */
const NIGHTS = [
  ["What a position line actually is",
   "One star does not give you a point. It gives you a line, and you need three of them.",
   ["Plotting sheet, dividers, pencil, no instruments. You draw a circle of position forty miles across, then a second one, and then argue with the person next to you about which of the two crossings you are standing at.",
    "We finish the night with a fix that is wrong on purpose, and spend the last twenty minutes working out exactly which assumption did it."],
   "18:30 ARRIVE · 18:45 START · 20:00 BREAK · 21:00 FINISH"],
  ["The sky has an address system",
   "Declination and Greenwich hour angle are latitude and longitude, painted on the inside of a sphere.",
   ["You take six stars off a planisphere and write down the point on the Earth each one is standing directly over at 21:00 tonight. Six lines of arithmetic, no theory.",
    "At 20:55 we walk out to the Faraday Street car park and find four of them, which is the first time most people realise the sky has an order to it."],
   "18:30 ARRIVE · 18:45 START · 20:55 OUTSIDE · 21:00 FINISH"],
  ["Time, and what two seconds costs",
   "Four seconds of error is one nautical mile of error. Your phone is fine. Your wristwatch probably is not.",
   ["You rate your own watch against the time signal, in front of everyone, and write the figure on a card. You will apply that figure to every sight you take for the rest of the term.",
    "Then we take the same star sight three times with a deliberate ten-second error introduced, and measure how far it moves the answer on the chart."],
   "18:30 ARRIVE · 18:45 START · 20:00 BREAK · 21:00 FINISH"],
  ["The sextant: parts and errors",
   "Perpendicularity, side error, index error. Three adjustments, in that order, every single time.",
   ["One sextant each, out of the case, for the whole night. You find your instrument's index error against a horizon we tape to the far wall, then you deliberately knock it out of adjustment and put it back.",
    "Everyone leaves with their instrument's number written inside the case lid. It is your number for the term."],
   "18:30 ARRIVE · 18:45 START · 20:00 BREAK · 21:00 FINISH"],
  ["Bringing a star down",
   "Rocking the arc, reading the micrometer drum, and producing a number you can defend to a tenth of a minute.",
   ["Twenty practice sights on a fixed light three hundred metres down the street. We collect everyone's numbers and put the spread on the whiteboard with no names on it.",
    "Almost everybody's second ten sights are better than their first ten, and seeing that happen to the whole room is the point of doing it this way."],
   "18:30 ARRIVE · 18:45 START · 20:00 BREAK · 21:00 FINISH"],
  ["Field night — Point Ormond",
   "Real horizon, real stars, real cold. Bring a coat you can still work your hands in.",
   ["19:30 at the car park. Sights from about 20:10 as the horizon starts to go, and we stop when it has gone — nautical twilight is roughly twenty-five minutes and it does not wait for you.",
    "Each of you takes three stars and records the watch time to the second. Nothing gets reduced tonight. That is next week, and it is much better with your own numbers."],
   "19:30 CAR PARK · 20:10 SIGHTS · 21:30 FINISH · RESERVE: THU"],
  ["The Nautical Almanac",
   "Turning the moment you pulled the trigger into a point on the Earth's surface.",
   ["Your own sights from last week, in the book. Increments and corrections, the v and d columns, and the interpolation that everyone gets wrong about four times before it sticks.",
    "We use the paper almanac all term. The app gives you the same number and teaches you nothing about where it came from."],
   "18:30 ARRIVE · 18:45 START · 20:00 BREAK · 21:00 FINISH"],
  ["Sight reduction",
   "The assumed position, the calculated altitude, and the intercept. This is the night it clicks, or it doesn't.",
   ["You reduce all three of your Point Ormond sights by tables, from start to finish, with the working shown.",
    "Then we do the same three sights again on a calculator, so you can watch two completely different methods land within a mile of each other. Nobody leaves this night unsure whether their answer is right."],
   "18:30 ARRIVE · 18:45 START · 20:00 BREAK · 21:00 FINISH"],
  ["Plotting, and the cocked hat",
   "Three position lines almost never meet at a point. What you do about that is most of the actual skill.",
   ["You plot your own fix and measure the triangle it makes. Then we hand you a set of sights with one deliberate blunder buried in them.",
    "You find the bad sight from the shape of the triangle alone, before you are allowed to check the working. It takes most people two goes."],
   "18:30 ARRIVE · 18:45 START · 20:00 BREAK · 21:00 FINISH"],
  ["The Sun",
   "Noon latitude, the running fix, and why the Sun does most of the real work at sea.",
   ["A Sun-run-Sun worked end to end from a real passage log — Hobart to Eden, February 2024 — including the four hours where the log was simply wrong and the navigator did not know it yet.",
    "You will finish this night able to get a latitude at local noon with nothing but a sextant and a watch you do not trust."],
   "18:30 ARRIVE · 18:45 START · 20:00 BREAK · 21:00 FINISH"],
  ["The corrections, one at a time",
   "Dip, refraction, semi-diameter, parallax. Each is worth miles, and they do not helpfully cancel out.",
   ["You build your own correction card from the tables, in your handwriting, and then test it against sights taken from three different heights of eye — the beach, the sea wall, and the top of the steps.",
    "The measured difference between those three is the whole argument for the dip correction, and it is more convincing than being told."],
   "18:30 ARRIVE · 18:45 START · 20:00 BREAK · 21:00 FINISH"],
  ["Field night and assessment",
   "Three star sights, taken, timed, reduced and plotted, inside five nautical miles. That is the pass.",
   ["Back to Point Ormond. Ninety minutes to take three stars, reduce them and plot the fix, with your own instrument and your own correction card.",
    "Marion holds a GPS position in her pocket and nobody sees it until every last person has finished. Then we go to the pub on Ormond Road and you find out how you did."],
   "19:30 CAR PARK · 20:10 SIGHTS · 21:30 FINISH · RESERVE: THU"],
];

const KIT = [
  ["A sextant", "Loaned for the term, one each, no charge. A Davis Mark 15 in plastic — good enough to pass the assessment, and light enough that you will not cry when you drop it. Back on night 12.", "LOANED, NO DEPOSIT"],
  ["A watch you can read to the second", "A $30 digital is genuinely fine, and a phone is fine on land. What matters is not accuracy, it is that you rate it on night three and keep that figure.", "BRING YOUR OWN"],
  ["The Nautical Almanac 2027", "$42 at the counter on night one, or buy it wherever you like. We use the paper edition every week, and the app is not a substitute for the exercise.", "$42"],
  ["A pencil and a warm coat", "2B pencils, a soft eraser, dividers and plotting sheets are on the desk each night. The coat is on you — Point Ormond in March is 11°C with the wind straight off the bay.", "TWO NIGHTS OUTDOORS"],
];

const TIERS = [
  ["One term", "$780", "per term",
   ["Twelve nights, 18:30–21:00 Tuesdays",
    "A sextant loaned for the whole term",
    "Plotting sheets, tables and correction cards",
    "Two field nights at Point Ormond",
    "Assessment and certificate on night 12"],
   false, "Enrol for the term"],
  ["Term and instrument", "$1,690", "per term",
   ["Everything in one term",
    "A Davis Mark 25 with a 3× scope, yours to keep",
    "Set up and adjusted with you on night 4",
    "Index error certified in your own handwriting",
    "Case, spare shades and a rating card"],
   true, "Enrol with a sextant"],
  ["Concession", "$520", "per term",
   ["Everything in one term",
    "Full-time students, pensioners, healthcare cards",
    "Four of the fourteen places are held at this rate",
    "Held until three weeks before term starts",
    "No means test and nothing to fill in"],
   false, "Enrol at concession"],
];

const QA = [
  ["Do I need a boat?",
   "No, and nobody sails during the course. Ten of the twelve nights are in a classroom in Carlton and the other two are standing on the beach at Point Ormond. A good number of people who finish have never owned a boat and have no plans to."],
  ["How much maths is there?",
   "Addition, subtraction, and looking numbers up in a table. There is no trigonometry you have to do yourself — the tables did it in 1940 and they still do it now. If you can check a bank statement you can reduce a sight."],
  ["What happens if I miss a night?",
   "You need nine of the twelve to pass, and one of those nine has to be a field night. There are no recordings and there is no online option. If you miss more than three we will move you to the next term rather than let you finish without the middle of it, and you will not pay twice."],
  ["It is Melbourne. What if it is cloudy?",
   "Night 6 has a reserve date on the Thursday and we use it about one term in three. If both are clouded out we set up an artificial horizon indoors — a tray of oil and a lamp — which is a worse evening and a better lesson than either of us would like to admit."],
  ["Is this recognised anywhere?",
   "No. It is not a qualification, it counts toward no ticket, and it will not appear on any register. You finish with a certificate from us, a correction card in your own handwriting, and the ability to fix your position to about three miles. If you need a formal endorsement, do the AMSA course — and use this one to actually understand it."],
];

/* ── build ────────────────────────────────────────────────────────────────── */
function lists() {
  $("#nights").innerHTML = NIGHTS.map(([t, d, does, sched], i) => `
    <details class="row"${i === 0 ? " open" : ""}>
      <summary>
        <span class="n mono">${String(i + 1).padStart(2, "0")}</span>
        <span class="t">${t}</span>
        <span class="d">${d}</span>
        <span class="x" aria-hidden="true"></span>
      </summary>
      <div class="panel"><div><div class="panel__in">
        <div class="paper">
          <p class="paper__k mono">WHAT YOU ACTUALLY DO THAT NIGHT</p>
          ${does.map((p) => `<p class="do">${p}</p>`).join("")}
          <p class="sched mono">${sched.split(" · ").map((s) => `<span>${s}</span>`).join("")}</p>
        </div>
      </div></div></div>
    </details>`).join("");

  $("#kitgrid").innerHTML = KIT.map(([t, p, chip]) => `
    <article class="cell">
      <h3>${t}</h3>
      <p>${p}</p>
      <span class="chip mono">${chip}</span>
    </article>`).join("");

  $("#tiers").innerHTML = TIERS.map(([k, price, unit, li, hot, cta]) => `
    <article class="tier${hot ? " tier--hot" : ""}">
      <span class="tier__k">${k}${hot ? " · most taken" : ""}</span>
      <span class="tier__p">${price}<small>${unit}</small></span>
      <ul>${li.map((x) => `<li>${x}</li>`).join("")}</ul>
      <a href="#">${cta}</a>
    </article>`).join("");

  $("#qalist").innerHTML = QA.map(([q, a], i) => `
    <details class="row">
      <summary>
        <span class="n mono">${String(i + 1).padStart(2, "0")}</span>
        <span class="t">${q}</span>
        <span class="x" aria-hidden="true"></span>
      </summary>
      <div class="panel"><div><div class="panel__in">
        <p class="a">${a}</p>
      </div></div></div>
    </details>`).join("");
}

/* ── the disclosure, animated properly ────────────────────────────────────
 * `height: auto` is not animatable and `max-height` is a guess — too small clips
 * a long night, too large eases against nothing and feels slow. A grid ROW
 * interpolates the real measured height, so that is what moves.
 *
 * Opening one closes its neighbour, so a single click moves two things.
 */
function disclosure(root) {
  const rows = $$("details.row", root);
  rows.forEach((d) => { if (d.open) d.classList.add("is-open"); });

  const close = (d) => {
    if (!d.open) return;
    d.classList.remove("is-open");
    if (REDUCED) { d.open = false; return; }
    /* ⚠️ Wait for transitionend before removing [open]. Removing it straight
       away makes the content vanish instantly and the collapse then animates an
       empty box — which looks worse than not animating the close at all. */
    const panel = $(".panel", d);
    const done = (e) => {
      if (e.propertyName !== "grid-template-rows") return;
      panel.removeEventListener("transitionend", done);
      if (!d.classList.contains("is-open")) d.open = false;
    };
    panel.addEventListener("transitionend", done);
  };

  rows.forEach((d) => {
    $("summary", d).addEventListener("click", (e) => {
      e.preventDefault();
      if (d.open) { close(d); return; }
      rows.forEach((o) => o !== d && close(o));
      d.open = true;
      /* ⚠️ TWO requestAnimationFrames. One frame at 0fr has to be committed
         before flipping to 1fr, or the browser coalesces both values into a
         single style recalculation and there is no transition at all. One rAF
         is not enough; this was measured, not assumed. */
      requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add("is-open")));
    });
  });
}

function init() {
  lists();
  chart();
  disclosure($("#nights"));
  disclosure($("#qalist"));
}

init();
