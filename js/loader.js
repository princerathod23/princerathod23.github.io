/**
 * Intro loader: "booting" Prince's systems.
 * A giant count-up while bright-blue liquid rises from the bottom of the screen
 * and the pipeline chips tick off (network → servers → pipeline → deploy → online).
 * When everything is loaded the liquid floods the screen and the whole panel
 * lifts away to reveal the hero.
 * Plain (non-module) script so it starts before the 3D libraries download.
 * main.js reports progress through window.PRLoader.to(n) and calls finish().
 */
(function () {
  var root = document.documentElement;
  var el = document.getElementById('loader');
  if (!el) return;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var t0 = performance.now();
  var MIN = 2400; // ms the intro plays at least
  var STEPS = [
    [0, 'Powering on'],
    [14, 'Checking the network'],
    [34, 'Starting the servers'],
    [54, 'Running the pipeline'],
    [76, 'Deploying to production'],
    [100, 'All systems online'],
  ];

  // The liquid layer is a copy of the content in inverted colours, clipped by the wave.
  var base = el.querySelector('.ld-layer');
  var liquid = document.createElement('div');
  liquid.className = 'ld-liquid';
  liquid.appendChild(base.cloneNode(true));
  el.appendChild(liquid);
  var nums = el.querySelectorAll('[data-ld="num"]');
  var stats = el.querySelectorAll('[data-ld="status"]');
  var chipSets = [].map.call(el.querySelectorAll('.ld-chips'), function (c) { return c.children; });

  var shown = 0; var target = 12; var level = 0; var flooding = false; var finished = null;
  var lastStep = -1; var raf = 0; var last = t0;

  function setText(list, txt) { for (var i = 0; i < list.length; i++) list[i].textContent = txt; }

  function wave(levelPct, t) {
    // Polygon along the liquid surface; levelPct = how far up the screen (0..110).
    var pts = []; var n = 24;
    var amp = flooding ? 1.2 : 2.4;
    for (var i = 0; i <= n; i++) {
      var x = (i / n) * 100;
      var y = 100 - levelPct + Math.sin(i * 0.55 + t * 2.4) * amp + Math.sin(i * 0.23 - t * 1.6) * amp * 0.7;
      pts.push(x.toFixed(2) + '% ' + y.toFixed(2) + '%');
    }
    pts.push('100% 100%', '0% 100%');
    liquid.style.clipPath = 'polygon(' + pts.join(',') + ')';
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min(0.25, (now - last) / 1000); last = now; // real time, so slow devices don't drag it out
    // Creep forward on our own so it never looks stuck, but never pass 90 without main.js.
    if (!flooding && target < 90) target = Math.min(90, target + dt * 6);
    var speed = Math.min(48, Math.max(16, (target - shown) * 2));
    shown = Math.min(target, shown + speed * dt);
    var v = Math.floor(shown);
    setText(nums, (v < 10 ? '0' : '') + v);
    for (var s = STEPS.length - 1; s >= 0; s--) {
      if (v >= STEPS[s][0]) {
        if (s !== lastStep) {
          lastStep = s;
          setText(stats, STEPS[s][1]);
          chipSets.forEach(function (chips) { for (var c = 0; c < chips.length; c++) chips[c].classList.toggle('ok', c < s); });
        }
        break;
      }
    }
    var goal = flooding ? 112 : shown * 0.62;
    level += (goal - level) * Math.min(1, dt * (flooding ? 3.2 : 4));
    wave(level, now / 1000);
    if (finished && v >= 100 && !flooding) {
      flooding = true;
      setTimeout(exit, 750);
    }
  }

  function exit() {
    el.classList.add('lift');
    root.classList.add('ready');
    if (finished) finished.resolve();
    setTimeout(function () { cancelAnimationFrame(raf); el.remove(); }, 1300);
  }

  window.PRLoader = {
    to: function (n) { target = Math.max(target, Math.min(n, 99)); },
    finish: function () {
      if (finished) return finished.promise;
      var res; var p = new Promise(function (r) { res = r; });
      finished = { promise: p, resolve: res };
      if (reduced) { el.remove(); root.classList.add('ready'); res(); return p; }
      var wait = Math.max(0, MIN - (performance.now() - t0));
      setTimeout(function () { target = 100; }, wait);
      return p;
    },
  };

  if (reduced) return;
  raf = requestAnimationFrame(frame);
})();
