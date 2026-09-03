const BOOKS = [
  { name: "FanNest", spine: "#591414", edge: "#400e0e", ink: "#E7C97C", w: 65, h: 228, row: 0,
    year: "2026", status: "LIVE", url: "https://fannest.store/",
    desc: "A full Shopify anime-merch storefront — theme build, catalogue, pricing rules, and an automated Reels pipeline that sources product media, prices it in USD and posts on a schedule without ever repeating a listing.",
    tags: ["Shopify", "Liquid", "Node", "Meta API", "Automation"] },
  { name: "Week Board", spine: "#1e3a5f", edge: "#13253d", ink: "#cfe0f5", w: 46, h: 207, row: 0,
    year: "2026", status: "LIVE", url: "https://stellular-queijadas-097900.netlify.app",
    desc: "A public departures-board of my real weekly availability, pulled live from Google Calendar, with a booking flow that emails me and blocks the slot the moment I approve it. Killed the back-and-forth entirely.",
    tags: ["Netlify", "Serverless", "Google Calendar", "Composio"] },
  { name: "baka nae.", spine: "#E8E5D8", edge: "#c9c4b4", ink: "#1C1C1C", w: 53, h: 219, row: 0,
    year: "2026", status: "IN BUILD", url: "",
    desc: "Brand site for my sister's anime fanart label — 10.7k Shopee followers, 7.4k five-star reviews. Bilingual ID/EN, live catalogue filtering and sorting, built as a credibility flagship that hands checkout back to Shopee.",
    tags: ["HTML/CSS/JS", "i18n", "Design system"] },
  { name: "Pixel Dungeon Knight", spine: "#2d4a36", edge: "#1b2d21", ink: "#e6d5b8", w: 71, h: 243, row: 0,
    year: "2026", status: "PLAYABLE", url: "",
    desc: "Browser and mobile roguelike built end to end: 18 characters with two skills each, 136 weapons, 15 attachments, 9 pets, 98 enemies, 28 bosses, 17 biomes, plus Boss Rush and hidden vaults.",
    tags: ["JavaScript", "Canvas", "Game design", "Mobile"] },
  { name: "Untitled Game", spine: "#4a2a59", edge: "#2d1938", ink: "#e0d4e8", w: 43, h: 201, row: 0,
    year: "2026", status: "IN BUILD", url: "",
    desc: "Co-op 3D pixel-art adventure in Unity, built with a partner. Where I learned to measure a game instead of feeling it — instrumenting combat cut time-per-kill from 8.0s to 2.2s.",
    tags: ["Unity", "C#", "3D pixel art", "Co-op"] },
  { name: "Hollowborne", spine: "#8c1c28", edge: "#591018", ink: "#f5dfe2", w: 50, h: 216, row: 1,
    year: "2026", status: "IN BUILD", url: "",
    desc: "Browser action-RPG with an original story bible — world, combat and progression written before a line of engine code.",
    tags: ["JavaScript", "Narrative", "Systems"] },
  { name: "AgentSentry", spine: "#333333", edge: "#151515", ink: "#E7F65E", w: 59, h: 225, row: 1,
    year: "2026", status: "PROTOTYPE", url: "",
    desc: "A kill-switch proxy for AI agents. Sits between an agent and the APIs it calls, logs every request, and lets a human cut it off mid-run.",
    tags: ["Next.js", "TypeScript", "Proxy", "Observability"] },
  { name: "FreshTrack", spine: "#1e5c63", edge: "#113538", ink: "#d7f0f2", w: 46, h: 210, row: 1,
    year: "2026", status: "PROTOTYPE", url: "",
    desc: "Mobile food-freshness tracker — point the camera at the fridge and get a shelf-life estimate before anything goes to waste.",
    tags: ["Mobile", "Computer vision", "Product"] },
  { name: "Motion Pipeline", spine: "#d99a2b", edge: "#a8751e", ink: "#2b1d05", w: 56, h: 234, row: 1,
    year: "2026", status: "SHIPPED", url: "",
    desc: "Vertical 9:16 explainer video built in Remotion — code-driven scenes with sound effects timed to the exact frame the animation starts, rather than eyeballed in an editor.",
    tags: ["Remotion", "React", "Video", "Sound design"] },
];
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
/* ---------------- render the shelves ---------------- */
function renderBooks() {
  $$(".books").forEach((rowEl) => {
    const row = Number(rowEl.dataset.row);
    rowEl.innerHTML = BOOKS
      .map((b, i) => (b.row === row ? { b, i } : null))
      .filter(Boolean)
      .map(({ b, i }, n) => {
        // a couple of books lean, so the row doesn't read as a picket fence
        const lean = n === 2 ? "transform-origin:bottom left; transform:rotateZ(-2.5deg);" : "";
        return `
        <button class="book" data-i="${i}" style="width:${b.w}px; height:${b.h}px; ${lean}"
                aria-label="${b.name}">
          <span class="book__spine" style="background:${b.spine}; color:${b.ink}">
            <span class="book__rule"></span>
            <span class="book__title">${b.name.toUpperCase()}</span>
            <span class="book__rule"></span>
          </span>
          <span class="book__pages"></span>
          <span class="book__edge" style="background:${b.edge}"></span>
        </button>`;
      })
      .join("");
  });
}
/* ---------------- detail card ---------------- */
function showDetail(i) {
  const b = BOOKS[i];
  const link = b.url
    ? `<a class="btn" href="${b.url}" target="_blank" rel="noopener">Visit ↗</a>`
    : `<span class="mono">${b.status}</span>`;
  $("#detail").innerHTML = `
    <div>
      <span class="mono">${String(i + 1).padStart(2, "0")} · ${b.year} · ${b.status}</span>
      <h3 class="detail__name">${b.name}</h3>
      <p class="detail__desc">${b.desc}</p>
      <div class="detail__tags">${b.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>
    </div>
    <div class="detail__side">${link}</div>`;
  $$(".book").forEach((el) => el.classList.toggle("is-active", Number(el.dataset.i) === i));
}
/* ---------------- reveal — hidden only once JS can un-hide ---------------- */
function initReveal() {
  if (reduced || !("IntersectionObserver" in window)) return;
  document.documentElement.classList.add("anim-ready");
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          obs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "-4% 0px -4% 0px" }
  );
  $$(".rise").forEach((el) => obs.observe(el));
}
/* ---------------- clock in the status pill ---------------- */
function initClock() {
  const el = $("#clock");
  if (!el) return;
  const tick = () => {
    const t = new Date().toLocaleTimeString("en-AU", {
      timeZone: "Australia/Melbourne", hour: "2-digit", minute: "2-digit", hour12: false,
    });
    el.textContent = `Open to work · ${t} MEL`;
  };
  tick();
  setInterval(tick, 30000);
}
/* ---------------- boot ---------------- */
renderBooks();
showDetail(0);
initReveal();
initClock();
$("#shelf")?.addEventListener("click", (e) => {
  const book = e.target.closest(".book");
  if (book) showDetail(Number(book.dataset.i));
});
