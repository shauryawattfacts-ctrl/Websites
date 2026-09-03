/**
 * gen-assets.mjs — builds per-site vector identity assets from the spec:
 * favicon, wordmark tile and an Open Graph card, all derived from the same
 * palette and motif the on-page artwork uses (so nothing can drift).
 *
 * Writes: public/favicon/<slug>.svg, public/og/<slug>.svg + <slug>.png
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(root, 'data', 'businesses');

const initials = (name) => name.replace(/[^A-Za-z& ]/g, '').split(/\s+/).filter((w) => w && w !== '&').slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'SV';
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function tile({ ink, paper, accent }, mark, label) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${paper}"/><rect x="4" y="4" width="56" height="56" fill="none" stroke="${accent}" stroke-width="2"/><text x="32" y="41" font-family="Georgia,serif" font-size="26" text-anchor="middle" fill="${ink}">${esc(mark)}</text>${label ? `<text x="32" y="55" font-family="monospace" font-size="7" text-anchor="middle" fill="${ink}" opacity=".6">${esc(label)}</text>` : ''}</svg>`;
}

function card(b) {
  const t = b.design.tokens;
  const art = [];
  for (let i = 0; i < 9; i++) art.push(`<circle cx="${1120 - i * 26}" cy="${120 + i * 58}" r="${40 + i * 16}" fill="none" stroke="${i % 3 ? t.ink : t.accent}" stroke-opacity="${i % 3 ? .12 : .5}" stroke-width="1.6"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${t.paper}"/>
  <g opacity=".95">${art.join('')}</g>
  <rect x="80" y="80" width="4" height="470" fill="${t.accent}"/>
  <text x="112" y="150" font-family="monospace" font-size="22" letter-spacing="3" fill="${t.accent}">${esc(b.cat.toUpperCase())} · ${esc(b.city.toUpperCase())}</text>
  <text x="108" y="280" font-family="Georgia,serif" font-size="66" fill="${t.ink}">${esc(b.name.slice(0, 26))}</text>
  <text x="108" y="345" font-family="Georgia,serif" font-size="40" fill="${t.ink}" opacity=".82">${esc(b.copy.h1.slice(0, 52))}</text>
  <text x="108" y="425" font-family="sans-serif" font-size="24" fill="${t.ink}" opacity=".62">${esc(b.copy.sub.slice(0, 96))}</text>
  <text x="108" y="530" font-family="monospace" font-size="20" fill="${t.ink}" opacity=".5">${esc(b.design.label)} system · ${b.pages.length} pages · ${b.web.status}</text>
</svg>`;
}

async function main() {
  const files = (await readFile(path.join(root, 'data', 'index.json'), 'utf8') && (await import('node:fs')).readdirSync(DIR)).filter((f) => f.endsWith('.json'));
  await mkdir(path.join(root, 'public', 'favicon'), { recursive: true });
  await mkdir(path.join(root, 'public', 'og'), { recursive: true });
  let sharp = null;
  try { sharp = (await import('sharp')).default; } catch { /* PNG step is optional */ }
  let n = 0;
  for (const f of files) {
    const b = JSON.parse(await readFile(path.join(DIR, f), 'utf8'));
    const mark = initials(b.name);
    await writeFile(path.join(root, 'public', 'favicon', `${b.slug}.svg`), tile(b.design.tokens, mark, b.zip));
    const svg = card(b);
    await writeFile(path.join(root, 'public', 'og', `${b.slug}.svg`), svg);
    if (sharp) await sharp(Buffer.from(svg)).resize(1200, 630).png({ quality: 80 }).toFile(path.join(root, 'public', 'og', `${b.slug}.png`));
    n++;
  }
  const portal = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#101114"/><rect x="80" y="80" width="4" height="470" fill="#e8b04b"/><text x="112" y="150" font-family="monospace" font-size="22" letter-spacing="3" fill="#e8b04b">SILICON VALLEY WEBSITE OPPORTUNITY FINDER</text><text x="108" y="290" font-family="Georgia,serif" font-size="70" fill="#ece9e2">50 businesses with no usable</text><text x="108" y="370" font-family="Georgia,serif" font-size="70" fill="#ece9e2">website. 50 websites, none</text><text x="108" y="450" font-family="Georgia,serif" font-size="70" fill="#e8b04b">of them the same.</text><text x="108" y="530" font-family="monospace" font-size="20" fill="#9a958a">research · scoring · design concepts · production Astro sites</text></svg>`;
  await writeFile(path.join(root, 'public', 'og', 'portal.svg'), portal);
  if (sharp) await sharp(Buffer.from(portal)).png().toFile(path.join(root, 'public', 'og', 'portal.png'));
  console.log(`gen-assets: favicons + OG cards for ${n} sites${sharp ? ' (PNG rendered)' : ' (SVG only — sharp unavailable)'}`);
}
await main();
