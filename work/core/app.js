/* ============================================================================
   THE CORE — one object, and the page is quiet enough to pay for it.

   Everything the visitor causes:
     drag / wheel / arrow keys  ->  the core slides, a layer meets the reading line
     click the live layer, ENTER, or CUT  ->  a slab swings out of the tube
   Nothing moves on its own. Ever.
   ========================================================================== */
(function () {
  "use strict";

  var stage  = document.getElementById("stage");
  var barrel = document.getElementById("barrel");
  var drift  = document.getElementById("drift");
  var layers = Array.prototype.slice.call(document.querySelectorAll(".layer"));

  var elDepth = document.getElementById("depth");
  var elName  = document.getElementById("name");
  var elState = document.getElementById("state");
  var elCount = document.getElementById("count");
  var readout = document.querySelector(".readout");

  var slab   = document.getElementById("slab");
  var sDepth = document.getElementById("slabDepth");
  var sName  = document.getElementById("slabName");
  var sClause= document.getElementById("slabClause");
  var sA     = document.getElementById("slabA");
  var sB     = document.getElementById("slabB");

  var btnUp   = document.getElementById("up");
  var btnDown = document.getElementById("down");
  var btnCut  = document.getElementById("cut");

  if (!stage || !layers.length) return;

  /* ── depth bands, derived from the layers themselves ─────────────────── */
  var run = 0;
  layers.forEach(function (el) {
    var cm = parseFloat(el.style.getPropertyValue("--cm")) || 0;
    el.dataset.top = String(run);
    run += cm;
    el.dataset.bot = String(run);
  });

  var index = 0;
  var y = 0, minY = 0, maxY = 0;
  var cut = [];                       // layers already opened, in order
  var openOn = -1;                    // which index the slab is showing, -1 = shut
  var hideTimer = null;

  readout.setAttribute("aria-live", "polite");

  /* ── geometry ─────────────────────────────────────────────────────────── */
  function centreOf(i) {
    var el = layers[i];
    return el.offsetTop + el.offsetHeight / 2;
  }
  function targetFor(i) { return barrel.clientHeight / 2 - centreOf(i); }
  function bounds() {
    maxY = targetFor(0);
    minY = targetFor(layers.length - 1);
  }
  function clamp(v) { return Math.max(minY, Math.min(maxY, v)); }
  function place(v) { y = v; drift.style.transform = "translate3d(0," + v + "px,0)"; }

  /* which layer is standing in the reading line right now */
  function nearest() {
    var line = barrel.clientHeight / 2 - y, best = 0, bestD = Infinity;
    for (var i = 0; i < layers.length; i++) {
      var d = Math.abs(centreOf(i) - line);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  /* ── the readout: a depth, a name, a state. Nothing else. ─────────────── */
  function paint() {
    var el = layers[index];
    elDepth.textContent = el.dataset.top + "–" + el.dataset.bot + " cm";
    elName.textContent  = el.dataset.n;
    elState.textContent = el.dataset.t;
    layers.forEach(function (l, i) { l.classList.toggle("is-live", i === index); });
  }

  function select(i, eased) {
    i = Math.max(0, Math.min(layers.length - 1, i));
    if (openOn !== -1 && i !== index) shut();
    index = i;
    drift.classList.toggle("is-eased", eased !== false);
    place(clamp(targetFor(i)));
    paint();
  }

  /* ── the slab: the only place long copy is allowed to live ───────────── */
  function open() {
    var el = layers[index];
    sDepth.textContent  = el.dataset.top + "–" + el.dataset.bot + " cm";
    sName.textContent   = el.dataset.n;
    sClause.textContent = el.dataset.c;
    sA.innerHTML = el.dataset.a;
    sB.innerHTML = el.dataset.b;

    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    slab.hidden = false;
    void slab.offsetWidth;                       // commit the shut state first
    slab.classList.add("is-out");
    readout.classList.add("is-parked");
    btnCut.classList.add("is-open");
    btnCut.textContent = "Close";
    btnCut.setAttribute("aria-label", "Close the cut layer");

    if (!el.classList.contains("is-cut")) {
      el.classList.add("is-cut");
      cut.push(index);
      score();
    }
    openOn = index;
  }

  function shut() {
    openOn = -1;
    slab.classList.remove("is-out");
    readout.classList.remove("is-parked");
    btnCut.classList.remove("is-open");
    btnCut.textContent = "Cut";
    btnCut.setAttribute("aria-label", "Cut this layer open");
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(function () { slab.hidden = true; hideTimer = null; }, 460);
  }

  function toggle() { if (openOn === index) shut(); else open(); }

  function score() {
    var n = cut.length < 10 ? "0" + cut.length : String(cut.length);
    elCount.textContent = "Cut " + n + " / " + layers.length;
  }

  /* ── drag: the core is heavy, and it stops where you leave it ─────────── */
  var dragging = false, grabY = 0, grabAt = 0, moved = 0;

  barrel.addEventListener("pointerdown", function (e) {
    dragging = true; moved = 0;
    grabY = e.clientY; grabAt = y;
    drift.classList.remove("is-eased");
    barrel.classList.add("is-dragging");
    barrel.setPointerCapture(e.pointerId);
  });

  barrel.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    var dy = e.clientY - grabY;
    moved = Math.max(moved, Math.abs(dy));
    place(clamp(grabAt + dy));
    var n = nearest();
    if (n !== index) { index = n; paint(); }
  });

  function release(e) {
    if (!dragging) return;
    dragging = false;
    barrel.classList.remove("is-dragging");
    try { barrel.releasePointerCapture(e.pointerId); } catch (_) {}
    if (moved < 6) {
      // a tap, not a drag: take the layer under the finger, or open the live one
      var r = barrel.getBoundingClientRect();
      var hit = document.elementFromPoint(e.clientX, e.clientY);
      var lay = hit && hit.closest ? hit.closest(".layer") : null;
      var i = lay ? layers.indexOf(lay) : index;
      if (i === index) toggle(); else select(i);
      void r;
    } else {
      select(nearest());
    }
  }
  barrel.addEventListener("pointerup", release);
  barrel.addEventListener("pointercancel", release);

  /* ── wheel over the core steps one layer, and never scrolls the page ─── */
  barrel.addEventListener("wheel", function (e) {
    e.preventDefault();
    select(index + (e.deltaY > 0 ? 1 : -1));
  }, { passive: false });

  /* ── keys ─────────────────────────────────────────────────────────────── */
  stage.addEventListener("keydown", function (e) {
    var k = e.key;
    if (k === "ArrowDown" || k === "ArrowRight") { e.preventDefault(); select(index + 1); }
    else if (k === "ArrowUp" || k === "ArrowLeft") { e.preventDefault(); select(index - 1); }
    else if (k === "Enter" || k === " ") { e.preventDefault(); toggle(); }
    else if (k === "Escape" && openOn !== -1) { shut(); }
  });

  btnUp.addEventListener("click", function () { select(index - 1); });
  btnDown.addEventListener("click", function () { select(index + 1); });
  btnCut.addEventListener("click", toggle);
  slab.addEventListener("click", shut);

  /* ── boot / reflow ────────────────────────────────────────────────────── */
  function settle(eased) { bounds(); select(index, eased); }

  settle(false);
  requestAnimationFrame(function () { settle(false); });
  window.addEventListener("load", function () { settle(false); });
  window.addEventListener("resize", function () { settle(false); });
  score();
})();
