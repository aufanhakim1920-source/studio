const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!REDUCED) document.documentElement.classList.add("motion");

/* ── the trading day ─────────────────────────────────────────────────── */
/* minutes from midnight; kitchen closes before the room does */
const HOURS = [
  { day: "Sunday",    open: 8 * 60, close: 15 * 60 },
  { day: "Monday",    open: 7 * 60, close: 15 * 60 },
  { day: "Tuesday",   open: 7 * 60, close: 15 * 60 },
  { day: "Wednesday", open: 7 * 60, close: 15 * 60 },
  { day: "Thursday",  open: 7 * 60, close: 15 * 60 },
  { day: "Friday",    open: 7 * 60, close: 15 * 60 },
  { day: "Saturday",  open: 8 * 60, close: 15 * 60 },
];
const KITCHEN_CLOSE = 14 * 60 + 30;

/* every item carries the window it is actually available in */
const MENU = [
  { name: "Espresso",                     price: 4.00,  from: 0,           to: 24 * 60, kind: "Coffee" },
  { name: "Long black",                   price: 4.50,  from: 0,           to: 24 * 60, kind: "Coffee" },
  { name: "Flat white / latte / cap",     price: 5.00,  from: 0,           to: 24 * 60, kind: "Coffee" },
  { name: "Batch filter",                 price: 4.50,  from: 0,           to: 13 * 60, kind: "Coffee", why: "brewed till 1" },
  { name: "Pour over, single origin",     price: 6.50,  from: 0,           to: 24 * 60, kind: "Coffee" },
  { name: "Hot chocolate",                price: 5.50,  from: 0,           to: 24 * 60, kind: "Coffee" },
  { name: "Pastry of the morning",        price: 6.50,  from: 0,           to: 11 * 60, kind: "Kitchen", why: "mornings only" },
  { name: "Sourdough, cultured butter",   price: 9.00,  from: 0,           to: KITCHEN_CLOSE, kind: "Kitchen" },
  { name: "Eggs your way on toast",       price: 15.00, from: 0,           to: KITCHEN_CLOSE, kind: "Kitchen" },
  { name: "Bacon & egg roll",             price: 13.50, from: 0,           to: 11 * 60 + 30, kind: "Kitchen", why: "till 11:30" },
  { name: "Mushrooms, thyme, ricotta",    price: 21.00, from: 11 * 60,     to: KITCHEN_CLOSE, kind: "Kitchen", why: "from 11" },
  { name: "Toastie of the week",          price: 14.00, from: 11 * 60,     to: KITCHEN_CLOSE, kind: "Kitchen", why: "from 11" },
];

/* ── time ────────────────────────────────────────────────────────────── */
/* ?t=8:30 previews any hour. Genuinely useful — an owner can check what the
   page says at opening without waiting until 7am. */
function now() {
  const d = new Date();
  const q = new URLSearchParams(location.search).get("t");
  if (q && /^\d{1,2}:\d{2}$/.test(q)) {
    const [h, m] = q.split(":").map(Number);
    if (h < 24 && m < 60) d.setHours(h, m, 0, 0);
  }
  return d;
}

const pad = (n) => String(n).padStart(2, "0");
const clock = (mins) => `${Math.floor(mins / 60)}:${pad(mins % 60)}`;
function human(mins) {
  const h = Math.floor(mins / 60), m = mins % 60;
  if (h && m) return `${h} hr ${m} min`;
  if (h) return `${h} hour${h > 1 ? "s" : ""}`;
  return `${m} min`;
}

function status() {
  const d = now();
  const mins = d.getHours() * 60 + d.getMinutes();
  const today = HOURS[d.getDay()];
  const open = mins >= today.open && mins < today.close;
  const closingSoon = open && today.close - mins <= 45;
  const kitchenOpen = open && mins < KITCHEN_CLOSE;

  let tail, until;
  if (open) {
    tail = closingSoon ? "but not for long" : "right now";
    until = `Closing at ${clock(today.close)} — ${human(today.close - mins)} left.` +
      (kitchenOpen
        ? ` Kitchen runs until ${clock(KITCHEN_CLOSE)}.`
        : " Kitchen has closed, coffee only.");
  } else {
    // find the next opening, today or the next day that has one
    let addDays = mins < today.open ? 0 : 1;
    let nd = HOURS[(d.getDay() + addDays) % 7];
    let wait = addDays === 0 ? today.open - mins : (24 * 60 - mins) + nd.open;
    tail = addDays === 0 ? "until this morning" : "until tomorrow";
    until = `Opening ${addDays === 0 ? "today" : nd.day} at ${clock(nd.open)} — ${human(wait)} away.`;
  }
  return { d, mins, today, open, closingSoon, kitchenOpen, tail, until };
}

/* ── paint ───────────────────────────────────────────────────────────── */
let showAll = false;

function paint() {
  const s = status();

  $("#clock").textContent = `${pad(s.d.getHours())}:${pad(s.d.getMinutes())}`;
  $("#state").textContent = s.open ? (s.closingSoon ? "Closing" : "Open") : "Closed";
  $("#tail").textContent = s.tail;
  $("#until").textContent = s.until;

  document.body.dataset.state = s.open ? (s.closingSoon ? "soon" : "open") : "shut";

  // the day bar
  const span = s.today.close - s.today.open;
  const k = Math.min(1, Math.max(0, (s.mins - s.today.open) / span));
  $("#dbFill").style.width = (s.open ? k * 100 : (s.mins >= s.today.close ? 100 : 0)) + "%";
  $("#dbMark").style.left = (s.open ? k * 100 : (s.mins >= s.today.close ? 100 : 0)) + "%";
  $("#dbMark").style.display = s.open ? "block" : "none";
  $("#dbKitchen").style.width = ((KITCHEN_CLOSE - s.today.open) / span * 100) + "%";

  paintMenu(s);
  paintWeek(s);
}

function paintMenu(s) {
  const live = MENU.map((m) => ({ ...m, on: s.open && s.mins >= m.from && s.mins < m.to }));
  const list = showAll ? live : live.filter((m) => m.on);

  $("#servingTitle").textContent =
    showAll ? "The full menu" : (s.open ? "Serving right now" : "Not serving yet");

  if (!list.length) {
    $("#items").innerHTML =
      `<li class="empty">Nothing is being served at ${clock(s.mins)}. Switch to “Everything” to see the full menu.</li>`;
  } else {
    let kind = "";
    $("#items").innerHTML = list.map((m) => {
      const head = m.kind !== kind ? (kind = m.kind, `<li class="kind">${m.kind}</li>`) : "";
      return head + `
      <li class="item ${m.on ? "" : "off"}">
        <span class="i-name">${m.name}</span>
        ${m.why ? `<span class="i-why">${m.why}</span>` : ""}
        <span class="i-price">${m.price.toFixed(2)}</span>
      </li>`;
    }).join("");
  }

  const offCount = live.filter((m) => !m.on).length;
  $("#menuNote").textContent = showAll && offCount
    ? `${offCount} item${offCount > 1 ? "s" : ""} greyed out are not available at ${clock(s.mins)}.`
    : "Oat, soy and lactose-free at no extra charge.";
}

function paintWeek(s) {
  const todayIdx = s.d.getDay();
  $("#week").innerHTML = HOURS.map((h, i) => `
    <li class="${i === todayIdx ? "today" : ""}">
      <span class="w-day">${h.day}</span>
      <span class="w-time">${clock(h.open)} &ndash; ${clock(h.close)}</span>
      ${i === todayIdx ? '<span class="w-tag">today</span>' : ""}
    </li>`).join("");
}

/* ── controls ────────────────────────────────────────────────────────── */
$("#tgNow").addEventListener("click", () => setMode(false));
$("#tgAll").addEventListener("click", () => setMode(true));
function setMode(all) {
  showAll = all;
  $("#tgNow").classList.toggle("on", !all);
  $("#tgAll").classList.toggle("on", all);
  $("#tgNow").setAttribute("aria-pressed", String(!all));
  $("#tgAll").setAttribute("aria-pressed", String(all));
  paint();
}

/* ── motion ──────────────────────────────────────────────────────────── */
$$("[data-enter]").forEach((el) => {
  el.style.setProperty("--d", (el.dataset.enter - 1) * 95 + "ms");
  requestAnimationFrame(() => el.classList.add("in"));
});

const rise = $$("[data-rise]");
if (REDUCED) rise.forEach((el) => el.classList.add("in"));
else {
  rise.forEach((el) => {
    const sibs = [...el.parentElement.children].filter((c) => c.hasAttribute("data-rise"));
    el.style.setProperty("--d", Math.min(Math.max(sibs.indexOf(el), 0), 4) * 75 + "ms");
  });
  let q = false;
  const sweep = () => {
    q = false;
    const line = innerHeight * 0.94;
    for (let i = rise.length - 1; i >= 0; i--) {
      if (rise[i].getBoundingClientRect().top < line) {
        rise[i].classList.add("in"); rise.splice(i, 1);
      }
    }
  };
  const ping = () => { if (!q) { q = true; requestAnimationFrame(sweep); } };
  addEventListener("scroll", ping, { passive: true });
  addEventListener("resize", ping);
  sweep();
}

/* the static hours line is only redundant once the live answer is showing */
$("#fallback").classList.add("quiet");

paint();
setInterval(paint, 30000);      // a page left open should not go stale
