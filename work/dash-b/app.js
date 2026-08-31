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
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Short market codes so a bar's label stays one token. The full name always
  // survives in the mark's aria-label.
  const SHORT = { 'United Kingdom': 'UK', 'Netherlands': 'NL', 'Germany': 'DE', 'France': 'FR', 'Australia': 'AU', 'Spain': 'ES' };
  const shortName = (n) => SHORT[n] || n;

  // A row of tiny towers — the same object as the skyline, shrunk to a mark.
  // Used wherever a sentence used to describe a shape.
  function microBars(vals, aria) {
    const max = Math.max(...vals);
    return (
      '<div class="microbars" role="img" aria-label="' + esc(aria) + '">' +
      vals.map((v) => '<span class="microbars__b" style="height:' + Math.max((v / max) * 100, 7).toFixed(1) + '%"></span>').join('') +
      '</div>'
    );
  }

  // A labelled comparison bar: label · track · value. Replaces a clause.
  function compareBar(label, pctOfMax, valueText, aria, mod) {
    return (
      '<div class="fbar' + (mod ? ' ' + mod : '') + '">' +
      '<span class="fbar__lab">' + esc(label) + '</span>' +
      '<span class="fbar__track" role="img" aria-label="' + esc(aria) + '">' +
      '<span class="fbar__fill" style="width:' + Math.max(pctOfMax, 2).toFixed(1) + '%"></span></span>' +
      '<span class="fbar__n">' + esc(valueText) + '</span>' +
      '</div>'
    );
  }

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

      // The chip is read as an image so the words it dropped ("vs prior month")
      // are still announced — they just are not printed.
      rDelta.setAttribute('role', 'img');
      if (m.partial) {
        rDelta.textContent = `9 DAYS`;
        rDelta.setAttribute('aria-label', 'Nine days of data only — not comparable to a full month');
        rDelta.className = 'delta flat';
      } else if (m.first) {
        rDelta.textContent = `FIRST`;
        rDelta.setAttribute('aria-label', 'First month on record — no prior month to compare against');
        rDelta.className = 'delta flat';
      } else {
        const d = m.deltaPct;
        const arrow = d >= 0 ? '▲' : '▼';
        rDelta.textContent = `${arrow} ${Math.abs(d).toFixed(1)}%`;
        rDelta.setAttribute('aria-label', `${d >= 0 ? 'Up' : 'Down'} ${Math.abs(d).toFixed(1)} percent versus the prior month`);
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

    // ---- year totals: three numbers, each with the 13-month shape ----
    const yearStats = $('#yearStats');
    if (yearStats) {
      const rows = [
        { lab: 'TOTAL', val: fmtRevenue(data.kpi.revenue), series: months.map((m) => m.rev),
          aria: `Total revenue ${fmtRevenue(data.kpi.revenue)} across thirteen months, month by month` },
        { lab: 'ORDERS', val: fmtOrders(data.kpi.orders), series: months.map((m) => m.orders),
          aria: `${fmtOrders(data.kpi.orders)} orders across thirteen months, month by month` },
        { lab: 'AOV', val: fmtAov(data.kpi.aov), series: months.map((m) => m.aov),
          aria: `Average order value ${fmtAov(data.kpi.aov)} across thirteen months, month by month` },
      ];
      yearStats.innerHTML = rows.map((r) =>
        `<div class="ystat"><span class="ystat__lab">${r.lab}</span>` +
        `<span class="ystat__val">${r.val}</span>${microBars(r.series, r.aria)}</div>`
      ).join('');
    }

    // ---- plaque: the concentration finding, drawn instead of written ----
    const plaque = $('#plaque');
    if (plaque) {
      const rest = +(100 - data.homeShare).toFixed(1);
      const others = data.kpi.countries - 1;
      plaque.innerHTML =
        `<div class="sharebar" role="img" aria-label="United Kingdom is ${data.homeShare} percent of revenue; the other ${others} markets together are ${rest} percent; ${data.kpi.countries} markets served; ${fmtRevenue(data.kpi.revenue)} total">` +
        `<span class="sharebar__seg is-home" style="width:${data.homeShare}%"></span>` +
        `<span class="sharebar__seg is-rest" style="width:${rest}%"></span></div>` +
        `<div class="sharekey">` +
        `<span class="sharekey__i"><i class="sw is-home" aria-hidden="true"></i>UK ${data.homeShare}%</span>` +
        `<span class="sharekey__i"><i class="sw is-rest" aria-hidden="true"></i>${data.kpi.countries} markets ${rest}%</span>` +
        `</div>`;
    }

    // ---- findings: a stat and a mark, never a paragraph ----
    const grid = $('#findingGrid');
    if (grid) {
      const top3 = data.countries.slice(0, 3);
      const concentration =
        `<article class="finding">` +
        `<h2>${data.homeShare}%</h2>` +
        `<div class="fbars">` +
        top3.map((c) => compareBar(
          shortName(c.name),
          (c.share / top3[0].share) * 100,
          c.share.toFixed(1) + '%',
          `${c.name}: ${c.share.toFixed(1)} percent of revenue`
        )).join('') +
        `</div></article>`;

      const full = months.filter((m) => !m.partial);
      const peak = full.reduce((a, b) => (b.rev > a.rev ? b : a));
      const low = full.reduce((a, b) => (b.rev < a.rev ? b : a));
      const ratio = (peak.rev / low.rev).toFixed(1);
      const seasonality =
        `<article class="finding">` +
        `<h2>${ratio}&times;</h2>` +
        `<div class="fbars">` +
        compareBar(fmtMonth(peak.m).split(' ')[0], 100, fmtRevenue(peak.rev),
          `Peak month ${fmtMonth(peak.m)} at ${fmtRevenue(peak.rev)}`) +
        compareBar(fmtMonth(low.m).split(' ')[0], (low.rev / peak.rev) * 100, fmtRevenue(low.rev),
          `Lowest month ${fmtMonth(low.m)} at ${fmtRevenue(low.rev)} — the peak is ${ratio} times it, a hard autumn run-up into Christmas`,
          'fbar--low') +
        `</div></article>`;

      grid.innerHTML = concentration + seasonality;
    }

    // ---- provenance: the cleaning chain as a bar, not four sentences ----
    const prov = $('#prov');
    if (prov) {
      const keptPct = (data.keptRows / data.rawRows) * 100;
      const cancelled = (data.excluded.find((e) => /cancel/i.test(e.label)) || { rows: 0 }).rows;
      const provAria =
        `${fmtOrders(data.keptRows)} of ${fmtOrders(data.rawRows)} raw rows kept; ` +
        `${fmtOrders(data.excludedTotal)} removed — ` +
        data.excluded.map((e) => `${fmtOrders(e.rows)} ${e.label.toLowerCase()}`).join(', ') +
        `. Cancelled invoices were removed rather than netted off, so revenue here is gross. ` +
        `The final month is nine days and is drawn hatched, not smoothed. ` +
        `Source: UCI Online Retail, a UK gift wholesaler.`;
      prov.innerHTML =
        `<span class="prov__src">UCI ONLINE RETAIL</span>` +
        `<div class="prov__bar" role="img" aria-label="${esc(provAria)}">` +
        `<span class="prov__kept" style="width:${keptPct.toFixed(1)}%"></span></div>` +
        `<span class="prov__chip">${fmtOrders(data.keptRows)} KEPT</span>` +
        `<span class="prov__chip">${fmtOrders(cancelled)} CANCELLED</span>` +
        `<span class="prov__chip prov__chip--warn">GROSS</span>`;
    }
  }
})();
