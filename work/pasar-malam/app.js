const OPEN = 1020, CLOSE = 1380;          // 17:00 → 23:00, in minutes
const KITCHENS = {
  Indonesian: "#FF7A3D",
  Malaysian:  "#C4B2E8",
  Dessert:    "#F2C879",
  Drinks:     "#7C8CE0",
  Snacks:     "#A9DCB4",
};
const STALLS = [
  { n: "Warung Ibu Sri",       d: "Nasi goreng kambing, fried egg on top", p: 14, k: "Indonesian", from: 1020, out: null },
  { n: "Sate Cak Man",         d: "Sate ayam madura, ten sticks",          p: 16, k: "Indonesian", from: 1020, out: 1290 },
  { n: "Kopi Tubruk Club",     d: "Es kopi susu with palm sugar",          p:  6, k: "Drinks",     from: 1020, out: null },
  { n: "Martabak Manis Bros",  d: "Chocolate and cheese martabak",         p: 12, k: "Dessert",    from: 1080, out: null },
  { n: "Bakso Malang 88",      d: "Bakso urat in a very hot broth",        p: 15, k: "Indonesian", from: 1020, out: null },
  { n: "Roti John Melbourne",  d: "Roti john, extra cheese, no apology",   p: 13, k: "Malaysian",  from: 1020, out: null },
  { n: "Pisang Goreng Nona",   d: "Banana fritters, palm sugar drizzle",   p:  8, k: "Dessert",    from: 1020, out: 1350 },
  { n: "Mie Ayam Pak De",      d: "Mie ayam with bakso, chilli on side",   p: 14, k: "Indonesian", from: 1020, out: null },
  { n: "Cendol Cart",          d: "Cendol with durian, if you dare",       p:  7, k: "Drinks",     from: 1080, out: null },
  { n: "Ayam Geprek Gila",     d: "Level five geprek. No mercy, no milk",  p: 15, k: "Indonesian", from: 1020, out: null },
  { n: "Char Kway Teow Lah",   d: "CKT with lap cheong and wok breath",    p: 16, k: "Malaysian",  from: 1020, out: 1320 },
  { n: "Rujak Serut",          d: "Shaved fruit rujak, hot peanut sauce",  p:  9, k: "Dessert",    from: 1020, out: null },
  { n: "Sop Buntut Malam",     d: "Oxtail soup. Opens late, on purpose",   p: 19, k: "Indonesian", from: 1200, out: null },
  { n: "Teh Tarik Station",    d: "Pulled tea, poured from three heights", p:  5, k: "Drinks",     from: 1020, out: null },
  { n: "Lumpia Semarang",      d: "Bamboo shoot spring rolls, six a bag",  p: 10, k: "Snacks",     from: 1020, out: 1260 },
  { n: "Otak-Otak Grill",      d: "Grilled fish cake in banana leaf",      p:  9, k: "Snacks",     from: 1020, out: null },
  { n: "Es Campur Ratu",       d: "Shaved ice, eight toppings, chaos",     p:  8, k: "Dessert",    from: 1140, out: null },
  { n: "Sambal Society",       d: "Six sambals. Bring your own bread",     p: 11, k: "Snacks",     from: 1020, out: null },
];
const PROGRAMME = [
  { s: 1020, e: 1065, t: "Gamelan warm-up",        w: "By the fountain. The gong is louder than you expect." },
  { s: 1080, e: 1120, t: "Sambal Society tasting", w: "Six sambals, one spoon each, a queue for water afterwards." },
  { s: 1140, e: 1200, t: "Dangdut — Ratu Malam",   w: "The hour everyone films and nobody dances until minute forty." },
  { s: 1215, e: 1260, t: "Sate cook-off",          w: "Four grills, one crowd vote. Cak Man has won it twice." },
  { s: 1275, e: 1335, t: "Acoustic — Senja Trio",  w: "Quieter set while the kitchens catch up on orders." },
  { s: 1350, e: 1380, t: "Last orders, lights out", w: "Kitchens close at 22:30. The square is empty by eleven." },
];
const CROWD = [
  { h: 17, v: 22 }, { h: 18, v: 48 }, { h: 19, v: 86 },
  { h: 20, v: 100 }, { h: 21, v: 74 }, { h: 22, v: 40 },
];
const BRING = [
  "Cash — six stalls only take it",
  "A jumper. It is August in Melbourne",
  "An empty container for leftovers",
  "Someone who handles chilli better than you",
  "Patience, specifically for the sate queue",
];
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
document.documentElement.classList.replace("no-js", "js");
const hhmm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let now = OPEN;
/* ═══════════════ 1 · THE LANTERN ═══════════════
   Hand-rolled 3D: an edge list, three rotations, one divide for the
   projection, painter's-algorithm depth sort, stroked on 2D canvas.
   No library. Pipeline per the Hand Rolled 3D Wireframe template — the
   only change is that yaw/pitch come from a drag rather than from time. */
const R = 104, SQUASH = 0.74, FOCAL = 780;
const edges = [];
const push = (p1, p2, type) => edges.push({ p1, p2, type: type || "normal" });
const PHI = 1.27;                                  // how far the shade reaches toward the poles
const surf = (phi, a) => ({
  x: R * Math.cos(phi) * Math.cos(a),
  y: -R * SQUASH * Math.sin(phi),
  z: R * Math.cos(phi) * Math.sin(a),
});
(function buildLantern() {
  const RIBS = 18, SEG = 16;
  for (let i = 0; i < RIBS; i++) {
    const a = (i / RIBS) * Math.PI * 2;
    for (let j = 0; j < SEG; j++) {
      const p1 = surf(-PHI + (2 * PHI * j) / SEG, a);
      const p2 = surf(-PHI + (2 * PHI * (j + 1)) / SEG, a);
      push(p1, p2, "heavy");                        // ribs are the structure
    }
  }
  [-1.02, -0.66, -0.33, 0, 0.33, 0.66, 1.02].forEach((phi) => {
    for (let i = 0; i < 44; i++) {
      const a1 = (i / 44) * Math.PI * 2, a2 = ((i + 1) / 44) * Math.PI * 2;
      push(surf(phi, a1), surf(phi, a2));
    }
  });
  const yTop = -R * SQUASH * Math.sin(PHI), yBot = -yTop;
  const rCap = R * Math.cos(PHI);
  const ring = (radius, y, n, type) => {
    for (let i = 0; i < n; i++) {
      const a1 = (i / n) * Math.PI * 2, a2 = ((i + 1) / n) * Math.PI * 2;
      push({ x: radius * Math.cos(a1), y, z: radius * Math.sin(a1) },
           { x: radius * Math.cos(a2), y, z: radius * Math.sin(a2) }, type);
    }
  };
  ring(rCap, yTop, 26, "heavy");                    // rattan ring, top
  ring(rCap, yBot, 26, "heavy");                    // rattan ring, bottom
  ring(rCap * 0.52, yTop - 20, 20, "heavy");        // fixture collar
  for (let i = 0; i < 4; i++) {                     // collar struts
    const a = (i / 4) * Math.PI * 2;
    push({ x: rCap * Math.cos(a), y: yTop, z: rCap * Math.sin(a) },
         { x: rCap * 0.52 * Math.cos(a), y: yTop - 20, z: rCap * 0.52 * Math.sin(a) }, "heavy");
  }
  push({ x: 0, y: yTop - 20, z: 0 }, { x: 0, y: yTop - 96, z: 0 }, "heavy");    // drop cord
  for (let i = 0; i < 7; i++) {                     // tassel
    const a = (i / 7) * Math.PI * 2, r0 = rCap * 0.28;
    push({ x: r0 * Math.cos(a), y: yBot, z: r0 * Math.sin(a) },
         { x: r0 * 1.9 * Math.cos(a), y: yBot + 46, z: r0 * 1.9 * Math.sin(a) });
  }
})();
const ANCHORS = {
  hud00: surf(0.3, Math.PI * 0.92),                                  // silk shade
  hud01: { x: R * Math.cos(PHI) * 0.9, y: R * SQUASH * Math.sin(PHI), z: 0 },   // lower ring
  hud02: { x: 0, y: R * SQUASH * Math.sin(PHI) + 42, z: 0 },         // tassel tip
  hud03: { x: 0, y: -R * SQUASH * Math.sin(PHI) - 60, z: 0 },        // cord, mid-run
};
const cv = $("#lantern"), ctx = cv.getContext("2d");
const stage = $("#lanternStage"), svg = $("#lanternSvg");
let yaw = -0.5, pitch = -0.12, restPitch = -0.12, dirty = true, dragging = false;
function rot(p) {
  let { x, y, z } = p;
  let c = Math.cos(yaw), s = Math.sin(yaw);
  [x, z] = [x * c - z * s, x * s + z * c];
  c = Math.cos(pitch); s = Math.sin(pitch);
  [y, z] = [y * c - z * s, y * s + z * c];
  return { x, y, z };
}
function project(p) {
  const scale = FOCAL / (FOCAL + p.z);
  return { x: p.x * scale + cv.clientWidth / 2, y: p.y * scale + cv.clientHeight / 2 + 8, z: p.z };
}
/* the wire warms as the evening does — the clock reaching into the hero object */
const DUSK = [
  { m: 1020, c: [124, 140, 224] },   // 17:00 indigo
  { m: 1140, c: [224, 112, 154] },   // 19:00 rose
  { m: 1260, c: [255, 122,  61] },   // 21:00 ember
];
function wireColour() {
  const m = clamp(now, DUSK[0].m, DUSK[DUSK.length - 1].m);
  for (let i = 0; i < DUSK.length - 1; i++) {
    const a = DUSK[i], b = DUSK[i + 1];
    if (m <= b.m) {
      const t = (m - a.m) / (b.m - a.m);
      return a.c.map((v, k) => Math.round(lerp(v, b.c[k], t)));
    }
  }
  return DUSK[DUSK.length - 1].c;
}
function sizeCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = stage.clientWidth, h = stage.clientHeight;
  cv.style.width = w + "px"; cv.style.height = h + "px";
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  dirty = true;
}
function draw() {
  const w = cv.clientWidth, h = cv.clientHeight;
  ctx.clearRect(0, 0, w, h);
  const [cr, cg, cb] = wireColour();
  const tf = edges.map((e) => {
    const p1 = rot(e.p1), p2 = rot(e.p2);
    return { a: project(p1), b: project(p2), avgZ: (p1.z + p2.z) / 2, type: e.type };
  }).sort((m, n) => n.avgZ - m.avgZ);              // painter's algorithm
  // ghost layers: the same edge list drawn three times, offset and faded.
  // Best effort-to-payoff ratio in the reference — two extra loops, and the
  // object reads as a holographic stack instead of a flat drawing.
  const LAYERS = [
    { dy: 46, alpha: 0.05, lw: 1 },
    { dy: 22, alpha: 0.10, lw: 1 },
    { dy: 0,  alpha: 1.00, lw: 1.4 },
  ];
  for (const L of LAYERS) {
    for (const e of tf) {
      let d = 1 - (e.avgZ + R) / (R * 2.5);
      d = clamp(d, 0.1, 1);
      if (e.type === "heavy") d = Math.min(1, d * 1.55);
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},${(d * L.alpha).toFixed(3)})`;
      ctx.lineWidth = e.type === "heavy" ? L.lw : L.lw * 0.72;
      ctx.beginPath();
      ctx.moveTo(e.a.x, e.a.y + L.dy);
      ctx.lineTo(e.b.x, e.b.y + L.dy);
      ctx.stroke();
    }
  }
  drawCallouts(`rgb(${cr},${cg},${cb})`);
}
/* HUD callouts: a horizontal run out of the label, then one diagonal to the
   3D anchor. The horizontal run is what makes it read as annotation rather
   than a piece of string tied to the model. */
function drawCallouts(colour) {
  const sb = stage.getBoundingClientRect();
  let out = "";
  for (const id of Object.keys(ANCHORS)) {
    const el = document.getElementById(id);
    if (!el || el.offsetParent === null) continue;
    const r = el.getBoundingClientRect();
    const target = project(rot(ANCHORS[id]));
    const onLeft = r.left - sb.left < sb.width / 2;
    const sx = (onLeft ? r.right - sb.left : r.left - sb.left);
    const sy = r.top - sb.top + r.height / 2;
    const mx = sx + (onLeft ? 22 : -22);
    out += `<path d="M ${sx} ${sy} L ${mx} ${sy} L ${target.x} ${target.y}"
              fill="none" stroke="${colour}" stroke-width="1.1" opacity=".55"/>
            <rect x="${target.x - 3.5}" y="${target.y - 3.5}" width="7" height="7"
              transform="rotate(45 ${target.x} ${target.y})"
              fill="#0C0C10" stroke="${colour}" stroke-width="1.2"/>`;
  }
  svg.innerHTML = out;
}
function loop() {
  if (!dragging) {
    const d = restPitch - pitch;
    if (Math.abs(d) > 0.0015) { pitch += d * 0.09; dirty = true; }
  }
  if (dirty) { draw(); dirty = false; }
  requestAnimationFrame(loop);
}
(function initDrag() {
  let px = 0, py = 0;
  stage.addEventListener("pointerdown", (e) => {
    dragging = true; px = e.clientX; py = e.clientY;
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    yaw += (e.clientX - px) * 0.0075;
    pitch = clamp(pitch + (e.clientY - py) * 0.005, -0.55, 0.55);
    px = e.clientX; py = e.clientY; dirty = true;
  });
  const end = () => { dragging = false; };
  stage.addEventListener("pointerup", end);
  stage.addEventListener("pointercancel", end);
  stage.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft")  { yaw -= 0.22; dirty = true; e.preventDefault(); }
    if (e.key === "ArrowRight") { yaw += 0.22; dirty = true; e.preventDefault(); }
  });
  stage.tabIndex = 0;
  stage.setAttribute("role", "img");
  stage.setAttribute("aria-label", "A wireframe schematic of a paper lantern. Drag it, or use the arrow keys, to turn it.");
})();
/* ═══════════════ 2 · STALLS ═══════════════ */
function stallState(s) {
  if (now < s.from) return { cls: "s-soon", txt: `OPENS ${hhmm(s.from)}` };
  if (s.out && now >= s.out) return { cls: "s-out", txt: "SOLD OUT" };
  return { cls: "s-open", txt: "OPEN" };
}
function renderStalls() {
  $("#stallgrid").innerHTML = STALLS.map((s, i) => `
    <article class="stall" data-k="${s.k}">
      <span class="stall__kit" style="background:${KITCHENS[s.k]}"></span>
      <span class="stall__no">No.${String(i + 1).padStart(2, "0")} · ${s.k}</span>
      <h3 class="stall__name">${s.n}</h3>
      <p class="stall__dish">${s.d}</p>
      <div class="stall__foot">
        <span class="stall__price">$${s.p}</span>
        <span class="stall__state"></span>
      </div>
    </article>`).join("");
  const kinds = ["All", ...Object.keys(KITCHENS)];
  $("#filters").innerHTML = kinds.map((k, i) => {
    const n = k === "All" ? STALLS.length : STALLS.filter((s) => s.k === k).length;
    return `<button class="filt${i === 0 ? " is-on" : ""}" role="tab"
      aria-selected="${i === 0}" data-f="${k}" type="button">${k} · ${n}</button>`;
  }).join("");
  $$(".filt").forEach((b) => b.addEventListener("click", () => {
    $$(".filt").forEach((x) => { x.classList.remove("is-on"); x.setAttribute("aria-selected", "false"); });
    b.classList.add("is-on"); b.setAttribute("aria-selected", "true");
    let shown = 0;
    $$(".stall").forEach((c) => {
      const hit = b.dataset.f === "All" || c.dataset.k === b.dataset.f;
      c.classList.toggle("is-hidden", !hit);
      if (hit) shown++;
    });
    $("#stallCount").textContent = `${shown} SHOWN`;
  }));
}
/* ═══════════════ 3 · PROGRAMME ═══════════════ */
const ROW = 52;
function renderProgramme() {
  const sched = $("#sched");
  let html = "";
  for (let h = 17; h <= 23; h++) {
    html += `<div class="hour"><span class="hour__lab">${String(h).padStart(2, "0")}:00</span><span class="hour__rule"></span></div>`;
  }
  html += PROGRAMME.map((p, i) => {
    const top = ((p.s - OPEN) / 60) * ROW;
    const height = Math.max(34, ((p.e - p.s) / 60) * ROW - 6);
    return `<div class="ev" data-i="${i}" style="top:${top}px;height:${height}px">
      <b>${hhmm(p.s)} — ${hhmm(p.e)}</b>${p.t}</div>`;
  }).join("");
  html += `<div class="sched__line" id="schedLine" aria-hidden="true"></div>`;
  sched.innerHTML = html;
}
/* ═══════════════ 4 · CROWD + DONUT ═══════════════ */
function renderCrowd() {
  $("#chart").innerHTML = CROWD.map((c) => `<b data-h="${c.h}" data-v="${c.v}"></b>`).join("");
  $("#chartAxis").innerHTML = CROWD.map((c) => `<li>${c.h}</li>`).join("");
}
function fillChart() {
  $$("#chart b").forEach((b, i) => {
    setTimeout(() => { b.style.height = `${b.dataset.v}%`; }, i * 50);   // ref 24's staggered setTimeout
  });
}
function renderDonut() {
  const counts = Object.keys(KITCHENS).map((k) => ({
    k, v: STALLS.filter((s) => s.k === k).length, c: KITCHENS[k],
  }));
  const total = counts.reduce((a, b) => a + b.v, 0);
  const r = 62, C = 2 * Math.PI * r;
  let off = 0;
  $("#donut").innerHTML = counts.map((c) => {
    const len = (c.v / total) * C;
    const seg = `<circle cx="90" cy="90" r="${r}" fill="none" stroke="${c.c}"
      stroke-width="17" stroke-linecap="round"
      stroke-dasharray="0 ${C}" data-len="${len.toFixed(2)}" data-c="${C.toFixed(2)}"
      stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 90 90)"
      style="transition:stroke-dasharray .9s cubic-bezier(.22,.61,.36,1)"/>`;
    off += len;
    return seg;
  }).join("") +
    `<text x="90" y="86" text-anchor="middle" fill="#fff"
       style="font:700 26px Syne,sans-serif">18</text>
     <text x="90" y="104" text-anchor="middle" fill="#8E8E9A"
       style="font:400 9px 'IBM Plex Mono',monospace; letter-spacing:.12em">KITCHENS</text>`;
  $("#donutLegend").innerHTML = counts.map((c) =>
    `<li><i style="background:${c.c}"></i>${c.k}<b>${c.v}</b></li>`).join("");
}
function fillDonut() {
  $$("#donut circle").forEach((c, i) => {
    setTimeout(() => {
      c.setAttribute("stroke-dasharray", `${+c.dataset.len - 4} ${+c.dataset.c}`);
    }, i * 90);
  });
}
/* ═══════════════ 5 · AVATARS + CHECKS ═══════════════ */
function renderAvatars() {
  $("#avatars").innerHTML = ["IS", "CM", "KT", "BM", "RJ"]
    .map((t, i) => `<span style="opacity:${(1 - i * 0.15).toFixed(2)}">${t}</span>`).join("")
    + `<em class="avatars__more">+13 more</em>`;
}
function renderChecks() {
  $("#checks").innerHTML = BRING.map((t) =>
    `<li tabindex="0" role="checkbox" aria-checked="false"><span class="box"></span><span>${t}</span></li>`).join("");
  const toggle = (li) => {
    const on = li.classList.toggle("is-done");
    li.setAttribute("aria-checked", String(on));
  };
  $$("#checks li").forEach((li) => {
    li.addEventListener("click", () => toggle(li));
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(li); }
    });
  });
}
/* ═══════════════ 6 · THE CLOCK — drives everything above ═══════════════ */
function setNow(m) {
  now = clamp(m, OPEN, CLOSE);
  $("#scrubOut").textContent = hhmm(now);
  $("#scrub").setAttribute("aria-valuetext", hhmm(now));
  $("#nowClock").textContent = hhmm(now);
  $("#lanternTime").textContent = `SPEC ${hhmm(now)}`;
  // programme: the line, and which event is live
  const line = $("#schedLine");
  if (line) line.style.top = `${((now - OPEN) / 60) * ROW}px`;
  const live = PROGRAMME.findIndex((p) => now >= p.s && now < p.e);
  $$(".ev").forEach((e) => e.classList.toggle("is-live", +e.dataset.i === live));
  // stalls
  $$(".stall").forEach((c, i) => {
    const st = stallState(STALLS[i]);
    const el = $(".stall__state", c);
    el.className = `stall__state ${st.cls}`;
    el.textContent = st.txt;
  });
  // busy-hour bar
  const hr = Math.floor(now / 60);
  const band = CROWD.find((c) => c.h === hr) || CROWD[CROWD.length - 1];
  $$("#chart b").forEach((b) => b.classList.toggle("is-now", +b.dataset.h === hr));
  $("#crowdVal").textContent = band.v;
  $("#crowdNow").textContent = now >= CLOSE - 30 ? "WINDING DOWN" : `NOW ${hhmm(hr * 60)}`;
  // the "right now" card
  const nextUp = PROGRAMME.filter((p) => p.s > now).slice(0, 3);
  if (live >= 0) {
    $("#nowTitle").textContent = PROGRAMME[live].t;
    $("#nowSub").textContent = PROGRAMME[live].w;
  } else if (nextUp.length) {
    $("#nowTitle").textContent = "Between sets";
    $("#nowSub").textContent = `Nothing on stage. ${nextUp[0].t} starts at ${hhmm(nextUp[0].s)} — good window for the long queues.`;
  } else {
    $("#nowTitle").textContent = "That is the night";
    $("#nowSub").textContent = "Kitchens are cold, the lanterns come down, and Lygon Street takes over.";
  }
  const soldOut = STALLS.filter((s) => s.out && now >= s.out);
  const opening = STALLS.filter((s) => s.from > now);
  $("#nowList").innerHTML = [
    ...nextUp.map((p) => `<li><span>${p.t}</span><span class="tag">${hhmm(p.s)}</span></li>`),
    soldOut.length
      ? `<li><span>Sold out: ${soldOut.map((s) => s.n).join(", ")}</span><span class="tag tag--off">GONE</span></li>` : "",
    opening.length
      ? `<li><span>Still to open: ${opening.map((s) => s.n).join(", ")}</span><span class="tag tag--off">SOON</span></li>` : "",
  ].filter(Boolean).join("");
  // hero status line
  $("#heroStatus").textContent = live >= 0
    ? `ON NOW · ${PROGRAMME[live].t.toUpperCase()}`
    : `SAT 30 AUG · ARGYLE SQUARE, CARLTON`;
  dirty = true;                                   // the lantern warms with the hour
}
/* ═══════════════ 7 · REVEAL, ONCE ═══════════════ */
function initReveal() {
  $$(".card").forEach((el) => el.classList.add("rv"));
  const io = new IntersectionObserver((ents) => {
    ents.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add("is-in");
      io.unobserve(en.target);
      if (en.target.contains($("#chart"))) fillChart();
      if (en.target.contains($("#donut"))) fillDonut();
    });
  }, { threshold: 0.08, rootMargin: "0px 0px -4% 0px" });
  $$(".rv").forEach((el) => io.observe(el));
}
/* ═══════════════ BOOT ═══════════════ */
renderStalls();
renderProgramme();
renderCrowd();
renderDonut();
renderAvatars();
renderChecks();
initReveal();
$("#scrubTicks").innerHTML = [17, 18, 19, 20, 21, 22, 23]
  .map((h) => `<li>${h}</li>`).join("");
$("#scrub").addEventListener("input", (e) => setNow(+e.target.value));
sizeCanvas();
window.addEventListener("resize", sizeCanvas);
setNow(OPEN);
requestAnimationFrame(loop);
