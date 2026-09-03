(() => {
'use strict';
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine   = matchMedia('(hover: hover) and (pointer: fine)').matches;
const clamp  = (v, a, b) => v < a ? a : v > b ? b : v;
/* ── the ink library ──────────────────────────────────────────────────── */
const INKS = [
  { id:'pink',   name:'Fluorescent Pink', code:'FP 1655', hex:'#FF4FA3', screen:15,
    shape:{ x:.50, y:.34, w:.84, h:.30, rot:-7  }, reg:[ 1.0,  0.4], over:'blue'  },
  { id:'orange', name:'Orange',           code:'OR 021',  hex:'#ED5A14', screen:75,
    shape:{ x:.43, y:.62, w:.76, h:.25, rot: 13 }, reg:[-0.7,  0.8], over:'blue'  },
  { id:'sun',    name:'Sunflower',        code:'SU 116',  hex:'#E8A31C', screen:0,
    shape:{ x:.52, y:.66, w:.68, h:.27, rot:-16 }, reg:[ 0.5, -0.9], over:'aqua'  },
  { id:'blue',   name:'Federal Blue',     code:'FB 072',  hex:'#1E5FCE', screen:45,
    shape:{ x:.48, y:.48, w:.90, h:.26, rot: 5  }, reg:[-1.0, -0.3], over:'pink'  },
  { id:'aqua',   name:'Aqua',             code:'AQ 3272', hex:'#0FA3A0', screen:30,
    shape:{ x:.36, y:.28, w:.62, h:.23, rot: 25 }, reg:[ 0.8,  0.7], over:'orange'},
  { id:'black',  name:'Black',            code:'BK 000',  hex:'#1B1A18', screen:60,
    shape:{ x:.62, y:.55, w:.54, h:.17, rot:-33 }, reg:[ 0.2, -0.6], over:'sun'   },
];
const BY = Object.fromEntries(INKS.map(i => [i.id, i]));
const SIZES  = [
  { id:'A5', label:'A5', mm:210, mult:0.6 },
  { id:'A4', label:'A4', mm:297, mult:1.0 },
  { id:'A3', label:'A3', mm:420, mult:1.9 },
];
const RUNS   = [
  { id:50,  label:'50 copies',  rate:0.24 },
  { id:100, label:'100 copies', rate:0.17 },
  { id:250, label:'250 copies', rate:0.11 },
];
const STOCKS = [
  { id:'munken',   name:'Munken Cream',           gsm:120, add:0.00, hex:'#FCF7EA' },
  { id:'bright',   name:'Colorplan Bright White', gsm:135, add:0.06, hex:'#FBFBF6' },
  { id:'kraft',    name:'Kraft Ochre',            gsm:170, add:0.09, hex:'#E6D3AE' },
  { id:'pristine', name:'Colorplan Pristine',     gsm:270, add:0.22, hex:'#F6F1E4' },
];
const MASTER = 8.00;
/* ── state ────────────────────────────────────────────────────────────── */
const S = {
  order : ['blue', 'pink', 'sun'],   // pass order — the thing that accumulates
  size  : 'A3',
  run   : 100,
  stock : 'munken',
  rush  : false,
  regmm : 0.8,
  pos   : {},                        // per-ink centre, normalised to the trim box
};
INKS.forEach(i => { S.pos[i.id] = { x:i.shape.x, y:i.shape.y }; });
const on = id => S.order.includes(id);
/* ═══ 1 · the sheet ═══════════════════════════════════════════════════ */
const cv  = $('#sheet');
const ctx = cv.getContext('2d', { alpha:false });
const bed = $('.bed');
let W = 0, H = 0, dpr = 1;
let trim = { x:0, y:0, w:0, h:0 };
const layers = {};                   // id -> { c, w, h } pre-rendered ink plate
function stadium(c, x, y, w, h) {
  const r = Math.min(h, w) / 2;
  c.beginPath();
  c.moveTo(x - w/2 + r, y - h/2);
  c.lineTo(x + w/2 - r, y - h/2);
  c.arc(x + w/2 - r, y, r, -Math.PI/2, Math.PI/2);
  c.lineTo(x - w/2 + r, y + h/2);
  c.arc(x - w/2 + r, y, r, Math.PI/2, -Math.PI/2);
  c.closePath();
}
/* the halftone screen — each drum gets its own angle, as a real separation
   would. Punching holes in the plate is what makes an overprint speckle
   instead of turning to mud. */
function screenPunch(c, angleDeg, pitch, alpha) {
  const t = document.createElement('canvas');
  t.width = t.height = pitch * 2;
  const g = t.getContext('2d');
  g.fillStyle = '#000';
  const r = pitch * 0.30;
  g.beginPath(); g.arc(pitch * 0.5, pitch * 0.5, r, 0, 7); g.fill();
  g.beginPath(); g.arc(pitch * 1.5, pitch * 1.5, r, 0, 7); g.fill();
  const x = c.getContext('2d');
  x.save();
  x.globalCompositeOperation = 'destination-out';
  x.globalAlpha = alpha;
  x.translate(c.width / 2, c.height / 2);
  x.rotate(angleDeg * Math.PI / 180);
  x.fillStyle = x.createPattern(t, 'repeat');
  x.fillRect(-c.width, -c.height, c.width * 2, c.height * 2);
  x.restore();
}
function buildPlate(ink) {
  const sh = ink.shape;
  const w = sh.w * trim.w, h = sh.h * trim.h;
  const rad = sh.rot * Math.PI / 180;
  const co = Math.abs(Math.cos(rad)), si = Math.abs(Math.sin(rad));
  const bw = Math.ceil(w * co + h * si) + 6;
  const bh = Math.ceil(w * si + h * co) + 6;
  const c = document.createElement('canvas');
  c.width = Math.max(2, bw); c.height = Math.max(2, bh);
  const x = c.getContext('2d');
  x.save();
  x.translate(c.width / 2, c.height / 2);
  x.rotate(rad);
  x.fillStyle = ink.hex;
  stadium(x, 0, 0, w, h);
  x.fill();
  x.restore();
  const pitch = Math.max(3, Math.round(4 * dpr));
  screenPunch(c, ink.screen, pitch, 0.48);
  // roller mottle — ink never lays perfectly flat, but riso lays it FLAT-ish:
  // keep this faint or the plate reads as a gradient wash instead of ink.
  x.save();
  x.globalCompositeOperation = 'destination-out';
  let seed = ink.id.charCodeAt(0) * 977;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < 6; i++) {
    const px = rnd() * c.width, py = rnd() * c.height, pr = (0.14 + rnd() * 0.20) * c.width;
    const g = x.createRadialGradient(px, py, 0, px, py, pr);
    g.addColorStop(0, 'rgba(0,0,0,.055)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(px - pr, py - pr, pr * 2, pr * 2);
  }
  x.restore();
  layers[ink.id] = c;
}
function resize() {
  const r = bed.getBoundingClientRect();
  if (!r.width || !r.height) return;
  dpr = Math.min(2, window.devicePixelRatio || 1);
  W = Math.round(r.width); H = Math.round(r.height);
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const sideM = Math.round(clamp(W * 0.022, 16, 46));
  const topM  = Math.round(clamp(H * 0.075, 26, 44));
  const botM  = Math.round(clamp(H * 0.11,  48, 68));
  trim = { x:sideM, y:topM, w:W - sideM * 2, h:H - topM - botM };
  INKS.forEach(buildPlate);
}
/* ── printer's furniture: crop marks, a mm ruler, the slug, and a
      registration target that actually shows the current mis-register ── */
function furniture() {
  const size = SIZES.find(s => s.id === S.size);
  const pxPerMm = trim.w / size.mm;
  const ink = '#141210';
  ctx.save();
  ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineWidth = 1;
  // crop marks
  ctx.globalAlpha = .5;
  const L = 12, g = 7;
  [[trim.x, trim.y, -1, -1], [trim.x + trim.w, trim.y, 1, -1],
   [trim.x, trim.y + trim.h, -1, 1], [trim.x + trim.w, trim.y + trim.h, 1, 1]]
   .forEach(([x, y, sx, sy]) => {
     ctx.beginPath();
     ctx.moveTo(x + sx * g + .5, y + .5); ctx.lineTo(x + sx * (g + L) + .5, y + .5);
     ctx.moveTo(x + .5, y + sy * g + .5); ctx.lineTo(x + .5, y + sy * (g + L) + .5);
     ctx.stroke();
   });
  // the ruler along the bottom margin
  const ry = trim.y + trim.h + 16.5;
  ctx.globalAlpha = .38;
  ctx.beginPath(); ctx.moveTo(trim.x, ry); ctx.lineTo(trim.x + trim.w, ry); ctx.stroke();
  ctx.font = '500 9px "DM Mono", monospace';
  ctx.textAlign = 'center';
  // numbers go ABOVE the rule: the registration cluster lives below it and the
  // two collided when both sat under the line.
  const every = trim.w > 640 ? 50 : 100;
  for (let mm = 0; mm <= size.mm; mm += 10) {
    const x = Math.round(trim.x + mm * pxPerMm) + .5;
    const big = mm % every === 0;
    ctx.beginPath(); ctx.moveTo(x, ry); ctx.lineTo(x, ry + (big ? 7 : 4)); ctx.stroke();
    if (big && mm > 0 && mm < size.mm) { ctx.globalAlpha = .5; ctx.fillText(mm, x, ry - 5); ctx.globalAlpha = .38; }
  }
  // slug line — the two halves collide on a narrow sheet, so the phone gets
  // one short slug instead of two long ones.
  ctx.globalAlpha = .55;
  ctx.font = '500 10px "DM Mono", monospace';
  ctx.textAlign = 'left';
  const wide = trim.w > 640;
  ctx.fillText(wide
      ? `CHROMA  JOB 24-118  ${S.order.length} PASS${S.order.length === 1 ? '' : 'ES'}  SCREEN 75 LPI`
      : `JOB 24-118  ${S.order.length} PASS${S.order.length === 1 ? '' : 'ES'}`,
    trim.x + 22, trim.y - 12);
  ctx.textAlign = 'right';
  ctx.fillText(wide
      ? `SHOWN TO FIT  ACTUAL ${size.mm} × ${Math.round(size.mm / 1.414)} MM`
      : `${size.mm} × ${Math.round(size.mm / 1.414)} MM`,
    trim.x + trim.w - 22, trim.y - 12);
  // registration target — one cross per drum, each offset by its own error
  const tx = trim.x + 22, ty = ry + 20, off = S.regmm * pxPerMm;
  ctx.globalAlpha = .9; ctx.lineWidth = 1.4;
  S.order.forEach(id => {
    const k = BY[id];
    const cx = tx + k.reg[0] * off, cy = ty + k.reg[1] * off;
    ctx.strokeStyle = k.hex;
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy); ctx.lineTo(cx + 7, cy);
    ctx.moveTo(cx, cy - 7); ctx.lineTo(cx, cy + 7);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 4.2, 0, 7); ctx.stroke();
  });
  ctx.globalAlpha = .5; ctx.strokeStyle = ink; ctx.lineWidth = 1;
  ctx.textAlign = 'left'; ctx.fillStyle = ink;
  ctx.font = '400 9px "DM Mono", monospace';
  ctx.fillText(`REGISTRATION ±${S.regmm.toFixed(1)}MM`, tx + 34, ty + 3.5);
  ctx.restore();
}
/* ── the composite ────────────────────────────────────────────────────── */
let t0 = performance.now();
const par = { x:0, y:0, tx:0, ty:0 };
function paint(now) {
  const t = now - t0;
  const stock = STOCKS.find(s => s.id === S.stock);
  const size  = SIZES.find(s => s.id === S.size);
  const pxPerMm = trim.w / size.mm;
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#F4F1EB';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = stock.hex;
  ctx.fillRect(trim.x, trim.y, trim.w, trim.h);
  par.x += (par.tx - par.x) * 0.07;
  par.y += (par.ty - par.y) * 0.07;
  ctx.save();
  ctx.beginPath(); ctx.rect(trim.x, trim.y, trim.w, trim.h); ctx.clip();
  ctx.globalCompositeOperation = 'multiply';
  S.order.forEach((id, i) => {
    const k = BY[id], plate = layers[id];
    if (!plate) return;
    const ph = i * 2.1 + id.length;
    const amp = reduce ? 0 : 11;
    const drift = grabbed === id ? 0 : 1;
    const dx = Math.sin(t * 0.00021 + ph) * amp * drift;
    const dy = Math.cos(t * 0.00017 + ph * 1.7) * amp * 0.62 * drift;
    const depth = -14 - i * 9;
    const cx = trim.x + S.pos[id].x * trim.w + dx + k.reg[0] * S.regmm * pxPerMm + par.x * depth;
    const cy = trim.y + S.pos[id].y * trim.h + dy + k.reg[1] * S.regmm * pxPerMm + par.y * depth;
    ctx.globalAlpha = 0.90 + i * 0.015;
    ctx.drawImage(plate, Math.round(cx - plate.width / 2), Math.round(cy - plate.height / 2));
  });
  ctx.restore();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  furniture();
  requestAnimationFrame(paint);
}
/* ═══ 2 · dragging an ink ═════════════════════════════════════════════ */
let grabbed = null, grabDX = 0, grabDY = 0;
let scrollMode = false, lastY = 0, vel = 0, glide = 0;
function hit(mx, my) {
  const size = SIZES.find(s => s.id === S.size);
  const pxPerMm = trim.w / size.mm;
  for (let i = S.order.length - 1; i >= 0; i--) {
    const id = S.order[i], k = BY[id], sh = k.shape;
    const cx = trim.x + S.pos[id].x * trim.w + k.reg[0] * S.regmm * pxPerMm;
    const cy = trim.y + S.pos[id].y * trim.h + k.reg[1] * S.regmm * pxPerMm;
    const rad = -sh.rot * Math.PI / 180;
    const dx = mx - cx, dy = my - cy;
    const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
    const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
    const w = sh.w * trim.w, h = sh.h * trim.h, r = h / 2;
    const ax = Math.max(Math.abs(lx) - (w / 2 - r), 0);
    if (ax * ax + ly * ly <= r * r) return { id, cx, cy };
  }
  return null;
}
const local = e => {
  const r = cv.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
};
cv.addEventListener('pointerdown', e => {
  const [mx, my] = local(e);
  const h = hit(mx, my);
  if (h) {
    grabbed = h.id; grabDX = mx - h.cx; grabDY = my - h.cy;
    cv.setPointerCapture(e.pointerId);
    cv.classList.add('grabbing');
    say(`${BY[h.id].name} — pass ${S.order.indexOf(h.id) + 1}`);
    e.preventDefault();
  } else if (e.pointerType !== 'mouse') {
    // touch-action is none so the page cannot scroll itself here — carry it
    scrollMode = true; lastY = e.clientY; vel = 0; glide = 0;
    cv.setPointerCapture(e.pointerId);
  }
});
cv.addEventListener('pointermove', e => {
  const [mx, my] = local(e);
  if (grabbed) {
    S.pos[grabbed].x = clamp((mx - grabDX - trim.x) / trim.w, -0.25, 1.25);
    S.pos[grabbed].y = clamp((my - grabDY - trim.y) / trim.h, -0.25, 1.25);
    e.preventDefault();
  } else if (scrollMode) {
    const d = lastY - e.clientY;
    window.scrollBy(0, d); vel = d; lastY = e.clientY;
  } else if (fine && !reduce) {
    par.tx = clamp((mx / W) - 0.5, -0.5, 0.5);
    par.ty = clamp((my / H) - 0.5, -0.5, 0.5);
  }
});
function release() {
  grabbed = null;
  cv.classList.remove('grabbing');
  if (scrollMode) { scrollMode = false; glide = vel; decay(); }
}
cv.addEventListener('pointerup', release);
cv.addEventListener('pointercancel', release);
cv.addEventListener('pointerleave', () => { if (fine) { par.tx = 0; par.ty = 0; } });
function decay() {
  if (Math.abs(glide) < 0.4) return;
  window.scrollBy(0, glide);
  glide *= 0.93;
  requestAnimationFrame(decay);
}
/* ═══ 3 · the drums ═══════════════════════════════════════════════════ */
const rail = $('#rail');
function drawRail() {
  rail.textContent = '';
  INKS.forEach(k => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'drum';
    b.style.setProperty('--c', k.hex);
    b.setAttribute('aria-pressed', on(k.id));
    b.dataset.id = k.id;
    const i = document.createElement('i');
    const s = document.createElement('b');
    s.textContent = on(k.id) ? `${String(S.order.indexOf(k.id) + 1).padStart(2, '0')} ${k.name}` : k.name;
    b.append(i, s);
    b.addEventListener('click', () => toggle(k.id));
    b.addEventListener('keydown', e => {
      if (!on(k.id)) return;
      const step = e.shiftKey ? 0.05 : 0.015;
      const p = S.pos[k.id];
      if (e.key === 'ArrowLeft')  { p.x = clamp(p.x - step, -.25, 1.25); e.preventDefault(); }
      if (e.key === 'ArrowRight') { p.x = clamp(p.x + step, -.25, 1.25); e.preventDefault(); }
      if (e.key === 'ArrowUp')    { p.y = clamp(p.y - step, -.25, 1.25); e.preventDefault(); }
      if (e.key === 'ArrowDown')  { p.y = clamp(p.y + step, -.25, 1.25); e.preventDefault(); }
    });
    rail.append(b);
  });
}
function toggle(id) {
  if (on(id)) S.order = S.order.filter(x => x !== id);
  else { S.order = [...S.order, id]; S.pos[id] = { x:BY[id].shape.x, y:BY[id].shape.y }; }
  drawRail(); update();
  say(on(id)
    ? `${BY[id].name} laid down — pass ${S.order.indexOf(id) + 1} of ${S.order.length}`
    : `${BY[id].name} lifted — ${S.order.length} pass${S.order.length === 1 ? '' : 'es'} left`);
}
/* ═══ 4 · the job ═════════════════════════════════════════════════════ */
function buildSet(el, items, get, set) {
  el.textContent = '';
  items.forEach(it => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'opt';
    b.textContent = it.label;
    b.setAttribute('aria-pressed', get() === it.id);
    b.addEventListener('click', () => { set(it.id); drawSets(); update(); });
    el.append(b);
  });
}
function drawSets() {
  buildSet($('#setSize'),  SIZES, () => S.size,  v => S.size = v);
  buildSet($('#setRun'),   RUNS,  () => S.run,   v => S.run  = v);
  buildSet($('#setStock'), STOCKS.map(s => ({ id:s.id, label:s.name })), () => S.stock, v => S.stock = v);
  buildSet($('#setRush'),  [{ id:false, label:'7 days' }, { id:true, label:'Rush 3 days' }],
    () => S.rush, v => S.rush = v);
}
function quote() {
  const passes = S.order.length;
  const size = SIZES.find(s => s.id === S.size);
  const run  = RUNS.find(r => r.id === S.run);
  const st   = STOCKS.find(s => s.id === S.stock);
  const masters = passes * MASTER;
  const inkc    = S.run * passes * run.rate * size.mult;
  const paper   = passes ? S.run * st.add * size.mult : 0;
  let total = masters + inkc + paper;
  if (S.rush) total *= 1.25;
  return { passes, masters, inkc, paper, total, per: passes ? total / S.run : 0, size, run, st };
}
/* ═══ 5 · readouts ════════════════════════════════════════════════════ */
const NUM = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];
const COL = { 0:'No', 1:'One', 3:'Three', 7:'Seven', 15:'Fifteen', 31:'Thirty-one', 63:'Sixty-three' };
const money = n => '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
let shown = 120.90, tween = 0;
function tick(target) {
  cancelAnimationFrame(tween);
  if (reduce) { shown = target; $('#price').textContent = money(shown); return; }
  const from = shown, t0 = performance.now();
  const step = now => {
    const k = clamp((now - t0) / 420, 0, 1);
    shown = from + (target - from) * (1 - Math.pow(1 - k, 3));
    $('#price').textContent = money(shown);
    if (k < 1) tween = requestAnimationFrame(step);
  };
  tween = requestAnimationFrame(step);
}
function bump(el) {
  if (reduce) return;
  el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  setTimeout(() => el.classList.remove('bump'), 520);
}
let lastPasses = -1;
function update() {
  const q = quote();
  const colours = q.passes ? Math.pow(2, q.passes) - 1 : 0;
  const iw = $('#inkWord'), cw = $('#colWord');
  iw.textContent = NUM[q.passes];
  cw.textContent = COL[colours] ?? colours;
  if (q.passes !== lastPasses) { bump(iw); bump(cw); lastPasses = q.passes; }
  $('#slugPass').textContent  = q.passes;
  $('#slugSize').textContent  = q.size.label;
  $('#slugStock').textContent = `${q.st.name} ${q.st.gsm}`;
  runSheet(q);
  overlaps();
  $('#quoteLine').textContent =
    `${q.passes} pass${q.passes === 1 ? '' : 'es'} · ${q.size.label} · ${q.run.label}`;
  tick(q.total);
  $('#working').textContent = q.passes
    ? `${money(q.masters)} masters · ${money(q.inkc + q.paper)} ink & paper${S.rush ? ' · +25% rush' : ''} · ${money(q.per)} a copy`
    : 'no passes — nothing prints';
  document.title = q.passes
    ? `CHROMA — ${q.passes} pass${q.passes === 1 ? '' : 'es'}, ${money(q.total)}`
    : 'CHROMA — risograph print studio, Brunswick';
}
/* the claim in the headline, made checkable: n passes give 2^n - 1 colours
   because every SUBSET of the inks that share a spot prints its own mix.
   These chips are the real multiply, computed the same way the sheet is. */
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const hx  = (...v) => '#' + v.map(n => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0')).join('');
/* run the same composite the canvas runs: start from the chosen paper and
   multiply each pass onto it at that pass's opacity. Doing it as a plain
   ink-times-ink multiply gave chips much darker than the sheet they claim
   to describe — the paper and the 0.9 ink opacity are both part of it. */
function overprint(ids) {
  const paper = STOCKS.find(s => s.id === S.stock).hex;
  let [r, g, b] = rgb(paper);
  ids.forEach(id => {
    const a = 0.90 + S.order.indexOf(id) * 0.015;
    const [ir, ig, ib] = rgb(BY[id].hex);
    r += (r * ir / 255 - r) * a;
    g += (g * ig / 255 - g) * a;
    b += (b * ib / 255 - b) * a;
  });
  return hx(r, g, b);
}
function overlaps() {
  const el = $('#mixes');
  el.textContent = '';
  const ids = S.order;
  const combos = [];
  for (let m = 1; m < (1 << ids.length); m++) {
    const pick = ids.filter((_, i) => m & (1 << i));
    if (pick.length > 1) combos.push(pick);
  }
  combos.sort((a, b) => a.length - b.length);
  const CAP = 21;
  combos.slice(0, CAP).forEach(pick => {
    const hex = overprint(pick);
    const s = document.createElement('span');
    s.style.setProperty('--c', hex);
    s.title = pick.map(id => BY[id].name).join(' + ');
    s.setAttribute('aria-label', s.title);
    el.append(s);
  });
  const n = ids.length;
  const more = combos.length > CAP ? ` — ${CAP} shown` : '';
  $('#mixnote').textContent = n
    ? `${n} ink${n === 1 ? '' : 's'} + ${combos.length} overlap${combos.length === 1 ? '' : 's'} = ${Math.pow(2, n) - 1} colours${more}`
    : 'nothing on the drum';
}
/* what accumulates: the passes you have chosen, in the order they go on */
function runSheet(q) {
  const el = $('#runsheet');
  el.textContent = '';
  if (!q.passes) {
    const p = document.createElement('li');
    p.className = 'runsheet__none';
    p.textContent = 'Empty — no ink on the drum';
    el.append(p);
    return;
  }
  S.order.forEach((id, i) => {
    const k = BY[id];
    const li = document.createElement('li');
    li.style.setProperty('--c', k.hex);
    li.innerHTML = `<i></i>${String(i + 1).padStart(2, '0')} ${k.name}` +
      `<s>${money(MASTER + S.run * q.run.rate * q.size.mult)}</s>`;
    el.append(li);
  });
  const tot = document.createElement('li');
  tot.innerHTML = `<i style="--c:transparent"></i>Total<s style="opacity:1">${money(q.total)}</s>`;
  el.append(tot);
}
const hint = $('#hint');
let hintTimer = 0;
const HINT = 'Drag an ink across the sheet — where two land, they multiply';
function say(msg) {
  hint.textContent = msg;
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => { hint.textContent = HINT; }, 2600);
}
/* ═══ 6 · the written sections ════════════════════════════════════════ */
function buildInkList() {
  const wrap = $('#inkList');
  INKS.forEach((k, n) => {
    const o = BY[k.over];
    const row = document.createElement('div');
    row.className = 'inkrow';
    row.style.setProperty('--c', k.hex);
    row.innerHTML =
      `<span class="inkrow__no">${String(n + 1).padStart(2, '0')}</span>` +
      `<span class="inkrow__name">${k.name}</span>` +
      `<span class="inkrow__code">${k.code}</span>` +
      `<span class="cov" aria-label="coverage 100, 70 and 40 per cent"><span></span><span></span><span></span></span>` +
      `<span class="over"><span class="over__cap">over ${o.name}</span>` +
      `<span class="mix" style="--a:${k.hex};--b:${o.hex}"><i></i><i></i></span></span>`;
    wrap.append(row);
  });
}
function buildStockList() {
  const wrap = $('#stockList');
  STOCKS.forEach(s => {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML =
      `<span class="row__k"><span class="chip" style="--c:${s.hex}"></span> ${s.name}</span>` +
      `<span class="mono">${s.gsm} gsm</span>` +
      `<span class="row__n mono muted">${s.add ? '+' + s.add.toFixed(2) + ' a copy' : 'included'}</span>`;
    wrap.append(row);
  });
}
/* ═══ 7 · go ══════════════════════════════════════════════════════════ */
$('#reg').addEventListener('input', e => {
  S.regmm = +e.target.value;
  $('#regV').textContent = S.regmm.toFixed(1);
});
drawRail();
drawSets();
buildInkList();
buildStockList();
resize();
update();
$('#price').textContent = money(shown);
if (window.ResizeObserver) new ResizeObserver(resize).observe(bed);
else window.addEventListener('resize', resize);
requestAnimationFrame(paint);
})();
