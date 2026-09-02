/* SPECIMEN DRAWER — portfolio 1 of 3
 * ---------------------------------------------------------------------------
 * Nine real projects, read from projects.json — the same file all three
 * portfolios use, so the content is fixed and the design is the only variable.
 *
 * The object is a museum specimen drawer, and it carries two readings that a
 * plain grid cannot:
 *
 *   1. THE PIN HEAD IS THE DISCIPLINE. Four colours, and a legend for them,
 *      because a colour code without a key is decoration.
 *
 *   2. ⭐ SQUARE MEANS FINISHED. CROOKED MEANS STILL BEING WORKED ON.
 *      Shipped work is pinned straight; anything in build or prototype sits at
 *      an angle. You can read the state of the whole practice from across the
 *      room, before a single word. That is the load-bearing part — delete the
 *      drawer and the reading goes with it.
 *
 * The tilt is derived from the project's own name, not random, so a given
 * project always sits at the same angle. A portfolio that reshuffles itself on
 * refresh feels broken rather than alive.
 */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* discipline, inferred from the tags the projects already carry */
const KEY = [
  ["web",    "Web & commerce", "var(--web)"],
  ["game",   "Games",          "var(--game)"],
  ["ai",     "AI & automation","var(--ai)"],
  ["motion", "Motion",         "var(--motion)"],
];
function discipline(p) {
  const t = (p.tags.join(" ") + " " + p.name).toLowerCase();
  if (/remotion|video|sound/.test(t)) return "motion";
  if (/unity|canvas|game|narrative/.test(t)) return "game";
  if (/proxy|observability|composio|automation|vision|serverless/.test(t)) return "ai";
  return "web";
}

/* finished = shipped or live. Everything else is still moving. */
const SETTLED = new Set(["LIVE", "SHIPPED", "PLAYABLE"]);

/* a stable pseudo-random tilt from the name, so it never reshuffles */
function tilt(name) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const deg = ((h % 900) / 100) - 4.5;        /* -4.5° … +4.5° */
  return (Math.abs(deg) < 1.4 ? deg + 1.9 * Math.sign(deg || 1) : deg).toFixed(2);
}

let P = [];

async function init() {
  try {
    const r = await fetch("projects.json");
    if (!r.ok) throw new Error("HTTP " + r.status);
    P = await r.json();
  } catch (e) {
    $("#pullT").textContent = "The drawer is empty: " + e.message;
    return;
  }

  $("#key").innerHTML = KEY
    .map(([k, label, col]) => `<div><i style="background:${col}"></i><span>${label}</span></div>`)
    .join("");

  $("#liner").innerHTML = P.map((p, i) => {
    const d = discipline(p);
    const settled = SETTLED.has(p.status) ? 1 : 0;
    return `
      <button class="sp" data-i="${i}" data-settled="${settled}"
              style="--tilt:${tilt(p.name)}deg"
              aria-label="${p.name}, ${p.status}${settled ? "" : ", still in progress"}">
        <span class="sp__shaft" aria-hidden="true"></span>
        <span class="sp__pin" aria-hidden="true" style="background:var(--${d})"></span>
        <span class="sp__card">
          <span class="sp__n">${String(i + 1).padStart(3, "0")}</span>
          <span class="sp__name">${p.name}</span>
          <span class="sp__meta">${p.year} &middot; ${p.status}</span>
          <span class="sp__rule"></span>
          <span class="sp__tags">${p.tags.slice(0, 3).join(" · ")}</span>
          ${p.url ? `<span class="sp__live">live</span>` : ""}
        </span>
      </button>`;
  }).join("");

  const drawer = $("#drawer");
  const setOpen = (open) => {
    drawer.classList.toggle("is-open", open);
    $("#pull").setAttribute("aria-expanded", String(open));
    $("#pullT").textContent = open ? "Close the drawer" : "Pull the drawer";
  };
  $("#pull").addEventListener("click", () => setOpen(!drawer.classList.contains("is-open")));

  $$(".sp").forEach((b) =>
    b.addEventListener("click", () => {
      if (!drawer.classList.contains("is-open")) { setOpen(true); return; }
      show(+b.dataset.i);
    })
  );

  $("#recX").addEventListener("click", () => ($("#rec").hidden = true));
  addEventListener("keydown", (e) => { if (e.key === "Escape") $("#rec").hidden = true; });

  setOpen(true);      /* it opens on load — a closed drawer is a locked door */
}

function show(i) {
  const p = P[i];
  const settled = SETTLED.has(p.status);
  $("#recNo").textContent = `Specimen ${String(i + 1).padStart(3, "0")} / ${discipline(p)}`;
  $("#recName").textContent = p.name;
  $("#recYear").textContent = p.year;
  $("#recStatus").textContent = p.status;
  $("#recDesc").textContent = p.desc;
  $("#recTags").innerHTML = p.tags.map((t) => `<li>${t}</li>`).join("");

  const a = $("#recLink");
  a.hidden = !p.url;
  if (p.url) { a.href = p.url; a.rel = "noopener"; a.target = "_blank"; }

  /* the note says out loud what the angle already said silently */
  $("#recNote").textContent = settled
    ? "Pinned square — this one is finished."
    : "Pinned crooked — still being worked on.";

  $("#rec").hidden = false;
}

init();
