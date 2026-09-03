import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/**
 * Multi-site Astro studio.
 * `srcDir: 'apps'` lets every business site own a folder under apps/pages/<slug>/
 * while sharing root-level components/, layouts/, animations/, designs/ and data/.
 */
const site = process.env.PUBLIC_SITE_URL || 'http://localhost:4321';

export default defineConfig({
  site,
  srcDir: 'apps',
  trailingSlash: 'never',
  output: 'static',
  build: { inlineStylesheets: 'auto', concurrency: 2 },
  compressHTML: true,
  // lastmod comes from the build date: the dataset is regenerated wholesale by
  // `npm run data`, so per-page timestamps would be noise.
  integrations: [sitemap({
    serialize: (item) => ({ ...item, lastmod: new Date().toISOString().slice(0, 10) }),
  })],
  vite: {
    build: { assetsInlineLimit: 1024, chunkSizeWarningLimit: 700 },
    ssr: { noExternal: ['three'] },
    // The Arena preview proxies every port under a *.e2b.app host; allow any
    // subdomain of it for both dev and preview so the sites are viewable.
    server: { allowedHosts: ['.e2b.app'] },
    preview: { allowedHosts: ['.e2b.app'] },
  },
});
