(function () {
  'use strict';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =====================================================================
     HERO — tear the ticket (click/tap-driven, toggleable, one object)
     ===================================================================== */
  var heroTicket = document.getElementById('heroTicket');
  var tearBtn = document.getElementById('tearBtn');

  if (heroTicket && tearBtn) {
    var torn = false;
    tearBtn.addEventListener('click', function () {
      torn = !torn;
      heroTicket.classList.toggle('torn', torn);
      tearBtn.setAttribute('aria-pressed', String(torn));
      tearBtn.textContent = torn ? 'Posted ✓ — tear again' : 'Post Thursday night';
    });
  }

  /* =====================================================================
     HOW IT WORKS — the ticket travels the rail (click-driven, 3 states)
     ===================================================================== */
  var rail = document.getElementById('rail');
  var chip = document.getElementById('railChip');
  var railBtn = document.getElementById('railBtn');
  var stations = rail ? Array.prototype.slice.call(rail.querySelectorAll('.station')) : [];
  var step = 1; // 1 = posted (default resting state), 2 = matched, 3 = approved

  var railLabels = {
    2: 'Approve (1 tap)',
    3: 'Run it again'
  };

  function isMobileLayout() {
    return window.matchMedia('(max-width: 720px)').matches;
  }

  function positionChip() {
    if (!chip || !rail || isMobileLayout()) return;
    var target = stations[Math.min(step, 3) - 1];
    if (!target) return;
    var railRect = rail.getBoundingClientRect();
    var stationRect = target.getBoundingClientRect();
    var x = (stationRect.left - railRect.left) + stationRect.width / 2 - chip.offsetWidth / 2;
    var y = (stationRect.top - railRect.top) - chip.offsetHeight - 10;
    chip.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
  }

  function renderRail() {
    stations.forEach(function (st) {
      var n = Number(st.getAttribute('data-step'));
      st.classList.toggle('reached', n <= step);
    });
    positionChip();
  }

  if (railBtn && stations.length === 3) {
    // station 1 is the given starting state (already posted)
    stations[0].classList.add('reached');

    railBtn.addEventListener('click', function () {
      if (step >= 3) {
        step = 1;
        railBtn.textContent = 'Find who’s free';
      } else {
        step += 1;
        railBtn.textContent = railLabels[step] || 'Find who’s free';
      }
      renderRail();
    });

    window.addEventListener('load', positionChip);
    window.addEventListener('resize', debounce(positionChip, 150));
    renderRail();
  }

  /* =====================================================================
     HONEST LIMITATION — the ticket nobody claims (click-driven, one-shot-ish)
     ===================================================================== */
  var stuckTicket = document.getElementById('stuckTicket');
  var claimBtn = document.getElementById('claimBtn');
  var limitResult = document.getElementById('limitResult');
  var rollChart = document.getElementById('rollChart');

  if (claimBtn && stuckTicket) {
    claimBtn.addEventListener('click', function () {
      if (!prefersReduced) {
        stuckTicket.classList.remove('shake');
        // restart animation
        void stuckTicket.offsetWidth;
        stuckTicket.classList.add('shake');
      }
      if (limitResult) limitResult.hidden = false;
      // the three unclaimed cells in the strip of 50 are the same 6%
      if (rollChart) rollChart.classList.add('lit');
    });
  }

  /* =====================================================================
     PRICING — card-scale cursor light on hover, no lerp (local + small)
     ===================================================================== */
  var plans = document.querySelectorAll('.plan');
  plans.forEach(function (plan) {
    plan.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var rect = plan.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      plan.style.background =
        'radial-gradient(circle at ' + x + 'px ' + y + 'px, rgba(241,231,211,0.10) 0%, rgba(26,21,25,1) 65%)';
    });
    plan.addEventListener('pointerleave', function () {
      plan.style.background = '';
    });
  });

  /* =====================================================================
     ENTRANCES
     Nothing here loops. Every entrance fires once, on the visitor's own
     scroll, and settles. With prefers-reduced-motion the `.motion` class is
     never added, so no hiding rule ever applies and no JS animation runs —
     the page is simply already in its final state.
     ===================================================================== */
  if (prefersReduced) return;

  var root = document.documentElement;

  /* ---- word splitters. Run BEFORE `.motion` is added, so a throw here
          leaves the page fully visible rather than half-hidden. ---- */
  function splitWords(el, wrap) {
    var nodes = Array.prototype.slice.call(el.childNodes);
    var out = [];
    nodes.forEach(function (n) {
      if (n.nodeType === 3) {
        var parts = n.textContent.split(/(\s+)/);
        var frag = document.createDocumentFragment();
        parts.forEach(function (p) {
          if (!p) return;
          if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
          frag.appendChild(wrap(p, out));
        });
        el.replaceChild(frag, n);
      }
    });
    return out;
  }

  function wrapStamp(word, out) {
    var s = document.createElement('span');
    s.className = 'w';
    s.textContent = word;
    out.push(s);
    return s;
  }

  function wrapPress(word, out) {
    var s = document.createElement('span');
    s.className = 'wl';
    var i = document.createElement('i');
    i.textContent = word;
    s.appendChild(i);
    out.push(i);
    return s;
  }

  try {
    document.querySelectorAll('[data-enter="stamp"]').forEach(function (el) {
      splitWords(el, wrapStamp).forEach(function (w, i) {
        w.style.transitionDelay = (i * 45) + 'ms';
      });
    });
    document.querySelectorAll('[data-enter="press"]').forEach(function (el) {
      splitWords(el, wrapPress).forEach(function (w, i) {
        w.style.transitionDelay = (i * 55) + 'ms';
      });
    });
    // per-child stagger for dealt cards and drawn bars
    document.querySelectorAll('[data-enter="deal"]').forEach(function (el) {
      el.querySelectorAll(':scope > .station, :scope > .plan').forEach(function (c, i) {
        c.style.transitionDelay = (i * 80) + 'ms';
      });
    });
    document.querySelectorAll('[data-enter="draw"]').forEach(function (el) {
      var base = Number(el.getAttribute('data-delay')) || 0;
      el.querySelectorAll('.ratio-bar, .ledger-bar, .compare-bar').forEach(function (c, i) {
        c.style.transitionDelay = (base + i * 90) + 'ms';
      });
    });
  } catch (err) {
    // if splitting failed the page is still complete; just don't animate
    return;
  }

  // opt IN to the hidden state only now that everything above succeeded
  root.classList.add('motion');

  /* ---- count-up: animates TOWARDS the value already in the HTML ---- */
  function countUp(el) {
    var target = Number(el.getAttribute('data-count'));
    if (!isFinite(target)) return;
    var suffix = el.getAttribute('data-suffix') || '';
    var final = el.textContent;
    var t0 = null;
    var dur = 550;
    function frame(t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      if (p < 1) {
        el.textContent = Math.round(target * eased).toLocaleString('en-AU') + suffix;
        requestAnimationFrame(frame);
      } else {
        el.textContent = final; // land on the authored string, exactly
      }
    }
    requestAnimationFrame(frame);
  }

  /* ---- the price resolves character by character: an ordered drum walk,
          split by character class so a letter never steps through digits
          (Split Flap Departure Board, "the ordered walk"). ---- */
  var DRUM_ALPHA = ' ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  var DRUM_NUM = ' 0123456789$';

  function flapText(el) {
    var final = el.textContent;
    var chars = final.split('');
    el.textContent = '';
    var spans = chars.map(function (ch) {
      var s = document.createElement('span');
      s.className = 'flap';
      s.textContent = ch;
      el.appendChild(s);
      return s;
    });
    spans.forEach(function (s, i) {
      var target = chars[i];
      if (target === ' ') return;
      var drum = /[0-9$]/.test(target) ? DRUM_NUM : DRUM_ALPHA;
      var end = drum.indexOf(target);
      if (end < 0) return;
      var steps = 5 + (i % 3) * 2;             // 5-9 steps, varied per position
      var idx = (end - steps + drum.length * 2) % drum.length;
      s.textContent = drum[idx];
      var tick = setInterval(function () {
        idx = (idx + 1) % drum.length;
        s.textContent = drum[idx];
        if (drum[idx] === target) {
          clearInterval(tick);
          s.textContent = target;               // settle on the real character
        }
      }, 38);
      // hard safety: land it no matter what, so the price can never be wrong
      setTimeout(function () { clearInterval(tick); s.textContent = target; }, 900);
    });
  }

  /* ---- the reveal sweep. rAF-throttled position check, not
          IntersectionObserver — IO gets outrun by a fast scroll or an
          in-page anchor jump, and this page's nav has three of those. ---- */
  var pending = Array.prototype.slice.call(document.querySelectorAll('[data-enter]'));
  var queued = false;

  function reveal(el) {
    el.classList.add('in');
    if (el.id === 'manifest') {
      setTimeout(function () {
        el.querySelectorAll('[data-count]').forEach(countUp);
      }, 300);                                  // after the receipt has printed
    }
    if (el.classList.contains('plans')) {
      el.querySelectorAll('.plan-price').forEach(function (p, i) {
        setTimeout(function () { flapText(p); }, 120 + i * 80);
      });
    }
  }

  function sweep() {
    queued = false;
    var line = window.innerHeight * 0.92;
    for (var i = pending.length - 1; i >= 0; i--) {
      if (pending[i].getBoundingClientRect().top < line) {
        reveal(pending[i]);
        pending.splice(i, 1);
      }
    }
    if (!pending.length) {
      window.removeEventListener('scroll', ping);
      window.removeEventListener('resize', ping);
    }
  }

  function ping() {
    if (!queued) { queued = true; requestAnimationFrame(sweep); }
  }

  window.addEventListener('scroll', ping, { passive: true });
  window.addEventListener('resize', ping);
  requestAnimationFrame(sweep);                 // catch everything above the fold

  /* =====================================================================
     utils
     ===================================================================== */
  function debounce(fn, wait) {
    var t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, wait);
    };
  }
})();
