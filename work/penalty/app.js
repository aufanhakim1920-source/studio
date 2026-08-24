/* Penalty — motion.
   =========================================================================
   The brief on animation: use it, but never to the point the site stops
   working. So every effect here follows two rules:

   1. NOTHING IS HIDDEN UNTIL JS PROVES IT CAN SHOW IT AGAIN. The reveal
      class is added by this script, not baked into the stylesheet. If the
      JS fails to load, every element is simply visible — a page whose copy
      is invisible because an observer never fired is a broken page, and
      that is the usual way scroll animation kills a site.
   2. Anything that loops is tied to hover, and the whole lot is off under
      prefers-reduced-motion.

   Plus one thing this page needs that the portfolio does not: <details>
   snaps open with no animation at all, so the FAQ height is animated by
   hand. It still opens with JavaScript off — the element does its own job
   and this only smooths it. */

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* rule 1: opt the page into animation only once we are running */
if (!REDUCED) document.documentElement.classList.add("motion");

/* ── hero entrance ───────────────────────────────────────────────────── */
document.querySelectorAll("[data-enter]").forEach((el) => {
  el.style.setProperty("--d", (el.dataset.enter - 1) * 90 + "ms");
  requestAnimationFrame(() => el.classList.add("in"));
});

/* ── scroll reveal ───────────────────────────────────────────────────────
   ⚠️ This deliberately does NOT use IntersectionObserver alone. IO delivers
   asynchronously, so a fast flick-scroll or an in-page anchor jump can pass
   an element without it ever being reported — measured here: one work card
   stayed at opacity 0 permanently after a quick scroll through the page,
   and this page has three anchor links in its own header. A rAF-throttled
   position check cannot miss anything: on every frame that scrolls, whatever
   is at or above the fold gets revealed, full stop. Twelve elements make the
   cost irrelevant. */
const rise = [...document.querySelectorAll("[data-rise]")];

if (REDUCED) {
  rise.forEach((el) => el.classList.add("in"));
} else {
  rise.forEach((el) => {
    const sibs = [...el.parentElement.children].filter((c) => c.hasAttribute("data-rise"));
    el.style.setProperty("--d", Math.min(sibs.indexOf(el), 4) * 80 + "ms");
  });

  let queued = false;
  const sweep = () => {
    queued = false;
    const line = innerHeight * 0.94;
    for (let i = rise.length - 1; i >= 0; i--) {
      if (rise[i].getBoundingClientRect().top < line) {
        rise[i].classList.add("in");
        rise.splice(i, 1);
      }
    }
    if (!rise.length) {
      removeEventListener("scroll", ping);
      removeEventListener("resize", ping);
    }
  };
  const ping = () => { if (!queued) { queued = true; requestAnimationFrame(sweep); } };
  addEventListener("scroll", ping, { passive: true });
  addEventListener("resize", ping);
  sweep();
}

/* ── counters ────────────────────────────────────────────────────────── */
/* The final value is already in the HTML, so the number is correct with
   JavaScript off. This only animates towards it. */
function countUp(el) {
  const to = parseFloat(el.dataset.count);
  const dp = +(el.dataset.dp || 0);
  const suffix = el.dataset.suffix || "";
  const dur = 900;
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur);
    const eased = 1 - Math.pow(1 - k, 3);
    el.innerHTML = (to * eased).toFixed(dp) + suffix;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

const nums = [...document.querySelectorAll("[data-count]")];
if (!REDUCED) {
  let nq = false;
  const nsweep = () => {
    nq = false;
    for (let i = nums.length - 1; i >= 0; i--) {
      if (nums[i].getBoundingClientRect().top < innerHeight * 0.92) {
        countUp(nums[i]);
        nums.splice(i, 1);
      }
    }
    if (!nums.length) removeEventListener("scroll", nping);
  };
  const nping = () => { if (!nq) { nq = true; requestAnimationFrame(nsweep); } };
  addEventListener("scroll", nping, { passive: true });
  nsweep();
}


/* ── FAQ: animate a height <details> would otherwise snap ────────────── */
document.querySelectorAll(".faq details").forEach((d) => {
  const body = d.querySelector("p");
  if (!body || REDUCED) return;
  body.style.overflow = "hidden";

  d.querySelector("summary").addEventListener("click", (e) => {
    e.preventDefault();
    const open = d.open;
    if (!open) {
      d.open = true;
      const h = body.scrollHeight;
      body.animate([{ height: "0px", opacity: 0 }, { height: h + "px", opacity: 1 }],
        { duration: 240, easing: "cubic-bezier(.2,.8,.24,1)" });
    } else {
      const h = body.scrollHeight;
      const a = body.animate([{ height: h + "px", opacity: 1 }, { height: "0px", opacity: 0 }],
        { duration: 190, easing: "cubic-bezier(.2,.8,.24,1)" });
      a.onfinish = () => { d.open = false; };
    }
  });
});
