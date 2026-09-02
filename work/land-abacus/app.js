/* SUM — landing page 3 of 3 (my own pick)
 * ---------------------------------------------------------------------------
 * ⭐ THE OBJECT: an abacus, and it is the pricing table.
 *
 * The brief I set myself: every SaaS pricing page is three columns and a "Contact
 * us" for the one you actually want. An abacus inverts that — there are no tiers,
 * you push beads until the rods say what you use, and the number under them is
 * the invoice. Nothing is typed, nothing is hidden behind a call.
 *
 * It is load-bearing in the strictest sense: the beads ARE the quantities. Delete
 * the abacus and the page has no pricing at all — not a picture of pricing, the
 * pricing. That is the test in [[Invent a New Object]].
 *
 * On theme, too ([[Object Must Be In Theme]]): an abacus is a bookkeeping tool.
 * It is the oldest one there is.
 *
 * MOTION: one bead moves under your finger, and the total counts to its new
 * value. No ambient anything.
 */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Each rod: how many beads, what one bead is worth, and how it is billed. */
const RODS = [
  { id: "inv",   name: "Invoices a month",  hint: "Sent, chased and reconciled for you",
    /* ⚠️ fmt receives the QUANTITY, not the bead count. It multiplied by 10 a
       second time and the rod read "150 invoices · $9" — a tenth of the real
       price, stated confidently. On a pricing page that is the worst kind of bug. */
    beads: 10, per: 5, unit: 10, rate: 6,  start: 3, fmt: (v) => `${v} invoices` },
  { id: "acct",  name: "Bank accounts",     hint: "Feeds we watch and categorise daily",
    beads: 8,  per: 1, unit: 1,  rate: 8,  start: 2, fmt: (v) => `${v} account${v === 1 ? "" : "s"}` },
  { id: "staff", name: "People on payroll", hint: "Payslips, super and STP filed each run",
    beads: 10, per: 1, unit: 1,  rate: 11, start: 0, fmt: (v) => v ? `${v} on payroll` : "no payroll" },
  { id: "bas",   name: "BAS quarters",      hint: "Prepared and lodged by a registered agent",
    beads: 4,  per: 1, unit: 1,  rate: 24, start: 4, fmt: (v) => `${v} of 4 quarters` },
];

const CARDS = [
  ["01", "Chases the money", "Invoices go out on your terms and the follow-ups go out on ours. Most studios get paid nine days sooner in the first quarter."],
  ["02", "Sorts the feed", "Every bank line is categorised within a day, so the number you see on a Tuesday is a number you can act on."],
  ["03", "Files the BAS", "Prepared and lodged by a registered agent — the number in the footer is ours, and you can check it."],
  ["04", "Answers by name", "You get one bookkeeper, not a queue. Same person next March as this one."],
];

const ROWS = [
  ["01", "Sole traders", "One ABN, one bank account, and a shoebox you have been avoiding since July."],
  ["02", "Small studios", "Two to eight people, a payroll run that has to be right, and no office manager."],
  ["03", "Trades", "Invoices raised on site, receipts in the ute, and a BAS that keeps sneaking up."],
  ["04", "Anyone mid-switch", "We take over from your last bookkeeper without you re-explaining the business."],
];

const QA = [
  ["Why show the price at all?", "Because hiding it wastes both our time. A bookkeeping job is a known quantity — it is invoices, accounts, payslips and quarters. If we can count it, we can price it, and if we can price it there is no honest reason to make you book a call first."],
  ["What if my numbers change?", "Move the beads. Billing follows the beads on the first of the month, so a quiet December costs less than a loud June, automatically. Nobody has to renegotiate anything."],
  ["Are you actually registered?", "Yes — the BAS agent number is in the footer and you can check it on the Tax Practitioners Board register in about thirty seconds. Do that before hiring anyone for this, including us."],
  ["What do you need to start?", "Read-only access to your bank feed, your last lodged BAS, and an hour on a call so we hear how the business actually works. First reconciled month is usually inside two weeks."],
  ["Can I keep my accountant?", "Yes, and most people do. We do the monthly work and hand your accountant a clean set of books at year end — they will generally thank you for it, because the alternative is the shoebox."],
];

/* ── the abacus ───────────────────────────────────────────────────────────── */
function abacus(onChange) {
  const root = $("#abacus");
  const state = {};
  let moves = 0;

  root.innerHTML = RODS.map((r) => `
    <div class="rod" data-id="${r.id}">
      <div class="rod__h">
        <span class="rod__n">${r.name}<small>${r.hint}</small></span>
        <span class="rod__v" data-v>&mdash;</span>
      </div>
      <div class="wire" role="group" aria-label="${r.name}">
        ${Array.from({ length: r.beads }, (_, i) =>
          `<button class="bead" type="button" data-i="${i}"
                   aria-label="Set ${r.name} to ${(i + 1) * r.per}"></button>`).join("")}
      </div>
    </div>`).join("");

  function paint(r) {
    const v = state[r.id];
    const wire = root.querySelector(`.rod[data-id="${r.id}"] .wire`);
    $$(".bead", wire).forEach((b, i) => {
      const on = i < v;
      b.classList.toggle("on", on);
      /* ⭐ the SPACE is the reading. The last counted bead pushes the rest of the
         rod away from it, so a rod can be read at a glance from across the room
         without counting anything — which is how a real abacus works. */
      b.classList.toggle("edge", i === v - 1);
      b.setAttribute("aria-pressed", String(on));
    });
    root.querySelector(`.rod[data-id="${r.id}"] [data-v]`).innerHTML =
      `${r.fmt(v * r.per)} &middot; <b>$${v * r.per * r.rate / r.unit}</b>`;
  }

  function set(r, v) {
    v = Math.max(0, Math.min(r.beads, v));
    if (state[r.id] === v) return;
    state[r.id] = v;
    moves++; $("#moves").textContent = moves;
    paint(r);
    onChange(state);
  }

  RODS.forEach((r) => {
    state[r.id] = r.start;
    const wire = root.querySelector(`.rod[data-id="${r.id}"] .wire`);

    /* click a bead: everything up to and including it is counted. Clicking the
       last counted bead clears it, so one control both adds and removes. */
    $$(".bead", wire).forEach((b, i) => {
      b.addEventListener("click", () => set(r, state[r.id] === i + 1 ? i : i + 1));
      b.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") { set(r, state[r.id] + 1); e.preventDefault(); }
        if (e.key === "ArrowLeft")  { set(r, state[r.id] - 1); e.preventDefault(); }
      });
    });

    /* and drag along the wire, which is how you would actually use one */
    let dragging = false;
    const at = (clientX) => {
      const beads = $$(".bead", wire);
      const first = beads[0].getBoundingClientRect();
      const step = first.width + 4;
      return Math.round((clientX - first.left) / step);
    };
    wire.addEventListener("pointerdown", (e) => {
      dragging = true; wire.setPointerCapture(e.pointerId); set(r, at(e.clientX));
    });
    wire.addEventListener("pointermove", (e) => { if (dragging) set(r, at(e.clientX)); });
    wire.addEventListener("pointerup", () => { dragging = false; });
    wire.addEventListener("pointercancel", () => { dragging = false; });

    paint(r);
  });

  onChange(state);
  return state;
}

/* ── page ─────────────────────────────────────────────────────────────────── */
function init() {
  const amtEl = $("#amt"), billEl = $("#bill");
  let shown = 0, raf = 0;

  function onChange(state) {
    const lines = RODS.map((r) => {
      const qty = state[r.id] * r.per;
      return { label: r.fmt(qty), cost: qty * r.rate / r.unit, zero: qty === 0 };
    });
    const total = lines.reduce((s, l) => s + l.cost, 0);

    billEl.innerHTML = lines.map((l) =>
      `<li${l.zero ? ' class="zero"' : ""}><span>${l.label}</span><b>$${l.cost}</b></li>`).join("");

    /* the total counts to its new value rather than snapping — the one bit of
       motion on the page, and it is a direct consequence of your own action */
    cancelAnimationFrame(raf);
    if (REDUCED) { shown = total; amtEl.textContent = total; return; }
    const from = shown, t0 = performance.now();
    const step = (t) => {
      const k = Math.min((t - t0) / 380, 1);
      shown = Math.round(from + (total - from) * (1 - Math.pow(1 - k, 3)));
      amtEl.textContent = shown;
      if (k < 1) raf = requestAnimationFrame(step);
      else shown = total;
    };
    raf = requestAnimationFrame(step);
  }

  abacus(onChange);

  $("#cards").innerHTML = CARDS.map(([n, b, s]) =>
    `<article class="card"><i>${n}</i><b>${b}</b><span>${s}</span></article>`).join("");

  $("#rows").innerHTML = ROWS.map(([n, b, m]) =>
    `<li><span class="no">${n}</span><b>${b}</b><span class="m">${m}</span></li>`).join("");

  $("#qa").innerHTML = QA.map(([q, a], i) => `
    <details${i === 0 ? " open" : ""}>
      <summary>${q}</summary>
      <div class="a"><div><p>${a}</p></div></div>
    </details>`).join("");

  const rows = $$("#qa details");
  rows.forEach((d) => { if (d.open) d.classList.add("is-open"); });
  const close = (d) => {
    if (!d.open) return;
    d.classList.remove("is-open");
    if (REDUCED) { d.open = false; return; }
    const panel = d.querySelector(".a");
    const done = (e) => {
      if (e.propertyName !== "grid-template-rows") return;
      panel.removeEventListener("transitionend", done);
      if (!d.classList.contains("is-open")) d.open = false;
    };
    panel.addEventListener("transitionend", done);
  };
  rows.forEach((d) => {
    d.querySelector("summary").addEventListener("click", (e) => {
      e.preventDefault();
      if (d.open) { close(d); return; }
      rows.forEach((o) => o !== d && close(o));
      d.open = true;
      requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add("is-open")));
    });
  });

  const tick = () => $("#clock").textContent = new Date().toLocaleTimeString("en-AU",
    { timeZone: "Australia/Melbourne", hour: "2-digit", minute: "2-digit" });
  tick(); setInterval(tick, 30000);
}

init();
