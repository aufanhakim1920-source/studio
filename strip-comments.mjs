// strip-comments.mjs — remove internal design commentary from the PUBLISHED copy only.
//
//   node strip-comments.mjs            (processes work/ in place)
//
// Why: the deployed builds carried ~237 lines of source comments quoting Aufan's own
// private feedback — "was rejected outright with…", "the one Aufan approved", template
// numbers, reference attributions. The gallery repo is public and staying public
// (locked 2026-09-03), and his rule is that people may have the FINAL PRODUCT, not the
// process. Source in the learning folder and the vault keeps every comment; only the
// published copy is stripped, so nothing is lost for future learning.
//
// ⚠️ DELIBERATELY CONSERVATIVE. Most builds hold GLSL inside JS template literals, and a
// naive comment regex mangles shaders (a `//` inside a shader string is GLSL code, not a
// comment). So for .js this removes ONLY the leading banner block — the `/* ... */` that
// starts at byte 0, before any code — which cannot be inside a string by definition.
// Inline comments are left alone. CSS and HTML have no template literals, so their
// comments are removed in full.

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "work";
let files = 0, linesCut = 0, bytesCut = 0;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) { walk(p); continue; }
    if (name === "index.html" && dir === ROOT) continue;   // the generated gallery page
    if (/\.(js|css|html)$/i.test(name)) strip(p);
  }
}

function strip(p) {
  const src = readFileSync(p, "utf8");
  let out = src;

  if (/\.js$/i.test(p)) {
    // ONLY a banner comment sitting at the very start of the file.
    out = out.replace(/^﻿?\s*\/\*[\s\S]*?\*\/\s*\n/, "");
    // plus whole-line // comments that appear BEFORE the first line of real code
    const lines = out.split("\n");
    let i = 0;
    while (i < lines.length && /^\s*(\/\/.*)?$/.test(lines[i])) i++;
    if (i > 0) out = lines.slice(i).join("\n");
  } else if (/\.css$/i.test(p)) {
    out = out.replace(/\/\*[\s\S]*?\*\//g, "");
  } else if (/\.html$/i.test(p)) {
    out = out.replace(/<!--(?!\[if)[\s\S]*?-->/g, "");
  }

  out = out.replace(/^\s*\n(\s*\n)+/gm, "\n").replace(/^\s+/, "");
  if (out !== src) {
    writeFileSync(p, out);
    files++;
    linesCut += src.split("\n").length - out.split("\n").length;
    bytesCut += src.length - out.length;
  }
}

walk(ROOT);
console.log(`stripped ${files} files — ${linesCut} lines, ${(bytesCut / 1024).toFixed(1)} kB removed`);
