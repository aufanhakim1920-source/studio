/* LITHIC — build 1 of 3
 * Renders the catalogue. No motion beyond a hover tint: the composition is
 * meant to carry this one, not the movement.
 */

const LOTS = [
  { n: "02", nm: "Malachite, botryoidal", loc: "Katanga, DR Congo",  d: "62 × 44 mm", p: "£880",   rock: "malachite", v: "",       card: true  },
  { n: "03", nm: "Cinnabar on dolomite",  loc: "Wanshan, Guizhou",   d: "51 × 38 mm", p: "£1,450", rock: "cinnabar",  v: "rock--v2", card: true  },
  { n: "04", nm: "Pyrite, cubic",         loc: "Navajún, La Rioja",  d: "44 × 44 mm", p: "£320",   rock: "pyrite",    v: "rock--v3", card: true  },
  { n: "05", nm: "Fluorite, purple",      loc: "Weardale, Durham",   d: "77 × 59 mm", p: "£2,100", rock: "fluorite",  v: "rock--v2", card: false },
  { n: "06", nm: "Quartz, smoky",         loc: "unrecorded",         d: "93 × 61 mm", p: "£540",   rock: "quartz",    v: "rock--v3", card: false },
  { n: "07", nm: "Hematite, kidney ore",  loc: "Cumbria",            d: "68 × 52 mm", p: "£690",   rock: "hematite",  v: "",       card: true  },
];

document.getElementById("grid").innerHTML = LOTS.map((l) => `
  <li class="lot">
    <div class="lot__stage">
      <div class="rock ${l.v}" data-rock="${l.rock}" aria-hidden="true">
        <span class="rock__face rock__face--a"></span>
        <span class="rock__face rock__face--b"></span>
        <span class="rock__face rock__face--c"></span>
        <span class="rock__spec"></span>
        <span class="rock__grain"></span>
      </div>
    </div>
    <div>
      <p class="lot__n mono">LOT ${l.n}${l.card ? "" : ` &middot; <span class="lot__orphan">NO CARD</span>`}</p>
      <h3 class="lot__nm">${l.nm}</h3>
      <p class="lot__loc">${l.loc} &middot; ${l.d}</p>
    </div>
    <p class="lot__row">
      <span class="mono">ESTIMATE</span>
      <span class="lot__p">${l.p}</span>
    </p>
  </li>`).join("");
