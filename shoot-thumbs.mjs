// shoot-thumbs.mjs — one real preview image per build, straight from the build.
//
//   node shoot-thumbs.mjs            all builds
//   node shoot-thumbs.mjs land-aurora shelf   only these
//
// Why images and not <iframe>: 41 live iframes, several of them running WebGL or a
// rAF physics loop, will melt a laptop. A JPEG costs 30kB and is lazy-loaded.
//
// Reuses the CDP approach from _tools/shot.mjs, but keeps ONE browser for the whole
// run and clips to the viewport instead of the full page — a gallery card wants the
// hero, not a 6000px strip.
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync, mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";

const ROOT = process.cwd();
const OUT = join(ROOT, "work", "thumbs");
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const W = 1280, H = 800, SCALE = 0.46;      // -> 589x368, plenty for a 300px card
const only = process.argv.slice(2);

const builds = JSON.parse(readFileSync(join(ROOT, "builds.json"), "utf8"))
  .filter((b) => !only.length || only.includes(b.slug));

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2", ".csv": "text/csv" };

/* a static server over work/, so this runs offline and shoots what is on disk */
const srv = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p.endsWith("/")) p += "index.html";
  const f = join(ROOT, "work", p);
  if (!f.startsWith(join(ROOT, "work")) || !existsSync(f)) { res.writeHead(404); return res.end(); }
  const ext = f.slice(f.lastIndexOf("."));
  res.writeHead(200, { "content-type": MIME[ext] || "application/octet-stream" });
  res.end(readFileSync(f));
});
await new Promise((r) => srv.listen(0, "127.0.0.1", r));
const PORT = srv.address().port;

const port = 9600 + Math.floor(Math.random() * 300);
const profile = mkdtempSync(join(tmpdir(), "thumbs-"));
const chrome = spawn(CHROME, [
  "--headless=new", "--hide-scrollbars", "--no-first-run", "--mute-audio",
  /* software GL, so the WebGL builds actually paint instead of coming back blank */
  "--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader",
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  `--window-size=${W},${H}`, "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function page() {
  for (let i = 0; i < 80; i++) {
    try {
      const j = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const p = j.find((t) => t.type === "page");
      if (p) return p;
    } catch {}
    await sleep(250);
  }
  throw new Error("chrome never came up");
}

const target = await page();
/* no ws dependency: use the built-in WebSocket (node 22+) */
const sock = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r, j) => { sock.onopen = r; sock.onerror = j; });

let id = 0;
const waiting = new Map();
sock.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); }
};
const send = (method, params = {}) => new Promise((res) => {
  const i = ++id;
  waiting.set(i, (m) => res(m.result ?? m));
  sock.send(JSON.stringify({ id: i, method, params }));
});

await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride",
  { width: W, height: H, deviceScaleFactor: 1, mobile: false });

mkdirSync(OUT, { recursive: true });
let ok = 0, bad = [];
for (const b of builds) {
  try {
    await send("Page.navigate", { url: `http://127.0.0.1:${PORT}/${b.slug}/` });
    await sleep(2600);                                   // fonts, shaders, first paint
    /* nudge the page: many builds only reveal on scroll, and a card of a blank
       hero is worse than no card at all */
    await send("Runtime.evaluate", { expression: "scrollTo(0,0)" });
    await sleep(600);
    const r = await send("Page.captureScreenshot", {
      format: "jpeg", quality: 74, captureBeyondViewport: false,
      clip: { x: 0, y: 0, width: W, height: H, scale: SCALE },
    });
    if (!r.data) throw new Error("no image data");
    const buf = Buffer.from(r.data, "base64");
    writeFileSync(join(OUT, `${b.slug}.jpg`), buf);
    console.log(`${b.n} ${b.slug.padEnd(20)} ${(buf.length / 1024).toFixed(0)}kB`);
    ok++;
  } catch (e) { bad.push(`${b.slug}: ${e.message}`); }
}

sock.close(); chrome.kill(); srv.close();
console.log(`\n${ok}/${builds.length} shot -> work/thumbs/`);
if (bad.length) { console.log("FAILED:\n" + bad.join("\n")); process.exit(1); }
