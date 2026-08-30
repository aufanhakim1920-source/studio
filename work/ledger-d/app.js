/* Ledger D
 * ---------------------------------------------------------------------------
 * All motion here is caused by the visitor: hovering the stack, focusing it,
 * or scrolling a section into view for the first time. Nothing runs on a timer
 * and nothing loops — that rule stands, because it came from a build that was
 * rejected for making the page feel unsettled.
 */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── the stack ────────────────────────────────────────────────────────────
   Opens on hover, on focus, and on tap. Tap matters: a phone has no hover, and
   an object whose whole point is that it opens must open on a phone too. */
const stack = $("#stack");

const open  = () => stack.classList.add("is-open");
const close = () => stack.classList.remove("is-open");

stack.addEventListener("pointerenter", open);
stack.addEventListener("pointerleave", close);
stack.addEventListener("focus", open);
stack.addEventListener("blur", close);
stack.addEventListener("click", () => stack.classList.toggle("is-open"));
stack.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); stack.classList.toggle("is-open"); }
});

/* ── the chart ────────────────────────────────────────────────────────────
   Two bars, drawn from the numbers in the copy so the two cannot drift apart. */
const DAYS = [
  { l: "Without Ledger", n: 34, ours: false },
  { l: "With Ledger",    n: 23, ours: true  },
];
const MAX = 40;

$("#rows").innerHTML = DAYS.map((d) => `
  <div class="bar${d.ours ? " bar--ours" : ""}">
    <span class="bar__l">${d.l}</span>
    <span class="bar__t"><span class="bar__f" data-w="${(d.n / MAX) * 100}">
      <span class="bar__n">${d.n} days</span></span></span>
  </div>`).join("");

/* ── reveal, once ─────────────────────────────────────────────────────────
   Sections lift in the first time they are reached, then the observer lets
   them go. Re-animating on every scroll past is the thing that makes a page
   feel restless. */
$$(".proof, .how, .price, .end").forEach((el) => el.classList.add("rise"));

function fillBars() {
  $$(".bar__f").forEach((f) => (f.style.width = f.dataset.w + "%"));
}

if (REDUCED || !("IntersectionObserver" in window)) {
  $$(".rise").forEach((el) => el.classList.add("in"));
  fillBars();
} else {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      if (e.target.classList.contains("proof")) fillBars();
      io.unobserve(e.target);          /* once, then never again */
    });
  }, { threshold: 0.16 });
  $$(".rise").forEach((el) => io.observe(el));
}
