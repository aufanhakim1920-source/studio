/* ============================================================
   MISREG — the drum swap.
   One drum in the machine at a time. Each drum you seat runs a
   pass: its ink lays over what is already on the paper, off
   register, multiplying into a third colour where they overlap.
   The stack of passes IS the price and the turnaround.
   Nothing on this page moves unless you move it.
   ============================================================ */

const INKS = [
  { id:'pink',   short:'PINK',   name:'FLUORESCENT PINK',   code:'S-471', hex:'#FF48B0', op:'92% OPAQUE',
    note:'Overprints yellow into a real orange.' },
  { id:'orange', short:'ORANGE', name:'FLUORESCENT ORANGE', code:'S-476', hex:'#FF6C2F', op:'90% OPAQUE',
    note:'Loudest drum here. Never under fine type.' },
  { id:'yellow', short:'YELLOW', name:'YELLOW',             code:'S-372', hex:'#FFE800', op:'86% OPAQUE',
    note:'Nearly invisible alone. Lay it down first.' },
  { id:'blue',   short:'BLUE',   name:'MEDIUM BLUE',        code:'S-231', hex:'#0078BF', op:'95% OPAQUE',
    note:'The workhorse. Holds a 0.4pt line.' },
  { id:'green',  short:'GREEN',  name:'GREEN',              code:'S-355', hex:'#00A95C', op:'93% OPAQUE',
    note:'Sulks on cream stock. Sings under black.' },
  { id:'purple', short:'PURPLE', name:'PURPLE',             code:'S-291', hex:'#765BA7', op:'94% OPAQUE',
    note:'Two passes of it reads almost black.' },
];

/* which parts of the artwork each pass carries.
   pass 1 prints the whole image — that is what a one-colour riso is. */
const SEP = [
  ['half','bands','disc','panel','slab'],
  ['disc','half','stars'],
  ['bands','panel','stars'],
  ['half','slab','disc'],
];
/* misregistration: nobody lines a Riso up perfectly and nobody wants them to */
const OFF = [[0,0,0],[2.5,-3,0.4],[-3,2.5,-0.35],[3.5,3,0.5]];
/* halftone screen angle per pass — the real reason four inks don't moire */
const ANG = [45, 15, 75, 60];
const MAX_PASSES = 4;

const HINT = {
  empty:   'Load a drum.',
  start:   'Pull the drum out.',
  ejected: 'Now load another.',
  over:    'Overprint makes the third colour.',
  full:    'Sheet is full. New sheet?',
};

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const cradlesEl = $('#cradles');
const layersEl  = $('#layers');
const sheetEl   = $('#sheet');
const barEl     = $('#bar');
const bayEl     = $('#bay');
const railsEl   = $('#rails');
const lampEl    = $('#lamp');
const hintEl    = $('#hint');
const machineEl = $('.machine');
const freshEl   = $('#fresh');
const ticketEl  = $('#ticket');
const artTpl    = $('#art');

let passes = [];          // ink ids, in the order they were run
let uid = 0;

/* the date is read ONCE, on load. A ticking clock is autonomous motion. */
const TODAY = new Date();

/* ---------------------------------------------------------- build shelf */
INKS.forEach((ink) => {
  const cradle = document.createElement('div');
  cradle.className = 'cradle';
  cradle.dataset.ink = ink.id;
  cradle.style.setProperty('--ink-c', ink.hex);
  cradle.innerHTML =
    `<div class="cradle__slot"></div><span class="cradle__name">${ink.short}</span>`;

  const drum = document.createElement('button');
  drum.type = 'button';
  drum.className = 'drum';
  drum.dataset.ink = ink.id;
  drum.style.setProperty('--ink-c', ink.hex);
  drum.setAttribute('aria-label', `${ink.name} drum`);
  drum.innerHTML = `
    <span class="drum__body">
      <span class="drum__barrel"></span>
      <span class="drum__cap"></span>
      <span class="drum__handle"></span>
      <span class="drum__wrap">
        <span class="drum__plate plate-name">${ink.code}</span>
        <span class="drum__plate plate-spec">
          <b>${ink.name}</b><i>${ink.code} &middot; ${ink.op}</i><em>${ink.note}</em>
        </span>
      </span>
    </span>`;
  drum.addEventListener('click', () => onDrum(drum));

  $('.cradle__slot', cradle).appendChild(drum);
  cradlesEl.appendChild(cradle);
});

/* ---------------------------------------------------------- the artwork */
function inkOf(el){ return INKS.find((i) => i.id === el.dataset.ink); }
function cradleOf(ink){ return $(`.cradle[data-ink="${ink.id}"] .cradle__slot`); }

function addLayer(ink, index, animate){
  const u = 'U' + (++uid);
  const wrap = document.createElement('div');
  wrap.className = 'layer';
  wrap.dataset.ink = ink.id;
  wrap.innerHTML = artTpl.innerHTML
    .replaceAll('UID', u)
    .replace('ANGLE', String(ANG[Math.min(index, ANG.length - 1)]));

  const keep = SEP[Math.min(index, SEP.length - 1)];
  $$('g[data-g]', wrap).forEach((g) => { if (!keep.includes(g.dataset.g)) g.remove(); });

  const [dx, dy, rot] = OFF[Math.min(index, OFF.length - 1)];
  wrap.style.setProperty('--ink-c', ink.hex);
  wrap.style.setProperty('--dx', dx + 'px');
  wrap.style.setProperty('--dy', dy + 'px');
  wrap.style.setProperty('--rot', rot + 'deg');

  if (animate) wrap.classList.add('is-printing');
  layersEl.appendChild(wrap);
  if (animate) {
    // double rAF starts the wipe. rAF is throttled to zero in a background tab,
    // so a timeout has to guarantee the class comes off — otherwise the layer
    // stays clipped to nothing and the ink silently never prints.
    const reveal = () => wrap.classList.remove('is-printing');
    requestAnimationFrame(() => requestAnimationFrame(reveal));
    setTimeout(reveal, 220);
  }
  return wrap;
}

/* ---------------------------------------------------------- FLIP */
function flip(el, target){
  const a = el.getBoundingClientRect();
  target.appendChild(el);
  const b = el.getBoundingClientRect();
  const dx = a.left - b.left, dy = a.top - b.top;
  if (!dx && !dy) return;
  el.style.transition = 'none';
  el.style.transform = `translate(${dx}px, ${dy}px)`;
  void el.offsetWidth;             // flush
  el.style.transition = '';
  el.style.transform = '';
}

/* ---------------------------------------------------------- responses */
function pulse(el, cls, ms){
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}

function runPass(){
  pulse(machineEl, 'is-knock', 300);
  pulse(sheetEl, 'is-nudge', 320);
  pulse(barEl, 'is-run', 700);
  pulse(bayEl, 'is-hot', 700);
  lampEl.classList.add('is-lit');
  setTimeout(() => lampEl.classList.remove('is-lit'), 780);
}

/* ---------------------------------------------------------- actions */
function goHome(drum){
  drum.classList.remove('is-out');
  flip(drum, cradleOf(inkOf(drum)));
}

function eject(drum){
  flip(drum, railsEl);
  drum.classList.add('is-out');
  railsEl.classList.add('is-live');
  paint();
}

function seat(drum){
  if (passes.length >= MAX_PASSES){
    pulse(freshEl, 'is-urge', 1400);
    pulse(sheetEl, 'is-nudge', 320);
    paint();
    return;
  }
  const held = $('.drum', bayEl);
  if (held) goHome(held);
  const out = $('.drum', railsEl);
  if (out && out !== drum) goHome(out);

  drum.classList.remove('is-out');
  flip(drum, bayEl);
  railsEl.classList.toggle('is-live', !!$('.drum', railsEl));

  const ink = inkOf(drum);
  passes.push(ink.id);
  addLayer(ink, passes.length - 1, true);
  runPass();
  paint();
}

function onDrum(drum){
  const where = drum.parentElement;
  if (where === bayEl)        eject(drum);
  else if (where === railsEl) { goHome(drum); railsEl.classList.remove('is-live'); paint(); }
  else                        seat(drum);
}

function freshSheet(){
  layersEl.replaceChildren();
  passes = [];
  $$('.drum').forEach((d) => { if (d.parentElement !== cradleOf(inkOf(d))) goHome(d); });
  railsEl.classList.remove('is-live');
  pulse(sheetEl, 'is-swap', 560);
  pulse(bayEl, 'is-hot', 400);
  paint();
}

/* ---------------------------------------------------------- readouts */
function price(n){ return n === 0 ? '—' : '$' + (1.30 + n * 1.10).toFixed(2); }

function readyDay(n){
  if (n === 0) return '—';
  const d = new Date(TODAY.getTime());
  d.setDate(d.getDate() + [0, 3, 5, 8, 11][n]);
  return new Intl.DateTimeFormat('en-AU', { weekday: 'short' }).format(d).toUpperCase();
}

function paint(){
  const n = passes.length;
  $('#tPass').textContent  = String(n);
  $('#tPrice').textContent = price(n);
  $('#tReady').textContent = readyDay(n);

  const seated = $('.drum', bayEl);
  const out    = $('.drum', railsEl);
  $$('.cradle').forEach((c) => {
    const slot = $('.cradle__slot', c);
    c.classList.toggle('is-empty', !$('.drum', slot));
    c.classList.toggle('is-loaded', !!seated && seated.dataset.ink === c.dataset.ink);
  });

  bayEl.classList.toggle('is-open', !seated && n < MAX_PASSES);
  lampEl.classList.toggle('is-full', n >= MAX_PASSES);
  freshEl.classList.toggle('is-urge', n >= MAX_PASSES);

  hintEl.textContent =
    n === 0            ? HINT.empty :
    n >= MAX_PASSES    ? HINT.full  :
    out                ? HINT.ejected :
    n >= 2             ? HINT.over  :
                         HINT.start;
}

/* ---------------------------------------------------------- ticket */
$('#ticketTab').addEventListener('click', () => {
  const open = ticketEl.classList.toggle('is-out');
  $('#ticketTab').textContent = open ? 'PUSH' : 'PULL';
  $('#ticketTab').setAttribute('aria-expanded', String(open));
});

freshEl.addEventListener('click', freshSheet);

/* ---------------------------------------------------------- first print */
(function boot(){
  const first = $('.drum[data-ink="pink"]');
  bayEl.appendChild(first);                 // seated, no travel animation on load
  passes.push('pink');
  addLayer(INKS[0], 0, false);
  paint();
  hintEl.textContent = HINT.start;
})();

/* ---------------------------------------------------------- test hook */
window.__riso = {
  passes: () => passes.slice(),
  layers: () => $$('.layer').map((l) => ({
    ink: l.dataset.ink,
    colour: getComputedStyle(l).color,
    dx: getComputedStyle(l).getPropertyValue('--dx').trim(),
    dy: getComputedStyle(l).getPropertyValue('--dy').trim(),
    blend: getComputedStyle(l).mixBlendMode,
    groups: $$('g[data-g]', l).map((g) => g.dataset.g),
  })),
  click: (id) => $(`.drum[data-ink="${id}"]`).click(),
  readouts: () => ({
    pass: $('#tPass').textContent,
    price: $('#tPrice').textContent,
    ready: $('#tReady').textContent,
    hint: hintEl.textContent,
  }),
};
