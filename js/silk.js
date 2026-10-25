/**
 * Hero background: a slow "liquid silk" surface.
 * A dense plane is displaced in the vertex shader by layered waves; normals are
 * taken by finite differences, then shaded white on the crests and bright blue
 * in the folds, with a soft specular sheen and fine silk ribs.
 * It pauses when the hero is off screen or the tab is hidden, follows the
 * pointer a little, and renders a single still frame for reduced motion.
 */
import * as THREE from 'three';

export function createSilk({ canvas, mobile, reduced }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.25 : 1.75));
  renderer.setClearColor(0xE9F1FA, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200);
  camera.position.set(0, 5.2, 17);
  camera.lookAt(0, -0.6, 0);

  const seg = mobile ? [150, 110] : [260, 170];
  const geo = new THREE.PlaneGeometry(64, 40, seg[0], seg[1]);
  const uniforms = {
    uTime: { value: 0 },
    uPtr: { value: new THREE.Vector2(0, 0) },
    uSky: { value: new THREE.Color('#E9F1FA') },
    uBlue: { value: new THREE.Color('#00ABE4') },
    uDeep: { value: new THREE.Color('#0E8FC8') },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */`
      uniform float uTime; uniform vec2 uPtr;
      varying vec3 vN; varying vec3 vV; varying float vH; varying vec2 vUv; varying float vDist;
      float h(vec2 p) {
        float t = uTime;
        float a = sin(p.x * 0.22 + t * 0.35) * 1.5;
        a += sin(p.x * 0.11 - p.y * 0.30 + t * 0.27) * 2.1;
        a += sin(p.y * 0.55 + p.x * 0.17 - t * 0.45) * 0.55;
        a += sin(length(p - vec2(uPtr.x * 10.0, 4.0 + uPtr.y * 4.0)) * 0.6 - t * 1.1) * 0.18;
        return a * smoothstep(-20.0, 6.0, p.y + 4.0);
      }
      void main() {
        vec2 p = position.xy;
        float e = 0.12;
        float z = h(p);
        vec3 n = normalize(vec3(-(h(p + vec2(e, 0.0)) - h(p - vec2(e, 0.0))) / (2.0 * e),
                                -(h(p + vec2(0.0, e)) - h(p - vec2(0.0, e))) / (2.0 * e), 1.0));
        vec4 mv = modelViewMatrix * vec4(p, z, 1.0);
        vN = normalize(normalMatrix * n);
        vV = normalize(-mv.xyz);
        vH = z; vUv = uv; vDist = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uSky; uniform vec3 uBlue; uniform vec3 uDeep;
      varying vec3 vN; varying vec3 vV; varying float vH; varying vec2 vUv; varying float vDist;
      void main() {
        vec3 N = normalize(vN); vec3 V = normalize(vV);
        vec3 L = normalize(vec3(-0.35, 0.8, 0.55));
        float diff = clamp(dot(N, L), 0.0, 1.0);
        float crest = smoothstep(-2.6, 2.4, vH);
        vec3 base = mix(uDeep, mix(uBlue, vec3(1.0), 0.55), smoothstep(0.0, 0.55, crest));
        base = mix(base, vec3(1.0), smoothstep(0.55, 1.0, crest) * 0.85);
        vec3 col = base * (0.62 + 0.45 * diff);
        float spec = pow(max(dot(reflect(-L, N), V), 0.0), 36.0);
        col += vec3(1.0) * spec * 0.55;
        float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
        col = mix(col, uBlue * 1.05, fres * 0.35);
        // fine silk ribs that follow the folds
        float rib = sin(vUv.x * 260.0 + vH * 4.0);
        col += rib * 0.008 * (1.0 - smoothstep(10.0, 22.0, vDist));
        float fog = smoothstep(16.0, 40.0, vDist);
        col = mix(col, uSky, fog);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2 + 0.18;
  mesh.position.set(0, -3.4, -6);
  scene.add(mesh);

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const hgt = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, hgt, false);
    camera.aspect = w / hgt;
    // On narrow screens pull back so the waves still fill the bottom.
    camera.fov = w < 700 ? 48 : 34;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!reduced && !mobile) {
    window.addEventListener('pointermove', (e) => {
      ptr.tx = e.clientX / window.innerWidth - 0.5;
      ptr.ty = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });
  }

  let raf = 0; let last = 0; let running = false; let visible = true;
  const T0 = 6.0; // start mid-motion so the first frame already has nice folds
  uniforms.uTime.value = T0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    uniforms.uTime.value += dt;
    ptr.x += (ptr.tx - ptr.x) * Math.min(1, dt * 2.5);
    ptr.y += (ptr.ty - ptr.y) * Math.min(1, dt * 2.5);
    uniforms.uPtr.value.set(ptr.x, -ptr.y);
    camera.position.x = ptr.x * 1.4;
    camera.position.y = 5.2 - ptr.y * 0.6;
    camera.lookAt(0, -0.6, 0);
    renderer.render(scene, camera);
  }
  function start() { if (running || reduced || !visible || document.hidden) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  function renderOnce() { renderer.render(scene, camera); }

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); else stop(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });

  renderOnce();
  return { start, stop, renderOnce };
}
