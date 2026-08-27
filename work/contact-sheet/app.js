/* ============================================================
   Contact Sheet — loupe, frames, radial meter
   ============================================================ */

const FRAMES = [
  { img: "assets/codebrew.jpg", kind: "PROOF", name: "CISSA Codebrew — 1st place",
    body: "Led a team of 4–6 to first place under a 48-hour deadline, as a first-year against masters-level teams. Covered design, frontend and backend, and pitched to the judges. Did it again at Design Blitz.",
    tags: ["Team lead", "48h", "Full-stack", "Pitch"], meta: "Mar 2026 · UniMelb" },

  { img: "assets/wyf.jpg", kind: "PROOF", name: "World Youth Forum Asia",
    body: "Selected delegate representing Indonesia at the Future Economics Leadership Summit.",
    tags: ["Delegate", "2025"], meta: "2025 · Asia" },

  { img: "assets/oweek.jpg", kind: "PROOF", name: "O-Week — Community Badge",
    body: "Guided hundreds of domestic and international students through orientation in high-volume crowd conditions. Awarded the UniMelb Community Badge for proactive service.",
    tags: ["Volunteer", "Front of house"], meta: "Feb 2026 · UniMelb" },

  { img: "assets/cleanup.jpg", kind: "PROOF", name: "Cobra Cleanup — 203.6 kg",
    body: "Head Assistant on a youth environmental committee. 203.6 kg of waste collected, plus donation drives for orphanages. Featured in Jawa Pos.",
    tags: ["Head assistant", "Environment"], meta: "2023 · Surabaya" },

  { img: "assets/orphanage.jpg", kind: "PROOF", name: "Community Build",
    body: "Built and painted housing for underprivileged families, and ran colour-in sessions with kids at the orphanage.",
    tags: ["Community", "Build"], meta: "2023 · Surabaya" },

  { img: "assets/water.jpg", kind: "PROOF", name: "Clean Water Outreach",
    body: "Distributed free clean-water access to households in the surrounding community.",
    tags: ["Outreach"], meta: "2023 · Surabaya" },

  /* NOTE: the IELTS certificate scan is deliberately NOT a frame — it carries a
     candidate ID and a passport photo, and this is a public page. The band
     score lives in the stat blocks instead, which says the same thing. */

  { img: "assets/coffee.jpg", kind: "WORK", name: "Front of house — Natural Tucker",
    body: "Carlton North bakery, weekly roster, high-volume morning service. Won the role from a cold-email outreach campaign I ran and tracked myself. Barista-certified, latte art included.",
    tags: ["Barista", "Service", "Outreach"], meta: "Jul 2026 — now · Carlton North" },

  { img: "assets/athletic.jpg", kind: "PROOF", name: "Taekwondo — 1st place",
    body: "First place, Kyorugi competition. Also a 10K finish at the Standard Chartered Singapore Marathon.",
    tags: ["Kyorugi", "10K"], meta: "2024–25" },

  { img: "assets/gym.jpg", kind: "CERT", name: "NASM — ICPT",
    body: "International Certified Personal Trainer (theory), valid to 2027. Plus First Aid (APKI) and DoFoodSafely.",
    tags: ["NASM", "First aid"], meta: "Valid to 2027" },
];

const SKILLS = [
  { name: "Web & commerce", pct: 92, note: "Shopify · Netlify · vanilla" },
  { name: "Games", pct: 78, note: "Unity · Canvas" },
  { name: "AI & automation", pct: 74, note: "Agents · pipelines" },
  { name: "Motion", pct: 66, note: "Remotion · frame-timed SFX" },
  { name: "Data science", pct: 58, note: "In progress · UniMelb" },
];

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------------- ticker ---------------- */
(() => {
  const line = "OPEN TO WORK /// MELBOURNE 37.81°S /// 9 PROJECTS SHIPPED /// 2× HACKATHON 1ST /// DATA SCIENCE @ UNIMELB /// ";
  $("#ticker").textContent = line.repeat(4);   // repeat so the -50% loop is seamless
})();

/* ---------------- frames ---------------- */
function renderFrames() {
  $("#sheet").innerHTML = FRAMES.map((f, i) => `
    <button class="frame" data-i="${i}" aria-label="${f.name}">
      <span class="frame__no">${String(i + 1).padStart(2, "0")}</span>
      <img src="${f.img}" alt="${f.name}" loading="lazy">
      <span class="frame__mark"></span>
    </button>`).join("");
}

function pick(i) {
  const f = FRAMES[i];
  $("#readout").innerHTML = `
    <div>
      <span class="mono">Frame ${String(i + 1).padStart(2, "0")} · ${f.kind} · ${f.meta}</span>
      <h3>${f.name}</h3>
      <p>${f.body}</p>
      <div class="readout__tags">${f.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>
    </div>
    <div class="readout__side">
      <span class="mono">Selected</span>
      <span class="mono">${String(i + 1).padStart(2, "0")} / ${String(FRAMES.length).padStart(2, "0")}</span>
    </div>`;
  $$(".frame").forEach((el) => el.classList.toggle("is-picked", Number(el.dataset.i) === i));
}

/* ---------------- the loupe ----------------
   One veil over the whole grid with a hole punched at the cursor, rather than
   the reference's two stacked copies of a single image — that's what lets it
   work across a contact sheet instead of one photo. */
function initLoupe() {
  const shell = $("#shell");
  const loupe = $("#loupe");
  const ring = $("#ring");
  if (!shell || reduced) { shell?.classList.add("no-loupe"); return; }

  // start at the sheet's centre, matching the CSS default
  const r0 = shell.getBoundingClientRect();
  let tx = r0.width / 2, ty = r0.height * 0.42, cx = tx, cy = ty, raf = null;
  ring.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;

  shell.addEventListener("pointermove", (e) => {
    const r = shell.getBoundingClientRect();
    tx = e.clientX - r.left;
    ty = e.clientY - r.top;
    if (!raf) raf = requestAnimationFrame(follow);
  });

  // on leave, drift back to the resting spot rather than snapping off-screen
  shell.addEventListener("pointerleave", () => {
    const r = shell.getBoundingClientRect();
    tx = r.width / 2; ty = r.height * 0.42;
    if (!raf) raf = requestAnimationFrame(follow);
  });

  // lerp, so the loupe trails the cursor slightly — the lag is what makes it
  // feel like glass being moved rather than a cursor effect
  function follow() {
    cx += (tx - cx) * 0.16;
    cy += (ty - cy) * 0.16;
    loupe.style.setProperty("--lx", `${cx}px`);
    loupe.style.setProperty("--ly", `${cy}px`);
    ring.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
    raf = Math.abs(tx - cx) > 0.4 || Math.abs(ty - cy) > 0.4 ? requestAnimationFrame(follow) : null;
  }

  $("#toggle-loupe")?.addEventListener("click", (e) => {
    const off = shell.classList.toggle("no-loupe");
    e.target.textContent = off ? "Turn the loupe on" : "Turn the loupe off";
  });

  $("#dev-btn")?.addEventListener("click", () => {
    shell.classList.add("no-loupe");
    const t = $("#toggle-loupe");
    if (t) t.textContent = "Turn the loupe on";
    shell.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
  });
}

/* ---------------- radial tick meter (ref 21, reworked) ---------------- */
function initMeter() {
  const c = $("#meter");
  if (!c) return;
  const ctx = c.getContext("2d");
  const N = 132, R = 190, CX = 260, CY = 260;

  function draw() {
    ctx.clearRect(0, 0, 520, 520);
    const t = Date.now() * 0.002;

    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      let n = Math.sin(i * 0.2 + t) * Math.cos(i * 0.1 - t * 2) * 34;
      n += Math.random() * 9;
      const len = 6 + Math.max(0, n);

      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, -R);
      ctx.lineTo(0, -R - len);
      // amber on the "loud" ticks, paper on the rest
      ctx.strokeStyle = len > 26 ? "rgba(242,160,61,0.95)" : "rgba(237,232,220,0.42)";
      ctx.lineWidth = 2.4;
      ctx.stroke();
      ctx.restore();
    }

    // inner dashed track
    ctx.save();
    ctx.translate(CX, CY);
    ctx.beginPath();
    ctx.setLineDash([4, 8]);
    ctx.arc(0, 0, R - 44, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(237,232,220,0.22)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    if (!reduced) requestAnimationFrame(draw);
  }
  draw();

  // the number ticks around a little so the card never looks frozen
  if (!reduced) {
    setInterval(() => {
      $("#meter-num").textContent = String(86 + Math.floor(Math.random() * 5));
    }, 2600);
  }
}

/* ---------------- skills ---------------- */
function renderSkills() {
  $("#skills").innerHTML = SKILLS.map((s) => `
    <div class="skill-row rise">
      <span class="skill-name">${s.name}</span>
      <!-- width is set here, NOT by JS later. Same rule as the reveal: never
           let correct content depend on a callback firing. -->
      <span class="bar"><span class="bar-fill" style="width:${s.pct}%" data-pct="${s.pct}"></span></span>
      <span class="skill-val">${s.note}</span>
    </div>`).join("");
}

/* ---------------- reveal ---------------- */
function initReveal() {
  if (reduced || !("IntersectionObserver" in window)) return;
  document.documentElement.classList.add("anim-ready");

  // The bars are NOT collapsed and re-filled on scroll. Tried it; an observer
  // that doesn't fire (off-screen rendering, a script error) leaves every skill
  // reading zero — and a wrong number is worse than a missing animation.
  // The row's own fade/rise is the reveal; the bar is just correct from the start.
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "-4% 0px -4% 0px" });

  $$(".rise").forEach((el) => obs.observe(el));
}

/* ---------------- clock ---------------- */
function initClock() {
  const el = $("#clock");
  if (!el) return;
  const tick = () => {
    const t = new Date().toLocaleTimeString("en-AU", {
      timeZone: "Australia/Melbourne", hour: "2-digit", minute: "2-digit", hour12: false,
    });
    el.textContent = `Open to work · ${t} MEL`;
  };
  tick();
  setInterval(tick, 30000);
}

/* ---------------- boot ---------------- */
renderFrames();
renderSkills();
pick(0);
initLoupe();
initMeter();
initReveal();
initClock();

$("#sheet").addEventListener("click", (e) => {
  const f = e.target.closest(".frame");
  if (f) pick(Number(f.dataset.i));
});
