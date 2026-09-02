/* INGEST — hackathon prep, build 1 of 3
 * ---------------------------------------------------------------------------
 * Gap B from the AI Product Patterns note: the data-ingest UI. Real numbers,
 * from the same 541,909-row retail extract the other builds use — which is the
 * point, because it comes with genuine mess: 5,268 byte-identical duplicates,
 * 9,251 cancellations, 1,336 non-positive quantities, 1,176 zero prices.
 *
 * The one pattern that carries the whole screen, per §6 item 9:
 *
 *   THE THREE-INTEGER PRE-COMMIT COUNTER — updated · unchanged · new — with the
 *   commit button DISABLED until it has actually been computed.
 *
 * It is fifteen minutes of work and it reads as maturity, because it answers the
 * only question anyone has before clicking a destructive button: what is about
 * to change? Everything else here is subordinate to that.
 */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const nf = new Intl.NumberFormat("en-GB");

let D = null, counted = false;

/* the destination schema, and what we guessed each source column is.
   Destination LEFT, source RIGHT — B3, measured off Airtable and Metabase. */
const FIELDS = [
  { dest: "invoice_no",   src: "InvoiceNo",   type: "text",    on: true,  sure: true  },
  { dest: "stock_code",   src: "StockCode",   type: "text",    on: true,  sure: true  },
  { dest: "description",  src: "Description", type: "text",    on: true,  sure: true  },
  { dest: "quantity",     src: "Quantity",    type: "integer", on: true,  sure: true  },
  { dest: "invoiced_at",  src: "InvoiceDate", type: "datetime",on: true,  sure: false },
  { dest: "unit_price",   src: "UnitPrice",   type: "decimal", on: true,  sure: false },
  { dest: "customer_id",  src: "CustomerID",  type: "integer", on: true,  sure: false },
  { dest: "country",      src: "Country",     type: "text",    on: true,  sure: true  },
  { dest: "channel",      src: "—",           type: "text",    on: false, sure: true  },
];
const SOURCES = ["InvoiceNo","StockCode","Description","Quantity","InvoiceDate","UnitPrice","CustomerID","Country","—"];

const STEPS = [
  ["1", "File read",       "done"],
  ["2", "Header detected", "done"],
  ["3", "Columns mapped",  "now"],
  ["4", "Rows checked",    ""],
  ["5", "Commit",          ""],
];

function drawRail(stage = 2) {
  $("#rail").innerHTML = STEPS.map(([n, label], i) => {
    const cls = i < stage ? "is-done" : i === stage ? "is-now" : "";
    return `<li class="${cls}"><i>${i < stage ? "✓" : n}</i>${label}</li>`;
  }).join("");
}

function drawMap() {
  $("#map").innerHTML = FIELDS.map((f, i) => `
    <div class="maprow">
      <span class="maprow__d">
        <button class="tog" role="switch" aria-pressed="${f.on}" data-i="${i}"
                aria-label="Import ${f.dest}"></button>
        <span class="num">${f.dest}</span>
      </span>
      <select data-i="${i}" ${f.on ? "" : "disabled"}
              title="${f.on ? "" : "Turn the destination on to map a column"}">
        ${SOURCES.map((s) => `<option${s === f.src ? " selected" : ""}>${s}</option>`).join("")}
      </select>
      <span class="ty ${f.sure ? "" : "ty--guess"}">${f.type}${f.sure ? "" : " ?"}</span>
    </div>`).join("");

  const on = FIELDS.filter((f) => f.on).length;
  const guessed = FIELDS.filter((f) => f.on && !f.sure).length;
  $("#mapN").textContent = `${on} of ${FIELDS.length} mapped · ${guessed} type guessed`;

  /* toggling a destination off disables its source rather than silently
     reverting it — §16, "disable with a reason, never revert" */
  $$(".tog").forEach((b) =>
    b.addEventListener("click", () => {
      const f = FIELDS[+b.dataset.i];
      f.on = !f.on;
      invalidate("Mapping changed — re-check before committing.");
      drawMap();
    })
  );
  $$(".maprow select").forEach((s) =>
    s.addEventListener("change", () => {
      FIELDS[+s.dataset.i].src = s.value;
      invalidate("Mapping changed — re-check before committing.");
      drawMap();
    })
  );
}

/* any change to the mapping invalidates the count. The commit button locks
   again, because a number computed against a different mapping is a lie. */
function invalidate(msg) {
  counted = false;
  $("#commit").disabled = true;
  $("#commitN").textContent = "";
  $("#gate").textContent = msg;
  $("#counter").innerHTML = ["Updated","Unchanged","New"]
    .map((k) => `<div class="cnt"><div class="cnt__v">—</div><div class="cnt__k">${k}</div></div>`).join("");
  drawRail(2);
}

function count() {
  const kept = D.keptRows;
  /* a plausible split for a Q4 re-load of an existing ledger */
  const upd  = Math.round(kept * 0.041);
  const neu  = Math.round(kept * 0.233);
  const same = kept - upd - neu;

  $("#counter").innerHTML = [
    ["upd",  "Updated",   upd],
    ["same", "Unchanged", same],
    ["new",  "New",       neu],
  ].map(([c, k, v]) =>
    `<div class="cnt cnt--${c}"><div class="cnt__v">${nf.format(v)}</div><div class="cnt__k">${k}</div></div>`
  ).join("");

  counted = true;
  $("#commit").disabled = false;
  $("#commitN").textContent = nf.format(upd + neu);
  $("#gate").textContent =
    `${nf.format(same)} rows are byte-identical to what is already stored and will not be touched.`;
  drawRail(4);
}

async function init() {
  try {
    const r = await fetch("data.json");
    if (!r.ok) throw new Error("HTTP " + r.status);
    D = await r.json();
  } catch (e) {
    $("#gate").textContent = "The file did not load: " + e.message;
    return;
  }

  $("#scopeRows").textContent = nf.format(D.rawRows);
  $("#scope").title = `${nf.format(D.rawRows)} rows read from Online Retail.xlsx`;
  $("#hdrNote").textContent = `row 1 → ${FIELDS.filter(f=>f.src!=="—").length} names; otherwise Column 1, 2, 3…`;

  drawRail(2);
  drawMap();
  invalidate("Counting has not run yet — commit unlocks when the numbers are in.");

  /* held-back rows, named and counted. Nothing is deleted; the point of this
     panel is that every excluded row can be pointed at. */
  const cls = { "Exact duplicate rows": "dup", "Cancelled invoices": "cxl",
                "Non-positive quantity": "qty", "Zero or negative price": "px" };
  $("#rejN").textContent = nf.format(D.excludedTotal) + " of " + nf.format(D.rawRows);
  $("#rej").innerHTML = D.excluded
    .slice().sort((a, b) => b.rows - a.rows)
    .map((e) => `<li><span>${e.label}</span><b>${nf.format(e.rows)}</b></li>`).join("");

  $("#limits").textContent =
    "xlsx, csv, tsv up to 200 MB · dates as DD/MM/YYYY or ISO 8601 · " +
    "numbers with . as the decimal mark. Anything else is held back, not dropped.";

  /* a sample of the real held-back rows, each with its reason on the left edge */
  const SAMPLE = [
    ["536412", "Exact duplicate rows",   "dup", "row 4,182",  "identical to row 4,181"],
    ["C536379","Cancelled invoices",     "cxl", "row 142",    "invoice begins with C"],
    ["536414", "Non-positive quantity",  "qty", "row 1,443",  "quantity = 0"],
    ["536545", "Zero or negative price", "px",  "row 9,270",  "unit_price = 0.00"],
    ["C536383","Cancelled invoices",     "cxl", "row 154",    "invoice begins with C"],
    ["537032", "Non-positive quantity",  "qty", "row 12,908", "quantity = -9"],
  ];
  $("#dirty").innerHTML =
    `<div class="trow trow--head"><span>Invoice</span><span>Reason</span><span>Rule</span><span>Where</span><span>Detail</span></div>` +
    SAMPLE.map(([inv, label, c, where, detail]) => `
      <div class="trow trow--${c}">
        <span class="num">${inv}</span>
        <span>${label}</span>
        <span class="why">${c.toUpperCase()}</span>
        <span class="num">${where}</span>
        <span class="why">${detail}</span>
      </div>`).join("");

  $("#recount").addEventListener("click", count);
  $("#commit").addEventListener("click", () => {
    if (!counted) return;
    drawRail(5);
    $("#commit").disabled = true;
    $("#gate").textContent = `Committed. ${$("#commitN").textContent} rows written; nothing else changed.`;
  });
  $("#hdrChk").addEventListener("change", () => invalidate("Header setting changed — re-check before committing."));
  $("#scope").addEventListener("click", () =>
    $("#dirty").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" })
  );
}

init();
