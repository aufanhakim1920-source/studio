/* The playhead. One slider scrubs a 0:00-4:00 ruler; the film length it sits in decides
   which tier is in focus (shortest tier whose length still covers the playhead).
   Works with pointer (mouse, touch, pen) and keyboard. No outside links, no storage. */
(function () {
  var root = document.querySelector("[data-tl]");
  if (!root) return;
  var body = root.querySelector("[data-tl-body]");
  var ph = root.querySelector("[data-ph]");
  var head = root.querySelector("[data-ph-time]");
  var MAX = 240;
  var TIERS = [
    { key: "social", max: 60, mid: 30 },
    { key: "homepage", max: 120, mid: 96 },
    { key: "pitch", max: 240, mid: 180 }
  ];
  var t = 96;

  function fmt(s) {
    s = Math.round(s);
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }
  function tierAt(s) {
    for (var i = 0; i < TIERS.length; i++) if (s <= TIERS[i].max) return TIERS[i];
    return TIERS[TIERS.length - 1];
  }
  function text(sel) {
    var el = document.querySelector(sel);
    return el ? el.textContent.trim() : "";
  }
  function describe(s) {
    var k = tierAt(s).key;
    var name = text('[data-tier="' + k + '"] h3');
    var price = text('[data-tier="' + k + '"] [data-price]');
    return fmt(s) + " — " + name + (price ? ", " + price : "");
  }

  function set(s) {
    t = Math.max(0, Math.min(MAX, Math.round(s)));
    var tier = tierAt(t);
    root.style.setProperty("--t", String(t / MAX));
    head.textContent = fmt(t);
    ph.setAttribute("aria-valuenow", String(t));
    ph.setAttribute("aria-valuetext", describe(t));
    TIERS.forEach(function (x) {
      var on = x.key === tier.key;
      var card = document.querySelector('[data-tier="' + x.key + '"]');
      var lane = root.querySelector('[data-lane="' + x.key + '"]');
      var read = root.querySelector('[data-read="' + x.key + '"]');
      if (card) card.classList.toggle("is-on", on);
      if (lane) lane.classList.toggle("is-on", t <= x.max);
      if (lane) lane.classList.toggle("is-focus", on);
      if (read) read.hidden = !on;
    });
  }

  function fromX(clientX) {
    var r = body.getBoundingClientRect();
    return ((clientX - r.left) / r.width) * MAX;
  }

  var dragging = false;
  body.addEventListener("pointerdown", function (e) {
    if (e.button !== undefined && e.button !== 0) return;
    dragging = true;
    root.classList.add("is-drag");
    try { body.setPointerCapture(e.pointerId); } catch (err) {}
    set(fromX(e.clientX));
    ph.focus({ preventScroll: true });
    e.preventDefault();
  });
  body.addEventListener("pointermove", function (e) {
    if (dragging) set(fromX(e.clientX));
  });
  function end(e) {
    if (!dragging) return;
    dragging = false;
    root.classList.remove("is-drag");
    try { body.releasePointerCapture(e.pointerId); } catch (err) {}
  }
  body.addEventListener("pointerup", end);
  body.addEventListener("pointercancel", end);

  ph.addEventListener("keydown", function (e) {
    var step = e.shiftKey ? 1 : 5;
    var next = null;
    switch (e.key) {
      case "ArrowRight": case "ArrowUp": next = t + step; break;
      case "ArrowLeft": case "ArrowDown": next = t - step; break;
      case "PageUp": next = t + 30; break;
      case "PageDown": next = t - 30; break;
      case "Home": next = 0; break;
      case "End": next = MAX; break;
    }
    if (next !== null) { e.preventDefault(); set(next); }
  });

  // Pointing at a tier row moves the playhead into that film length.
  TIERS.forEach(function (x) {
    var card = document.querySelector('[data-tier="' + x.key + '"]');
    if (card) card.addEventListener("click", function () { set(x.mid); });
  });

  // Re-read names and prices when the visitor changes region or language.
  var tiers = document.querySelector("[data-tiers]");
  if (tiers && "MutationObserver" in window) {
    new MutationObserver(function () {
      ph.setAttribute("aria-valuetext", describe(t));
    }).observe(tiers, { childList: true, subtree: true, characterData: true });
  }

  set(t);
})();
