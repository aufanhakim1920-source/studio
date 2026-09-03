/* DRAB & CO — a paint maker
 * ---------------------------------------------------------------------------
 * ⭐ THE OBJECT: a wet swatch you move a light across.
 *
 * The mechanism is depth-map relighting from Codrops (Generative Canvas Studio
 * §10.5), and it earns its place here rather than decorating: half of what you
 * see in a painted wall is the SHEEN, not the hue, which is why two paints with
 * the same hex code can look nothing alike. A flat hex square cannot answer the
 * question a paint buyer is actually asking. This can.
 *
 * From §10.5, unchanged:
 *   · a height field becomes a normal with two gradients and a normalize:
 *       n = normalize(vec3(-dH/dx, -dH/dy, 1))
 *   · lighting is the dot product of that normal with the light direction
 *   · specular is that same dot product raised to a power — and the POWER is
 *     the finish. Matt is a low exponent spread wide; gloss is a high one.
 *
 * What the finish actually changes, in one line each:
 *   flat       exponent 2,  spec 0.05  — almost no highlight, texture reads
 *   eggshell   exponent 12, spec 0.16
 *   satin      exponent 34, spec 0.30
 *   gloss      exponent 90, spec 0.62  — a hard hot spot that moves with you
 *
 * Same numbers, same colour, four completely different surfaces. That IS the
 * product line.
 */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* name, hex, family, code */
const COLOURS = [
  ["Reservoir", "#495C4B", "green", "01"],
  ["Boot Polish", "#2B2724", "dark", "02"],
  ["Wet Slate", "#4A5560", "blue", "03"],
  ["Dropsheet", "#D9D2C2", "neutral", "04"],
  ["Rust Bucket", "#9C4A2C", "red", "05"],
  ["Sump", "#1C1B18", "dark", "06"],
  ["Verdigris", "#6E8C79", "green", "07"],
  ["Ox Blood", "#6B2A2A", "red", "08"],
  ["Bore Water", "#8FA3A8", "blue", "09"],
  ["Chaff", "#C6B893", "neutral", "10"],
  ["Bitumen", "#33322E", "dark", "11"],
  ["Marine Ply", "#B5854F", "neutral", "12"],
  ["Fenceline", "#7C8471", "green", "13"],
  ["Ink Well", "#2B3A52", "blue", "14"],
  ["Terracotta Pot", "#B0653F", "red", "15"],
  ["Ash Bin", "#9A9790", "neutral", "16"],
  ["Pine Green", "#33493B", "green", "17"],
  ["Dusk Blue", "#5F7391", "blue", "18"],
  ["Brick Dust", "#8E5145", "red", "19"],
  ["Lard", "#EFE7D6", "neutral", "20"],
];

const FINISHES = [
  ["flat",     "Flat",     2,  0.05, "Ceilings, and any wall you would rather people did not look at."],
  ["eggshell", "Eggshell", 12, 0.16, "The default. Wipes clean, hides a bad plasterer, no glare."],
  ["satin",    "Satin",    34, 0.30, "Skirting, doors, joinery. Takes a knock and a wet cloth."],
  ["gloss",    "Gloss",    90, 0.62, "Front doors and anything you want to be a bit much."],
];

const FAMILIES = [["all", "All"], ["neutral", "Neutrals"], ["green", "Greens"], ["blue", "Blues"], ["red", "Reds"], ["dark", "Darks"]];

const SIZES = [
  ["Sample pot", "$9", "100 ml", ["Any colour, any finish", "Covers about half a square metre", "Refunded against your first litre"], false],
  ["One litre", "$78", "1 L", ["About 14 m² for two coats", "Mixed the day you order", "Free delivery over $180"], true],
  ["Four litres", "$268", "4 L", ["About 56 m² for two coats", "$67 per litre", "Bring the tin back for $8"], false],
];

const QA = [
  ["Why is there no white?", "There are four, but none of them are called Whisper or Cloud Nine. Dropsheet, Chaff, Ash Bin and Lard are all off-white, and they are named after the thing they were matched to, which tells you more than a mood does. A true bright white is available on request and we will try to talk you out of it."],
  ["Is it really mixed to order?", "Yes, in the workshop on Forrest Street, usually within two working days. It means we hold pigment rather than tins, so there is no shelf-aged stock and no discontinued colours — anything ever mixed can be mixed again. It also means we cannot do next-day."],
  ["What is actually in it?", "Water, acrylic binder, titanium dioxide, and pigment. No solvents, low VOC, and the full ingredient breakdown is on every tin — not a marketing panel, the actual list. If a paint company will not print that, ask why."],
  ["Will it match the photo on my screen?", "No, and no paint will. Screens emit and walls reflect, and your room's light is doing half the work. That is exactly what the sample pots are for: paint an A4 patch, look at it at breakfast and again at nine at night, then decide."],
  ["Can you match a colour I bring in?", "Usually. Bring a chip about the size of a stamp — a bit of skirting, a fabric swatch, a tile. Matching costs $40 on top of the paint and takes about a week, and we will tell you honestly if the pigment cannot get there."],
];

const state = { colour: 0, finish: 1, family: "all", cart: 0 };

/* ── the swatch ───────────────────────────────────────────────────────────── */
function swatch() {
  const cv = $("#cv"), ctx = cv.getContext("2d");
  let W = 0, H = 0, DPR = 1, height = null, HW = 0, HH = 0;
  let lx = 0.34, ly = 0.3, tlx = 0.34, tly = 0.3;

  /* ── the height field ──────────────────────────────────────────────────
     Paint on a wall is not flat: it has roller stipple and a brush edge. The
     field is generated ONCE (it does not depend on colour or finish) at a
     reduced resolution, and the normals are read from it. */
  function buildHeight() {
    HW = Math.max(2, Math.round(W / 2)); HH = Math.max(2, Math.round(H / 2));
    height = new Float32Array(HW * HH);

    /* ⚠️ FIRST VERSION HAD NO INTERPOLATION. Sampling a hash at floor(u * f)
       gives hard square cells, and once you take gradients of that you get a
       field of blocks — it read as pixel noise, not as paint. Value noise needs
       bilinear interpolation with a smoothstep fade, every octave. */
    const hash = (x, y) => {
      const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
      return n - Math.floor(n);
    };
    const smooth = (t) => t * t * (3 - 2 * t);
    const vnoise = (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y);
      const xf = smooth(x - xi), yf = smooth(y - yi);
      const a = hash(xi, yi),     b = hash(xi + 1, yi);
      const c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
      return (a * (1 - xf) + b * xf) * (1 - yf) + (c * (1 - xf) + d * xf) * yf;
    };

    for (let y = 0; y < HH; y++) {
      for (let x = 0; x < HW; x++) {
        const u = x / HW, v = y / HH;
        /* four octaves: the big unevenness of a rolled wall, down to stipple */
        let n = 0, amp = 0.5, f = 5;
        for (let o = 0; o < 4; o++) {
          n += vnoise(u * f, v * f) * amp;
          amp *= 0.5; f *= 2.17;
        }
        /* the roller nap: a faint vertical corduroy, the tell of a real wall */
        n += Math.sin(u * 90 + vnoise(u * 6, v * 6) * 4) * 0.018;
        height[y * HW + x] = n;
      }
    }
  }

  const H_AT = (x, y) => {
    const xi = Math.max(0, Math.min(HW - 1, x | 0));
    const yi = Math.max(0, Math.min(HH - 1, y | 0));
    return height[yi * HW + xi];
  };

  function size() {
    const r = cv.getBoundingClientRect();
    DPR = Math.min(devicePixelRatio || 1, 1.6);
    /* taller on a phone so the swatch still leads the page */
    W = r.width || 620; H = Math.round(W * (W < 620 ? 1.10 : 0.66));
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cv.style.height = H + "px";
    buildHeight();
  }

  function draw() {
    if (!W || !height) return;
    const [name, hex] = COLOURS[state.colour];
    const [, , exp, spec] = FINISHES[state.finish];

    const R = parseInt(hex.slice(1, 3), 16);
    const G = parseInt(hex.slice(3, 5), 16);
    const B = parseInt(hex.slice(5, 7), 16);

    const ow = cv.width, oh = cv.height;
    const img = ctx.createImageData(ow, oh);
    const d = img.data;

    /* the light, as a direction in 3D — the pointer moves it across the wall */
    const Lx = (lx - 0.5) * 1.6, Ly = (ly - 0.5) * 1.6, Lz = 0.85;
    const Ln = Math.hypot(Lx, Ly, Lz);
    const lxn = Lx / Ln, lyn = Ly / Ln, lzn = Lz / Ln;

    for (let py = 0; py < oh; py++) {
      const hy = (py / oh) * HH;
      for (let pxi = 0; pxi < ow; pxi++) {
        const hx = (pxi / ow) * HW;

        /* ⭐ §10.5: two gradients and a normalize turn the height into a normal */
        const gx = H_AT(hx + 1, hy) - H_AT(hx - 1, hy);
        const gy = H_AT(hx, hy + 1) - H_AT(hx, hy - 1);
        /* ⚠️ 2.2 turned a wall into hammered metal. Paint texture is SHALLOW — the
           normals barely tilt, and the finish does the rest. */
        const S = 0.55;
        let nx = -gx * S, ny = -gy * S, nz = 1;
        const nl = Math.hypot(nx, ny, nz);
        nx /= nl; ny /= nl; nz /= nl;

        const lam = Math.max(nx * lxn + ny * lyn + nz * lzn, 0);

        /* ⭐ the FINISH is the specular exponent. Same colour, same normals —
           only this number changes between flat and gloss. */
        const hlx = lxn, hly = lyn, hlz = lzn + 1;
        const hn = Math.hypot(hlx, hly, hlz);
        const ndoth = Math.max(nx * hlx / hn + ny * hly / hn + nz * hlz / hn, 0);
        const sp = Math.pow(ndoth, exp) * spec;

        /* ambient keeps the shadowed side from going black — paint is not metal */
        const shade = 0.62 + lam * 0.46;
        const i = (py * ow + pxi) * 4;
        d[i]     = Math.min(255, R * shade + sp * 255);
        d[i + 1] = Math.min(255, G * shade + sp * 255);
        d[i + 2] = Math.min(255, B * shade + sp * 255);
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    /* a brushed edge along the bottom, so it reads as painted rather than filled */
    ctx.save();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.globalCompositeOperation = "destination-out";
    /* ⚠️ drawn as ONE smooth path, not as 90 rectangles — the rectangle version
       gave a stepped, pixel-looking edge on a surface whose whole job is to look
       like it was applied by hand. */
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let i = 0; i <= 120; i++) {
      const x = (i / 120) * W;
      const y = H - 5 + Math.sin(i * 0.31) * 3.4 + Math.sin(i * 0.87) * 1.8 + Math.sin(i * 1.9) * 0.9;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    $("#sheen").textContent = Math.round(spec * 100);
    $("#pipC").style.background = hex;
    $("#kickName").textContent = name;
    $("#kickFin").textContent = FINISHES[state.finish][1].toLowerCase();
  }

  const at = (e) => {
    const r = cv.getBoundingClientRect();
    tlx = (e.clientX - r.left) / r.width;
    tly = (e.clientY - r.top) / r.height;
  };
  cv.addEventListener("pointermove", at, { passive: true });
  cv.addEventListener("pointerleave", () => { tlx = 0.34; tly = 0.3; });

  size();
  addEventListener("resize", () => { size(); draw(); }, { passive: true });

  /* the light LAGS the pointer — a highlight that snaps reads as a cursor */
  function frame() {
    const dx = tlx - lx, dy = tly - ly;
    if (Math.abs(dx) > 0.0008 || Math.abs(dy) > 0.0008) {
      lx += dx * 0.12; ly += dy * 0.12;
      draw();
    }
    requestAnimationFrame(frame);
  }
  draw();
  if (!REDUCED) requestAnimationFrame(frame);

  return { redraw: draw };
}

/* ── page ─────────────────────────────────────────────────────────────────── */
function init() {
  const sw = swatch();

  /* finishes */
  $("#fin").innerHTML = FINISHES.map(([id, label], i) =>
    `<button class="pick" type="button" aria-pressed="${i === state.finish}" data-i="${i}">${label}</button>`).join("");
  $$("#fin .pick").forEach((b) => b.addEventListener("click", () => {
    state.finish = Number(b.dataset.i);
    $$("#fin .pick").forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
    sw.redraw();
  }));

  /* filters */
  const inFam = (c) => state.family === "all" || c[2] === state.family;
  $("#filters").innerHTML = FAMILIES.map(([id, label]) => {
    const n = id === "all" ? COLOURS.length : COLOURS.filter((c) => c[2] === id).length;
    return `<button type="button" data-f="${id}" aria-pressed="${id === "all"}">${label} <span class="ct">${n}</span></button>`;
  }).join("");

  function paintGrid() {
    const list = COLOURS.map((c, i) => ({ c, i })).filter(({ c }) => inFam(c));
    $("#grid").innerHTML = list.map(({ c, i }) => `
      <button class="chip" type="button" data-i="${i}" aria-pressed="${i === state.colour}">
        <span class="chip__s" style="background:${c[1]}"></span>
        <span class="chip__b">
          <span class="chip__n">${c[0]}</span>
          <span class="chip__m"><span>No. ${c[3]}</span><span>${c[1].toUpperCase()}</span></span>
        </span>
      </button>`).join("");
    $("#count").textContent = `${list.length} of ${COLOURS.length} shown`;
    $$("#grid .chip").forEach((b) => b.addEventListener("click", () => {
      state.colour = Number(b.dataset.i);
      $$("#grid .chip").forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
      sw.redraw();
      /* selecting a colour scrolls the swatch back into view — otherwise you
         change the product and never see it change */
      document.querySelector(".swatch").scrollIntoView({ block: "center", behavior: REDUCED ? "auto" : "smooth" });
    }));
  }
  paintGrid();

  $$("#filters button").forEach((b) => b.addEventListener("click", () => {
    state.family = b.dataset.f;
    $$("#filters button").forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
    paintGrid();
  }));

  /* finishes explained — each swatch shows its own sheen, not a label */
  $("#fins").innerHTML = FINISHES.map(([id, label, exp, spec, use]) => `
    <article class="fin">
      <span class="fin__g" style="background:linear-gradient(112deg, rgba(255,255,255,${spec * 1.5}) 0%, transparent ${18 + exp / 3}%), #495C4B"></span>
      <b>${label}</b>
      <span class="lv">${Math.round(spec * 100)}% sheen &middot; 60&deg;</span>
      <span>${use}</span>
    </article>`).join("");

  /* sizes */
  $("#sizes").innerHTML = SIZES.map(([k, p, u, l, hot]) => `
    <article class="size${hot ? " size--hot" : ""}">
      <span class="size__k">${k}${hot ? " &middot; most ordered" : ""}</span>
      <span class="size__p">${p}<small>${u}</small></span>
      <ul>${l.map((x) => `<li>${x}</li>`).join("")}</ul>
      <button type="button">Add to basket</button>
    </article>`).join("");
  $$("#sizes button").forEach((b) => b.addEventListener("click", () => {
    state.cart++;
    $("#cartN").textContent = state.cart;
    b.textContent = "Added";
    setTimeout(() => b.textContent = "Add to basket", 1100);
  }));

  /* questions */
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
