/* Calendar — LANE 3: Claude's pick. The gap finder.
   =========================================================================
   Every calendar shows you what you are doing. This one shows you what you
   are NOT doing, because that is the question actually being asked — the
   vault has a whole procedure for it (The Free Time Sheet) and a live site
   built for it (the Week Board). So: fourteen days, and the FREE time is
   the bright thing. Events are the negative space.

   Same feature set as the other two lanes — add, edit, delete, persist —
   with one thing they do not have: clicking a gap starts a new event
   pre-filled with that exact window. The gap is the affordance.

   ⚠️ No ambient motion. A previous calendar front-end was rejected with
   "it makes me nauseous"; nothing here moves unless it is clicked. */

const KEY = "cal-gaps-events";
const KINDS = {
  class:    { label: "Class",    color: "#6EA8FF" },
  work:     { label: "Work",     color: "#FFA45B" },
  personal: { label: "Personal", color: "#C08BFF" },
};
const DAY_START = 6 * 60, DAY_END = 24 * 60;
const SPAN = DAY_END - DAY_START;
const DAYS = 14;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const toHHMM = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const fmt = (m) => { const h = Math.floor(m / 60), r = m % 60; return h && r ? `${h}h ${r}m` : h ? `${h}h` : `${r}m`; };
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ── state ───────────────────────────────────────────────────────────── */
const today = new Date(); today.setHours(0, 0, 0, 0);
let minGap = 60;                 // only gaps at least this long count as free
let events = load();
let editing = null;
let draftDate = iso(today);

function load() {
  try { const r = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(r)) return r; } catch {}
  return seed();
}
const save = () => localStorage.setItem(KEY, JSON.stringify(events));
function seed() {
  const m = new Date(today);
  m.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const on = (o, s, e, t, k) => {
    const d = new Date(m); d.setDate(m.getDate() + o);
    return { id: crypto.randomUUID(), date: iso(d), start: s, end: e, title: t, kind: k };
  };
  return [
    on(0, "10:00", "12:00", "Data Science lecture", "class"),
    on(0, "16:30", "21:00", "Shift", "work"),
    on(1, "09:00", "11:00", "Workshop", "class"),
    on(2, "07:00", "08:00", "Gym", "personal"),
    on(2, "13:00", "15:00", "Tutorial", "class"),
    on(3, "16:30", "21:00", "Shift", "work"),
    on(4, "10:00", "12:00", "Lecture", "class"),
    on(5, "08:00", "14:00", "Shift", "work"),
    on(6, "11:00", "12:30", "Coffee", "personal"),
    on(8, "10:00", "12:00", "Lecture", "class"),
    on(9, "16:30", "21:00", "Shift", "work"),
    on(11, "09:00", "13:00", "Group project", "class"),
  ];
}

const forDate = (k) => events.filter((e) => e.date === k).sort((a, b) => toMin(a.start) - toMin(b.start));

/* ── the actual idea: what is left over ──────────────────────────────── */
/* Merges overlapping events first — two events that overlap must not carve
   the same minute twice, or the free total comes out short. */
function gapsFor(key) {
  const busy = forDate(key)
    .map((e) => [Math.max(DAY_START, toMin(e.start)), Math.min(DAY_END, toMin(e.end))])
    .filter(([a, b]) => b > a)
    .sort((x, y) => x[0] - y[0]);

  const merged = [];
  for (const [a, b] of busy) {
    const last = merged[merged.length - 1];
    if (last && a <= last[1]) last[1] = Math.max(last[1], b);
    else merged.push([a, b]);
  }

  const gaps = [];
  let cursor = DAY_START;
  for (const [a, b] of merged) {
    if (a - cursor > 0) gaps.push([cursor, a]);
    cursor = Math.max(cursor, b);
  }
  if (DAY_END - cursor > 0) gaps.push([cursor, DAY_END]);
  return { merged, gaps };
}

/* ── draw ────────────────────────────────────────────────────────────── */
function draw() {
  let totalFree = 0, best = { len: 0 };
  let html = "";

  for (let i = 0; i < DAYS; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const key = iso(d);
    const { merged, gaps } = gapsFor(key);
    const keep = gaps.filter(([a, b]) => b - a >= minGap);
    const dayFree = keep.reduce((s, [a, b]) => s + (b - a), 0);
    totalFree += dayFree;
    for (const [a, b] of keep) if (b - a > best.len) best = { len: b - a, key, a, b, d };

    const pct = (v) => ((v - DAY_START) / SPAN) * 100;

    html += `
    <li class="row${i === 0 ? " today" : ""}" data-date="${key}">
      <div class="r-day">
        <span class="r-dow">${DOW[d.getDay()]}</span>
        <span class="r-num">${d.getDate()}</span>
        <span class="r-mon">${i === 0 || d.getDate() === 1 ? MON[d.getMonth()] : ""}</span>
      </div>
      <div class="r-track">
        ${merged.map(([a, b]) =>
          `<span class="busy" style="left:${pct(a)}%;width:${((b - a) / SPAN) * 100}%"></span>`).join("")}
        ${keep.map(([a, b]) => `
          <button class="gap" data-date="${key}" data-a="${a}" data-b="${b}"
                  style="left:${pct(a)}%;width:${((b - a) / SPAN) * 100}%"
                  aria-label="Free ${toHHMM(a)} to ${toHHMM(b)} on ${DOW[d.getDay()]} ${d.getDate()} — add something">
            <span>${b - a >= 105 ? fmt(b - a) : ""}</span>
          </button>`).join("")}
        ${forDate(key).map((e) => {
          const a = Math.max(DAY_START, toMin(e.start)), b = Math.min(DAY_END, toMin(e.end));
          if (b <= a) return "";
          return `<button class="ev" data-id="${e.id}" style="left:${pct(a)}%;width:${((b - a) / SPAN) * 100}%;--c:${KINDS[e.kind].color}"
                    title="${esc(e.title)} · ${e.start}–${e.end}"><span>${esc(e.title)}</span></button>`;
        }).join("")}
      </div>
      <div class="r-free">${dayFree ? fmt(dayFree) : "—"}</div>
    </li>`;
  }

  $("#rows").innerHTML = html;

  $("#statFree").textContent = fmt(totalFree);
  $("#statBest").textContent = best.len ? fmt(best.len) : "—";
  $("#statWhen").textContent = best.len
    ? `${DOW[best.d.getDay()]} ${best.d.getDate()} ${MON[best.d.getMonth()]}, ${toHHMM(best.a)}–${toHHMM(best.b)}`
    : "no gap that long";

  // clicking a gap opens the form already filled with that window
  $$("#rows .gap").forEach((g) => g.addEventListener("click", () => {
    draftDate = g.dataset.date;
    openForm(null, toHHMM(+g.dataset.a), toHHMM(Math.min(+g.dataset.a + 60, +g.dataset.b)));
  }));
  $$("#rows .ev").forEach((b) => b.addEventListener("click", () => {
    const e = events.find((x) => x.id === b.dataset.id);
    draftDate = e.date;
    openForm(e);
  }));
}

/* ── form ────────────────────────────────────────────────────────────── */
function openForm(ev, start, end) {
  editing = ev || null;
  const d = new Date(draftDate + "T00:00:00");
  $("#formTitle").textContent = ev ? "Edit event" : "New event";
  $("#formWhen").textContent = `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
  $("#fTitle").value = ev ? ev.title : "";
  $("#fStart").value = ev ? ev.start : (start || "09:00");
  $("#fEnd").value = ev ? ev.end : (end || "10:00");
  $("#fKind").value = ev ? ev.kind : "personal";
  $("#fDel").hidden = !ev;
  $("#sheet").hidden = false;
  $("#fTitle").focus();
}
function closeForm() { $("#sheet").hidden = true; editing = null; $("#fErr").textContent = ""; }

$("#fCancel").addEventListener("click", closeForm);
$("#scrim").addEventListener("click", closeForm);
$("#fDel").addEventListener("click", () => {
  if (!editing) return;
  events = events.filter((e) => e.id !== editing.id);
  save(); closeForm(); draw();
});
$("#form").addEventListener("submit", (e) => {
  e.preventDefault();
  const title = $("#fTitle").value.trim(), start = $("#fStart").value, end = $("#fEnd").value;
  if (!title) { $("#fErr").textContent = "Give it a name."; return; }
  if (!start || !end || toMin(end) <= toMin(start)) { $("#fErr").textContent = "The finish time has to be after the start."; return; }
  const data = { date: draftDate, title, start, end, kind: $("#fKind").value };
  if (editing) Object.assign(editing, data); else events.push({ id: crypto.randomUUID(), ...data });
  save(); closeForm(); draw();
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#sheet").hidden) closeForm(); });

/* ── controls ────────────────────────────────────────────────────────── */
$$(".seg").forEach((b) => b.addEventListener("click", () => {
  minGap = +b.dataset.min;
  $$(".seg").forEach((x) => {
    x.classList.toggle("on", x === b);
    x.setAttribute("aria-pressed", String(x === b));
  });
  draw();
}));
$("#clearBtn").addEventListener("click", () => {
  if (!confirm("Delete every event? This cannot be undone.")) return;
  events = []; save(); draw();
});

draw();
