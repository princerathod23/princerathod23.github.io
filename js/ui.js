/**
 * Page UI that works with or without WebGL:
 * segmented nav glider, scroll reveals, count-ups, deployment filter,
 * the 3D skills carousel, copy-email toast, floating-token parallax
 * and magnetic buttons.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const EMAIL = 'rathodprince456@gmail.com';

/* ---------- Segmented nav: glider follows the active section ---------- */
function tabs() {
  const nav = document.querySelector('.tabs');
  const glider = document.getElementById('glider');
  const links = [...document.querySelectorAll('.tabs a[data-sec]')];
  const secs = links.map((a) => document.getElementById(a.dataset.sec));
  let cur = -2;
  const moveTo = (i) => {
    if (!glider) return;
    if (i < 0) { glider.style.opacity = '0'; return; }
    const a = links[i];
    glider.style.width = `${a.offsetWidth}px`;
    glider.style.transform = `translateX(${a.offsetLeft}px)`;
    glider.style.opacity = '1';
  };
  let raf = 0;
  const update = () => {
    raf = 0;
    const y = window.scrollY;
    const mark = y + window.innerHeight * 0.4;
    let i = -1;
    secs.forEach((s, j) => { if (s && s.getBoundingClientRect().top + y <= mark) i = j; });
    const contact = document.getElementById('contact');
    if (contact && contact.getBoundingClientRect().top < window.innerHeight * 0.4) i = -1;
    if (i === cur) return;
    cur = i;
    links.forEach((a, j) => { a.classList.toggle('on', j === i); if (j === i) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    moveTo(i);
  };
  window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
  window.addEventListener('resize', () => { cur = -2; update(); });
  document.fonts?.ready.then(() => { cur = -2; update(); });
  // Hovering a tab previews the glider there.
  if (nav && matchMedia('(hover: hover)').matches) {
    links.forEach((a, j) => a.addEventListener('pointerenter', () => moveTo(j)));
    nav.addEventListener('pointerleave', () => moveTo(cur));
  }
  update();
}

/* ---------- Reveals ---------- */
function reveals(reduced) {
  if (reduced) return;
  const els = gsap.utils.toArray('[data-reveal]');
  gsap.set(els, { autoAlpha: 0, y: 46, scale: 0.97 });
  ScrollTrigger.batch(els, {
    start: 'top 90%', once: true,
    onEnter: (b) => gsap.to(b, { autoAlpha: 1, y: 0, scale: 1, duration: 0.9, ease: 'power3.out', stagger: 0.07, clearProps: 'transform' }),
  });
  gsap.utils.toArray('.step').forEach((el) => {
    gsap.fromTo(el, { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', clearProps: 'transform', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });
  // Deployment cards rise in a wave.
  gsap.set('.dep', { autoAlpha: 0 });
  ScrollTrigger.batch('.dep', {
    start: 'top 90%', once: true,
    onEnter: (b) => gsap.fromTo(b, { autoAlpha: 0, y: 60, rotationX: 14, transformPerspective: 900 }, { autoAlpha: 1, y: 0, rotationX: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, clearProps: 'transform' }),
  });
}

/* ---------- Count-ups ---------- */
const fmt = (v, el) => {
  const dec = +(el.dataset.decimals || 0);
  let s = v.toFixed(dec);
  const pad = +(el.dataset.pad || 0);
  if (pad) s = s.padStart(pad, '0');
  return s;
};
function counters(reduced, heroDelay) {
  const els = [...document.querySelectorAll('[data-count]')];
  els.forEach((el) => { el.textContent = fmt(+el.dataset.count, el) + (el.dataset.suffix || ''); });
  if (reduced) return;
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    const el = e.target; const to = +el.dataset.count; const sfx = el.dataset.suffix || '';
    el.textContent = fmt(0, el) + sfx;
    setTimeout(() => {
      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / 1600);
        const v = to * (1 - Math.pow(1 - p, 4));
        el.textContent = fmt(p === 1 ? to : v, el) + sfx;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, el.closest('.hero') ? heroDelay : 80);
  }), { threshold: 0.6 });
  els.forEach((el) => io.observe(el));
}

/* ---------- Deployment filter ---------- */
function filter(reduced) {
  const bar = document.querySelector('.switch');
  if (!bar) return;
  const btns = [...bar.querySelectorAll('button[data-filter]')];
  const glider = document.getElementById('switchGlider');
  const cards = [...document.querySelectorAll('#deps .dep')];
  let cur = 0;
  const place = () => {
    const b = btns[cur];
    glider.style.width = `${b.offsetWidth}px`;
    glider.style.transform = `translateX(${b.offsetLeft}px)`;
  };
  const choose = (i, focus) => {
    if (i === cur && !focus) return;
    cur = i;
    btns.forEach((b, j) => { b.setAttribute('aria-selected', String(j === i)); b.tabIndex = j === i ? 0 : -1; });
    if (focus) btns[i].focus();
    place();
    const f = btns[i].dataset.filter;
    const show = cards.filter((c) => f === 'all' || c.dataset.cat === f);
    const apply = () => {
      cards.forEach((c) => c.classList.toggle('hide', !show.includes(c)));
      ScrollTrigger.refresh();
      if (!reduced) gsap.fromTo(show, { autoAlpha: 0, y: 30, scale: 0.96 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.55, ease: 'power3.out', stagger: 0.06, clearProps: 'transform' });
      else gsap.set(show, { autoAlpha: 1 });
    };
    const visible = cards.filter((c) => !c.classList.contains('hide'));
    if (reduced) apply();
    else gsap.to(visible, { autoAlpha: 0, y: -14, duration: 0.2, ease: 'power2.in', stagger: 0.02, onComplete: apply });
  };
  btns.forEach((b, i) => {
    b.tabIndex = i === 0 ? 0 : -1;
    b.addEventListener('click', () => choose(i));
    b.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); choose((cur + 1) % btns.length, true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); choose((cur - 1 + btns.length) % btns.length, true); }
    });
  });
  window.addEventListener('resize', place);
  document.fonts?.ready.then(place);
  place();
}

/* ---------- 3D carousel (cover-flow ring) ---------- */
function carousel() {
  const wrap = document.getElementById('carousel');
  const ring = document.getElementById('ring');
  const stage = document.getElementById('stage');
  if (!wrap || !ring) return;
  const panels = [...ring.querySelectorAll('.panel')];
  const dots = [...document.querySelectorAll('#carDots button')];
  const n = panels.length;
  const flat = !CSS.supports('transform-style', 'preserve-3d');
  if (flat) wrap.classList.add('flat');

  let idx = 0; let pos = 0;
  const wrapOff = (o) => { o = ((o % n) + n) % n; return o > n / 2 ? o - n : o; };
  const layout = () => {
    if (flat) return;
    const narrow = stage.clientWidth < 700;
    const X = narrow ? 170 : 300; const Z = narrow ? 160 : 220; const ROT = narrow ? 32 : 38;
    panels.forEach((p, i) => {
      const o = wrapOff(i - pos);
      const a = Math.abs(o);
      p.style.transform = `translateX(${o * X}px) translateZ(${-a * Z}px) rotateY(${-Math.sign(o) * Math.min(a, 1) * ROT}deg)`;
      p.style.opacity = String(a > 2.1 ? 0 : 1 - Math.min(a, 2) * 0.28);
      p.style.zIndex = String(10 - Math.round(a * 2));
    });
  };
  const set = (i, focusDot) => {
    idx = ((i % n) + n) % n;
    pos = idx;
    layout();
    panels.forEach((p, j) => { p.classList.toggle('front', j === idx); p.setAttribute('aria-hidden', String(j !== idx)); });
    dots.forEach((d, j) => { d.setAttribute('aria-selected', String(j === idx)); d.tabIndex = j === idx ? 0 : -1; });
    if (focusDot) dots[idx].focus();
    if (flat) panels[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };
  document.getElementById('carPrev').addEventListener('click', () => set(idx - 1));
  document.getElementById('carNext').addEventListener('click', () => set(idx + 1));
  dots.forEach((d, i) => {
    d.addEventListener('click', () => set(i));
    d.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); set(idx + 1, true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); set(idx - 1, true); }
    });
  });
  // Clicking a side panel brings it to the front.
  panels.forEach((p, i) => p.addEventListener('click', () => { if (Math.abs(moved) < 6 && i !== idx) set(i); }));

  // Drag / swipe to turn the ring.
  let x0 = 0; let dragging = false; let moved = 0;
  if (!flat) {
    stage.addEventListener('pointerdown', (e) => {
      dragging = true; moved = 0; x0 = e.clientX;
    });
    stage.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      moved = e.clientX - x0;
      if (Math.abs(moved) > 6 && !ring.classList.contains('dragging')) {
        ring.classList.add('dragging');
        stage.setPointerCapture(e.pointerId);
      }
      if (ring.classList.contains('dragging')) { pos = idx - moved / (stage.clientWidth < 700 ? 170 : 300); layout(); }
    });
    const end = () => {
      if (!dragging) return;
      dragging = false;
      const wasDrag = ring.classList.contains('dragging');
      ring.classList.remove('dragging');
      if (wasDrag) set(Math.round(pos));
      setTimeout(() => { moved = 0; }, 0);
    };
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);
    window.addEventListener('resize', layout);
  }
  set(0);
}

/* ---------- Copy email ---------- */
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 2200);
}
function copyEmail() {
  const btn = document.getElementById('copyEmail');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      toast(`Copied ${EMAIL}`);
    } catch {
      toast(EMAIL);
    }
  });
}

/* ---------- Floating tokens: pointer + scroll parallax ---------- */
function tokens(reduced, mobile) {
  if (reduced) return;
  const els = [...document.querySelectorAll('.token')];
  const hero = document.getElementById('hero');
  if (!mobile && matchMedia('(hover: hover)').matches) {
    hero.addEventListener('pointermove', (e) => {
      const x = e.clientX / window.innerWidth - 0.5; const y = e.clientY / window.innerHeight - 0.5;
      els.forEach((el) => {
        const d = +el.dataset.depth || 1;
        gsap.to(el, { '--px': `${-x * 40 * d}px`, '--py': `${-y * 30 * d}px`, '--ry': `${-16 + x * 30}deg`, '--rx': `${12 - y * 24}deg`, duration: 1, ease: 'power3.out', overwrite: 'auto' });
      });
    });
  }
  els.forEach((el) => {
    const d = +el.dataset.depth || 1;
    gsap.to(el, { y: -160 * d, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
  });
  // The hero copy drifts and fades as you leave.
  gsap.to('.hero-in', { y: -80, autoAlpha: 0.2, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
}

/* ---------- Magnetic buttons ---------- */
function magnetic(reduced, mobile) {
  if (reduced || mobile || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  document.querySelectorAll('.btn, .top-cta, .car-btn').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.translate = `${(e.clientX - r.left - r.width / 2) * 0.2}px ${(e.clientY - r.top - r.height / 2) * 0.25}px`;
    });
    el.addEventListener('pointerleave', () => { el.style.translate = ''; });
  });
}

export function initUI({ reduced, mobile, heroDelay = 1200 }) {
  gsap.registerPlugin(ScrollTrigger);
  tabs();
  reveals(reduced);
  counters(reduced, heroDelay);
  filter(reduced);
  carousel();
  copyEmail();
  tokens(reduced, mobile);
  magnetic(reduced, mobile);
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}
