/* NOCTURNE — direction A. Two mechanisms, both user-driven.
   1. Pointer tilt + lift on the fare slabs   (Template 03)
   2. The CSS-only odometer, fired once on scroll  (Template 12)
   Nothing on this page moves unless the visitor moves it. */

document.addEventListener('DOMContentLoaded', () => {

  /* ------------------------------------------------------------ 1. SLABS */

  /* Sign convention, derived rather than guessed — getting it backwards is why
     the first build showed no edge at all:
       rotateX(NEGATIVE) swings the top of the sheet TOWARD the viewer, which is
       what turns the top edge — the printed spine — into view.
       rotateY(POSITIVE) pushes the right side away and brings the left forward.
     So the near-cursor corner leads:  rx = +py * T,  ry = -px * T. */
  const TILT_X = 10;   // deg of rotateX across the card's height
  const TILT_Y = 13;   // deg of rotateY across its width
  const REST_X = -6;   // must match the .fare-tilt fallback in styles.css
  const BASE_X = -22;  // the pickup itself tips the sheet, so the spine is
                       // exposed the whole time a sheet is held, not only at
                       // one cursor position. 22° clears the sightline to
                       // the top edge with enough left over to see the stock. */

  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');

  const row = document.querySelector('.fares');

  document.querySelectorAll('.fare').forEach((fare) => {

    const pickUp = () => {
      fare.classList.add('is-lifted');
      row.classList.add('has-lift');       // presses every other sheet down
      fare.style.setProperty('--rx', BASE_X + 'deg');
    };

    const putDown = () => {
      fare.classList.remove('is-lifted');
      row.classList.remove('has-lift');
      fare.style.setProperty('--rx', REST_X + 'deg');
      fare.style.setProperty('--ry', '0deg');
      fare.style.setProperty('--shx', '0px');
      fare.style.setProperty('--shy', '0px');
    };

    fare.addEventListener('pointerenter', () => { if (fine.matches) pickUp(); });

    fare.addEventListener('pointermove', (e) => {
      if (!fine.matches) return;
      const r = fare.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;    // -0.5 .. 0.5
      const py = (e.clientY - r.top) / r.height - 0.5;
      fare.style.setProperty('--rx', (BASE_X + py * TILT_X).toFixed(2) + 'deg');
      fare.style.setProperty('--ry', (-px * TILT_Y).toFixed(2) + 'deg');
      // the cast shadow stays on the desk and slides opposite the tilt
      fare.style.setProperty('--shx', (px * -30).toFixed(1) + 'px');
      fare.style.setProperty('--shy', (py * -14).toFixed(1) + 'px');
    });

    fare.addEventListener('pointerleave', putDown);
    fare.addEventListener('pointercancel', putDown);

    // keyboard: tabbing to the reserve link picks the sheet up too
    fare.addEventListener('focusin', pickUp);
    fare.addEventListener('focusout', putDown);
  });

  /* --------------------------------------------------------- 2. ODOMETER
     Rebuilt from Template 12. JS builds DOM once and never touches it again;
     every frame of motion is one CSS transition. Two extras the reference
     omits: an aria-label with the real value, and aria-hidden on the strips
     (a screen reader otherwise reads "0 1 2 3 4 5 6 7 8 9" per column). */

  const BASE_DELAY = 0.12;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      obs.unobserve(entry.target);
    });
  }, { root: null, rootMargin: '0px', threshold: 0.2 });

  document.querySelectorAll('.odometer').forEach((odo) => {
    const valueStr = odo.getAttribute('data-value') || '';
    odo.innerHTML = '';
    odo.setAttribute('aria-label', valueStr);
    odo.setAttribute('role', 'text');

    let delayIndex = 0;   // non-digits never consume a delay slot

    for (const char of valueStr) {
      const digit = parseInt(char, 10);

      if (Number.isNaN(digit)) {
        const span = document.createElement('span');
        span.className = 'odo-char';
        span.textContent = char;
        span.setAttribute('aria-hidden', 'true');
        odo.appendChild(span);
        continue;
      }

      const windowEl = document.createElement('span');
      windowEl.className = 'odo-window';
      windowEl.setAttribute('aria-hidden', 'true');
      windowEl.style.setProperty('--target-digit', digit);

      const stripEl = document.createElement('span');
      stripEl.className = 'odo-strip';
      stripEl.style.transitionDelay = (delayIndex * BASE_DELAY) + 's';

      for (let j = 0; j <= 9; j++) {
        const numEl = document.createElement('span');
        numEl.className = 'odo-num';
        numEl.textContent = j;
        stripEl.appendChild(numEl);
      }

      windowEl.appendChild(stripEl);
      odo.appendChild(windowEl);
      delayIndex++;
    }

    observer.observe(odo);
  });
});
