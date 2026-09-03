/**
 * build-single.mjs — build one business site on its own.
 *
 * Usage: node scripts/build-single.mjs dg-floor-coverings-redwood-city
 * Useful while pitching: one client, one bundle, one preview, no 258 pages.
 * It writes a temporary Astro config that keeps the shared architecture but
 * limits the routes to the requested site, builds it into dist-single/, and
 * prints the page list.
 */
import { cp, mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execaless } from './lib/run.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const slug = process.argv[2];
if (!slug) { console.error('usage: node scripts/build-single.mjs <slug>'); process.exit(2); }
const specFile = path.join(root, 'data', 'businesses', `${slug}.json`);
if (!existsSync(specFile)) {
  const slugs = JSON.parse(await readFile(path.join(root, 'data', 'index.json'), 'utf8')).sites.map((s) => s.slug);
  console.error(`no site "${slug}". available:\n  ${slugs.join('\n  ')}`);
  process.exit(2);
}

const tmp = path.join(root, '.single');
await rm(tmp, { recursive: true, force: true });
await mkdir(path.join(tmp, 'apps', 'pages'), { recursive: true });
// copy the shared layer + only the requested site
for (const d of ['components', 'layouts', 'animations', 'designs', 'data', 'public']) await cp(path.join(root, d), path.join(tmp, d), { recursive: true });
await cp(path.join(root, 'package.json'), path.join(tmp, 'package.json'));
await cp(path.join(root, 'tsconfig.json'), path.join(tmp, 'tsconfig.json'));
await cp(path.join(root, 'apps', 'pages', slug), path.join(tmp, 'apps', 'pages', slug), { recursive: true });
await writeFile(path.join(tmp, 'astro.config.mjs'), `import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
export default defineConfig({
  site: ${JSON.stringify(process.env.PUBLIC_SITE_URL || `https://example.com/${slug}`)},
  srcDir: 'apps', trailingSlash: 'never', output: 'static',
  build: { inlineStylesheets: 'auto', assetsInlineLimit: 1024 },
  integrations: [sitemap()],
  vite: { ssr: { noExternal: ['three'] } },
});
`);
await symlinkOrCopyModules();

const { stdout } = await execaless(`cd ${JSON.stringify(tmp)} && npx astro build --outDir ${JSON.stringify(path.join(root, 'dist-single', slug))} 2>&1 | tail -20`);
console.log(stdout);
console.log(`\nbuilt /${slug} → dist-single/${slug}`);

async function symlinkOrCopyModules() {
  try { await (await import('node:fs/promises')).symlink(path.join(root, 'node_modules'), path.join(tmp, 'node_modules'), 'dir'); }
  catch { console.warn('build-single: could not symlink node_modules; run `npm run build` instead'); }
}
