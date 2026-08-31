(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- odometer — scroll-triggered once, per template 26 ----------
     Numbers only roll when the visitor scrolls the numbers band into view.
     Nothing animates on page load. If reduced motion is requested, digits
     land in their final position with no transition at all. */
  function buildOdometers() {
    var odometers = document.querySelectorAll('.odometer');

    odometers.forEach(function (odo) {
      var raw = odo.getAttribute('data-value') || '';
      odo.textContent = '';
      odo.setAttribute('aria-hidden', 'false');

      var delayIndex = 0;
      var baseDelay = 0.12;

      for (var i = 0; i < raw.length; i++) {
        var ch = raw[i];

        if (isNaN(parseInt(ch, 10))) {
          var charSpan = document.createElement('span');
          charSpan.className = 'odo-char';
          charSpan.textContent = ch;
          odo.appendChild(charSpan);
          continue;
        }

        var targetDigit = parseInt(ch, 10);
        var windowEl = document.createElement('span');
        windowEl.className = 'odo-window';
        windowEl.style.setProperty('--target-digit', targetDigit);

        var stripEl = document.createElement('span');
        stripEl.className = 'odo-strip';
        if (!prefersReducedMotion) {
          stripEl.style.transitionDelay = (delayIndex * baseDelay) + 's';
        } else {
          stripEl.style.transition = 'none';
        }

        for (var j = 0; j <= 9; j++) {
          var numEl = document.createElement('span');
          numEl.className = 'odo-num';
          numEl.textContent = String(j);
          stripEl.appendChild(numEl);
        }

        windowEl.appendChild(stripEl);
        odo.appendChild(windowEl);
        delayIndex++;
      }
    });

    if (prefersReducedMotion) {
      // Land digits immediately, no scroll dependency, no animation.
      odometers.forEach(function (odo) { odo.classList.add('is-visible'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });

    odometers.forEach(function (odo) { observer.observe(odo); });
  }

  /* ---------- honest-limitation math toggle — click-driven reveal ---------- */
  function bindMathToggle() {
    var toggle = document.querySelector('.math-toggle');
    var panel = document.getElementById('math-panel');
    if (!toggle || !panel) return;

    toggle.addEventListener('click', function () {
      var expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      panel.hidden = expanded;
      toggle.querySelector('.math-toggle-label').textContent = expanded
        ? 'Show the math'
        : 'Hide the math';
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    buildOdometers();
    bindMathToggle();
  });
})();
