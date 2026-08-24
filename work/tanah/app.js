/* TANAH — a concept storefront.
   =========================================================================
   A real e-commerce front end: filter, sort, colourway selection, add to
   cart, a cart drawer with quantities, a live subtotal, a free-shipping
   threshold, and state that survives a reload.

   The products are drawn as SVG vessels rather than photographed. We have no
   product photography and no rights to anyone else's, and a stock photo of
   someone else's pottery on a shop page would be a lie about the goods. The
   glaze is a gradient, so switching colourway genuinely re-renders the pot. */

const GLAZES = {
  sand: { name: "Sand", a: "#E7D8BE", b: "#C4AC85", rim: "#A8906A" },
  ash:  { name: "Ash",  a: "#C9CCC4", b: "#8E948C", rim: "#727A71" },
  clay: { name: "Clay", a: "#C98467", b: "#9B5A44", rim: "#7F4634" },
};

/* simple vessel silhouettes in a 100x100 box */
const SHAPES = {
  bowl:    "M15,44 Q50,39 85,44 L77,74 Q50,87 23,74 Z",
  mug:     "M25,33 L71,33 L67,79 Q48,86 29,79 Z",
  vase:    "M42,17 L58,17 L56,35 Q79,48 79,64 Q79,84 50,87 Q21,84 21,64 Q21,48 44,35 Z",
  plate:   "M10,54 Q50,44 90,54 Q50,70 10,54 Z",
  jug:     "M27,31 L69,31 L73,39 L66,79 Q48,86 31,79 Z",
  planter: "M25,35 L75,35 L68,82 Q50,87 32,82 Z",
};

const PRODUCTS = [
  { id: "bowl",    name: "Rice Bowl",     price: 28, shape: "bowl",    glazes: ["sand", "ash", "clay"], note: "13cm · stacks" },
  { id: "mug",     name: "Morning Mug",   price: 34, shape: "mug",     glazes: ["clay", "sand"],        note: "300ml · handle" },
  { id: "vase",    name: "Stem Vase",     price: 56, shape: "vase",    glazes: ["ash", "clay"],         note: "22cm · watertight" },
  { id: "plate",   name: "Side Plate",    price: 24, shape: "plate",   glazes: ["sand", "ash", "clay"], note: "19cm · set of 1" },
  { id: "jug",     name: "Milk Jug",      price: 42, shape: "jug",     glazes: ["clay", "ash"],         note: "450ml · pours clean" },
  { id: "planter", name: "Squat Planter", price: 48, shape: "planter", glazes: ["sand", "clay"],        note: "16cm · no drain hole" },
];

const FREE_SHIP = 80;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const money = (n) => "$" + n.toFixed(n % 1 ? 2 : 0);

/* ── state ───────────────────────────────────────────────────────────── */
let filter = "all";
let sort = "feat";
const chosen = {};                      // product id -> glaze key
PRODUCTS.forEach((p) => (chosen[p.id] = p.glazes[0]));

let cart = [];
try { cart = JSON.parse(localStorage.getItem("tanah-cart") || "[]"); } catch { cart = []; }
const save = () => localStorage.setItem("tanah-cart", JSON.stringify(cart));

/* ── the pot ─────────────────────────────────────────────────────────── */
function vessel(p, glazeKey) {
  const g = GLAZES[glazeKey];
  const uid = `${p.id}-${glazeKey}`;
  return `
  <svg class="pot" viewBox="0 0 100 100" role="img" aria-label="${p.name} in ${g.name} glaze">
    <defs>
      <linearGradient id="lg-${uid}" x1="0" y1="0" x2="0.9" y2="1">
        <stop offset="0" stop-color="${g.a}"/>
        <stop offset="0.55" stop-color="${g.b}"/>
        <stop offset="1" stop-color="${g.rim}"/>
      </linearGradient>
    </defs>
    <ellipse class="shadow" cx="50" cy="90" rx="30" ry="4"/>
    <path d="${SHAPES[p.shape]}" fill="url(#lg-${uid})" stroke="${g.rim}" stroke-width="1"/>
    <path d="${SHAPES[p.shape]}" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="2"
          stroke-dasharray="16 90" stroke-dashoffset="10"/>
    ${p.shape === "mug" ? `<path d="M71,42 q15,3 15,15 t-15,15" fill="none" stroke="${g.rim}" stroke-width="5" stroke-linecap="round"/>` : ""}
    ${p.shape === "jug" ? `<path d="M69,33 l9,-4 -3,9 z" fill="${g.b}" stroke="${g.rim}" stroke-width="1"/>` : ""}
  </svg>`;
}

/* ── grid ────────────────────────────────────────────────────────────── */
function visible() {
  let list = PRODUCTS.filter((p) => filter === "all" || p.glazes.includes(filter));
  if (sort === "low") list = [...list].sort((a, b) => a.price - b.price);
  if (sort === "high") list = [...list].sort((a, b) => b.price - a.price);
  return list;
}

function drawGrid() {
  const list = visible();
  $("#count").textContent = list.length;
  $("#products").innerHTML = list.map((p) => {
    // if the current filter names a glaze this product has, show that one
    const gk = (filter !== "all" && p.glazes.includes(filter)) ? filter : chosen[p.id];
    chosen[p.id] = gk;
    return `
    <li class="card">
      <div class="shot g-${gk}">${vessel(p, gk)}</div>
      <div class="info">
        <div class="line">
          <h3>${p.name}</h3>
          <p class="price">${money(p.price)}</p>
        </div>
        <p class="note">${p.note}</p>
        <div class="glazes" role="group" aria-label="Glaze for ${p.name}">
          ${p.glazes.map((k) => `
            <button class="dot d-${k} ${k === gk ? "on" : ""}" data-p="${p.id}" data-g="${k}"
                    title="${GLAZES[k].name}" aria-label="${GLAZES[k].name} glaze"
                    aria-pressed="${k === gk}"></button>`).join("")}
          <span class="gname">${GLAZES[gk].name}</span>
        </div>
        <button class="btn add" data-add="${p.id}">Add &mdash; ${money(p.price)}</button>
      </div>
    </li>`;
  }).join("");

  $$("#products .dot").forEach((b) => b.addEventListener("click", () => {
    chosen[b.dataset.p] = b.dataset.g;
    drawGrid();
  }));
  $$("#products .add").forEach((b) => b.addEventListener("click", () => add(b.dataset.add)));
}

/* ── cart ────────────────────────────────────────────────────────────── */
function add(id) {
  const p = PRODUCTS.find((x) => x.id === id);
  const gk = chosen[id];
  const line = cart.find((l) => l.id === id && l.glaze === gk);
  if (line) line.qty += 1;
  else cart.push({ id, glaze: gk, qty: 1 });
  save(); drawCart(); openCart();
}

function setQty(i, d) {
  cart[i].qty += d;
  if (cart[i].qty <= 0) cart.splice(i, 1);
  save(); drawCart();
}

const subtotal = () =>
  cart.reduce((s, l) => s + PRODUCTS.find((p) => p.id === l.id).price * l.qty, 0);

function drawCart() {
  const n = cart.reduce((s, l) => s + l.qty, 0);
  $("#cartCount").textContent = n;
  $("#cartCount").classList.toggle("has", n > 0);

  $("#cartBody").innerHTML = cart.length ? cart.map((l, i) => {
    const p = PRODUCTS.find((x) => x.id === l.id);
    return `
    <div class="c-line">
      <div class="c-shot g-${l.glaze}">${vessel(p, l.glaze)}</div>
      <div class="c-mid">
        <p class="c-name">${p.name}</p>
        <p class="c-glaze">${GLAZES[l.glaze].name}</p>
        <div class="qty">
          <button data-q="${i}" data-d="-1" aria-label="One fewer ${p.name}">&minus;</button>
          <span>${l.qty}</span>
          <button data-q="${i}" data-d="1" aria-label="One more ${p.name}">+</button>
        </div>
      </div>
      <p class="c-price">${money(p.price * l.qty)}</p>
    </div>`;
  }).join("") : `<p class="c-empty">Nothing in the cart yet.</p>`;

  $$("#cartBody [data-q]").forEach((b) =>
    b.addEventListener("click", () => setQty(+b.dataset.q, +b.dataset.d)));

  const s = subtotal();
  $("#sub").textContent = money(s);
  $("#ship").textContent = s === 0
    ? "Free shipping over " + money(FREE_SHIP)
    : s >= FREE_SHIP ? "Free shipping unlocked"
    : `Add ${money(FREE_SHIP - s)} more for free shipping`;
  $("#ship").classList.toggle("ok", s >= FREE_SHIP);
  $("#checkout").disabled = cart.length === 0;
}

/* ── drawer ──────────────────────────────────────────────────────────── */
let lastFocus = null;
function openCart() {
  lastFocus = document.activeElement;
  $("#cart").hidden = false; $("#scrim").hidden = false;
  requestAnimationFrame(() => document.body.classList.add("cart-open"));
  $("#cartClose").focus();
}
function closeCart() {
  document.body.classList.remove("cart-open");
  setTimeout(() => { $("#cart").hidden = true; $("#scrim").hidden = true; }, 240);
  if (lastFocus) lastFocus.focus();
}
$("#cartBtn").addEventListener("click", openCart);
$("#cartClose").addEventListener("click", closeCart);
$("#scrim").addEventListener("click", closeCart);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("#cart").hidden) closeCart();
});
$("#checkout").addEventListener("click", () => {
  $("#cartBody").innerHTML =
    `<p class="c-empty">This is a concept storefront &mdash; there is no real checkout behind this button.</p>`;
});

/* ── controls ────────────────────────────────────────────────────────── */
$$(".chip").forEach((b) => b.addEventListener("click", () => {
  $$(".chip").forEach((x) => x.classList.toggle("on", x === b));
  filter = b.dataset.glaze;
  drawGrid();
}));
$("#sort").addEventListener("change", (e) => { sort = e.target.value; drawGrid(); });

$("#signup").addEventListener("submit", (e) => {
  e.preventDefault();
  $("#signupNote").textContent = "Concept page — nothing was sent, and no address was stored.";
  e.target.reset();
});

drawGrid();
drawCart();
