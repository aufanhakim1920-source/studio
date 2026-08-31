(() => {
  'use strict';

  const MONTH_NAMES = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

  const fmtMonth = (m) => {
    const [y, mm] = m.split('-');
    return `${MONTH_NAMES[Number(mm) - 1]} '${y.slice(2)}`;
  };
  const fmtRevenue = (rev) => `£${(rev / 1e6).toFixed(2)}M`;
  const fmtOrders = (n) => n.toLocaleString('en-GB');
  const fmtAov = (n) => `£${Math.round(n).toLocaleString('en-GB')}`;

  const $ = (sel) => document.querySelector(sel);

  fetch('data.json')
    .then((r) => r.json())
    .then(init)
    .catch((err) => {
      console.error('data.json failed to load', err);
      const readout = $('#readout');
      if (readout) readout.innerHTML = '<p style="color:#FF6E6E;font-family:monospace;font-size:12px">Data failed to load.</p>';
    });

  function init(data) {
    // ---- derive month rows: revenue, orders, aov, delta vs prior, flags ----
    const lastYM = data.lastDate.slice(0, 7);
    const lastDay = Number(data.lastDate.slice(8, 10));
    const isPartial = (m) => m.m === lastYM && lastDay < 25;

    const months = data.months.map((m, i) => {
      const prev = data.months[i - 1] || null;
      const aov = m.rev / m.orders;
      const partial = isPartial(m);
      let deltaPct = null;
      if (prev && !partial) deltaPct = ((m.rev - prev.rev) / prev.rev) * 100;
      return { ...m, aov, partial, deltaPct, first: i === 0 };
    });

    const revenues = months.map((m) => m.rev);
    const maxRev = Math.max(...revenues);
    const minRev = Math.min(...revenues);
    const peakIndex = revenues.indexOf(maxRev);
    const lowIndex = revenues.indexOf(minRev);

    const MIN_PCT = 15;
    const MAX_PCT = 94;
    const heightPct = (rev) =>
      MIN_PCT + ((rev - minRev) / (maxRev - minRev)) * (MAX_PCT - MIN_PCT);

    // ---- build the skyline ----
    const city = $('#city');
    const buildings = [];

    months.forEach((m, i) => {
      const plot = document.createElement('div');
      plot.className = 'plot';

      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'building' + (m.partial ? ' partial' : '');
      b.style.setProperty('--h', heightPct(m.rev).toFixed(1) + '%');
      b.setAttribute('aria-label', `${fmtMonth(m.m)}, ${fmtRevenue(m.rev)}${m.partial ? ', partial month' : ''}`);

      const front = document.createElement('span');
      front.className = 'face front';
      const top = document.createElement('span');
      top.className = 'face top';
      const side = document.createElement('span');
      side.className = 'face side';

      b.append(front, top, side);
      b.addEventListener('click', () => selectMonth(i, { snap: true }));
      plot.appendChild(b);
      city.appendChild(plot);
      buildings.push(b);
    });

    // ---- tick ring (static bezel, 13 ticks) ----
    const ring = $('#tickRing');
    const segDeg = 360 / months.length;
    const ticks = [];
    months.forEach((m, i) => {
      const t = document.createElement('span');
      t.className = 't';
      t.style.transform = `rotate(${i * segDeg}deg)`;
      ring.appendChild(t);
      ticks.push(t);
    });

    // ---- state ----
    const dial = $('#dial');
    const rotator = $('#dialRotator');
    const led = $('#led');
    const rMonth = $('#rMonth');
    const rBadge = $('#rBadge');
    const rValue = $('#rValue');
    const rDelta = $('#rDelta');
    const rOrders = $('#rOrders');
    const rAov = $('#rAov');

    let currentIndex = -1;

    function angleForIndex(i) {
      return i * segDeg;
    }

    function setRotatorAngle(deg, animated) {
      rotator.style.transition = animated ? 'transform 0.5s var(--ease)' : 'none';
      rotator.style.setProperty('--rotation', `${deg}deg`);
    }

    function pulseLed() {
      led.classList.remove('pulse');
      void led.offsetWidth; // restart the animation
      led.classList.add('pulse');
    }

    function selectMonth(i, opts = {}) {
      if (i === currentIndex) return;
      const wasSet = currentIndex !== -1;
      currentIndex = i;
      const m = months[i];

      buildings.forEach((b, idx) => b.classList.toggle('selected', idx === i));
      ticks.forEach((t, idx) => t.classList.toggle('lit', idx === i));

      if (opts.snap) setRotatorAngle(angleForIndex(i), true);
      dial.setAttribute('aria-valuenow', String(i + 1));

      rMonth.textContent = fmtMonth(m.m);
      rValue.textContent = fmtRevenue(m.rev);
      rOrders.textContent = fmtOrders(m.orders);
      rAov.textContent = fmtAov(m.aov);

      if (i === peakIndex) {
        rBadge.hidden = false;
        rBadge.textContent = 'PEAK';
        rBadge.className = 'badge';
      } else if (i === lowIndex) {
        rBadge.hidden = false;
        rBadge.textContent = 'LOW';
        rBadge.className = 'badge low';
      } else if (m.partial) {
        rBadge.hidden = false;
        rBadge.textContent = 'PARTIAL';
        rBadge.className = 'badge partial';
      } else {
        rBadge.hidden = true;
      }

      if (m.partial) {
        rDelta.textContent = `9 days only — not comparable`;
        rDelta.className = 'delta flat';
      } else if (m.first) {
        rDelta.textContent = `first month on record`;
        rDelta.className = 'delta flat';
      } else {
        const d = m.deltaPct;
        const arrow = d >= 0 ? '▲' : '▼';
        rDelta.textContent = `${arrow} ${Math.abs(d).toFixed(1)}% vs prior month`;
        rDelta.className = 'delta ' + (d > 0.4 ? 'up' : d < -0.4 ? 'down' : 'flat');
      }

      if (wasSet) pulseLed();
    }

    // ---- dial drag (pointer events, unified mouse+touch) ----
    let dragging = false;
    let startAngle = 0;
    let rotation = 0;

    function pointerAngle(e, el) {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      return Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
    }

    dial.addEventListener('pointerdown', (e) => {
      dragging = true;
      dial.setPointerCapture(e.pointerId);
      startAngle = pointerAngle(e, dial) - rotation;
      setRotatorAngle(rotation, false);
    });

    dial.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      rotation = pointerAngle(e, dial) - startAngle;
      setRotatorAngle(rotation, false);
      let norm = rotation % 360;
      if (norm < 0) norm += 360;
      const idx = Math.round(norm / segDeg) % months.length;
      if (idx !== currentIndex) selectMonth(idx);
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      // snap the knob exactly onto the selected month's angle
      rotation = angleForIndex(currentIndex);
      setRotatorAngle(rotation, true);
    }
    dial.addEventListener('pointerup', endDrag);
    dial.addEventListener('pointercancel', endDrag);

    dial.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        const next = (currentIndex + 1) % months.length;
        rotation = angleForIndex(next);
        selectMonth(next, { snap: true });
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        const next = (currentIndex - 1 + months.length) % months.length;
        rotation = angleForIndex(next);
        selectMonth(next, { snap: true });
      }
    });

    // ---- initial state: land on the peak, no drama, no autoplay ----
    rotation = angleForIndex(peakIndex);
    setRotatorAngle(rotation, false);
    selectMonth(peakIndex, { snap: false });

    // ---- plaque ----
    const plaque = $('#plaque');
    if (plaque) {
      const rest = (100 - data.homeShare).toFixed(1);
      plaque.innerHTML =
        `${data.kpi.countries} MARKETS <span class="dim">·</span> ` +
        `UK ${data.homeShare}% <span class="dim">/</span> REST OF WORLD ${rest}% ` +
        `<span class="dim">·</span> ${fmtRevenue(data.kpi.revenue)} TOTAL`;
    }

    // ---- findings: pulled verbatim from the data, not invented ----
    const grid = $('#findingGrid');
    if (grid && Array.isArray(data.findings)) {
      const wanted = [
        (f) => /one country/i.test(f.headline),
        (f) => /2\.9x/i.test(f.headline),
      ];
      wanted.forEach((match) => {
        const f = data.findings.find(match);
        if (!f) return;
        const card = document.createElement('article');
        card.className = 'finding';
        const stat = f.headline.match(/[\d.]+[x%]/i);
        const h2 = document.createElement('h2');
        h2.textContent = stat ? stat[0].toUpperCase() : f.headline;
        const p = document.createElement('p');
        p.textContent = f.detail;
        card.append(h2, p);
        grid.appendChild(card);
      });
    }
  }
})();
