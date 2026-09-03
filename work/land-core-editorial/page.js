(() => {
  "use strict";

  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ── 1 · the readout ───────────────────────────────────────────────────── */

  const capD = $("#capD"), capA = $("#capA");
  const footD = $("#footD"), footA = $("#footA"), footBar = $("#footBar");

  const num = (n) => n.toLocaleString("en-AU");

  const ageWords = (a) => {
    if (a < 1) return "this winter.";
    if (a >= 1e6) {
      const m = (a / 1e6).toFixed(1).replace(/\.0$/, "");
      return m + " million years ago.";
    }
    return num(a) + " years ago.";
  };

  const ageFig = (a) => (a >= 1e6 ? (a / 1e6).toFixed(1).replace(/\.0$/, "") + " million" : num(a));

  CORE.on((d, a, t) => {
    if (capD) capD.textContent = d < 3 ? "the very top" : num(d) + " metres";
    if (capA) capA.textContent = ageWords(a);
    if (footD) footD.textContent = num(d);
    if (footA) footA.textContent = ageFig(a);
    if (footBar) footBar.style.width = (t * 100).toFixed(2) + "%";
  });

  /* ── 2 · reveal sweep ──────────────────────────────────────────────────── */

  if (!REDUCED) {
    document.documentElement.classList.add("motion");
    document.documentElement.style.scrollBehavior = "smooth";
  }

  const reveals = $$("[data-reveal]");
  let queued = false;
  function sweep() {
    queued = false;
    const h = innerHeight;
    for (let i = reveals.length - 1; i >= 0; i--) {
      const el = reveals[i];
      const r = el.getBoundingClientRect();
      if (r.top < h * 0.90 && r.bottom > -40) {
        el.classList.add("in");
        reveals.splice(i, 1);
      }
    }
  }
  function ask() { if (!queued) { queued = true; requestAnimationFrame(sweep); } }
  addEventListener("scroll", ask, { passive: true });
  addEventListener("resize", ask);
  requestAnimationFrame(() => requestAnimationFrame(sweep));
  // belt and braces: anything still hidden after the fonts land gets swept again
  addEventListener("load", ask);
  setTimeout(ask, 1200);

  /* ── 3a · the phone drawer ─────────────────────────────────────────────── */

  const toggle = $("#navToggle"), drawer = $("#drawer");

  function openDrawer() {
    drawer.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Close menu");
    requestAnimationFrame(() => requestAnimationFrame(() => drawer.classList.add("is-open")));
  }
  function closeDrawer() {
    if (drawer.hidden) return;
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open menu");
    drawer.classList.remove("is-open");
    const done = () => { drawer.hidden = true; };
    if (REDUCED) return done();
    let fired = false;
    const on = (e) => {
      if (e.target !== drawer || e.propertyName !== "grid-template-rows") return;
      fired = true; drawer.removeEventListener("transitionend", on); done();
    };
    drawer.addEventListener("transitionend", on);
    setTimeout(() => { if (!fired) { drawer.removeEventListener("transitionend", on); done(); } }, 900);
  }

  if (toggle && drawer) {
    toggle.addEventListener("click", () => {
      drawer.hidden ? openDrawer() : closeDrawer();
    });
    $$("a", drawer).forEach((a) => a.addEventListener("click", closeDrawer));
    addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); });
  }

  /* ── 3b · the FAQ ──────────────────────────────────────────────────────── */
  /* grid-template-rows 0fr -> 1fr, and [open] is removed only on transitionend */

  $$(".acc").forEach((acc) => {
    const sum = $("summary", acc);
    const body = $(".acc-body", acc);

    sum.addEventListener("click", (e) => {
      e.preventDefault();

      if (!acc.open) {
        /* Letting <details> just open jumps straight to 1fr with no transition:
           the content is not rendered while closed, so there is no start value
           to animate FROM (measured — it went 0 to 81.8px inside 40ms). So set
           [open] first with .is-shut pinning the rows at 0fr, let two frames
           pass so that pinned value is real, then release it. */
        acc.classList.add("is-shut");
        acc.open = true;
        if (REDUCED) return acc.classList.remove("is-shut");
        requestAnimationFrame(() => requestAnimationFrame(() => acc.classList.remove("is-shut")));
        return;
      }

      /* Closing: [open] has to survive until the rows have finished collapsing,
         or the answer vanishes instead of closing. */
      acc.classList.add("is-shut");
      const done = () => { acc.classList.remove("is-shut"); acc.open = false; };
      if (REDUCED) return done();

      let fired = false;
      const on = (ev) => {
        if (ev.target !== body || ev.propertyName !== "grid-template-rows") return;
        fired = true; body.removeEventListener("transitionend", on); done();
      };
      body.addEventListener("transitionend", on);
      setTimeout(() => { if (!fired) { body.removeEventListener("transitionend", on); done(); } }, 900);
    });
  });

  /* ── 4 · the modal, grown out of the button that opened it ─────────────── */

  const wrap = $("#modal");
  const panel = $(".modal-panel", wrap);
  const inner = $(".modal-inner", wrap);
  let opener = null;

  const focusables = () =>
    $$('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])', panel)
      .filter((e) => e.getBoundingClientRect().width > 0);

  function openModal(btn) {
    opener = btn;
    const b = btn.getBoundingClientRect();

    wrap.hidden = false;
    document.body.style.overflow = "hidden";

    if (!REDUCED) {
      const p = panel.getBoundingClientRect();
      const sx = Math.max(b.width / p.width, 0.04);
      const sy = Math.max(b.height / p.height, 0.04);
      const dx = (b.left + b.width / 2) - (p.left + p.width / 2);
      const dy = (b.top + b.height / 2) - (p.top + p.height / 2);
      panel.style.transition = "none";
      panel.style.opacity = "0";
      panel.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
      panel.getBoundingClientRect();            // force the layout, then let go
      panel.style.transition = "";
      panel.style.opacity = "1";
      panel.style.transform = "";
    }

    requestAnimationFrame(() => wrap.classList.add("is-open"));
    panel.focus();
  }

  function closeModal() {
    if (wrap.hidden) return;
    wrap.classList.remove("is-open");
    document.body.style.overflow = "";

    const finish = () => {
      wrap.hidden = true;
      panel.style.transform = "";
      panel.style.opacity = "";
      panel.style.transition = "";
      if (opener) { opener.focus(); opener = null; }
    };

    if (REDUCED || !opener) return finish();

    const b = opener.getBoundingClientRect();
    const p = panel.getBoundingClientRect();
    const sx = Math.max(b.width / p.width, 0.04);
    const sy = Math.max(b.height / p.height, 0.04);
    const dx = (b.left + b.width / 2) - (p.left + p.width / 2);
    const dy = (b.top + b.height / 2) - (p.top + p.height / 2);
    panel.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    panel.style.opacity = "0";

    let fired = false;
    const on = (e) => {
      if (e.target !== panel || e.propertyName !== "transform") return;
      fired = true; panel.removeEventListener("transitionend", on); finish();
    };
    panel.addEventListener("transitionend", on);
    setTimeout(() => { if (!fired) { panel.removeEventListener("transitionend", on); finish(); } }, 900);
  }

  $$("[data-open-modal]").forEach((b) => b.addEventListener("click", () => openModal(b)));
  $$("[data-close-modal]").forEach((b) => b.addEventListener("click", closeModal));

  addEventListener("keydown", (e) => {
    if (wrap.hidden) return;
    if (e.key === "Escape") { e.preventDefault(); closeModal(); return; }
    if (e.key !== "Tab") return;
    const f = focusables();
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  });

  /* keep the modal centred if the viewport changes while it is open */
  addEventListener("resize", () => { if (!wrap.hidden) panel.style.transform = ""; });
})();
