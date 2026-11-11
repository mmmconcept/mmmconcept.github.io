// MMM Concept home page interactions. No dependencies.
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  ready(function () {
    initNav();
    initReveal();
    initFilters();
    initCopy();
    initShowcase();
    if (!reduceMotion) {
      initSky();
      initTyped();
      if (finePointer) {
        initTilt();
        initParallax();
      }
    }
  });

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  // Sticky nav state, scroll progress bar and current-section highlight
  function initNav() {
    var nav = document.querySelector('.nav');
    var bar = document.querySelector('.progress');
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav-links a'));
    var sections = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
    var ticking = false;

    function update() {
      ticking = false;
      var y = window.scrollY;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (nav) nav.classList.toggle('is-scrolled', y > 40);
      if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
      var current = -1;
      sections.forEach(function (s, i) {
        if (s && s.getBoundingClientRect().top < window.innerHeight * 0.4) current = i;
      });
      links.forEach(function (a, i) { a.classList.toggle('is-current', i === current); });
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  // Fade/slide elements in as they enter the viewport, staggered per row
  function initReveal() {
    var els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || reduceMotion) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      var batch = entries.filter(function (e) { return e.isIntersecting; });
      batch.forEach(function (e, i) {
        e.target.style.setProperty('--d', (i * 0.08) + 's');
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  // Games / watch faces filter
  function initFilters() {
    var chips = document.querySelectorAll('.chip');
    var cards = document.querySelectorAll('.card');
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var f = chip.getAttribute('data-filter');
        chips.forEach(function (c) {
          var on = c === chip;
          c.classList.toggle('is-active', on);
          c.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        cards.forEach(function (card, i) {
          var show = f === 'all' || card.getAttribute('data-kind') === f;
          card.classList.toggle('is-hidden', !show);
          if (show && !reduceMotion && card.animate) {
            card.animate(
              [{ opacity: 0, transform: 'translateY(16px) scale(.97)' }, { opacity: 1, transform: 'none' }],
              { duration: 450, delay: i * 40, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' }
            );
          }
        });
      });
    });
  }

  // Copy e-mail address to clipboard
  function initCopy() {
    var toast = document.querySelector('.toast');
    var timer;
    document.querySelectorAll('[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var text = btn.getAttribute('data-copy');
        var done = function () { show('Address copied'); };
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text).then(done, function () { show(text); });
        } else {
          show(text);
        }
      });
    });
    function show(msg) {
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.add('is-on');
      clearTimeout(timer);
      timer = setTimeout(function () { toast.classList.remove('is-on'); }, 2200);
    }
  }

  // Watch in the hero cycles through product screens
  function initShowcase() {
    var root = document.querySelector('.showcase');
    if (!root) return;
    var slides = root.querySelectorAll('.watch-screen img');
    var label = root.querySelector('.showcase-label');
    var name = root.querySelector('.showcase-name');
    var dotsBox = root.querySelector('.showcase-dots');
    var dots = [], current = 0, timer = 0, paused = false;

    slides.forEach(function (img, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', img.getAttribute('data-name'));
      b.addEventListener('click', function () { go(i); restart(); });
      dotsBox.appendChild(b);
      dots.push(b);
    });

    function go(i) {
      current = (i + slides.length) % slides.length;
      slides.forEach(function (img, k) { img.classList.toggle('is-on', k === current); });
      dots.forEach(function (d, k) { d.setAttribute('aria-current', k === current ? 'true' : 'false'); });
      var img = slides[current];
      name.textContent = img.getAttribute('data-name');
      label.setAttribute('href', '#' + img.getAttribute('data-target'));
    }
    function restart() {
      clearInterval(timer);
      if (!reduceMotion) timer = setInterval(function () { if (!paused) go(current + 1); }, 3600);
    }

    root.addEventListener('pointerenter', function () { paused = true; });
    root.addEventListener('pointerleave', function () { paused = false; });
    root.querySelector('.watch').addEventListener('click', function () { go(current + 1); restart(); });

    // Jump to the product card: make sure it is not filtered out, then flash it
    label.addEventListener('click', function () {
      var card = document.getElementById(slides[current].getAttribute('data-target'));
      if (!card) return;
      if (card.classList.contains('is-hidden')) {
        var all = document.querySelector('.chip[data-filter="all"]');
        if (all) all.click();
      }
      card.classList.remove('is-flash');
      void card.offsetWidth;
      card.classList.add('is-flash');
    });

    go(0);
    restart();
  }

  // 3D tilt and cursor spotlight on product cards
  function initTilt() {
    document.querySelectorAll('.card').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--ry', ((px - 0.5) * 10).toFixed(2) + 'deg');
        card.style.setProperty('--rx', ((0.5 - py) * 10).toFixed(2) + 'deg');
        card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      });
      card.addEventListener('pointerleave', function () {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  // Emblem follows the cursor slightly
  function initParallax() {
    var el = document.querySelector('[data-parallax]');
    if (!el) return;
    var amount = parseFloat(el.getAttribute('data-parallax')) || 12;
    var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    window.addEventListener('pointermove', function (e) {
      tx = (e.clientX / window.innerWidth - 0.5) * amount;
      ty = (e.clientY / window.innerHeight - 0.5) * amount;
      if (!raf) raf = requestAnimationFrame(step);
    }, { passive: true });
    function step() {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      // `translate` stacks with the reveal transform and the float animation instead of replacing them
      el.style.translate = cx.toFixed(2) + 'px ' + cy.toFixed(2) + 'px';
      raf = (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05) ? requestAnimationFrame(step) : 0;
    }
  }

  // Rotating words in the headline
  function initTyped() {
    var el = document.querySelector('.typed');
    if (!el) return;
    var words = (el.getAttribute('data-words') || '').split('|').filter(Boolean);
    if (words.length < 2) return;
    var w = 0, n = words[0].length, deleting = true;
    setTimeout(tick, 2600);
    function tick() {
      var word = words[w];
      if (deleting) {
        n--;
        el.textContent = word.slice(0, n);
        if (n <= 0) { deleting = false; w = (w + 1) % words.length; }
        setTimeout(tick, 45);
      } else {
        word = words[w];
        n++;
        el.textContent = word.slice(0, n);
        if (n >= word.length) { deleting = true; setTimeout(tick, 2600); }
        else setTimeout(tick, 85);
      }
    }
  }

  // Starfield with constellation lines that gather around the cursor
  function initSky() {
    var canvas = document.querySelector('.hero-sky');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var hero = canvas.parentElement;
    var colors = ['94,234,212', '96,165,250', '139,92,246', '238,240,250'];
    var stars = [], w = 0, h = 0, dpr = 1, running = true, mouse = { x: -9999, y: -9999 };

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = hero.clientWidth; h = hero.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.min(140, Math.round(w * h / 9000));
      stars = [];
      for (var i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.15, vy: (Math.random() - 0.5) * 0.15,
          r: Math.random() * 1.6 + 0.4,
          c: colors[(Math.random() * colors.length) | 0],
          p: Math.random() * Math.PI * 2
        });
      }
    }

    function frame(t) {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      var near = [];
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.x += s.vx; s.y += s.vy;
        if (s.x < 0) s.x += w; else if (s.x > w) s.x -= w;
        if (s.y < 0) s.y += h; else if (s.y > h) s.y -= h;
        var dx = s.x - mouse.x, dy = s.y - mouse.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 160) {
          // gentle push away from the cursor
          s.x += dx / d * 0.6; s.y += dy / d * 0.6;
          near.push(s);
        }
        var a = 0.45 + 0.4 * Math.sin(t / 900 + s.p);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + s.c + ',' + a.toFixed(2) + ')';
        ctx.fill();
      }
      ctx.lineWidth = 0.7;
      for (var j = 0; j < near.length; j++) {
        for (var k = j + 1; k < near.length; k++) {
          var ex = near[j].x - near[k].x, ey = near[j].y - near[k].y, e = Math.sqrt(ex * ex + ey * ey);
          if (e < 110) {
            ctx.strokeStyle = 'rgba(139,92,246,' + (0.5 * (1 - e / 110)).toFixed(2) + ')';
            ctx.beginPath(); ctx.moveTo(near[j].x, near[j].y); ctx.lineTo(near[k].x, near[k].y); ctx.stroke();
          }
        }
      }
      requestAnimationFrame(frame);
    }

    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    hero.addEventListener('pointerleave', function () { mouse.x = mouse.y = -9999; });
    window.addEventListener('resize', resize);

    // Pause when the hero is off screen
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        var vis = en[0].isIntersecting;
        if (vis && !running) { running = true; requestAnimationFrame(frame); }
        running = vis;
      }).observe(hero);
    }

    resize();
    requestAnimationFrame(frame);
  }
})();
