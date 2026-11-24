/* Shared engine for every version of the films sales page.
   - language: data-i18n / data-i18n-html / data-i18n-attr, dictionaries in ./i18n/<lang>.js
   - region:   header switch + first-visit strip, every country, fixed per-market prices
   - films:    a poster button becomes the player in place; nobody leaves the page
   - brief:    validated form that opens the visitor's email app, pre-filled
   The English text is already in the HTML, so the page reads correctly with JavaScript off. */
import { FX, COUNTRIES } from "./regions.js";
import { TZ_COUNTRY } from "./tzmap.js";

const BASE = new URL(".", import.meta.url);
const STUDIO = new URL("../../", BASE); // .../work/ - the films live in work/motion-night/

/* ── languages offered, each named in its own language ─────────────────── */
export const LANGS = {
  en: "English",
  id: "Bahasa Indonesia",
  es: "Español",
  pt: "Português",
  fr: "Français",
  de: "Deutsch",
  ru: "Русский",
  kk: "Қазақ тілі",
  ja: "日本語",
  zh: "简体中文",
};
const COUNTRY_LANG = {
  ID: "id", KZ: "ru", RU: "ru", BY: "ru", KG: "ru", TJ: "ru",
  ES: "es", MX: "es", AR: "es", CO: "es", CL: "es", PE: "es", VE: "es", EC: "es", GT: "es",
  CU: "es", BO: "es", DO: "es", HN: "es", PY: "es", SV: "es", NI: "es", CR: "es", PA: "es", UY: "es", GQ: "es",
  BR: "pt", PT: "pt", AO: "pt", MZ: "pt", CV: "pt", GW: "pt", ST: "pt",
  FR: "fr", MC: "fr", SN: "fr", CI: "fr", CM: "fr", ML: "fr", BF: "fr", NE: "fr", TD: "fr", GN: "fr",
  BJ: "fr", TG: "fr", CF: "fr", CG: "fr", CD: "fr", GA: "fr", DJ: "fr", KM: "fr", MG: "fr", HT: "fr",
  DE: "de", AT: "de", CH: "de", LI: "de", JP: "ja", CN: "zh",
};

/* ── prices ────────────────────────────────────────────────────────────────
   Fixed per market, never live-converted. Four anchors in US$ by World Bank income
   group; a handful of markets researched directly keep their own local numbers. */
const KEYS = ["social", "homepage", "pitch"];
const TIER_USD = { H: [600, 1500, 3000], UM: [400, 900, 1800], LM: [250, 600, 1200], L: [150, 400, 800] };
const FIXED = {
  AU: ["AUD", [600, 1400, 2800]],             // home market, vault pricing research 2026-11-20
  US: ["USD", [600, 1500, 3000]],             // freelance benchmarks, Yum Yum / Shootsta 2026
  ID: ["IDR", [3500000, 8000000, 16000000]],  // Indonesian research, about 55% of AUD
  KZ: ["KZT", [200000, 450000, 900000]],      // Almaty studio from-prices (Remedy)
};
/* two significant digits: 547 -> 550, 1,366 -> 1,400, 2,733 -> 2,700 - clean, and the
   three films keep their 1 : 2.5 : 5 shape instead of jumping between coarse steps */
function nice(x) {
  if (!(x > 0)) return 0;
  const k = Math.pow(10, Math.floor(Math.log10(x)) - 1);
  return Math.round(x / k) * k;
}
export function pricesFor(country) {
  if (FIXED[country]) {
    const [cur, list] = FIXED[country];
    return { currency: cur, amounts: Object.fromEntries(KEYS.map((k, i) => [k, list[i]])) };
  }
  const [cur0, tier] = COUNTRIES[country] || ["USD", "H"];
  const cur = FX[cur0] ? cur0 : "USD";
  const usd = TIER_USD[tier] || TIER_USD.H;
  return { currency: cur, amounts: Object.fromEntries(KEYS.map((k, i) => [k, nice(usd[i] * FX[cur])])) };
}
/* "symbol" keeps A$ / CA$ apart from US$; where a locale has no symbol and would print
   the bare code (KZT 200,000), fall back to the local sign (₸200,000). */
function money(amount, currency, lang) {
  const big = amount >= 1e6;
  const fmt = (display) => new Intl.NumberFormat(lang, {
    style: "currency", currency, currencyDisplay: display,
    notation: big ? "compact" : "standard",
    maximumFractionDigits: big ? 1 : 0, minimumFractionDigits: 0,
  }).format(amount);
  try {
    const s = fmt("symbol");
    return s.includes(currency) ? fmt("narrowSymbol") : s;
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString()}`;
  }
}

/* ── storage that never throws ─────────────────────────────────────────── */
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};

/* ── state ─────────────────────────────────────────────────────────────── */
const state = { lang: "en", country: "AU", dict: null, en: null };
const dicts = {};
async function loadDict(lang) {
  if (dicts[lang]) return dicts[lang];
  try {
    const mod = await import(new URL(`./i18n/${lang}.js`, BASE).href);
    dicts[lang] = mod.default;
  } catch {
    dicts[lang] = null;
  }
  return dicts[lang];
}
function t(key, vars = {}) {
  let s = (state.dict && state.dict[key]) ?? (state.en && state.en[key]) ?? "";
  return s.replace(/\{(\w+)\}/g, (_, v) => (v in vars ? vars[v] : `{${v}}`));
}
function countryName(code, lang = state.lang) {
  try { return new Intl.DisplayNames([lang, "en"], { type: "region" }).of(code) || code; }
  catch { return code; }
}
function vars() {
  const p = pricesFor(state.country);
  const v = { country: countryName(state.country), currency: p.currency };
  for (const k of KEYS) v[k] = money(p.amounts[k], p.currency, state.lang);
  return v;
}

/* ── first guess: URL ?r= / ?l=, then the stored choice, then the browser ─ */
function guess() {
  const q = new URLSearchParams(location.search);
  const qr = (q.get("r") || "").toUpperCase();
  const ql = (q.get("l") || "").toLowerCase();
  const sr = store.get("afs.region");
  const sl = store.get("afs.lang");
  const navs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "en"];
  let country = COUNTRIES[qr] ? qr : COUNTRIES[sr] ? sr : null;
  // Where the visitor IS: the device time zone (no network lookup). Prices follow this.
  if (!country) {
    let tz = "";
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch {}
    const c = TZ_COUNTRY[tz];
    if (c && COUNTRIES[c]) country = c;
  }
  if (!country) {
    for (const n of navs) {
      const m = /-([A-Za-z]{2})\b/.exec(n);
      if (m && COUNTRIES[m[1].toUpperCase()]) { country = m[1].toUpperCase(); break; }
    }
  }
  if (!country) {
    const base = (navs[0] || "en").slice(0, 2).toLowerCase();
    country = { id: "ID", kk: "KZ", ru: "RU", ja: "JP", de: "DE", fr: "FR", es: "ES", pt: "BR", zh: "CN" }[base] || "AU";
  }
  let lang = LANGS[ql] ? ql : LANGS[sl] ? sl : null;
  // The local language wins when the visitor reads it at all (it is anywhere in their browser languages),
  // otherwise the language their browser asks for first, so nobody lands on text they cannot read.
  const local = COUNTRY_LANG[country];
  if (!lang && local && LANGS[local] && navs.some((n) => n.slice(0, 2).toLowerCase() === local)) lang = local;
  if (!lang) {
    for (const n of navs) {
      const b = n.slice(0, 2).toLowerCase();
      if (LANGS[b]) { lang = b; break; }
    }
  }
  if (!lang) lang = COUNTRY_LANG[country] || "en";
  return { country, lang, chosen: Boolean(qr || sr) };
}

/* ── apply text, prices and attributes to the page ─────────────────────── */
function apply() {
  const v = vars();
  document.documentElement.lang = state.lang;
  // A key missing from every dictionary returns "" - keep the HTML's own English then, never blank the text.
  document.querySelectorAll("[data-i18n]").forEach((el) => { const s = t(el.dataset.i18n, v); if (s) el.textContent = s; });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => { const s = t(el.dataset.i18nHtml, v); if (s) el.innerHTML = s; });
  document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
    el.dataset.i18nAttr.split(";").forEach((pair) => {
      const [attr, key] = pair.split(":").map((s) => s.trim());
      const s = attr && key ? t(key, v) : "";
      if (s) el.setAttribute(attr, s);
    });
  });
  document.querySelectorAll("[data-price]").forEach((el) => {
    el.textContent = t("price.from", { price: v[el.dataset.price] });
  });
  document.querySelectorAll("[data-amount]").forEach((el) => { el.textContent = v[el.dataset.amount]; });
  const title = t("meta.title", v);
  if (title) document.title = title;
  const md = document.querySelector('meta[name="description"]');
  if (md) md.setAttribute("content", t("meta.desc", v));
  renderSwitch();
  renderStrip();
}

async function setLang(lang) {
  if (!LANGS[lang]) lang = "en";
  state.lang = lang;
  state.dict = lang === "en" ? state.en : (await loadDict(lang)) || state.en;
  store.set("afs.lang", lang);
  apply();
}
function setCountry(code) {
  if (!COUNTRIES[code]) return;
  state.country = code;
  store.set("afs.region", code);
  store.set("afs.stripSeen", "1");
  apply();
}

/* ── the region switch (header) ────────────────────────────────────────── */
const GLOBE = '<svg class="rs-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3 12h18M12 3c2.6 2.8 3.9 5.8 3.9 9s-1.3 6.2-3.9 9c-2.6-2.8-3.9-5.8-3.9-9S9.4 5.8 12 3z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
let panelOpen = false;
function renderSwitch() {
  document.querySelectorAll("[data-region-switch]").forEach((mount) => {
    if (!mount.querySelector(".rs-btn")) {
      mount.classList.add("rs");
      mount.innerHTML =
        `<button type="button" class="rs-btn" aria-expanded="false" aria-haspopup="dialog">${GLOBE}<span class="rs-cur"></span></button>` +
        `<div class="rs-panel" role="dialog" hidden>` +
        `<p class="rs-title"></p>` +
        `<label class="rs-lab"><span class="rs-lab-t"></span><select class="rs-lang"></select></label>` +
        `<input class="rs-search" type="search" autocomplete="off" spellcheck="false">` +
        `<ul class="rs-list" role="listbox"></ul>` +
        `<p class="rs-note"></p>` +
        `</div>`;
      const btn = mount.querySelector(".rs-btn");
      const panel = mount.querySelector(".rs-panel");
      const search = mount.querySelector(".rs-search");
      const sel = mount.querySelector(".rs-lang");
      btn.addEventListener("click", () => togglePanel(mount, !panelOpen));
      search.addEventListener("input", () => fillList(mount));
      search.addEventListener("keydown", (e) => {
        if (e.key === "ArrowDown") { e.preventDefault(); mount.querySelector(".rs-opt")?.focus(); }
      });
      sel.addEventListener("change", () => setLang(sel.value));
      panel.addEventListener("keydown", (e) => {
        if (e.key === "Escape") { togglePanel(mount, false); btn.focus(); }
        if ((e.key === "ArrowDown" || e.key === "ArrowUp") && e.target.classList.contains("rs-opt")) {
          e.preventDefault();
          const sib = e.key === "ArrowDown" ? e.target.parentElement.nextElementSibling : e.target.parentElement.previousElementSibling;
          (sib ? sib.querySelector(".rs-opt") : e.key === "ArrowUp" ? search : null)?.focus();
        }
      });
      document.addEventListener("click", (e) => { if (panelOpen && !mount.contains(e.target)) togglePanel(mount, false); });
    }
    const p = pricesFor(state.country);
    mount.querySelector(".rs-cur").textContent = `${countryName(state.country)} · ${p.currency}`;
    mount.querySelector(".rs-btn").setAttribute("aria-label", `${t("region.button")}: ${countryName(state.country)}, ${LANGS[state.lang]}`);
    mount.querySelector(".rs-panel").setAttribute("aria-label", t("region.button"));
    mount.querySelector(".rs-title").textContent = t("region.title");
    mount.querySelector(".rs-lab-t").textContent = t("region.language");
    const sel = mount.querySelector(".rs-lang");
    sel.innerHTML = Object.entries(LANGS).map(([k, n]) => `<option value="${k}" lang="${k}"${k === state.lang ? " selected" : ""}>${n}</option>`).join("");
    const search = mount.querySelector(".rs-search");
    search.placeholder = t("region.search");
    search.setAttribute("aria-label", t("region.search"));
    mount.querySelector(".rs-note").textContent = t("region.note");
    if (panelOpen) fillList(mount);
  });
}
function fillList(mount) {
  const q = mount.querySelector(".rs-search").value.trim().toLowerCase();
  const list = mount.querySelector(".rs-list");
  const rows = Object.keys(COUNTRIES)
    .map((c) => ({ c, n: countryName(c), e: countryName(c, "en") }))
    .filter((r) => !q || r.n.toLowerCase().includes(q) || r.e.toLowerCase().includes(q) || r.c.toLowerCase() === q)
    .sort((a, b) => a.n.localeCompare(b.n, state.lang));
  list.innerHTML = rows.length
    ? rows.map((r) => {
        const cur = pricesFor(r.c).currency;
        const on = r.c === state.country;
        return `<li><button type="button" class="rs-opt" role="option" aria-selected="${on}" data-c="${r.c}"><span>${r.n}</span><span class="rs-opt-cur">${cur}</span></button></li>`;
      }).join("")
    : `<li class="rs-empty">${t("region.none")}</li>`;
  list.querySelectorAll(".rs-opt").forEach((b) => b.addEventListener("click", () => {
    setCountry(b.dataset.c);
    togglePanel(mount, false);
    mount.querySelector(".rs-btn").focus();
  }));
}
function togglePanel(mount, open) {
  panelOpen = open;
  const panel = mount.querySelector(".rs-panel");
  const btn = mount.querySelector(".rs-btn");
  panel.hidden = !open;
  btn.setAttribute("aria-expanded", String(open));
  if (open) {
    const s = mount.querySelector(".rs-search");
    s.value = "";
    fillList(mount);
    s.focus();
    mount.querySelector('.rs-opt[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }
}

/* ── the first-visit strip: a suggestion, never a gate ─────────────────── */
let stripVisible = false;
function renderStrip() {
  document.querySelectorAll("[data-region-strip]").forEach((mount) => {
    if (!stripVisible) { mount.hidden = true; return; }
    mount.hidden = false;
    mount.classList.add("rs-strip");
    const v = vars();
    mount.innerHTML =
      `<p>${t("region.strip", v)}</p>` +
      `<button type="button" class="rs-strip-change">${t("region.change")}</button>` +
      `<button type="button" class="rs-strip-x" aria-label="${t("region.dismiss")}">&times;</button>`;
    mount.querySelector(".rs-strip-change").addEventListener("click", () => {
      const sw = document.querySelector("[data-region-switch]");
      if (sw) { sw.scrollIntoView({ block: "nearest" }); togglePanel(sw, true); }
    });
    mount.querySelector(".rs-strip-x").addEventListener("click", () => {
      stripVisible = false;
      store.set("afs.stripSeen", "1");
      renderStrip();
    });
  });
}

/* ── films play in place ───────────────────────────────────────────────── */
export const FILMS = {
  merlo:    { name: "Merlo — company profile", yt: "cSjudSHKC2M", ratio: "16 / 9" },
  diamond:  { name: "DIAMOND", yt: "OkOwdaD-tCc", ratio: "9 / 16" },
  sevens:   { name: "SEVENS", src: "motion-night/sevens.mp4", ratio: "16 / 9" },
  callflag: { name: "CALLFLAG", src: "films-sales/shared/media/callflag.mp4", ratio: "16 / 9" }, // 14 MB 720p web copy of the 78 MB master
};
export const POSTERS = Object.fromEntries(Object.keys(FILMS).map((k) => [k, new URL(`media/${k}.jpg`, BASE).href]));
function wireFilms() {
  document.querySelectorAll("[data-film]").forEach((el) => {
    const f = FILMS[el.dataset.film];
    if (!f || el.dataset.wired) return;
    el.dataset.wired = "1";
    el.style.aspectRatio = el.style.aspectRatio || f.ratio;
    const img = el.querySelector("img");
    if (img && !img.getAttribute("src")) img.src = POSTERS[el.dataset.film];
    const play = el.querySelector("[data-film-play]") || el;
    play.addEventListener("click", (e) => {
      e.preventDefault();
      let player;
      if (f.yt) {
        player = document.createElement("iframe");
        player.src = `https://www.youtube-nocookie.com/embed/${f.yt}?autoplay=1&rel=0&playsinline=1&modestbranding=1`;
        player.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
        player.allowFullscreen = true;
        player.title = f.name;
      } else {
        player = document.createElement("video");
        player.src = new URL(f.src, STUDIO).href;
        player.controls = true;
        player.autoplay = true;
        player.playsInline = true;
        player.poster = POSTERS[el.dataset.film];
        player.setAttribute("aria-label", f.name);
      }
      player.className = "film-player";
      el.classList.add("is-playing");
      el.replaceChildren(player);
      player.focus?.();
    }, { once: true });
  });
}

/* ── the brief form: validate, then open the visitor's email app ───────── */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function wireForm() {
  const form = document.querySelector("[data-brief]");
  if (!form) return;
  const err = form.querySelector("[data-brief-err]");
  const fail = (key, field) => {
    if (err) { err.textContent = t(key); err.hidden = false; }
    if (field) { field.setAttribute("aria-invalid", "true"); field.focus(); }
  };
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (err) err.hidden = true;
    form.querySelectorAll("[aria-invalid]").forEach((x) => x.removeAttribute("aria-invalid"));
    const d = Object.fromEntries(new FormData(form));
    const el = (n) => form.querySelector(`[name="${n}"]`);
    if (!d.name?.trim()) return fail("form.errName", el("name"));
    if (!EMAIL_RE.test(d.email || "")) return fail("form.errEmail", el("email"));
    if (!d.film) return fail("form.errFilm", el("film"));
    if ((d.brief || "").trim().length < 12) return fail("form.errBrief", el("brief"));
    const opt = el("film").selectedOptions[0]?.textContent || d.film;
    const body = `Name: ${d.name}\nEmail: ${d.email}\nFilm: ${opt}\nRegion: ${countryName(state.country, "en")} (${pricesFor(state.country).currency})\n\n${d.brief}`;
    location.href = `mailto:aufanstudios@gmail.com?subject=${encodeURIComponent(t("form.subject") + " — " + d.name)}&body=${encodeURIComponent(body)}`;
    // A mailto opens nothing on a device with no mail app, so always say what should happen next.
    const sent = form.querySelector("[data-brief-sent]");
    if (sent) { sent.hidden = false; sent.focus?.(); }
  });
}

/* ── start ─────────────────────────────────────────────────────────────── */
(async function init() {
  state.en = (await loadDict("en")) || {};
  const g = guess();
  state.country = g.country;
  stripVisible = !g.chosen && !store.get("afs.stripSeen");
  wireFilms();
  wireForm();
  await setLang(g.lang);
  document.documentElement.classList.add("i18n-ready");
})();
