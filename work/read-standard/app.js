/* The Day With Two Noons — an editorial long-read
 * ---------------------------------------------------------------------------
 * ⚠️ THIRD FORM. A game, then a product screen, now a page whose only job is to
 * be read — no object, no canvas, no shader, nothing to operate.
 *
 * There is almost no JavaScript here on purpose. An article that needs a script
 * to be readable is broken. All of this is enhancement:
 *   1. the reading time, measured from the actual words rather than typed in
 *   2. the progress rule at the top
 *   3. sidenotes lifted into the margin, positioned against their own marker
 *
 * ⭐ The sidenote positioning is the only real technique. The note has to sit
 * beside the paragraph that references it, and paragraphs reflow, so the top
 * offset can only be measured after layout — and re-measured on resize and on
 * font load. Doing it in CSS alone gets you notes that drift once the webfont
 * swaps in.
 */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const NOTES = {
  1: "<b>1840.</b> The GWR adopted London time on 1 November, eight years before the railways as a whole agreed to it. Its guards carried watches set at Paddington and corrected the station clocks as they went.",
  2: "<b>Fifty-three.</b> Allen's own count, from the timetables he edited. The figure is often given as seventy-five; that larger number counts local town times as well as railway times.",
  3: "<b>Cincinnati.</b> The council reversed itself in July 1884 after the city's own fire brigade twice recorded the same alarm an hour apart.",
};

function readingTime() {
  const words = $("#body").textContent.trim().split(/\s+/).length;
  /* 220 wpm is the usual figure for adult non-fiction on screen */
  const mins = Math.max(1, Math.round(words / 220));
  $("#mins").textContent = `${mins} min read`;
}

function progress() {
  const bar = $("#bar");
  const doc = document.documentElement;
  let ticking = false;
  const update = () => {
    const max = doc.scrollHeight - innerHeight;
    bar.style.width = `${max > 0 ? Math.min(scrollY / max, 1) * 100 : 0}%`;
    ticking = false;
  };
  addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);      /* one write per frame, never more */
  }, { passive: true });
  update();
}

/* ── sidenotes ────────────────────────────────────────────────────────────── */
function sidenotes() {
  const body = $("#body");

  /* build one note element per marker, appended after its paragraph so that on
     a narrow screen it simply reads inline underneath — no media-query JS */
  $$(".note", body).forEach((marker, i) => {
    const n = marker.dataset.note;
    if (!NOTES[n]) return;
    const p = marker.closest("p");
    const el = document.createElement("aside");
    el.className = "sn-note";
    el.innerHTML = NOTES[n];
    el.dataset.for = n;
    p.after(el);
    marker.dataset.idx = i;
  });

  const wide = matchMedia("(min-width: 1080px)");

  function place() {
    const notes = $$(".sn-note", body);
    if (!wide.matches) {
      notes.forEach((el) => { el.style.top = ""; el.style.position = ""; });
      return;
    }
    const bodyTop = body.getBoundingClientRect().top + scrollY;
    let lastBottom = -Infinity;
    notes.forEach((el) => {
      const n = el.dataset.for;
      const marker = $(`.note[data-note="${n}"]`, body);
      if (!marker) return;
      const mTop = marker.getBoundingClientRect().top + scrollY - bodyTop;
      /* ⚠️ notes must not overlap each other. Push a note down if the one above
         it has not finished — the same rule a typesetter uses by hand. */
      const top = Math.max(mTop - 4, lastBottom + 18);
      el.style.position = "absolute";
      el.style.top = `${top}px`;
      lastBottom = top + el.offsetHeight;
    });
  }

  body.style.position = "relative";
  place();
  addEventListener("resize", place, { passive: true });
  wide.addEventListener("change", place);
  /* ⭐ re-place once the webfont has swapped in. Without this the notes are
     measured against the fallback face and sit a few lines off. */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
}

readingTime();
progress();
sidenotes();
