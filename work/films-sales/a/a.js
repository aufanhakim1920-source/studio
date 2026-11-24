/* Entrance motion only. Elements slide up 24px as they scroll in; nothing is hidden,
   nothing loops, and reduced-motion users get none of it. */
(function () {
  try {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    var els = document.querySelectorAll("[data-rise]");
    var io = new IntersectionObserver(function (list) {
      list.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    document.documentElement.classList.add("rise-on");
    els.forEach(function (el) {
      // anything already on screen settles at once
      if (el.getBoundingClientRect().top < innerHeight) el.classList.add("in"); else io.observe(el);
    });
  } catch (e) {}
})();
