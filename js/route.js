/**
 * The career path: a soft 3D "clay" scene pinned beside the timeline.
 *  - Six pillars rise like a growth chart, one per stop, each with a floating
 *    glossy object (screen, support ring, server stack, code gem, DevOps loop,
 *    paper plane).
 *  - A path winds across the pillar tops; the blue part grows as you scroll
 *    and a light packet travels to the current stop.
 *  - HTML labels sit above each stop.
 * State tweened from outside (GSAP):
 *   tx/ty/tz camera target, zoom (camera distance factor), progress (0..1 of
 *   the path drawn), build (0..1 pillars grown), focus (index of the active stop).
 */
import * as THREE from 'three';

export const STOPS = [
  { year: '2019', name: 'ProEx LLP', shape: 'screen' },
  { year: '2020', name: 'Skycare IT', shape: 'ring' },
  { year: '2022', name: 'Wmart Infocom', shape: 'server' },
  { year: '2023', name: 'NaapBooks · intern', shape: 'gem' },
  { year: '2024', name: 'NaapBooks · now', shape: 'loop' },
  { year: 'AAI', name: 'VizLite · Delhi', shape: 'plane' },
];
// Pillar tops: x, height, z. Heights rise like a growth chart.
const LAYOUT = [
  [-5.2, 0.5, 1.8], [-2.4, 0.95, 3.4], [0.2, 1.4, 1.4], [-1.0, 1.85, -1.6], [2.4, 2.3, -2.2], [5.0, 2.75, 0.2],
];
const BLUE = new THREE.Color('#00ABE4');
const WHITE = new THREE.Color('#FFFFFF');
const TRACK = new THREE.Color('#CFE3F2');

function roundedBox(w, h, d, r = 0.08) {
  const s = new THREE.Shape();
  const x = -w / 2 + r; const y = -h / 2 + r; const W = w - 2 * r; const H = h - 2 * r;
  s.moveTo(x, y - r);
  s.lineTo(x + W, y - r); s.quadraticCurveTo(x + W + r, y - r, x + W + r, y);
  s.lineTo(x + W + r, y + H); s.quadraticCurveTo(x + W + r, y + H + r, x + W, y + H + r);
  s.lineTo(x, y + H + r); s.quadraticCurveTo(x - r, y + H + r, x - r, y + H);
  s.lineTo(x - r, y); s.quadraticCurveTo(x - r, y - r, x, y - r);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, d - 2 * r), bevelEnabled: true, bevelSize: r * 0.9, bevelThickness: r, bevelSegments: 4, curveSegments: 8 });
  g.center();
  return g;
}

function makeShape(kind, mat) {
  const g = new THREE.Group();
  const add = (geo, m = mat) => { const mesh = new THREE.Mesh(geo, m); mesh.castShadow = true; g.add(mesh); return mesh; };
  if (kind === 'screen') {
    add(roundedBox(1.15, 0.75, 0.1, 0.05));
    const st = add(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 16)); st.position.y = -0.5;
    const ft = add(roundedBox(0.5, 0.06, 0.28, 0.03)); ft.position.y = -0.66;
  } else if (kind === 'ring') {
    add(new THREE.TorusGeometry(0.42, 0.15, 24, 64));
  } else if (kind === 'server') {
    [-0.32, 0, 0.32].forEach((y) => { const b = add(roundedBox(0.95, 0.24, 0.7, 0.06)); b.position.y = y; });
  } else if (kind === 'gem') {
    add(new THREE.OctahedronGeometry(0.52, 0));
  } else if (kind === 'loop') {
    add(new THREE.TorusKnotGeometry(0.32, 0.1, 160, 20, 2, 3));
  } else if (kind === 'plane') {
    // Paper plane: two folded triangles.
    const geo = new THREE.BufferGeometry();
    const v = new Float32Array([0, 0, 0.75, -0.6, 0.02, -0.45, 0, -0.12, -0.3, 0, 0, 0.75, 0, -0.12, -0.3, 0.6, 0.02, -0.45]);
    geo.setAttribute('position', new THREE.BufferAttribute(v, 3));
    geo.computeVertexNormals();
    const m = mat.clone(); m.side = THREE.DoubleSide;
    add(geo, m);
    g.userData.planeMat = m;
    g.children[0].rotation.set(-0.35, 0, 0.25);
    g.children[0].scale.setScalar(1.25);
  }
  return g;
}

export function createRoute({ canvas, labelsEl, mobile, reduced }) {
  const box = canvas.parentElement;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);

  /* ---------- Lights ---------- */
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb7dbf2, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 1.7);
  sun.position.set(-5, 12, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 40 });
  sun.shadow.radius = 6;
  sun.shadow.bias = -0.0008;
  scene.add(sun);

  /* ---------- Ground (only catches soft shadows) ---------- */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ color: 0x0b4f80, opacity: 0.13 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  // A faint dotted floor grid for depth.
  const gp = [];
  for (let x = -12; x <= 12; x += 0.8) for (let z = -10; z <= 10; z += 0.8) gp.push(x, 0.002, z);
  const grid = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(gp, 3)),
    new THREE.PointsMaterial({ color: 0x8cc9ea, size: 0.05, transparent: true, opacity: 0.55 }),
  );
  scene.add(grid);

  /* ---------- Stops: pillar + top + floating object ---------- */
  const clay = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0 });
  const stops = STOPS.map((s, i) => {
    const [x, h, z] = LAYOUT[i];
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    scene.add(g);
    const pillarGroup = new THREE.Group();
    g.add(pillarGroup);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, h, 48), clay);
    pillar.position.y = h / 2;
    pillar.castShadow = true; pillar.receiveShadow = true;
    pillarGroup.add(pillar);
    const capMat = new THREE.MeshStandardMaterial({ color: TRACK.clone(), roughness: 0.4 });
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.74, 0.12, 48), capMat);
    cap.position.y = h + 0.06;
    cap.castShadow = true; cap.receiveShadow = true;
    pillarGroup.add(cap);
    const ringMat = new THREE.MeshBasicMaterial({ color: BLUE, transparent: true, opacity: 0, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.82, 0.9, 64), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = h + 0.125;
    pillarGroup.add(ring);

    const objMat = new THREE.MeshPhysicalMaterial({ color: WHITE.clone(), roughness: 0.25, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.2 });
    const obj = makeShape(s.shape, objMat);
    obj.position.y = h + 1.15;
    obj.rotation.y = i * 0.7;
    g.add(obj);

    const el = document.createElement('div');
    el.className = 'route-label';
    el.innerHTML = `<div><b>${s.year}</b><small>${s.name}</small></div>`;
    labelsEl.appendChild(el);

    return { ...s, g, pillarGroup, obj, objMat, capMat, ringMat, h, el, top: new THREE.Vector3(x, h + 0.14, z), hot: 0, phase: i * 1.3 };
  });

  /* ---------- The path ---------- */
  const pts = stops.map((s) => s.top.clone());
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const SEG = 400; const RAD = 10;
  const track = new THREE.Mesh(new THREE.TubeGeometry(curve, SEG, 0.07, RAD, false), new THREE.MeshStandardMaterial({ color: TRACK, roughness: 0.5 }));
  track.castShadow = true;
  scene.add(track);
  const liveGeo = new THREE.TubeGeometry(curve, SEG, 0.095, RAD, false);
  const live = new THREE.Mesh(liveGeo, new THREE.MeshStandardMaterial({ color: BLUE, roughness: 0.3, emissive: BLUE, emissiveIntensity: 0.25 }));
  live.castShadow = true;
  liveGeo.setDrawRange(0, 0);
  scene.add(live);
  // Arc-length position of every stop along the path (TubeGeometry is arc-length based).
  const DIV = 2000;
  const lengths = curve.getLengths(DIV);
  const total = lengths[DIV];
  stops.forEach((s, i) => { s.u = lengths[Math.round((i / (stops.length - 1)) * DIV)] / total; });

  const packet = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: BLUE, emissiveIntensity: 0.6, roughness: 0.2 }));
  packet.castShadow = true;
  scene.add(packet);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 16), new THREE.MeshBasicMaterial({ color: BLUE, transparent: true, opacity: 0.22, depthWrite: false }));
  packet.add(halo);

  /* ---------- Floating confetti cubes for depth ---------- */
  const cubes = [];
  const cubeGeo = roundedBox(0.3, 0.3, 0.3, 0.07);
  for (let i = 0; i < (mobile ? 10 : 18); i++) {
    const m = new THREE.Mesh(cubeGeo, i % 3 === 0 ? new THREE.MeshStandardMaterial({ color: BLUE, roughness: 0.35 }) : clay);
    const a = (i / 18) * Math.PI * 2;
    m.position.set(Math.cos(a) * (8 + (i % 4)), 2.5 + (i % 5) * 0.9, Math.sin(a) * (6 + (i % 3)) - 1);
    m.scale.setScalar(0.6 + (i % 4) * 0.25);
    m.userData.spin = 0.2 + (i % 5) * 0.08;
    m.castShadow = true;
    scene.add(m);
    cubes.push(m);
  }

  /* ---------- State ---------- */
  const center = new THREE.Vector3(0, 1.3, 0.6);
  const state = { tx: center.x, ty: center.y, tz: center.z, zoom: 2.3, progress: 0, build: 0, focus: -1 };
  const OFFSET = new THREE.Vector3(5.2, 5.6, 8.6).normalize().multiplyScalar(8.5);

  /* ---------- Layout ---------- */
  let W = 1; let H = 1;
  function resize() {
    W = box.clientWidth || 1; H = box.clientHeight || 1;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    // Narrow (portrait) frames need a wider lens to keep the whole path.
    camera.fov = W / H < 0.9 ? 38 : 30;
    camera.updateProjectionMatrix();
    if (!running) renderOnce();
  }

  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!mobile && !reduced) {
    box.addEventListener('pointermove', (e) => {
      const r = box.getBoundingClientRect();
      ptr.tx = (e.clientX - r.left) / r.width - 0.5;
      ptr.ty = (e.clientY - r.top) / r.height - 0.5;
    }, { passive: true });
    box.addEventListener('pointerleave', () => { ptr.tx = 0; ptr.ty = 0; });
  }

  /* ---------- Frame ---------- */
  const tmp = new THREE.Vector3();
  const target = new THREE.Vector3();
  let time = 0;
  const ease = (t) => 1 - Math.pow(1 - t, 3);

  function update(dt) {
    time += dt;
    const k = reduced ? 1 : 1 - Math.pow(0.002, dt);
    ptr.x += (ptr.tx - ptr.x) * k; ptr.y += (ptr.ty - ptr.y) * k;

    target.set(state.tx, state.ty, state.tz);
    camera.position.copy(target).addScaledVector(OFFSET, state.zoom);
    camera.position.x += ptr.x * 1.6;
    camera.position.y -= ptr.y * 1.0;
    camera.lookAt(target);

    // Path drawn so far + packet at its tip.
    const p = THREE.MathUtils.clamp(state.progress, 0, 1);
    liveGeo.setDrawRange(0, Math.floor(p * SEG) * RAD * 6);
    curve.getPointAt(Math.max(0.0001, p), packet.position);
    packet.position.y += 0.05;
    packet.visible = state.build > 0.95;
    halo.scale.setScalar(1 + (reduced ? 0.3 : 0.35 * Math.sin(time * 4)));

    stops.forEach((s, i) => {
      // Pillars grow one after another during the intro.
      const b = ease(THREE.MathUtils.clamp(state.build * 1.9 - i * 0.18, 0, 1));
      s.pillarGroup.scale.set(1, Math.max(0.001, b), 1);
      s.obj.scale.setScalar(Math.max(0.001, ease(THREE.MathUtils.clamp(state.build * 1.9 - i * 0.18 - 0.25, 0, 1))));
      s.obj.position.y = s.h * b + 1.15 + (reduced ? 0 : Math.sin(time * 1.2 + s.phase) * 0.12);

      const reached = p >= s.u - 0.002;
      const target2 = state.focus === i ? 1 : 0;
      s.hot += (target2 - s.hot) * (reduced ? 1 : Math.min(1, dt * 5));
      if (!reduced) s.obj.rotation.y += dt * (0.35 + s.hot * 0.9);
      s.objMat.color.copy(WHITE).lerp(BLUE, s.hot);
      if (s.obj.userData.planeMat) s.obj.userData.planeMat.color.copy(s.objMat.color);
      s.capMat.color.copy(TRACK).lerp(BLUE, reached ? 0.55 + s.hot * 0.45 : 0);
      s.ringMat.opacity = s.hot * (reduced ? 0.9 : 0.6 + 0.4 * Math.sin(time * 3));
      s.obj.children.forEach((c) => { c.scale.setScalar(1 + s.hot * 0.12); });

      // Label above the object.
      tmp.set(s.g.position.x, s.h * b + 2.05, s.g.position.z).project(camera);
      const x = (tmp.x * 0.5 + 0.5) * W; const y = (-tmp.y * 0.5 + 0.5) * H;
      s.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      s.el.style.opacity = String(b > 0.9 ? (s.hot > 0.5 || state.focus < 0 ? 1 : 0.75) : 0);
      s.el.classList.toggle('hot', s.hot > 0.5);
      s.el.classList.toggle('reached', reached);
    });

    cubes.forEach((m, i) => {
      if (reduced) return;
      m.rotation.x += dt * m.userData.spin; m.rotation.y += dt * m.userData.spin * 0.7;
      m.position.y += Math.sin(time * 0.8 + i) * dt * 0.15;
    });
  }

  let raf = 0; let last = 0; let running = false; let inView = false;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    update(dt);
    renderer.render(scene, camera);
  }
  function start() { if (running || document.hidden) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  function renderOnce() { update(0); renderer.render(scene, camera); }

  new ResizeObserver(resize).observe(box);
  resize();
  if (!reduced) {
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; if (inView) start(); else stop(); }).observe(box);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (inView) start(); });
  }

  return { state, stops, center, renderOnce, start, stop };
}
