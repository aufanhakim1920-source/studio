(() => {
  "use strict";

  const MAXD = 3270;                 // metres, deepest core in the collection
  const MAXA = 1200000;              // years at the bottom
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const cv = document.createElement("canvas");
  cv.id = "gl";
  cv.setAttribute("aria-hidden", "true");
  // ⚠️ Without this, a vertical drag on a phone is claimed by the page's scroll gesture:
  // the browser fires pointercancel and the core barely moves, so "drag down the core"
  // is a lie on touch. Setting it on the CANVAS ONLY means a drag starting on the empty
  // ice controls depth, while a touch that starts on the text still scrolls the page
  // normally — which is what you want on a long page. Found by the build 89 agent.
  cv.style.touchAction = "none";
  document.body.insertBefore(cv, document.body.firstChild);

  const gl = cv.getContext("webgl", { antialias: false, alpha: false });

  const VS =
    "attribute vec2 p;varying vec2 uv;void main(){uv=p*0.5+0.5;gl_Position=vec4(p,0.0,1.0);}";

  const FS = [
    "precision highp float;",
    "varying vec2 uv;",
    "uniform vec2  u_res;",
    "uniform float u_t;",
    "uniform float u_d;",     // 0..1 depth
    "",
    "float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}",
    "float vnoise(vec2 p){",
    "  vec2 i=floor(p),f=fract(p);",
    "  f=f*f*(3.0-2.0*f);",
    "  float a=hash(i),b=hash(i+vec2(1.0,0.0)),c=hash(i+vec2(0.0,1.0)),d=hash(i+vec2(1.0,1.0));",
    "  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);",
    "}",
    "float fbm(vec2 p){",
    "  float s=0.0,a=0.5;",
    "  for(int i=0;i<5;i++){ s+=a*vnoise(p); p*=2.03; a*=0.5; }",
    "  return s;",
    "}",
    "void main(){",
    "  vec2 st=uv;",
    "  vec2 c=(uv-0.5)*vec2(u_res.x/u_res.y,1.0);",
    "",
    "  // travelling down the core: y is offset by depth",
    "  float y = st.y*1.0 - u_d*7.0;",
    "",
    "  // annual layers. they COMPRESS with depth - that is the physics and the readout.",
    "  float freq = mix(26.0, 190.0, u_d);",
    "  float warp = fbm(vec2(st.x*2.2, y*3.0+u_t*0.02))*0.55;",
    "  float band = sin((y+warp*0.12)*freq);",
    "  float layers = smoothstep(0.15, 0.95, abs(band));",
    "",
    "  // light entering from the top of the core and scattering out with depth",
    "  float col_x = 1.0 - smoothstep(0.10, 0.62, abs(c.x));",
    "  float carry = exp(-u_d*1.5) * col_x;",
    "  float glow  = carry * (0.55 + 0.45*fbm(vec2(st.x*3.0, y*2.0)));",
    "",
    "  // bubbles - they vanish under pressure, so they thin out as you descend",
    "  float bub = vnoise(vec2(st.x*40.0, y*40.0));",
    "  bub = smoothstep(0.86, 0.99, bub) * (1.0-u_d) * col_x;",
    "",
    "  vec3 ICE  = vec3(0.749, 0.914, 0.949);",
    "  vec3 DEEP = vec3(0.024, 0.043, 0.071);",
    "",
    "  vec3 col = DEEP;",
    "  col += ICE * glow * 0.42;",
    "  col += ICE * (1.0-layers) * carry * 0.30;",
    "  col += ICE * bub * 0.55;",
    "  col += ICE * 0.012;",
    "",
    "  // vignette so type stays readable at the edges",
    "  col *= 1.0 - 0.55*smoothstep(0.35, 1.05, length(c));",
    "",
    "  col = vec3(1.0) - exp(-col*1.85);",   // never clamp
    "  float g = (hash(gl_FragCoord.xy)-0.5)*0.022;",
    "  gl_FragColor = vec4(col+g, 1.0);",
    "}"
  ].join("\n");

  function sh(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error("core.js shader:", gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  let prog = null, uRes, uT, uD;
  if (gl) {
    const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
    if (vs && fs) {
      prog = gl.createProgram();
      gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error("core.js link:", gl.getProgramInfoLog(prog)); prog = null;
      }
    }
    if (prog) {
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, "p");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      uRes = gl.getUniformLocation(prog, "u_res");
      uT   = gl.getUniformLocation(prog, "u_t");
      uD   = gl.getUniformLocation(prog, "u_d");
    }
  }

  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(innerWidth * dpr);
    cv.height = Math.round(innerHeight * dpr);
    if (gl) gl.viewport(0, 0, cv.width, cv.height);
  }
  size();
  addEventListener("resize", size);

  let target = 0.06, cur = 0.06, running = false, t0 = performance.now();
  const subs = [];
  const emit = () => {
    const d = Math.round(cur * MAXD);
    const a = Math.round(Math.pow(cur, 1.7) * MAXA);
    for (const f of subs) f(d, a, cur);
  };

  function frame() {
    const now = performance.now();
    const t = (now - t0) / 1000;
    cur += (target - cur) * 0.075;
    if (prog) {
      gl.uniform2f(uRes, cv.width, cv.height);
      gl.uniform1f(uT, t);
      gl.uniform1f(uD, cur);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    emit();
    if (Math.abs(target - cur) > 0.0004) requestAnimationFrame(frame);
    else { cur = target; running = false; if (prog) { gl.uniform1f(uD, cur); gl.drawArrays(gl.TRIANGLES, 0, 3); } emit(); }
  }
  function kick() { if (!running && !document.hidden) { running = true; requestAnimationFrame(frame); } }

  function set(v) { target = Math.max(0, Math.min(1, v)); if (REDUCED) { cur = target; if (prog) { gl.uniform2f(uRes, cv.width, cv.height); gl.uniform1f(uT, 0); gl.uniform1f(uD, cur); gl.drawArrays(gl.TRIANGLES, 0, 3); } emit(); } else kick(); }

  let dragging = false, lastY = 0;
  const onDown = (e) => {
    if (e.target.closest("a,button,summary,input,label,[role=button]")) return;
    // On touch, only a drag that begins on the bare canvas takes over — anywhere else
    // must stay a scroll, or the page becomes unreadable on a phone.
    if (e.pointerType === "touch" && e.target !== cv) return;
    dragging = true; lastY = e.clientY;
    if (cv.setPointerCapture && e.pointerId != null) { try { cv.setPointerCapture(e.pointerId); } catch (_) {} }
  };
  const onMove = (e) => { if (!dragging) return; set(target + (e.clientY - lastY) * -0.0016); lastY = e.clientY; };
  const onUp   = () => { dragging = false; };
  addEventListener("pointerdown", onDown);
  addEventListener("pointermove", onMove);
  addEventListener("pointerup", onUp);
  addEventListener("pointercancel", onUp);
  addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { set(target + 0.05); e.preventDefault(); }
    if (e.key === "ArrowUp")   { set(target - 0.05); e.preventDefault(); }
  });
  addEventListener("visibilitychange", () => { if (!document.hidden) kick(); });

  window.CORE = {
    MAXD, MAXA,
    get depth() { return Math.round(cur * MAXD); },
    get age()   { return Math.round(Math.pow(cur, 1.7) * MAXA); },
    on(cb) { subs.push(cb); cb(this.depth, this.age, cur); },
    set,
    ok: !!prog
  };

  set(0.06);
  if (!REDUCED) kick();
})();
