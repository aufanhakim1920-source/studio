/* ============================================================================
   AUFAN — THE DESK, IN 3D

   Geometry contract (derived, not guessed — the vault warns that guessing the
   rotation signs ships an invisible edge):

     .stage does rotateX(P). At P = 0 the desk plane faces the camera, i.e. we
     look straight DOWN at it. At P = 90 it is edge-on, i.e. eye level. So
     P = 62 is a three-quarter desk view, P = 12 is overhead, P = 80 faces the
     wall.

     Inside that, every object lives in the desk's own frame:
       +X  right along the desk
       +Y  toward the viewer (y = 0 far edge, y = 760 near edge)
       +Z  UP off the desk surface
     which is why "lift it toward the viewer" is just translateZ(+n).

   Face transforms for a corner-origin box of W x D x H:
       top    translateZ(H)
       front  translate3d(0, D, H) rotateX(-90deg)
       back   translate3d(0, 0, H) rotateX(-90deg)
       left   translate3d(0, 0, H) rotateY(-90deg) rotateZ(90deg)
       right  translate3d(W, 0, H) rotateY(-90deg) rotateZ(90deg)
   rotateX(-90) is the one that keeps a wall the right way UP; rotateX(+90)
   builds it upside down, which only shows once you put text on it.
   ========================================================================== */

'use strict';

var props    = document.getElementById('props');
var stage    = document.getElementById('stage');
var room     = document.getElementById('room');
var tag      = document.getElementById('tag');
var tagKind  = document.getElementById('tagKind');
var tagTitle = document.getElementById('tagTitle');

var DESK = { W: 1400, D: 760, TH: 34, FLOOR: -452 };
var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ───────────────────────────── helpers ───────────────────────────── */

function setP(el, x, y, z, rz) {
  el.style.setProperty('--x', x + 'px');
  el.style.setProperty('--y', y + 'px');
  el.style.setProperty('--z', z + 'px');
  if (rz !== undefined && rz !== null) el.style.setProperty('--rz', rz + 'deg');
}

function mkFace(name, w, h, tf, html) {
  var f = document.createElement('div');
  f.className = 'f f--' + name;
  f.style.width = w + 'px';
  f.style.height = h + 'px';
  f.style.transform = tf;
  if (html) f.innerHTML = html;
  return f;
}

function mkBox(o) {
  var w = o.w, d = o.d, h = o.h;
  var b = document.createElement('div');
  b.className = 'box mv ' + (o.cls || '');
  b.style.width = w + 'px';
  b.style.height = d + 'px';
  setP(b, o.x || 0, o.y || 0, o.z || 0, o.rz || 0);

  var faces = o.faces || {};
  var defs = [
    ['top',    w, d, 'translateZ(' + h + 'px)'],
    ['back',   w, h, 'translate3d(0px,0px,' + h + 'px) rotateX(-90deg)'],
    ['left',   d, h, 'translate3d(0px,0px,' + h + 'px) rotateY(-90deg) rotateZ(90deg)'],
    ['right',  d, h, 'translate3d(' + w + 'px,0px,' + h + 'px) rotateY(-90deg) rotateZ(90deg)'],
    ['front',  w, h, 'translate3d(0px,' + d + 'px,' + h + 'px) rotateX(-90deg)'],
    ['bottom', w, d, 'translateZ(0px)']
  ];
  var skip = o.skip || ['bottom'];
  for (var i = 0; i < defs.length; i++) {
    if (skip.indexOf(defs[i][0]) > -1) continue;
    b.appendChild(mkFace(defs[i][0], defs[i][1], defs[i][2], defs[i][3], faces[defs[i][0]]));
  }
  return b;
}

/* two-part shadow. This is the AMBIENT half, lying on the desk at z≈1.4, that
   the object lifts AWAY from — so the shadow grows and separates instead of
   travelling with the object. The contact half is a box-shadow on the object. */
function mkShade(w, d, op) {
  var s = document.createElement('div');
  s.className = 'shade';
  s.style.width = w + 'px';
  s.style.height = d + 'px';
  s.style.opacity = op;
  s.dataset.op = op;
  s.dataset.w = w;
  s.dataset.d = d;
  return s;
}
function trackShade(s, x, y, z, ow, od) {
  var lift = Math.max(0, z);
  var w = +s.dataset.w, d = +s.dataset.d, op = +s.dataset.op;
  setP(s, x - (w - ow) / 2 + lift * 0.15, y - (d - od) / 2 + lift * 0.26, 1.4);
  s.style.setProperty('--sh', (1 + lift / 520).toFixed(3));
  s.style.opacity = Math.max(0.05, op - lift / 1100).toFixed(3);
}

function rgb(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
function mix(a, b, t) {
  var A = rgb(a), B = rgb(b);
  return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' +
                  Math.round(A[1] + (B[1] - A[1]) * t) + ',' +
                  Math.round(A[2] + (B[2] - A[2]) * t) + ')';
}

/* An N-sided prism standing on the desk — a mug, a trophy cup. Each wall runs
   vertex→vertex so its width is the chord 2r·sin(pi/n); shading comes from the
   wall's own outward normal, never from a gradient. */
function mkPrism(o) {
  var r = o.r, h = o.h, n = o.n || 16;
  var p = document.createElement('div');
  p.className = 'box mv ' + (o.cls || '');
  p.style.width = 2 * r + 'px';
  p.style.height = 2 * r + 'px';
  setP(p, o.x - r, o.y - r, o.z || 0, 0);

  var chord = 2 * r * Math.sin(Math.PI / n) + 1.2;   // +1.2 closes the seams
  var LX = -0.62, LY = -0.78;                        // light from the back left
  for (var i = 0; i < n; i++) {
    var a = (i * 2 * Math.PI) / n;
    var cx = r + r * Math.cos(a);
    var cy = r + r * Math.sin(a);
    var na = a + Math.PI / n;
    var t = 0.5 + 0.5 * (Math.cos(na) * LX + Math.sin(na) * LY);
    var f = document.createElement('div');
    f.className = 'f';
    f.style.width = chord + 'px';
    f.style.height = h + 'px';
    f.style.background = mix(o.dark, o.light, t);
    f.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,' + h + 'px) rotateZ(' +
      ((a * 180) / Math.PI + 90 + 180 / n) + 'deg) rotateX(-90deg)';
    p.appendChild(f);
  }
  return p;
}

/* ───────────────────────────── content ───────────────────────────── */

var PROJECTS = [
  { n: '01', t: 'FanNest', st: 'live', stack: 'Shopify · Node · Meta Graph API',
    metric: 'Anime merch, end to end',
    note: 'Storefront, catalogue, and a reels pipeline that cuts and posts to Meta without me in the loop.' },
  { n: '02', t: 'Week Board', st: 'live', stack: 'Netlify Functions · Google Calendar',
    metric: 'My week, made public',
    note: 'A booking board that reads my real calendar and hands out slots without an email thread.' },
  { n: '03', t: 'Biomate', st: 'live', stack: 'Supabase · Postgres RLS · GPS',
    metric: '50,000 GPS fixes',
    note: 'Hiking partner matcher. Row-level security per user; traces stored and matched server side.' },
  { n: '04', t: 'Pixel Knight', st: 'playable', stack: 'Canvas 2D · no engine',
    metric: '136 · 98 · 28 · 17',
    note: 'Weapons, enemies, bosses, biomes. A roguelike written straight onto a canvas.' },
  { n: '05', t: 'baka nae.', st: 'live', stack: 'Bilingual brand site',
    metric: '10.7k Shopee followers',
    note: 'My sister&rsquo;s fanart label. Indonesian and English in one grid, one voice.' },
  { n: '06', t: 'Untitled Game', st: 'in build', stack: 'Unity · C# · co-op',
    metric: '8.0s → 2.2s per kill',
    note: 'I instrumented the combat loop and cut time-to-kill by measuring it, not guessing.' },
  { n: '07', t: 'Hollowborne', st: 'in build', stack: 'JavaScript action-RPG',
    metric: 'Story bible written first',
    note: 'The world was finished on paper before a line of code went in.' },
  { n: '08', t: 'AgentSentry', st: 'prototype', stack: 'Next.js · proxy',
    metric: 'A kill switch for agents',
    note: 'Sits in front of an AI agent and can stop the whole thing mid-run.' },
  { n: '09', t: 'FreshTrack', st: 'prototype', stack: 'Mobile · computer vision',
    metric: 'Point it at the food',
    note: 'Freshness read from a photo, so nothing gets binned on a guess.' },
  { n: '10', t: 'Motion Pipeline', st: 'tooling', stack: 'Remotion · frame-timed sound',
    metric: 'Every SFX pinned to a frame',
    note: 'Video rendered in Chrome, each sound tied to the frame its animation starts on.' }
];

var PRINTS = [
  { src: 'cleanup.jpg',   cap: 'Cobra Cleanup',      pos: '50% 44%' },
  { src: 'water.jpg',     cap: 'Clean water',        pos: '50% 36%' },
  { src: 'athletic.jpg',  cap: 'Training block',     pos: '50% 32%' },
  { src: 'gym.jpg',       cap: 'Fitology',           pos: '50% 38%' },
  { src: 'orphanage.jpg', cap: 'Community Build 28', pos: '50% 44%' },
  { src: 'coffee.jpg',    cap: 'Latte art',          pos: '50% 50%' }
];

/* ═════════════════════════ build the room ═════════════════════════ */

/* desk slab — its lid is z = 0, so every object's z is a real height */
props.appendChild(mkBox({
  w: DESK.W, d: DESK.D, h: DESK.TH, x: 0, y: 0, z: -DESK.TH,
  cls: 'desk m-wood', skip: []
}));

/* two trestle panels down to the floor */
[[76, 96], [1250, 96]].forEach(function (p) {
  props.appendChild(mkBox({
    w: 74, d: 570, h: -DESK.TH - DESK.FLOOR, x: p[0], y: p[1], z: DESK.FLOOR, cls: 'm-wood'
  }));
});

/* green baize inlay */
props.appendChild(mkBox({ w: 920, d: 480, h: 3, x: 52, y: 196, cls: 'baize m-felt' }));

/* ── lamp ─────────────────────────────────────────────────────────── */
var lampShade = mkShade(330, 220, 0.6);
props.appendChild(lampShade);
trackShade(lampShade, 40, 20, 0, 170, 108);
props.appendChild(mkBox({ w: 170, d: 108, h: 18, x: 40, y: 20, cls: 'm-slate' }));
props.appendChild(mkBox({ w: 22, d: 22, h: 236, x: 114, y: 62, cls: 'm-slate' }));

var arm = document.createElement('div');
arm.className = 'lampArm';
arm.style.transform = 'translate3d(125px,73px,240px) rotateX(-50deg)';
var shadeBox = mkBox({ w: 196, d: 152, h: 84, x: -52, y: -76, cls: 'm-slate lampHead', skip: [] });
shadeBox.querySelector('.f--bottom').classList.add('f--bottomlit');
arm.appendChild(shadeBox);
props.appendChild(arm);

var pool = document.createElement('div');
pool.className = 'lampPool';
pool.style.width = '1060px';
pool.style.height = '760px';
setP(pool, -120, -130, 1.9);
props.appendChild(pool);

/* ── the project deck ─────────────────────────────────────────────── */
var CARD = { w: 420, d: 280, h: 8 };
var PILE = { x: 132, y: 306 };
var READ = { x: 500, y: 224, z: 392 };

var cards = [], cardShades = [];
PROJECTS.forEach(function (p, i) {
  var html =
    '<div class="card__band"><span class="card__n">' + p.n + '</span>' +
    '<span class="card__t">' + p.t + '</span><span class="card__st">' + p.st + '</span></div>' +
    '<div class="card__body"><p class="card__stack">' + p.stack + '</p>' +
    '<p class="card__metric">' + p.metric + '</p><p class="card__note">' + p.note + '</p></div>';
  var c = mkBox({
    w: CARD.w, d: CARD.d, h: CARD.h,
    cls: 'card pick m-paper' + (p.st === 'live' ? ' card--live' : ''),
    faces: { top: html }
  });
  c.dataset.pick = 'card';
  c.dataset.i = String(i);
  c.setAttribute('role', 'button');
  c.setAttribute('tabindex', '0');
  c.setAttribute('aria-label', 'Project ' + p.n + ': ' + p.t);
  var s = mkShade(CARD.w + 60, CARD.d + 60, 0.13);
  cardShades.push(s); cards.push(c);
  props.appendChild(s); props.appendChild(c);
});

/* ── notebook ─────────────────────────────────────────────────────── */
var BOOK = { w: 400, d: 320, h: 26, x: 756, y: 288 };
var book = mkBox({
  w: BOOK.w, d: BOOK.d, h: BOOK.h, x: BOOK.x, y: BOOK.y, cls: 'book pick m-paper',
  faces: {
    top:
      '<div class="book__page"><h4>Reading &amp; hands</h4>' +
      '<p class="sub">BSc Data Science · UniMelb · first year</p>' +
      '<div class="book__cols">' +
      '<ul><li><b>Languages</b>Indonesian native<br>English — IELTS 7.0</li>' +
      '<li><b>Body</b>Competitive Taekwondo<br>NASM PT theory</li></ul>' +
      '<ul><li><b>Builds with</b>JavaScript · Python<br>C# · SQL</li>' +
      '<li><b>Runs on</b>Supabase · Netlify<br>Shopify · Unity</li></ul>' +
      '</div></div>'
  }
});
book.dataset.pick = 'book';
book.setAttribute('role', 'button');
book.setAttribute('tabindex', '0');
book.setAttribute('aria-label', 'Notebook — skills and schooling');

var cover = document.createElement('div');
cover.className = 'cover';
cover.style.width = BOOK.w + 'px';
cover.style.height = BOOK.d + 'px';
cover.style.setProperty('--cz', (BOOK.h + 1.4) + 'px');
cover.innerHTML = '<span class="cover__band"></span><span class="cover__mark">notebook</span>' +
  '<span class="cover__inner"><em>&ldquo;measure it, don&rsquo;t guess.&rdquo;</em></span>';
book.appendChild(cover);

var bookShade = mkShade(BOOK.w + 60, BOOK.d + 60, 0.66);
props.appendChild(bookShade);
props.appendChild(book);

/* ── mug + the docket that lives under it ─────────────────────────── */
var MUG = { r: 62, h: 116, x: 1252, y: 250 };
var mugShade = mkShade(210, 210, 0.66);
props.appendChild(mugShade);

var mugDocket = mkBox({
  w: 380, d: 360, h: 4, cls: 'card card--docket m-paper',
  faces: {
    top:
      '<div class="card__band"><span class="card__n">06:00</span>' +
      '<span class="card__t">Front of house</span><span class="card__st">bakery</span></div>' +
      '<ul class="docket__list">' +
      '<li>Natural Tucker Bakery — on the floor from six, every shift.</li>' +
      '<li>Hired off a cold email. Round twelve of my own outreach campaign.</li>' +
      '<li>Nationally certified barista.</li>' +
      '<li>La Spaghettata: trial rush cover at roughly twice a full-timer&rsquo;s pace.</li>' +
      '</ul>'
  }
});
props.appendChild(mugDocket);

var mug = mkPrism({
  r: MUG.r, h: MUG.h, n: 16, x: MUG.x, y: MUG.y,
  cls: 'mug pick', dark: '#AC9B7E', light: '#F6EDDB'
});
props.appendChild(mug);

/* brew surface + rim + handle, all children of the mug so they lift with it */
var brew = document.createElement('div');
brew.className = 'mug__brew';
brew.style.cssText = 'left:' + (MUG.r - (MUG.r - 11)) + 'px;top:' + (MUG.r - (MUG.r - 11)) +
  'px;width:' + (MUG.r - 11) * 2 + 'px;height:' + (MUG.r - 11) * 2 + 'px;transform:translateZ(' + (MUG.h - 9) + 'px);';
mug.appendChild(brew);

var rim = document.createElement('div');
rim.className = 'mug__rim';
rim.style.cssText = 'left:0;top:0;width:' + MUG.r * 2 + 'px;height:' + MUG.r * 2 +
  'px;transform:translateZ(' + MUG.h + 'px);';
mug.appendChild(rim);

var ear = document.createElement('div');
ear.className = 'mug__ear';
ear.style.cssText = 'width:82px;height:82px;transform:translate3d(' + (MUG.r * 2 - 6) + 'px,' +
  MUG.r + 'px,' + (MUG.h - 45) + 'px) rotateZ(0deg) rotateX(-90deg) translate(-6px,-41px);';
mug.appendChild(ear);

mug.dataset.pick = 'mug';
mug.setAttribute('role', 'button');
mug.setAttribute('tabindex', '0');
mug.setAttribute('aria-label', 'Coffee mug — bakery and barista work');

/* ── trophy + its docket ──────────────────────────────────────────── */
var TRO = { x: 1064, y: 84 };
var troShade = mkShade(240, 240, 0.62);
props.appendChild(troShade);

var troDocket = mkBox({
  w: 380, d: 360, h: 4, cls: 'card card--docket m-paper',
  faces: {
    top:
      '<div class="card__band"><span class="card__n">×2</span>' +
      '<span class="card__t">The record</span><span class="card__st">first place</span></div>' +
      '<ul class="docket__list">' +
      '<li>First place, CISSA Codebrew — twice, both as a first-year, both against masters teams.</li>' +
      '<li>Selected delegate, World Youth Forum Asia 2025.</li>' +
      '<li>Head Assistant, Cobra Cleanup — 203.6 kg sorted, run in Jawa Pos.</li>' +
      '<li>UniMelb Community Badge for O-Week.</li>' +
      '</ul>'
  }
});
props.appendChild(troDocket);

var trophy = document.createElement('div');
trophy.className = 'box mv trophy pick';
trophy.style.width = '1px';
trophy.style.height = '1px';
setP(trophy, 0, 0, 0, 0);
trophy.dataset.pick = 'trophy';
trophy.setAttribute('role', 'button');
trophy.setAttribute('tabindex', '0');
trophy.setAttribute('aria-label', 'Trophy — awards and community record');
var plinth = mkBox({
  w: 132, d: 132, h: 40, x: TRO.x - 66, y: TRO.y - 66, cls: 'plinth m-wood',
  faces: { front: '<span class="plinth__plate">codebrew</span>' }
});
trophy.appendChild(plinth);
trophy.appendChild(mkBox({ w: 26, d: 26, h: 36, x: TRO.x - 13, y: TRO.y - 13, z: 40, cls: 'm-brass' }));
var cup = mkPrism({ r: 48, h: 68, n: 12, x: TRO.x, y: TRO.y, z: 76, cls: 'cup', dark: '#8E6A22', light: '#F0D48A' });
cup.classList.remove('mv');
trophy.appendChild(cup);
var cupTop = document.createElement('div');
cupTop.className = 'cup__mouth';
cupTop.style.cssText = 'left:0;top:0;width:96px;height:96px;transform:translateZ(68px);';
cup.appendChild(cupTop);
props.appendChild(trophy);

/* ── prints ───────────────────────────────────────────────────────── */
var PRT = { w: 244, d: 182, h: 6, x: 556, y: 26 };
var prints = [], printShades = [];
PRINTS.forEach(function (p, i) {
  var pr = mkBox({
    w: PRT.w, d: PRT.d, h: PRT.h, cls: 'print pick m-paper',
    faces: {
      top: '<img src="assets/' + p.src + '" alt="' + p.cap + '" loading="eager" style="object-position:' + p.pos + '">' +
           '<p class="print__cap">' + p.cap + '</p>'
    }
  });
  pr.dataset.pick = 'print';
  pr.dataset.i = String(i);
  pr.setAttribute('role', 'button');
  pr.setAttribute('tabindex', '0');
  pr.setAttribute('aria-label', 'Photo print: ' + p.cap);
  var s = mkShade(PRT.w + 50, PRT.d + 50, 0.14);
  prints.push(pr); printShades.push(s);
  props.appendChild(s); props.appendChild(pr);
});

/* ── phone ────────────────────────────────────────────────────────── */
var PHN = { w: 210, d: 350, h: 13, x: 1174, y: 384 };
var phoneShade = mkShade(220, 360, 0.6);
props.appendChild(phoneShade);
var phone = mkBox({
  w: PHN.w, d: PHN.d, h: PHN.h, cls: 'phone pick m-slate', rz: -7,
  faces: {
    top: '<div class="phone__scr"><p class="t">contact</p>' +
         '<p class="m">Say hello.</p>' +
         '<p class="e">aufanhakim1920<br>@gmail.com</p>' +
         '<p class="s">Melbourne · open to work</p>' +
         '<a class="b" href="mailto:aufanhakim1920@gmail.com">write to me</a></div>'
  }
});
phone.dataset.pick = 'phone';
phone.setAttribute('role', 'button');
phone.setAttribute('tabindex', '0');
phone.setAttribute('aria-label', 'Phone — contact');
props.appendChild(phone);

/* ── sticky note + pen: dressing, not interactive ─────────────────── */
props.appendChild(mkBox({
  w: 176, d: 176, h: 3, x: 226, y: 54, rz: -6, cls: 'sticky m-mint',
  faces: { top: '<p class="sticky__t">cold email,<br>round twelve.<br>they said yes.</p>' }
}));
props.appendChild(mkBox({ w: 216, d: 14, h: 14, x: 560, y: 664, rz: -8, cls: 'm-slate' }));
props.appendChild(mkBox({ w: 46, d: 14, h: 14, x: 776, y: 634, rz: -8, cls: 'm-brass' }));

/* ═════════════════════════ state + layout ═════════════════════════ */

var S = {
  deck: 'pile',     // pile | fan
  card: -1,         // index of the open card, -1 for none
  held: null,       // 'book' | 'mug' | 'trophy' | 'phone' | 'print' | null
  printsOut: false,
  printHover: -1,
  heldPrint: -1
};

/* deterministic jitter — a pile needs rotation, not just offset, or it reads
   as a neat stack of paper rather than something someone put down */
function jit(i, k) { var v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); }

function place(el, sh, x, y, z, rz, ow, od) {
  setP(el, x, y, z, rz);
  if (sh) trackShade(sh, x, y, z, ow, od);
}

function layout() {
  var i;

  /* ── project deck ── */
  for (i = 0; i < cards.length; i++) {
    var x, y, z, rz;
    if (S.card === i) {
      x = READ.x; y = READ.y; z = READ.z; rz = 0;
    } else if (S.deck === 'fan') {
      /* a cascade, not a hand-fan: each card keeps a readable strip of its own
         top band showing, which a rotational fan does not */
      x = (i < 5 ? 52 : 512);
      y = 452 - (i % 5) * 66;
      z = 62 - (i % 5) * 10;
      rz = (jit(i, 8) - 0.5) * 3.2;
      if (S.card > -1) z = 10 - (i % 5) * 2;                 // lifting one presses the rest flat
    } else {
      /* a stack needs bigger offsets than feel right */
      x = PILE.x + (jit(i, 1) - 0.5) * 26;
      y = PILE.y + (jit(i, 2) - 0.5) * 22;
      z = i * 9;
      rz = (jit(i, 3) - 0.5) * 7;
    }
    var op = S.card === i ? 0.7 : (S.deck === 'fan' ? 0.34 : 0.13);
    cardShades[i].dataset.op = op;
    place(cards[i], cardShades[i], x, y, z, rz, CARD.w, CARD.d);
    cards[i].classList.toggle('is-held', S.card === i);
  }

  /* ── notebook ── */
  var bOpen = S.held === 'book';
  place(book, bookShade, bOpen ? READ.x - 12 : BOOK.x, bOpen ? READ.y + 6 : BOOK.y,
        bOpen ? 372 : 0, 0, BOOK.w, BOOK.d);
  cover.style.setProperty('--ry', bOpen ? '-166deg' : '0deg');
  bookShade.dataset.op = bOpen ? 0.7 : 0.66;

  /* ── mug + docket ── */
  var mOpen = S.held === 'mug';
  place(mug, mugShade, mOpen ? MUG.x - MUG.r + 84 : MUG.x - MUG.r,
        mOpen ? MUG.y - MUG.r - 150 : MUG.y - MUG.r, mOpen ? 210 : 0, 0, MUG.r * 2, MUG.r * 2);
  mugShade.dataset.op = mOpen ? 0.5 : 0.66;
  setP(mugDocket, mOpen ? READ.x : MUG.x - 170, mOpen ? READ.y + 10 : MUG.y - 126,
       mOpen ? 384 : 1.8, mOpen ? 0 : -4);
  mugDocket.style.opacity = mOpen ? 1 : 0;

  /* ── trophy + docket ── */
  var tOpen = S.held === 'trophy';
  place(trophy, troShade, tOpen ? 190 : 0, tOpen ? -60 : 0, tOpen ? 232 : 0, 0, 132, 132);
  troShade.dataset.op = tOpen ? 0.44 : 0.62;
  trackShade(troShade, TRO.x - 66 + (tOpen ? 190 : 0), TRO.y - 66 + (tOpen ? -60 : 0),
             tOpen ? 232 : 0, 132, 132);
  setP(troDocket, tOpen ? READ.x : TRO.x - 170, tOpen ? READ.y + 10 : TRO.y - 126,
       tOpen ? 384 : 1.8, tOpen ? 0 : 5);
  troDocket.style.opacity = tOpen ? 1 : 0;

  /* ── phone ── */
  var pOpen = S.held === 'phone';
  place(phone, phoneShade, pOpen ? READ.x + 90 : PHN.x, pOpen ? READ.y + 20 : PHN.y,
        pOpen ? 404 : 0, pOpen ? 0 : -7, PHN.w, PHN.d);
  phoneShade.dataset.op = pOpen ? 0.62 : 0.6;

  /* ── prints ── */
  for (i = 0; i < prints.length; i++) {
    var px, py, pz, prz;
    if (S.heldPrint === i) {
      px = READ.x + 46; py = READ.y + 30; pz = 400; prz = 0;
    } else if (S.printsOut) {
      px = 96 + i * 196;
      py = 268 - (i % 2) * 34;
      pz = 158 + i * 11;
      prz = (i - 2.5) * 3.2;
      if (S.heldPrint > -1) pz = 96 + i * 6;
    } else {
      px = PRT.x + (jit(i, 4) - 0.5) * 30;
      py = PRT.y + (jit(i, 5) - 0.5) * 26;
      pz = i * 7;
      prz = (jit(i, 6) - 0.5) * 11;
    }
    if (S.printHover === i && S.heldPrint !== i) pz += 34;
    printShades[i].dataset.op = S.heldPrint === i ? 0.66 : (S.printsOut ? 0.3 : 0.14);
    place(prints[i], printShades[i], px, py, pz, prz, PRT.w, PRT.d);
  }

  /* the read-out that follows whatever is in your hand */
  var label = null;
  if (S.card > -1) label = ['Project ' + PROJECTS[S.card].n, PROJECTS[S.card].t];
  else if (S.held === 'book') label = ['Notebook', 'Reading & hands'];
  else if (S.held === 'mug') label = ['Mug', 'Front of house, from six'];
  else if (S.held === 'trophy') label = ['Trophy', 'Two first places'];
  else if (S.held === 'phone') label = ['Phone', 'aufanhakim1920@gmail.com'];
  else if (S.heldPrint > -1) label = ['Print', PRINTS[S.heldPrint].cap];
  if (label) { tag.hidden = false; tagKind.textContent = label[0]; tagTitle.textContent = label[1]; }
  else tag.hidden = true;
}

/* ═════════════════════════ the camera ═════════════════════════
   ONE system owns the stage transform: this object. Nothing else writes it,
   which is what keeps drag and the pose presets from erasing each other. */

var POSE = {
  desk: { p: 60, y: -10, panY: 232, dolly: -340 },
  wall: { p: 82, y: 0,   panY: 306, dolly: -840 },
  over: { p: 12, y: 0,   panY: 20,  dolly: -430 },
  read: { p: 23, y: 0,   panY: 74,  dolly: -300 }
};
var cam = { p: 60, y: -10, panY: 232, dolly: -340, tp: 60, ty: -10, tpanY: 232, tdolly: -340 };
var raf = 0;

function zoomRatio() {
  var z = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--zoom'));
  return (z || 0.84) / 0.84;
}
var ZR = zoomRatio();
function apply() {
  stage.style.setProperty('--pitch', cam.p.toFixed(2) + 'deg');
  stage.style.setProperty('--yaw', cam.y.toFixed(2) + 'deg');
  stage.style.setProperty('--panY', (cam.panY * ZR).toFixed(1) + 'px');
  stage.style.setProperty('--dolly', (cam.dolly * ZR).toFixed(1) + 'px');
}
addEventListener('resize', function () { ZR = zoomRatio(); apply(); });
function tick() {
  var k = 0.15, moving = false, keys = ['p', 'y', 'panY', 'dolly'];
  for (var i = 0; i < keys.length; i++) {
    var K = keys[i], T = cam['t' + K];
    if (Math.abs(T - cam[K]) > 0.03) { cam[K] += (T - cam[K]) * k; moving = true; }
    else cam[K] = T;
  }
  apply();
  raf = moving ? requestAnimationFrame(tick) : 0;
}
function goto(o, instant) {
  cam.tp = o.p; cam.ty = o.y; cam.tpanY = o.panY; cam.tdolly = o.dolly;
  if (instant || REDUCED || window.__instant) { cam.p = o.p; cam.y = o.y; cam.panY = o.panY; cam.dolly = o.dolly; apply(); return; }
  if (!raf) raf = requestAnimationFrame(tick);
}
function pose(name, instant) {
  goto(POSE[name], instant);
  document.querySelectorAll('[data-pose]').forEach(function (b) {
    b.classList.toggle('is-on', b.dataset.pose === name);
  });
}
apply();

/* ── drag to orbit ── */
var drag = null;
room.addEventListener('pointerdown', function (e) {
  if (e.target.closest('.tag')) return;
  drag = { x: e.clientX, y: e.clientY, p: cam.tp, yw: cam.ty, moved: false, t: e.target };
  try { room.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointers have no capture target */ }
  room.classList.add('is-dragging');
});
room.addEventListener('pointermove', function (e) {
  if (!drag) {
    var pr = e.target.closest('[data-pick="print"]');
    var idx = pr ? +pr.dataset.i : -1;
    if (idx !== S.printHover) { S.printHover = idx; layout(); }
    return;
  }
  var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true;
  if (!drag.moved) return;
  cam.ty = cam.y = Math.max(-52, Math.min(52, drag.yw + dx * 0.24));
  cam.tp = cam.p = Math.max(14, Math.min(84, drag.p - dy * 0.19));
  apply();
});
room.addEventListener('pointerup', function (e) {
  if (!drag) return;
  room.classList.remove('is-dragging');
  var moved = drag.moved, t = drag.t;
  drag = null;
  if (moved) { document.querySelectorAll('[data-pose]').forEach(function (b) { b.classList.remove('is-on'); }); return; }
  if (t.closest('.b')) return;                       // let the mailto link work
  var hit = t.closest('[data-pick]');
  if (hit) act(hit.dataset.pick, hit.dataset.i ? +hit.dataset.i : -1);
  else putBack();
});
room.addEventListener('pointercancel', function () { drag = null; room.classList.remove('is-dragging'); });

/* ── picking things up ── */
function clearHeld() { S.card = -1; S.held = null; S.heldPrint = -1; }

/* mobile only: --zoom jumps when something is in hand, so recompute the pan
   scale straight after the class flips */
function syncHold() {
  var holding = S.card > -1 || !!S.held || S.heldPrint > -1;
  document.documentElement.classList.toggle('is-holding', holding);
  ZR = zoomRatio();
}

function act(kind, i) {
  if (kind === 'card') {
    if (S.deck === 'pile') { clearHeld(); S.deck = 'fan'; syncHold(); layout(); return; }
    if (S.card === i) { S.card = -1; syncHold(); layout(); pose('desk'); return; }
    clearHeld(); S.card = i; syncHold(); layout(); pose('read'); return;
  }
  if (kind === 'print') {
    if (!S.printsOut) { clearHeld(); S.printsOut = true; syncHold(); layout(); return; }
    if (S.heldPrint === i) { S.heldPrint = -1; syncHold(); layout(); pose('desk'); return; }
    clearHeld(); S.heldPrint = i; syncHold(); layout(); pose('read'); return;
  }
  if (S.held === kind) { S.held = null; syncHold(); layout(); pose('desk'); return; }
  clearHeld(); S.held = kind; syncHold(); layout(); pose('read');
}
function putBack() {
  if (S.card === -1 && !S.held && S.heldPrint === -1 && S.deck === 'pile' && !S.printsOut) return;
  clearHeld(); S.deck = 'pile'; S.printsOut = false;
  syncHold(); layout(); pose('desk');
}

document.getElementById('tagClose').addEventListener('click', putBack);
props.addEventListener('keydown', function (e) {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  var hit = e.target.closest('[data-pick]');
  if (!hit) return;
  e.preventDefault();
  act(hit.dataset.pick, hit.dataset.i ? +hit.dataset.i : -1);
});
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') putBack(); });

document.querySelectorAll('[data-pose]').forEach(function (b) {
  b.addEventListener('click', function () { pose(b.dataset.pose); });
});

/* ── the lamp switch: one click repaints the whole room ── */
var lampOn = true;
var lampBtn = document.getElementById('lampBtn');
function setLamp(on) {
  lampOn = on;
  document.documentElement.style.setProperty('--warm', on ? '1' : '0');
  lampBtn.classList.toggle('is-on', on);
  lampBtn.setAttribute('aria-pressed', String(on));
}
lampBtn.addEventListener('click', function () { setLamp(!lampOn); });

/* ═════════════════════════ the ledger ═════════════════════════ */
var lp = document.getElementById('ledgerProjects');
PROJECTS.forEach(function (p) {
  var li = document.createElement('li');
  li.className = 'row' + (p.st === 'live' ? ' row--live' : '');
  li.innerHTML = '<span class="row__k">' + p.t + '</span><span class="row__v">' + p.stack + ' · ' + p.st + '</span>';
  lp.appendChild(li);
});

/* ═════════════════════════ boot ═════════════════════════ */
layout();

/* States worth screenshotting are behind a click, so give them a URL. */
var H = {
  fan:   function () { S.deck = 'fan'; layout(); },
  wall:  function () { pose('wall', true); },
  over:  function () { pose('over', true); },
  dark:  function () { setLamp(false); },
  book:  function () { act('book', -1); },
  mug:   function () { act('mug', -1); },
  trophy:function () { act('trophy', -1); },
  phone: function () { act('phone', -1); },
  prints:function () { S.printsOut = true; layout(); }
};
(location.hash.replace('#', '').split(',')).forEach(function (h) {
  if (H[h]) H[h]();
  else if (/^card-\d+$/.test(h)) { S.deck = 'fan'; act('card', +h.split('-')[1]); }
});

window.__desk = {
  pose: pose, act: act, putBack: putBack, setLamp: setLamp, layout: layout, S: S, cam: cam,
  fan: function () { S.deck = 'fan'; layout(); },
  spread: function () { S.printsOut = true; layout(); },
  transform: function () { return getComputedStyle(stage).transform; }
};
