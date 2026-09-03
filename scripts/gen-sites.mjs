/**
 * gen-sites.mjs — emits one Astro page tree per business from its spec.
 *
 * Reads  : data/businesses/<slug>.json, data/scored.json
 * Writes : apps/pages/<slug>/<page>.astro  (thin views over the shared layout)
 *          apps/pages/index.astro         (the studio portal)
 *          apps/pages/prospects.astro      (ranked database view)
 *
 * Pages are data, not code: the generator exists so 50+ sites stay maintainable
 * and every site keeps its own page list, nav and sections from research.
 */
import { readFile, writeFile, mkdir, rm, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(root, 'data', 'businesses');
const PAGES = path.join(root, 'apps', 'pages');

const view = (slug, pageSlug) => {
  const index = !pageSlug || pageSlug === 'index';
  return `---
/**
 * ${slug}${index ? '' : ` / ${pageSlug}`} — generated from data/businesses/${slug}.json
 * Do not edit by hand: change the research record, then run \`npm run gen\`.
 * Each site owns its own page list, nav, section roster and copy, all of which
 * come from research; the shared layout supplies the rendering.
 */
import Site from '../../../layouts/site.astro';
import spec from '../../../data/businesses/${slug}.json';
${index ? 'const page = undefined;' : `const page = spec.pages.find((p) => p.slug === '${pageSlug}');`}
---
<Site biz={spec}${index ? '' : ' page={page}'} />
`;
};

async function main() {
  const slugs = (await readdir(DIR)).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')).sort();
  const specs = [];
  for (const s of slugs) specs.push(JSON.parse(await readFile(path.join(DIR, `${s}.json`), 'utf8')));

  // clean previously generated site folders (everything except the portal pages)
  const keep = new Set(['index.astro', 'prospects.astro', 'scoreboard.astro', 'research-index.astro', 'concepts.astro']);
  for (const entry of await readdir(PAGES, { withFileTypes: true })) {
    if (entry.isDirectory()) await rm(path.join(PAGES, entry.name), { recursive: true, force: true });
    else if (!keep.has(entry.name)) await rm(path.join(PAGES, entry.name), { force: true });
  }

  let files = 0;
  for (const spec of specs) {
    const dir = path.join(PAGES, spec.slug);
    await mkdir(dir, { recursive: true });
    for (const p of spec.pages) {
      await writeFile(path.join(dir, p.file), view(spec.slug, p.slug));
      files++;
    }
  }

  // Portal views (apps/pages/index.astro, prospects.astro, scoreboard.astro) are hand-written
  // Astro that reads data/*.json — they are the studio-facing layer, not per-client code.

  console.log(`gen-sites: ${files} page files for ${specs.length} sites → apps/pages/`);
}

await main();
