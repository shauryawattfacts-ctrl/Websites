/**
 * audit.mjs — the pre-handover quality gate.
 *
 * Reads the built output in dist/ and the specs in data/businesses/ and checks
 * the things that actually break a multi-site launch: broken internal links,
 * template clones, missing SEO metadata, alt/label/heading basics, colour
 * contrast, unverified facts rendered as truth, and asset 404s.
 *
 * Run after `npm run build`:  node scripts/audit.mjs
 */
import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(root, 'dist');
const DIR = path.join(root, 'data', 'businesses');

const fail = [];
const warn = [];
const note = (arr, msg) => arr.push(msg);

const read = (p) => readFile(p, 'utf8');
const slugOf = (href) => (href || '').split('/')[1] || '';

function hex(c) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(c).trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = [...h].map((x) => x + x).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
function lum([r, g, b]) {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
const contrast = (a, b) => { const [x, y] = [lum(hex(a)), lum(hex(b))].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

async function htmlFiles(dir, acc = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await htmlFiles(p, acc);
    else if (e.name.endsWith('.html')) acc.push(p);
  }
  return acc;
}

function resolveInternal(href, fromDir) {
  if (/^(https?:|mailto:|tel:|#|data:)/.test(href)) return null;
  const clean = href.split('#')[0].split('?')[0];
  if (!clean.startsWith('/')) return { kind: 'relative', target: path.resolve(fromDir, clean) };
  return { kind: 'root', target: path.join(DIST, clean) };
}

async function existsPage(target) {
  return (await stat(`${target}.html`).catch(() => null)) || (await stat(path.join(target, 'index.html')).catch(() => null)) || (await stat(target).catch(() => null));
}

async function main() {
  if (!existsSync(DIST)) { console.error('dist/ not found — run `npm run build` first.'); process.exit(1); }
  const files = await htmlFiles(DIST);
  const specs = [];
  for (const f of (await readdir(DIR)).filter((f) => f.endsWith('.json'))) specs.push(JSON.parse(await read(path.join(DIR, f))));
  const scored = JSON.parse(await read(path.join(root, 'data', 'scored.json')));
  const index = JSON.parse(await read(path.join(root, 'data', 'index.json')));
  const slugs = new Set(specs.map((s) => s.slug));

  // 1 — build coverage & uniqueness ------------------------------------------
  const builtSlugs = new Set();
  for (const f of files) {
    const rel = path.relative(DIST, f).split(path.sep);
    if (rel.length > 1 && rel[rel.length - 2] !== '_astro') builtSlugs.add(rel[0]);
  }
  const missingSites = [...slugs].filter((s) => !builtSlugs.has(s));
  if (missingSites.length) note(fail, `sites without a built index page: ${missingSites.join(', ')}`);

  if (specs.length < 50) note(fail, `only ${specs.length} site specs (the brief requires 50+ unique prospects)`);
  if (index.count !== specs.length) note(fail, `data/index.json count ${index.count} != ${specs.length} specs`);

  const titles = new Map();
  const h1s = new Map();
  const palettes = new Map();
  const identity = new Map();
  for (const s of specs) {
    // Home-page title and H1 must be unique per business; sub-page labels
    // (Contact, Services) are shared information architecture, not cloning.
    titles.set(s.seo.title, (titles.get(s.seo.title) || 0) + 1);
    h1s.set(s.copy.h1, (h1s.get(s.copy.h1) || 0) + 1);
    const id = [s.design.system, s.concept.hero, s.design.motion, s.design.roster.join('>'), Object.values(s.concept.palette || {}).join('')].join('|');
    identity.set(id, (identity.get(id) || 0) + 1);
    const key = [s.design.tokens.ink, s.design.tokens.paper, s.design.tokens.accent, s.design.tokens.accent2].join('');
    palettes.set(key, (palettes.get(key) || 0) + 1);
  }
  const dupeTitles = [...titles].filter(([, n]) => n > 1);
  if (dupeTitles.length) note(fail, `duplicate <title> strings across sites: ${dupeTitles.length} (e.g. ${dupeTitles[0][0].slice(0, 60)})`);
  const dupeId = [...identity].filter(([, n]) => n > 1).length;
  if (dupeId) note(fail, `${dupeId} sites share an identical design identity (system + hero + motion + roster + palette)`);
  const dupeH1 = [...h1s].filter(([, n]) => n > 1);
  if (dupeH1.length) note(fail, `duplicate H1 copy across sites: ${dupeH1.map(([t]) => t.slice(0, 40)).join(' | ')}`);
  if (palettes.size < Math.ceil(specs.length * 0.8)) note(fail, `only ${palettes.size} distinct palettes for ${specs.length} sites — sites must not look cloned`);
  const clones = [...palettes.values()].filter((n) => n > 2).length;
  if (clones) note(fail, `${clones} palettes are shared by more than two sites`);

  // per-site hero/motion/nav variety is a brief requirement
  for (const field of ['hero', 'signature']) {
    const used = new Set(specs.map((s) => s.concept[field]));
    if (used.size < 6) note(fail, `only ${used.size} distinct values for concept.${field}`);
  }
  const rosters = new Set(specs.map((s) => s.design.roster.join('>')));
  if (rosters.size < 8) note(warn, `only ${rosters.size} distinct home-page section rosters`);

  // 2 — per-page checks ------------------------------------------------------
  const banned = /lorem|ipsum|placeholder text|\bTODO\b|\bTBD\b|your company here|sample text/i;
  // copy that belongs in the pitch deck, not on the client's own site
  const pitch = /in this database|the entire opportunity|that is the pitch|this is the first one|no website at all|prospect'?s|lead generation|our audit|the opportunity here/i;
  let pagesChecked = 0;
  const linksSeen = new Set();
  for (const f of files) {
    const html = await read(f);
    pagesChecked++;
    const dir = path.dirname(f);
    const rel = path.relative(DIST, f);
    const isSite = /^([a-z0-9-]+)\/(index\.html|[a-z0-9-]+\/index\.html)$/.test(rel);
    const slug = slugOf(`/${rel.split('/')[0]}`);
    const spec = specs.find((s) => s.slug === slug);

    // internal links
    for (const m of html.matchAll(/href="([^"]+)"/g)) {
      const href = m[1];
      const r = resolveInternal(href, dir);
      if (!r) continue;
      const key = `${r.kind}:${r.target}`;
      if (linksSeen.has(key)) continue;
      linksSeen.add(key);
      if (href.startsWith('/_astro/')) continue; // hashed bundles: covered by the asset check
      // any root link must resolve to a built document: a site page, a portal
      // page, an asset, or the site root itself
      if (href.startsWith('/')) {
        const target = path.join(DIST, href);
        const ok = (await existsPage(target)) || href === '/' || existsSync(target);
        if (!ok) note(fail, `broken internal link ${href} (from ${rel})`);
        const first = slugOf(href);
        if (first && !slugs.has(first) && !['prospects', 'scoreboard', 'research-index', 'concepts', 'sitemap-index.xml', 'sitemap-0.xml', 'robots.txt', 'favicon', 'og', 'img', 'portal-fonts.css', 'favicon.svg'].includes(first) && !first.includes('.')) {
          note(fail, `link to a slug that is not in the dataset: ${href} (from ${rel})`);
        }
      } else if (!(await existsPage(r.target))) note(fail, `broken relative link ${href} (from ${rel})`);
    }

    // local assets
    for (const m of html.matchAll(/(?:src|href)="(\/[^"]+\.(?:png|jpe?g|svg|webp|avif|css|js))"/g)) {
      const p = path.join(DIST, m[1]);
      if (!existsSync(p)) note(fail, `missing asset ${m[1]} (from ${rel})`);
    }

    // basics
    if (!/<title>[^<]{12,105}<\/title>/.test(html)) note(fail, `title missing or odd length in ${rel}`);
    if (!/name="description" content="[^"]{40,320}"/.test(html)) note(fail, `meta description missing/too short in ${rel}`);
    if (!/property="og:image"/.test(html)) note(warn, `no og:image in ${rel}`);
    if (!/name="twitter:card"/.test(html)) note(warn, `no twitter card in ${rel}`);
    if (!/name="viewport"/.test(html)) note(fail, `no viewport meta in ${rel}`);
    if (!/rel="canonical"/.test(html)) note(fail, `no canonical in ${rel}`);
    if (!/Skip to content/.test(html)) note(warn, `no skip link in ${rel}`);
    const h1n = (html.match(/<h1[\s>]/g) || []).length;
    if (h1n !== 1) note(fail, `${h1n} H1 elements in ${rel}`);
    if (/<h3[\s>][\s\S]{0,400}?<h1/.test(html)) note(warn, `heading order looks off in ${rel}`);
    for (const img of html.matchAll(/<img\b[^>]*>/g)) if (!/alt=/.test(img[0])) note(fail, `img without alt attribute in ${rel}`);
    for (const img of html.matchAll(/<img\b[^>]*alt=""[^>]*>/g)) if (!/(width|height)=/.test(img[0])) note(warn, `decorative img missing dimensions in ${rel}`);
    for (const inp of html.matchAll(/<input\b(?![^>]*(?:type="hidden"|type="range"|type="checkbox"|type="radio"))[^>]*id="([^"]+)"/g)) {
      if (!html.includes(`for="${inp[1]}"`)) note(fail, `input #${inp[1]} has no label in ${rel}`);
    }
    if (banned.test(html)) note(fail, `banned filler text found in ${rel}`);
    if (/undefined|\[object Object\]|NaN/.test(html.replace(/<script[\s\S]*?<\/script>/g, ''))) note(fail, `undefined/[object] leaked into ${rel}`);
    if (isSite && spec) {
      // unverified facts must stay flagged
      const bodyText = html.replace(/<script[\s\S]*?<\/script>/g, '');
      const confirmTags = (bodyText.match(/confirm/gi) || []).length;
      if (!spec.phone && /tel:/.test(bodyText)) note(fail, `${rel} links a phone number the record does not have`);
      if (/undefined|\[object Object\]/.test((html.match(/<title>[\s\S]*?<\/title>/) || [''])[0])) note(fail, `undefined in title of ${rel}`);
      if (spec.reputation?.reviews > 0 && !/public listings|Birdeye|Yelp|Google/i.test(bodyText)) note(warn, `${rel} shows review counts without naming the source`);
      if (/★/.test(bodyText) && !spec.reputation?.rating) note(fail, `${rel} shows a rating that was never verified`);
      if (bodyText.length < 4200) note(warn, `${rel} is thin (${bodyText.length} chars) — check the section roster`);
      const visible = bodyText.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
      const pitchHits = visible.match(new RegExp(pitch.source, 'gi'));
      if (pitchHits) note(fail, `pitch/audit voice on a client page (${rel}): ${[...new Set(pitchHits)].slice(0, 3).join(', ')}`);
      const size = Buffer.byteLength(html);
      if (size > 240_000) note(warn, `${rel} is ${Math.round(size / 1024)}KB of HTML`);
    }
  }

  // 3 — contrast & tokens ---------------------------------------------------
  for (const s of specs) {
    const t = s.design.tokens;
    const body = contrast(t.ink, t.paper);
    const acc = Math.max(contrast(t.accent, t.paper), contrast(t.accent, t.ink));
    if (body < 4.5) note(fail, `${s.slug}: body contrast ${body.toFixed(2)}:1 < 4.5:1`);
    if (acc < 2.6) note(warn, `${s.slug}: accent has < 2.6:1 against both ink and paper`);
    if (!s.design.google) note(warn, `${s.slug}: no google font query for the system`);
  }

  // 4 — structured data & sitemap -------------------------------------------
  const ld = [];
  for (const f of files) {
    const html = await read(f);
    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      try { ld.push([f, JSON.parse(m[1])]); } catch { note(fail, `invalid JSON-LD in ${path.relative(DIST, f)}`); }
    }
  }
  const withRating = ld.filter(([, o]) => o.aggregateRating);
  for (const [f, o] of withRating) {
    const s = specs.find((x) => f.includes(x.slug));
    if (!s?.reputation?.reviews || !s?.reputation?.rating) note(fail, `${path.relative(DIST, f)} publishes aggregateRating without verified data`);
    if (Number(o.aggregateRating.reviewCount) !== Number(s.reputation.reviews)) note(warn, `${path.relative(DIST, f)} aggregateReviewCount does not match research record`);
  }
  const sm = await read(path.join(DIST, 'sitemap-index.xml')).catch(() => '');
  const smUrls = existsSync(path.join(DIST, 'sitemap-0.xml')) ? await read(path.join(DIST, 'sitemap-0.xml')) : '';
  const inSitemap = (smUrls.match(/<loc>/g) || []).length;
  if (inSitemap < specs.length) note(fail, `sitemap has ${inSitemap} URLs for ${specs.length} sites`);

  // 5 — responsive + motion hygiene (no browser in CI, so the CSS is inspected)
  const css = (await readFile(path.join(root, 'designs', '_base.css'), 'utf8')) + (await readFile(path.join(root, 'designs', 'system.css'), 'utf8'));
  const media = (css.match(/@media[^{]+/g) || []);
  if (media.length < 8) note(fail, `only ${media.length} media queries across the design system — mobile behaviour is unproven`);
  if (!/max-width:\s*40rem|40rem/.test(css)) note(fail, 'no phone-width breakpoint found');
  if (!/prefers-reduced-motion/.test(css)) note(fail, 'motion is not gated behind prefers-reduced-motion');
  const fixedW = [...css.matchAll(/(?:^|;)\s*(?:inline-)?size:\s*([3-9]\d{3,})px/g)];
  if (fixedW.length) note(fail, `${fixedW.length} hard-coded element widths ≥1000px will overflow mobile: ${fixedW.slice(0, 3).map((m) => m[1]).join(', ')}`);
  if (!/clamp\(/.test(css)) note(fail, 'type/spacing scale is not fluid (no clamp())');
  for (const s of specs) {
    if (!/clamp/.test(s.design.tokens.pad + '' + s.design.tokens.scale)) continue; // informational only
  }

  // 6 — portal + dataset integrity -----------------------------------------
  for (const p of ['index.html', 'prospects/index.html', 'scoreboard/index.html', 'research-index/index.html', 'concepts/index.html']) {
    if (!existsSync(path.join(DIST, p))) note(fail, `portal page missing: ${p}`);
  }
  const csv = await read(path.join(root, 'research', 'prospect-database.csv')).catch(() => '');
  if (csv.split('\n').length - 1 < specs.length + 1) note(fail, 'prospect-database.csv does not cover every site');
  const md = await read(path.join(root, 'research', 'prospect-database.md')).catch(() => '');
  if ((md.match(/^### \d+\./gm) || []).length < specs.length) note(fail, 'prospect-database.md is missing profiles');
  for (const s of specs) {
    if (!s.sources.length) note(fail, `${s.slug}: no source URLs recorded for its website-status claim`);
    if (!/confirm|not published|unverified|do not invent/i.test(JSON.stringify(s)) && !s.phone) note(warn, `${s.slug}: missing contact with no confirm flag`);
  }
  const tiers = scored.prospects.reduce((a, p) => (a[p.tier.split(' — ')[0]] = (a[p.tier.split(' — ')[0]] || 0) + 1, a), {});

  // report ------------------------------------------------------------------
  const lines = [];
  lines.push('');
  lines.push('  Silicon Valley Website Opportunity Studio — build audit');
  lines.push('  ' + '─'.repeat(66));
  lines.push(`  pages audited          ${String(pagesChecked).padStart(5)}`);
  lines.push(`  sites built           ${String(builtSlugs.size).padStart(5)}  of ${specs.length} specs`);
  lines.push(`  distinct palettes      ${String(palettes.size).padStart(5)}`);
  lines.push(`  section rosters        ${String(rosters.size).padStart(5)}`);
  lines.push(`  internal links checked ${String(linksSeen.size).padStart(5)}`);
  lines.push(`  JSON-LD blocks         ${String(ld.length).padStart(5)}  (${withRating.length} with aggregateRating)`);
  lines.push(`  sitemap URLs           ${String(inSitemap).padStart(5)}`);
  lines.push(`  score tiers            ${Object.entries(tiers).map(([k, v]) => `${k}:${v}`).join('  ')}`);
  lines.push('');
  if (!fail.length && !warn.length) lines.push('  ✓ no issues found');
  if (fail.length) { lines.push(`  ✗ ${fail.length} blocking:`); for (const f of [...new Set(fail)].slice(0, 40)) lines.push(`     - ${f}`); if (fail.length > 40) lines.push(`     … ${fail.length - 40} more`); }
  if (warn.length) { lines.push(`  ! ${warn.length} warnings:`); for (const w of [...new Set(warn)].slice(0, 25)) lines.push(`     - ${w}`); if (warn.length > 25) lines.push(`     … ${warn.length - 25} more`); }
  lines.push('');
  console.log(lines.join('\n'));
  process.exit(fail.length ? 1 : 0);
}

await main();
