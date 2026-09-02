/* THE BUILDING — portfolio 2 of 3
 * ---------------------------------------------------------------------------
 * Nine projects from projects.json, the same file the other two portfolios use.
 *
 * THE OBJECT IS A LIFT, and two things make it load-bearing rather than a
 * themed tab bar:
 *
 *   1. FLOOR NUMBER = HOW FINISHED IT IS. Shipped and live work is at the top
 *      of the building; prototypes are at the bottom. The directory is
 *      therefore a ranking, and the shape of the stack is readable before any
 *      name is.
 *
 *   2. ⭐ TRAVEL TIME IS REAL. The car steps through every intervening floor,
 *      one at a time, and the indicator shows each one. Calling 9 from 1 takes
 *      eight steps; calling 2 takes one. Distance costs time. A tab bar cannot
 *      do that, and it is the entire reason this is a lift.
 *
 * Nothing moves until a button is pressed, and everything settles when it
 * arrives — the doors are the only large motion on the page.
 */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* how finished a thing is, which is literally its altitude */
const RANK = { LIVE: 5, SHIPPED: 4, PLAYABLE: 3, "IN BUILD": 2, PROTOTYPE: 1 };

let P = [], floors = [], at = 1, moving = false;

const STEP = 260;                 /* ms per floor passed */

function travel(target) {
  if (moving || target === at) return;
  moving = true;
  $$(".btns button").forEach((b) => b.classList.toggle("is-lit", +b.dataset.f === target));

  const dir = target > at ? 1 : -1;
  $("#indA").textContent = dir > 0 ? "▲" : "▼";
  $("#indS").textContent = `${Math.abs(target - at)} ${Math.abs(target - at) === 1 ? "floor" : "floors"}`;
  $("#doors").classList.remove("is-open");

  const stepOnce = () => {
    at += dir;
    $("#indF").textContent = String(at).padStart(2, "0");
    mark();
    if (at !== target) { setTimeout(stepOnce, REDUCED ? 0 : STEP); return; }
    arrive();
  };
  setTimeout(stepOnce, REDUCED ? 0 : 260);
}

function arrive() {
  const p = floors[at - 1];
  $("#indA").textContent = "·";
  $("#indS").textContent = "Doors open";
  $("#fNo").textContent = `Floor ${String(at).padStart(2, "0")}`;
  $("#fName").textContent = p.name;
  $("#fYear").textContent = p.year;
  $("#fStatus").textContent = p.status;
  $("#fDesc").textContent = p.desc;
  $("#fTags").innerHTML = p.tags.map((t) => `<li>${t}</li>`).join("");
  const a = $("#fLink");
  a.hidden = !p.url;
  if (p.url) { a.href = p.url; a.target = "_blank"; a.rel = "noopener"; }
  $("#doors").classList.add("is-open");
  moving = false;
}

function mark() {
  $$("#dirList li").forEach((li) => li.classList.toggle("is-here", +li.dataset.f === at));
}

async function init() {
  try {
    const r = await fetch("projects.json");
    if (!r.ok) throw new Error("HTTP " + r.status);
    P = await r.json();
  } catch (e) {
    $("#fName").textContent = "The building is empty";
    $("#fDesc").textContent = e.message;
    return;
  }

  /* the most finished work is the top floor. Ties keep source order, so the
     ranking is stable rather than reshuffling on every load. */
  floors = P.slice().sort((a, b) => (RANK[a.status] || 0) - (RANK[b.status] || 0));

  $("#dirList").innerHTML = floors.map((p, i) => {
    const n = i + 1;
    return `<li data-f="${n}"><b>${String(n).padStart(2, "0")}</b><span>${p.name}</span><em>${p.status}</em></li>`;
  }).reverse().join("");     /* the board reads top-down, like a real one */

  $("#btns").innerHTML = floors.map((_, i) => {
    const n = floors.length - i;
    return `<button data-f="${n}" aria-label="Floor ${n}, ${floors[n - 1].name}">${n}</button>`;
  }).join("");

  $$(".btns button").forEach((b) =>
    b.addEventListener("click", () => travel(+b.dataset.f))
  );
  $$("#dirList li").forEach((li) =>
    li.addEventListener("click", () => travel(+li.dataset.f))
  );

  const live = P.filter((p) => p.url).length;
  $("#load").textContent = `${floors.length} / ${live} live`;
  $("#footNote").textContent =
    `Top of the building is finished work. ${live} of ${floors.length} are online.`;

  /* open on the top floor: the best work, and the doors are already apart */
  at = floors.length;
  $("#indF").textContent = String(at).padStart(2, "0");
  $$(".btns button").forEach((b) => b.classList.toggle("is-lit", +b.dataset.f === at));
  mark();
  arrive();
}

init();
