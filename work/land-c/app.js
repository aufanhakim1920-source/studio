(() => {
  'use strict';

  /* ==========================================================================
     THE DISH — a bounded Gray–Scott reaction-diffusion run, triggered by
     the visitor. 50 shifts are "posted" at once: 47 are seeded and grow
     into colonies over ~2 seconds, then the run stops for good. The other
     3 are never seeded and are actively kept clear every step — a
     deliberate quarantine, not a hope the physics cooperates.

     Why: per the vault's own dashboard lesson, Gray–Scott has a preferred
     wavelength and forgets its seed size — it does NOT reliably conserve
     an exact percentage of area. It conserves spot COUNT. So the 6% here
     is encoded as 3 of 50 spots that are simply never grown, guaranteed
     by construction — not left to emergent coverage math nobody can
     verify by eye. The growth itself (the 47) is left to run free within
     its bounded frame budget, because that part only needs to look alive.
     ========================================================================== */

  const GRID = 100;
  const F = 0.0545, K = 0.062, DA = 1.0, DB = 0.5, DT = 1.0;
  const THRESH = 0.28;
  const SUBSTEPS_PER_FRAME = 6;
  const MAX_FRAMES = 130;
  const TOTAL_SEEDS = 50;
  const GAP_COUNT = 3;
  const QUARANTINE_R = 4;

  const INK = [21, 19, 15];
  const CREAM = [251, 250, 245];

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const canvas = document.getElementById('dish-canvas');
  const runBtn = document.getElementById('dish-run');
  const caption = document.getElementById('dish-caption');
  const markersHost = document.getElementById('dish-markers');
  const dishFrame = canvas ? canvas.closest('.dish-frame') : null;

  if (canvas && runBtn && caption && markersHost) {
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
    let hasRun = false;
    let rafId = null;

    paintBlank();

    runBtn.addEventListener('click', () => {
      if (running) return;
      startRun();
    });

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

    function setupRun() {
      u.fill(1); v.fill(0);
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
        if (gapIdx.has(i) && gapSeeds.length < GAP_COUNT) {
          gapSeeds.push(s);
        } else {
          growSeeds.push(s);
        }
      });
      // if rounding left us short of GAP_COUNT gaps, pull from the end of growSeeds
      while (gapSeeds.length < GAP_COUNT && growSeeds.length) {
        gapSeeds.push(growSeeds.pop());
      }
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
      setupRun();

      if (reduceMotion) {
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
          finishRun();
        }
      };
      rafId = requestAnimationFrame(tick);
    }

    function finishRun() {
      running = false;
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
          markersHost.querySelectorAll('.gap-tip').forEach(t => { t.hidden = true; });
          markersHost.querySelectorAll('.gap-marker').forEach(m => m.setAttribute('aria-expanded', 'false'));
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

  /* ---------- static dot row in the honest-limitation section ---------- */
  const dotRow = document.getElementById('dot-row');
  if (dotRow) {
    const TOTAL = 50;
    const emptyAt = new Set([7, 24, 41]);
    const frag = document.createDocumentFragment();
    for (let i = 0; i < TOTAL; i++) {
      const d = document.createElement('span');
      d.className = 'dot-item' + (emptyAt.has(i) ? ' empty' : '');
      frag.appendChild(d);
    }
    dotRow.appendChild(frag);
  }
})();
