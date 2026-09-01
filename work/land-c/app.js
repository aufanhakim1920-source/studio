(() => {
  'use strict';

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ==========================================================================
     PART 1 — ENTRANCES

     Built to the two measured failure modes in
     "How to Animate a Page Without Breaking It":

       Rule 1 · nothing is hidden by the stylesheet alone. The `.motion` class
                below is added by THIS script; every hiding rule is scoped to
                it. If this file never loads, the page renders complete.
       Rule 2 · reveal runs off a rAF-throttled scroll sweep, not
                IntersectionObserver — IO is asynchronous and gets outrun by
                fast scrolls and the two in-page anchor jumps this page has
                (#how, #pricing), which is exactly how an element ends up
                stranded at opacity 0.
       Rule 3 · counters sit in the HTML at their FINAL value and are only
                interpolated towards.
       Rule 4 · one shot each, then the page is completely still. Nothing loops.

     Individual moves sit inside the measured 0.1–0.3s band
     (What the References Have in Common §12: 0.1s dominates, 0.3s is the
     slow end). Only the STAGGER extends the total.
     ========================================================================== */

  const STAGGER_STEP = 45;   // ms between siblings in one section
  const STAGGER_CAP  = 10;   // never delay past ~450ms

  if (!REDUCED) document.documentElement.classList.add('motion');

  /* ---- character resolve -------------------------------------------------
     Ordered-drum walk, taken from Split Flap Departure Board's #1 upgrade
     ("biggest perceived-quality jump per line of code"): step forward through
     the alphabet towards the target so each character visibly ARRIVES rather
     than landing out of noise. The drum is split by character class — that
     note's own "what real content forced" finding — so a letter never wanders
     through digits on its way.

     Reskinned for this page: no tiles, no scaleY squash. On light stock the
     flap's mechanism becomes INK DENSITY — the glyph resolves faint and
     settles to full ink, like a label being stamped onto a specimen card.
     -------------------------------------------------------------------- */
  const DRUM_LOWER = 'abcdefghijklmnopqrstuvwxyz';
  const DRUM_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const DRUM_NUM   = '0123456789';
  const drumFor = (c) =>
    /[a-z]/.test(c) ? DRUM_LOWER : /[A-Z]/.test(c) ? DRUM_UPPER : /[0-9]/.test(c) ? DRUM_NUM : null;

  function splitChars(el) {
    const src = Array.from(el.childNodes);
    const chars = [];
    el.textContent = '';
    for (const node of src) {
      if (node.nodeType === Node.TEXT_NODE) {
        for (const c of node.textContent) {
          if (c === ' ' || c === '\n') { el.appendChild(document.createTextNode(' ')); continue; }
          const s = document.createElement('span');
          s.className = 'ch';
          s.textContent = c;
          el.appendChild(s);
          chars.push(s);
        }
      } else {
        el.appendChild(node);
      }
    }
    return chars;
  }

  function resolveChars(chars) {
    const stagger = chars.length > 30 ? 28 : 38;
    chars.forEach((s, i) => {
      const target = s.textContent;
      const drum = drumFor(target);
      const at = i * stagger;
      if (!drum) { setTimeout(() => s.classList.add('in'), at); return; }
      const ti = drum.indexOf(target);
      const steps = 4 + Math.floor(Math.random() * 4);   // 4–7 × 40ms = 160–280ms
      setTimeout(() => {
        s.classList.add('live');
        let k = 0;
        const id = setInterval(() => {
          k++;
          s.textContent = drum[(ti - steps + k + drum.length * 2) % drum.length];
          if (k >= steps) {
            clearInterval(id);
            s.textContent = target;
            s.classList.remove('live');
            s.classList.add('in');
          }
        }, 40);
      }, at);
    });
  }

  /* ---- count-up (rule 3: the HTML already holds the final value) -------- */
  function countUp(el) {
    const target = Number(el.dataset.count);
    if (!Number.isFinite(target)) return;
    const dur = 520, t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      if (p < 1) {
        el.textContent = Math.round(target * e).toLocaleString('en-US');
        requestAnimationFrame(tick);
      } else {
        el.textContent = target.toLocaleString('en-US');   // settles exact, then stops
      }
    };
    requestAnimationFrame(tick);
  }

  /* ---- the sweep -------------------------------------------------------- */
  if (!REDUCED) {
    const pending = [];

    // group-relative stagger: index within the nearest .row
    const groups = new Map();
    document.querySelectorAll('[data-rise],[data-stamp],[data-draw],[data-mark],[data-rule]')
      .forEach((el) => {
        const row = el.closest('.row') || document.body;
        const n = groups.get(row) || 0;
        groups.set(row, n + 1);
        pending.push({ el, delay: Math.min(n, STAGGER_CAP) * STAGGER_STEP + (el.hasAttribute('data-mark') ? 140 : 0) });
      });

    document.querySelectorAll('[data-resolve]').forEach((el) => {
      pending.push({ el, chars: splitChars(el) });
    });
    document.querySelectorAll('[data-count]').forEach((el) => pending.push({ el, count: true }));
    document.querySelectorAll('[data-plate]').forEach((el) => pending.push({ el, plate: true }));

    const fire = (item) => {
      if (item.chars) { resolveChars(item.chars); return; }
      if (item.count) { countUp(item.el); return; }
      if (item.plate) {
        const dots = item.el.querySelectorAll('circle');
        dots.forEach((d, i) => setTimeout(() => d.classList.add('in'), i * 16));
        return;
      }
      if (item.delay) {
        item.el.style.transitionDelay = item.delay + 'ms';
        setTimeout(() => { item.el.style.transitionDelay = ''; }, item.delay + 700);
      }
      item.el.classList.add('in');
    };

    let queued = false;
    function sweep() {
      queued = false;
      const line = window.innerHeight * 0.94;
      for (let i = pending.length - 1; i >= 0; i--) {
        // `top < line` ONLY. ⚠️ An extra `bottom > -200` guard was tried here and
        // is wrong: anything the visitor scrolls or anchor-jumps clean past sits
        // above the viewport with a negative bottom, never fires, and is stranded
        // at opacity 0 forever. Measured — it stranded 31 elements on a slow
        // read-through at 1440 and 29 on a phone flick.
        if (pending[i].el.getBoundingClientRect().top < line) {
          fire(pending[i]);
          pending.splice(i, 1);
        }
      }
      if (!pending.length) window.removeEventListener('scroll', ping);
    }
    const ping = () => { if (!queued) { queued = true; requestAnimationFrame(sweep); } };
    window.addEventListener('scroll', ping, { passive: true });
    window.addEventListener('resize', ping, { passive: true });
    sweep();                       // catch everything above the fold on load
  }

  /* ==========================================================================
     PART 2 — THE DISH

     A bounded Gray–Scott reaction-diffusion run, triggered by the visitor.
     50 shifts are "posted" at once: 47 are seeded and grow into colonies over
     ~2 seconds, then the run stops for good. The other 3 are never seeded and
     are actively kept clear every step — a deliberate quarantine, not a hope
     that the physics cooperates.

     Why: Gray–Scott has a preferred wavelength and forgets its seed size — it
     does NOT reliably conserve an exact percentage of area. It conserves spot
     COUNT. So the 6% is encoded as 3 of 50 spots that are simply never grown,
     guaranteed by construction.

     ⚠️ The run is CLICK-ONLY and FREEZES. `MAX_FRAMES` bounds it; `finishRun`
     drops the rAF handle and nothing re-arms it. Do not add a loop here.
     ========================================================================== */

  const GRID = 100;
  const F = 0.0545, K = 0.062, DA = 1.0, DB = 0.5, DT = 1.0;
  const THRESH = 0.28;
  const SUBSTEPS_PER_FRAME = 6;
  const MAX_FRAMES = 130;
  const TOTAL_SEEDS = 50;
  const GAP_COUNT = 3;
  const QUARANTINE_R = 4;
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const INK = [21, 19, 15];
  const CREAM = [251, 250, 245];

  const canvas = document.getElementById('dish-canvas');
  const runBtn = document.getElementById('dish-run');
  const caption = document.getElementById('dish-caption');
  const markersHost = document.getElementById('dish-markers');
  const tickHost = document.getElementById('grat-ticks');
  const seedHost = document.getElementById('grat-seeds');

  /* --- the graticule: rim gradations, so the resting plate reads as an
         instrument rather than an empty div. Static, drawn once. --------- */
  if (tickHost) {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2 - Math.PI / 2;
      const major = i % 3 === 0;
      const r1 = 94, r2 = major ? 83 : 88.5;
      const ln = document.createElementNS(SVG_NS, 'line');
      ln.setAttribute('x1', (100 + Math.cos(a) * r1).toFixed(2));
      ln.setAttribute('y1', (100 + Math.sin(a) * r1).toFixed(2));
      ln.setAttribute('x2', (100 + Math.cos(a) * r2).toFixed(2));
      ln.setAttribute('y2', (100 + Math.sin(a) * r2).toFixed(2));
      if (major) ln.setAttribute('class', 'major');
      frag.appendChild(ln);
    }
    tickHost.appendChild(frag);
  }

  if (canvas && runBtn && caption && markersHost && seedHost) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const img = ctx.createImageData(GRID, GRID);
    const pixels = img.data;

    let u = new Float32Array(GRID * GRID).fill(1);
    let v = new Float32Array(GRID * GRID).fill(0);
    let u2 = new Float32Array(GRID * GRID);
    let v2 = new Float32Array(GRID * GRID);

    let growSeeds = [];
    let gapSeeds = [];
    let running = false;
    let busy = false;
    let hasRun = false;
    let rafId = null;

    prepare(false);

    runBtn.addEventListener('click', () => {
      if (busy) return;
      busy = true;
      if (!hasRun) { startRun(); return; }
      // a second press posts a FRESH plate: 50 new specks land, then they grow.
      prepare(true);
      runBtn.disabled = true;
      runBtn.textContent = 'Posting…';
      caption.textContent = 'Posting 50 new shifts to a clean plate…';
      if (REDUCED) startRun();
      else setTimeout(startRun, 420);      // one-shot, not a loop
    });

    /* ---- resting state: 50 posted shifts sitting on a graduated plate ---- */
    function prepare(reseed) {
      if (reseed || !growSeeds.length) pickAndSplit();
      u.fill(1); v.fill(0);
      paintBlank();
      clearMarkers();
      renderSpecks();
    }

    function renderSpecks() {
      seedHost.innerHTML = '';
      seedHost.classList.remove('is-out');
      const all = growSeeds.concat(gapSeeds);
      const frag = document.createDocumentFragment();
      all.forEach((s) => {
        const c = document.createElementNS(SVG_NS, 'circle');
        c.setAttribute('cx', (s.x / GRID * 200).toFixed(2));
        c.setAttribute('cy', (s.y / GRID * 200).toFixed(2));
        c.setAttribute('r', '1.9');
        frag.appendChild(c);
      });
      seedHost.appendChild(frag);
      if (!REDUCED) {
        const dots = seedHost.querySelectorAll('circle');
        dots.forEach((d, i) => setTimeout(() => d.classList.add('in'), i * 12));
      }
    }

    function paintBlank() {
      for (let i = 0; i < GRID * GRID; i++) {
        const px = i * 4;
        pixels[px] = CREAM[0]; pixels[px + 1] = CREAM[1]; pixels[px + 2] = CREAM[2]; pixels[px + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    }

    function pickSeeds() {
      const seeds = [];
      const cx = GRID / 2, cy = GRID / 2;
      const R = GRID * 0.42;
      const minDist = GRID * 0.075;
      let tries = 0;
      while (seeds.length < TOTAL_SEEDS && tries < 6000) {
        tries++;
        const x = Math.floor(cx + (Math.random() * 2 - 1) * R);
        const y = Math.floor(cy + (Math.random() * 2 - 1) * R);
        if (x < 2 || y < 2 || x >= GRID - 2 || y >= GRID - 2) continue;
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy > R * R) continue;
        let ok = true;
        for (const s of seeds) {
          const ddx = s.x - x, ddy = s.y - y;
          if (ddx * ddx + ddy * ddy < minDist * minDist) { ok = false; break; }
        }
        if (ok) seeds.push({ x, y });
      }
      return seeds;
    }

    function pickAndSplit() {
      const seeds = pickSeeds();
      const len = seeds.length;
      const gapIdx = new Set([
        Math.min(len - 1, Math.floor(len * 0.14)),
        Math.min(len - 1, Math.floor(len * 0.5)),
        Math.min(len - 1, Math.floor(len * 0.83)),
      ]);
      growSeeds = [];
      gapSeeds = [];
      seeds.forEach((s, i) => {
        if (gapIdx.has(i) && gapSeeds.length < GAP_COUNT) gapSeeds.push(s);
        else growSeeds.push(s);
      });
      // if rounding left us short of GAP_COUNT gaps, pull from the end of growSeeds
      while (gapSeeds.length < GAP_COUNT && growSeeds.length) gapSeeds.push(growSeeds.pop());
    }

    function setupRun() {
      u.fill(1); v.fill(0);
      for (const s of growSeeds) seedBlob(s.x, s.y, 2);
    }

    function seedBlob(cx, cy, r) {
      for (let y = -r; y <= r; y++) {
        for (let x = -r; x <= r; x++) {
          if (x * x + y * y > r * r) continue;
          const gx = cx + x, gy = cy + y;
          if (gx < 0 || gy < 0 || gx >= GRID || gy >= GRID) continue;
          v[gy * GRID + gx] = 1;
        }
      }
    }

    function quarantineGaps() {
      for (const s of gapSeeds) {
        for (let y = -QUARANTINE_R; y <= QUARANTINE_R; y++) {
          for (let x = -QUARANTINE_R; x <= QUARANTINE_R; x++) {
            if (x * x + y * y > QUARANTINE_R * QUARANTINE_R) continue;
            const gx = s.x + x, gy = s.y + y;
            if (gx < 0 || gy < 0 || gx >= GRID || gy >= GRID) continue;
            const i = gy * GRID + gx;
            v[i] = 0; u[i] = 1;
          }
        }
      }
    }

    function step(n) {
      for (let s = 0; s < n; s++) {
        for (let y = 0; y < GRID; y++) {
          const ym1 = y === 0 ? GRID - 1 : y - 1;
          const yp1 = y === GRID - 1 ? 0 : y + 1;
          const rowC = y * GRID, rowN = ym1 * GRID, rowS = yp1 * GRID;
          for (let x = 0; x < GRID; x++) {
            const xm1 = x === 0 ? GRID - 1 : x - 1;
            const xp1 = x === GRID - 1 ? 0 : x + 1;
            const i = rowC + x;
            const a = u[i], b = v[i];
            const lapU = 0.2 * (u[rowN + x] + u[rowS + x] + u[rowC + xp1] + u[rowC + xm1])
                       + 0.05 * (u[rowN + xp1] + u[rowN + xm1] + u[rowS + xp1] + u[rowS + xm1])
                       - a;
            const lapV = 0.2 * (v[rowN + x] + v[rowS + x] + v[rowC + xp1] + v[rowC + xm1])
                       + 0.05 * (v[rowN + xp1] + v[rowN + xm1] + v[rowS + xp1] + v[rowS + xm1])
                       - b;
            const abb = a * b * b;
            u2[i] = a + (DA * lapU - abb + F * (1 - a)) * DT;
            v2[i] = b + (DB * lapV + abb - (K + F) * b) * DT;
          }
        }
        let t = u; u = u2; u2 = t;
        t = v; v = v2; v2 = t;
        quarantineGaps();
      }
    }

    function render() {
      for (let i = 0; i < GRID * GRID; i++) {
        const val = v[i] > THRESH;
        const px = i * 4;
        const c = val ? INK : CREAM;
        pixels[px] = c[0]; pixels[px + 1] = c[1]; pixels[px + 2] = c[2]; pixels[px + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    }

    function startRun() {
      running = true;
      runBtn.disabled = true;
      runBtn.textContent = 'Growing…';
      clearMarkers();
      caption.textContent = 'Growing colonies from 50 posted shifts…';
      seedHost.classList.add('is-out');
      setupRun();

      if (REDUCED) {
        step(SUBSTEPS_PER_FRAME * MAX_FRAMES);
        render();
        finishRun();
        return;
      }

      let frame = 0;
      const tick = () => {
        step(SUBSTEPS_PER_FRAME);
        render();
        frame++;
        if (frame < MAX_FRAMES) {
          rafId = requestAnimationFrame(tick);
        } else {
          finishRun();               // ← the run ends here and nothing re-arms it
        }
      };
      rafId = requestAnimationFrame(tick);
    }

    function finishRun() {
      running = false;
      busy = false;
      hasRun = true;
      rafId = null;
      runBtn.disabled = false;
      runBtn.textContent = 'Run it again';
      caption.textContent = `${growSeeds.length} filled. ${gapSeeds.length} didn’t — nobody was free. That’s 6%.`;
      placeMarkers();
    }

    function clearMarkers() {
      markersHost.innerHTML = '';
    }

    function placeMarkers() {
      clearMarkers();
      const stories = [
        'Posted Thursday, 4pm. Nobody confirmed. Still open.',
        'Posted for a Friday night. No one in the pool was free.',
        'Posted with two days’ notice. No match came in.',
      ];
      gapSeeds.forEach((s, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'gap-marker';
        btn.style.left = (s.x / GRID * 100) + '%';
        btn.style.top = (s.y / GRID * 100) + '%';
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-label', 'Unfilled shift — nobody was free. Read why.');

        const tip = document.createElement('span');
        tip.className = 'gap-tip';
        tip.hidden = true;
        tip.textContent = stories[idx % stories.length];
        btn.appendChild(tip);

        btn.addEventListener('click', () => {
          const open = btn.getAttribute('aria-expanded') === 'true';
          markersHost.querySelectorAll('.gap-tip').forEach((t) => { t.hidden = true; });
          markersHost.querySelectorAll('.gap-marker').forEach((m) => m.setAttribute('aria-expanded', 'false'));
          if (!open) {
            tip.hidden = false;
            btn.setAttribute('aria-expanded', 'true');
          }
        });

        markersHost.appendChild(btn);
        requestAnimationFrame(() => btn.classList.add('visible'));
      });
    }
  }
})();
