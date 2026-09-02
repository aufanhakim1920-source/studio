/* ROTOR — landing page 2 of 3 (the creative one)
 * ---------------------------------------------------------------------------
 * ⭐ THE OBJECT: a working zoetrope. Twelve frames painted around the inside of
 * a slotted drum; drag the drum and the frames animate through the slits.
 *
 * Why this object: it is a motion studio, and a zoetrope is the first machine
 * that ever made a drawing move — [[Object Must Be In Theme]]. It is also the
 * only object I could think of whose ENTIRE POINT is the thing the studio sells,
 * so it carries the pitch instead of decorating it.
 *
 * It is load-bearing: the strip you choose changes what the drum animates, the
 * rpm readout is your drag speed, and the spin counter is the footer's stat.
 *
 * MOTION: one drum, one rotation, and it is the visitor's hand that turns it.
 * Momentum decays and the loop ENDS — see [[Motion Must Be User Driven]]. There
 * is no ambient spin, because a page that spins on its own is a screensaver.
 *
 * All hand-rolled 2D canvas: no three.js, no library. Technique from
 * [[Hand Rolled 3D Wireframe]] — the drum is drawn as an ellipse pair with the
 * slits placed by angle, and the frames are simple vector figures.
 */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

const MINT = "#8FD9B6", TERRA = "#D97B56", BONE = "#F2EDE4", VOID = "#1A1614";

/* ── the strips ───────────────────────────────────────────────────────────
   Each is a function of frame index -> a drawing. Twelve frames, and frame 12
   must land back where frame 1 started or the loop visibly jumps.            */
const STRIPS = [
  {
    id: "walk", label: "A walk cycle",
    /* ⚠️ Sized to FILL the box. The first version used h*0.17 for the leg length
       and the whole figure came out about a third of the height it had — present,
       correct, and too small to read as a person from across the page. */
    draw(ctx, i, w, h) {
      /* ⚠️ phase offset. At i = 0 a raw sin() puts BOTH legs and BOTH arms at
         angle zero, so they stack on the spine and the figure renders as a head
         on a stick. Frame 0 is the frame everyone sees first — never let it be
         the degenerate pose. */
      const t = (i / 12 + .125) * Math.PI * 2;
      const cx = w / 2, base = h * .94, L = h * .30;
      ctx.strokeStyle = BONE; ctx.lineWidth = Math.max(3, h * .022); ctx.lineCap = "round";
      /* body bobs twice per cycle — that is what makes a walk read as a walk */
      const bob = Math.abs(Math.sin(t)) * h * .05;
      const hip = base - L - bob;
      ctx.beginPath();
      ctx.arc(cx, hip - h * .30, h * .085, 0, 7); ctx.stroke();          // head
      ctx.beginPath();
      ctx.moveTo(cx, hip - h * .215); ctx.lineTo(cx, hip); ctx.stroke(); // spine
      /* legs, opposed */
      [1, -1].forEach((s) => {
        const a = Math.sin(t) * .7 * s;
        const kx = cx + Math.sin(a) * L * .5, ky = hip + Math.cos(a) * L * .5;
        ctx.beginPath(); ctx.moveTo(cx, hip); ctx.lineTo(kx, ky);
        ctx.lineTo(kx + Math.sin(a * .3) * L * .5, ky + L * .5); ctx.stroke();
      });
      /* arms, opposed to the legs */
      [1, -1].forEach((s) => {
        const a = Math.sin(t) * .6 * -s;
        ctx.beginPath(); ctx.moveTo(cx, hip - h * .19);
        ctx.lineTo(cx + Math.sin(a) * L * .6, hip - h * .19 + Math.cos(a) * L * .6);
        ctx.stroke();
      });
    },
  },
  {
    id: "bounce", label: "A bouncing ball",
    draw(ctx, i, w, h) {
      const t = i / 12;
      /* |sin| gives the squash at the bottom for free */
      const y = h * .86 - Math.abs(Math.sin(t * Math.PI * 2)) * h * .60;
      const squash = 1 + (1 - Math.abs(Math.sin(t * Math.PI * 2))) * .34;
      ctx.fillStyle = TERRA;
      ctx.beginPath();
      ctx.ellipse(w / 2, y, h * .15 * squash, h * .15 / squash, 0, 0, 7);
      ctx.fill();
      ctx.strokeStyle = "rgba(242,237,228,.28)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(w * .18, h * .99); ctx.lineTo(w * .82, h * .99); ctx.stroke();
    },
  },
  {
    id: "type", label: "A word landing",
    draw(ctx, i, w, h) {
      const t = i / 12;
      const drop = (1 - Math.min(t * 2.2, 1));
      ctx.save();
      ctx.translate(w / 2, h * .58 - drop * h * .34);
      ctx.globalAlpha = Math.min(t * 3, 1);
      ctx.fillStyle = MINT;
      ctx.font = `800 ${Math.round(h * .44)}px Bricolage Grotesque, sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("GO", 0, 0);
      ctx.restore();
    },
  },
];

const JOBS = [
  ["01", "Launch film, 60s", "Product", "0:60"],
  ["02", "Title sequence", "Broadcast", "0:22"],
  ["03", "Six social cutdowns", "Campaign", "0:06 ×6"],
  ["04", "Explainer, hand-drawn", "Product", "1:40"],
  ["05", "Loop for a foyer screen", "Environment", "∞"],
];

const TIERS = [
  ["One film", "$6,400", "fixed", ["Up to 60 seconds", "Two rounds of changes", "Delivered in four formats"], false],
  ["A campaign", "$18,000", "from", ["One hero plus six cutdowns", "Storyboard before we animate", "Six weeks, start to finish"], true],
  ["On retainer", "$4,200", "per month", ["Four deliverables a month", "Same two people every time", "Cancel with a month's notice"], false],
];

const QA = [
  ["How long does a 60-second film take?", "Four to six weeks, and about half of that is before anything moves. We storyboard first, you approve the frames, and only then do we animate — because changing a drawing costs an hour and changing an animation costs a week."],
  ["Do you write the script?", "Usually. Most people arrive with a rough idea and a deadline rather than a script, and the writing is where the film gets decided. If you already have one we will still read it aloud with you once, because scripts that look fine on a page often do not survive being spoken."],
  ["Can you work with our existing brand?", "Yes, and it is easier than starting blank. Send the brand guidelines, any previous films, and — most useful of all — two things you have seen recently that you wish were yours."],
  ["What do you need from us to start?", "A call, a deadline, and one person who can approve. The third is the one that actually determines whether a project runs on time."],
  ["Do you do live action?", "No. We draw, animate and composite. When a job needs a camera we bring in a director we have worked with before and stay on as the motion side, rather than pretending we shoot."],
];

/* ── the zoetrope ─────────────────────────────────────────────────────────── */
function zoetrope() {
  const cv = $("#cv"), ctx = cv.getContext("2d");
  let W = 0, H = 0, angle = 0, vel = 0, drag = false, lastX = 0, spins = 0, turned = 0;
  let strip = STRIPS[0], running = false;
  const SLITS = 12;

  function size() {
    const r = cv.getBoundingClientRect();
    const d = Math.min(devicePixelRatio || 1, 2);
    /* taller on narrow screens: at 0.74 the drum was 22% of a phone viewport and
       the page read as text with a picture, instead of an object you operate. */
    W = r.width || 520; H = Math.round(W * (W < 640 ? 1.15 : 0.74));
    cv.width = Math.round(W * d); cv.height = Math.round(H * d);
    cv.style.height = H + "px";
    ctx.setTransform(d, 0, 0, d, 0, 0);
  }

  function draw() {
    if (!W) return;
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H * .55;
    const rx = Math.min(W * .40, 260), ry = rx * .30;   // the drum, seen from above-ish
    const wall = H * .30;

    /* ⭐ THE FIGURE FIRST, THEN THE DRUM OVER IT.
       ⚠️ Three earlier attempts all failed the same way: the drum was drawn as an
       opaque cylinder and the drawing went behind or inside it, so it came back
       as a sliver, a clipped head, or a faint line. A zoetrope is a CAGE, and the
       fix is to treat it as one — paint the figure at full size and full contrast,
       then lay a translucent drum and its slits over the top. The drawing is
       never hidden, and the object still reads as a slotted drum. */
    const frame = Math.floor(((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2) * 12) % 12;
    const fh = H * .62, fw = rx * 1.15;
    ctx.save();
    ctx.translate(cx - fw / 2, cy + ry - fh);
    strip.draw(ctx, frame, fw, fh);
    ctx.restore();

    /* the drum body: a cylinder made of two ellipses and the band between,
       translucent so the figure inside stays legible */
    ctx.fillStyle = "rgba(46,38,33,.62)";
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI);
    ctx.lineTo(cx - rx, cy - wall);
    ctx.ellipse(cx, cy - wall, rx, ry, 0, Math.PI, 0, true);
    ctx.closePath(); ctx.fill();

    /* the mouth of the drum */
    ctx.strokeStyle = "rgba(242,237,228,.22)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(cx, cy - wall, rx, ry, 0, 0, 7); ctx.stroke();

    /* the slits — placed by angle, so they rotate with the drum and you can SEE
       the thing spinning even when the frame index has not changed yet */
    for (let i = 0; i < SLITS; i++) {
      const a = angle + (i / SLITS) * Math.PI * 2;
      const s = Math.sin(a);
      if (s < 0) continue;                        /* only the near half is visible */
      const x = cx + Math.cos(a) * rx;
      const yTop = cy - wall + Math.sin(a) * ry;
      const yBot = cy + Math.sin(a) * ry;
      /* the slit is a GAP, not a dark bar - the frame is already showing through
         it. Only its two edges get drawn, so the eye reads a cut in the wall. */
      /* the slit as a pair of edges over the cutaway - dark enough to read as a
         cut in the near wall, thin enough not to hide the drawing behind it */
      /* a slit is a GAP: clear the translucent wall inside it, then edge it */
      ctx.clearRect(x - 7, yTop, 14, yBot - yTop);
      ctx.fillStyle = "rgba(143,217,182,.5)";
      ctx.fillRect(x - 7, yTop, 1.3, yBot - yTop);
      ctx.fillRect(x + 6, yTop, 1.3, yBot - yTop);
    }

    /* the rim, drawn last so it caps the slits cleanly */
    ctx.strokeStyle = MINT; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI); ctx.stroke();

    /* spindle and base */
    ctx.strokeStyle = "rgba(242,237,228,.35)"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(cx, cy + ry); ctx.lineTo(cx, cy + ry + H * .09); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx, cy + ry + H * .09, rx * .34, ry * .34, 0, 0, 7); ctx.stroke();
  }

  function loop() {
    if (!drag) { angle += vel; vel *= 0.965; }
    turned += Math.abs(vel);
    if (turned > Math.PI * 2) { turned -= Math.PI * 2; spins++; $("#spins").textContent = spins; }
    $("#rpm").textContent = Math.round(Math.abs(vel) * 60 * 60 / (Math.PI * 2));
    draw();
    /* it keeps ticking only while there is momentum left to spend */
    if (Math.abs(vel) > 0.0008 || drag) requestAnimationFrame(loop);
    else { running = false; vel = 0; $("#rpm").textContent = "0"; draw(); }
  }
  const kick = () => { if (!running && !REDUCED) { running = true; requestAnimationFrame(loop); } };

  cv.addEventListener("pointerdown", (e) => {
    drag = true; lastX = e.clientX; cv.setPointerCapture(e.pointerId); kick();
  });
  addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - lastX;
    vel = dx * 0.004;
    angle += vel;
    lastX = e.clientX;
    draw();
  });
  addEventListener("pointerup", () => { if (drag) { drag = false; kick(); } });

  /* keyboard: the drum is a control, so it has to be operable without a mouse */
  cv.tabIndex = 0;
  cv.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { vel = 0.09; kick(); e.preventDefault(); }
    if (e.key === "ArrowLeft")  { vel = -0.09; kick(); e.preventDefault(); }
  });

  size(); draw();
  addEventListener("resize", () => { size(); draw(); }, { passive: true });

  return { pick(s) { strip = s; draw(); } };
}

/* ── page ─────────────────────────────────────────────────────────────────── */
function init() {
  const Z = zoetrope();

  $("#strips").innerHTML = STRIPS.map((s, i) =>
    `<button class="strip" type="button" aria-pressed="${i === 0}" data-i="${i}"><i></i>${s.label}</button>`).join("");
  $$("#strips .strip").forEach((b) => b.addEventListener("click", () => {
    $$("#strips .strip").forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
    Z.pick(STRIPS[Number(b.dataset.i)]);
  }));

  $("#jobs").innerHTML = JOBS.map(([n, t, k, len]) => `
    <li><button type="button">
      <span class="no">${n}</span><b>${t}</b><span class="k">${k}</span><span class="len">${len}</span>
    </button></li>`).join("");

  $("#tiers").innerHTML = TIERS.map(([k, p, u, l, hot]) => `
    <article class="tier${hot ? " tier--hot" : ""}">
      <span class="tier__k">${k}${hot ? " &middot; most taken" : ""}</span>
      <span class="tier__p">${p}<small>${u}</small></span>
      <ul>${l.map((x) => `<li>${x}</li>`).join("")}</ul>
      <a href="#">${hot ? "Start a campaign" : "Enquire"}</a>
    </article>`).join("");

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
      requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add("is-open")));
    });
  });

  const tick = () => $("#clock").textContent = new Date().toLocaleTimeString("en-AU",
    { timeZone: "Australia/Melbourne", hour: "2-digit", minute: "2-digit" });
  tick(); setInterval(tick, 30000);
}

init();
