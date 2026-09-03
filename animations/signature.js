/**
 * signature.js — behaviour for the bespoke interaction modules.
 * Small, delegated and progressively enhanced: each module renders a useful
 * static block before this file runs.
 */
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function compare(root) {
  const range = root.querySelector('[data-compare-range]');
  if (!range) return;
  const set = (v) => { root.style.setProperty('--pos', `${v}%`); };
  range.addEventListener('input', () => set(Number(range.value)));
  set(Number(range.value || 50));
}

function picker(root) {
  const out = root.querySelector('[data-pick-label]');
  const detail = root.querySelector('[data-pick-detail]');
  const copy = JSON.parse(root.dataset.copy || '[]');
  root.addEventListener('change', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement) || t.name !== 'pick') return;
    const i = Number(t.value);
    if (out) out.textContent = t.dataset.label || '';
    if (detail && copy[i]) detail.textContent = copy[i];
    if (!reduce) { out?.animate([{ opacity: .2, transform: 'translateY(.4rem)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)' }); }
  });
}

function archive(root) {
  const grid = root.querySelector('[data-filterable]');
  if (!grid) return;
  root.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const want = btn.dataset.filter;
      root.querySelectorAll('[data-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      [...grid.children].forEach((card) => {
        const tags = (card.getAttribute('data-tags') || '').split(' ');
        card.hidden = !(want === '*' || tags.includes(want));
      });
    });
  });
}

function timeline(root) {
  const items = [...root.querySelectorAll('.timeline > li')];
  if (!items.length || reduce) return;
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    e.target.classList.toggle('is-now', e.isIntersecting);
    if (e.isIntersecting) e.target.animate([{ opacity: .35 }, { opacity: 1 }], { duration: 500, easing: 'ease-out' });
  }), { rootMargin: '-40% 0px -40% 0px' });
  items.forEach((i) => io.observe(i));
}

document.querySelectorAll('[data-compare]').forEach(compare);
document.querySelectorAll('[data-picker]').forEach(picker);
document.querySelectorAll('[data-archive]').forEach(archive);
document.querySelectorAll('[data-timeline]').forEach(timeline);

// Prototype-safe form handling: no network calls from a static build.
document.querySelectorAll('form[data-form]').forEach((form) => {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.reportValidity?.()) return;
    const ok = form.querySelector('[data-form-ok]');
    if (ok) { ok.hidden = false; ok.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }); }
    form.setAttribute('data-sent', 'true');
  });
});
