/**
 * flagship.js — the extra motion layer for the ten highest-scoring sites only.
 *
 * Loaded with a dynamic import so 40 of the 50 sites ship zero JavaScript
 * beyond reveal/signature. ScrollTrigger drives the scroll-linked behaviour
 * that CSS cannot express (pinned section heads, scrubbed media, hero line
 * stagger). Everything is skipped under prefers-reduced-motion.
 */
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export async function initFlagship(biz) {
  if (reduce || !biz) return;
  const { gsap } = await import('gsap');
  const { ScrollTrigger } = await import('gsap/ScrollTrigger');
  gsap.registerPlugin(ScrollTrigger);
  gsap.ticker.lagSmoothing(0);

  // 1. Hero headline: split into words, stagger in from below.
  const h1 = document.querySelector('[data-hero-body] h1');
  if (h1) {
    const words = h1.textContent.trim().split(/\s+/);
    h1.setAttribute('aria-label', h1.textContent.trim());
    h1.innerHTML = words.map((w) => `<span class="fx-w"><span class="fx-i">${w}</span></span>`).join(' ');
    gsap.from('.fx-i', {
      yPercent: 118, rotate: 2.4, duration: 1.05, ease: 'power3.out', stagger: 0.028,
      scrollTrigger: { trigger: h1, start: 'top 88%' },
    });
  }

  // 2. Hero art drifts and scales down as the page leaves.
  const art = document.querySelector('.hero-art, .hero-media, .hero-bg');
  if (art) {
    gsap.to(art, {
      yPercent: 9, scale: 1.06, opacity: 0.82, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
    });
  }

  // 3. Section heads get a scrubbed rule-draw.
  document.querySelectorAll('.sec-head').forEach((head) => {
    const k = head.querySelector('.kicker');
    if (!k) return;
    gsap.fromTo(k, { opacity: 0, x: -18 }, {
      opacity: 1, x: 0, duration: 0.7, ease: 'power2.out',
      scrollTrigger: { trigger: head, start: 'top 82%' },
    });
  });

  // 4. Cards float up on entry with a light depth cue.
  gsap.utils.toArray('.pillars > div, .card-grid .card, .quote').forEach((el, i) => {
    gsap.from(el, {
      y: 26, opacity: 0, duration: 0.8, delay: (i % 4) * 0.06, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%' },
    });
  });

  // 5. Media frames get a clip reveal that follows scroll.
  gsap.utils.toArray('.frame').forEach((el) => {
    gsap.from(el, {
      clipPath: 'inset(14% 0 14% 0)', duration: 1.1, ease: 'power2.inOut',
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });

  // 6. Proof numbers scrub up with the section.
  gsap.utils.toArray('.proof b').forEach((el) => {
    gsap.from(el, {
      filter: 'blur(6px)', y: 14, duration: 0.9, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 92%' },
    });
  });

  document.documentElement.setAttribute('data-fx', 'flagship');
  addEventListener('resize', () => ScrollTrigger.refresh(), { passive: true });
}

if (document.readyState === 'loading') addEventListener('DOMContentLoaded', () => start(), { once: true });
else start();

function start() {
  const el = document.getElementById('main');
  const biz = el?.getAttribute('data-biz');
  if (biz) initFlagship(biz);
}
