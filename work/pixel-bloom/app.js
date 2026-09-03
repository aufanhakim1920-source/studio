(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const state = { data: null, filter: "all" };
  /* ---------------- parallax (scoped to the flower layer only) ---------------- */
  function initParallax() {
    if (reduced) return;
    const flowers = $$("#bg-flowers > div");
    if (!flowers.length) return;
    let targetX = 0, targetY = 0, curX = 0, curY = 0, raf = null;
    document.addEventListener("mousemove", (e) => {
      targetX = (window.innerWidth / 2 - e.clientX) / 50;
      targetY = (window.innerHeight / 2 - e.clientY) / 50;
      if (!raf) raf = requestAnimationFrame(step);
    });
    function step() {
      curX += (targetX - curX) * 0.08;
      curY += (targetY - curY) * 0.08;
      flowers.forEach((f, i) => {
        const speed = (i + 1) * 0.5;
        // translate the wrapper; the float keyframes still animate the child svg
        f.style.translate = `${curX * speed}px ${curY * speed}px`;
      });
      raf = Math.abs(targetX - curX) > 0.05 || Math.abs(targetY - curY) > 0.05
        ? requestAnimationFrame(step)
        : null;
    }
  }
  /* ---------------- works ---------------- */
  function renderWorks() {
    const list = $("#works-list");
    if (!list || !state.data) return;
    const items = state.data.projects.filter(
      (p) => state.filter === "all" || p.category === state.filter
    );
    list.innerHTML = items
      .map((p, i) => {
        const no = String(i + 1).padStart(2, "0");
        const live = p.url ? "true" : "false";
        const tags = p.tags.map((t) => `<span class="work-tag">${t}</span>`).join("");
        const inner = `
          <span class="work-no">${no}</span>
          <span>
            <span class="work-name">${p.name}</span>
            <span class="work-desc block">${p.desc}</span>
            <span class="work-tags">${tags}</span>
          </span>
          <span class="work-side">
            <span class="work-year">${p.year}</span>
            <span class="work-status" data-live="${live}">${p.status}${p.url ? " ↗" : ""}</span>
          </span>`;
        return p.url
          ? `<a class="work-row" href="${p.url}" target="_blank" rel="noopener">${inner}</a>`
          : `<div class="work-row">${inner}</div>`;
      })
      .join("");
    $$(".filter-btn").forEach((b) => b.classList.toggle("is-on", b.dataset.filter === state.filter));
  }
  function setFilter(f) {
    state.filter = f;
    renderWorks();
  }
  /* ---------------- track record ---------------- */
  function renderRecord() {
    const tl = $("#timeline");
    if (tl) {
      tl.innerHTML = state.data.timeline
        .map(
          (t) => `
        <li>
          <span class="t-when">${t.when}</span>
          <span>
            <span class="t-role block">${t.role}</span>
            <span class="t-org block">${t.org}</span>
            <span class="t-note block">${t.note}</span>
          </span>
        </li>`
        )
        .join("");
    }
    const aw = $("#awards");
    if (aw) {
      aw.innerHTML = state.data.awards
        .map((a) => `<li><span>${a.text}</span><span class="a-when">${a.when}</span></li>`)
        .join("");
    }
  }
  /* ---------------- toolkit ---------------- */
  function renderToolkit() {
    const sk = $("#skills");
    if (sk) sk.innerHTML = state.data.skills.map((s) => `<span class="tag">${s}</span>`).join("");
    const ce = $("#certs");
    if (ce) {
      ce.innerHTML = state.data.certs
        .map((c) => `<li><span>${c.text}</span><span class="c-when">${c.when}</span></li>`)
        .join("");
    }
  }
  /* ---------------- reveal ---------------- */
  function initReveal() {
    // Only arm the hidden state once we know we can undo it.
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
      { rootMargin: "-6% 0px -6% 0px", threshold: 0.05 }
    );
    $$(".reveal").forEach((el) => obs.observe(el));
  }
  /* ---------------- sticky nav ---------------- */
  function initNav() {
    const nav = $("#site-nav");
    if (!nav) return;
    const onScroll = () => nav.classList.toggle("is-stuck", window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }
  /* ---------------- boot ---------------- */
  async function boot() {
    initParallax();
    initNav();
    const y = $("#year");
    if (y) y.textContent = new Date().getFullYear();
    $("#filter-row")?.addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-btn");
      if (btn) setFilter(btn.dataset.filter);
    });
    $$(".nav-filter").forEach((a) =>
      a.addEventListener("click", () => setFilter(a.dataset.filter))
    );
    try {
      state.data = await fetch("data/content.json").then((r) => r.json());
    } catch (err) {
      console.error("[portfolio] failed to load content:", err);
      return;
    }
    renderWorks();
    renderRecord();
    renderToolkit();
    initReveal();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
