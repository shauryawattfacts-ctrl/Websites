/**
 * three-hero.js — optional WebGL layer for two flagship concepts only.
 * Picked by [data-three] on the canvas host:
 *   terrain  — a contour field for the landscape design-build site
 *   gloss    — a clear-coat specular sweep for the collision/paint site
 *
 * Deliberately tiny: one mesh, no loaders, no post-processing, capped DPR,
 * paused when off-screen, and never instantiated on touch/low-power devices or
 * under prefers-reduced-motion. Everything degrades to the SVG artwork behind
 * it, so a WebGL failure changes nothing else on the page.
 */
const SUPPORT = (() => {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
})();

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches && innerWidth > 900;

async function boot(host) {
  if (!SUPPORT || !reduce === false || !fine) return;
  const THREE = await import('three');
  const kind = host.dataset.three || 'gloss';
  const css = getComputedStyle(document.documentElement);
  const col = (n, f) => css.getPropertyValue(n).trim() || f;
  const accent = col('--accent', '#c8102e');
  const paper = col('--paper', '#111418');

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(host.clientWidth, host.clientHeight, false);
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, host.clientWidth / Math.max(1, host.clientHeight), 0.1, 100);
  camera.position.set(0, kind === 'terrain' ? 2.2 : 0.6, kind === 'terrain' ? 4.4 : 3.4);
  camera.lookAt(0, 0, 0);

  let mesh;
  if (kind === 'terrain') {
    const g = new THREE.PlaneGeometry(9, 5.2, 96, 60);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      const h = Math.sin(x * 0.75) * Math.cos(y * 1.1) * 0.42 + Math.sin(x * 1.9 + y * 2.4) * 0.12 + Math.exp(-Math.hypot(x - 1.4, y + 0.5)) * 0.5;
      pos.setZ(i, h);
    }
    g.computeVertexNormals();
    mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: accent, wireframe: true, transparent: true, opacity: 0.5 }));
    mesh.rotation.x = -Math.PI / 2.35;
  } else {
    const g = new THREE.TorusKnotGeometry(0.95, 0.3, 200, 28);
    mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: paper, metalness: 1, roughness: 0.16, envMapIntensity: 1.1 }));
    scene.add(new THREE.HemisphereLight(0xffffff, 0x101010, 1.1));
    const key = new THREE.PointLight(accent, 30, 18); key.position.set(2.4, 2.2, 2.6); scene.add(key);
    const rim = new THREE.PointLight(0xffffff, 14, 16); rim.position.set(-2.6, -1.4, -2); scene.add(rim);
  }
  scene.add(mesh);

  let t = 0, running = true, needsRedraw = true;
  const io = new IntersectionObserver((e) => { running = e[0].isIntersecting; if (running) needsRedraw = true; }, { threshold: 0.01 });
  io.observe(host);
  let mx = 0, my = 0;
  addEventListener('pointermove', (ev) => { mx = (ev.clientX / innerWidth - 0.5); my = (ev.clientY / innerHeight - 0.5); needsRedraw = true; }, { passive: true });
  addEventListener('resize', () => {
    renderer.setSize(host.clientWidth, host.clientHeight, false);
    camera.aspect = host.clientWidth / Math.max(1, host.clientHeight); camera.updateProjectionMatrix(); needsRedraw = true;
  }, { passive: true });

  (function loop() {
    requestAnimationFrame(loop);
    if (!running || !needsRedraw) return;
    t += 0.006;
    if (kind === 'terrain') { mesh.rotation.z = t * 0.35; camera.position.x += (mx * 0.9 - camera.position.x) * 0.04; }
    else { mesh.rotation.x = t * 0.8 + my * 0.6; mesh.rotation.y = t * 1.1 + mx * 0.9; }
    needsRedraw = t % 1 < 0.02; // keep a slow idle shimmer without burning frames
    renderer.render(scene, camera);
  })();
}

document.querySelectorAll('[data-three]').forEach((host) => {
  // Only pay the cost when the element is actually near the viewport.
  new IntersectionObserver((es, o) => es.forEach((e) => { if (e.isIntersecting) { boot(host); o.disconnect(); } }), { rootMargin: '200px' }).observe(host);
});

export default boot;
