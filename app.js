/* =============================================================================
   AUFAN RACHMAD — STUDIO
   The carousel projector. The tray position IS the navigation, and the lamp is
   the page's only light source, so advancing a slide dims the whole room for
   the moment the gate is empty.
   Every motion in here is started by the visitor. Nothing loops.
   ========================================================================== */
(function () {
  "use strict";

  var SLIDES = [
    {
      img: "art/gacha.jpg",
      alt: "Gacha — a working capsule machine built in CSS",
      title: "Gacha",
      kind: "Capsule machine · collect ten",
      tag: "Self-initiated",
      body: "A working capsule machine. Insert the coin, turn the crank, catch the capsule and crack it open — ten projects, collected one at a time, with the drop rates printed on the side.",
      stack: ["Physics-lite", "Sequenced states", "Vanilla JS"],
      role: "Design + build",
      year: "2026"
    },
    {
      img: "art/nocturne.jpg",
      alt: "Nocturne — an overnight sleeper-train site with paper fare cards",
      title: "Nocturne",
      kind: "Overnight sleeper train · concept site",
      tag: "Self-initiated",
      body: "An overnight sleeper train, Melbourne to Sydney. The fare cards are real six-face slabs — the thickness <em>is</em> the price, so you feel the difference before you read a number.",
      stack: ["CSS 3D", "Vanilla JS", "No framework"],
      role: "Design + build",
      year: "2026"
    },
    {
      img: "art/desk.jpg",
      alt: "The Desk — an orbitable room built in CSS 3D",
      title: "The Desk",
      kind: "Orbitable room · CSS 3D",
      tag: "Self-initiated",
      body: "A room you can turn. Drag anywhere to orbit it, pick objects up off the desk to read them, throw the lamp switch and the whole scene relights.",
      stack: ["CSS 3D scene", "Lighting model", "Vanilla JS"],
      role: "Design + build",
      year: "2026"
    },
    {
      img: "art/pasar-malam.jpg",
      alt: "Pasar Malam — a night-market site driven by one time scrubber",
      title: "Pasar Malam",
      kind: "Night market · one control, six components",
      tag: "Self-initiated",
      body: "A Melbourne night market from five o'clock to close. One time scrubber drives six components at once — stalls, programme, crowd, lantern light — so dragging an hour changes the entire page.",
      stack: ["State machine", "Canvas-free", "Vanilla JS"],
      role: "Design + build",
      year: "2026"
    },
    {
      img: "art/aster-doll.jpg",
      alt: "Aster Doll — a product unboxing built in CSS 3D",
      title: "Aster Doll",
      kind: "Product unboxing · CSS 3D",
      tag: "Spec work",
      body: "A collectible figure arriving in the post. Break the factory seal, lift the PVC tray, mount it on the base — three real states, one cardboard box, no 3D library anywhere.",
      stack: ["CSS 3D", "Pointer drag", "SVG"],
      role: "Design + build",
      year: "2026"
    },
    {
      img: "art/ah19.jpg",
      alt: "AH-19 — a bench instrument whose dial drives five readouts",
      title: "AH-19",
      kind: "Bench instrument · portfolio console",
      tag: "Self-initiated",
      body: "A single-unit bench console. One dial drives five separate readouts at once, and pressing PRINT rolls a serialised receipt out of the front of the machine.",
      stack: ["Canvas dial", "CSS hardware", "Vanilla JS"],
      role: "Design + build",
      year: "2026"
    },
    {
      img: "art/stone.jpg",
      alt: "The Stone — a hand-rolled dodecahedron with no 3D library",
      title: "The Stone",
      kind: "Dodecahedron · hand-rolled 3D",
      tag: "Self-initiated",
      body: "Twelve faces, no 3D library — the whole solid is rolled by hand out of transforms. Shipped work sits on the faces that tilt up; work still in the vice on the ones that tilt down.",
      stack: ["Hand-rolled 3D", "Pointer inertia", "Vanilla JS"],
      role: "Design + build",
      year: "2026"
    },
    {
      img: "art/nocturne-board.jpg",
      alt: "Nocturne Board — a cream split-flap departure board on cobalt",
      title: "Nocturne Board",
      kind: "Split-flap departure board",
      tag: "Self-initiated",
      body: "The same train, told as the board in the concourse. Every character flips on its own hinge; hit re-flap and the whole board resolves letter by letter, fares included.",
      stack: ["Split-flap engine", "CSS 3D", "Vanilla JS"],
      role: "Design + build",
      year: "2026"
    }
  ];

  var N = SLIDES.length;
  var STEP = 360 / N;           // 45deg between tray slots
  var FRONT = 180;              // ring angle that puts a slot in the gate
  var SHARP = 72;               // focus value at which the lens is sharp
  var BLUR_K = 0.058;           // px of blur per unit off sharp

  var $ = function (id) { return document.getElementById(id); };

  var room       = $("room");
  var beam       = $("beam");
  var lens       = $("lens");
  var slideFrame = $("slideFrame");
  var projection = slideFrame ? slideFrame.querySelector(".projection") : null;
  var img        = $("slideImg");
  var projNo     = $("projNo");
  var projTitle  = $("projTitle");
  var projKind   = $("projKind");
  var projector  = $("projector");
  var tray       = $("tray");
  var traySlots  = $("traySlots");
  var knob       = $("focusKnob");
  var btnNext    = $("btnNext");
  var btnPrev    = $("btnPrev");
  var btnSound   = $("btnSound");
  var roSlide    = $("roSlide");
  var roFocus    = $("roFocus");
  var roLamp     = $("roLamp");
  var roSound    = $("roSound");
  var icNo       = $("icNo");
  var icTag      = $("icTag");
  var icTitle    = $("icTitle");
  var icBody     = $("icBody");
  var icStack    = $("icStack");
  var icRole     = $("icRole");
  var icYear     = $("icYear");

  if (!room || !projector) { return; }

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var index = 0;
  var ring = FRONT;              // live tray angle in degrees
  var focus = 50;                // starts soft — a real projector needs focusing
  var soundOn = true;
  var busy = false;
  var cards = [];

  /* --------------------------------------------------------------- preload */
  SLIDES.forEach(function (s) { var i = new Image(); i.src = s.img; });

  /* ------------------------------------------------------------ the tray */
  function buildTray() {
    if (!traySlots) { return; }
    var frag = document.createDocumentFragment();
    for (var i = 0; i < N; i++) {
      var arm = document.createElement("div");
      arm.className = "slot-arm";
      arm.style.transform = "rotateZ(" + (i * STEP) + "deg) translateY(-6.1em)";
      var card = document.createElement("div");
      card.className = "slot-card";
      arm.appendChild(card);
      frag.appendChild(arm);
      cards.push(card);
    }
    traySlots.appendChild(frag);
  }

  function paintTray() {
    if (!traySlots) { return; }
    traySlots.style.transform = "rotateX(74deg) rotateZ(" + ring + "deg)";
    for (var i = 0; i < cards.length; i++) {
      cards[i].style.transform =
        "rotateZ(" + (-(i * STEP + ring)) + "deg) rotateX(-74deg)";
      cards[i].classList.toggle("is-current", i === index && !busy);
    }
  }

  /* ------------------------------------------------------------ the lamp */
  function setLamp(v) {
    document.documentElement.style.setProperty("--lamp", String(v));
    if (roLamp) { roLamp.textContent = v > 0.5 ? "ON" : "DIM"; }
  }

  /* ----------------------------------------------------------- the focus */
  function applyFocus() {
    var blur = Math.abs(focus - SHARP) * BLUR_K;
    document.documentElement.style.setProperty("--blur", blur.toFixed(2) + "px");
    if (knob) {
      knob.style.setProperty("--knob", ((focus - 50) * 2.7).toFixed(1) + "deg");
      knob.setAttribute("aria-valuenow", String(Math.round(focus)));
      knob.setAttribute("aria-valuetext", blur < 0.35 ? "sharp" : (blur < 1.6 ? "nearly sharp" : "soft"));
    }
    if (roFocus) {
      var sharpness = 1 - Math.min(1, Math.abs(focus - SHARP) / SHARP);
      var filled = Math.round(sharpness * 5);
      roFocus.textContent = "▮".repeat(filled) + "▯".repeat(5 - filled);
    }
  }

  /* --------------------------------------------------------- slide swap */
  function paintSlide() {
    var s = SLIDES[index];
    var no = String(index + 1).padStart(2, "0");
    if (img) { img.src = s.img; img.alt = s.alt; }
    if (projNo) { projNo.textContent = no; }
    if (projTitle) { projTitle.textContent = s.title; }
    if (projKind) { projKind.textContent = s.kind; }
    if (icNo) { icNo.textContent = no; }
    if (icTag) { icTag.textContent = s.tag; }
    if (icTitle) { icTitle.textContent = s.title; }
    if (icBody) { icBody.innerHTML = s.body; }
    if (icRole) { icRole.textContent = s.role; }
    if (icYear) { icYear.textContent = s.year; }
    if (icStack) {
      icStack.innerHTML = "";
      s.stack.forEach(function (t) {
        var li = document.createElement("li");
        li.textContent = t;
        icStack.appendChild(li);
      });
    }
    if (roSlide) { roSlide.textContent = no + " / 0" + N; }
  }

  /* --------------------------------------------------------- the mechanic */
  function spinTo(targetRing, done) {
    if (reduce) { ring = targetRing; paintTray(); done(); return; }
    var from = ring;
    var delta = targetRing - from;
    var dur = 380 + Math.min(260, Math.abs(delta) * 1.7);
    var t0 = performance.now();
    function frame(now) {
      var p = Math.min(1, (now - t0) / dur);
      // mechanical: quick out of the detent, long settle into the next one
      var e = 1 - Math.pow(1 - p, 3.1);
      ring = from + delta * e;
      paintTray();
      if (p < 1) { requestAnimationFrame(frame); }
      else { ring = targetRing; paintTray(); done(); }
    }
    requestAnimationFrame(frame);
  }

  function goTo(next, viaDrag) {
    next = ((next % N) + N) % N;
    if (busy) { return; }
    if (next === index && !viaDrag) {
      // still give the button an honest response
      clunk();
      return;
    }
    busy = true;
    clunk();

    // the gate is empty: the room's only light source is interrupted
    setLamp(0.16);

    var target;
    if (viaDrag) {
      target = FRONT - next * STEP;
      // keep the snap short — the visitor already turned it by hand
      var k = Math.round((ring - target) / 360);
      target += k * 360;
    } else {
      var cur = FRONT - index * STEP;
      var raw = FRONT - next * STEP;
      // travel the short way around the tray
      var diff = raw - cur;
      while (diff > 180) { diff -= 360; }
      while (diff < -180) { diff += 360; }
      target = ring + diff;
    }

    var swapped = false;
    var swapAt = reduce ? 0 : 140;
    setTimeout(function () {
      index = next;
      paintSlide();
      swapped = true;
      setLamp(1);
      if (projection && !reduce) {
        projection.classList.remove("is-dropping");
        void projection.offsetWidth;
        projection.classList.add("is-dropping");
      }
      if (!reduce) {
        projector.classList.remove("is-clunking");
        void projector.offsetWidth;
        projector.classList.add("is-clunking");
      }
      drawBeam();
    }, swapAt);

    spinTo(target, function () {
      if (!swapped) { index = next; paintSlide(); setLamp(1); }
      busy = false;
      paintTray();
      drawBeam();
    });
  }

  /* ------------------------------------------------------------- the beam */
  function drawBeam() {
    if (!beam || !lens || !slideFrame) { return; }
    var r = room.getBoundingClientRect();
    var l = lens.getBoundingClientRect();
    var p = slideFrame.querySelector(".projection").getBoundingClientRect();
    if (!r.width || !p.width) { return; }
    var lx = l.left + l.width / 2 - r.left;
    var ly = l.top + l.height / 2 - r.top;
    var x1 = p.left - r.left, y1 = p.top - r.top;
    var x2 = p.right - r.left, y2 = p.bottom - r.top;
    // lens is below the projection in every layout, so this hull stays simple
    beam.style.clipPath =
      "polygon(" + (lx - 10) + "px " + (ly - 7) + "px," +
      x1 + "px " + y1 + "px," +
      x2 + "px " + y1 + "px," +
      x2 + "px " + y2 + "px," +
      x1 + "px " + y2 + "px," +
      (lx + 10) + "px " + (ly + 7) + "px)";
    beam.style.setProperty("--lx", lx + "px");
    beam.style.setProperty("--ly", ly + "px");
  }

  /* ------------------------------------------------------------- the clunk */
  var actx = null;
  function clunk() {
    if (!soundOn) { return; }
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { return; }
      if (!actx) { actx = new AC(); }
      if (actx.state === "suspended") { actx.resume(); }
      var t = actx.currentTime;
      var out = actx.createGain();
      out.gain.value = 0.085;
      out.connect(actx.destination);

      // the mechanism: a short filtered noise burst
      var len = Math.floor(actx.sampleRate * 0.075);
      var buf = actx.createBuffer(1, len, actx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) { d[i] = (Math.random() * 2 - 1) * (1 - i / len); }
      var noise = actx.createBufferSource();
      noise.buffer = buf;
      var bp = actx.createBiquadFilter();
      bp.type = "bandpass"; bp.frequency.value = 1500; bp.Q.value = 0.9;
      var ng = actx.createGain();
      ng.gain.setValueAtTime(0.9, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.085);
      noise.connect(bp); bp.connect(ng); ng.connect(out);
      noise.start(t); noise.stop(t + 0.09);

      // the body of the machine taking the weight
      var osc = actx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(96, t);
      osc.frequency.exponentialRampToValueAtTime(46, t + 0.13);
      var og = actx.createGain();
      og.gain.setValueAtTime(0.0001, t);
      og.gain.exponentialRampToValueAtTime(0.7, t + 0.008);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      osc.connect(og); og.connect(out);
      osc.start(t); osc.stop(t + 0.18);
    } catch (e) { /* sound is a bonus, never a dependency */ }
  }

  /* ------------------------------------------------------------- controls */
  if (btnNext) { btnNext.addEventListener("click", function () { goTo(index + 1); }); }
  if (btnPrev) { btnPrev.addEventListener("click", function () { goTo(index - 1); }); }

  if (btnSound) {
    btnSound.addEventListener("click", function () {
      soundOn = !soundOn;
      btnSound.setAttribute("aria-pressed", String(soundOn));
      if (roSound) { roSound.textContent = soundOn ? "ON" : "OFF"; }
      if (soundOn) { clunk(); }
    });
  }

  document.addEventListener("keydown", function (e) {
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) { return; }
    if (t === knob) { return; }
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); goTo(index + 1); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); goTo(index - 1); }
  });

  /* --------------------------------------------------- drag the tray ring */
  if (tray) {
    var dragging = false, lastX = 0, lastY = 0, moved = 0, startRing = 0;
    tray.addEventListener("pointerdown", function (e) {
      if (busy) { return; }
      dragging = true; moved = 0; startRing = ring;
      lastX = e.clientX; lastY = e.clientY;
      try { tray.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault();
    });
    tray.addEventListener("pointermove", function (e) {
      if (!dragging) { return; }
      var dx = e.clientX - lastX;
      var dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      ring += (dx + dy) * 0.42;
      paintTray();
    });
    function endDrag(e) {
      if (!dragging) { return; }
      dragging = false;
      try { tray.releasePointerCapture(e.pointerId); } catch (err) {}
      var slots = Math.round((FRONT - ring) / STEP);
      var next = ((slots % N) + N) % N;
      if (moved < 4) { goTo(index + 1); return; }
      if (next === index) {
        // snap back into the detent it was already in
        spinTo(FRONT - index * STEP + Math.round((ring - (FRONT - index * STEP)) / 360) * 360,
               function () { paintTray(); drawBeam(); });
        return;
      }
      goTo(next, true);
    }
    tray.addEventListener("pointerup", endDrag);
    tray.addEventListener("pointercancel", endDrag);
  }

  /* ------------------------------------------------------ the focus knob */
  if (knob) {
    var kDrag = false, kAngle = 0;
    function angleAt(e) {
      var r = knob.getBoundingClientRect();
      return Math.atan2(e.clientY - (r.top + r.height / 2),
                        e.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
    }
    knob.addEventListener("pointerdown", function (e) {
      kDrag = true; kAngle = angleAt(e);
      try { knob.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault(); e.stopPropagation();
    });
    knob.addEventListener("pointermove", function (e) {
      if (!kDrag) { return; }
      var a = angleAt(e);
      var d = a - kAngle;
      while (d > 180) { d -= 360; }
      while (d < -180) { d += 360; }
      kAngle = a;
      focus = Math.max(0, Math.min(100, focus + d * 0.42));
      applyFocus();
    });
    function kEnd(e) {
      if (!kDrag) { return; }
      kDrag = false;
      try { knob.releasePointerCapture(e.pointerId); } catch (err) {}
    }
    knob.addEventListener("pointerup", kEnd);
    knob.addEventListener("pointercancel", kEnd);
    knob.addEventListener("keydown", function (e) {
      var step = e.shiftKey ? 10 : 3;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") { focus = Math.min(100, focus + step); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowDown") { focus = Math.max(0, focus - step); }
      else if (e.key === "Home") { focus = SHARP; }
      else { return; }
      e.preventDefault(); e.stopPropagation();
      applyFocus();
    });
  }

  /* ---------------------------------------------------------------- boot */
  buildTray();
  paintTray();
  paintSlide();
  applyFocus();
  setLamp(1);

  function relayout() { drawBeam(); }
  window.addEventListener("resize", relayout, { passive: true });
  window.addEventListener("load", relayout);
  if (window.ResizeObserver) { new ResizeObserver(relayout).observe(room); }
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(relayout); }
  setTimeout(relayout, 60);
  setTimeout(relayout, 400);

  /* a hook the verifier (and nothing else) uses */
  window.__projector = {
    get index() { return index; },
    get ring() { return ring; },
    get src() { return img ? img.getAttribute("src") : null; },
    get blur() { return getComputedStyle(document.documentElement).getPropertyValue("--blur").trim(); },
    get lamp() { return getComputedStyle(document.documentElement).getPropertyValue("--lamp").trim(); },
    next: function () { goTo(index + 1); },
    prev: function () { goTo(index - 1); },
    setFocus: function (v) { focus = v; applyFocus(); },
    get busy() { return busy; }
  };
})();
