/* UI motion layer: scroll progress bar, scroll reveal, spotlight hover.
   Progressive enhancement: without JS (or with reduced motion) everything is simply visible. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canObserve = 'IntersectionObserver' in window;

  // Hide reveal targets only when we are sure we can reveal them again
  if (!reduce && canObserve) root.classList.add('reveal-on');

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    /* Scroll progress bar */
    if (!reduce) {
      var bar = document.createElement('div');
      bar.className = 'ui-progress';
      bar.setAttribute('aria-hidden', 'true');
      document.body.appendChild(bar);
      var ticking = false;
      var update = function () {
        var h = root.scrollHeight - root.clientHeight;
        bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, window.scrollY / h) : 0) + ')';
        ticking = false;
      };
      window.addEventListener('scroll', function () {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
      }, { passive: true });
      update();
    }

    /* Scroll reveal */
    var targets = document.querySelectorAll('[data-reveal]');
    if (root.classList.contains('reveal-on') && targets.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
      targets.forEach(function (el, i) {
        // small stagger for siblings in the same group (bento tiles)
        if (el.hasAttribute('data-reveal-step')) el.style.transitionDelay = (i % 6) * 70 + 'ms';
        io.observe(el);
      });
      // safety net: never leave content hidden
      setTimeout(function () { targets.forEach(function (el) { el.classList.add('is-in'); }); }, 4000);
    }

    /* Spotlight hover on bento tiles */
    if (!reduce && window.matchMedia('(hover: hover)').matches) {
      document.querySelectorAll('.bento-tile').forEach(function (t) {
        t.addEventListener('pointermove', function (e) {
          var r = t.getBoundingClientRect();
          t.style.setProperty('--mx', (e.clientX - r.left) + 'px');
          t.style.setProperty('--my', (e.clientY - r.top) + 'px');
        });
      });
    }
  });
})();
