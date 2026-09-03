/**
 * optimize-images.mjs — raster optimisation pass for hero concept art.
 *
 * For every public/img/<slug>/hero.{jpg,png} this writes a resized, strip-meta,
 * progressive JPEG plus a WebP twin, so pages can serve modern formats with a
 * legacy fallback. Vector heroes (the default: generated SVG artwork) need no
 * processing, which is why most sites ship zero image bytes.
 *
 * Concept art is generated for a handful of categories only, and always
 * labelled as concept work — never presented as a photograph of the premises.
 */
import { readdir, stat, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMG = path.join(root, 'public', 'img');
const MAXW = 1600;

async function main() {
  let sharp;
  try { sharp = (await import('sharp')).default; } catch { console.warn('optimize-images: sharp not installed, skipping'); return; }
  let dirs = [];
  try { dirs = (await readdir(IMG, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name); }
  catch { console.log('optimize-images: no public/img directory yet'); return; }

  let done = 0, saved = 0;
  for (const slug of dirs) {
    const dir = path.join(IMG, slug);
    for (const src of ['hero.jpg', 'hero.png']) {
      const p = path.join(dir, src);
      if (!(await access(p).then(() => true).catch(() => false))) continue;
      const before = (await stat(p)).size;
      const img = sharp(p).rotate().resize({ width: MAXW, withoutEnlargement: true });
      const out = path.join(dir, 'hero.jpg');
      await img.clone().jpeg({ quality: 78, progressive: true, mozjpeg: true }).toFile(`${out}.tmp`);
      await (await import('node:fs/promises')).rename(`${out}.tmp`, out);
      await img.clone().webp({ quality: 76 }).toFile(path.join(dir, 'hero.webp'));
      await img.clone().avif({ quality: 48 }).toFile(path.join(dir, 'hero.avif'));
      const after = (await stat(out)).size;
      saved += Math.max(0, before - after); done++;
      console.log(`  ${slug}: ${(before / 1024) | 0}KB → ${(after / 1024) | 0}KB jpeg + webp + avif`);
      if (src !== 'hero.jpg') await (await import('node:fs/promises')).unlink(p).catch(() => {});
    }
  }
  console.log(`optimize-images: ${done} images optimised, ${(saved / 1024 / 1024).toFixed(1)}MB saved`);
}
await main();
