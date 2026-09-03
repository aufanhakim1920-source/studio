/* DRAW WEIGHT — a game of curling
 * ---------------------------------------------------------------------------
 * ⭐ THE VERB IS BEND → AIM → FLING. Codrops' catapult demo named an interaction
 * shape I did not have: every object I had built responded CONTINUOUSLY to the
 * cursor (lean, resolve, still, heat, remember, ripple, ring). This one CHARGES
 * and RELEASES — you pull back, you let go, and then it is out of your hands
 * except for one thing you can still do while it runs.
 *
 * ⚠️ FORM, not just verb. Six builds in a row were the same shaped landing page.
 * This is a game screen: fixed HUD, a playfield that owns the viewport, a rail.
 * Nothing scrolls, there is no hero and no FAQ.
 *
 * Physics is honest and hand-written: velocity, friction, elastic collisions
 * between equal circles, and a lateral drift that makes a curling stone curl.
 */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ⚠️ ONE UNIT FOR EVERYTHING. The first version measured x as a fraction of the
   sheet's WIDTH and y as a fraction of its HEIGHT. Those are different physical
   distances (the sheet is 0.46 as wide as it is long), so Math.hypot mixed them:
   collisions came out elliptical and every travel distance was wrong by 2.17x.
   Now x AND y are both measured in sheet-widths, and the sheet is SH long. */
const RATIO = 0.46;            /* width : length                              */
const SH = 1 / RATIO;          /* sheet length, in width-units (~2.17)        */

const R = 0.055;               /* game-legible, not scale-accurate (real ~0.03) */
/* ⚠️ 0.988 meant ~380 frames, about SIX SECONDS per stone. Physically fine and
   unplayable — you sit and watch. 0.978 halves it to ~2.5s, which is the pace a
   game wants. Every speed constant below is recalibrated to match. */
const FRICTION = 0.978;
const SWEEP = 0.9875;          /* less drag while swept -> it runs further     */
const CURL = 0.00012;          /* lateral drift, strongest when slow           */
const STOP = 0.0013;           /* below this a stone is at rest                */
const HOUSE = { x: 0.5, y: 0.40, r: 0.30 };
const HOG = SH * 0.72;
const TEE = { x: 0.5, y: SH - 0.16 };   /* where you deliver from              */
const PER_END = 4;
const ENDS = 3;

const state = {
  stones: [],        /* {x,y,vx,vy,team,live}  team 0 = you, 1 = them */
  thrown: 0,
  end: 1,
  score: [0, 0],
  phase: "aim",      /* aim | charge | run | between | over */
  aim: null,         /* {x,y} while charging */
  sweeping: false,
};

/* ── geometry ─────────────────────────────────────────────────────────────
   The sheet is drawn in NORMALISED units (0..1 across, 0..1 down) and mapped
   into whatever box the canvas has. Keeping the simulation unitless means the
   physics does not change when the window does — which is the bug you get for
   free if you simulate in pixels. */
let W = 0, H = 0, BX = 0, BY = 0, BW = 0, BH = 0, DPR = 1;

function layout(cv) {
  const r = cv.getBoundingClientRect();
  DPR = Math.min(devicePixelRatio || 1, 2);
  W = r.width; H = r.height;
  cv.width = Math.round(W * DPR);
  cv.height = Math.round(H * DPR);
  /* the sheet is a tall rectangle, centred, as wide as it can be */
  const ratio = RATIO;
  BH = H * 0.96;
  BW = BH * ratio;
  if (BW > W * 0.92) { BW = W * 0.92; BH = BW / ratio; }
  BX = (W - BW) / 2;
  BY = (H - BH) / 2;
}
const px = (x) => BX + x * BW;
const py = (y) => BY + (y / SH) * BH;
const toSheet = (cx, cy) => [(cx - BX) / BW, ((cy - BY) / BH) * SH];

/* ── setup ────────────────────────────────────────────────────────────────── */
function newEnd(keepScore) {
  state.stones = [];
  state.thrown = 0;
  state.phase = "aim";
  state.aim = null;
  if (!keepScore) { state.score = [0, 0]; state.end = 1; }
  paintRack();
  coach("Drag toward the house", "The longer the drag, the harder the throw.");
}

function nextTeam() { return state.thrown % 2; }

/* ── physics ──────────────────────────────────────────────────────────────── */
function step() {
  let moving = false;

  for (const s of state.stones) {
    if (!s.live) continue;
    const sp = Math.hypot(s.vx, s.vy);
    if (sp < STOP) { s.vx = 0; s.vy = 0; continue; }
    moving = true;

    s.x += s.vx;
    s.y += s.vy;

    /* ⭐ the curl: a slow lateral drift, stronger as the stone slows, which is
       exactly why a real stone bends most at the end of its travel */
    s.x += CURL * s.spin * (1 - Math.min(sp / 0.02, 1));

    const f = state.sweeping && s.team === 0 ? SWEEP : FRICTION;
    s.vx *= f; s.vy *= f;

    /* the side boards: a stone that touches them is dead */
    if (s.x < R || s.x > 1 - R) { s.live = false; }
    /* past the back line, or back out of the near end */
    if (s.y < -R * 2 || s.y > SH + 0.05) { s.live = false; }
  }

  /* elastic collisions between equal circles — resolve overlap, swap the
     components of velocity along the line of centres */
  for (let i = 0; i < state.stones.length; i++) {
    for (let j = i + 1; j < state.stones.length; j++) {
      const a = state.stones[i], b = state.stones[j];
      if (!a.live || !b.live) continue;
      let dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d === 0 || d >= R * 2) continue;

      const nx = dx / d, ny = dy / d;
      const overlap = R * 2 - d;
      a.x -= nx * overlap / 2; a.y -= ny * overlap / 2;
      b.x += nx * overlap / 2; b.y += ny * overlap / 2;

      const av = a.vx * nx + a.vy * ny;
      const bv = b.vx * nx + b.vy * ny;
      const diff = av - bv;
      a.vx -= diff * nx; a.vy -= diff * ny;
      b.vx += diff * nx; b.vy += diff * ny;
      moving = true;
    }
  }
  return moving;
}

/* ── scoring ──────────────────────────────────────────────────────────────
   Curling's real rule, and it is a good one: only ONE team scores in an end.
   Count that team's stones nearer the button than the other team's nearest. */
function scoreEnd() {
  const inHouse = state.stones
    .filter((s) => s.live)
    .map((s) => ({ team: s.team, d: Math.hypot(s.x - HOUSE.x, s.y - HOUSE.y) }))
    .filter((s) => s.d < HOUSE.r + R)
    .sort((a, b) => a.d - b.d);

  if (!inHouse.length) return { team: -1, points: 0 };
  const team = inHouse[0].team;
  let points = 0;
  for (const s of inHouse) { if (s.team === team) points++; else break; }
  return { team, points };
}

/* ── drawing ──────────────────────────────────────────────────────────────── */
function draw(ctx, t) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, W, H);

  /* the sheet */
  ctx.fillStyle = "#F4F9FB";
  ctx.fillRect(px(0), py(0), BW, BH);
  ctx.strokeStyle = "#C3D3DC"; ctx.lineWidth = 1.5;
  ctx.strokeRect(px(0), py(0), BW, BH);

  /* the house: four rings, drawn largest first */
  const rings = [[HOUSE.r, "#C8433A"], [HOUSE.r * 0.72, "#F4F9FB"], [HOUSE.r * 0.44, "#1E3A5F"], [HOUSE.r * 0.14, "#F4F9FB"]];
  for (const [rr, col] of rings) {
    ctx.beginPath();
    ctx.ellipse(px(HOUSE.x), py(HOUSE.y), rr * BW, rr * BW, 0, 0, 7);
    ctx.fillStyle = col; ctx.fill();
    ctx.strokeStyle = "rgba(22,35,43,.16)"; ctx.lineWidth = 1; ctx.stroke();
  }

  /* centre line, tee line, hog line */
  ctx.strokeStyle = "rgba(22,35,43,.20)"; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px(0.5), py(0)); ctx.lineTo(px(0.5), py(SH));
  ctx.moveTo(px(0), py(HOUSE.y)); ctx.lineTo(px(1), py(HOUSE.y));
  ctx.stroke();
  ctx.setLineDash([6, 6]);
  ctx.beginPath(); ctx.moveTo(px(0), py(HOG)); ctx.lineTo(px(1), py(HOG)); ctx.stroke();
  ctx.setLineDash([]);

  /* stones */
  for (const s of state.stones) {
    if (!s.live) continue;
    const x = px(s.x), y = py(s.y), r = R * BW;
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.16, r, r * 0.94, 0, 0, 7);
    ctx.fillStyle = "rgba(22,35,43,.16)"; ctx.fill();          /* its shadow  */
    ctx.beginPath(); ctx.ellipse(x, y, r, r, 0, 0, 7);
    ctx.fillStyle = "#3A4750"; ctx.fill();                     /* the granite */
    ctx.beginPath(); ctx.ellipse(x, y, r * 0.62, r * 0.62, 0, 0, 7);
    ctx.fillStyle = s.team === 0 ? "#C8433A" : "#2E3B45"; ctx.fill();   /* handle */
    ctx.beginPath(); ctx.ellipse(x - r * 0.2, y - r * 0.24, r * 0.22, r * 0.16, -0.5, 0, 7);
    ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fill();       /* one highlight */
  }

  /* the aiming line, while charging */
  if (state.phase === "charge" && state.aim) {
    /* ⚠️ Originally a slingshot: pull BACK, fly forward. But the stone is
       delivered from the very bottom of the sheet, so there is no room behind it
       to pull into — every throw came out backwards. Curling is a push anyway:
       drag TOWARD the house, and the length of the drag is the weight. */
    const from = TEE;
    const dx = state.aim.x - from.x, dy = state.aim.y - from.y;
    const power = Math.min(Math.hypot(dx, dy) / 1.30, 1);

    ctx.strokeStyle = "rgba(200,67,58,.85)";
    ctx.lineWidth = 2 + power * 3;
    ctx.setLineDash([7, 6]);
    ctx.beginPath();
    ctx.moveTo(px(from.x), py(from.y));
    ctx.lineTo(px(from.x + dx * 1.35), py(from.y + dy * 1.35));
    ctx.stroke();
    ctx.setLineDash([]);

    /* the power bar sits ON the stone, so your eye never leaves the sheet */
    const bw = R * BW * 2.6, bh = 6;
    ctx.fillStyle = "rgba(22,35,43,.14)";
    ctx.fillRect(px(from.x) - bw / 2, py(from.y) + R * BW + 12, bw, bh);
    ctx.fillStyle = power > 0.86 ? "#E0A526" : "#C8433A";
    ctx.fillRect(px(from.x) - bw / 2, py(from.y) + R * BW + 12, bw * power, bh);

    /* the stone in hand */
    const r = R * BW;
    ctx.beginPath(); ctx.ellipse(px(from.x), py(from.y), r, r, 0, 0, 7);
    ctx.fillStyle = "#3A4750"; ctx.fill();
    ctx.beginPath(); ctx.ellipse(px(from.x), py(from.y), r * 0.62, r * 0.62, 0, 0, 7);
    ctx.fillStyle = nextTeam() === 0 ? "#C8433A" : "#2E3B45"; ctx.fill();
  } else if (state.phase === "aim") {
    const r = R * BW;
    const pulse = REDUCED ? 1 : 1 + Math.sin(t * 3) * 0.04;
    ctx.beginPath(); ctx.ellipse(px(TEE.x), py(TEE.y), r * pulse, r * pulse, 0, 0, 7);
    ctx.fillStyle = "#3A4750"; ctx.fill();
    ctx.beginPath(); ctx.ellipse(px(TEE.x), py(TEE.y), r * 0.62, r * 0.62, 0, 0, 7);
    ctx.fillStyle = nextTeam() === 0 ? "#C8433A" : "#2E3B45"; ctx.fill();
  }

  /* the sweeping state is shown on the ice, not in a badge */
  if (state.sweeping && state.phase === "run") {
    ctx.strokeStyle = "rgba(224,165,38,.9)"; ctx.lineWidth = 3;
    ctx.strokeRect(px(0) + 3, py(0) + 3, BW - 6, BH - 6);
  }
}

/* ── UI ───────────────────────────────────────────────────────────────────── */
function coach(title, sub) {
  const el = $("#coach");
  el.hidden = false;
  el.innerHTML = `<b>${title}</b><span>${sub}</span>`;
  el.classList.add("pop");
  setTimeout(() => el.classList.remove("pop"), 240);
}

function paintScore() {
  $("#score").innerHTML = [0, 1].map((t) => {
    const lead = state.score[t] > state.score[1 - t];
    return `<span class="side${lead ? " lead" : ""}">
      <i style="background:${t === 0 ? "#C8433A" : "#2E3B45"}"></i>
      <b>${state.score[t]}</b><span>${t === 0 ? "you" : "them"}</span></span>`;
  }).join("");
  $("#end").textContent = state.end;
}

function paintRack() {
  const left = PER_END * 2 - state.thrown;
  $("#rack").innerHTML = Array.from({ length: PER_END * 2 }, (_, i) => {
    const team = i % 2 === 0 ? "a" : "b";
    const used = i < state.thrown;
    const next = i === state.thrown;
    return `<span class="pip ${team}${used ? " used" : ""}${next ? " next" : ""}"></span>`;
  }).join("");
  return left;
}

/* ── the game ─────────────────────────────────────────────────────────────── */
function init() {
  const cv = $("#cv");
  const ctx = cv.getContext("2d");
  layout(cv);
  addEventListener("resize", () => layout(cv), { passive: true });

  newEnd(false);
  paintScore();

  const at = (e) => toSheet(e.clientX - cv.getBoundingClientRect().left,
                            e.clientY - cv.getBoundingClientRect().top);

  cv.addEventListener("pointerdown", (e) => {
    if (state.phase !== "aim") return;
    cv.setPointerCapture(e.pointerId);
    state.phase = "charge";
    state.aim = { x: TEE.x, y: TEE.y };
    const [x, y] = at(e); state.aim = { x, y };
    $("#coach").hidden = true;
  });

  cv.addEventListener("pointermove", (e) => {
    if (state.phase !== "charge") return;
    const [x, y] = at(e);
    state.aim = { x, y };
  });

  cv.addEventListener("pointerup", () => {
    if (state.phase !== "charge" || !state.aim) return;
    const from = TEE;
    const dx = state.aim.x - from.x, dy = state.aim.y - from.y;
    const power = Math.min(Math.hypot(dx, dy) / 1.30, 1);
    if (power < 0.06) { state.phase = "aim"; state.aim = null; return; }

    const len = Math.hypot(dx, dy) || 1;
    /* ⚠️ Tuned from the physics, not by feel. A stone travels v0/(1-friction)
       before stopping; at friction 0.988 that is v0/0.012. The stone starts at
       y=0.94 and the button is at 0.16, so a DRAW is 0.78 units. The first
       version peaked at 1.16 units and every stone sailed off the back. */
    /* travel = v0 / (1 - friction). The button is 1.63 units from the tee, so
       the band has to straddle that: 1.10 at a soft draw, 1.95 flat out. */
    const speed = 0.0242 + power * 0.0187;   /* travel 1.10 .. 1.95 units */
    /* ⚠️ full power must stop just PAST the house, never off the back. At 0.98
       units every hard throw died on the back line and the sheet stayed empty. */
    state.stones.push({
      x: from.x, y: from.y,
      vx: (dx / len) * speed, vy: (dy / len) * speed,
      team: nextTeam(),
      spin: (state.aim.x < from.x ? -1 : 1),   /* it keeps bending the way you aimed */
      live: true,
    });
    state.thrown++;
    state.phase = "run";
    state.aim = null;
    paintRack();
    coach("Sweep it", "Hold space while it slides");
  });

  /* sweeping — the one thing still in your hands after release */
  addEventListener("keydown", (e) => {
    if (e.code === "Space") { e.preventDefault(); state.sweeping = true; }
  });
  addEventListener("keyup", (e) => {
    if (e.code === "Space") state.sweeping = false;
  });
  /* and on touch, holding anywhere sweeps */
  cv.addEventListener("pointerdown", () => { if (state.phase === "run") state.sweeping = true; });
  addEventListener("pointerup", () => { state.sweeping = false; });

  $("#again").addEventListener("click", () => {
    newEnd(false); paintScore();
  });

  let last = 0;
  function frame(now) {
    const t = now / 1000;

    if (state.phase === "run") {
      const moving = step();
      if (!moving) {
        state.sweeping = false;
        if (state.thrown >= PER_END * 2) {
          const { team, points } = scoreEnd();
          if (points > 0) state.score[team] += points;
          paintScore();
          state.phase = "between";
          coach(
            points ? `${team === 0 ? "You" : "They"} score ${points}` : "Blank end",
            state.end >= ENDS ? "Tap for the final score" : "Tap the sheet for the next end"
          );
        } else {
          state.phase = "aim";
          coach("Drag toward the house", `${PER_END * 2 - state.thrown} stone${PER_END * 2 - state.thrown === 1 ? "" : "s"} left`);
        }
      }
    }

    draw(ctx, t);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* advancing between ends */
  cv.addEventListener("click", () => {
    if (state.phase !== "between") return;
    if (state.end >= ENDS) {
      const w = state.score[0] === state.score[1] ? "Tied" : state.score[0] > state.score[1] ? "You win" : "They win";
      coach(`${w} — ${state.score[0]} to ${state.score[1]}`, "Press New game to play again");
      state.phase = "over";
      return;
    }
    state.end++;
    newEnd(true);
    paintScore();
  });
}

init();
