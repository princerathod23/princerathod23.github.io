/**
 * Entry point: page UI → hero silk + career path (if WebGL works) → loader
 * lifts away → hero intro. Journey steps fly the camera to each stop.
 * The loader itself is js/loader.js (plain script, starts first); we report
 * progress to it through window.PRLoader.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initUI } from './ui.js';

gsap.registerPlugin(ScrollTrigger);

const root = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = window.matchMedia('(max-width: 860px), (pointer: coarse)').matches;
const loader = window.PRLoader || { to() {}, finish: () => Promise.resolve() };

function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/* ---------- Career path choreography ---------- */
function journey(route) {
  const { state, stops, center } = route;
  const steps = [...document.querySelectorAll('.step[data-stop]')];
  const OVERVIEW = { tx: center.x, ty: center.y, tz: center.z, zoom: mobile ? 2.05 : 1.95 };
  const go = (vals, dur = 1.5) => {
    const { focus, ...rest } = vals;
    if (focus !== undefined) state.focus = focus;
    if (reduced) { Object.assign(state, rest); route.renderOnce(); return; }
    gsap.to(state, { ...rest, duration: dur, ease: 'power3.inOut', overwrite: 'auto' });
  };

  if (reduced) {
    Object.assign(state, OVERVIEW, { build: 1, progress: 1 });
    route.renderOnce();
  } else {
    Object.assign(state, { ...OVERVIEW, zoom: OVERVIEW.zoom * 1.25, build: 0, progress: 0 });
    // Pillars grow in as the section arrives, then the camera settles.
    ScrollTrigger.create({
      trigger: '#journey', start: 'top 70%', once: true,
      onEnter: () => {
        gsap.timeline()
          .to(state, { build: 1, duration: 2.2, ease: 'power2.out' }, 0)
          .to(state, { zoom: OVERVIEW.zoom, duration: 2.4, ease: 'expo.out' }, 0);
      },
    });
  }

  steps.forEach((step) => {
    const i = +step.dataset.stop;
    ScrollTrigger.create({
      trigger: step, start: 'top 60%', end: 'bottom 40%',
      onToggle: (self) => {
        step.classList.toggle('active', self.isActive);
        if (!self.isActive) return;
        const s = stops[i];
        go({ tx: s.top.x, ty: s.top.y + 0.6, tz: s.top.z, zoom: mobile ? 1.3 : 1.28, progress: s.u, build: 1, focus: i });
      },
    });
  });
  // Past the last step: pull back to show the whole path, fully drawn.
  ScrollTrigger.create({
    trigger: '.steps', start: 'top 60%', end: 'bottom 40%',
    onLeave: () => go({ ...OVERVIEW, progress: 1, focus: -1 }, 1.8),
    onLeaveBack: () => go({ ...OVERVIEW, focus: -1 }, 1.6),
  });
}

/* ---------- Hero intro ---------- */
function intro() {
  if (reduced) return null;
  const items = gsap.utils.toArray('[data-hero]');
  const lines = gsap.utils.toArray('#hero-title > span');
  gsap.set(items, { autoAlpha: 0, y: 40 });
  gsap.set('.token', { autoAlpha: 0, scale: 0.4 });
  return () => {
    const tl = gsap.timeline();
    tl.to(items, { autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.1 }, 0.15)
      .from(lines, { yPercent: 70, autoAlpha: 0, rotationX: -60, transformPerspective: 800, transformOrigin: '50% 100%', duration: 1.1, ease: 'power4.out', stagger: 0.12 }, 0.2)
      .to('.token', { autoAlpha: 1, scale: 1, duration: 1.1, ease: 'back.out(1.8)', stagger: 0.07 }, 0.5);
  };
}

async function boot() {
  loader.to(35);
  const play = intro();
  initUI({ reduced, mobile, heroDelay: 1300 });
  document.fonts?.ready.then(() => loader.to(55));

  let silk = null;
  if (!hasWebGL()) {
    root.classList.add('no-webgl');
  } else {
    root.classList.add('webgl');
    try {
      const { createSilk } = await import('./silk.js');
      silk = createSilk({ canvas: document.getElementById('silk'), mobile, reduced });
    } catch (err) {
      console.warn('Hero silk failed; showing the flat background.', err);
    }
    loader.to(78);
    // Build the career path only when the visitor gets near it (keeps the first load light).
    const startRoute = async () => {
      try {
        const { createRoute } = await import('./route.js');
        const route = createRoute({ canvas: document.getElementById('route'), labelsEl: document.getElementById('routeLabels'), mobile, reduced });
        journey(route);
        ScrollTrigger.refresh();
      } catch (err) {
        console.warn('Career path failed; showing the 2D version.', err);
        root.classList.add('no-webgl');
      }
    };
    import('./route.js').catch(() => {}); // fetch early, run later
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); startRoute(); } }, { rootMargin: '900px 0px' });
    io.observe(document.getElementById('journey'));
  }
  loader.to(95);
  await loader.finish();
  silk?.start(); // the wave only starts moving once the loader has lifted
  play?.();
  ScrollTrigger.refresh();
}

boot();
