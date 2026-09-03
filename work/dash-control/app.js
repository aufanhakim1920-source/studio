"use strict";
/* ─────────────────────────────────────────────────────────────────────────
   LINE 4 MERIDIAN — control board
   The simulation is invented but INTERNALLY HONEST. Nothing on screen is a
   hardcoded number: every delay is accumulated from a cause, and the three
   causes are the only inputs.
     1. a segment speed restriction (signal fault)   -> run time inflates
     2. a unit-specific dwell fault (door fault)     -> that unit dwells longer
     3. boarding demand                              -> dwell scales with the
        number of people on the platform
   Everything else is a CONSEQUENCE, and that is the point of the board:
     · a train may never come within SEP of the one ahead, so a late train
       HOLDS the trains behind it. Their delay is accrued second by second.
     · a held train leaves a hole in the service ahead of it, so the stations
       it has not reached yet keep accumulating passengers.
     · a fuller platform means a longer dwell, which makes the train later
       still. That is service bunching, and it emerges here rather than being
       drawn.
   Delay is therefore attributable: heldSec + restrictSec + dwellExcessSec is
   the train's whole delay, which is what the "why" line reads out.
   MOTION: there is none without input. Stepping the clock is input.
   ───────────────────────────────────────────────────────────────────────── */
/* ── the line ──────────────────────────────────────────────────────────── */
/* seg = scheduled running seconds FROM the previous station                */
/* dem is calibrated against capacity: the whole line boards ~1,000 people per
   4-minute service, which one 720-seat unit can carry given the alighting
   profile. Get this wrong and every platform grows without bound — the first
   version did exactly that, at 11,000 people waiting at Halveston. */
const S = [
  { c:"KLB", n:"Kelbourne Yard", seg:  0, dem:  7, x:false },
  { c:"ASN", n:"Ashfield North", seg: 96, dem: 11, x:false },
  { c:"ASH", n:"Ashfield",       seg:104, dem: 18, x:false },
  { c:"CVR", n:"Culvert Road",   seg: 88, dem: 12, x:false },
  { c:"MRW", n:"Marrow Street",  seg:112, dem: 14, x:false },
  { c:"FRP", n:"Ferrier Park",   seg:124, dem: 11, x:false },
  { c:"SNB", n:"Sennet Bridge",  seg:136, dem: 15, x:false },
  { c:"KGW", n:"Kingsway",       seg:148, dem: 34, x:true  },
  { c:"OMT", n:"Old Mint",       seg: 92, dem: 18, x:false },
  { c:"HLV", n:"Halveston",      seg:118, dem: 38, x:true  },
  { c:"CRG", n:"Carrow Gate",    seg:126, dem: 20, x:false },
  { c:"PLL", n:"Pell Street",    seg: 98, dem: 12, x:false },
  { c:"BCK", n:"Beckram",        seg:134, dem: 10, x:false },
  { c:"DNW", n:"Dunlop Wharf",   seg:142, dem: 16, x:true  },
  { c:"SLG", n:"Sallow Green",   seg:108, dem:  8, x:false },
  { c:"TLH", n:"Toller Hill",    seg:116, dem:  6, x:false },
  { c:"VNC", n:"Vance Road",     seg: 94, dem:  4, x:false },
  { c:"EMR", n:"Eastmarch",      seg:128, dem:  2, x:false },
];
const N = S.length, LAST = N - 1;
const ALIGHT = [0,.03,.05,.05,.06,.06,.07,.20,.09,.22,.13,.11,.11,.18,.16,.20,.28,1];
/* the TIMETABLE already allows for normal boarding, so scheduled dwell is a
   function of demand. Excess dwell therefore means an abnormal platform. */
const SD = S.map((s,i) => i === 0 ? 30 : i === LAST ? 45
  : Math.max(20, Math.min(90, Math.round(18 + s.dem * 4 * 0.30))));
/* scheduled elapsed time from departure to arrival at station i */
const SA = [0];
for (let i = 1; i < N; i++) SA[i] = SA[i-1] + SD[i-1] + S[i].seg;
const CAP = 720;          // passengers per unit
const SEP = 0.50;         // min separation, in inter-station segments
const DT  = 5;            // simulation step, seconds
const HW  = 240;          // scheduled headway, seconds
const T0  = -3000;        // warm-up start
const DEP0 = -2880, DEPN = 4320;  // first / last departure in the window
const SVC = 6 * 3600;     // t = 0 is 06:00:00
/* ── faults: the only three inputs ─────────────────────────────────────── */
const FAULTS = {
  live: [
    { id:"F-118", kind:"SIGNAL", seg:7, mult:2.15, from:2700, to:null,
      at:"SNB–KGW", raised:2700,
      text:"Signal fault — single line", note:"Track staff on site" },
    { id:"F-121", kind:"DOOR", st:10, add:250, from:3300, to:null,
      at:"CRG", raised:3300,
      text:"Door fault — reset required", note:"Awaiting fitter" },
    { id:"F-115", kind:"GATE", st:2, from:1560, to:2280,
      at:"ASH", raised:1560,
      text:"Gate line failure", note:"Cleared 06:38" },
  ],
  // yesterday, same clock: one minor restriction, no unit fault
  prev: [
    { id:"Y-092", kind:"SIGNAL", seg:12, mult:1.22, from:2400, to:null, at:"PLL–BCK", raised:2400, text:"Speed restriction", note:"" },
  ],
};
/* deterministic demand ripple — no Math.random anywhere in the model */
const surge = (t) => 1 + 0.22 * Math.sin(t / 780) + 0.09 * Math.sin(t / 233 + 1.7);
/* ── the simulation ────────────────────────────────────────────────────── */
function simulate(T, which) {
  const faults = FAULTS[which];
  const restr = faults.filter((f) => f.kind === "SIGNAL");
  const door  = faults.find((f) => f.kind === "DOOR") || null;
  const waiting  = S.map((s) => (s.dem / 60) * HW * 0.5);
  const lastCall = S.map(() => T0);
  const calls    = S.map(() => []);          // per-station call history
  let doorUnit = null, doorDone = false;
  const trains = [];
  for (let d = DEP0, k = 0; d <= DEPN; d += HW, k++)
    trains.push({
      id: "4A" + (8 + k), dep: d, idx: 0, f: 0, mode: "wait",
      dwellLeft: 0, dwellIn: 0, load: 38, lastDwell: 0, lastBoard: 0,
      held: false, heldSec: 0, restrSec: 0, dwellExc: 0, faultSec: 0,
      hist: [], done: false, tags: new Set(),
    });
  for (let t = T0; t <= T; t += DT) {
    // platform accumulation — people arrive whether or not a train does
    const g = surge(t);
    for (let i = 0; i < N; i++) waiting[i] += (S[i].dem / 60) * g * DT;
    // leaders first, so the SEP limit reads a settled position
    for (let k = 0; k < trains.length; k++) {
      const tr = trains[k];
      if (tr.done || t < tr.dep) continue;
      if (tr.mode === "wait") {
        // departing the yard IS a call at station 0, or KLB never shows a gap
        tr.mode = "run"; tr.idx = 0; tr.f = 0;
        const b = Math.min(Math.floor(waiting[0]), CAP);
        tr.load = b; waiting[0] -= b;
        calls[0].push({ t, unit: tr.id, dwell: SD[0], boarders: b, before: Math.round(waiting[0] + b) });
        if (calls[0].length > 8) calls[0].shift();
        lastCall[0] = t;
      }
      if (tr.mode === "dwell") {
        tr.dwellIn += DT;
        tr.dwellLeft -= DT;
        if (tr.dwellLeft <= 0) { tr.mode = "run"; tr.f = 0; }
      } else {
        const segIdx = tr.idx + 1;
        if (segIdx > LAST) { tr.done = true; continue; }
        let mult = 1;
        for (const r of restr)
          if (r.seg === segIdx && t >= r.from && (r.to === null || t < r.to)) mult *= r.mult;
        const rate = 1 / (S[segIdx].seg * mult);
        const axis = tr.idx + tr.f;
        let want = axis + rate * DT;
        // ── the rule that makes the whole board honest: no passing ──
        const lead = k > 0 ? trains[k - 1] : null;
        let blocked = false;
        if (lead && !lead.done && t >= lead.dep) {
          const lim = (lead.idx + lead.f) - SEP;
          if (want > lim) { want = Math.max(axis, lim); blocked = true; }
        }
        tr.held = blocked;
        if (blocked) tr.heldSec += DT;
        else if (mult > 1) tr.restrSec += DT * (1 - 1 / mult);
        if (want >= tr.idx + 1 - 1e-9) {
          // ── arrival ──
          tr.idx += 1; tr.f = 0; tr.mode = "dwell"; tr.dwellIn = 0;
          const st = tr.idx;
          const alighters = Math.round(tr.load * ALIGHT[st]);
          tr.load -= alighters;
          const room = Math.max(0, CAP - tr.load);
          const boarders = Math.min(Math.floor(waiting[st]), room);
          tr.load += boarders;
          const before = waiting[st];
          waiting[st] -= boarders;
          let dw = 18 + Math.max(boarders * 0.30, alighters * 0.16);
          dw = Math.min(170, dw);
          let fdw = 0;
          if (door && !doorDone && st === door.st && t >= door.from) {
            fdw = door.add; doorDone = true; doorUnit = tr.id; tr.tags.add(door.id);
          }
          tr.dwellLeft = dw + fdw;
          tr.lastDwell = dw + fdw;
          tr.lastBoard = boarders;
          tr.faultSec += fdw;
          tr.dwellExc += Math.max(0, dw - SD[st]);
          if (st === LAST) { tr.done = true; tr.load = 0; }
          calls[st].push({ t, unit: tr.id, dwell: dw + fdw, boarders, before: Math.round(before) });
          if (calls[st].length > 8) calls[st].shift();
          lastCall[st] = t;
        } else {
          tr.f = want - tr.idx;
        }
        if (mult > 1) for (const r of restr)
          if (r.seg === segIdx && t >= r.from && (r.to === null || t < r.to)) tr.tags.add(r.id);
      }
      if (t % 60 === 0) tr.hist.push(delayOf(tr, t));
      if (tr.hist.length > 22) tr.hist.shift();
    }
  }
  const live = trains.filter((tr) => !tr.done && tr.mode !== "wait" && T >= tr.dep);
  live.forEach((tr) => { tr.delay = delayOf(tr, T); tr.axis = tr.idx + tr.f; });
  return { T, trains: live, waiting, lastCall, calls, doorUnit, faults };
}
/* scheduled elapsed for a train's actual position -> delay is the difference */
function schedElapsed(tr) {
  if (tr.mode === "dwell") return SA[tr.idx] + Math.min(tr.dwellIn, SD[tr.idx]);
  return SA[tr.idx] + SD[tr.idx] + tr.f * S[Math.min(tr.idx + 1, LAST)].seg;
}
function delayOf(tr, t) { return Math.max(0, (t - tr.dep) - schedElapsed(tr)); }
/* ── formatting ────────────────────────────────────────────────────────── */
const two = (n) => String(n).padStart(2, "0");
const clockOf = (t) => { const s = Math.round(SVC + t); return two(Math.floor(s/3600)%24)+":"+two(Math.floor(s/60)%60)+":"+two(s%60); };
const hhmm    = (t) => { const s = Math.round(SVC + t); return two(Math.floor(s/3600)%24)+":"+two(Math.floor(s/60)%60); };
const ms      = (v) => { const s = Math.round(Math.abs(v)); return (v < 0 ? "−" : "") + Math.floor(s/60)+":"+two(s%60); };
const plus    = (v) => (v >= 30 ? "+" : "") + ms(v);
const band    = (d) => d < 60 ? "ok" : d < 180 ? "warn" : "bad";
/* ── state ─────────────────────────────────────────────────────────────── */
let T = 4020;
let sel = { kind: "auto", id: null };
let filter = "all";
let queueOn = false;
let scrubbing = false;
const $ = (id) => document.getElementById(id);
const els = {};
["clock","clockNote","scrub","worst","stops","units","legend","hwBars","hwNote",
 "stnRows","unitRows","detail","detCap","faultRows","faultNote","unitNote"].forEach((k) => els[k] = $(k));
/* ── build the fixed parts once, then only update in place ─────────────── */
const stopEls = [], rowEls = [];
for (let i = 0; i < N; i++) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "stop" + (S[i].x ? " x" : "");
  b.style.setProperty("--p", (i / LAST * 100) + "%");
  b.style.setProperty("--q", ((i + 0.5) / N * 100) + "%");
  b.innerHTML = `<span class="tick"></span><span class="scode">${S[i].c}</span>` +
                `<span class="sname">${S[i].n}</span>` +
                `<span class="crowdbar"><i></i></span>`;
  b.addEventListener("click", () => { sel = { kind: "stn", id: i }; render(); });
  els.stops.appendChild(b);
  stopEls.push(b);
  const r = document.createElement("button");
  r.type = "button";
  r.className = "r";
  r.innerHTML = `<span class="nm">${S[i].n}</span><span class="mono dwell"></span>` +
                `<span class="mono gap"></span><span class="mono wait"></span>` +
                `<span class="pbar"><i></i><u></u></span>`;
  r.addEventListener("click", () => { sel = { kind: "stn", id: i }; render(); });
  els.stnRows.appendChild(r);
  rowEls.push(r);
}
const unitMap = new Map(), rosterMap = new Map();
/* ── render ────────────────────────────────────────────────────────────── */
function render() {
  const st = simulate(T, "live");
  const yd = simulate(T, "prev");
  const live = st.trains;
  /* ── who is the worst problem right now ── */
  // Holding is intermittent — a unit is held, the leader moves, it runs again.
  // Counting only who is held THIS SECOND under-reports the queue, so count the
  // consecutive units behind that have actually lost time to being held.
  const behind = (tr) => {
    let n = 0;
    for (let i = live.indexOf(tr) + 1; i < live.length; i++) { if (live[i].heldSec < 30) break; n++; }
    return n;
  };
  let worst = null, wsev = -1;
  for (const tr of live) {
    const sev = tr.delay + 110 * behind(tr);
    if (sev > wsev) { wsev = sev; worst = tr; }
  }
  const wq = worst ? behind(worst) : 0;
  const queued = new Set();
  if (worst) { queued.add(worst.id); for (let i = live.indexOf(worst) + 1; i <= live.indexOf(worst) + wq; i++) queued.add(live[i].id); }
  if (sel.kind === "auto" || (sel.kind === "unit" && !live.some((t) => t.id === sel.id)))
    sel = { kind: "unit", id: worst ? worst.id : null };
  /* ── clock ── */
  els.clock.textContent = clockOf(T);
  els.scrub.value = String(T);
  const punct = live.filter((t) => t.delay < 120).length;
  const ypunct = yd.trains.filter((t) => t.delay < 120).length;
  els.clockNote.textContent = `${punct}/${live.length} on time · yest ${ypunct}/${yd.trains.length}`;
  /* ── the loud thing ── */
  if (worst) {
    const cause = causeLine(worst, live);
    els.worst.innerHTML =
      `<span class="wlab">Worst now</span>` +
      `<span class="bigfig">${plus(worst.delay)}</span>` +
      `<span class="wstack"><span class="wtop">${worst.id} · ${posText(worst)}</span>` +
      `<span class="wbot">threshold 3:00 · ${worst.delay >= 180 ? "over by " + ms(worst.delay - 180) : "within"} · line worst yesterday ${plus(Math.max(...yd.trains.map((t) => t.delay), 0))}</span></span>` +
      `<span class="wsep"></span>` +
      `<span class="wchain">${cause}</span>` +
      `<button type="button" class="wqueue${queueOn ? " is-on" : ""}" id="qbtn">${wq} QUEUED BEHIND</button>`;
    $("qbtn").addEventListener("click", () => { queueOn = !queueOn; render(); });
  }
  /* ── line diagram ── */
  const selStn = sel.kind === "stn" ? sel.id : -1;
  for (let i = 0; i < N; i++) {
    const b = stopEls[i];
    const norm = Math.max(6, S[i].dem / 60 * HW);
    const ratio = st.waiting[i] / norm;
    b.classList.toggle("sel", i === selStn);
    b.classList.toggle("dim", filter === "crowd" && ratio < 1.35);
    const fill = b.querySelector(".crowdbar i");
    fill.style.width = Math.min(100, ratio / 2.4 * 100) + "%";
    fill.className = ratio > 1.9 ? "bg-bad" : ratio > 1.35 ? "bg-warn" : "bg-mute";
  }
  const seen = new Set();
  for (const tr of live) {
    seen.add(tr.id);
    let u = unitMap.get(tr.id);
    if (!u) {
      u = document.createElement("button");
      u.type = "button"; u.className = "unit";
      u.innerHTML = `<span class="udel"></span><span class="uid"></span><span class="upin"></span>`;
      u.addEventListener("click", () => { sel = { kind: "unit", id: tr.id }; render(); });
      els.units.appendChild(u); unitMap.set(tr.id, u);
    }
    u.style.setProperty("--p", (tr.axis / LAST * 100) + "%");
    u.style.setProperty("--q", ((tr.axis + 0.5) / N * 100) + "%");
    const bd = band(tr.delay);
    u.querySelector(".uid").textContent = tr.id;
    const dl = u.querySelector(".udel");
    dl.textContent = plus(tr.delay); dl.className = "udel " + bd;
    u.querySelector(".upin").className = "upin bg-" + bd;
    u.classList.toggle("held", tr.held);
    u.classList.toggle("worst", worst && tr.id === worst.id);
    u.classList.toggle("sel", sel.kind === "unit" && sel.id === tr.id);
    u.classList.toggle("dim", queueOn && !queued.has(tr.id));
  }
  for (const [id, u] of unitMap) if (!seen.has(id)) { u.remove(); unitMap.delete(id); }
  els.legend.innerHTML =
    `<b>${live.length}</b> units on line · down direction · bar under each code = platform load vs a 4:00 headway`;
  /* ── headway strip ── */
  // gap = how long the following unit still needs to reach where the one
  // ahead is standing now, in scheduled running seconds. Bunching is short.
  const gaps = [];
  for (let i = 0; i < live.length - 1; i++) {
    const a = live[i], b = live[i + 1];
    gaps.push({ a, b, g: Math.max(0, schedElapsed(a) - schedElapsed(b)) });
  }
  els.hwBars.innerHTML = gaps.map((gp) => {
    const pct = Math.min(100, gp.g / 480 * 100);
    const cls = gp.g < 150 ? "bg-bad" : gp.g > 360 ? "bg-warn" : "bg-ok";
    return `<span class="hw"><span class="hwtrack"><i class="hwfill ${cls}" style="width:${pct}%"></i>` +
      `<span class="hwsched" style="left:${240/480*100}%"></span></span>` +
      `<span class="hwlab"><span>${gp.a.id}–${gp.b.id}</span><span class="hwv ${gp.g<150?"bad":gp.g>360?"warn":""}">${ms(gp.g)}</span></span></span>`;
  }).join("");
  const bunched = gaps.filter((g) => g.g < 150).length, holes = gaps.filter((g) => g.g > 360).length;
  els.hwNote.innerHTML = `sched <b>4:00</b> (white mark) · <b>${bunched}</b> bunched under 2:30 · <b>${holes}</b> gaps over 6:00 · yesterday 0 and 1`;
  /* ── station ledger ── */
  for (let i = 0; i < N; i++) {
    const r = rowEls[i];
    const last = st.calls[i][st.calls[i].length - 1];
    const gap = T - st.lastCall[i];
    const norm = Math.max(6, S[i].dem / 60 * HW);
    const ratio = st.waiting[i] / norm;
    const dwell = last ? last.dwell : 0;
    const dq = r.querySelector(".dwell");
    dq.innerHTML = last
      ? `<span class="${dwell > SD[i] * 1.6 ? "bad" : dwell > SD[i] * 1.2 ? "warn" : ""}">${Math.round(dwell)}s</span><span class="sub"> /${SD[i]}</span>`
      : `<span class="sub">—</span>`;
    const gq = r.querySelector(".gap");
    gq.innerHTML = `<span class="${gap > 400 ? "bad" : gap > 300 ? "warn" : ""}">${ms(gap)}</span>`;
    r.querySelector(".wait").innerHTML =
      `<span class="${ratio > 1.9 ? "bad" : ratio > 1.35 ? "warn" : ""}">${Math.round(st.waiting[i])}</span>`;
    const bar = r.querySelector(".pbar");
    bar.querySelector("i").style.width = Math.min(100, ratio / 2.4 * 100) + "%";
    bar.querySelector("i").className = ratio > 1.9 ? "bg-bad" : ratio > 1.35 ? "bg-warn" : "bg-mute";
    bar.querySelector("u").style.left = (1 / 2.4 * 100) + "%";
    r.classList.toggle("sel", i === selStn);
    const hideLate  = filter === "late"  && gap <= 300;
    const hideCrowd = filter === "crowd" && ratio <= 1.35;
    r.classList.toggle("dim", hideLate || hideCrowd);
  }
  /* ── unit roster ── */
  const seenR = new Set();
  live.forEach((tr) => {
    seenR.add(tr.id);
    let r = rosterMap.get(tr.id);
    if (!r) {
      r = document.createElement("button");
      r.type = "button"; r.className = "r r-u";
      r.innerHTML = `<span class="nm mono uid"></span><span class="sub at"></span>` +
                    `<span class="mono dl"></span><span class="mono ld"></span>`;
      r.addEventListener("click", () => { sel = { kind: "unit", id: tr.id }; render(); });
      rosterMap.set(tr.id, r);
    }
    els.unitRows.appendChild(r);            // re-append = reorder by position
    r.querySelector(".uid").textContent = tr.id;
    r.querySelector(".at").textContent = posShort(tr);
    const d = r.querySelector(".dl");
    d.innerHTML = `<span class="${band(tr.delay)}">${plus(tr.delay)}</span>`;
    r.querySelector(".ld").innerHTML =
      `<span class="${tr.load / CAP > .92 ? "bad" : tr.load / CAP > .78 ? "warn" : ""}">${Math.round(tr.load / CAP * 100)}%</span>`;
    r.classList.toggle("sel", sel.kind === "unit" && sel.id === tr.id);
    r.classList.toggle("dim", queueOn && !queued.has(tr.id));
  });
  for (const [id, r] of rosterMap) if (!seenR.has(id)) { r.remove(); rosterMap.delete(id); }
  const avg = live.reduce((a, t) => a + t.delay, 0) / (live.length || 1);
  const yavg = yd.trains.reduce((a, t) => a + t.delay, 0) / (yd.trains.length || 1);
  els.unitNote.innerHTML = `mean delay <b>${ms(avg)}</b> · yesterday ${ms(yavg)}`;
  /* ── detail ── */
  if (sel.kind === "stn") renderStation(st, yd, sel.id, live);
  else renderUnit(st, yd, live.find((t) => t.id === sel.id), live);
  /* ── faults ── */
  renderFaults(st, live, worst);
}
function posText(tr) {
  if (tr.mode === "dwell") return (tr.held ? "held at " : "at ") + S[tr.idx].n;
  if (tr.held) return "held short of " + S[Math.min(tr.idx + 1, LAST)].n;
  return S[tr.idx].c + "→" + S[Math.min(tr.idx + 1, LAST)].c + " " + Math.round(tr.f * 100) + "%";
}
/* the roster column is ~100px — codes only, and never a wrap */
function posShort(tr) {
  const nx = S[Math.min(tr.idx + 1, LAST)].c;
  if (tr.mode === "dwell") return (tr.held ? "HELD " : "at ") + S[tr.idx].c;
  if (tr.held) return "HELD →" + nx;
  return S[tr.idx].c + "→" + nx + " " + Math.round(tr.f * 100) + "%";
}
/* the "why" — read straight off the accumulated causes, never authored */
function causeLine(tr, live) {
  const parts = [];
  let cur = tr, hops = 0;
  while (cur && cur.held && hops < 3) {
    const i = live.indexOf(cur);
    const lead = i > 0 ? live[i - 1] : null;
    if (!lead) break;
    parts.push(`held behind <b>${lead.id}</b>`);
    cur = lead; hops++;
  }
  const root = cur || tr;
  if (root.faultSec > 0) parts.push(`<b>F-121</b> door fault at Carrow Gate, +${ms(root.faultSec)} dwell`);
  else if (root.restrSec > 45) parts.push(`<b>F-118</b> signal fault SNB–KGW, +${ms(root.restrSec)} run`);
  else if (root.dwellExc > 45) parts.push(`heavy boarding, +${ms(root.dwellExc)} dwell`);
  if (!parts.length) parts.push("within schedule");
  return parts.join(" ‹ ");
}
function renderStation(st, yd, i, live) {
  const s = S[i];
  const gap = st.T - st.lastCall[i];
  const norm = Math.max(6, s.dem / 60 * HW);
  const ratio = st.waiting[i] / norm;
  const hist = st.calls[i].slice(-8);
  const yhist = yd.calls[i].slice(-8);
  const ydw = yhist.length ? yhist.reduce((a, c) => a + c.dwell, 0) / yhist.length : SD[i];
  // live is ordered leader-first, so the closest approaching unit is the first
  // one still short of this station
  const next = live.filter((t) => t.idx < i)[0];
  const eta = next ? Math.max(0, SA[i] - schedElapsed(next)) : null;
  els.detCap.textContent = "STATION";
  els.detail.innerHTML =
    `<div class="dtitle">${s.n}</div>` +
    `<div class="dsub">${s.c} · ${s.x ? "interchange" : "through station"} · ${s.dem}/min boarding demand</div>` +
    `<div class="dgrid">` +
      row("LAST CALL", hist.length ? `${hist[hist.length-1].unit} <em>${ms(gap)} ago · sched 4:00</em>` : "—") +
      row("DWELL", hist.length ? `${Math.round(hist[hist.length-1].dwell)}s <em>sched ${SD[i]}s · yest ${Math.round(ydw)}s</em>` : "—") +
      row("WAITING", `${Math.round(st.waiting[i])} <em>norm ${Math.round(norm)} · ×${ratio.toFixed(1)}</em>`) +
      row("NEXT UNIT", next ? `${next.id} <em>in ${ms(eta)} · ${plus(next.delay)}</em>` : "—") +
    `</div>` +
    `<div class="spark">${hist.map((c) => {
        const h = Math.min(100, c.dwell / 150 * 100);
        const cl = c.dwell > SD[i] * 1.6 ? "bg-bad" : c.dwell > SD[i] * 1.2 ? "bg-warn" : "";
        return `<div class="${cl}" style="height:${Math.max(6, h)}%"></div>`;
      }).join("")}</div>` +
    `<div class="sparklab"><span>dwell, last ${hist.length} calls</span><span>sched ${SD[i]}s</span></div>` +
    `<div class="dwhy">${ratio > 1.35
      ? `Platform filling: last train called <b>${ms(gap)}</b> ago against a <b>4:00</b> headway. Each extra minute of gap adds about <b>${Math.round(s.dem)}</b> people here.`
      : `Loading normal. Platform clears within one headway.`}</div>` +
    approaching(st, i, live);
}
function renderUnit(st, yd, tr, live) {
  els.detCap.textContent = "UNIT";
  if (!tr) { els.detail.innerHTML = `<div class="dsub">Unit no longer on the line.</div>`; return; }
  const total = tr.heldSec + tr.restrSec + tr.dwellExc + tr.faultSec || 1;
  const seg = (v, lab) => v < 20 ? "" :
    `<div class="dwhy" style="margin-top:3px"><b>${ms(v)}</b> ${lab} · ${Math.round(v / total * 100)}%</div>`;
  els.detail.innerHTML =
    `<div class="dtitle">${tr.id}</div>` +
    `<div class="dsub">${posText(tr)} · ${tr.mode === "dwell" ? "dwelling" : tr.held ? "held" : "running"} · departed ${hhmm(tr.dep)}</div>` +
    `<div class="dgrid">` +
      row("DELAY", `<span class="${band(tr.delay)}">${plus(tr.delay)}</span> <em>vs sched · limit 3:00</em>`) +
      row("LOAD", `${tr.load} <em>of ${CAP} · ${Math.round(tr.load/CAP*100)}%</em>`) +
      row("LAST DWELL", `${Math.round(tr.lastDwell)}s <em>sched ${SD[tr.idx]}s</em>`) +
      row("HELD", `${ms(tr.heldSec)} <em>of ${ms(total)} attributed</em>`) +
    `</div>` +
    (() => {
      const h16 = tr.hist.slice(-16), top = Math.max(180, ...h16, 1);
      return `<div class="spark">${h16.map((d) =>
        `<div class="${d > 180 ? "bg-bad" : d > 60 ? "bg-warn" : ""}" style="height:${Math.max(4, d / top * 100)}%"></div>`
      ).join("")}</div>` +
      `<div class="sparklab"><span>delay, last ${h16.length} min</span><span>peak ${ms(top)}</span></div>`;
    })() +
    `<div class="dwhy">${causeLine(tr, live)}</div>` +
    seg(tr.heldSec, "queued behind the unit ahead") +
    seg(tr.restrSec, "lost to the signal restriction") +
    seg(tr.faultSec, "lost to the door fault") +
    seg(tr.dwellExc, "lost to boarding over scheduled dwell") +
    nextCalls(tr);
}
/* the next four calls: booked time, projected time, and the difference.
   Projection carries the delay forward unchanged — it does NOT assume the
   unit makes time up, because on this line it cannot: it is behind another. */
function nextCalls(tr) {
  const rows = [];
  for (let i = tr.idx + 1; i <= LAST && rows.length < 4; i++) {
    const booked = tr.dep + SA[i];
    const proj = booked + tr.delay;
    rows.push(`<div class="cr"><span>${S[i].c}</span><span class="mono">${hhmm(booked)}</span>` +
      `<span class="mono ${band(tr.delay)}">${hhmm(proj)}</span></div>`);
  }
  if (!rows.length) return "";
  return `<div class="chead"><span>NEXT CALLS</span><span>BOOKED</span><span>PROJECTED</span></div>` +
    rows.join("") +
    `<div class="dwhy">Projection carries <b>${plus(tr.delay)}</b> forward unchanged — this unit is following ` +
    `another and has no path to make time up.</div>`;
}
/* which units are still to call here, soonest first */
function approaching(st, i, live) {
  const rows = [];
  for (const tr of live) {
    if (tr.idx >= i) continue;
    const eta = Math.max(0, SA[i] - schedElapsed(tr));
    rows.push({ tr, eta });
  }
  rows.sort((a, b) => a.eta - b.eta);
  if (!rows.length) return "";
  return `<div class="chead"><span>APPROACHING</span><span>BOOKED</span><span>IN</span></div>` +
    rows.slice(0, 4).map((r) =>
      `<div class="cr"><span class="mono">${r.tr.id}</span><span class="mono">${hhmm(r.tr.dep + SA[i])}</span>` +
      `<span class="mono ${band(r.tr.delay)}">${ms(r.eta)}</span></div>`).join("");
}
const row = (k, v) => `<div class="dr"><span class="dk">${k}</span><span class="dv">${v}</span></div>`;
function renderFaults(st, live, worst) {
  const list = [];
  for (const f of st.faults) {
    if (st.T < f.raised) continue;
    const open = f.to === null || st.T < f.to;
    const hit = f.kind === "SIGNAL"
      ? live.filter((t) => t.tags.has(f.id)).length
      : live.filter((t) => t.tags.has(f.id)).length;
    list.push({
      id: f.id, open,
      title: f.text, at: f.at,
      meta: `${f.at} · ${hhmm(f.raised)} · ${open ? Math.round((st.T - f.raised) / 60) + "m open" : "cleared " + hhmm(f.to)}` +
            (f.kind === "SIGNAL" && open ? ` · run ×${f.mult.toFixed(2)} · ${hit} units` : "") +
            (f.kind === "DOOR" && open ? ` · ${st.doorUnit || "—"} · +${ms(f.add)} dwell` : ""),
      go: f.kind === "DOOR" ? { kind: "unit", id: st.doorUnit } : { kind: "stn", id: f.st !== undefined ? f.st : f.seg },
    });
  }
  // one fault the board raises itself, from measured platform load
  let crowdI = -1, crowdR = 0;
  for (let i = 0; i < N; i++) {
    const r = st.waiting[i] / Math.max(6, S[i].dem / 60 * HW);
    if (r > crowdR && r > 1.75) { crowdR = r; crowdI = i; }
  }
  if (crowdI >= 0) list.unshift({
    id: "AUTO", open: true,
    title: "Platform load over limit",
    meta: `${S[crowdI].c} · ${Math.round(st.waiting[crowdI])} waiting · ×${crowdR.toFixed(1)} normal · raised by the board`,
    go: { kind: "stn", id: crowdI },
  });
  els.faultRows.innerHTML = list.map((f, k) =>
    `<button type="button" class="f" data-k="${k}"><span class="fid ${f.open ? "bad" : "fst"}">${f.id}</span>` +
    `<span class="ftx"><b>${f.title}</b>${f.meta}</span></button>`).join("");
  [...els.faultRows.children].forEach((b, k) => b.addEventListener("click", () => {
    const g = list[k].go; if (g && g.id !== null && g.id !== undefined) { sel = g; render(); }
  }));
  els.faultNote.innerHTML = `<b>${list.filter((f) => f.open).length}</b> open · ${list.length - list.filter((f) => f.open).length} cleared today`;
}
/* ── controls — the only source of motion on this page ─────────────────── */
const stepTo = (v) => { T = Math.max(2400, Math.min(5400, v)); render(); };
$("b-5").addEventListener("click", () => stepTo(T - 300));
$("b-1").addEventListener("click", () => stepTo(T - 60));
$("b+1").addEventListener("click", () => stepTo(T + 60));
$("b+5").addEventListener("click", () => stepTo(T + 300));
els.scrub.addEventListener("pointerdown", () => { scrubbing = true; document.body.classList.add("scrubbing"); });
const endScrub = () => { if (!scrubbing) return; scrubbing = false; document.body.classList.remove("scrubbing"); };
window.addEventListener("pointerup", endScrub);
els.scrub.addEventListener("input", () => { T = +els.scrub.value; render(); });
els.scrub.addEventListener("change", endScrub);
document.querySelectorAll(".chip").forEach((c) => c.addEventListener("click", () => {
  filter = c.dataset.f;
  document.querySelectorAll(".chip").forEach((o) => o.classList.toggle("is-on", o === c));
  render();
}));
window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft")  { stepTo(T - 60); e.preventDefault(); }
  if (e.key === "ArrowRight") { stepTo(T + 60); e.preventDefault(); }
});
render();
/* ── the board is LIVE, and it has to look it ──────────────────────────────
   Real products are still until touched, and that rule is right — but it is a
   rule against DECORATIVE motion. A control board's whole claim is that it is
   showing you NOW. Frozen, including a painted clock that never moves, it reads
   as a mockup, which is the one thing a live ops screen must never look like.
   So real time advances, and the trains, delays and loads advance with it,
   because they are all functions of T. Nothing moves here that is not data. */
(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let last = performance.now(), carry = 0;
  setInterval(() => {
    if (scrubbing || document.hidden) { last = performance.now(); return; }
    const now = performance.now();
    carry += (now - last) / 1000; last = now;
    if (carry < 1) return;
    const whole = Math.floor(carry); carry -= whole;
    if (T >= 5400) return;                 /* stop at the end of the window */
    T = Math.min(5400, T + whole);
    render();
  }, 1000);
})();
