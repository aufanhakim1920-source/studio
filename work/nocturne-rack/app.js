/* ─────────────────────────────────────────────────────────────
   NOCTURNE — the rack is a readout, not a title card.

   Template 13's own note: "Re-flap on data change, not on a timer. If the
   board shows real content, flap only the tiles whose character actually
   changed." That is the whole build. Selecting a fare is the data change.

   Two upgrades from that note's cost/benefit list are taken:
     #1 ordered walk (step through the alphabet, don't scramble randomly)
     #3 a settle on landing
   Ordered walk also imports the odometer's insight from template 12: every
   tile runs the same step rate but a different distance, so landing order
   is emergent rather than authored.
   ───────────────────────────────────────────────────────────── */

const ALPHABET = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$:.";
const N = ALPHABET.length;
const SLOTS = 9;

const STEP_MS   = 45;   // one flap
const HOLD_MS   = 30;   // squash hold — shorter than the 50ms transition
const SETTLE_MS = 70;
const COL_MS    = 50;   // left-to-right lead
const ROW_MS    = 120;  // rows overlap, they do not queue

const FARES = {
  seat:  { name: 'SEAT',  bed: 'RECLINER', price: '$79',  board: '21:10' },
  berth: { name: 'BERTH', bed: 'BUNK',     price: '$189', board: '21:00' },
  cabin: { name: 'CABIN', bed: 'DOUBLE',   price: '$349', board: '20:45' },
};

const ROWS = [
  { key: 'name',  label: 'Fare' },
  { key: 'bed',   label: 'Bed' },
  { key: 'price', label: 'Price' },
  { key: 'board', label: 'Boarding' },
];

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const boardEl   = document.getElementById('board');
const readoutEl = document.getElementById('readout');
const clockEl   = document.getElementById('clock');
const sheets    = Array.from(document.querySelectorAll('.sheet'));

let current = 'berth';

/* ── build the rack ───────────────────────────────────────────── */
const rows = ROWS.map((def) => {
  const row = document.createElement('div');
  row.className = 'row';
  row.dataset.field = def.key;

  const label = document.createElement('span');
  label.className = 'row-label';
  label.textContent = def.label;
  row.appendChild(label);

  const strip = document.createElement('div');
  strip.className = 'tiles';
  strip.setAttribute('aria-hidden', 'true');   // gibberish to a screen reader
  row.appendChild(strip);

  const tiles = [];
  for (let c = 0; c < SLOTS; c++) {
    const el = document.createElement('span');
    el.className = 'tile is-blank';
    const g = document.createElement('span');
    g.className = 'g';
    el.appendChild(g);
    strip.appendChild(el);
    tiles.push({ el, g, index: 0, timer: null, holdA: null, holdB: null });
  }

  boardEl.appendChild(row);
  return { ...def, tiles };
});

/* ── one tile ─────────────────────────────────────────────────── */
const idx = (ch) => Math.max(0, ALPHABET.indexOf(ch));

function paint(t) {
  const ch = ALPHABET[t.index];
  t.g.textContent = ch === ' ' ? '' : ch;
  t.el.classList.toggle('is-blank', ch === ' ');
}

function stop(t) {
  if (t.timer) { clearInterval(t.timer); t.timer = null; }
  clearTimeout(t.holdA); clearTimeout(t.holdB);
  t.el.classList.remove('flipping', 'settle');
}

function set(t, ch) { stop(t); t.index = idx(ch); paint(t); }

function click(t) {
  t.el.classList.add('flipping');
  t.holdA = setTimeout(() => t.el.classList.remove('flipping'), HOLD_MS);
}

function settle(t) {
  t.el.classList.add('settle');
  t.holdB = setTimeout(() => t.el.classList.remove('settle'), SETTLE_MS);
}

/* Returns true if this tile actually has somewhere to go. A tile whose
   character is unchanged is never touched — that is what makes the motion
   information rather than decoration. */
function flapTo(t, ch, delay) {
  const target = idx(ch);
  if (t.index === target) return false;
  stop(t);
  t.holdA = setTimeout(() => {
    t.timer = setInterval(() => {
      t.index = (t.index + 1) % N;      // ordered walk, never random
      paint(t);
      click(t);
      if (t.index === target) { clearInterval(t.timer); t.timer = null; settle(t); }
    }, STEP_MS);
  }, delay);
  return true;
}

/* ── render a fare onto the rack ──────────────────────────────── */
const pad = (s) => String(s).toUpperCase().slice(0, SLOTS).padEnd(SLOTS, ' ');

function render(key, animate) {
  const fare = FARES[key];
  const moved = [];

  rows.forEach((row, r) => {
    const str = pad(fare[row.key]);
    row.tiles.forEach((t, c) => {
      const ch = str[c];
      if (animate && !reduced) {
        if (flapTo(t, ch, c * COL_MS + r * ROW_MS)) moved.push(row.key + ':' + c);
      } else {
        if (ALPHABET[t.index] !== ch) moved.push(row.key + ':' + c);
        set(t, ch);
      }
    });
  });

  readoutEl.textContent =
    `${fare.name}. ${fare.bed}. ${fare.price}. Boarding ${fare.board}.`;

  // verification hook — how many flaps this data change actually cost
  window.__nocturne = { fare: key, moved, movedCount: moved.length };
  return moved;
}

function blankRack() {
  rows.forEach((row) => row.tiles.forEach((t) => set(t, ' ')));
}

/* ── selection ────────────────────────────────────────────────── */
function select(key) {
  current = key;
  sheets.forEach((s) => {
    const on = s.dataset.fare === key;
    s.setAttribute('aria-pressed', String(on));
    const cta = s.querySelector('.sheet-cta');
    cta.innerHTML = on ? cta.dataset.live : cta.dataset.idle;
  });
  render(key, true);
}

sheets.forEach((s) => s.addEventListener('click', () => select(s.dataset.fare)));

/* ── re-flap: clear the rack and let it resolve again ─────────── */
function reflap() { blankRack(); render(current, true); }

document.getElementById('reflap').addEventListener('click', reflap);
document.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') {
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag !== 'INPUT' && tag !== 'TEXTAREA') reflap();
  }
});

/* ── first resolve: one shot, when the rack is actually on screen ── */
const io = new IntersectionObserver((entries, obs) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    obs.unobserve(entry.target);
    render(current, true);
  });
}, { threshold: 0.2 });
io.observe(document.querySelector('.rack'));

/* ── station clock: data, not decoration ──────────────────────── */
function tick() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  clockEl.textContent = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
tick();
setInterval(tick, 1000);

/* test affordance only — lets a headless run drive the same path a click does */
window.__selectFare = select;
