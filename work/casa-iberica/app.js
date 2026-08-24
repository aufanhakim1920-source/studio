/* ═══════════════════════════════════════════════════════════════════════════
   CASA IBERICA DELI — the ticket dispenser.

   Every movement in here is fired by the visitor: a drag on the paper, a press
   on the chrome bar, a tap on a stub, a pointer moving across the tiles.
   There is not one timer, loop or autoplay in this file, by design.

   The six tickets ARE the site. No nav, no accordion, no spec table.
   ═══════════════════════════════════════════════════════════════════════════ */

/* Verified facts only — the address, the year, the family, the Alphington
   kitchen/factory/school, the bookings address. Nothing invented.
   PLACEHOLDER: ticket 06 would carry the real product range and ticket 05 the
   real class dates and price — both have to come from the owner. */
const TICKETS = [
  { n: "01", es: "La tienda",    label: "The shop",       icon: "i-shop",
    detail: "25 Johnston Street, Fitzroy. Spanish, Portuguese and Latin American, over the same counter since 1975." },
  { n: "02", es: "La familia",   label: "The family",     icon: "i-family",
    detail: "Family run. <em>Paulo, Mericia, Brandon and Jaden</em> — carrying the tradition on." },
  { n: "03", es: "Embutidos",    label: "Small goods",    icon: "i-chorizo",
    detail: "The chorizo is made at our own factory, in the Casa Iberica Kitchen at Alphington." },
  { n: "04", es: "La cocina",    label: "The kitchen",    icon: "i-kitchen",
    detail: "Alphington: a warehouse, the chorizo factory and a shop, all under one roof." },
  { n: "05", es: "Las clases",   label: "Cooking school", icon: "i-class",
    detail: "A purpose-built space for classes at the Alphington kitchen. Bookings: <em>classes@casaibericadeli.com.au</em>" },
  { n: "06", es: "Los estantes", label: "The shelves",    icon: "i-shelf",
    detail: "Groceries from Spain, Portugal and Latin America — shelf after shelf of them." },
];

const TOTAL  = TICKETS.length;
const THRESH = 88;   /* px of drag before the perforation gives */

const stage    = document.getElementById("stage");
const disp     = document.getElementById("disp");
const tongue   = document.getElementById("tongue");
const pullBtn  = document.getElementById("pull");
const rollG    = document.getElementById("rollG");
const servingN = document.getElementById("servingN");
const serving  = servingN.closest(".serving");
const drop     = document.getElementById("drop");
const spike    = document.getElementById("spike");

let taken   = [];    /* indices pulled, in order */
let showing = null;  /* index currently lying on the counter */

/* ── the machine's own readouts ──────────────────────────────────────────── */

function setRoll() {
  /* the roll's remaining diameter IS how much of the deli is left to see */
  rollG.style.transform = "scale(" + (1 - (0.7 / TOTAL) * taken.length).toFixed(3) + ")";
}

function knock(num) {
  servingN.textContent = num;
  serving.classList.add("knock");
  setTimeout(function () { serving.classList.remove("knock"); }, 190);
}

/* ── the ticket on the counter ───────────────────────────────────────────── */

function layTicket(i, dropIn) {
  const t = TICKETS[i];
  const old = drop.querySelector(".ticket");

  function build() {
    const el = document.createElement("div");
    el.className = "ticket";
    if (!dropIn) el.style.animation = "none";
    el.innerHTML =
      '<div class="t-card">' +
        '<span class="t-no">' + t.n + '</span>' +
        '<span class="t-es">' + t.es + '</span>' +
        '<span class="t-label">' + t.label + '</span>' +
        '<span class="t-icon"><svg viewBox="0 0 64 64" aria-hidden="true"><use href="#' + t.icon + '"></use></svg></span>' +
        '<button class="t-more" type="button" aria-expanded="false">More</button>' +
      '</div>' +
      '<div class="t-flap"><div class="t-detail">' + t.detail + '</div></div>';

    const more = el.querySelector(".t-more");
    more.addEventListener("click", function () {
      const open = el.classList.toggle("open");
      more.setAttribute("aria-expanded", open ? "true" : "false");
      more.firstChild.nodeValue = open ? "Less" : "More";
    });

    drop.appendChild(el);
    drop.classList.add("has");
    showing = i;
    markStub();
  }

  if (old) {
    old.classList.add("leaving");
    setTimeout(function () { old.remove(); build(); }, 170);
  } else {
    build();
  }
}

/* ── the stubs on the brass spike: your progress, physically ─────────────── */

function addStub(i) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "stub";
  b.textContent = TICKETS[i].n;
  b.style.setProperty("--rot", (i % 2 ? 1.6 : -1.9) + "deg");
  b.setAttribute("aria-label", "Ticket " + TICKETS[i].n + ", " + TICKETS[i].label);
  b.addEventListener("click", function () {
    if (showing !== i) layTicket(i, false);
  });
  spike.appendChild(b);
}

function markStub() {
  spike.querySelectorAll(".stub").forEach(function (s, k) {
    s.setAttribute("aria-current", taken[k] === showing ? "true" : "false");
  });
}

/* ── the tear ────────────────────────────────────────────────────────────── */

function tear() {
  if (taken.length >= TOTAL) { reload(); return; }

  const i = taken.length;
  taken.push(i);

  tongue.classList.add("gone");
  setTimeout(function () {
    setPull(0);
    tongue.classList.remove("gone");
    if (taken.length >= TOTAL) {
      tongue.style.display = "none";
      pullBtn.textContent = "New roll";
      pullBtn.setAttribute("aria-label", "Load a new roll of tickets");
    }
  }, 240);

  setRoll();
  knock(TICKETS[i].n);
  layTicket(i, true);
  addStub(i);
}

function reload() {
  taken = [];
  showing = null;
  setRoll();
  knock("00");
  spike.querySelectorAll(".stub").forEach(function (s) { s.remove(); });
  const old = drop.querySelector(".ticket");
  if (old) { old.classList.add("leaving"); setTimeout(function () { old.remove(); }, 170); }
  drop.classList.remove("has");
  tongue.style.display = "";
  setPull(0);
  pullBtn.textContent = "Pull";
  pullBtn.setAttribute("aria-label", "Pull a ticket from the dispenser");
}

/* ── dragging the paper ──────────────────────────────────────────────────── */

function setPull(px) {
  tongue.style.setProperty("--pull", px + "px");
  tongue.style.setProperty("--strain", Math.min(1, px / THRESH).toFixed(2));
  tongue.style.setProperty("--sway", (px * 0.012).toFixed(2) + "deg");
}

let dragging = false, startY = 0, pid = null;

tongue.addEventListener("pointerdown", function (e) {
  if (taken.length >= TOTAL) return;
  dragging = true;
  startY = e.clientY;
  pid = e.pointerId;
  tongue.setPointerCapture(pid);
  tongue.classList.add("dragging");
  e.preventDefault();
});

tongue.addEventListener("pointermove", function (e) {
  if (!dragging) return;
  const dy = Math.max(0, Math.min(THRESH + 26, e.clientY - startY));
  setPull(dy);
  if (dy >= THRESH) { endDrag(true); }
});

function endDrag(tore) {
  if (!dragging) return;
  dragging = false;
  tongue.classList.remove("dragging");
  try { tongue.releasePointerCapture(pid); } catch (err) {}
  if (tore) tear(); else setPull(0);
}

tongue.addEventListener("pointerup",     function () { endDrag(false); });
tongue.addEventListener("pointercancel", function () { endDrag(false); });

pullBtn.addEventListener("click", tear);

/* ── pointer-driven tilt: the box is a real box, so let it turn ──────────── */

if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
  stage.addEventListener("pointermove", function (e) {
    const r = stage.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width  - 0.5;
    const y = (e.clientY - r.top)  / r.height - 0.5;
    disp.classList.add("live");
    disp.style.setProperty("--ty", (-13 + x * 14).toFixed(2) + "deg");
    disp.style.setProperty("--tx", (3 - y * 9).toFixed(2) + "deg");
  });
  stage.addEventListener("pointerleave", function () {
    disp.classList.remove("live");
    disp.style.setProperty("--ty", "-13deg");
    disp.style.setProperty("--tx", "3deg");
  });
}

setRoll();
