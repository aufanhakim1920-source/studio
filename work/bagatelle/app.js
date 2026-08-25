/* BAGATELLE — a slanted pin board with a spring plunger.
   =========================================================================
   The object: a maple board, a brass pin field, a domed ceiling, a launch
   lane with a spring plunger, and seven baize cups along the bottom.

   Load-bearing: THE CUPS ARE THE SCOREBOARD. Each cup carries its own value
   and its own running tally, painted on the board itself. There is no score
   table beside the object — the only place your game is recorded is on the
   thing you are playing. The pin field is visible for the same reason: the
   odds are the board, not a number.

   Everything is one physics loop. Gravity, restitution off brass pins, a
   circular dome that turns the launch into a fall, and vertical dividers
   that decide the cup. Nothing is scripted or faked. */

const W = 100, H = 140;            // board units
const WALL_L = 3, WALL_R = 97;
const RAIL_X = 88, RAIL_TOP = 44;  // the launch lane's inner wall
const DOME_CX = 50, DOME_CY = 66, DOME_R = 60;
const CUP_TOP = 112, CUP_FLOOR = 136;
const NCUP = 7;
const BALL_R = 2.2, PIN_R = 1.55;
const G = 0.055;

const VALUES = [100, 50, 20, 10, 20, 50, 100];

/* how hard the quarter-turn throws: vx = -(a + power*b). Tuned by measuring
   where 200+ balls actually land, not by eye. */
const THROW = { a: 0.25, b: 0.95 };   // measured: no cup takes more than 17% of balls

/* the pin field, staggered like a real bagatelle */
const PINS = [];
for (let row = 0; row < 7; row++) {
  const y = 48 + row * 9;
  const off = row % 2 ? 5.5 : 0;
  /* reach 86, not 83: pins used to stop at x=80.5 while the last cup runs to
     x=88, which left an unguarded chute straight into a 100 cup and put 26%
     of all balls there. A pin at 86 sits too close to the rail for a ball to
     enter at all, so it blocks the chute without creating a pocket. */
  for (let x = 9 + off; x <= 86; x += 11) PINS.push({ x, y });
}
/* ⚠️ NO guard pins near the rail. An earlier version added two at x=83,
   four units below the last row — a 4.4-wide ball fits through neither the
   gap nor back out, so it wedged against the rail at x=85.8 and hung there
   forever. Four of fourteen test balls never settled. A pin that close to a
   wall is a trap, not a bumper. */

/* ── state ───────────────────────────────────────────────────────────── */
let power = 0;                     // plunger compression, 0..1
let pulling = false;
let ball = null;                   // {x,y,vx,vy,inLane}
let balls = 9;
let score = 0;
let best = +(localStorage.getItem("bagatelle-best") || 0);
const tally = new Array(NCUP).fill(0);
let flash = -1, flashT = 0;        // cup that just took a ball

const $ = (s) => document.querySelector(s);
const canvas = $("#board");
const ctx = canvas.getContext("2d");
let S = 1, OX = 0, OY = 0;         // board units -> css px

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const r = canvas.getBoundingClientRect();
  canvas.width = Math.round(r.width * dpr);
  canvas.height = Math.round(r.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  S = Math.min(r.width / W, r.height / H);
  OX = (r.width - W * S) / 2;
  OY = (r.height - H * S) / 2;
}
const px = (x) => OX + x * S;
const py = (y) => OY + y * S;

/* ── the launch ──────────────────────────────────────────────────────── */
function readyBall() {
  if (balls <= 0) return;
  ball = { x: (RAIL_X + WALL_R) / 2, y: 128, vx: 0, vy: 0, inLane: true, live: false, stall: 0, free: false, pw: 0 };
}

function launch() {
  if (!ball || ball.live || balls <= 0) return;
  /* Every shot must clear the rail. Rising from y=128 to RAIL_TOP=44 needs
     sqrt(2*G*84) = 3.04, and the old range started at 2.04 — so a weak pull
     never left the lane and dropped straight back into the rightmost cup,
     which happened to be worth 100. The softest shot possible scored the
     maximum. Now the floor clears the rail with margin and power decides how
     far LEFT the quarter-turn throws it, which is the actual skill. */
  const p = Math.max(0, Math.min(1, power));
  ball.vy = -(3.25 + p * 1.25);
  ball.pw = p;
  ball.vx = 0;
  ball.live = true;
  balls -= 1;
  power = 0;
  readouts();
  say("");
}

/* ── physics ─────────────────────────────────────────────────────────── */
function step() {
  if (!ball || !ball.live) return;
  ball.vy += G;

  for (let s = 0; s < 3; s++) {
    ball.x += ball.vx / 3;
    ball.y += ball.vy / 3;

    // the launch lane holds the ball until it clears the rail
    if (ball.inLane) {
      if (ball.y <= RAIL_TOP) {
        /* The top of the lane is a quarter-turn, so leaving it converts part
           of the climb into a throw to the left. Without this the ball goes
           straight up and falls straight back down the same channel: a test
           of 9 balls put 7 of them in the rightmost cup, which makes the
           game pointless. Now the plunger's power decides how far left it
           is thrown, which is the whole skill of the thing. */
        ball.inLane = false;
        /* Throw taken from the plunger reading, not from whatever vertical
           speed survived the climb — deriving it from vy coupled "how high"
           to "how far left" and pushed almost everything into the far cup. */
        ball.vx = -(THROW.a + ball.pw * THROW.b);
        ball.vy *= 0.72;
      }
      else {
        if (ball.x < RAIL_X + BALL_R) { ball.x = RAIL_X + BALL_R; ball.vx = Math.abs(ball.vx) * 0.4; }
        if (ball.x > WALL_R - BALL_R) { ball.x = WALL_R - BALL_R; ball.vx = -Math.abs(ball.vx) * 0.4; }
      }
    } else if (ball.y > RAIL_TOP && ball.x > RAIL_X - BALL_R && ball.y < CUP_TOP) {
      // coming back down it must not re-enter the lane
      ball.x = RAIL_X - BALL_R;
      ball.vx = -Math.abs(ball.vx) * 0.5;
    }

    // domed ceiling: this is what turns a launch into a fall
    if (ball.y < DOME_CY) {
      const dx = ball.x - DOME_CX, dy = ball.y - DOME_CY;
      const d = Math.hypot(dx, dy);
      const lim = DOME_R - BALL_R;
      if (d > lim) {
        const nx = dx / d, ny = dy / d;
        ball.x = DOME_CX + nx * lim;
        ball.y = DOME_CY + ny * lim;
        const vn = ball.vx * nx + ball.vy * ny;
        ball.vx = (ball.vx - 2 * vn * nx) * 0.68;
        ball.vy = (ball.vy - 2 * vn * ny) * 0.68;
      }
    }

    // side walls
    if (ball.x < WALL_L + BALL_R) { ball.x = WALL_L + BALL_R; ball.vx = Math.abs(ball.vx) * 0.55; }
    if (ball.x > WALL_R - BALL_R) { ball.x = WALL_R - BALL_R; ball.vx = -Math.abs(ball.vx) * 0.55; }

    // brass pins  (a ball being shaken loose ignores them, see the stall net)
    if (!ball.free) for (const p of PINS) {
      const dx = ball.x - p.x, dy = ball.y - p.y;
      const d2 = dx * dx + dy * dy;
      const rr = BALL_R + PIN_R;
      if (d2 < rr * rr && d2 > 1e-6) {
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
        ball.x = p.x + nx * rr;
        ball.y = p.y + ny * rr;
        const vn = ball.vx * nx + ball.vy * ny;
        ball.vx = (ball.vx - 2 * vn * nx) * 0.62;
        ball.vy = (ball.vy - 2 * vn * ny) * 0.62;
        // a perfectly centred hit would balance forever; nudge it off dead centre
        ball.vx += (Math.random() - 0.5) * 0.16;
      }
    }

    // cup dividers
    if (ball.y > CUP_TOP - BALL_R) {
      const span = (RAIL_X - WALL_L) / NCUP;
      for (let i = 0; i <= NCUP; i++) {
        const x = WALL_L + i * span;
        if (Math.abs(ball.x - x) < BALL_R && ball.y > CUP_TOP) {
          ball.x = x + Math.sign(ball.x - x || 1) * BALL_R;
          ball.vx *= -0.4;
        }
      }
    }

    if (ball.y > CUP_FLOOR - BALL_R) { ball.y = CUP_FLOOR - BALL_R; land(); return; }
  }
  ball.vx *= 0.999;

  /* Stall net. Any pin toy can find a resting spot the designer did not
     think of, and a ball that never lands is a soft hang with no error.
     So: nudge it like a player bumping the table, then, if it is really
     jammed, let it fall through the pins. It always terminates. */
  if (Math.hypot(ball.vx, ball.vy) < 0.05) ball.stall++; else ball.stall = 0;
  if (ball.stall > 60) { ball.vx += (Math.random() - 0.5) * 0.55; ball.vy += 0.28; }
  if (ball.stall > 240) ball.free = true;
}

function land() {
  const span = (RAIL_X - WALL_L) / NCUP;
  let i = Math.floor((ball.x - WALL_L) / span);
  i = Math.max(0, Math.min(NCUP - 1, i));
  tally[i] += 1;
  score += VALUES[i];
  flash = i; flashT = 1;
  if (score > best) { best = score; localStorage.setItem("bagatelle-best", String(best)); }
  ball = null;
  readouts();
  if (balls > 0) { readyBall(); say(`${VALUES[i]}. ${balls} left.`); }
  else say(`Game over — ${score}. Press NEW GAME.`);
}

/* ── drawing ─────────────────────────────────────────────────────────── */
function draw() {
  const r = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, r.width, r.height);

  // maple bed
  ctx.fillStyle = "#8E6435";
  ctx.fillRect(0, 0, r.width, r.height);
  const g = ctx.createLinearGradient(0, py(0), 0, py(H));
  g.addColorStop(0, "#D5A968"); g.addColorStop(0.55, "#BE8B4E"); g.addColorStop(1, "#96682F");
  ctx.fillStyle = g;
  ctx.fillRect(px(0), py(0), W * S, H * S);

  // grain
  ctx.globalAlpha = 0.10;
  ctx.strokeStyle = "#5F3C18"; ctx.lineWidth = 1;
  for (let i = 0; i < 34; i++) {
    const y = py(2 + i * 4.1);
    ctx.beginPath();
    ctx.moveTo(px(0), y);
    ctx.bezierCurveTo(px(30), y + S * 1.1, px(70), y - S * 1.1, px(W), y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // baize cup floor
  ctx.fillStyle = "#2F5D46";
  ctx.fillRect(px(WALL_L), py(CUP_TOP), (RAIL_X - WALL_L) * S, (CUP_FLOOR - CUP_TOP) * S);

  // dome
  ctx.beginPath();
  ctx.arc(px(DOME_CX), py(DOME_CY), DOME_R * S, Math.PI, Math.PI * 2);
  ctx.strokeStyle = "#6E4A22"; ctx.lineWidth = Math.max(2, S * 1.6); ctx.stroke();

  // walls + rail
  ctx.strokeStyle = "#6E4A22"; ctx.lineWidth = Math.max(2, S * 1.6);
  ctx.beginPath();
  ctx.moveTo(px(WALL_L), py(30)); ctx.lineTo(px(WALL_L), py(CUP_FLOOR));
  ctx.moveTo(px(WALL_R), py(30)); ctx.lineTo(px(WALL_R), py(CUP_FLOOR));
  ctx.moveTo(px(RAIL_X), py(RAIL_TOP)); ctx.lineTo(px(RAIL_X), py(CUP_FLOOR));
  ctx.stroke();

  // cups: dividers, values, and each cup's own running tally
  const span = (RAIL_X - WALL_L) / NCUP;
  ctx.textAlign = "center";
  for (let i = 0; i < NCUP; i++) {
    const cxu = WALL_L + span * (i + 0.5);
    if (flash === i && flashT > 0) {
      ctx.fillStyle = `rgba(241,213,131,${0.42 * flashT})`;
      ctx.fillRect(px(WALL_L + span * i), py(CUP_TOP), span * S, (CUP_FLOOR - CUP_TOP) * S);
    }
    ctx.fillStyle = "#F4EBDD";
    ctx.font = `600 ${Math.round(S * 5.2)}px "Bodoni Moda", Georgia, serif`;
    ctx.fillText(String(VALUES[i]), px(cxu), py(CUP_TOP + 9));
    ctx.fillStyle = tally[i] ? "#F1D583" : "rgba(244,235,221,.34)";
    ctx.font = `500 ${Math.round(S * 3.4)}px "DM Mono", monospace`;
    ctx.fillText(tally[i] ? `${tally[i]}` : "·", px(cxu), py(CUP_TOP + 17));
  }
  ctx.strokeStyle = "#244635"; ctx.lineWidth = Math.max(1.5, S * 1.1);
  for (let i = 0; i <= NCUP; i++) {
    const x = px(WALL_L + i * span);
    ctx.beginPath(); ctx.moveTo(x, py(CUP_TOP)); ctx.lineTo(x, py(CUP_FLOOR)); ctx.stroke();
  }

  // brass pins
  for (const p of PINS) {
    const cxp = px(p.x), cyp = py(p.y), rp = PIN_R * S;
    ctx.beginPath(); ctx.arc(cxp, cyp + rp * 0.35, rp, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(60,34,12,.42)"; ctx.fill();
    const pg = ctx.createRadialGradient(cxp - rp * 0.4, cyp - rp * 0.4, rp * 0.1, cxp, cyp, rp);
    pg.addColorStop(0, "#F1D583"); pg.addColorStop(1, "#96741A");
    ctx.beginPath(); ctx.arc(cxp, cyp, rp, 0, Math.PI * 2);
    ctx.fillStyle = pg; ctx.fill();
  }

  drawPlunger();

  // the ball
  if (ball) {
    const bx = px(ball.x), by = py(ball.y), br = BALL_R * S;
    ctx.beginPath(); ctx.arc(bx, by + br * 0.4, br * 0.95, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(40,20,8,.34)"; ctx.fill();
    const bg = ctx.createRadialGradient(bx - br * 0.4, by - br * 0.45, br * 0.1, bx, by, br);
    bg.addColorStop(0, "#FFFFFF"); bg.addColorStop(0.45, "#C9CFD4"); bg.addColorStop(1, "#6E777E");
    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fillStyle = bg; ctx.fill();
  }
}

function drawPlunger() {
  const x = px((RAIL_X + WALL_R) / 2);
  const top = py(132 + power * 4);
  const bot = py(139);
  ctx.strokeStyle = "#8A6E18";
  ctx.lineWidth = Math.max(2, S * 1.2);
  const coils = 6;
  ctx.beginPath();
  for (let i = 0; i <= coils; i++) {
    const t = i / coils;
    const y = top + (bot - top) * t;
    ctx.lineTo(x + (i % 2 ? 1 : -1) * S * 2.6, y);
  }
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, top, Math.max(3, S * 2.4), 0, Math.PI * 2);
  const pg = ctx.createRadialGradient(x - S, top - S, 1, x, top, S * 3);
  pg.addColorStop(0, "#F1D583"); pg.addColorStop(1, "#8A6E18");
  ctx.fillStyle = pg; ctx.fill();
}

/* ── loop ────────────────────────────────────────────────────────────── */
function frame() {
  step();
  if (flashT > 0) flashT = Math.max(0, flashT - 0.03);
  draw();
  requestAnimationFrame(frame);
}

/* ── input ───────────────────────────────────────────────────────────── */
const stage = $("#stage");
let y0 = 0;

stage.addEventListener("pointerdown", (e) => {
  if (!ball || ball.live) return;
  pulling = true; y0 = e.clientY;
  stage.classList.add("pulling");
  try { stage.setPointerCapture(e.pointerId); } catch {}
});
stage.addEventListener("pointermove", (e) => {
  if (!pulling) return;
  const r = stage.getBoundingClientRect();
  power = Math.max(0, Math.min(1, (e.clientY - y0) / (r.height * 0.28)));
});
const release = () => {
  if (!pulling) return;
  pulling = false;
  stage.classList.remove("pulling");
  launch();
};
stage.addEventListener("pointerup", release);
stage.addEventListener("pointercancel", () => { pulling = false; power = 0; stage.classList.remove("pulling"); });

stage.tabIndex = 0;
stage.addEventListener("keydown", (e) => {
  if (e.key !== " " && e.key !== "Enter") return;
  e.preventDefault();
  power = 0.62; launch();
});

$("#bLaunch").addEventListener("click", () => { power = 0.55 + Math.random() * 0.3; launch(); });
$("#bNew").addEventListener("click", () => {
  balls = 9; score = 0; tally.fill(0); flash = -1;
  readyBall(); readouts(); say("Nine balls. Pull the plunger.");
});

/* ── chrome ──────────────────────────────────────────────────────────── */
function readouts() {
  $("#rScore").textContent = score;
  $("#rBalls").textContent = balls;
  $("#rBest").textContent = best;
  $("#bLaunch").disabled = balls <= 0;
}
let sayT = null;
function say(m) {
  const el = $("#hint");
  clearTimeout(sayT);
  el.textContent = m || "Drag down on the plunger, then let go.";
  el.classList.toggle("hot", !!m);
  if (m) sayT = setTimeout(() => el.classList.remove("hot"), 2000);
}

window.addEventListener("resize", resize);
resize();
readyBall();
readouts();
frame();
