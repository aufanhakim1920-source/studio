/* Marginal — a transcript editor
 * ---------------------------------------------------------------------------
 * ⚠️ A PRODUCT SCREEN. Third form in this round after a game and before an essay,
 * deliberately sharing nothing with them — see [[Extract the Technique Not the
 * Template]]. The gallery had 17 landing pages and 2 product UIs.
 *
 * ⭐ THE ONE IDEA: the transcript IS the scrubber. Every word carries its own
 * timestamp, so clicking a word seeks the audio and the playhead highlights the
 * word it is currently inside. There is no separate list of timecodes to
 * cross-reference — the document and the timeline are the same object.
 *
 * The things that make a tool feel finished, which marketing pages never need:
 *   · a real empty state, with a sentence explaining what will appear
 *   · low-confidence words marked, and a panel that jumps you to them
 *   · inline editing that shows you what you changed
 *   · keyboard for everything, and a visible save state
 *   · speaker names you can rename, which updates every line at once
 *
 * There is no audio file, so the transport runs a clock. Everything downstream
 * of "what second are we at" is real.
 */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

const DUR = 1122;   /* 18:42 in seconds */

/* [start, speaker, text, [indices of low-confidence words]] */
const SCRIPT = [
  [4,   0, "Right, we are rolling. Say something so I can set the level.", []],
  [11,  1, "Testing. One two. Is the room always this dead?", []],
  [17,  0, "It is carpet and a bookcase, which is most of what you need. The rest is not standing near the window.", []],
  [28,  1, "I brought the Neumann but honestly the dynamic sounded better in here last time.", [2]],
  [37,  0, "It did, and that surprised nobody except you.", []],
  [42,  1, "Fine. Let us start with the thing we argued about on Tuesday, because I have been thinking about it and I have changed my mind.", []],
  [54,  0, "Which half of it?", []],
  [57,  1, "The part where you said nobody finishes anything. I think that is true but I think it is a feature.", []],
  [66,  0, "Go on.", []],
  [69,  1, "Most projects are worth exactly one weekend of attention. The mistake is not abandoning them, it is the guilt afterwards.", [11]],
  [80,  0, "So the shelf of half-done things is not a failure, it is a portfolio.", []],
  [88,  1, "It is a sketchbook. Nobody asks a painter why the sketchbook is not framed.", []],
  [96,  0, "That is either very good or completely self-serving and I cannot tell yet.", []],
  [104, 1, "Both. Usually both.", []],
  [108, 0, "Alright. Let us take it from the top and this time do not lean back on the chair, it creaks and I cannot edit it out.", [17]],
];

const state = {
  t: 0, playing: false, rate: 1,
  speakers: ["Ilse", "Marcus"],
  edits: 0, saved: true, onlyUnclear: false, query: "",
};

/* ── build the document ───────────────────────────────────────────────────
   Words get an evenly-spaced timestamp inside their line. Real forced
   alignment would give per-word times; this is the same shape of data. */
const words = [];
function build() {
  $("#lines").innerHTML = SCRIPT.map(([t, spk, text, low], li) => {
    const end = li + 1 < SCRIPT.length ? SCRIPT[li + 1][0] : DUR;
    const ws = text.split(" ");
    const step = (end - t) / ws.length;
    const html = ws.map((w, wi) => {
      const wt = t + wi * step;
      const cls = ["w", low.includes(wi) ? "low" : ""].filter(Boolean).join(" ");
      words.push({ t: wt, li, wi, low: low.includes(wi), text: w });
      return `<span class="${cls}" data-t="${wt.toFixed(2)}" data-i="${words.length - 1}" tabindex="-1">${w}</span>`;
    }).join(" ");
    return `<div class="line" data-li="${li}" data-t="${t}">
      <span class="line__t" data-t="${t}">${fmt(t)}</span>
      <div class="line__b">
        <span class="who ${spk === 0 ? "a" : "b"}"><i></i><span class="nm" data-spk="${spk}">${state.speakers[spk]}</span></span>
        <div class="words">${html}</div>
      </div>
    </div>`;
  }).join("");
}

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/* ── the waveform ─────────────────────────────────────────────────────────
   Drawn from a deterministic pseudo-random walk seeded by index, so it looks
   like audio and is identical on every load. A random() waveform that reshuffles
   on resize reads as broken. */
function waveform() {
  const cv = $("#wcv"), ctx = cv.getContext("2d");
  function draw() {
    const r = cv.getBoundingClientRect();
    const d = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d);
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.clearRect(0, 0, r.width, r.height);

    const bars = Math.floor(r.width / 3);
    for (let i = 0; i < bars; i++) {
      const x = i / bars;
      /* two speakers talking: a slow envelope times a fast one */
      const seed = Math.sin(i * 12.9898) * 43758.5453;
      const n = seed - Math.floor(seed);
      const env = 0.42 + 0.38 * Math.sin(x * 22) * Math.sin(x * 5.3);
      const h = Math.max(2, (0.25 + n * 0.75) * env * r.height);
      ctx.fillStyle = x <= state.t / DUR ? "#C2410C" : "#D8D3CB";
      ctx.fillRect(i * 3, (r.height - h) / 2, 2, h);
    }
  }
  draw();
  addEventListener("resize", draw, { passive: true });
  return draw;
}

/* ── playhead ─────────────────────────────────────────────────────────────── */
function seek(t, redrawWave) {
  state.t = Math.max(0, Math.min(DUR, t));
  $("#now").textContent = fmt(state.t);
  $("#head").style.left = `${(state.t / DUR) * 100}%`;
  $("#wave").setAttribute("aria-valuenow", Math.round(state.t));

  /* the word the playhead is inside */
  let cur = -1;
  for (let i = 0; i < words.length; i++) { if (words[i].t <= state.t) cur = i; else break; }
  $$(".w.now").forEach((e) => e.classList.remove("now"));
  $$(".line.on").forEach((e) => e.classList.remove("on"));
  if (cur >= 0) {
    const el = $(`.w[data-i="${cur}"]`);
    if (el) {
      el.classList.add("now");
      el.closest(".line").classList.add("on");
      /* follow along, but only when playing — otherwise it fights your scrolling */
      if (state.playing) {
        const doc = $("#doc"), r = el.getBoundingClientRect(), dr = doc.getBoundingClientRect();
        if (r.top < dr.top + 80 || r.bottom > dr.bottom - 80) {
          el.scrollIntoView({ block: "center", behavior: REDUCED ? "auto" : "smooth" });
        }
      }
    }
  }
  if (redrawWave) redrawWave();
}

/* ── flags, search, speakers ──────────────────────────────────────────────── */
function paintFlags() {
  const low = words.map((w, i) => ({ ...w, i })).filter((w) => w.low);
  $("#flagN").textContent = low.length;
  $("#unclearN").textContent = low.length;
  $("#flagEmpty").hidden = low.length > 0;
  $("#flags").innerHTML = low.map((w) =>
    `<button class="flag" type="button" data-t="${w.t.toFixed(2)}"><b>${w.text}</b><span>${fmt(w.t)}</span></button>`).join("");
}

function applySearch(redrawWave) {
  const q = state.query.trim().toLowerCase();
  let n = 0;
  $$(".w").forEach((el) => {
    const hit = q && el.textContent.toLowerCase().includes(q);
    el.classList.toggle("hit", !!hit);
    if (hit) n++;
  });
  $("#hits").textContent = q ? `${n} found` : "";
  /* "only unclear" hides whole lines that contain nothing flagged */
  $$(".line").forEach((ln) => {
    const hasLow = !!ln.querySelector(".w.low");
    ln.hidden = state.onlyUnclear && !hasLow;
  });
}

function setSaved(ok) {
  state.saved = ok;
  const el = $("#saved");
  el.textContent = ok ? "Saved" : "Saving…";
  el.classList.toggle("dirty", !ok);
  if (!ok) setTimeout(() => setSaved(true), 900);
}

/* ── wire it up ───────────────────────────────────────────────────────────── */
function init() {
  build();
  const redraw = waveform();
  paintFlags();
  seek(0, redraw);

  /* speakers — renaming one updates every line that uses it */
  $("#spk").innerHTML = state.speakers.map((n, i) => {
    const lines = SCRIPT.filter((s) => s[1] === i).length;
    const pc = Math.round((lines / SCRIPT.length) * 100);
    return `<label class="spkrow"><i style="background:${i === 0 ? "#2563EB" : "#047857"}"></i>
      <input value="${n}" data-spk="${i}" aria-label="Speaker ${i + 1} name"><span class="pc">${pc}%</span></label>`;
  }).join("");
  $$("#spk input").forEach((inp) => inp.addEventListener("input", () => {
    const i = Number(inp.dataset.spk);
    state.speakers[i] = inp.value || `Speaker ${i + 1}`;
    $$(`.nm[data-spk="${i}"]`).forEach((e) => e.textContent = state.speakers[i]);
    setSaved(false);
  }));

  /* click a word to seek; double-click to fix it */
  $("#lines").addEventListener("click", (e) => {
    const t = e.target.closest("[data-t]");
    if (t && !e.target.isContentEditable) seek(Number(t.dataset.t), redraw);
  });
  $("#lines").addEventListener("dblclick", (e) => {
    const w = e.target.closest(".w");
    if (!w) return;
    const before = w.textContent;
    w.contentEditable = "true";
    w.focus();
    getSelection().selectAllChildren(w);
    const finish = () => {
      w.contentEditable = "false";
      if (w.textContent !== before) {
        w.classList.add("edited");
        w.classList.remove("low");     /* you fixed it; it is no longer unsure */
        state.edits++;
        paintFlags();
        setSaved(false);
      }
      w.removeEventListener("blur", finish);
    };
    w.addEventListener("blur", finish);
    w.addEventListener("keydown", (k) => { if (k.key === "Enter") { k.preventDefault(); w.blur(); } });
  });

  $("#flags").addEventListener("click", (e) => {
    const f = e.target.closest(".flag");
    if (f) seek(Number(f.dataset.t), redraw);
  });

  /* transport */
  const play = $("#play");
  const toggle = () => {
    state.playing = !state.playing;
    play.classList.toggle("on", state.playing);
    play.setAttribute("aria-label", state.playing ? "Pause" : "Play");
  };
  play.addEventListener("click", toggle);

  $("#wave").addEventListener("click", (e) => {
    const r = $("#wave").getBoundingClientRect();
    seek(((e.clientX - r.left) / r.width) * DUR, redraw);
  });
  $("#wave").addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { seek(state.t - 5, redraw); e.preventDefault(); }
    if (e.key === "ArrowRight") { seek(state.t + 5, redraw); e.preventDefault(); }
  });

  $$(".chip").forEach((c) => c.addEventListener("click", () => {
    state.rate = Number(c.dataset.rate);
    $$(".chip").forEach((o) => o.setAttribute("aria-pressed", String(o === c)));
  }));

  /* search + filters */
  $("#find").addEventListener("input", (e) => { state.query = e.target.value; applySearch(redraw); });
  $("#unclear").addEventListener("click", () => {
    state.onlyUnclear = !state.onlyUnclear;
    $("#unclear").setAttribute("aria-pressed", String(state.onlyUnclear));
    applySearch(redraw);
  });
  $("#export").addEventListener("click", () => setSaved(false));

  /* keyboard, everywhere — a tool that needs the mouse is half a tool */
  addEventListener("keydown", (e) => {
    const typing = e.target.matches("input, [contenteditable='true']");
    if (e.key === "/" && !typing) { e.preventDefault(); $("#find").focus(); return; }
    if (e.key === "Escape") { $("#find").value = ""; state.query = ""; applySearch(redraw); $("#find").blur(); return; }
    if (typing) return;
    if (e.code === "Space") { e.preventDefault(); toggle(); }
    if (e.key === "ArrowLeft") { e.preventDefault(); seek(state.t - 5, redraw); }
    if (e.key === "ArrowRight") { e.preventDefault(); seek(state.t + 5, redraw); }
  });

  let last = performance.now();
  function tick(now) {
    const dt = (now - last) / 1000; last = now;
    if (state.playing) {
      seek(state.t + dt * state.rate, redraw);
      if (state.t >= DUR) { state.playing = false; play.classList.remove("on"); }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

init();
