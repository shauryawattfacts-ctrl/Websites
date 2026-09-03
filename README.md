# Silicon Valley Website Opportunity Finder → Website Generator

A research project, a scoring model, a design system and **50 production websites** for 50 real,
qualified businesses in San Jose, Palo Alto, Mountain View, Sunnyvale, Santa Clara, Cupertino,
Menlo Park, Redwood City, Fremont, Milpitas and nearby cities — every one of them found because it
has **no usable website** while visibly being able to pay for one.

Everything (research, scores, design concepts, copy and the built sites) is generated from a single
dataset: `data/businesses.jsonl`. Change a record, re-run the pipeline, and its site, its ranking,
its schema markup and its entry in the sales register all move together.

## Headline results

| | |
|---|---|
| Businesses researched in depth | **50** qualified (screened from a wider discovery set; every drop is logged in `research/raw-notes.jsonl`) |
| No website | **28** |
| Extremely outdated / basic website | **15** |
| Broken / inactive website | **3** |
| Third-party directory page instead of a website | **3** |
| Only social-media presence | **1** |
| Cities | 14 (San Jose, Santa Clara, Sunnyvale, Milpitas, Fremont, Mountain View, Palo Alto, Menlo Park, Redwood City, Cupertino, Los Altos, Los Gatos, Saratoga, Belmont) |
| Distinct business categories | 41 |
| Design systems / distinct directions | 14 systems, 50 unique palettes + rosters + hero treatments |
| Pages generated | 259 (50 home pages + 4–6 sub-pages each + 4 portal pages) |
| Average Website Opportunity Score | 76.5 / 100 — 8 S-tier, 30 A-tier, 12 B-tier |
| Production build | 258 → 259 pages in ~6 s, `astro check` clean, `scripts/audit.mjs` clean |

### Top 10 prospects (full ranking in `research/prospect-database.md`)

| # | Business | City | Category | Website state | Score |
|---|---|---|---|---|---|
| 1 | G&C Auto Body | San Jose | Auto body & collision | Only social-media presence | 95.7 S |
| 2 | Chapel of Flowers Funeral Home | San Jose | Funeral home | Broken / inactive | 85.7 S |
| 3 | BT Properties | Redwood City | Property management | Extremely outdated (2015 WP media) | 85.2 S |
| 4 | Elegant Jewelers | San Jose | Jewellery repairs | Directory subdomain (JewelersShowcase) | 85.2 S |
| 5 | EJ Painting Inc. | Santa Clara | Painting | No website | 84.7 S |
| 6 | Steel Werx | Santa Clara | Fabrication / machining | Extremely outdated | 84.1 S |
| 7 | Trio School of Music, Dance & Languages | Sunnyvale | School | No website | 83.8 S |
| 8 | DG Floor Coverings Inc. | Redwood City | Flooring | Broken (stale dev host) | 82.3 S |
| 9 | American Heritage Construction | Redwood City | General contractor | Directory page only | 81.8 A |
| 10 | Robert M. Potts Landscape Design | Los Altos | Landscape design-build | Broken / parked | 81.8 A |

## Run it

```bash
npm install

# 1. regenerate the compiled dataset, scores, OG cards, favicons and all page files
npm run data

# 2. develop (portal at /, every site at /<slug>)
npm run dev          # astro dev --host 0.0.0.0 --allowed-hosts

# 3. production build (runs the data step first)
npm run build        # → dist/

# 4. serve the production build
npm run preview      # astro preview --host 0.0.0.0 --allowed-hosts

# 5. quality gates
npm run audit        # static audit of dist/ (links, a11y, SEO, contrast, cloning, copy voice)
npm run check        # astro check (TypeScript) + audit
```

Useful one-offs:

```bash
node scripts/build-single.mjs dg-floor-coverings-redwood-city   # build ONE site → dist-single/
node scripts/optimize-images.mjs                                # resize/convert public/img/<slug>/hero.*
node scripts/gen-sites.mjs                                      # regenerate page files only
node scripts/score.mjs                                          # regenerate ranking + research/*.csv|md
```

Portals: `/` (opportunity finder), `/prospects` (ranked database), `/scoreboard` (score model),
`/concepts` (design-concept register, each card rendered with its own tokens),
`/research-index` (method + evidence trail).

## Deploy

The output is a plain static bundle, so any host works. Set the canonical origin first:

```bash
PUBLIC_SITE_URL=https://<your-domain> npm run build
```

* **Netlify / Vercel / Cloudflare Pages** — build command `npm run build`, output dir `dist`.
  `astro.config.mjs` already emits `sitemap-index.xml` and robots-friendly static HTML; no adapters needed.
* **GitHub Pages** — push `dist/` to `gh-pages`, or use the official `withastro/action`.
* **S3 + CloudFront** — `aws s3 sync dist/ s3/<bucket> --delete --cache-control "public,max-age=31536000,immutable"`
  (`_astro/*` is content-hashed; HTML should get `max-age=0, must-revalidate`).
* **Per-client handover** — `node scripts/build-single.mjs <slug>` produces a single-site bundle so a
  client deploy never ships the other 49 prospects.

Because these are 50 separate *candidate* brands on one demo origin, each site's `rel="canonical"`,
Open Graph URLs and JSON-LD `url`/`@id` all resolve from `PUBLIC_SITE_URL`. Set a real domain per
client at deploy time and every absolute URL follows.

## Project structure

```
data/
  businesses.jsonl      50 research records — the single source of truth (see “The record”)
  archetypes.js         14 design systems: type, tokens, motion, hero/nav variants, section vocabulary
  businesses/<slug>.json compiled per-site spec (design + copy + schema + pages) ← build-data
  index.json            site manifest (slug, system, hero, signature, status)
  scored.json           weights, sub-scores, tiering, ranking
apps/
  pages/index.astro     portal (opportunity finder)
  pages/prospects.astro ranked prospect database
  pages/scoreboard.astro score model and per-prospect breakdown
  pages/concepts.astro  design-concept register
  pages/research-index.astro method, confidence levels, source trail
  pages/<slug>/*.astro  generated pages for each business (thin views over layouts/site.astro)
layouts/site.astro      shared shell: tokens, fonts, SEO, nav, hero, sections, footer, motion tiers
layouts/portal.css      studio-only styling for the four portal documents
components/
  SEO.astro  Nav.astro  Hero.astro  HeroArt.astro  Section.astro  Signature.astro  Footer.astro  Icon.astro
  section-model.mjs     section → data resolver (the content architecture)
animations/
  reveal.js             IntersectionObserver reveals, counters, parallax, nav state (every site)
  signature.js          per-site interactive modules (compare, picker, ledger, timeline, map, intake, archive, statement)
  flagship.js           GSAP + ScrollTrigger layer (10 highest-scoring sites only)
  three-hero.js         WebGL hero (2 sites only, where the concept asks for it)
designs/
  _base.css             tokens, fluid type scale, primitives
  system.css            hero/nav/section chrome, 14 archetype identity blocks, signature modules, mobile rules
scripts/
  build-data.mjs  score.mjs  gen-assets.mjs  gen-sites.mjs  optimize-images.mjs  audit.mjs  build-single.mjs
research/
  prospect-database.csv|md   ranking + scores + evidence + sources, one row per prospect
  top10.md                   outreach order for the top ten
  raw-notes.jsonl            discovery notes (audit trail of the screening itself)
public/
  img/<slug>/                concept artwork (7 sites; everything else uses generated SVG art)
  og/<slug>.png|svg          Open Graph cards (gitignored, rebuilt by `npm run assets`)
  favicon/<slug>.svg         per-brand favicons
```

## The pipeline

```
data/businesses.jsonl ──build-data.mjs──► data/businesses/<slug>.json ─┐
                                   └────► data/index.json              ├─► gen-sites.mjs ─► apps/pages/<slug>/*.astro ─► astro build ─► dist/
                    score.mjs ─► data/scored.json ─┬─► research/*.csv|md│   gen-assets.mjs ─► public/og, public/favicon ┘
                                                   └─ ranking, tiers    └─► audit.mjs (post-build gate)
```

## The record

Each line of `data/businesses.jsonl` is one prospect. Required fields:

| Field | Purpose |
|---|---|
| `id slug name city zip addr phone email cat sub arch` | identity, location, chosen design system |
| `web {s,url,lvl,note,src[]}` | website state (`none social broken basic directory`), URL if any, confidence A–D, evidence note, source URLs |
| `prof {yelp,fb,ig,li,other[]}` | existing public profiles |
| `f {founded,hours,aud,scale,desc,svc[],extra}` | facts: history, hours, audience, size, description, services |
| `rep {rating,reviews,src,note}` | reputation, only with a sourced count |
| `q {afford[],risk[]}` | evidence of $10K+ capacity, and the risks/unknowns |
| `pos {usps[],diff[],voice,persona}` | positioning and buyer |
| `art {colors[],logo,photoNote}` | brand colour evidence, logo note, photography plan |
| `copy {…}` | real business copy: `eyebrow h1 sub cta1 cta2 lede svcCopy[]` |
| `concept {…}` | design direction: `dir palette heroType motion interactive[] pages[] nav[] tone refs signature threeD` |
| `sc {aff,gap,val,brand,roi,vis,vol,assets,comp}` | the nine 0–10 sub-scores |

Adding a prospect = adding one line + `npm run data`. Adding a *look* = adding one archetype to
`data/archetypes.js`; nothing in `components/` changes.

## Design approach

* **14 archetypes, 50 outcomes.** An archetype sets font pairing, token defaults, texture, hero and
  nav variants, motion and a section roster from a 57-name vocabulary (`.ledger`, `.bay-gallery`,
  `.picker`, `.intake`, `.heritage`…). Each record then overrides palette (from colours found on the
  existing brand), hero type, motion, interactive list, page list and its signature module. Two sites
  in the same archetype still differ in roster, palette, hero and interaction.
* **Content model, not template fill-in.** `components/section-model.mjs` turns a spec into typed
  sections (cards, table, timeline, ledger, map, intake, archive…). A section that has no data for a
  business is not rendered — which is why page lengths and shapes differ per site.
* **Motion tiers, deliberately unequal.** Every site: CSS + one 2.7 kB IntersectionObserver module.
  The ten highest-scoring prospects: GSAP ScrollTrigger (hero word stagger, scrubbed parallax, clip
  reveals). Two sites whose concept asked for it: a small lazy WebGL layer (Potts terrain, G&C
  clear-coat sweep), gated behind pointer/viewport/`prefers-reduced-motion`. No Tailwind, no UI kit,
  no icon font: icons are inlined Lucide SVG paths, layout is real CSS Grid with `clamp()` scales.
* **Art direction without fake photography.** 43 of 50 heroes use generated SVG artwork derived from
  that business's own tokens and category. The 7 raster heroes are *concept artwork*, labelled as
  such in `alt` — a real storefront photograph would have been an invention.
* **Honest placeholders.** Unverified details render as a `.note` (visually tagged “Draft —”) with a
  `confirm` chip in tables; nothing unverified is asserted, and no phone, email, price or review text
  is invented. Review counts appear only with the platform named; `aggregateRating` in JSON-LD is
  emitted only where a count and score were actually verified.

## Website Opportunity Score

Nine factors, each authored 0–10 from the research, weighted and normalised (`scripts/score.mjs`):

| Factor | Weight | Question |
|---|---|---|
| Web gap | 20 | How absent or broken is the current presence? |
| Affordability | 18 | Is there evidence of $10K+ project capacity? |
| Value of a better site | 14 | How much does a good site change their economics? |
| Brand potential | 12 | Is there a real story/design to build? |
| ROI | 12 | Revenue per dollar of build, given lead type |
| Visibility | 8 | Existing search/directory demand to capture |
| Review volume | 6 | Social proof already banked |
| Asset availability | 5 | Colours, logo, photos, copy we can start from |
| Competitive pressure | 5 | How far ahead are local rivals online? |

Tiers: **S ≥ 80**, **A 70–79.9**, **B 60–69.9**; the dataset has no C — prospects that scored below 60
were dropped during screening rather than padded to a number. `research/prospect-database.csv` carries
every sub-score plus the evidence and source columns.

## Quality control

`npm run audit` (after a build) fails the pipeline on any of:

missing/duplicate `<title>` or H1 per site · fewer than 40 distinct palettes or any identical
design-identity tuple · broken internal links and missing assets · pages built ≠ specs · viewport,
canonical, meta description, og:image, twitter card, skip link · any `<img>` without `alt` · form
inputs without `<label for>` · `undefined` / `[object Object]` / `NaN` leaking into markup · lorem or
placeholder text · **pitch/analyst voice on a client page** · body-text contrast below 4.5:1 ·
`aggregateRating` without verified data · malformed JSON-LD · sitemap coverage · missing media
queries, missing `prefers-reduced-motion` guard, hard-coded ≥1000 px widths, non-fluid type ·
CSV/MD register not covering every site · any site with no recorded source URL.

Current status: **0 blocking, 0 warnings** across 259 pages.

Also verified by hand during the build: every “no website” claim was cross-checked against at least two
independent directory records (and the live domain where one was listed) before classification; 10+
initial “no website” guesses were wrong and were corrected to `basic`/`broken` — the raw notes in
`research/raw-notes.jsonl` record which searches were run.

## Known limits (deliberate, not unfinished)

* **Contact gaps.** 11 of 50 records have no published phone number and 46 have no published email —
  trade counters rarely publish either. Those fields are `null` in the data, the UI renders
  “to be supplied by the client”, and no `tel:`/`mailto:` link is generated for them. Do not fill them
  in from guesswork; confirm them at first contact.
* **Confidence C (18 records).** Classified from a single source or a cached listing; flagged on the
  method page and in the CSV. Re-audit the domain before quoting.
* **Hours and pricing.** Where directories disagree, hours render as “typical” and no price is invented;
  `spec` tables use bands (“quoted per site”) rather than numbers.
* **Forms are stubs.** The intake modules validate and store locally; wiring one to an inbox/CRM is one
  `fetch` in `Signature.astro`.
* **Concept imagery is not client photography.** Swap `public/img/<slug>/hero.jpg` and run
  `npm run images`; the SVG fallback disappears automatically because `build-data` detects the file.

## Data ethics

No business was invented, no review text republished, no contact detail fabricated. Facts are either
verified (address, phone, category, founding year, licence, review counts with platform named, profile
URLs) or explicitly marked as inference. Design concepts cite *what* the research justified, not
invented awards or client lists.
