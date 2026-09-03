(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  /* ═══════════════════════ palette ═══════════════════════════════════════ */
  const P = {
    ink: "#150E17", cream: "#F7E9CE", cream2: "#E6CFA8", cream3: "#C6AB8D",
    red: "#DC3A22", redD: "#9E2417", redL: "#F0603F",
    gold: "#F2B426", goldD: "#B87C0C", goldL: "#FFD46B",
    teal: "#12897F", tealD: "#0A5A57", tealX: "#052F30",
    night: "#2A3E8C", nightD: "#17235A", nightX: "#0D1338",
    green: "#2F7B45", greenD: "#1B4C31", greenX: "#0C2A1D",
    plum: "#4A2350", plumD: "#2B1233",
    tin: "#A08A6E", tinD: "#6B5A48", tinL: "#CFBB9C",
  };
  /* ═══════════════════════ drawing helpers ═══════════════════════════════ */
  function rng(seed) {
    let s = (seed * 2654435761) >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  const f1 = (n) => (Math.round(n * 10) / 10);
  /* a hand-cut straight edge: never actually straight */
  function edge(x1, y1, x2, y2, r, amp = 2.4, seg) {
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    const n = seg || Math.max(2, Math.round(len / 30));
    const ux = -dy / len, uy = dx / len;
    let d = "";
    for (let i = 1; i <= n; i++) {
      const t = i / n, j = i === n ? 0 : (r() - 0.5) * 2 * amp;
      d += `L${f1(x1 + dx * t + ux * j)} ${f1(y1 + dy * t + uy * j)}`;
    }
    return d;
  }
  /* a cut-paper piece: contact rim under, lit rim over, fill on top.
     This is the whole trick — the 3px sliver of light along a top edge is
     what makes a flat colour read as a sheet of paper with thickness. */
  function cut(d, fill, lit, shade, lift = 3, drop = 3) {
    let s = "";
    if (shade) s += `<path d="${d}" fill="${shade}" transform="translate(1,${drop})"/>`;
    if (lit) s += `<path d="${d}" fill="${lit}" transform="translate(0,${-lift})"/>`;
    return s + `<path d="${d}" fill="${fill}"/>`;
  }
  /* a soft ridge through a set of peaks */
  function ridge(x1, x2, base, pts, r, amp = 6) {
    let d = `M${x1} ${base}L${f1(x1)} ${f1(pts[0][1])}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 + (r() - 0.5) * amp;
      d += `Q${f1(a[0])} ${f1(a[1])} ${f1(mx)} ${f1(my)}`;
    }
    const L = pts[pts.length - 1];
    d += `Q${f1(L[0])} ${f1(L[1])} ${f1(x2)} ${f1(L[1] + (r() - 0.5) * amp)}L${x2} ${base}Z`;
    return d;
  }
  function pine(cx, base, h, w, r) {
    const tiers = 5, out = [];
    for (let i = 1; i <= tiers; i++) {
      const t = i / tiers;
      out.push([w * Math.pow(t, 0.82) * (0.88 + r() * 0.24), base - h + h * t]);
    }
    let d = `M${f1(cx + (r() - 0.5) * 6)} ${f1(base - h)}`;
    out.forEach(([ww, y], i) => {
      d += `L${f1(cx + ww)} ${f1(y)}L${f1(cx + ww * 0.55)} ${f1(y + (i < tiers - 1 ? h * 0.015 : 0))}`;
    });
    d += `L${f1(cx + w * 0.09)} ${f1(base)}L${f1(cx - w * 0.09)} ${f1(base)}`;
    for (let i = out.length - 1; i >= 0; i--) {
      const [ww, y] = out[i];
      d += `L${f1(cx - ww * 0.55)} ${f1(y + (i < tiers - 1 ? h * 0.015 : 0))}L${f1(cx - ww)} ${f1(y)}`;
    }
    return d + "Z";
  }
  function blobTree(cx, cy, rad, r) {
    let d = "";
    const n = 13;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = rad * (0.78 + r() * 0.34);
      const x = cx + Math.cos(a) * rr * 1.06, y = cy + Math.sin(a) * rr * 0.94;
      d += (i === 0 ? `M${f1(x)} ${f1(y)}` : `L${f1(x)} ${f1(y)}`);
    }
    return d + "Z";
  }
  function waveBand(y, amp, wl, base, r) {
    let d = `M-40 ${f1(y)}`;
    for (let x = -40; x < 1460; x += wl) {
      d += `Q${f1(x + wl / 2)} ${f1(y - amp * (0.7 + r() * 0.6))} ${f1(x + wl)} ${f1(y + (r() - 0.5) * 5)}`;
    }
    return d + `L1460 ${base}L-40 ${base}Z`;
  }
  function house(x, base, w, h, r, wall, roof, lit, win) {
    const rr = h * (0.3 + r() * 0.2);
    let s = cut(
      `M${f1(x)} ${f1(base)}L${f1(x)} ${f1(base - h)}${edge(x, base - h, x + w, base - h, r, 1.8)}L${f1(x + w)} ${f1(base)}Z`,
      wall, lit, null, 2);
    s += cut(
      `M${f1(x - w * 0.13)} ${f1(base - h)}L${f1(x + w / 2)} ${f1(base - h - rr)}L${f1(x + w * 1.13)} ${f1(base - h)}Z`,
      roof, null, null, 0);
    const wn = Math.max(1, Math.round(w / 26));
    for (let i = 0; i < wn; i++) {
      const wx = x + w * (0.16 + 0.68 * (wn === 1 ? 0.5 : i / (wn - 1))) - 5;
      s += `<rect x="${f1(wx)}" y="${f1(base - h * 0.66)}" width="10" height="${f1(h * 0.3)}" fill="${win}"/>`;
    }
    return s;
  }
  function star(x, y, s) {
    return `M${f1(x)} ${f1(y - s)}Q${f1(x + s * 0.2)} ${f1(y - s * 0.2)} ${f1(x + s)} ${f1(y)}Q${f1(x + s * 0.2)} ${f1(y + s * 0.2)} ${f1(x)} ${f1(y + s)}Q${f1(x - s * 0.2)} ${f1(y + s * 0.2)} ${f1(x - s)} ${f1(y)}Q${f1(x - s * 0.2)} ${f1(y - s * 0.2)} ${f1(x)} ${f1(y - s)}Z`;
  }
  /* the printer's dot screen. A flat of coloured paper that has been through a
     press has tooth; without it these fills are digital fields, and the whole
     picture measures as fog rather than as drawing. */
  function tone(id, x, y, w, h, size = 9, rad = 1.25, col = "#000", op = 0.2) {
    return `<defs><pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse">` +
      `<circle cx="${size / 2}" cy="${size / 2}" r="${rad}" fill="${col}" opacity="${op}"/></pattern></defs>` +
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id})"/>`;
  }
  /* the same screen, but clipped to one cut shape */
  function toneOn(id, d, size = 8, rad = 1.3, col = "#000", op = 0.26) {
    return `<defs><clipPath id="cp-${id}"><path d="${d}"/></clipPath></defs>` +
      `<g clip-path="url(#cp-${id})">${tone("tt-" + id, -80, -80, 1560, 1060, size, rad, col, op)}</g>`;
  }
  function hatch(id, x, y, w, h, size = 7, col = "#000", op = 0.18, sw = 1.4) {
    return `<defs><pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">` +
      `<path d="M0 0L0 ${size}" stroke="${col}" stroke-width="${sw}" opacity="${op}"/></pattern></defs>` +
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id})"/>`;
  }
  const grad = (id, stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1) =>
    `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">` +
    stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join("") + `</linearGradient>`;
  /* ═══════════════════════ the three shows ═══════════════════════════════ */
  /* World space is 1400x900. Horizon 470, stage floor 640. Hero centred at 700
     so the phone's narrow window still holds the thing the show is about. */
  const SHOWS = [
    {
      id: "moon",
      no: "Show one",
      title: "The Boy Who Ate the Moon",
      blurb: "A boy climbs a ladder to taste the moon, and then has to put it back a slice at a time.",
      ages: "5–7", mins: "35 min", cast: "2 performers", interval: "None",
      run: "touring February to April",
      tint: P.gold,
      months: [2, 3, 4],
      back(r) {
        let s = `<defs>${grad("g-moon-sky", [[0, "#141C4E"], [0.52, "#26377E"], [1, "#3E4E9B"]])}</defs>`;
        s += `<rect x="0" y="0" width="1400" height="900" fill="url(#g-moon-sky)"/>`;
        for (let i = 0; i < 54; i++) {
          const x = r() * 1400, y = r() * 430, sz = 3 + r() * 7;
          s += r() > 0.62
            ? `<path d="${star(x, y, sz)}" fill="${P.goldL}" opacity="${(0.5 + r() * 0.5).toFixed(2)}"/>`
            : `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(1.4 + r() * 1.8)}" fill="${P.cream}" opacity="${(0.35 + r() * 0.5).toFixed(2)}"/>`;
        }
        /* the moon, with a bite out of it — the show's whole premise */
        s += `<defs><mask id="m-bite"><rect x="0" y="0" width="1400" height="900" fill="#000"/>` +
          `<circle cx="840" cy="468" r="110" fill="#fff"/>` +
          `<circle cx="941" cy="412" r="48" fill="#000"/><circle cx="909" cy="481" r="37" fill="#000"/>` +
          `<circle cx="947" cy="461" r="25" fill="#000"/></mask></defs>`;
        s += `<circle cx="840" cy="468" r="110" fill="${P.goldL}" mask="url(#m-bite)"/>`;
        s += `<circle cx="840" cy="474" r="110" fill="${P.gold}" mask="url(#m-bite)" opacity=".5"/>`;
        s += `<circle cx="806" cy="440" r="16" fill="${P.goldD}" opacity=".4"/><circle cx="846" cy="506" r="11" fill="${P.goldD}" opacity=".36"/>`;
        s += `<circle cx="790" cy="496" r="8" fill="${P.goldD}" opacity=".34"/>`;
        s += tone("t-moon", 0, 0, 1400, 900, 8, 1.35, "#000", 0.3);
        return s;
      },
      far(r) {
        const a = ridge(-40, 1460, 900, [[-40, 512], [240, 462], [560, 506], [900, 520], [1240, 476], [1460, 468]], r);
        const b = ridge(-40, 1460, 900, [[-40, 566], [300, 524], [700, 570], [1080, 542], [1460, 552]], r);
        let s = cut(a, P.nightD, "#37479B", null, 4) + toneOn("f1a", a, 8, 1.3, "#000", 0.3);
        s += cut(b, P.nightX, "#2A3576", null, 4) + toneOn("f1b", b, 8, 1.3, "#000", 0.3);
        return s;
      },
      mid(r) {
        let s = "";
        /* the village on the hill */
        const hillTop = ridge(-40, 1460, 900, [[-40, 640], [260, 596], [640, 632], [1020, 590], [1460, 626]], r);
        s += cut(hillTop, "#131A46", "#243066", null, 4) + toneOn("m1", hillTop, 8, 1.3, "#000", 0.3);
        const homes = [[150, 618, 96, 74], [268, 606, 74, 62], [372, 626, 110, 84], [508, 612, 82, 66], [1152, 612, 104, 78], [1276, 624, 78, 60]];
        homes.forEach(([x, b, w, h]) => { s += house(x, b, w, h, r, "#0C1233", "#0A0E2A", "#1E2A5E", P.gold); });
        /* church */
        s += cut(`M604 616L604 528${edge(604, 528, 690, 528, r, 1.6)}L690 616Z`, "#0C1233", "#1E2A5E", null, 2);
        s += cut(`M596 528L647 430L698 528Z`, "#0A0E2A", null, null, 0);
        s += `<rect x="640" y="452" width="14" height="46" fill="${P.gold}" opacity=".9"/>`;
        s += `<rect x="620" y="560" width="16" height="34" fill="${P.gold}"/><rect x="658" y="560" width="16" height="34" fill="${P.gold}"/>`;
        /* the ladder, and the boy on it */
        const lx1 = 700, ly1 = 652, lx2 = 792, ly2 = 410;
        s += `<g stroke="#0A0E2A" stroke-width="9" stroke-linecap="round">
          <line x1="${lx1}" y1="${ly1}" x2="${lx2}" y2="${ly2}"/>
          <line x1="${lx1 + 46}" y1="${ly1}" x2="${lx2 + 46}" y2="${ly2}"/></g>`;
        for (let i = 0; i < 12; i++) {
          const t = i / 11, x = lx1 + (lx2 - lx1) * t, y = ly1 + (ly2 - ly1) * t;
          s += `<line x1="${f1(x)}" y1="${f1(y)}" x2="${f1(x + 46)}" y2="${f1(y)}" stroke="#0A0E2A" stroke-width="7" stroke-linecap="round"/>`;
        }
        s += `<g transform="translate(768,478) rotate(-9)">
          <path d="M0 0q-16 -4 -16 -22t16 -22 17 22 -17 22z" fill="#0A0E2A"/>
          <path d="M-15 2h30l7 52q-22 8 -44 0z" fill="${P.red}"/>
          <path d="M-14 54l-6 44h11l9 -40 8 40h11l-4 -44z" fill="#0A0E2A"/>
          <path d="M14 8l34 -26 8 12 -34 30z" fill="${P.red}"/>
          <circle cx="54" cy="-20" r="12" fill="${P.goldL}"/></g>`;
        return s;
      },
      fore(r) {
        const g = `M-40 900L-40 700${edge(-40, 700, 1460, 686, r, 9)}L1460 900Z`;
        let s = cut(g, "#080B22", "#1A2352", null, 5) + toneOn("o1", g, 8, 1.3, "#1A2352", 0.5);
        for (let i = 0; i < 46; i++) {
          const x = -30 + r() * 1470, y = 692 + r() * 16;
          s += `<path d="M${f1(x)} ${f1(y)}q${f1(-4 + r() * 8)} -${f1(16 + r() * 22)} ${f1(-2 + r() * 10)} -${f1(30 + r() * 26)}" stroke="#101740" stroke-width="4" fill="none" stroke-linecap="round"/>`;
        }
        /* a picket fence, cut one picket at a time */
        for (let i = 0; i < 15; i++) {
          const x = 60 + i * 78 + (r() - 0.5) * 8, h = 92 + r() * 14;
          s += cut(`M${f1(x)} ${f1(760)}L${f1(x)} ${f1(760 - h)}L${f1(x + 13)} ${f1(760 - h - 10)}L${f1(x + 26)} ${f1(760 - h)}L${f1(x + 26)} 760Z`,
            "#05071A", "#1B2450", null, 3);
        }
        s += `<rect x="40" y="700" width="1180" height="11" fill="#05071A"/>`;
        /* the dog, waiting at the bottom of the ladder */
        s += `<g transform="translate(1050,742)">
          <path d="M0 0q46 -10 78 4l6 -30 12 30q16 10 14 30l-114 2z" fill="#05071A"/>
          <path d="M-6 4q-24 -6 -26 -28l-6 -22 16 6 8 -20 10 22 22 8z" fill="#05071A"/>
          <circle cx="-24" cy="-32" r="3.4" fill="${P.gold}"/>
          <path d="M6 36l4 26h10l-2 -26zM72 36l4 26h10l-2 -26z" fill="#05071A"/></g>`;
        return s;
      },
      /* Wing legs stand INSIDE the opening, just clear of the curtains, and run
         off the top of the frame the way a real wing flat does. */
      wings(w, h, r) {
        const bw = Math.max(64, w * 0.115);
        let s = "";
        [[w * 0.175, -1, 21], [w * 0.825, 1, 47]].forEach(([cx, sgn, seed]) => {
          const rr = rng(seed);
          s += cut(`M${f1(cx - 13)} ${h * 1.02}L${f1(cx - 9)} ${f1(h * 0.5)}L${f1(cx + 11)} ${f1(h * 0.48)}L${f1(cx + 16)} ${h * 1.02}Z`, "#050916", "#1B2450", null, 3);
          s += `<path d="M${f1(cx + 2)} ${f1(h * 0.66)}q${f1(sgn * 26)} -12 ${f1(sgn * 34)} -${f1(h * 0.1)}" stroke="#050916" stroke-width="8" fill="none" stroke-linecap="round"/>`;
          for (let i = 0; i < 5; i++) {
            const bx = cx + (i % 2 ? bw * 0.42 : -bw * 0.38) * (0.4 + rr() * 0.8);
            const by = h * (0.06 + i * 0.085);
            s += cut(blobTree(bx, by, bw * (0.4 + rr() * 0.2), rr), "#060B1E", "#1D2758", null, 4);
          }
          for (let i = 0; i < 22; i++) {
            const a = rr() * Math.PI * 2, rad = bw * (0.2 + rr() * 0.6);
            s += `<circle cx="${f1(cx + Math.cos(a) * rad)}" cy="${f1(h * 0.26 + Math.sin(a) * rad * 0.9)}" r="${f1(1.8 + rr() * 2.8)}" fill="${P.gold}" opacity="${(0.22 + rr() * 0.42).toFixed(2)}"/>`;
          }
        });
        return s;
      },
    },
    {
      id: "sea",
      no: "Show two",
      title: "Tin Kettle Sea",
      blurb: "Two sisters put to sea in a kettle to look for a harbour that has gone missing from the map.",
      ages: "7–11", mins: "45 min", cast: "3 performers", interval: "None",
      run: "touring May to July",
      tint: P.teal,
      months: [5, 6, 7],
      back(r) {
        let s = `<defs>${grad("g-sea-sky", [[0, "#0A5E6E"], [0.46, "#12897F"], [0.78, "#E8A93A"], [1, "#F2B426"]])}</defs>`;
        s += `<rect x="0" y="0" width="1400" height="900" fill="url(#g-sea-sky)"/>`;
        s += `<circle cx="418" cy="404" r="114" fill="${P.red}"/><circle cx="418" cy="398" r="114" fill="${P.redL}" opacity=".5"/>`;
        for (let i = 0; i < 9; i++) {
          const y = 176 + i * 40 + (r() - 0.5) * 20, x = 60 + r() * 1000, w = 180 + r() * 340;
          s += `<path d="M${f1(x)} ${f1(y)}${edge(x, y, x + w, y + (r() - 0.5) * 10, r, 4)}L${f1(x + w - 30)} ${f1(y + 20)}L${f1(x + 20)} ${f1(y + 22)}Z" fill="${P.cream}" opacity="${(0.1 + r() * 0.16).toFixed(2)}"/>`;
        }
        s += tone("t-sea", 0, 0, 1400, 900, 8, 1.35, "#000", 0.3);
        return s;
      },
      far(r) {
        let s = cut(ridge(-40, 520, 900, [[-40, 470], [150, 402], [340, 458], [520, 486]], r), P.tealD, "#1BA091", null, 4);
        /* the lighthouse */
        s += `<g transform="translate(300,240) scale(.62)">`;
        s += cut(`M196 404L214 236L262 236L280 404Z`, P.cream, null, "#8C7A62", 0, 3);
        [0, 1, 2].forEach((i) => { s += `<path d="M${f1(200 + i * 3)} ${f1(268 + i * 46)}L${f1(276 - i * 3)} ${f1(268 + i * 46)}L${f1(275 - i * 3)} ${f1(292 + i * 46)}L${f1(201 + i * 3)} ${f1(292 + i * 46)}Z" fill="${P.red}"/>`; });
        s += `<rect x="208" y="208" width="60" height="30" fill="${P.goldL}"/><path d="M204 208L238 176L272 208Z" fill="${P.redD}"/>`;
        s += `<path d="M268 220L560 172L560 268Z" fill="${P.goldL}" opacity=".18"/></g>`;
        s += cut(ridge(1120, 1460, 900, [[1120, 500], [1300, 452], [1460, 492]], r), P.tealD, "#1BA091", null, 4);
        [[640, 330], [712, 300], [796, 342]].forEach(([x, y]) => {
          s += `<path d="M${x} ${y}q16 -14 30 0q14 -14 30 0" stroke="${P.cream}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/>`;
        });
        return s;
      },
      mid(r) {
        const sea = waveBand(560, 12, 190, 900, r);
        let s = cut(sea, "#0C6B6B", "#17998F", null, 5) + toneOn("m2", sea, 8, 1.3, "#000", 0.3);
        /* THE KETTLE BOAT — the hull is a kettle, and it is the show.
           Sized so the mast clears the top of the opening at every aspect. */
        s += `<g transform="translate(700,548) scale(.7)">
          <path d="M-2 -196L-2 -300" stroke="${P.tinD}" stroke-width="11" stroke-linecap="round"/>
          <path d="M4 -296L96 -266L4 -244Z" fill="${P.cream}"/>
          <path d="M4 -286L62 -266L4 -274Z" fill="${P.red}"/>
          <path d="M4 -262L44 -256L4 -250Z" fill="${P.red}"/>
          <path d="M-58 -142L-58 -70L54 -70L54 -142Z" fill="${P.tinD}"/>
          <path d="M-60 -152q58 -24 116 0l-8 14q-48 -16 -100 0z" fill="${P.tinL}"/>
          <circle cx="-2" cy="-170" r="15" fill="${P.tinL}"/>
          <path d="M-2 -186L-2 -156" stroke="${P.tinD}" stroke-width="7"/>
          <path d="M-186 96q-16 -78 20 -128q30 -42 166 -42t166 42q36 50 20 128q-96 34 -186 34t-186 -34z" fill="${P.tin}"/>
          <path d="M-186 96q-16 -78 20 -128q30 -42 166 -42q-70 34 -92 96q-16 46 -12 88q-46 -4 -82 -14z" fill="${P.tinL}"/>
          <path d="M-166 -32q26 -34 90 -42q-50 30 -66 56z" fill="${P.cream}" opacity=".45"/>
          <path d="M-186 -14q-58 -6 -86 -46q-16 -22 4 -34q18 -10 34 12q18 26 50 34z" fill="${P.tin}"/>
          <path d="M-272 -60q-16 -22 4 -34q18 -10 34 12z" fill="${P.tinL}"/>
          <path d="M186 -20q60 -22 74 -76q10 -36 -18 -42q-24 -4 -28 30q-8 48 -34 66z" fill="none" stroke="${P.tinD}" stroke-width="17" stroke-linecap="round"/>
          <path d="M186 -26q56 -22 70 -72q9 -33 -16 -38" fill="none" stroke="${P.tinL}" stroke-width="8" stroke-linecap="round"/>
          <g transform="translate(-96,-38)">
            <circle cx="0" cy="-34" r="24" fill="${P.redD}"/>
            <path d="M-22 -8h44l10 62q-32 10 -64 0z" fill="${P.red}"/>
            <path d="M18 4l40 -18 6 16 -42 22z" fill="${P.red}"/></g>
          <g transform="translate(84,-30) scale(.86)">
            <circle cx="0" cy="-34" r="24" fill="${P.goldD}"/>
            <path d="M-22 -8h44l10 62q-32 10 -64 0z" fill="${P.gold}"/>
            <path d="M-20 4l-42 -14 -6 16 44 20z" fill="${P.gold}"/></g>
        </g>`;
        return s;
      },
      fore(r) {
        const w1 = waveBand(628, 20, 210, 900, r), w2 = waveBand(694, 26, 172, 900, r), w3 = waveBand(762, 30, 232, 900, r);
        let s = cut(w1, P.tealD, "#18A296", null, 6) + toneOn("o2a", w1, 8, 1.3, "#000", 0.3);
        s += cut(w2, "#073E42", "#0E6A68", null, 6) + toneOn("o2b", w2, 8, 1.3, "#0E6A68", 0.44);
        s += cut(w3, P.tealX, "#0A5254", null, 6) + toneOn("o2c", w3, 8, 1.3, "#0A5254", 0.5);
        for (let i = 0; i < 26; i++) {
          const x = -20 + r() * 1440, y = 640 + r() * 130;
          s += `<path d="M${f1(x)} ${f1(y)}q${f1(14 + r() * 20)} -9 ${f1(30 + r() * 30)} 1" stroke="${P.cream}" stroke-width="4" fill="none" stroke-linecap="round" opacity="${(0.3 + r() * 0.4).toFixed(2)}"/>`;
        }
        /* a crab, keeping an eye on the whole business */
        s += `<g transform="translate(1004,748) scale(.86)">
          <path d="M-56 0q0 -38 56 -38t56 38q0 26 -56 26t-56 -26z" fill="${P.red}"/>
          <path d="M-56 4q0 -34 52 -37q-30 12 -34 37z" fill="${P.redL}"/>
          <path d="M-58 -6q-42 -6 -56 -34q22 6 30 -12q10 24 30 30zM58 -6q42 -6 56 -34q-22 6 -30 -12q-10 24 -30 30z" fill="${P.redD}"/>
          <circle cx="-18" cy="-30" r="7" fill="${P.ink}"/><circle cx="18" cy="-30" r="7" fill="${P.ink}"/>
          <path d="M-40 22l-14 24M0 26l0 26M40 22l14 24" stroke="${P.redD}" stroke-width="7" stroke-linecap="round"/></g>`;
        return s;
      },
      wings(w, h, r) {
        let s = "";
        const bw = Math.max(66, w * 0.13);
        /* left: mooring posts, with a net hung between them */
        const lx = w * 0.17;
        for (let i = 0; i < 3; i++) {
          const x = lx - bw * 0.3 + i * bw * 0.32, ht = h * (0.5 + i * 0.08);
          s += cut(`M${f1(x)} ${h * 1.02}L${f1(x + 5)} ${f1(h - ht)}L${f1(x + 36)} ${f1(h - ht - 9)}L${f1(x + 41)} ${h * 1.02}Z`, "#08292C", "#1B8A82", null, 3);
          s += `<path d="M${f1(x - 5)} ${f1(h - ht + 26)}q24 18 50 0" stroke="${P.cream2}" stroke-width="6" fill="none"/>`;
        }
        for (let i = 0; i < 11; i++) {
          const y0 = h * 0.06, y1 = h * 0.5;
          s += `<path d="M${f1(lx - bw * 0.5 + i * 11)} ${f1(y0)}L${f1(lx - bw * 0.1 + i * 11)} ${f1(y1)}M${f1(lx - bw * 0.1 - i * 11)} ${f1(y0)}L${f1(lx - bw * 0.5 - i * 11)} ${f1(y1)}"
             stroke="${P.cream3}" stroke-width="2.4" opacity=".45" fill="none"/>`;
        }
        /* right: a stack of crab pots, and a lamp on a bracket */
        const rx = w * 0.835;
        for (let i = 0; i < 3; i++) {
          const y = h * 1.0 - i * h * 0.15, ww = bw * (0.46 - i * 0.05);
          s += cut(`M${f1(rx - ww)} ${f1(y)}q0 ${f1(-h * 0.15)} ${f1(ww)} ${f1(-h * 0.15)}q${f1(ww)} 0 ${f1(ww)} ${f1(h * 0.15)}Z`, "#08292C", "#1B8A82", null, 3);
          for (let k = 1; k < 6; k++) {
            s += `<path d="M${f1(rx - ww + (ww * 2 * k) / 6)} ${f1(y)}L${f1(rx - ww * 0.55 + (ww * 1.1 * k) / 6)} ${f1(y - h * 0.13)}" stroke="${P.tealX}" stroke-width="3" opacity=".75"/>`;
          }
          s += `<path d="M${f1(rx - ww)} ${f1(y - h * 0.075)}q${f1(ww)} ${f1(h * 0.03)} ${f1(ww * 2)} 0" stroke="${P.tealX}" stroke-width="3" fill="none" opacity=".75"/>`;
        }
        /* a lamp on a bracket, hung out over the water */
        s += `<path d="M${f1(rx)} 0L${f1(rx)} ${f1(h * 0.3)}" stroke="#08292C" stroke-width="8"/>`;
        s += `<path d="M${f1(rx - 30)} ${f1(h * 0.3)}L${f1(rx + 30)} ${f1(h * 0.3)}" stroke="#08292C" stroke-width="6"/>`;
        s += cut(`M${f1(rx - 17)} ${f1(h * 0.34)}L${f1(rx + 17)} ${f1(h * 0.34)}L${f1(rx + 23)} ${f1(h * 0.47)}L${f1(rx - 23)} ${f1(h * 0.47)}Z`, P.goldL, null, null, 0);
        s += `<path d="M${f1(rx - 24)} ${f1(h * 0.47)}L${f1(rx + 24)} ${f1(h * 0.47)}L${f1(rx + 20)} ${f1(h * 0.5)}L${f1(rx - 20)} ${f1(h * 0.5)}Z" fill="#08292C"/>`;
        s += `<circle cx="${f1(rx)}" cy="${f1(h * 0.41)}" r="${f1(h * 0.12)}" fill="${P.gold}" opacity=".2"/>`;
        return s;
      },
    },
    {
      id: "wolf",
      no: "Show three",
      title: "The Long Way Round the Wolf",
      blurb: "A story that keeps insisting the wolf is the villain, and a girl who keeps stopping to check.",
      ages: "9–13", mins: "55 min", cast: "3 performers", interval: "None",
      run: "touring September to November",
      tint: P.red,
      months: [9, 10, 11],
      back(r) {
        let s = `<defs>${grad("g-wolf-sky", [[0, "#2B1233"], [0.44, "#4A2350"], [0.76, "#B0431A"], [1, "#E8862A"]])}</defs>`;
        s += `<rect x="0" y="0" width="1400" height="900" fill="url(#g-wolf-sky)"/>`;
        s += `<rect x="0" y="430" width="1400" height="46" fill="${P.gold}" opacity=".34"/>`;
        for (let i = 0; i < 22; i++) {
          const x = r() * 1400, y = 40 + r() * 300, sz = 4 + r() * 5;
          s += `<path d="${star(x, y, sz)}" fill="${P.cream}" opacity="${(0.2 + r() * 0.4).toFixed(2)}"/>`;
        }
        [[300, 330], [372, 296], [452, 342], [1090, 308]].forEach(([x, y]) => {
          s += `<path d="M${x} ${y}q18 -16 34 0q16 -16 34 0" stroke="${P.plumD}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
        });
        s += tone("t-wolf", 0, 0, 1400, 900, 8, 1.35, "#000", 0.3);
        return s;
      },
      far(r) {
        let s = cut(ridge(-40, 1460, 900, [[-40, 520], [260, 462], [640, 512], [1000, 452], [1460, 500]], r), "#3A2246", "#5D3466", null, 4);
        const rr = rng(9);
        for (let i = 0; i < 22; i++) {
          const x = -20 + i * 68 + (rr() - 0.5) * 40;
          s += cut(pine(x, 610 + rr() * 20, 150 + rr() * 120, 42 + rr() * 26, rr), P.greenD, "#2E7B4A", null, 3);
        }
        return s;
      },
      mid(r) {
        const gr = ridge(-40, 1460, 900, [[-40, 660], [340, 616], [760, 656], [1140, 610], [1460, 648]], r);
        let s = cut(gr, "#12351F", "#2A6B3E", null, 4) + toneOn("m3", gr, 8, 1.3, "#000", 0.3);
        /* the path, going the long way round */
        const PATHD = "M-20 764Q300 706 420 676Q540 646 760 658Q980 670 1180 612";
        s += `<path d="${PATHD}" stroke="${P.cream2}" stroke-width="26" fill="none" opacity=".5" stroke-linecap="round"/>`;
        s += `<path d="${PATHD}" stroke="${P.cream}" stroke-width="12" fill="none" opacity=".35" stroke-dasharray="30 26" stroke-linecap="round"/>`;
        /* THE WOLF — one silhouette, cut in a single piece, facing the girl.
           Legs are separate flats behind it, the way a real cut-out is built. */
        s += `<g transform="translate(838,646)">
          <path d="M-108 -74h34v82h-34zM-64 -70h32v78h-32zM152 -74h32v82h-32zM196 -70h32v78h-32z" fill="#07050B"/>
          <path d="M-300 -150Q-300 -180 -270 -190Q-248 -196 -234 -198
            Q-230 -240 -210 -246Q-204 -214 -188 -198L-166 -200
            Q-158 -242 -138 -248Q-134 -208 -118 -192
            Q-92 -166 -66 -158Q20 -186 110 -182Q180 -178 216 -152
            Q254 -198 296 -230Q280 -168 244 -128Q236 -76 214 -44
            Q120 -30 20 -34Q-60 -38 -96 -60Q-128 -84 -172 -104
            Q-230 -126 -268 -136Q-292 -142 -300 -150Z" fill="#0A0710"/>
          <path d="M-300 -150Q-300 -180 -270 -190Q-248 -196 -234 -198
            Q-230 -240 -210 -246Q-204 -214 -188 -198L-166 -200
            Q-158 -242 -138 -248Q-134 -208 -118 -192Q-92 -166 -66 -158
            Q-40 -164 -10 -168Q-90 -140 -140 -120Q-220 -128 -300 -150Z" fill="#1B1226"/>
          <path d="M-128 -180q34 22 30 66q-4 40 -46 52q26 -34 24 -66q-2 -30 -8 -52z" fill="${P.cream2}" opacity=".9"/>
          <circle cx="-232" cy="-172" r="11" fill="${P.gold}"/>
          <path d="M-246 -184q12 -8 26 -2" stroke="${P.ink}" stroke-width="4" fill="none" stroke-linecap="round"/>
          <circle cx="-296" cy="-156" r="9" fill="#2A1520"/>
          <path d="M-286 -136q20 6 42 8" stroke="#1B1226" stroke-width="5" fill="none" stroke-linecap="round"/>
        </g>`;
        /* the girl with the lantern, small, at the other end of the path */
        s += `<g transform="translate(486,700) scale(1.16)">
          <circle cx="0" cy="-64" r="21" fill="#2A1520"/>
          <path d="M-24 -44h48l12 74q-36 12 -72 0z" fill="${P.red}"/>
          <path d="M-20 30l-8 46h13l11 -38 10 38h13l-5 -46z" fill="#2A1520"/>
          <path d="M22 -34l30 22 -8 14 -32 -18z" fill="${P.red}"/>
          <circle cx="54" cy="4" r="17" fill="${P.goldL}"/>
          <circle cx="54" cy="4" r="34" fill="${P.gold}" opacity=".26"/>
          <path d="M44 -14h20l4 34h-28z" fill="${P.goldD}" opacity=".55"/></g>`;
        return s;
      },
      fore(r) {
        const g3 = `M-40 900L-40 726${edge(-40, 726, 1460, 706, r, 11)}L1460 900Z`;
        let s = cut(g3, "#0A1B12", "#1E5136", null, 5) + toneOn("o3", g3, 8, 1.3, "#1E5136", 0.5);
        for (let i = 0; i < 40; i++) {
          const x = -20 + r() * 1440, y = 714 + r() * 30, h = 40 + r() * 60;
          s += `<path d="M${f1(x)} ${f1(y)}q${f1(-16 + r() * 32)} ${f1(-h * 0.6)} ${f1(-8 + r() * 16)} ${f1(-h)}" stroke="#123020" stroke-width="6" fill="none" stroke-linecap="round"/>`;
        }
        /* a fallen log */
        s += `<g transform="translate(1010,762) rotate(-6) scale(.9)">
          <path d="M-190 0q0 -30 30 -30h300q30 0 30 30t-30 30h-300q-30 0 -30 -30z" fill="#3A2418"/>
          <ellipse cx="170" cy="0" rx="26" ry="30" fill="#6A4526"/>
          <ellipse cx="170" cy="0" rx="14" ry="17" fill="#3A2418" opacity=".6"/>
          <path d="M-160 -14h240M-140 12h200" stroke="#22140D" stroke-width="5" stroke-linecap="round"/></g>`;
        [[606, 744, 0.94], [676, 760, 0.76], [756, 738, 0.6]].forEach(([x, y, k]) => {
          s += `<g transform="translate(${x},${y}) scale(${k})">
            <path d="M-10 0h20l6 46h-32z" fill="${P.cream2}"/>
            <path d="M-42 -2q0 -42 42 -42t42 42q-42 14 -84 0z" fill="${P.red}"/>
            <circle cx="-16" cy="-20" r="7" fill="${P.cream}"/><circle cx="14" cy="-28" r="5" fill="${P.cream}"/></g>`;
        });
        return s;
      },
      wings(w, h, r) {
        let s = "";
        const bw = Math.max(70, w * 0.135);
        [[w * 0.165, 71], [w * 0.835, 113]].forEach(([cx, seed]) => {
          const rr = rng(seed);
          s += cut(pine(cx + bw * 0.24, h * 1.04, h * 0.92, bw * 0.72, rr), "#04120C", "#1B4C31", null, 4);
          s += cut(pine(cx, h * 1.06, h * 1.2, bw, rr), "#050D09", "#256B42", null, 5);
          for (let i = 0; i < 26; i++) {
            const a = rr() * Math.PI * 2, rad = bw * (0.16 + rr() * 0.5);
            s += `<circle cx="${f1(cx + Math.cos(a) * rad)}" cy="${f1(h * (0.28 + rr() * 0.62) + Math.sin(a) * rad * 0.5)}" r="${f1(2 + rr() * 3.4)}" fill="${P.gold}" opacity="${(0.16 + rr() * 0.32).toFixed(2)}"/>`;
          }
        });
        return s;
      },
    },
  ];
  /* ═══════════════════════ the proscenium arch (box space) ═══════════════ */
  function archArt(w, h) {
    const r = rng(1337);
    const sx = Math.max(52, w * 0.098);      /* side flat width */
    const ty = Math.max(56, h * 0.15);       /* top border depth */
    const by = Math.max(30, h * 0.075);      /* apron depth */
    let s = "";
    /* the frame, cut as one piece with a hole in it (evenodd) */
    const outer = `M0 0L${w} 0L${w} ${h}L0 ${h}Z`;
    const inner = `M${f1(sx)} ${f1(ty)}${edge(sx, ty, w - sx, ty, r, 3)}${edge(w - sx, ty, w - sx, h - by, r, 3)}${edge(w - sx, h - by, sx, h - by, r, 3)}${edge(sx, h - by, sx, ty, r, 3)}Z`;
    s += `<path d="${outer}${inner}" fill="${P.redD}" fill-rule="evenodd"/>`;
    s += `<path d="${outer}${inner}" fill="${P.red}" fill-rule="evenodd" transform="translate(0,-4)" opacity=".92"/>`;
    /* gold trim just inside the opening */
    s += `<path d="${inner}" fill="none" stroke="${P.gold}" stroke-width="6" opacity=".9"/>`;
    s += `<path d="${inner}" fill="none" stroke="${P.goldL}" stroke-width="2" transform="translate(0,-3)" opacity=".8"/>`;
    /* the pelmet: a scalloped valance dipping across the top */
    const sc = Math.max(5, Math.round(w / 130)), dip = ty * 0.42;
    let pel = `M0 0L${w} 0L${w} ${f1(ty * 0.42)}`;
    for (let i = sc; i >= 1; i--) {
      const x0 = (w * i) / sc, x1 = (w * (i - 1)) / sc;
      pel += `Q${f1((x0 + x1) / 2)} ${f1(ty * 0.42 + dip * (0.8 + r() * 0.4))} ${f1(x1)} ${f1(ty * 0.42)}`;
    }
    s += `<path d="${pel}Z" fill="${P.redD}"/>`;
    s += `<path d="${pel}Z" fill="${P.red}" transform="translate(0,-5)" opacity=".55"/>`;
    for (let i = 0; i < sc; i++) {
      const x = (w * (i + 0.5)) / sc;
      s += `<path d="M${f1(x)} ${f1(ty * 0.42 + dip * 0.94)}l0 ${f1(ty * 0.16)}" stroke="${P.gold}" stroke-width="4" stroke-linecap="round"/>`;
      s += `<circle cx="${f1(x)}" cy="${f1(ty * 0.42 + dip * 0.94 + ty * 0.2)}" r="${f1(ty * 0.055)}" fill="${P.gold}"/>`;
    }
    s += `<path d="M0 ${f1(ty * 0.2)}L${w} ${f1(ty * 0.2)}" stroke="${P.goldD}" stroke-width="3" opacity=".7"/>`;
    /* the company name, cut out of the pelmet */
    s += `<text x="${f1(w / 2)}" y="${f1(ty * 0.3)}" text-anchor="middle" fill="${P.goldL}"
      font-family="Fraunces, Georgia, serif" font-weight="800" letter-spacing="${f1(Math.max(3, w * 0.006))}"
      font-size="${f1(Math.min(ty * 0.34, w * 0.036))}">FOLDAWAY</text>`;
    /* two curtain legs, tied back */
    const legs = [];
    [0, 1].forEach((side) => {
      const cw = sx * 1.5, x0 = side ? w - cw : 0;
      const dir = side ? -1 : 1;
      let d = `M${f1(x0 + (side ? cw : 0))} ${f1(ty * 0.5)}`;
      d += `Q${f1(x0 + (side ? cw * 0.1 : cw * 0.9))} ${f1(h * 0.4)} ${f1(x0 + (side ? cw * 0.42 : cw * 0.58))} ${f1(h * 0.56)}`;
      d += `Q${f1(x0 + (side ? cw * 0.05 : cw * 0.95))} ${f1(h * 0.78)} ${f1(x0 + (side ? cw * 0.3 : cw * 0.7))} ${f1(h - by)}`;
      d += `L${f1(x0 + (side ? cw : 0))} ${f1(h - by)}Z`;
      legs.push(d);
      s += `<path d="${d}" fill="${P.redD}"/>`;
      s += `<path d="${d}" fill="${P.red}" transform="translate(${dir * -3},-4)" opacity=".55"/>`;
      for (let i = 1; i < 5; i++) {
        const t = i / 5;
        s += `<path d="M${f1(x0 + (side ? cw - cw * t * 0.5 : cw * t * 0.5))} ${f1(ty * 0.6)}Q${f1(x0 + (side ? cw * 0.2 : cw * 0.8))} ${f1(h * 0.6)} ${f1(x0 + (side ? cw * 0.34 : cw * 0.66))} ${f1(h - by)}`
          + `" stroke="${P.redD}" stroke-width="${f1(2 + i)}" fill="none" opacity=".5"/>`;
      }
      const tx = x0 + (side ? cw * 0.5 : cw * 0.1);
      s += `<path d="M${f1(tx)} ${f1(h * 0.53)}q${f1(cw * 0.2)} ${f1(h * 0.032)} ${f1(cw * 0.4)} -${f1(h * 0.006)}" stroke="${P.gold}" stroke-width="7" fill="none" stroke-linecap="round"/>`;
      s += `<circle cx="${f1(tx + cw * (side ? 0.08 : 0.32))}" cy="${f1(h * 0.556)}" r="${f1(Math.max(4, cw * 0.042))}" fill="${P.goldL}"/>`;
    });
    /* the apron, with the paper edge catching the footlights */
    const apron = `M0 ${f1(h - by)}${edge(0, h - by, w, h - by, r, 3)}L${w} ${h}L0 ${h}Z`;
    s += `<path d="${apron}" fill="${P.redD}"/>`;
    s += `<path d="M0 ${f1(h - by)}${edge(0, h - by, w, h - by, r, 3)}L${w} ${f1(h - by + 7)}L0 ${f1(h - by + 7)}Z" fill="${P.goldL}" opacity=".55"/>`;
    /* the frame's own tooth: hatch and dots, clipped to the RED paper only, so
       nothing lands on the scene showing through the opening */
    s += `<defs><clipPath id="c-arch">` +
      `<path d="${outer}${inner}" clip-rule="evenodd"/><path d="${pel}Z"/>` +
      `<path d="${legs[0]}"/><path d="${legs[1]}"/><path d="${apron}"/></clipPath></defs>`;
    s += `<g clip-path="url(#c-arch)">` +
      hatch("h-arch", 0, 0, w, h, 8, "#4E0D08", 0.34, 2) +
      tone("t-arch", 0, 0, w, h, 9, 1.35, "#2E0704", 0.3) + `</g>`;
    return s;
  }
  /* ═══════════════════════ build the rig ═════════════════════════════════ */
  const SLOTS = [
    { k: "back", z: -360, exit: "translateY(-146%)", world: true },
    { k: "far", z: -280, exit: "translateY(-146%)", world: true },
    { k: "mid", z: -190, exit: "translateX(-144%) rotate(-2.6deg)", world: true },
    { k: "fore", z: -95, exit: "translateX(144%) rotate(2.6deg)", world: true },
    { k: "wings", z: -40, exit: "translateY(134%)", world: false },
    { k: "arch", z: 0, exit: "none", world: false, shared: true },
  ];
  const PERSP = 1150;
  const rig = $("rig"), houseEl = $("house");
  const sheets = {};                 /* sheets[slot][showIndex] = element */
  const archSheet = { el: null };
  SLOTS.forEach((sl) => {
    const flat = document.createElement("div");
    flat.className = "flat";
    flat.dataset.d = sl.k;
    flat.style.transform = `translateZ(${sl.z}px) scale(${((PERSP - sl.z) / PERSP).toFixed(4)})`;
    if (sl.shared) {
      const sh = document.createElement("div");
      sh.className = "sheet";
      flat.appendChild(sh);
      archSheet.el = sh;
    } else {
      sheets[sl.k] = SHOWS.map((show, i) => {
        const sh = document.createElement("div");
        sh.className = "sheet";
        sh.style.setProperty("--exit", sl.exit);
        if (i !== 0) { sh.classList.add("out"); sh.hidden = true; }
        flat.appendChild(sh);
        return sh;
      });
    }
    rig.appendChild(flat);
  });
  /* world art is generated once per show/slot; box art is redrawn on resize */
  const worldArt = {};
  SLOTS.filter((s) => s.world).forEach((sl) => {
    worldArt[sl.k] = SHOWS.map((show, i) => show[sl.k](rng(i * 100 + sl.k.length * 7 + 3)));
  });
  let vb = "0 240 1400 580";
  function computeViewBox(w, h) {
    const A = Math.max(0.2, w / Math.max(1, h));
    let H = 620, W = H * A;
    if (W > 1400) { W = 1400; H = W / A; }
    if (W < 520) { W = 520; H = W / A; }
    if (H > 900) { H = 900; W = H * A; }
    /* the window sits low in the painted world — a theatre shows you the floor,
       not the sky — but never past the edge of the paper. */
    const cy = Math.max(H / 2, Math.min(900 - H / 2, 530));
    return `${f1(700 - W / 2)} ${f1(cy - H / 2)} ${f1(W)} ${f1(H)}`;
  }
  function paint() {
    const w = Math.max(1, houseEl.clientWidth), h = Math.max(1, houseEl.clientHeight);
    vb = computeViewBox(w, h);
    SLOTS.filter((s) => s.world).forEach((sl) => {
      sheets[sl.k].forEach((el, i) => {
        el.innerHTML = `<svg viewBox="${vb}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${worldArt[sl.k][i]}</svg>`;
      });
    });
    sheets.wings.forEach((el, i) => {
      el.innerHTML = `<svg viewBox="0 0 ${f1(w)} ${f1(h)}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${SHOWS[i].wings(w, h, rng(i * 31 + 5))}</svg>`;
    });
    archSheet.el.innerHTML = `<svg viewBox="0 0 ${f1(w)} ${f1(h)}" preserveAspectRatio="none" aria-hidden="true">${archArt(w, h)}</svg>`;
  }
  /* ═══════════════════════ the scene change ══════════════════════════════ */
  const OUT_ORDER = ["wings", "fore", "mid", "far", "back"];
  const IN_ORDER = ["back", "far", "mid", "fore", "wings"];
  let current = 0, changing = false;
  const staged = new Set([0]);
  const elTitle = $("showtitle"), elBlurb = $("blurb"), elRun = $("run");
  const fAges = $("fAges"), fMins = $("fMins"), fCast = $("fCast"), fInt = $("fInt");
  function writeBilling(i) {
    const s = SHOWS[i];
    elTitle.textContent = s.title;
    elBlurb.textContent = s.blurb;
    elRun.textContent = `${s.no} · ${s.run}`;
    fAges.textContent = s.ages; fMins.textContent = s.mins;
    fCast.textContent = s.cast; fInt.textContent = s.interval;
    document.documentElement.style.setProperty("--tint", s.tint);
  }
  function setShow(i) {
    if (i === current || changing) return;
    const from = current; current = i;
    changing = true;
    houseEl.classList.add("changing");
    const step = reduce.matches ? 0 : 46;
    OUT_ORDER.forEach((k, n) => {
      const el = sheets[k][from];
      el.style.transitionDelay = `${n * step}ms`;
      el.classList.add("out");
    });
    const inDelay = reduce.matches ? 0 : 220;
    IN_ORDER.forEach((k, n) => {
      const el = sheets[k][i];
      el.hidden = false;
      el.style.transitionDelay = `${inDelay + n * step}ms`;
      /* force the browser to acknowledge the pre-transform before releasing it */
      void el.offsetWidth;
      el.classList.remove("out");
    });
    setTimeout(() => writeBilling(i), reduce.matches ? 0 : 300);
    setTimeout(() => {
      OUT_ORDER.forEach((k) => { sheets[k][from].hidden = true; });
      houseEl.classList.remove("changing");
      changing = false;
      if (!staged.has(i)) { staged.add(i); }
      markStubs();
    }, reduce.matches ? 30 : 1080);
    markStubs(i);
  }
  /* ── the three ticket stubs ─────────────────────────────────────────── */
  const stubsEl = $("stubs");
  const stubBtns = SHOWS.map((s, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "stub";
    b.setAttribute("aria-pressed", i === 0 ? "true" : "false");
    const r = rng(i * 17 + 9);
    const paper = `M4 6${edge(4, 6, 176, 3, r, 2.4)}L178 84${edge(178, 84, 6, 86, r, 2.4)}Z`;
    b.innerHTML =
      `<svg viewBox="0 0 180 88" preserveAspectRatio="none" aria-hidden="true">
         <path d="${paper}" fill="${P.cream3}" transform="translate(1,3)"/>
         <path d="${paper}" fill="${i === 0 ? P.gold : P.cream}" class="s-paper"/>
         <path d="M142 2L142 88" stroke="${P.ink}" stroke-width="1.6" stroke-dasharray="5 6" opacity=".45"/>
         <circle cx="161" cy="46" r="9" fill="${P.ink}" class="s-punch" opacity="${i === 0 ? 1 : 0}"/>
       </svg>` +
      `<span class="s-n">No. ${i + 1}</span><span class="s-t">${s.title}</span><span class="s-a">Ages ${s.ages} · ${s.mins}</span>`;
    b.addEventListener("click", () => { arm(); setShow(i); });
    stubsEl.appendChild(b);
    return b;
  });
  function markStubs(active = current) {
    stubBtns.forEach((b, i) => {
      b.setAttribute("aria-pressed", i === active ? "true" : "false");
      b.querySelector(".s-paper").setAttribute("fill", i === active ? P.gold : P.cream);
      b.querySelector(".s-punch").setAttribute("opacity", staged.has(i) ? "1" : "0");
    });
    const t = `Staged ${staged.size} / 3`;
    $("tally").textContent = t; $("tally2").textContent = t;
  }
  /* ═══════════════════════ looking into the box ══════════════════════════ */
  let tRX = 0, tRY = 0, rX = 0, rY = 0, armed = false;
  const lookin = $("lookin");
  const MAXY = 15, MAXX = 8;
  function arm() { if (!armed) { armed = true; lookin.classList.add("gone"); } }
  function aim(px, py) {                       /* px,py in 0..1 of the house */
    tRY = (px - 0.5) * 2 * MAXY;
    tRX = -(py - 0.5) * 2 * MAXX;
  }
  let dragging = false, dragX = 0, dragY = 0;
  houseEl.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse" && !dragging) {
      const b = houseEl.getBoundingClientRect();
      aim((e.clientX - b.left) / b.width, (e.clientY - b.top) / b.height);
      arm();
    } else if (dragging) {
      const b = houseEl.getBoundingClientRect();
      tRY = Math.max(-MAXY, Math.min(MAXY, tRY + (e.clientX - dragX) / b.width * 46));
      tRX = Math.max(-MAXX, Math.min(MAXX, tRX - (e.clientY - dragY) / b.height * 26));
      dragX = e.clientX; dragY = e.clientY;
    }
  });
  houseEl.addEventListener("pointerdown", (e) => {
    dragging = true; dragX = e.clientX; dragY = e.clientY; arm();
    try { houseEl.setPointerCapture(e.pointerId); } catch (err) { /* older engines */ }
  });
  const endDrag = () => { dragging = false; };
  houseEl.addEventListener("pointerup", endDrag);
  houseEl.addEventListener("pointercancel", endDrag);
  houseEl.addEventListener("pointerleave", () => { if (!dragging) { tRX = 0; tRY = 0; } });
  houseEl.addEventListener("keydown", (e) => {
    const s = 3.2; let hit = true;
    if (e.key === "ArrowRight") tRY = Math.min(MAXY, tRY + s);
    else if (e.key === "ArrowLeft") tRY = Math.max(-MAXY, tRY - s);
    else if (e.key === "ArrowUp") tRX = Math.min(MAXX, tRX + s);
    else if (e.key === "ArrowDown") tRX = Math.max(-MAXX, tRX - s);
    else if (e.key === "Home") { tRX = 0; tRY = 0; }
    else hit = false;
    if (hit) { arm(); e.preventDefault(); }
  });
  /* device tilt, where the browser gives it away without a permission prompt */
  window.addEventListener("deviceorientation", (e) => {
    if (dragging || e.gamma == null) return;
    tRY = Math.max(-MAXY, Math.min(MAXY, e.gamma * 0.55));
    tRX = Math.max(-MAXX, Math.min(MAXX, ((e.beta || 45) - 45) * -0.22));
    arm();
  });
  /* ═══════════════════════ dust in the house light ═══════════════════════ */
  const dust = $("dust"), dctx = dust.getContext("2d");
  let motes = [], dpr = 1;
  function seedDust(w, h) {
    const n = Math.round(Math.min(110, Math.max(40, (w * h) / 7600)));
    const r = rng(77);
    motes = [];
    for (let i = 0; i < n; i++) {
      motes.push({ x: r() * w, y: r() * h, r: 0.5 + r() * 1.9, v: 3 + r() * 11, p: r() * 6.28, a: 0.16 + r() * 0.5 });
    }
  }
  function drawDust(dt, t) {
    const w = dust.width / dpr, h = dust.height / dpr;
    dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dctx.clearRect(0, 0, w, h);
    for (const m of motes) {
      if (!reduce.matches) {
        m.y -= m.v * dt;
        m.x += Math.sin(t * 0.5 + m.p) * 7 * dt;
        if (m.y < -6) { m.y = h + 6; m.x = Math.random() * w; }
      }
      const beam = Math.max(0, 1 - Math.abs(m.x - w * 0.5) / (w * 0.52)) * Math.max(0.18, 1 - m.y / h);
      dctx.globalAlpha = m.a * beam;
      dctx.fillStyle = "#FFD9A0";
      dctx.beginPath();
      dctx.arc(m.x, m.y, m.r, 0, 6.2832);
      dctx.fill();
    }
    dctx.globalAlpha = 1;
  }
  /* ═══════════════════════ scrub control (used three times) ══════════════ */
  function makeScrub(el, o) {
    let v = o.value;
    const knob = el.querySelector(".knob");
    const kw = 3;
    function place() {
      const t = (v - o.min) / (o.max - o.min);
      knob.style.transform = `translateX(${((el.clientWidth - kw) * t).toFixed(1)}px)`;
    }
    function set(nv, fire = true) {
      nv = Math.max(o.min, Math.min(o.max, Math.round(nv / (o.step || 1)) * (o.step || 1)));
      const same = nv === v; v = nv;
      place();
      el.setAttribute("aria-valuenow", String(v));
      if (o.text) el.setAttribute("aria-valuetext", o.text(v));
      if (fire && !same && o.onInput) o.onInput(v);
      if (fire && same && o.always && o.onInput) o.onInput(v);
    }
    function fromX(cx) {
      const b = el.getBoundingClientRect();
      set(o.min + ((cx - b.left) / b.width) * (o.max - o.min));
    }
    let down = false;
    el.addEventListener("pointerdown", (e) => {
      down = true; fromX(e.clientX);
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* older engines */ }
    });
    el.addEventListener("pointermove", (e) => { if (down) fromX(e.clientX); });
    el.addEventListener("pointerup", () => { down = false; });
    el.addEventListener("pointercancel", () => { down = false; });
    el.addEventListener("keydown", (e) => {
      const big = (o.max - o.min) / 8;
      let hit = true;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") set(v + (o.step || 1));
      else if (e.key === "ArrowLeft" || e.key === "ArrowDown") set(v - (o.step || 1));
      else if (e.key === "PageUp") set(v + big);
      else if (e.key === "PageDown") set(v - big);
      else if (e.key === "Home") set(o.min);
      else if (e.key === "End") set(o.max);
      else hit = false;
      if (hit) e.preventDefault();
    });
    return { set, place, get: () => v };
  }
  /* ═══════════════════════ 2. YOUR HALL ══════════════════════════════════ */
  const NEED_W = 6.0, NEED_D = 5.0;
  const MAX_W = 12, MAX_D = 9;
  const planEl = $("plan");
  let hallW = 9.0, hallD = 7.5;
  const PPM = 48, PX0 = 96, PY0 = 84;
  const PLAN_W = PX0 + MAX_W * PPM + 74, PLAN_H = PY0 + MAX_D * PPM + 52;
  planEl.setAttribute("tabindex", "0");
  planEl.setAttribute("role", "slider");
  planEl.setAttribute("aria-label", "The size of your hall. Left and right change the width, up and down change the depth.");
  function drawPlan() {
    const r = rng(404);
    const w = hallW * PPM, d = hallD * PPM;
    const fits = hallW >= NEED_W + 0.6 && hallD >= NEED_D + 1.4;
    const fw = NEED_W * PPM, fd = NEED_D * PPM;
    let s = "";
    /* the van, waiting outside with the two cases */
    s += `<g transform="translate(6,0)" opacity=".9">
      <path d="M0 34h74l16 22h16v22H0z" fill="${P.redD}"/>
      <path d="M0 30h74l16 22h14v4H0z" fill="${P.red}"/>
      <circle cx="22" cy="78" r="9" fill="${P.ink}"/><circle cx="86" cy="78" r="9" fill="${P.ink}"/>
      <rect x="76" y="40" width="18" height="12" fill="${P.goldL}" opacity=".8"/></g>`;
    s += `<text x="128" y="34" fill="${P.cream3}" font-family="Courier Prime, monospace" font-size="15" letter-spacing="1.6">50 M OR LESS TO A DOOR WE CAN USE</text>`;
    s += `<path d="M118 66Q${f1(PX0 + 20)} ${f1(PY0 - 6)} ${f1(PX0 + 6)} ${f1(PY0 + d - 74)}" stroke="${P.gold}" stroke-width="2.4" stroke-dasharray="7 8" fill="none" opacity=".55"/>`;
    /* the hall floor */
    const floor = `M${PX0} ${PY0}${edge(PX0, PY0, PX0 + w, PY0, r, 2.6)}${edge(PX0 + w, PY0, PX0 + w, PY0 + d, r, 2.6)}${edge(PX0 + w, PY0 + d, PX0, PY0 + d, r, 2.6)}Z`;
    s += `<path d="${floor}" fill="#2A1B2E" transform="translate(3,5)"/>`;
    s += `<path d="${floor}" fill="#E8D5B4"/>`;
    for (let x = PX0 + 26; x < PX0 + w - 6; x += 26) {
      s += `<path d="M${f1(x)} ${f1(PY0 + 4)}L${f1(x)} ${f1(PY0 + d - 4)}" stroke="#CBB48C" stroke-width="1.6" opacity=".75"/>`;
    }
    for (let y = PY0 + 34; y < PY0 + d - 6; y += 34) {
      s += `<path d="M${f1(PX0 + 4)} ${f1(y)}L${f1(PX0 + w - 4)} ${f1(y)}" stroke="#CBB48C" stroke-width="1.2" opacity=".5"/>`;
    }
    /* our footprint, which does not shrink */
    const cx = PX0 + w / 2;
    const col = fits ? P.gold : P.red;
    s += `<path d="M${f1(cx - fw / 2)} ${f1(PY0 + 18)}L${f1(cx + fw / 2)} ${f1(PY0 + 18)}L${f1(cx + fw / 2)} ${f1(PY0 + 18 + fd)}L${f1(cx - fw / 2)} ${f1(PY0 + 18 + fd)}Z" fill="${col}" opacity=".14"/>`;
    s += `<path d="M${f1(cx - fw / 2)} ${f1(PY0 + 18)}L${f1(cx + fw / 2)} ${f1(PY0 + 18)}L${f1(cx + fw / 2)} ${f1(PY0 + 18 + fd)}L${f1(cx - fw / 2)} ${f1(PY0 + 18 + fd)}Z" fill="none" stroke="${col}" stroke-width="3" stroke-dasharray="12 8"/>`;
    /* the theatre itself, in plan */
    s += `<path d="M${f1(cx - fw / 2 + 12)} ${f1(PY0 + 30)}L${f1(cx + fw / 2 - 12)} ${f1(PY0 + 30)}L${f1(cx + fw / 2 - 12)} ${f1(PY0 + 62)}L${f1(cx - fw / 2 + 12)} ${f1(PY0 + 62)}Z" fill="${P.red}"/>`;
    s += `<text x="${f1(cx)}" y="${f1(PY0 + 52)}" text-anchor="middle" fill="${P.cream}" font-family="Courier Prime, monospace" font-size="15" letter-spacing="2">SET 6.0 × 5.0 m</text>`;
    /* the children, sitting on the floor IN FRONT of our footprint — the
       6 × 5 m is ours alone, and that is the point of the drawing */
    const aTop = PY0 + 26 + fd, aBot = PY0 + d - 16;
    const per = Math.max(5, Math.round((w - 40) / 44));
    let seated = 0;
    for (let py = aTop + 10; py < aBot; py += 30) {
      for (let rx = 0; rx < per; rx++) {
        const px = PX0 + 24 + (rx * (w - 48)) / (per - 1) + (seated % 2 ? 10 : 0);
        s += `<circle cx="${f1(px)}" cy="${f1(py)}" r="7" fill="${P.plum}" opacity=".62"/>`;
      }
      seated++;
    }
    if (seated > 0) {
      s += `<text x="${f1(PX0 + 14)}" y="${f1(aTop + 2)}" fill="#7A5E44" font-family="Courier Prime, monospace" font-size="15" letter-spacing="1.4">THE AUDIENCE SITS HERE · UP TO 180</text>`;
    }
    /* door, and the two sockets */
    s += `<path d="M${f1(PX0)} ${f1(PY0 + d - 96)}L${f1(PX0)} ${f1(PY0 + d - 36)}" stroke="${P.ink}" stroke-width="7"/>`;
    s += `<path d="M${f1(PX0)} ${f1(PY0 + d - 96)}q42 6 42 60" stroke="${P.cream3}" stroke-width="2" fill="none" stroke-dasharray="5 6"/>`;
    s += `<g transform="translate(${f1(PX0 + w - 46)},${f1(PY0 + 40)})">
      <rect x="0" y="0" width="20" height="20" fill="${P.gold}"/><rect x="0" y="28" width="20" height="20" fill="${P.gold}"/>
      <path d="M-6 10Q${f1(-(w - fw) / 3)} 40 ${f1(-(w - fw) / 2.1)} 62" stroke="${P.gold}" stroke-width="2.4" fill="none" opacity=".7"/></g>`;
    /* the corner you drag */
    const hx = PX0 + w, hy = PY0 + d;
    s += `<path d="M${f1(hx - 40)} ${f1(hy)}L${f1(hx)} ${f1(hy)}L${f1(hx)} ${f1(hy - 40)}Z" fill="${P.gold}"/>`;
    s += `<path d="M${f1(hx - 22)} ${f1(hy - 8)}L${f1(hx - 8)} ${f1(hy - 22)}M${f1(hx - 12)} ${f1(hy - 6)}L${f1(hx - 6)} ${f1(hy - 12)}" stroke="${P.ink}" stroke-width="2.6"/>`;
    /* dimension lines */
    s += `<path d="M${PX0} ${f1(PY0 - 16)}L${f1(PX0 + w)} ${f1(PY0 - 16)}" stroke="${P.cream3}" stroke-width="1.6"/>`;
    s += `<text x="${f1(PX0 + w / 2)}" y="${f1(PY0 - 24)}" text-anchor="middle" fill="${P.cream2}" font-family="Courier Prime, monospace" font-size="17">${hallW.toFixed(1)} m</text>`;
    s += `<path d="M${f1(PX0 + w + 16)} ${PY0}L${f1(PX0 + w + 16)} ${f1(PY0 + d)}" stroke="${P.cream3}" stroke-width="1.6"/>`;
    s += `<text x="${f1(PX0 + w + 26)}" y="${f1(PY0 + d / 2)}" fill="${P.cream2}" font-family="Courier Prime, monospace" font-size="17">${hallD.toFixed(1)} m</text>`;
    planEl.innerHTML = `<svg viewBox="0 0 ${f1(PLAN_W)} ${f1(PLAN_H)}" aria-hidden="true">${s}</svg>`;
    const v = $("verdict");
    if (fits) {
      const spare = ((hallW - NEED_W) / 2).toFixed(1);
      v.textContent = `${hallW.toFixed(1)} × ${hallD.toFixed(1)} m — fits, with ${spare} m spare at each side.`;
      v.classList.remove("bad");
    } else {
      const short = [];
      if (hallW < NEED_W + 0.6) short.push(`${(NEED_W + 0.6 - hallW).toFixed(1)} m across`);
      if (hallD < NEED_D + 1.4) short.push(`${(NEED_D + 1.4 - hallD).toFixed(1)} m deep`);
      v.textContent = `${hallW.toFixed(1)} × ${hallD.toFixed(1)} m — short by ${short.join(" and ")}. Ring us anyway; we have played in a corridor.`;
      v.classList.add("bad");
    }
    planEl.setAttribute("aria-valuetext", v.textContent);
  }
  let planDown = false;
  planEl.addEventListener("pointerdown", (e) => {
    planDown = true; planFrom(e);
    try { planEl.setPointerCapture(e.pointerId); } catch (err) { /* older engines */ }
  });
  planEl.addEventListener("pointermove", (e) => { if (planDown) planFrom(e); });
  planEl.addEventListener("pointerup", () => { planDown = false; });
  planEl.addEventListener("pointercancel", () => { planDown = false; });
  function planFrom(e) {
    const b = planEl.getBoundingClientRect();
    const sc = b.width / PLAN_W;
    hallW = Math.max(4, Math.min(MAX_W, ((e.clientX - b.left) / sc - PX0) / PPM));
    hallD = Math.max(3.5, Math.min(MAX_D, ((e.clientY - b.top) / sc - PY0) / PPM));
    hallW = Math.round(hallW * 2) / 2; hallD = Math.round(hallD * 2) / 2;
    drawPlan();
  }
  planEl.addEventListener("keydown", (e) => {
    let hit = true;
    if (e.key === "ArrowRight") hallW = Math.min(MAX_W, hallW + 0.5);
    else if (e.key === "ArrowLeft") hallW = Math.max(4, hallW - 0.5);
    else if (e.key === "ArrowDown") hallD = Math.min(MAX_D, hallD + 0.5);
    else if (e.key === "ArrowUp") hallD = Math.max(3.5, hallD - 0.5);
    else hit = false;
    if (hit) { e.preventDefault(); drawPlan(); }
  });
  /* ═══════════════════════ 3. TOURING ════════════════════════════════════ */
  const TOWNS = [
    ["Sheffield", 470, 452, 2, "b"], ["Rotherham", 512, 428, 2, "r"], ["Barnsley", 462, 396, 2, "t"], ["Chesterfield", 452, 496, 2, "l"],
    ["Doncaster", 566, 392, 3, "r"], ["Wakefield", 470, 348, 3, "r"], ["Huddersfield", 404, 344, 3, "l"],
    ["Leeds", 462, 300, 4, "r"], ["Bradford", 410, 296, 4, "l"], ["Halifax", 384, 322, 4, "l"],
    ["Hull", 620, 358, 5, "l"], ["Grimsby", 664, 402, 5, "r"], ["Scunthorpe", 590, 392, 5, "b"],
    ["York", 512, 254, 6, "r"], ["Harrogate", 464, 246, 6, "l"], ["Ripon", 468, 208, 6, "l"],
    ["Scarborough", 618, 194, 7, "r"], ["Whitby", 592, 150, 7, "r"], ["Bridlington", 636, 240, 7, "r"],
    ["Manchester", 330, 350, 9, "l"], ["Stockport", 348, 376, 9, "b"], ["Oldham", 362, 328, 9, "r"],
    ["Preston", 300, 292, 10, "l"], ["Blackburn", 330, 284, 10, "t"], ["Burnley", 356, 272, 10, "r"],
    ["Lancaster", 282, 224, 11, "l"], ["Kendal", 284, 160, 11, "l"], ["Carlisle", 248, 84, 11, "l"],
  ];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const OFF = {
    1: "January · in the Attercliffe workshop, cutting and painting",
    8: "August · not touring. The whole month goes on building next year's set.",
    12: "December · not touring. Schools have their own show on, and so should they.",
  };
  const mapEl = $("mapwrap");
  let month = 2;
  /* not an accurate map — a cut-paper one. But the east coast has the Humber
     bitten out of it and Morecambe Bay on the west, so it reads as somewhere. */
  const COAST = `M250 40Q190 70 200 120Q236 150 226 196Q250 230 236 262Q268 290 250 322
    Q214 352 244 386Q276 410 300 452Q336 520 420 548Q520 572 600 540Q690 508 716 448
    Q736 412 704 392Q660 380 634 356Q690 340 676 300Q700 258 664 230Q654 176 610 140
    Q560 96 500 84Q400 60 340 66Q292 30 250 40Z`;
  function drawMap() {
    const r = rng(808);
    let s = `<defs>${grad("g-land", [[0, "#1E4231"], [1, "#12301F"]])}</defs>`;
    s += `<path d="${COAST}" fill="#0B2226" transform="translate(7,10)"/>`;
    s += `<path d="${COAST}" fill="url(#g-land)"/>`;
    s += `<path d="${COAST}" fill="none" stroke="${P.cream2}" stroke-width="2.4" opacity=".45"/>`;
    /* the sea, hatched the way a cut-paper map hatches it */
    for (let i = 0; i < 16; i++) {
      const y = 60 + i * 34;
      s += `<path d="M${f1(716 + (i % 2) * 14)} ${f1(y)}q22 -8 44 0q22 8 44 0" stroke="${P.tealD}" stroke-width="3" fill="none" opacity=".7"/>`;
    }
    s += toneOn("map", COAST, 8, 1.3, "#000", 0.3);
    /* compass and scale, because a map without them is a shape */
    s += `<g transform="translate(786,96)" opacity=".8">
      <path d="M0 -34L7 -7L34 0L7 7L0 34L-7 7L-34 0L-7 -7Z" fill="${P.cream3}"/>
      <text x="0" y="-42" text-anchor="middle" fill="${P.cream2}" font-family="Courier Prime, monospace" font-size="15">N</text></g>`;
    s += `<g transform="translate(52,548)" opacity=".8">
      <path d="M0 0L108 0M0 -6L0 6M54 -4L54 4M108 -6L108 6" stroke="${P.cream3}" stroke-width="2"/>
      <text x="0" y="22" fill="${P.cream3}" font-family="Courier Prime, monospace" font-size="14">0</text>
      <text x="108" y="22" text-anchor="end" fill="${P.cream3}" font-family="Courier Prime, monospace" font-size="14">40 MILES</text></g>`;
    const on = TOWNS.filter((t) => t[3] === month);
    /* the route, drawn town to town in the order the van does it */
    if (on.length > 1) {
      let d = `M${on[0][1]} ${on[0][2]}`;
      for (let i = 1; i < on.length; i++) d += `L${on[i][1]} ${on[i][2]}`;
      s += `<path d="${d}" stroke="${P.gold}" stroke-width="3" fill="none" stroke-dasharray="9 7" opacity=".9"/>`;
      s += `<path d="M470 452L${on[0][1]} ${on[0][2]}" stroke="${P.gold}" stroke-width="2" fill="none" stroke-dasharray="4 8" opacity=".5"/>`;
    }
    TOWNS.forEach(([n, x, y, m, side]) => {
      const live = m === month, past = m < month;
      const rad = live ? 8 : 4.2;
      s += `<circle cx="${x}" cy="${y}" r="${rad + 3}" fill="${P.ink}" opacity="${live ? 0.5 : 0}"/>`;
      s += `<circle cx="${x}" cy="${y}" r="${rad}" fill="${live ? P.gold : past ? P.cream3 : "#4C3B45"}"/>`;
      if (live) {
        const at = side === "l" ? [x - 15, y + 6, "end"] : side === "t" ? [x, y - 17, "middle"]
          : side === "b" ? [x, y + 27, "middle"] : [x + 15, y + 6, "start"];
        s += `<text x="${at[0]}" y="${at[1]}" text-anchor="${at[2]}" fill="${P.cream}" font-family="Courier Prime, monospace" font-size="17" letter-spacing="1">${n}</text>`;
      }
    });
    /* home */
    s += `<g transform="translate(452,436)"><path d="M0 30L0 8L18 -6L36 8L36 30Z" fill="${P.red}"/><path d="M-6 10L18 -10L42 10Z" fill="${P.redD}"/><rect x="13" y="16" width="10" height="14" fill="${P.gold}"/></g>`;
    s += `<text x="438" y="442" text-anchor="end" fill="${P.gold}" font-family="Courier Prime, monospace" font-size="15" letter-spacing="1.4">THE WORKSHOP</text>`;
    if (OFF[month]) {
      s += `<rect x="0" y="0" width="860" height="580" fill="${P.ink}" opacity=".62"/>`;
      s += `<text x="430" y="300" text-anchor="middle" fill="${P.gold}" font-family="Fraunces, Georgia, serif" font-weight="700" font-size="34">Nobody on the road</text>`;
    }
    mapEl.innerHTML = `<svg viewBox="0 0 860 580" aria-hidden="true">${s}</svg>`;
    const show = SHOWS.find((sh) => sh.months.includes(month));
    const cnt = on.length;
    $("monthRead").textContent = OFF[month]
      ? OFF[month]
      : `${MONTHS[month - 1]} · ${show ? show.title : "between shows"} · ${cnt} town${cnt === 1 ? "" : "s"}, ${cnt * 3 - 1} performances`;
  }
  const monthStops = $("monthStops");
  monthStops.innerHTML = MONTHS.map((m, i) => {
    const t = (i / 11) * 100;
    return `<i style="left:${t}%"></i><b style="left:${t}%">${m[0]}</b>`;
  }).join("");
  const monthScrub = makeScrub($("monthScrub"), {
    min: 1, max: 12, value: 2,
    text: (v) => MONTHS[v - 1],
    onInput: (v) => {
      month = v;
      [...monthStops.querySelectorAll("i")].forEach((el, i) => el.classList.toggle("on", i === v - 1));
      drawMap();
    },
  });
  /* ═══════════════════════ 4. PACKING ════════════════════════════════════ */
  const PIECES = [];
  (() => {
    const r = rng(1212);
    /* the arch, in four hinged flats, plus the pelmet */
    PIECES.push({ n: "Pelmet", kg: 1.8, case: 0, w: 272, h: 44, sx: 148, sy: 58, sr: 0, fill: P.redD });
    for (let i = 0; i < 4; i++) {
      PIECES.push({ n: `Arch flat ${i + 1}`, kg: 2.6, case: 0, w: 58, h: 196, sx: 150 + i * 70, sy: 108, sr: 0, fill: P.red });
    }
    for (let i = 0; i < 3; i++) {
      PIECES.push({ n: `Wing flat ${i + 1}`, kg: 2.4, case: 0, w: 50, h: 172, sx: 456 + i * 62, sy: 128, sr: 0, fill: P.greenD });
    }
    const sceneFills = [P.night, P.nightD, P.gold, P.teal, P.tealD, P.cream2, P.green, P.plum, P.goldD];
    for (let i = 0; i < 9; i++) {
      PIECES.push({
        n: `Scenery ${i + 1}`, kg: [1.4, 1.5, 1.2, 1.6, 1.3, 1.5, 1.4, 1.6, 1.5][i], case: 1,
        w: 38, h: 140 + (i % 3) * 16, sx: 654 + i * 42, sy: 138 + (i % 2) * 8, sr: (r() - 0.5) * 5, fill: sceneFills[i],
      });
    }
  })();
  const TOTAL_KG = PIECES.reduce((a, p) => a + p.kg, 0);
  const CASE_KG = [0, 1].map((c) => PIECES.filter((p) => p.case === c).reduce((a, p) => a + p.kg, 0));
  const CASE = [{ x: 1042, y: 194 }, { x: 1222, y: 194 }];
  const foldEl = $("foldout");
  let packT = 0;
  /* Where a piece ends up: a wide piece lies flat, a tall one stands on its
     long edge, and every piece is scaled so its longest side clears the case. */
  function packedPose(p) {
    const inCase = PIECES.filter((q) => q.case === p.case);
    const k = inCase.indexOf(p);
    const box = CASE[p.case];
    const long = Math.max(p.w, p.h);
    const sc = Math.min(0.62, 128 / long);
    const step = 128 / inCase.length;
    if (p.w > p.h) return { x: box.x + 12, y: box.y + 20 + k * step, rot: 0, sc };
    return { x: box.x + 14 + long * sc, y: box.y + 16 + k * step, rot: 90, sc };
  }
  function drawFold() {
    const r = rng(66);
    let s = "";
    /* the two cases, drawn once */
    [[CASE[0].x, CASE[0].y, "A", CASE_KG[0].toFixed(1) + " kg"], [CASE[1].x, CASE[1].y, "B", CASE_KG[1].toFixed(1) + " kg"]].forEach(([x, y, nm, kg]) => {
      s += `<path d="M${x} ${y}L${x + 156} ${y}L${x + 156} ${y + 164}L${x} ${y + 164}Z" fill="#3A2418" transform="translate(4,6)"/>`;
      s += `<path d="M${x} ${y}${edge(x, y, x + 156, y, r, 2)}L${x + 156} ${y + 164}${edge(x + 156, y + 164, x, y + 164, r, 2)}Z" fill="#5A3A22"/>`;
      s += `<path d="M${x} ${y + 7}L${x + 156} ${y + 7}" stroke="#3A2418" stroke-width="4"/>`;
      s += `<path d="M${x + 32} ${y}L${x + 32} ${y + 164}M${x + 124} ${y}L${x + 124} ${y + 164}" stroke="${P.goldD}" stroke-width="9" opacity=".85"/>`;
      s += `<path d="M${x + 60} ${y - 5}q18 -26 36 0" stroke="#3A2418" stroke-width="9" fill="none"/>`;
      s += `<path d="M${x + 2} ${y + 176}L${x + 154} ${y + 176}L${x + 154} ${y + 206}L${x + 2} ${y + 206}Z" fill="${P.cream}"/>`;
      s += `<path d="M${x + 78} ${y + 164}L${x + 78} ${y + 176}" stroke="${P.cream3}" stroke-width="3"/>`;
      s += `<text x="${x + 78}" y="${y + 197}" text-anchor="middle" fill="${P.ink}" font-family="Courier Prime, monospace" font-size="15" letter-spacing=".6">CASE ${nm} · ${kg}</text>`;
    });
    s += `<text x="1042" y="438" fill="${P.cream3}" font-family="Courier Prime, monospace" font-size="15" letter-spacing="1.6">TWO CASES · ONE TRIP · TWO PEOPLE</text>`;
    /* the pieces, somewhere between standing and packed */
    let away = 0, kg = 0;
    PIECES.forEach((p, i) => {
      const span = 0.55, start = (i / (PIECES.length - 1)) * (1 - span);
      const t = Math.max(0, Math.min(1, (packT - start) / span));
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const q = packedPose(p);
      const x = p.sx + (q.x - p.sx) * e;
      const y = p.sy + (q.y - p.sy) * e - Math.sin(e * Math.PI) * 46;
      const rot = p.sr + (q.rot - p.sr) * e;
      const sc = 1 + (q.sc - 1) * e;
      if (t > 0.94) { away++; kg += p.kg; }
      s += `<g transform="translate(${f1(x)},${f1(y)}) rotate(${f1(rot)}) scale(${f1(sc)})" opacity="${(1 - e * 0.25).toFixed(2)}">
        <path d="M0 0L${p.w} 0L${p.w} ${p.h}L0 ${p.h}Z" fill="${P.ink}" opacity=".55" transform="translate(3,5)"/>
        <path d="M0 0${edge(0, 0, p.w, 0, r, 1.4)}L${p.w} ${p.h}${edge(p.w, p.h, 0, p.h, r, 1.4)}Z" fill="${p.fill}"/>
        <path d="M0 0${edge(0, 0, p.w, -1, r, 1.4)}L${p.w} 5L0 6Z" fill="${P.cream}" opacity=".45"/>
      </g>`;
    });
    s += `<text x="150" y="438" fill="${P.cream3}" font-family="Courier Prime, monospace" font-size="15" letter-spacing="1.6">THE SET, STANDING · 17 FLATS</text>`;
    foldEl.innerHTML = `<svg viewBox="0 0 1400 460" aria-hidden="true">${s}</svg>`;
    $("packRead").textContent =
      `${away} of ${PIECES.length} pieces away · ${kg.toFixed(1)} kg of ${TOTAL_KG.toFixed(1)} kg · takes two people 12 minutes`;
  }
  const packScrub = makeScrub($("packScrub"), {
    min: 0, max: 100, value: 0,
    text: (v) => (v === 0 ? "Standing, nothing packed" : v === 100 ? "Packed, both cases shut" : `${v} per cent packed`),
    onInput: (v) => { packT = v / 100; drawFold(); },
  });
  /* ═══════════════════════ 5. FEE ════════════════════════════════════════ */
  const roadEl = $("road");
  let miles = 18;
  function feeFor(m) { return m <= 40 ? 445 : m <= 120 ? 520 : 615; }
  function bandFor(m) {
    return m <= 40 ? "Within 40 miles of Sheffield · regional rate, no travel charged"
      : m <= 120 ? "41 to 120 miles · the standard fee, travel included"
        : "Over 120 miles · the standard fee plus £95 for the overnight";
  }
  function drawRoad() {
    const r = rng(505);
    const W = 1000, y = 66, X0 = 34, XW = W - 68;   /* inset: a label centred on
      the last tick would be sliced off by the svg's own overflow:hidden */
    const at = (m) => X0 + (m / 200) * XW;
    let s = "";
    s += `<path d="M${X0 - 34} ${y - 26}${edge(X0 - 34, y - 26, X0 + XW + 34, y - 26, r, 3)}L${f1(X0 + XW + 34)} ${y + 26}${edge(X0 + XW + 34, y + 26, X0 - 34, y + 26, r, 3)}Z" fill="#2B1D2F"/>`;
    [[0, 40, P.gold], [40, 120, P.teal], [120, 200, P.red]].forEach(([a, b, c]) => {
      s += `<path d="M${f1(at(a))} ${y - 24}L${f1(at(b))} ${y - 24}L${f1(at(b))} ${y + 24}L${f1(at(a))} ${y + 24}Z" fill="${c}" opacity=".3"/>`;
    });
    for (let i = 0; i <= 200; i += 10) {
      const x = at(i), big = i % 40 === 0;
      s += `<path d="M${f1(x)} ${f1(y + 26)}L${f1(x)} ${f1(y + 26 + (big ? 14 : 7))}" stroke="${P.cream3}" stroke-width="${big ? 2 : 1.2}"/>`;
      if (big) s += `<text x="${f1(x)}" y="${f1(y + 60)}" text-anchor="middle" fill="${P.cream3}" font-family="Courier Prime, monospace" font-size="16">${i}</text>`;
    }
    s += `<text x="${f1(at(20))}" y="${f1(y + 84)}" text-anchor="middle" fill="${P.gold}" font-family="Courier Prime, monospace" font-size="15" letter-spacing="1.4">REGIONAL</text>`;
    s += `<text x="${f1(at(80))}" y="${f1(y + 84)}" text-anchor="middle" fill="${P.teal}" font-family="Courier Prime, monospace" font-size="15" letter-spacing="1.4">STANDARD</text>`;
    s += `<text x="${f1(at(160))}" y="${f1(y + 84)}" text-anchor="middle" fill="${P.red}" font-family="Courier Prime, monospace" font-size="15" letter-spacing="1.4">PLUS OVERNIGHT</text>`;
    s += `<path d="M${X0 - 26} ${y}L${f1(X0 + XW + 26)} ${y}" stroke="${P.cream}" stroke-width="3" stroke-dasharray="26 22" opacity=".4"/>`;
    /* the van, at the distance you dragged it to */
    const vx = at(miles);
    s += `<g transform="translate(${f1(vx - 46)},${f1(y - 54)})">
      <path d="M0 30h64l16 20h14v20H0z" fill="${P.redD}"/>
      <path d="M0 26h64l16 20h12v4H0z" fill="${P.red}"/>
      <circle cx="20" cy="70" r="9" fill="${P.ink}"/><circle cx="76" cy="70" r="9" fill="${P.ink}"/>
      <rect x="66" y="34" width="16" height="11" fill="${P.goldL}" opacity=".85"/>
      <path d="M6 34h44v14H6z" fill="${P.cream2}" opacity=".7"/></g>`;
    roadEl.innerHTML = `<svg viewBox="0 0 ${W} 164" aria-hidden="true">${s}</svg>`;
    const fee = "£" + feeFor(miles);
    $("huge").textContent = fee;
    $("huge").dataset.v = fee;
    $("band").textContent = bandFor(miles);
  }
  const mileScrub = makeScrub($("mileScrub"), {
    min: 0, max: 200, value: 18,
    text: (v) => `${v} miles, £${feeFor(v)}`,
    onInput: (v) => { miles = v; drawRoad(); },
  });
  /* ═══════════════════════ layout + loop ═════════════════════════════════ */
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = houseEl.clientWidth, h = houseEl.clientHeight;
    dust.width = Math.max(1, Math.round(w * dpr));
    dust.height = Math.max(1, Math.round(h * dpr));
    seedDust(w, h);
    paint();
    monthScrub.place(); packScrub.place(); mileScrub.place();
  }
  let rt = 0;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(resize, 130); });
  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const t = now / 1000;
    if (reduce.matches) { rX = tRX; rY = tRY; }
    else {
      const k = 1 - Math.exp(-dt * 6.5);
      rX += (tRX - rX) * k;
      rY += (tRY - rY) * k;
    }
    /* the flats breathe, very slightly, the way paper standing in a draught does */
    const b = reduce.matches ? 0 : 1;
    rig.style.transform =
      `rotateX(${(rX + Math.sin(t * 0.29) * 0.28 * b).toFixed(3)}deg) ` +
      `rotateY(${(rY + Math.sin(t * 0.21 + 1.4) * 0.42 * b).toFixed(3)}deg) ` +
      `translateZ(${(Math.sin(t * 0.17) * 5 * b).toFixed(2)}px)`;
    drawDust(dt, t);
    requestAnimationFrame(frame);
  }
  /* ═══════════════════════ go ════════════════════════════════════════════ */
  writeBilling(0);
  markStubs(0);
  resize();
  drawPlan();
  drawMap();
  drawFold();
  drawRoad();
  [...monthStops.querySelectorAll("i")].forEach((el, i) => el.classList.toggle("on", i === month - 1));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);
  requestAnimationFrame(frame);
})();
