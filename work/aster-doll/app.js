/* ============================================================
   Figure Unboxing — open/close sequence + drag-to-rotate
   ============================================================ */

(() => {
  const orbit = document.getElementById("orbit");
  const scene = document.getElementById("scene");
  const btn = document.getElementById("unbox-btn");
  const hint = document.getElementById("hint");
  const steps = [...document.querySelectorAll("#steps .step")];
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- rotation state ----------------
     Kept in JS rather than read back off the element, because the
     float animation owns .box-scene's transform and the drag owns
     .box-orbit's — never let the two write the same property.     */
  const REST = { y: -25, x: 15 };
  let rot = { ...REST };
  let drag = null;
  let opened = false;

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  function applyRotation() {
    orbit.style.transform = `rotateY(${rot.y}deg) rotateX(${rot.x}deg)`;
  }

  /* ---------------- drag to rotate ---------------- */
  function onDown(e) {
    const p = e.touches ? e.touches[0] : e;
    drag = { px: p.clientX, py: p.clientY, y: rot.y, x: rot.x };
    orbit.classList.add("is-dragging");
  }

  function onMove(e) {
    if (!drag) return;
    const p = e.touches ? e.touches[0] : e;
    rot.y = drag.y + (p.clientX - drag.px) * 0.4;
    rot.x = clamp(drag.x - (p.clientY - drag.py) * 0.3, -35, 60);
    applyRotation();
    if (e.cancelable) e.preventDefault();
  }

  function onUp() {
    if (!drag) return;
    drag = null;
    orbit.classList.remove("is-dragging");
  }

  orbit.addEventListener("mousedown", onDown);
  orbit.addEventListener("touchstart", onDown, { passive: true });
  window.addEventListener("mousemove", onMove);
  window.addEventListener("touchmove", onMove, { passive: false });
  window.addEventListener("mouseup", onUp);
  window.addEventListener("touchend", onUp);

  /* ---------------- open / close ---------------- */
  function setSteps(n) {
    steps.forEach((li, i) => {
      li.classList.remove("active", "pending", "done");
      if (i < n) li.classList.add("done");
      else if (i === n) li.classList.add("active");
      else li.classList.add("pending");
    });
  }

  let timers = [];
  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  function open() {
    opened = true;
    scene.classList.add("is-open");
    btn.textContent = "Seal it back up";
    hint.textContent = "Opening · 1 of 3 complete";
    setSteps(1);

    // Tip just far enough to see into the open lid. Past ~45deg the box
    // stops reading as a tall figure box standing up and starts reading as
    // a carton lying on its back — the legibility comes from the figure
    // rising out of the opening, not from a steeper camera.
    rot = { y: -20, x: 32 };
    applyRotation();

    clearTimers();
    const step = (fn, ms) => timers.push(setTimeout(fn, reduced ? 0 : ms));
    step(() => {
      setSteps(2);
      hint.textContent = "Tray lifted · 2 of 3 complete";
    }, 900);
    step(() => {
      setSteps(3);
      hint.textContent = "Mounted · 3 of 3 complete";
    }, 1700);
  }

  function close() {
    opened = false;
    scene.classList.remove("is-open");
    btn.textContent = "Begin Unboxing";
    hint.textContent = "Sealed · 0 of 3 complete";
    setSteps(0);
    clearTimers();
    rot = { ...REST };
    applyRotation();
  }

  btn.addEventListener("click", () => (opened ? close() : open()));

  applyRotation();
  setSteps(0);

  // deep-link / screenshot hook: /#open lands on the opened box
  if (location.hash === "#open") open();
  window.addEventListener("hashchange", () => {
    if (location.hash === "#open" && !opened) open();
  });
})();
