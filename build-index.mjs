// Generates work/index.html from index.html so the two lists can never drift.
// Run after editing the root index:  node build-index.mjs
import { readFileSync, writeFileSync } from "node:fs";

let s = readFileSync("index.html", "utf8");

s = s.replace(/href="work\//g, 'href="');                    // paths are relative to /work/
s = s.replace("<title>Aufan Rachmad — Work</title>", "<title>Work — Aufan Rachmad</title>");
s = s.replace(
  '<h1>Aufan Rachmad</h1>',
  '<p class="back"><a href="../">← Aufan Rachmad</a></p>\n  <h1>Work</h1>'
);
s = s.replace(
  '<p class="sub">Hand-built landing pages and interactive UI. No framework, no build step, no template.</p>',
  '<p class="sub">Every build, live. Hand-built HTML, CSS and vanilla JS.</p>'
);
s = s.replace(
  "</style>",
  `.back{margin:0 0 18px}
.back a{display:inline;padding:0;color:var(--sig);font-size:13px;
  font-family:ui-monospace,"SF Mono",Menlo,monospace;letter-spacing:.04em}
.back a:hover{background:none;padding:0;text-decoration:underline}
</style>`
);
writeFileSync("work/index.html", s);
console.log("work/index.html generated from index.html");
