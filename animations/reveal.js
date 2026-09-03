/**
 * reveal.js — the default motion engine for every generated site.
 *
 * IntersectionObserver + CSS: no framework needed for entry, stagger,
 * wipe, mask and nav behaviour. Respects prefers-reduced-motion and marks
 * <html> as .js so content is visible with JavaScript disabled.
 */
// Studio review overlay: append ?studio=1 to any page to reveal the
// build-notes (photography plans, asset swaps) that never ship to visitors.
if (/[?&]studio/.test(location.search)) document.documentElement.setAttribute('data-studio', '1');

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function reveal(root = document) {
  const nodes = [...root.querySelectorAll('[data-anim], [data-stagger]')];
  if (!nodes.length) return;
  if (reduce || !('IntersectionObserver' in window)) {
    nodes.forEach((n) => n.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target;
      el.classList.add('in');
      if (el.hasAttribute('data-stagger')) {
        [...el.children].forEach((c, i) => c.style.setProperty('--d', `${Math.min(i * 70, 560)}ms`));
      }
      io.unobserve(el);
    }
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
  nodes.forEach((n) => io.observe(n));
}

function nav() {
  const el = document.getElementById('nav');
  const toggle = el?.querySelector('.nav-toggle');
  const links = el?.querySelector('.nav-links');
  if (!el) return;
  const onScroll = () => el.setAttribute('data-scrolled', String(window.scrollY > 40));
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  toggle?.addEventListener('click', () => {
    const open = links?.getAttribute('data-open') === 'true';
    links?.setAttribute('data-open', String(!open));
    toggle.setAttribute('aria-expanded', String(!open));
  });
  links?.addEventListener('click', (e) => {
    if (e.target.closest('a')) { links.setAttribute('data-open', 'false'); toggle?.setAttribute('aria-expanded', 'false'); }
  });
}

/** Depth on hero art and media, driven by scroll, in one rAF. */
function parallax() {
  if (reduce) return;
  const nodes = [...document.querySelectorAll('.parallax, .hero-art, [data-parallax]')].slice(0, 8);
  if (!nodes.length) return;
  let raf = 0;
  const tick = () => {
    raf = 0;
    const y = window.scrollY;
    nodes.forEach((n, i) => {
      const speed = (n.dataset.parallax ? Number(n.dataset.parallax) : 0.06 + (i % 3) * 0.03);
      n.style.transform = `translate3d(0, ${(-y * speed).toFixed(2)}px, 0) scale(${1 + speed})`;
    });
  };
  window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(tick); }, { passive: true });
  tick();
}

/** Smooth in-page anchors from the index hero variant. */
function anchors() {
  document.addEventListener('click', (e) => {
    const a = e.target instanceof Element ? a.closest('a[href^="#"]') : null;
    const id = a?.getAttribute('href')?.slice(1);
    const t = id && document.getElementById(id);
    if (!t) return;
    e.preventDefault();
    t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', `#${id}`);
  });
}

/** Counters used in proof strips. */
function counters() {
  if (reduce) return;
  document.querySelectorAll('.proof b').forEach((b) => {
    const raw = b.textContent?.trim() || '';
    const n = Number(raw.replace(/[^\d]/g, ''));
    if (!n || raw.length > 9) return;
    const suffix = raw.replace(String(n), '');
    const t0 = performance.now();
    const run = (t) => {
      const p = Math.min(1, (t - t0) / 900);
      b.textContent = Math.round(n * (1 - (1 - p) ** 3)).toLocaleString('en-US') + suffix;
      if (p < 1) requestAnimationFrame(run);
    };
    new IntersectionObserver((es, o) => es.forEach((es2) => { if (es2.isIntersecting) { run(performance.now()); o.disconnect(); } }), { threshold: .5 }).observe(b);
  });
}

export function boot() {
  document.documentElement.classList.add('js');
  nav(); reveal(); parallax(); anchors(); counters();
  const scan = document.querySelector('[data-scan]');
  if (scan) setInterval(() => scan.classList.toggle('is-live'), 2600);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
