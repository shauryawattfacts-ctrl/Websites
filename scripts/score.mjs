/**
 * score.mjs — Website Opportunity Score for every researched prospect.
 *
 * Reads  : data/businesses/*.json (built by build-data.mjs)
 * Writes : data/scored.json
 *          research/prospect-database.csv
 *          research/prospect-database.md
 *          research/top10.md
 *
 * Sub-scores are authored 0-10 in the research records; this file owns the
 * weights so the model can be audited and changed in one place.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(root, 'data', 'businesses');

export const WEIGHTS = {
  aff: { label: 'Affordability', w: 0.18, why: 'Ticket size, recurring revenue and demonstrated marketing spend' },
  gap: { label: 'Website gap', w: 0.20, why: 'How absent, broken or borrowed their current web presence is' },
  val: { label: 'Value of a better site', w: 0.14, why: 'Direct line from a good site to bookings, quotes and trust' },
  brand: { label: 'Brand potential', w: 0.12, why: 'Story, craft and distinctiveness a designer can build on' },
  roi: { label: 'ROI clarity', w: 0.12, why: 'How quickly the investment can be attributed and repaid' },
  vis: { label: 'Current visibility', w: 0.08, why: 'Organic reach and directory presence worth protecting' },
  vol: { label: 'Review volume', w: 0.06, why: 'Proof base available to migrate onto owned pages' },
  assets: { label: 'Asset availability', w: 0.05, why: 'Photos, copy and credentials that already exist' },
  comp: { label: 'Competitive pressure', w: 0.05, why: 'How strong neighbouring websites are in the category' },
};

const tier = (t) => (t >= 82 ? 'S — immediate outreach' : t >= 72 ? 'A — strong fit' : t >= 62 ? 'B — qualified' : 'C — qualified, lower priority');
const esc = (v) => (v == null ? '' : `"${String(Array.isArray(v) ? v.join(' | ') : v).replace(/"/g, '""')}"`);

async function main() {
  const files = (await readdir(DIR)).filter((f) => f.endsWith('.json')).sort();
  const rows = [];
  for (const f of files) rows.push(JSON.parse(await readFile(path.join(DIR, f), 'utf8')));

  const scored = rows.map((b) => {
    const parts = {};
    let total = 0;
    for (const [k, cfg] of Object.entries(WEIGHTS)) {
      const raw = Math.max(0, Math.min(10, Number(b.score_input?.[k] ?? b.sc?.[k] ?? 0)));
      const pts = raw * 10 * cfg.w;
      parts[k] = { raw, pts: +pts.toFixed(2) };
      total += pts;
    }
    return {
      id: b.id, slug: b.slug, name: b.name, cat: b.cat, city: b.city, arch: b.design.system,
      status: b.web.status, confidence: b.web.level || b.web.confidence, url: b.web.url,
      total: +total.toFixed(1), parts, tier: tier(total),
      rating: b.reputation?.rating ?? null, reviews: b.reputation?.reviews ?? null,
      affordability: b.budget?.afford ?? [], risks: b.budget?.risk ?? [], notes: b.sourceNotes ?? [], concept: b.concept?.dir ?? '',
    };
  }).sort((a, b) => b.total - a.total).map((r, i) => ({ ...r, rank: i + 1 }));

  const stats = {
    researched: scored.length,
    qualified: scored.length,
    byStatus: scored.reduce((a, r) => (a[r.status] = (a[r.status] || 0) + 1, a), {}),
    byConfidence: scored.reduce((a, r) => (a[r.confidence] = (a[r.confidence] || 0) + 1, a), {}),
    byCity: scored.reduce((a, r) => (a[r.city] = (a[r.city] || 0) + 1, a), {}),
    bySystem: scored.reduce((a, r) => (a[r.arch] = (a[r.arch] || 0) + 1, a), {}),
    average: +(scored.reduce((a, r) => a + r.total, 0) / scored.length).toFixed(1),
    tiers: scored.reduce((a, r) => (a[r.tier] = (a[r.tier] || 0) + 1, a), {}),
  };

  await writeFile(path.join(root, 'data', 'scored.json'), JSON.stringify({ generated: new Date().toISOString().slice(0, 10), weights: WEIGHTS, stats, prospects: scored }, null, 2));

  // ---- CSV -----------------------------------------------------------------
  const cols = ['rank', 'id', 'name', 'cat', 'city', 'total', 'tier', 'status', 'confidence', 'url', 'rating', 'reviews',
    'afford', 'gap', 'value', 'brand', 'roi', 'visibility', 'volume', 'assets', 'competition', 'affordability_evidence', 'risks', 'concept', 'sources'];
  const csv = [cols.join(',')].concat(scored.map((r) => [
    r.rank, r.id, esc(r.name), esc(r.cat), r.city, r.total, esc(r.tier), esc(r.status), esc(r.confidence), esc(r.url),
    r.rating ?? '', r.reviews ?? '',
    ...Object.keys(WEIGHTS).map((k) => r.parts[k].raw),
    esc(r.affordability), esc(r.risks), esc(r.concept), esc(r.sources),
  ].join(','))).join('\n') + '\n';
  await writeFile(path.join(root, 'research', 'prospect-database.csv'), csv);

  // ---- Markdown database ---------------------------------------------------
  const md = [];
  md.push('# Silicon Valley Website Opportunity Finder — prospect database', '', `Generated ${new Date().toISOString().slice(0, 10)}`, '');
  md.push('## Method', '', 'Every record in this file was reached through public-directory research (Yelp, Google Business listings surfaced via aggregators such as Birdeye and Loc8Nearme, YellowPages, BBB, CSLB licence data, city business listings, chambers of commerce, news and design features, and the business’ own web property where one exists).', '');
  md.push('Website status is classified into exactly five states and every classification carries its source list and a confidence level:', '');
  md.push('- **No website** — no domain surfaced across at least two independent directories; several also show a directory’s own "add website" affordance.', '- **Only social-media presence** — the business publishes on Instagram / Facebook / YouTube and owns no domain.', '- **Broken / inactive website** — the domain resolves to a parking page, a stale dev host or a dead template.', '- **Extremely outdated or basic website** — a live site that is a single page, a builder template, or abandoned since 2015-2018.', '- **Third-party directory page instead of a website** — the only "site" is a vendor-hosted profile (jewelershowcase, business.site, FASO, ordering template).', '');
  md.push('Confidence: **A** verified directly against a live source (page fetched) · **B** cross-checked across two or more independent directories · **C** single-source, live audit pending before outreach · **D** inference from directory signals (never used to claim a fact on a site).', '');
  md.push('Facts vs inferences: addresses, phone numbers, review counts and licence data are *verified from listings*; project-cost bands, staffing, and revenue signals are *inferences* used for scoring only, and appear in `Evidence of $10K+ capacity` — they are never rendered as claims on a generated site.', '');
  md.push('', '## Score model', '', '| Sub-score | Weight | Meaning |', '| --- | --- | --- |');
  for (const [k, cfg] of Object.entries(WEIGHTS)) md.push(`| ${cfg.label} | ${Math.round(cfg.w * 100)}% | ${cfg.why} |`);
  md.push('', `Total = Σ (sub-score ÷ 10 × weight) × 100. Average across the database: **${stats.average}**.`, '');
  md.push('## Summary', '');
  md.push(`- Businesses researched and qualified: **${stats.researched}**`, '- Website status breakdown:', ...Object.entries(stats.byStatus).map(([k, v]) => `  - ${k}: **${v}**`), `- Cities covered: ${Object.keys(stats.byCity).length}`, `- Design systems in use: ${Object.keys(stats.bySystem).length}`, '', '### By city', '', '| City | Prospects |', '| --- | --- |', ...Object.entries(stats.byCity).sort((a, b) => b[1] - a[1]).map(([c, n]) => `| ${c} | ${n} |`), '');
  md.push('## Ranking', '', '| # | Prospect | City | Category | Website status | Score | Tier |', '| --- | --- | --- | --- | --- | --- | --- |');
  for (const r of scored) md.push(`| ${r.rank} | [${r.name}](./prospect-database.md#${r.rank}-${slugify(r.name)}) | ${r.city} | ${r.cat} | ${r.status} | **${r.total}** | ${r.tier} |`);
  md.push('', '## Prospect profiles', '');
  for (const r of scored) {
    const b = rows.find((x) => x.slug === r.slug);
    md.push(`### ${r.rank}. ${r.name} <a id="${r.rank}-${slugify(r.name)}"></a>`, '');
    md.push(`**${r.total}/100 · ${r.tier}** · ${r.cat} · ${b.city}, CA ${b.zip}`, '');
    md.push('| | |', '| --- | --- |');
    md.push(`| Address | ${b.addr} |`);
    md.push(`| Phone | ${b.phone || '*not published in the listings reviewed — confirm at outreach*'} |`);
    md.push(`| Email | ${b.email || '*not public — do not invent*'} |`);
    md.push(`| Founded | ${b.founded} |`);
    md.push(`| Hours | ${b.hours || 'not published'} |`);
    md.push(`| Website | **${b.web.status}**${b.web.url ? ` — ${b.web.url}` : ''} (confidence: ${b.web.confidence}) |`);
    md.push(`| Reviews | ${b.reputation?.rating ?? 'n/a'}★ across ${b.reputation?.reviews ?? 'n/a'} (${b.reputation?.src ?? 'source'}) |`);
    md.push(`| Design system | ${b.design.label} (\`${b.design.system}\`) · hero: ${b.concept.hero} · signature: ${b.concept.signature} |`);
    md.push('');
    md.push(`**Evidence of web absence.** ${b.web.note}`, '');
    md.push(`**What they do.** ${b.description}`, '');
    md.push(`**Services.** ${b.services.join(' · ')}`, '');
    md.push(`**Audience.** ${b.audience}`, '');
    md.push(`**Positioning.** ${b.persona} — ${b.usps.join('; ')}. Differentiator: ${b.differentiators.join('; ')}`, '');
    md.push(`**Reputation notes.** ${b.reputation?.note || 'n/a'}`, '');
    md.push('');
    md.push(`**Evidence of $10K+ capacity.**`);
    for (const e of r.affordability) md.push(`- ${e}`);
    md.push('');
    md.push(`**Risks / disqualifiers to watch.**`);
    for (const e of r.risks) md.push(`- ${e}`);
    md.push('');
    md.push(`**Score breakdown.** ${Object.entries(r.parts).map(([k, v]) => `${WEIGHTS[k].label} ${v.raw}`).join(' · ')} → ${r.total}`, '');
    md.push(`**Website concept.** ${b.concept.dir}`, '');
    md.push(`*Typography:* ${b.design.fonts.display} over ${b.design.fonts.body}. *Palette:* ${b.concept.palette ? Object.entries(b.concept.palette).map(([k, v]) => `${k} ${v}`).join(', ') : b.design.tokens.ink + ' / ' + b.design.tokens.paper}. *Motion:* ${b.design.motion}. *Tone:* ${b.concept.tone}.`, '');
    md.push(`**Pages.** ${b.pages.map((p) => `\`${p.path}\``).join(' ')}`, '');
    md.push(`**Sources.** ${b.sources.map((s) => `[${safeHost(s)}](${s})`).join(' ') || 'see notes'}`, '');
    if (b.sourceNotes?.length) md.push(`**Source notes.** ${b.sourceNotes.join(' · ')}`, '');
    md.push(`> Anything marked *confirm* is unverified: it must not be published on a live site until the client signs it off.`, '');
    md.push('---', '');
  }
  await writeFile(path.join(root, 'research', 'prospect-database.md'), md.join('\n'));

  await writeFile(path.join(root, 'research', 'top10.md'), [
    '# Top 10 prospects', '', `Ranked by Website Opportunity Score (see [the score model](./prospect-database.md#score-model)).`, '',
    '| # | Prospect | City | Status | Score | Why it ranks |', '| --- | --- | --- | --- | --- | --- |',
    ...scored.slice(0, 10).map((r) => `| ${r.rank} | **${r.name}** | ${r.city} | ${r.status} | ${r.total} | ${(r.affordability[0] || '').slice(0, 110)} |`),
    '', '## Outreach order', '', ...scored.slice(0, 10).map((r) => `${r.rank}. **${r.name}** — ${r.status.toLowerCase()}${r.url ? ` (${r.url})` : ''}; lead with: ${(r.concept || '').split('.')[0]}.`),
  ].join('\n') + '\n');

  console.log(`score: ${scored.length} prospects ranked, average ${stats.average} → data/scored.json, research/prospect-database.{csv,md}`);
  for (const r of scored.slice(0, 10)) console.log(`  #${String(r.rank).padStart(2)} ${String(r.total).padStart(5)}  ${r.name} (${r.status})`);
}

function safeHost(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return 'source'; } }

function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

await main();
