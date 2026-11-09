/* Lazy-loads the short looping clips that replaced the animated GIFs.
   Video only downloads when it is near the viewport, plays while visible,
   and stays on its poster frame for visitors who prefer reduced motion. */
(function () {
  var vids = [].slice.call(document.querySelectorAll("video.anim[data-src]"));
  if (!vids.length) return;
  var reduce =
    window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function load(v) {
    if (v.getAttribute("src")) return;
    v.src = v.getAttribute("data-src");
    v.load();
  }
  function play(v) {
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
  }

  if (!("IntersectionObserver" in window)) {
    vids.forEach(function (v) {
      if (!reduce) { load(v); play(v); }
    });
    return;
  }
  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) {
          if (reduce) return;
          load(v);
          play(v);
        } else if (v.getAttribute("src")) {
          v.pause();
        }
      });
    },
    { rootMargin: "200px 0px" }
  );
  vids.forEach(function (v) {
    io.observe(v);
  });
})();
