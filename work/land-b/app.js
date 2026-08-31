(function () {
  'use strict';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =====================================================================
     HERO — tear the ticket (click/tap-driven, toggleable, one object)
     ===================================================================== */
  var heroTicket = document.getElementById('heroTicket');
  var tearBtn = document.getElementById('tearBtn');
  var tearResult = document.getElementById('tearResult');

  if (heroTicket && tearBtn) {
    var torn = false;
    tearBtn.addEventListener('click', function () {
      torn = !torn;
      heroTicket.classList.toggle('torn', torn);
      tearBtn.setAttribute('aria-pressed', String(torn));
      tearBtn.textContent = torn ? 'Posted ✓ — tear again' : 'Post Thursday night';
      if (tearResult) tearResult.hidden = !torn;
    });
  }

  /* =====================================================================
     HOW IT WORKS — the ticket travels the rail (click-driven, 3 states)
     ===================================================================== */
  var rail = document.getElementById('rail');
  var track = document.getElementById('track');
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

  if (claimBtn && stuckTicket) {
    claimBtn.addEventListener('click', function () {
      if (!prefersReduced) {
        stuckTicket.classList.remove('shake');
        // restart animation
        void stuckTicket.offsetWidth;
        stuckTicket.classList.add('shake');
      }
      if (limitResult) limitResult.hidden = false;
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
