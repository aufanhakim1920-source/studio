/* Calendar — LANE 2: the turning week.
   =========================================================================
   Same feature set as the other two lanes — add, edit, delete, persist —
   but the week is arranged on a 3D arc you turn. Seven day columns, each
   with its own time axis from 06:00 to midnight; an event is a block whose
   HEIGHT IS ITS DURATION and whose position is when it starts. So the shape
   of a day is readable before a single word is.

   Built with CSS 3D over real DOM rather than a canvas, on purpose: the
   columns stay clickable, focusable and readable by a screen reader. A
   canvas would have looked the same and been unusable.

   ⚠️ Nothing turns on its own. The vault records a previous calendar
   front-end rejected with "it makes me nauseous" for exactly that, so the
   arc only ever moves because a pointer, a key or a click moved it. */

const KEY = "cal-3d-events";
const KINDS = {
  class:    { label: "Class",    color: "#7C5CFF" },
  work:     { label: "Work",     color: "#FF4D8D" },
  personal: { label: "Personal", color: "#00E5D0" },
};
const DAY_START = 6 * 60, DAY_END = 24 * 60;      // the visible axis

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DOW = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const mins = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const fmtDur = (m) => { const h = Math.floor(m / 60), r = m % 60; return h && r ? `${h}h ${r}m` : h ? `${h}h` : `${r}m`; };
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ── state ───────────────────────────────────────────────────────────── */
const today = new Date(); today.setHours(0, 0, 0, 0);
let weekStart = mondayOf(today);
let focus = (today.getDay() + 6) % 7;      // which day faces you
let angle = 0;                             // rig rotation, degrees
let events = load();
let editing = null;

function mondayOf(d) {
  const m = new Date(d);
  m.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  m.setHours(0, 0, 0, 0);
  return m;
}
function load() {
  try { const r = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(r)) return r; } catch {}
  return seed();
}
const save = () => localStorage.setItem(KEY, JSON.stringify(events));
function seed() {
  const m = mondayOf(today);
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
    on(6, "11:00", "12:30", "Coffee with Nae", "personal"),
  ];
}

const dateOf = (i) => { const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d; };
const forDate = (k) => events.filter((e) => e.date === k).sort((a, b) => a.start.localeCompare(b.start));

/* ── the rig ─────────────────────────────────────────────────────────── */
/* Degrees between days. 21° looked good but put the far end of the week near
   edge-on: getBoundingClientRect returns the PROJECTED size of a rotated
   element, and those columns measured 39px — under a thumb. A shallower fan
   keeps all seven days reachable, and phones get shallower still. */
const STEP = matchMedia("(max-width:820px)").matches ? 10 : 15;

function drawWeek() {
  const a = dateOf(0), b = dateOf(6);
  $("#weekLabel").textContent =
    `${a.getDate()} ${MON[a.getMonth()]} – ${b.getDate()} ${MON[b.getMonth()]}`;

  $("#scene").innerHTML = DOW.map((name, i) => {
    const d = dateOf(i);
    const key = iso(d);
    const evs = forDate(key);
    const isToday = key === iso(today);

    const blocks = evs.map((e) => {
      const s = Math.max(DAY_START, mins(e.start));
      const en = Math.min(DAY_END, mins(e.end));
      const top = ((s - DAY_START) / (DAY_END - DAY_START)) * 100;
      const hgt = Math.max(1.6, ((en - s) / (DAY_END - DAY_START)) * 100);
      return `<button class="blk" data-id="${e.id}" style="top:${top}%;height:${hgt}%;--c:${KINDS[e.kind].color}"
                title="${esc(e.title)} · ${e.start}–${e.end}">
                <span class="b-t">${esc(e.title)}</span>
                <span class="b-h">${e.start}</span>
              </button>`;
    }).join("");

    return `
    <div class="col${i === focus ? " on" : ""}${isToday ? " today" : ""}" data-i="${i}" style="--i:${i}">
      <button class="c-head" data-goto="${i}">
        <span class="c-dow">${name}</span>
        <span class="c-num">${d.getDate()}</span>
        <span class="c-n">${evs.length || ""}</span>
      </button>
      <div class="c-axis">
        ${[6, 9, 12, 15, 18, 21].map((h) =>
          `<span class="tick" style="top:${((h * 60 - DAY_START) / (DAY_END - DAY_START)) * 100}%">${pad(h)}</span>`).join("")}
        ${blocks}
      </div>
    </div>`;
  }).join("");

  $$("#scene .c-head").forEach((b) =>
    b.addEventListener("click", () => { focus = +b.dataset.goto; settle(); drawWeek(); drawDay(); }));
  $$("#scene .blk").forEach((b) =>
    b.addEventListener("click", () => {
      const e = events.find((x) => x.id === b.dataset.id);
      focus = DOW.findIndex((_, i) => iso(dateOf(i)) === e.date);
      settle(); drawWeek(); drawDay(); openForm(e);
    }));

  applyAngle();
}

/* the rig turns so the focused day faces the viewer */
function settle() { angle = -focus * STEP; }
function applyAngle() {
  $("#scene").style.setProperty("--rot", angle.toFixed(2) + "deg");
  $("#scene").style.setProperty("--step", STEP + "deg");
}

/* ── day rail ────────────────────────────────────────────────────────── */
function drawDay() {
  const d = dateOf(focus);
  const key = iso(d);
  $("#dayLabel").textContent = `${DOW[focus]} ${d.getDate()} ${MON[d.getMonth()]}`;
  $("#dayTag").textContent = key === iso(today) ? "Today" : "";

  const evs = forDate(key);
  const booked = evs.reduce((s, e) => s + (mins(e.end) - mins(e.start)), 0);
  $("#dayFree").textContent = `${fmtDur(Math.max(0, (DAY_END - DAY_START) - booked))} free`;

  $("#list").innerHTML = evs.length ? evs.map((e) => `
    <li class="ev" data-id="${e.id}" style="--c:${KINDS[e.kind].color}">
      <div>
        <p class="ev-t">${esc(e.title)}</p>
        <p class="ev-s">${e.start} – ${e.end} · ${KINDS[e.kind].label}</p>
      </div>
      <span class="ev-a">
        <button class="mini" data-act="edit">Edit</button>
        <button class="mini danger" data-act="del">Delete</button>
      </span>
    </li>`).join("") : `<li class="empty">Nothing on this day.</li>`;

  $$("#list [data-act]").forEach((b) => b.addEventListener("click", () => {
    const id = b.closest(".ev").dataset.id;
    if (b.dataset.act === "del") { events = events.filter((e) => e.id !== id); save(); drawWeek(); drawDay(); }
    else openForm(events.find((e) => e.id === id));
  }));
}

/* ── form ────────────────────────────────────────────────────────────── */
function openForm(ev) {
  editing = ev || null;
  $("#formTitle").textContent = ev ? "Edit event" : "New event";
  $("#fTitle").value = ev ? ev.title : "";
  $("#fStart").value = ev ? ev.start : "09:00";
  $("#fEnd").value = ev ? ev.end : "10:00";
  $("#fKind").value = ev ? ev.kind : "personal";
  $("#form").hidden = false; $("#addBtn").hidden = true;
  $("#fTitle").focus();
}
function closeForm() { $("#form").hidden = true; $("#addBtn").hidden = false; editing = null; $("#fErr").textContent = ""; }
$("#addBtn").addEventListener("click", () => openForm(null));
$("#fCancel").addEventListener("click", closeForm);
$("#form").addEventListener("submit", (e) => {
  e.preventDefault();
  const title = $("#fTitle").value.trim(), start = $("#fStart").value, end = $("#fEnd").value;
  if (!title) { $("#fErr").textContent = "Give it a name."; return; }
  if (!start || !end || mins(end) <= mins(start)) { $("#fErr").textContent = "The finish time has to be after the start."; return; }
  const data = { date: iso(dateOf(focus)), title, start, end, kind: $("#fKind").value };
  if (editing) Object.assign(editing, data); else events.push({ id: crypto.randomUUID(), ...data });
  save(); closeForm(); drawWeek(); drawDay();
});

/* ── turning it ──────────────────────────────────────────────────────── */
const stage = $("#stage");
let dragging = false, x0 = 0, a0 = 0, moved = false;

stage.addEventListener("pointerdown", (e) => {
  if (e.target.closest("button")) return;         // let the day and block buttons work
  dragging = true; moved = false; x0 = e.clientX; a0 = angle;
  stage.classList.add("grabbing");
  try { stage.setPointerCapture(e.pointerId); } catch {}
});
stage.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const dx = e.clientX - x0;
  if (Math.abs(dx) > 3) { moved = true; $("#hint").classList.add("gone"); }
  angle = Math.max(-6 * STEP - 10, Math.min(10, a0 + dx * 0.16));
  applyAngle();
});
const release = () => {
  if (!dragging) return;
  dragging = false;
  stage.classList.remove("grabbing");
  if (!moved) return;
  // snap to whichever day ended up nearest the front
  focus = Math.max(0, Math.min(6, Math.round(-angle / STEP)));
  settle(); applyAngle(); drawWeek(); drawDay();
};
stage.addEventListener("pointerup", release);
stage.addEventListener("pointercancel", release);

document.addEventListener("keydown", (e) => {
  if (!$("#form").hidden) { if (e.key === "Escape") closeForm(); return; }
  if (["INPUT", "SELECT"].includes(document.activeElement.tagName)) return;
  const d = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
  if (!d) return;
  e.preventDefault();
  focus = Math.max(0, Math.min(6, focus + d));
  settle(); drawWeek(); drawDay();
});

/* ── chrome ──────────────────────────────────────────────────────────── */
function shiftWeek(n) {
  weekStart.setDate(weekStart.getDate() + n * 7);
  drawWeek(); drawDay();
}
$("#prev").addEventListener("click", () => shiftWeek(-1));
$("#next").addEventListener("click", () => shiftWeek(1));
$("#todayBtn").addEventListener("click", () => {
  weekStart = mondayOf(today); focus = (today.getDay() + 6) % 7;
  settle(); drawWeek(); drawDay();
});
$("#clearBtn").addEventListener("click", () => {
  if (!confirm("Delete every event? This cannot be undone.")) return;
  events = []; save(); drawWeek(); drawDay();
});

settle();
drawWeek();
drawDay();
