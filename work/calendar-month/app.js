/* Calendar — LANE 1: chill.
   =========================================================================
   A real calendar, not a mockup: month grid, a day panel, add / edit /
   delete, and everything persisted to localStorage so it survives a reload.

   The three lanes share this exact feature set on purpose — "function same,
   everything else new" — so the only thing being compared is the design.

   ⚠️ No ambient motion anywhere. The vault records that a previous calendar
   front-end ("The Stream") was rejected outright with "it makes me
   nauseous", and the standing rule from that is: show availability without
   full-screen movement the viewer never asked for. Every animation here is
   caused by a click. */

const KEY = "cal-chill-events";
const KINDS = {
  class:    { label: "Class",    color: "#3E63DD" },
  work:     { label: "Work",     color: "#C2410C" },
  personal: { label: "Personal", color: "#0F766E" },
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

/* ── state ───────────────────────────────────────────────────────────── */
const today = new Date(); today.setHours(0, 0, 0, 0);
let view = new Date(today.getFullYear(), today.getMonth(), 1);
let selected = iso(today);
let events = load();
let editing = null;

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (Array.isArray(raw)) return raw;
  } catch {}
  return seed();
}
const save = () => localStorage.setItem(KEY, JSON.stringify(events));

/* A sample week so the calendar is not an empty grid on first open. Clearly
   sample data — "Clear all" wipes it in one click. */
function seed() {
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const on = (offset, start, end, title, kind) => {
    const d = new Date(monday); d.setDate(monday.getDate() + offset);
    return { id: crypto.randomUUID(), date: iso(d), start, end, title, kind };
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

const forDate = (d) =>
  events.filter((e) => e.date === d).sort((a, b) => a.start.localeCompare(b.start));

/* ── month grid ──────────────────────────────────────────────────────── */
function drawMonth() {
  $("#monthLabel").textContent = `${MONTHS[view.getMonth()]} ${view.getFullYear()}`;

  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const lead = (first.getDay() + 6) % 7;              // weeks start Monday
  const start = new Date(first);
  start.setDate(first.getDate() - lead);

  let html = "";
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = iso(d);
    const out = d.getMonth() !== view.getMonth();
    const evs = forDate(key);
    html += `
      <button class="cell${out ? " out" : ""}${key === iso(today) ? " today" : ""}${key === selected ? " sel" : ""}"
              data-date="${key}"
              aria-label="${d.getDate()} ${MONTHS[d.getMonth()]}, ${evs.length} event${evs.length === 1 ? "" : "s"}"
              aria-pressed="${key === selected}">
        <span class="num">${d.getDate()}</span>
        <span class="pips">${evs.slice(0, 3).map((e) =>
          `<i style="background:${KINDS[e.kind].color}"></i>`).join("")}${
          evs.length > 3 ? `<em>+${evs.length - 3}</em>` : ""}</span>
      </button>`;
  }
  $("#grid").innerHTML = html;
  $$("#grid .cell").forEach((b) => b.addEventListener("click", () => {
    selected = b.dataset.date;
    drawMonth(); drawDay();
  }));
}

/* ── day panel ───────────────────────────────────────────────────────── */
function drawDay() {
  const d = new Date(selected + "T00:00:00");
  $("#dayLabel").textContent =
    `${DOW[(d.getDay() + 6) % 7]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  $("#dayTag").textContent = selected === iso(today) ? "Today" : "";

  const evs = forDate(selected);
  const mins = evs.reduce((s, e) => s + diff(e.start, e.end), 0);
  $("#dayMeta").textContent = evs.length
    ? `${evs.length} event${evs.length === 1 ? "" : "s"} · ${fmtDur(mins)} booked`
    : "Nothing on.";

  $("#list").innerHTML = evs.length ? evs.map((e) => `
    <li class="ev" data-id="${e.id}">
      <span class="bar" style="background:${KINDS[e.kind].color}"></span>
      <div class="ev-mid">
        <p class="ev-t">${escapeHtml(e.title)}</p>
        <p class="ev-time">${e.start} – ${e.end} · ${KINDS[e.kind].label}</p>
      </div>
      <span class="ev-acts">
        <button class="mini" data-act="edit" aria-label="Edit ${escapeHtml(e.title)}">Edit</button>
        <button class="mini danger" data-act="del" aria-label="Delete ${escapeHtml(e.title)}">Delete</button>
      </span>
    </li>`).join("")
    : `<li class="empty">No events. Add one below.</li>`;

  $$("#list [data-act]").forEach((b) => b.addEventListener("click", () => {
    const id = b.closest(".ev").dataset.id;
    if (b.dataset.act === "del") {
      events = events.filter((e) => e.id !== id);
      save(); drawMonth(); drawDay();
    } else openForm(events.find((e) => e.id === id));
  }));
}

const diff = (a, b) => {
  const [ah, am] = a.split(":").map(Number), [bh, bm] = b.split(":").map(Number);
  return Math.max(0, (bh * 60 + bm) - (ah * 60 + am));
};
const fmtDur = (m) => {
  const h = Math.floor(m / 60), r = m % 60;
  return h && r ? `${h}h ${r}m` : h ? `${h}h` : `${r}m`;
};
const escapeHtml = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ── form ────────────────────────────────────────────────────────────── */
function openForm(ev) {
  editing = ev || null;
  $("#formTitle").textContent = ev ? "Edit event" : "New event";
  $("#fTitle").value = ev ? ev.title : "";
  $("#fStart").value = ev ? ev.start : "09:00";
  $("#fEnd").value = ev ? ev.end : "10:00";
  $("#fKind").value = ev ? ev.kind : "personal";
  $("#form").hidden = false;
  $("#addBtn").hidden = true;
  $("#fTitle").focus();
}
function closeForm() {
  $("#form").hidden = true;
  $("#addBtn").hidden = false;
  editing = null;
  $("#fErr").textContent = "";
}

$("#addBtn").addEventListener("click", () => openForm(null));
$("#fCancel").addEventListener("click", closeForm);

$("#form").addEventListener("submit", (e) => {
  e.preventDefault();
  const title = $("#fTitle").value.trim();
  const start = $("#fStart").value, end = $("#fEnd").value;
  if (!title) { $("#fErr").textContent = "Give it a name."; return; }
  if (!start || !end || diff(start, end) <= 0) {
    $("#fErr").textContent = "The finish time has to be after the start.";
    return;
  }
  const data = { date: selected, title, start, end, kind: $("#fKind").value };
  if (editing) Object.assign(editing, data);
  else events.push({ id: crypto.randomUUID(), ...data });
  save(); closeForm(); drawMonth(); drawDay();
});

/* ── chrome ──────────────────────────────────────────────────────────── */
$("#prev").addEventListener("click", () => { view.setMonth(view.getMonth() - 1); drawMonth(); });
$("#next").addEventListener("click", () => { view.setMonth(view.getMonth() + 1); drawMonth(); });
$("#todayBtn").addEventListener("click", () => {
  view = new Date(today.getFullYear(), today.getMonth(), 1);
  selected = iso(today);
  drawMonth(); drawDay();
});
$("#clearBtn").addEventListener("click", () => {
  if (!confirm("Delete every event? This cannot be undone.")) return;
  events = []; save(); drawMonth(); drawDay();
});

/* arrow keys move the selected day, which is how a calendar should behave */
document.addEventListener("keydown", (e) => {
  if (!$("#form").hidden) { if (e.key === "Escape") closeForm(); return; }
  const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
  if (!step) return;
  if (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "SELECT") return;
  e.preventDefault();
  const d = new Date(selected + "T00:00:00");
  d.setDate(d.getDate() + step);
  selected = iso(d);
  if (d.getMonth() !== view.getMonth()) view = new Date(d.getFullYear(), d.getMonth(), 1);
  drawMonth(); drawDay();
});

drawMonth();
drawDay();
