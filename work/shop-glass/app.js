(function () {
  'use strict';
  var MM = 150;                       // world units: 1 unit = 150 mm
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* ── the stock ─────────────────────────────────────────────────────────── */
  var PIECES = [
    {
      id: 'ember',
      name: 'EMBER NO. 4',
      form: 'Blown bulb, drawn neck',
      h: 265, d: 148, g: 1140,
      colour: 'Ember amber', hex: 0xE8720C,
      edition: 'One-off', price: 1480,
      note: 'Gathered in three lifts, so the belly carries more glass than the neck. Hold it to the window and the shoulder goes almost black where the wall doubles.',
      r: [[0,30],[0.08,46],[0.20,66],[0.34,74],[0.50,66],[0.66,44],[0.78,26],[0.88,25],[0.96,30],[1,35]],
      w: [[0,7],[0.2,5.2],[0.5,4.2],[0.78,4.6],[1,6.5]],
      smooth: 6
    },
    {
      id: 'basin',
      name: 'COBALT BASIN',
      form: 'Wide-shouldered bowl',
      h: 118, d: 305, g: 1860,
      colour: 'Deep cobalt', hex: 0x1E4FD8,
      edition: 'One-off', price: 1950,
      note: 'Three hundred millimetres is the widest we can open on our bench without the wall going thin and folding. This one held.',
      r: [[0,44],[0.10,72],[0.28,112],[0.52,138],[0.78,150],[0.94,152],[1,150]],
      w: [[0,10],[0.3,6.2],[0.7,4.8],[1,7.5]],
      smooth: 6
    },
    {
      id: 'tideline',
      name: 'TIDELINE',
      form: 'Tapered cylinder, rolled lip',
      h: 322, d: 96, g: 890,
      colour: 'Sea green', hex: 0x0E9E86,
      edition: 'Edition of 8 — no. 3', price: 780,
      note: 'The only form we repeat. Eight a year, each one a little different in the taper, which is why they are numbered rather than identical.',
      r: [[0,32],[0.06,42],[0.18,44],[0.45,41],[0.70,37],[0.88,33],[0.96,40],[1,48]],
      w: [[0,6],[0.25,3.6],[0.7,3.2],[0.93,4.0],[1,6.5]],
      smooth: 6
    },
    {
      id: 'gourd',
      name: 'DOUBLE GOURD',
      form: 'Waisted double form',
      h: 248, d: 138, g: 1050,
      colour: 'Cranberry rose', hex: 0xD6265E,
      edition: 'One-off', price: 1240,
      note: 'The waist is the hard part — the glass wants to close there. Cranberry is struck with gold, so the colour only appears on the second reheat.',
      r: [[0,26],[0.10,48],[0.22,66],[0.30,69],[0.42,54],[0.55,31],[0.66,44],[0.80,58],[0.90,44],[0.97,28],[1,30]],
      w: [[0,7],[0.3,4.6],[0.55,5.0],[0.8,4.2],[1,5.5]],
      smooth: 6
    },
    {
      id: 'citrine',
      name: 'CITRINE STACK',
      form: 'Stepped beaker',
      h: 176, d: 112, g: 720,
      colour: 'Citrine', hex: 0xC8B215,
      edition: 'Edition of 12 — no. 9', price: 540,
      note: 'Stepped against a wooden former while hot. Each shoulder is a place the wall thickens, which is why the yellow bands.',
      r: [[0,34],[0.02,36],[0.18,36],[0.20,44],[0.42,44],[0.44,50],[0.68,50],[0.70,56],[0.94,56],[0.96,54],[1,54]],
      w: [[0,8],[0.3,5],[0.7,5],[1,6]],
      smooth: 1
    },
    {
      id: 'bell',
      name: 'AMETHYST BELL',
      form: 'Flared bell on a solid stem',
      h: 298, d: 214, g: 2240,
      colour: 'Amethyst', hex: 0x7A3BD0,
      edition: 'One-off', price: 2380,
      note: 'The stem is very nearly solid, so it reads almost black, and the flare is thin enough to go pale at the rim. The whole piece is that one contrast.',
      r: [[0,40],[0.05,42],[0.10,20],[0.16,15],[0.24,17],[0.34,34],[0.50,56],[0.66,76],[0.82,94],[0.94,104],[1,107]],
      w: [[0,9],[0.13,14],[0.3,6],[0.6,4.6],[1,4.0]],
      smooth: 6
    }
  ];
  var STUDIO = {
    lead: '7–10 days',
    commission: '6–8 weeks',
    anneal: '14 hours at 480 °C, then three days cooling in the kiln',
    glass: 'Lead-free soda-lime, hand-blown',
    where: '14 Weston Lane, Brunswick',
    city: 'Naarm / Melbourne VIC 3056',
    hours: 'Hot shop open Saturdays, 10–4'
  };
  /* ── curve sampling: control points -> a smooth blown silhouette ───────── */
  function sample(pts, n, passes) {
    var out = [], i, j, k, t;
    for (i = 0; i < n; i++) {
      t = i / (n - 1);
      for (j = 0; j < pts.length - 1; j++) {
        if (t <= pts[j + 1][0] || j === pts.length - 2) {
          var a = pts[j], b = pts[j + 1];
          var u = (b[0] - a[0]) < 1e-6 ? 0 : (t - a[0]) / (b[0] - a[0]);
          u = Math.max(0, Math.min(1, u));
          out.push(a[1] + (b[1] - a[1]) * u);
          break;
        }
      }
    }
    for (k = 0; k < passes; k++) {
      var cp = out.slice();
      for (i = 1; i < n - 1; i++) out[i] = (cp[i - 1] + 2 * cp[i] + cp[i + 1]) / 4;
    }
    return out;
  }
  /* ── the lathe profile: outside up, across the lip, inside back down ────
     Because the profile doubles back, the wall thickness is REAL geometry,
     and every profile point carries its own thickness into a texture that
     maps 1:1 onto LatheGeometry's v coordinate. That is what makes the
     colour deepen where the glass is thick.                                */
  function buildProfile(p) {
    var N = 72;
    var rs = sample(p.r, N, p.smooth);
    var ws = sample(p.w, N, 4);
    var baseT = ws[0] * 1.7;                       // the pontil pad
    var pts = [], th = [], i, t, y, ir;
    pts.push(new THREE.Vector2(0, 0)); th.push(baseT);
    for (i = 0; i < N; i++) {
      t = i / (N - 1);
      pts.push(new THREE.Vector2(rs[i] / MM, (t * p.h) / MM));
      th.push(ws[i]);
    }
    var floorY = baseT / MM, lastIr = Math.max(0.004, (rs[0] - ws[0]) / MM);
    for (i = N - 1; i >= 0; i--) {
      t = i / (N - 1);
      y = (t * p.h) / MM;
      ir = Math.max(0.004, (rs[i] - ws[i]) / MM);
      if (y <= floorY) { lastIr = ir; break; }
      pts.push(new THREE.Vector2(ir, y)); th.push(ws[i]);
    }
    pts.push(new THREE.Vector2(lastIr, floorY)); th.push(baseT);
    pts.push(new THREE.Vector2(0, floorY));       th.push(baseT);
    var maxT = 0;
    for (i = 0; i < th.length; i++) if (th[i] > maxT) maxT = th[i];
    return { pts: pts, th: th, maxT: maxT, H: p.h / MM };
  }
  /* ── the rail silhouettes: same profile, drawn to TRUE relative scale ─── */
  function silhouette(p, px) {
    var N = 40, rs = sample(p.r, N, p.smooth), i;
    var w = (p.d * px) + 2, h = (p.h * px) + 2, cx = w / 2;
    var L = [], R = [];
    for (i = 0; i < N; i++) {
      var y = h - 1 - (i / (N - 1)) * (p.h * px);
      var r = rs[i] * px;
      L.push((cx - r).toFixed(1) + ',' + y.toFixed(1));
      R.push((cx + r).toFixed(1) + ',' + y.toFixed(1));
    }
    R.reverse();
    return { w: w, h: h, d: 'M' + L.join('L') + 'L' + R.join('L') + 'Z' };
  }
  /* ── environment: a dark hot shop with one window ──────────────────────── */
  function envCanvas() {
    var c = document.createElement('canvas');
    c.width = 1024; c.height = 512;
    var g = c.getContext('2d');
    var v = g.createLinearGradient(0, 0, 0, 512);
    v.addColorStop(0.00, '#241b14');
    v.addColorStop(0.42, '#0d0a08');
    v.addColorStop(0.62, '#080605');
    v.addColorStop(1.00, '#030202');
    g.fillStyle = v; g.fillRect(0, 0, 1024, 512);
    // the window — the one bright thing in the room
    var win = g.createRadialGradient(300, 150, 6, 300, 150, 250);
    win.addColorStop(0.00, '#FFF6E6');
    win.addColorStop(0.22, '#E8C89A');
    win.addColorStop(0.55, '#4a3623');
    win.addColorStop(1.00, 'rgba(0,0,0,0)');
    g.fillStyle = win; g.fillRect(0, 0, 1024, 512);
    // the glory hole, low and warm, opposite
    var fur = g.createRadialGradient(790, 300, 4, 790, 300, 190);
    fur.addColorStop(0.00, '#FFB65E');
    fur.addColorStop(0.30, '#8a4a12');
    fur.addColorStop(1.00, 'rgba(0,0,0,0)');
    g.fillStyle = fur; g.fillRect(0, 0, 1024, 512);
    // a cold strip of daylight, so the glass has two temperatures to catch
    var cold = g.createLinearGradient(0, 60, 0, 210);
    cold.addColorStop(0, 'rgba(150,180,210,0)');
    cold.addColorStop(0.5, 'rgba(150,180,210,.30)');
    cold.addColorStop(1, 'rgba(150,180,210,0)');
    g.fillStyle = cold; g.fillRect(560, 60, 200, 150);
    return c;
  }
  /* ── the caustic thrown on the plinth ──────────────────────────────────── */
  var CAUSTIC_FRAG = [
    'uniform vec3 uColor; uniform float uPhase; uniform float uGain; uniform float uElong;',
    'varying vec2 vUv;',
    'void main(){',
    '  vec2 uv = (vUv - 0.5) * 2.0;',
    '  float r = length(uv);',
    '  float fall = smoothstep(1.0, 0.02, r);',
    '  if (fall <= 0.002) discard;',
    // a caustic web: five plane waves, and the BRIGHT part is the ridge where
    // they cancel. Thin filaments, not a blob — which is what focused light
    // through a curved wall actually makes.
    '  float w = 0.0;',
    '  for (int n = 0; n < 5; n++) {',
    '    float a = uPhase * 0.6 + float(n) * 1.2566;',
    '    vec2 d = vec2(cos(a), sin(a));',
    '    w += sin(dot(uv * 3.4, d) * 2.6 + uPhase * 1.7 + float(n) * 0.9);',
    '  }',
    '  w /= 5.0;',
    '  float ridge = clamp(1.0 - abs(w) * 1.9, 0.0, 1.0);',
    '  float fil = pow(ridge, 3.0);',
    '  float pool = pow(1.0 - clamp(r, 0.0, 1.0), 2.2) * 0.30;',
    '  gl_FragColor = vec4(uColor * (fil * 0.85 + pool) * uGain * fall, 1.0);',
    '}'
  ].join(String.fromCharCode(10));
  var CAUSTIC_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }';
  /* ── state ─────────────────────────────────────────────────────────────── */
  var S = {
    idx: 0,
    view: 'vessels',
    spin: 0, spinTarget: 0,
    turned: [0, 0, 0, 0, 0, 0],
    held: [false, false, false, false, false, false],
    azim: -1.98, elev: 0.55,
    lastInput: 0,
    swap: 1
  };
  var canvas = document.getElementById('stage');
  var lamp   = document.getElementById('lamp');
  var railEl = document.getElementById('rail');
  var readEl = document.getElementById('read');
  var tallyEl = document.getElementById('tally');
  var priceEl = document.getElementById('price');
  /* ── DOM: the rail ─────────────────────────────────────────────────────── */
  var PX = 44 / 322;                                  // px per mm on the rail
  function buildRail() {
    var html = '';
    for (var i = 0; i < PIECES.length; i++) {
      var p = PIECES[i], s = silhouette(p, PX);
      html += '<button type="button" class="piece' + (i === 0 ? ' on' : '') + '" data-i="' + i + '" aria-pressed="' + (i === 0) + '">' +
        '<svg width="' + s.w.toFixed(0) + '" height="' + s.h.toFixed(0) + '" viewBox="0 0 ' + s.w.toFixed(1) + ' ' + s.h.toFixed(1) + '" aria-hidden="true">' +
        '<path d="' + s.d + '" fill="' + hexs(p.hex) + '" fill-opacity="' + (i === 0 ? '0.92' : '0.34') + '" class="sil"/></svg>' +
        '<span class="piece-body">' +
        '<span class="piece-name">' + p.name + '</span>' +
        '<span class="piece-meta">' + p.h + ' mm · A$' + p.price.toLocaleString('en-AU') + '</span>' +
        '</span><span class="piece-held" aria-hidden="true">&#9679;</span></button>';
    }
    railEl.innerHTML = html;
  }
  function hexs(h) { return '#' + ('000000' + h.toString(16)).slice(-6); }
  function paintRail() {
    var btns = railEl.querySelectorAll('.piece');
    for (var i = 0; i < btns.length; i++) {
      var on = i === S.idx;
      btns[i].classList.toggle('on', on);
      btns[i].classList.toggle('held', S.held[i]);
      btns[i].setAttribute('aria-pressed', String(on));
      btns[i].querySelector('.sil').setAttribute('fill-opacity', on ? '0.92' : (S.held[i] ? '0.5' : '0.34'));
    }
  }
  /* ── DOM: the reading column ───────────────────────────────────────────── */
  function row(k, v) {
    return '<div><span class="k">' + k + '</span><span class="v">' + v + '</span></div>';
  }
  function paintRead() {
    var p = PIECES[S.idx], h;
    if (S.view === 'care') {
      h = '<h2>Care &amp; firing</h2>' +
        '<p class="sub">Every piece, the same</p>' +
        '<div class="spec">' +
        row('Glass', STUDIO.glass) +
        row('Annealed', '14 h at 480 °C') +
        row('Cooling', '3 days in the kiln') +
        row('Ready to ship', STUDIO.lead) +
        row('Commission', STUDIO.commission) +
        '</div>' +
        '<p>Hand wash in warm water with a soft cloth. No dishwasher, no direct heat, no freezer — soda-lime glass does not forgive a sudden change of temperature.</p>' +
        '<p>Small bubbles, a faint pontil scar on the base, and a wall that is thicker on one side are evidence of hand-forming. They are not faults, and we do not price them out.</p>';
    } else if (S.view === 'studio') {
      h = '<h2>The hot shop</h2>' +
        '<p class="sub">Two makers, one furnace</p>' +
        '<div class="spec">' +
        row('Address', STUDIO.where) +
        row('', STUDIO.city) +
        row('Open', 'Saturdays 10–4') +
        row('Commissions', STUDIO.commission) +
        '</div>' +
        '<p>The furnace runs at 1,140 °C and is never turned off between October and June, which is why we make in runs and why nothing here is made twice.</p>' +
        '<p>To commission, come on a Saturday with a rough size in mind. We will blow a test the same morning.</p>';
    } else {
      h = '<h2>' + p.name + '</h2>' +
        '<p class="sub">' + p.form + '</p>' +
        '<div class="spec">' +
        row('Height', p.h + ' mm') +
        row('Widest', p.d + ' mm') +
        row('Weight', p.g.toLocaleString('en-AU') + ' g') +
        row('Colour', p.colour + '<span class="swatch" style="background:' + hexs(p.hex) + '"></span>') +
        row('Edition', p.edition) +
        row('Ready to ship', STUDIO.lead) +
        '</div>' +
        '<p>' + p.note + '</p>';
    }
    readEl.innerHTML = '<div class="read-in">' + h + '</div>';
    priceEl.textContent = 'A$' + p.price.toLocaleString('en-AU');
  }
  function paintTally() {
    var n = 0, i;
    for (i = 0; i < 6; i++) if (S.held[i]) n++;
    var deg = Math.min(360, Math.round(S.turned[S.idx] * 180 / Math.PI));
    tallyEl.innerHTML = 'HANDLED ' + n + '/6' +
      (S.held[S.idx] ? ' — ' + PIECES[S.idx].name + ' SEEN RIGHT ROUND'
                     : ' — turned ' + deg + '° of 360°');
  }
  /* ── view + piece switching ────────────────────────────────────────────── */
  function setView(v) {
    S.view = v;
    var a = document.querySelectorAll('.views a');
    for (var i = 0; i < a.length; i++) a[i].classList.toggle('on', a[i].getAttribute('data-view') === v);
    paintRead();
  }
  function setPiece(i) {
    if (i === S.idx) return;
    S.idx = i;
    S.spin = 0; S.spinTarget = 0;
    S.swap = reduced ? 1 : 0;
    buildVessel();
    if (S.view !== 'vessels') S.view = 'vessels';
    setView('vessels');
    paintRail();
    paintTally();
  }
  /* ══ THREE ═════════════════════════════════════════════════════════════ */
  var renderer, scene, camera, spot, fill, vessel, caustic, plinth, windowLight, ready = false;
  var pmremRT = null, ditherTex = null;
  function boot() {
    if (typeof THREE === 'undefined') return false;
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x050403, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    // environment — lights the glass AND is the backdrop it refracts
    var envTex = new THREE.CanvasTexture(envCanvas());
    envTex.mapping = THREE.EquirectangularReflectionMapping;
    envTex.colorSpace = THREE.SRGBColorSpace;
    try {
      var pmrem = new THREE.PMREMGenerator(renderer);
      pmrem.compileEquirectangularShader();
      pmremRT = pmrem.fromEquirectangular(envTex);
      scene.environment = pmremRT.texture;
      scene.background = pmremRT.texture;
      pmrem.dispose();
    } catch (e) {
      scene.environment = envTex;
      scene.background = envTex;
    }
    if ('backgroundIntensity' in scene) scene.backgroundIntensity = 0.075;
    /* 0.72 left the window's own frame legible as a hard-edged dark rectangle
       behind the vessel's neck — it read as an artifact, not as a room. The env
       map still has to LIGHT and be REFRACTED by the glass at full detail; only
       the copy used as the visible backdrop is blurred, so pushing this up costs
       nothing in the refraction and removes the rectangle. */
    if ('backgroundBlurriness' in scene) scene.backgroundBlurriness = 0.96;
    // the bench
    var floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ color: 0x080605, roughness: 0.98, metalness: 0, envMapIntensity: 0.25 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.15;
    floor.receiveShadow = true;
    scene.add(floor);
    // the turntable
    plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(0.94, 1.00, 0.15, 96),
      new THREE.MeshStandardMaterial({ color: 0x140E09, roughness: 0.90, metalness: 0, envMapIntensity: 0.45 })
    );
    plinth.position.y = -0.075;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    scene.add(plinth);
    // the caustic it throws
    caustic = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1, 1, 1),
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(PIECES[0].hex) },
          uPhase: { value: 0 }, uGain: { value: 1 }, uElong: { value: 1.6 }
        },
        vertexShader: CAUSTIC_VERT,
        fragmentShader: CAUSTIC_FRAG,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
      })
    );
    caustic.rotation.order = 'YXZ';
    caustic.rotation.x = -Math.PI / 2;
    caustic.position.y = 0.003;
    caustic.renderOrder = 2;
    scene.add(caustic);
    // THE SHOP WINDOW — a real lit surface standing BEHIND the piece.
    // ⚠️ It must be OPAQUE. three renders only the OPAQUE objects into the
    // transmission buffer that MeshPhysicalMaterial refracts, so a
    // `transparent:true` plane here is invisible to the glass and the vessel
    // renders as dark ceramic. The panes are painted on black instead of on
    // alpha — identical in a dark room, and the glass can finally see them.
    var wc = document.createElement('canvas'); wc.width = 512; wc.height = 512;
    var wg = wc.getContext('2d');
    wg.fillStyle = '#000000'; wg.fillRect(0, 0, 512, 512);
    var panes = [[52, 44, 178, 190], [282, 44, 178, 190], [52, 268, 178, 206], [282, 268, 178, 206]];
    for (var wi = 0; wi < panes.length; wi++) {
      var q = panes[wi];
      var pg = wg.createLinearGradient(q[0], q[1], q[0] + q[2] * 0.5, q[1] + q[3]);
      pg.addColorStop(0.00, '#FFF7EC');
      pg.addColorStop(0.50, '#FBE7CB');
      pg.addColorStop(1.00, '#D9BC98');
      wg.fillStyle = pg;
      wg.fillRect(q[0], q[1], q[2], q[3]);
    }
    // feather to black so it is a light in a dark room, not a poster
    var vg = wg.createRadialGradient(256, 250, 40, 256, 250, 224);
    vg.addColorStop(0.00, 'rgba(0,0,0,0)');
    vg.addColorStop(0.55, 'rgba(0,0,0,.35)');
    vg.addColorStop(1.00, 'rgba(0,0,0,1)');
    wg.fillStyle = vg; wg.fillRect(0, 0, 512, 512);
    wg.fillStyle = '#000000';
    wg.fillRect(0, 0, 512, 26); wg.fillRect(0, 486, 512, 26);
    wg.fillRect(0, 0, 26, 512); wg.fillRect(486, 0, 26, 512);
    var wtex = new THREE.CanvasTexture(wc);
    wtex.colorSpace = THREE.SRGBColorSpace;
    windowLight = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: wtex, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    windowLight.position.set(0, 0.95, -2.15);
    windowLight.scale.set(1.5, 2.2, 1);
    scene.add(windowLight);
    // the light you can pick up
    spot = new THREE.SpotLight(0xFFF0DE, 145, 0, 0.30, 0.42, 2);
    spot.castShadow = true;
    spot.shadow.mapSize.set(2048, 2048);
    spot.shadow.camera.near = 0.6;
    spot.shadow.camera.far = 16;
    spot.shadow.bias = -0.0016;
    spot.shadow.radius = 2.4;
    if ('blurSamples' in spot.shadow) spot.shadow.blurSamples = 16;
    scene.add(spot);
    scene.add(spot.target);
    spot.target.position.set(0, 0.5, 0);
    // just enough fill that the shadow is a shadow, not a hole
    fill = new THREE.HemisphereLight(0x2E2015, 0x060403, 0.16);
    scene.add(fill);
    ditherTex = makeDither();
    buildVessel();
    layout();
    ready = true;
    return true;
  }
  /* a dither alpha map on the SHADOW material only, so glass casts a partial
     shadow instead of the solid black an opaque object would throw */
  function makeDither() {
    var n = 8, c = document.createElement('canvas');
    c.width = n; c.height = n;
    var g = c.getContext('2d'), img = g.createImageData(n, n), i;
    var bayer = [0,32,8,40,2,34,10,42,48,16,56,24,50,18,58,26,12,44,4,36,14,46,6,38,60,28,52,20,62,30,54,22,
                 3,35,11,43,1,33,9,41,51,19,59,27,49,17,57,25,15,47,7,39,13,45,5,37,63,31,55,23,61,29,53,21];
    for (i = 0; i < n * n; i++) {
      var v = (bayer[i] / 64) * 255;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = 255;
      img.data[i * 4 + 3] = v;
    }
    g.putImageData(img, 0, 0);
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.repeat.set(14, 34);
    return t;
  }
  function buildVessel() {
    var p = PIECES[S.idx];
    var prof = buildProfile(p);
    if (vessel) {
      scene.remove(vessel);
      vessel.geometry.dispose();
      if (vessel.material.thicknessMap) vessel.material.thicknessMap.dispose();
      vessel.material.dispose();
      if (vessel.customDepthMaterial) vessel.customDepthMaterial.dispose();
    }
    // thickness -> texture. LatheGeometry's uv.y is j/(points-1), so one row
    // per profile point maps exactly onto the wall it came from.
    var n = prof.pts.length;
    var data = new Uint8Array(n * 4), i;
    for (i = 0; i < n; i++) {
      var g = Math.round(255 * Math.min(1, prof.th[i] / prof.maxT));
      data[i * 4] = 255; data[i * 4 + 1] = g; data[i * 4 + 2] = g; data[i * 4 + 3] = 255;
    }
    var tmap = new THREE.DataTexture(data, 1, n, THREE.RGBAFormat);
    tmap.minFilter = tmap.magFilter = THREE.LinearFilter;
    tmap.wrapS = tmap.wrapT = THREE.ClampToEdgeWrapping;
    tmap.needsUpdate = true;
    var att = new THREE.Color(p.hex);
    att.lerp(new THREE.Color(1, 1, 1), 0.10);        // keep a channel off zero
    var mat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.02,
      metalness: 0,
      transmission: 1,
      ior: 1.52,
      thickness: (prof.maxT / MM) * 12.0,
      thicknessMap: tmap,
      attenuationColor: att,
      attenuationDistance: 0.55,
      clearcoat: 0.4,
      clearcoatRoughness: 0.05,
      specularIntensity: 1,
      envMapIntensity: 1.25,
      side: THREE.FrontSide
    });
    var geo = new THREE.LatheGeometry(prof.pts, 96);
    vessel = new THREE.Mesh(geo, mat);
    vessel.castShadow = true;
    vessel.customDepthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
      alphaMap: ditherTex,
      alphaTest: 0.55
    });
    scene.add(vessel);
    caustic.material.uniforms.uColor.value.setHex(p.hex);
    spot.target.position.set(0, prof.H * 0.45, 0);
    S.H = prof.H;
    S.RMAX = (p.d / 2) / MM;
    if (windowLight) windowLight.scale.set(Math.max(0.95, S.RMAX * 2.3), prof.H * 1.35, 1);
    layout();
  }
  /* ── framing: the vessel is centred in the space the UI leaves it ─────── */
  function layout() {
    if (!renderer) return;
    var W = window.innerWidth, H = window.innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    var top = document.querySelector('.frame-top');
    var bot = document.querySelector('.frame-bottom');
    var phone = W < 860;
    var free0 = top ? top.getBoundingClientRect().height : 70;
    var free1 = H - (bot ? bot.getBoundingClientRect().height : 70);
    if (phone) {
      var rd = readEl.getBoundingClientRect(), rl = railEl.getBoundingClientRect();
      free1 = Math.min(free1, rl.top || free1, rd.top || free1);
    } else {
      free1 -= 6;
    }
    var freeH = Math.max(140, free1 - free0);
    var cy = (free0 + free1) / 2;
    var vH = (S.H || 1.8) + 0.44;                    // world height to cover
    var vW = (S.RMAX || 0.7) * 2 + 0.34;
    var tan = Math.tan((camera.fov * Math.PI / 180) / 2);
    // enlarge the frustum so the vessel fills the FREE band, not the viewport
    var needH = vH * (H / freeH);
    var usableW = phone ? W * 0.94 : (W - 232 - 318 - 60);
    var needW = vW * (W / Math.max(200, usableW));
    var dH = (needH / 2) / tan;
    var dW = (needW / 2) / (tan * camera.aspect);
    var d = Math.max(dH, dW, 2.4);
    var focus = (S.H || 1.8) * 0.47;
    camera.position.set(0, focus + d * 0.11, d);
    camera.lookAt(0, focus, 0);
    var cxFree = phone ? W / 2 : (232 + (W - 318)) / 2;
    camera.clearViewOffset();
    camera.setViewOffset(W, H, Math.round(W / 2 - cxFree), Math.round(H / 2 - cy), W, H);
    camera.updateProjectionMatrix();
  }
  /* ── the light, moved ──────────────────────────────────────────────────── */
  var LAMP_TOP = 0.10, LAMP_BOT = 0.56, LAMP_L = 0.235, LAMP_R = 0.855;
  function lampToScreen() {
    var W = window.innerWidth, H = window.innerHeight;
    var nx = LAMP_L + (S.azim / 5.2 + 0.5) * (LAMP_R - LAMP_L);
    var ny = 1 - (S.elev - 0.14) / 1.06;
    lamp.style.left = (nx * W).toFixed(1) + 'px';
    lamp.style.top = ((LAMP_TOP + ny * (LAMP_BOT - LAMP_TOP)) * H).toFixed(1) + 'px';
    lamp.setAttribute('aria-valuenow', Math.round(nx * 100));
    lamp.setAttribute('aria-valuetext',
      (S.azim < -0.4 ? 'light from the left' : S.azim > 0.4 ? 'light from the right' : 'light from the front') +
      (Math.abs(S.azim) > 1.9 ? ', raking from behind' : '') +
      (S.elev > 0.8 ? ', high' : S.elev < 0.4 ? ', low' : ''));
  }
  function screenToLamp(x, y) {
    var W = window.innerWidth, H = window.innerHeight;
    S.azim = Math.max(-2.6, Math.min(2.6, ((x / W - LAMP_L) / (LAMP_R - LAMP_L) - 0.5) * 5.2));
    var ny = (y / H - LAMP_TOP) / (LAMP_BOT - LAMP_TOP);
    S.elev = Math.max(0.14, Math.min(1.20, 0.14 + (1 - Math.max(0, Math.min(1, ny))) * 1.06));
    lampToScreen();
  }
  function placeLight() {
    var R = 4.4;
    var ce = Math.cos(S.elev);
    spot.position.set(Math.sin(S.azim) * ce * R, Math.sin(S.elev) * R + 0.18, Math.cos(S.azim) * ce * R);
    // the window slides with the lamp, so what you see bent through the glass
    // answers the lamp as well as the turn
    windowLight.position.set(-Math.sin(S.azim) * 0.17, (S.H || 1.7) * 0.50 + Math.sin(S.elev) * 0.22, -2.15);
    // the caustic falls opposite the light, and stretches as the light drops
    var away = Math.atan2(-spot.position.x, -spot.position.z);
    var hc = (S.H || 1.6) * 0.42;
    var reach = Math.max(0.10, Math.min(0.70, hc / Math.tan(Math.max(0.16, S.elev))));
    var elong = Math.max(1.1, Math.min(3.0, 1 / Math.sin(Math.max(0.20, S.elev))));
    var size = Math.max(0.55, (S.RMAX || 0.5) * 2.0);
    caustic.rotation.y = away + Math.PI;
    caustic.position.set(Math.sin(away) * reach, 0.003, Math.cos(away) * reach);
    caustic.scale.set(size, size * elong, 1);
    caustic.material.uniforms.uElong.value = elong;
    caustic.material.uniforms.uPhase.value = S.azim * 1.7 + S.elev * 2.2;
    caustic.material.uniforms.uGain.value =
      (0.80 + 0.85 * Math.sin(Math.max(0.16, S.elev))) * (S.swapE === undefined ? 1 : S.swapE);
  }
  /* ── input ─────────────────────────────────────────────────────────────── */
  var turning = false, lampDrag = false, lastX = 0;
  canvas.addEventListener('pointerdown', function (e) {
    turning = true; lastX = e.clientX;
    canvas.classList.add('turning');
    canvas.setPointerCapture(e.pointerId);
    S.lastInput = performance.now();
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!turning) return;
    var dx = e.clientX - lastX; lastX = e.clientX;
    S.spinTarget += dx * 0.012;
    S.turned[S.idx] += Math.abs(dx * 0.012);
    if (!S.held[S.idx] && S.turned[S.idx] >= Math.PI * 2) { S.held[S.idx] = true; paintRail(); }
    S.lastInput = performance.now();
    paintTally();
  });
  function endTurn(e) {
    if (!turning) return;
    turning = false;
    canvas.classList.remove('turning');
    S.lastInput = performance.now();
    try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
  }
  canvas.addEventListener('pointerup', endTurn);
  canvas.addEventListener('pointercancel', endTurn);
  lamp.addEventListener('pointerdown', function (e) {
    e.stopPropagation(); e.preventDefault();
    lampDrag = true;
    lamp.classList.add('dragging');
    lamp.setPointerCapture(e.pointerId);
    screenToLamp(e.clientX, e.clientY);
  });
  lamp.addEventListener('pointermove', function (e) {
    if (!lampDrag) return;
    e.stopPropagation();
    screenToLamp(e.clientX, e.clientY);
  });
  function endLamp(e) {
    if (!lampDrag) return;
    lampDrag = false;
    lamp.classList.remove('dragging');
    try { lamp.releasePointerCapture(e.pointerId); } catch (err) {}
  }
  lamp.addEventListener('pointerup', endLamp);
  lamp.addEventListener('pointercancel', endLamp);
  lamp.addEventListener('keydown', function (e) {
    var k = e.key, step = 0.16;
    if (k === 'ArrowLeft')  { S.azim = Math.max(-2.6, S.azim - step); }
    else if (k === 'ArrowRight') { S.azim = Math.min(2.6, S.azim + step); }
    else if (k === 'ArrowUp')    { S.elev = Math.min(1.20, S.elev + step * 0.5); }
    else if (k === 'ArrowDown')  { S.elev = Math.max(0.14, S.elev - step * 0.5); }
    else return;
    e.preventDefault();
    lampToScreen();
  });
  railEl.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('.piece') : null;
    if (!b) return;
    setPiece(+b.getAttribute('data-i'));
  });
  var navA = document.querySelectorAll('.views a');
  for (var vi = 0; vi < navA.length; vi++) {
    navA[vi].addEventListener('click', function (e) {
      e.preventDefault();
      setView(this.getAttribute('data-view'));
    });
  }
  document.getElementById('enquire').addEventListener('click', function () {
    setView('studio');
  });
  window.addEventListener('resize', function () { lampToScreen(); layout(); });
  /* ── loop ──────────────────────────────────────────────────────────────── */
  function frame() {
    requestAnimationFrame(frame);
    if (!ready) return;
    // a turntable turns. It stops the moment you take hold of it, and it
    // never counts toward "handled" — only your own turning does.
    if (!reduced && !turning && performance.now() - S.lastInput > 1600) S.spinTarget += 0.0030;
    S.spin += (S.spinTarget - S.spin) * (reduced ? 1 : 0.16);
    if (vessel) vessel.rotation.y = S.spin;
    if (plinth) plinth.rotation.y = S.spin * 0.999;
    if (S.swap < 1) {
      S.swap = Math.min(1, S.swap + 0.09);
      S.swapE = 1 - Math.pow(1 - S.swap, 3);
      if (vessel) { vessel.position.y = (1 - S.swapE) * 0.075; vessel.scale.setScalar(0.955 + S.swapE * 0.045); }
    } else {
      S.swapE = 1;
      if (vessel) { vessel.position.y = 0; vessel.scale.setScalar(1); }
    }
    placeLight();
    renderer.render(scene, camera);
  }
  /* ── go ────────────────────────────────────────────────────────────────── */
  buildRail();
  paintRead();
  paintTally();
  lampToScreen();
  if (boot()) {
    frame();
  } else {
    // three.js did not load. The CSS ground stands in, and every word,
    // every price and every control on this page still works.
    lamp.style.display = 'none';
    document.querySelector('.hint').textContent =
      'The 3D view could not load — the pieces and prices below are unaffected.';
  }
})();
