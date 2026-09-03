Live: https://aufanhakim1920-source.github.io/studio/

Studio site at the root, every build under /work/.
Hand-built HTML, CSS and vanilla JS. No framework, no build step.
All work is self-initiated or spec.

## Deploy flow (run in this order)

1. `cp -r "<source build folder>" work/<slug>`
2. add the row to `builds.json`
3. `node shoot-thumbs.mjs <slug>`
4. `node strip-comments.mjs` — removes internal design commentary from the PUBLISHED copy
   only. This repo is public and staying public; the rule is that people may have the final
   product, not the process. Source in the learning folder and in the vault keeps every
   comment. Conservative by design: for `.js` it strips only the banner at the top of the
   file, because GLSL lives inside template literals and a naive comment regex mangles
   shaders. Re-run it after any `cp` — copying restores the comments.
5. `node build-index.mjs`
6. commit as `aufanhakim1920-source` — **never any Claude attribution**

After step 4, sanity-check before pushing: `node --check` every `work/**/*.js`, confirm
brace balance in each `.css`, and confirm each `.html` still ends with `</html>`.
