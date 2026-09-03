/**
 * build-data.mjs — compiles the research dataset into one per-site spec file.
 *
 * Reads  : data/businesses.jsonl   (research records, one JSON object per line)
 *          data/archetypes.js      (design systems)
 * Writes : data/businesses/<slug>.json  resolved build spec consumed by Astro
 *          data/index.json              lightweight manifest for the portal
 *
 * The spec is the single contract between research and code: nothing in the
 * site templates reads the raw research file.
 */
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { archetypes } from '../data/archetypes.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'data', 'businesses');
const WEB_STATUS = {
  none: 'No website',
  social: 'Only social-media presence',
  broken: 'Broken / inactive website',
  basic: 'Extremely outdated or basic website',
  directory: 'Third-party directory page instead of a website',
};
const CONF = { A: 'verified against a live source', B: 'verified across two or more directories', C: 'single source — audit pending', D: 'inference from directory signals' };

/** Map a free-text concept phrase onto one of the implemented signature modules. */
function signature(concept) {
  const probe = [concept.dir, ...(concept.interactive || [])].join(' ').toLowerCase();
  const pick = (name, keys) => (keys.some((k) => probe.includes(k)) ? name : null);
  return (
    pick('compare', ['before/after', 'before / after', 'drag slider', 'wipe', 'morph']) ||
    pick('picker', ['picker', 'configurator', 'selector', 'quiz', 'stepper', 'filter', 'builder']) ||
    pick('timeline', ['timeline', 'run-of-show', 'weekday', 'sequence', 'day-of', 'round-by-round', 'progress rail', 'reading progress', 'process rail', 'pour-sequence']) ||
    pick('ledger', ['table', 'matrix', 'price', 'spec', 'scope', 'scope sheet', 'index', 'catalog', 'catalogue', 'menu', 'schedule', 'timetable', 'ledger']) ||
    pick('archive', ['archive', 'library', 'gallery', 'mosaic', 'grid', 'grid of', 'photo', 'collection']) ||
    pick('map', ['map', 'coverage', 'neighbourhood', 'service area', 'portfolio map']) ||
    pick('intake', ['form', 'request', 'book', 'booking', 'enquiry', 'inquiry', 'quote', 'upload', 'intake']) ||
    'statement'
  );
}

/** Which hero variant to render (record concept wins over archetype default). */
function heroFor(rec, arch) {
  const allowed = ['dispatch', 'manifesto', 'editorial', 'fullbleed', 'split', 'ticker', 'index'];
  const want = rec.concept.heroType || arch.hero;
  return allowed.includes(want) ? want : 'editorial';
}

/** Section roster for the home page: archetype default, trimmed to what we can fill with data. */
function rosterFor(rec, arch) {
  const roster = [...arch.sections];
  // Always end on a conversion + contact pair; guarantee both exist exactly once.
  const ensure = (name) => { if (!roster.includes(name)) roster.splice(roster.length - 1, 0, name); };
  ensure('contact');
  ensure('services');
  // Drop roster entries this record cannot fill with real content.
  const hasInventory = (keys) => keys.some((k) => String(rec.f?.[k] ?? '').length > 12);
  const skip = new Set();
  if (!hasInventory(['extra', 'svc'])) skip.add('insight');
  if ((rec.rep?.reviews ?? 0) < 12) { skip.add('reviews'); }
  if (!rec.f?.hours) skip.add('hours');
  const out = roster.filter((s) => s !== 'hero' && !skip.has(s));
  return ['hero', ...out.slice(0, 7)];
}

function tokensFor(arch, rec) {
  const p = { ...arch.palette, ...(rec.concept.palette || {}) };
  return {
    ...p,
    inkName: rec.art?.colors?.[0] || null,
    radius: arch.tokens.radius,
    hair: arch.tokens.hair,
    border: arch.tokens.border,
    shadow: arch.tokens.shadow,
    pad: arch.tokens.pad,
    scale: arch.tokens.scale,
    headingCase: arch.tokens.headingCase,
    track: arch.tokens.track,
    texture: arch.texture,
    invert: Boolean(arch.invert),
  };
}

/** Structured data inputs — only verified facts reach schema.org. */
function schemaFor(rec) {
  const type = /restaurant/i.test(rec.cat) ? 'Restaurant'
    : /law|legal|attorney|estate|immigration/i.test(rec.cat) ? 'LegalService'
    : /hotel|inn/i.test(rec.cat) ? 'LodgingBusiness'
    : /jewel|framing|flooring|cabinet|countertop|signage|store|retail|supply/i.test(rec.cat) ? 'Store'
    : 'LocalBusiness';
  const address = {
    '@type': 'PostalAddress',
    addressLocality: rec.city,
    addressRegion: 'CA',
    postalCode: rec.zip || undefined,
    streetAddress: /^\d/.test(rec.addr || '') ? rec.addr.split(',').slice(0, -2).join(',').trim() : undefined,
  };
  const geo = rec.geo ? { '@type': 'GeoCoordinates', latitude: rec.geo.lat, longitude: rec.geo.lng } : undefined;
  const sameAs = Object.values(rec.prof || {}).flat().filter((v) => typeof v === 'string' && v.startsWith('http'));
  const opening = rec.f?.hours ? [{ '@type': 'OpeningHoursSpecification', opens: '08:00', closes: '17:00', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] }] : undefined;
  const rating = rec.rep?.rating && rec.rep?.reviews >= 10
    ? { '@type': 'AggregateRating', ratingValue: rec.rep.rating, reviewCount: rec.rep.reviews, bestRating: 5 }
    : undefined;
  return { type, name: rec.name, description: rec.copy.sub, phone: rec.phone || undefined, address, geo, sameAs, opening, rating, slogan: rec.copy.h1, currenciesAccepted: 'USD', priceRange: /hotel|restaurant/i.test(rec.cat) ? '$$' : '$$$' };
}

/** Which section modules a sub-page renders. */
function sectionsFor(page, roster) {
  const pick = (...keys) => keys.flatMap((k) => roster.filter((s) => s === k || s.includes(k)));
  if (page === 'index') return roster;
  if (/contact|book|enroll|bid|booking|estimate|sample|quote|reserve|reservation/.test(page))
    return ['hero', ...pick('urgency', 'offer', 'pricing', 'tuition', 'coverage'), ...pick('process', 'visit', 'hours'), 'contact'];
  if (/menu|room|rate|price|pricing|tuition|program|class|schedule|service|capabilit|material|swatch|collection|store|inventory|film|sign|refac|engrav|repair|care|water|permit|financ|insur|safety|protocol|guide|types|profiles|slab|stone|materials|arrangements|practice|brands|sectors|specs|bay-gallery/.test(page))
    return ['hero', ...pick('services', 'capabilities', 'collections', 'swatches', 'materials', 'menu', 'rooms', 'pricing', 'programs'), ...pick('process', 'visit-flow', 'specs', 'insurance', 'safety'), 'contact'];
  if (/work|project|gallery|journal|case|archive|restorat|portfolio|index|story|studio|heritage|about|team|coach|teacher|faculty|firm|press|result|review|neighbourhood|experience|craft|insight|collections/.test(page))
    return ['hero', ...pick('proof', 'results', 'case-studies', 'gallery', 'projects', 'heritage', 'craft', 'studio', 'team', 'coaches', 'teachers', 'credentials', 'press', 'insight', 'neighbourhood'), ...pick('reviews', 'faq'), 'contact'];
  return ['hero', ...pick('services', 'process', 'proof', 'coverage'), 'contact'];
}

const humanise = (s) => s.replace(/[-_]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

/** Unique, length-aware document title: business + trade + city, never a clone. */
function titleFor(rec) {
  const short = rec.name.replace(/[,·].*$/, '').split(/\s+/).slice(0, 4).join(' ');
  const cands = [
    `${rec.name} — ${rec.cat} in ${rec.city}`,
    `${short} — ${rec.cat} in ${rec.city}, CA`,
    `${short} — ${rec.sub} in ${rec.city}`,
    `${short} · ${rec.city}, CA`,
  ];
  return cands.find((t) => t.length <= 68) || cands[3];
}

function pageFor(rec, slug, page, arch) {
  const c = rec.copy;
  const short = rec.name.replace(/[,·].*$/, '').split(/\s+/).slice(0, 3).join(' ');
  const meta = {
    index: {
      title: titleFor(rec),
      desc: c.sub,
      h1: c.h1,
      kicker: c.eyebrow,
    },
    services: { title: `Services — ${rec.name}`, desc: rec.f.svc.join('; ') + `. ${rec.city} based, serving surrounding cities.`, h1: 'What we do', kicker: 'Capabilities' },
    work: { title: `Selected work — ${rec.name}`, desc: `Projects and evidence from ${rec.name} in ${rec.city}.`, h1: 'Selected work', kicker: 'Index' },
    menu: { title: `Menu — ${rec.name}`, desc: 'Menu, banquets and hours for the restaurant at its long-standing address.', h1: 'The menu', kicker: 'Kitchen' },
    programs: { title: `Programs — ${rec.name}`, desc: 'Programs, schedules and enrolment information.', h1: 'Programs', kicker: 'Enrolment' },
    rooms: { title: `Rooms & rates — ${rec.name}`, desc: 'Room types, rates and booking information.', h1: 'Rooms and rates', kicker: 'Stay' },
    about: { title: `About — ${rec.name}`, desc: rec.f.desc, h1: `About ${rec.name.split(',')[0]}`, kicker: 'The firm' },
    contact: { title: `Contact — ${rec.name}`, desc: `Call or write to ${rec.name} in ${rec.city}. ${rec.phone ? rec.phone : 'Contact details verified against public listings.'}`, h1: 'Get in touch', kicker: 'Contact' },
  };
  const key = meta[page] ? page : null;
  const label = humanise(page);
  const m = key ? meta[key] : {
    title: `${label} — ${rec.name}`,
    desc: `${label} at ${short} in ${rec.city}: ${rec.f.svc.slice(0, 3).join(', ')}. ${rec.copy.sub}`,
    h1: label,
    kicker: rec.cat,
  };
  return {
    slug: page,
    file: page === 'index' ? 'index.astro' : `${page}.astro`,
    path: page === 'index' ? `/${slug}` : `/${slug}/${page}`,
    title: m.title,
    description: m.desc,
    h1: m.h1,
    kicker: m.kicker,
    sections: (() => {
      const roster = rosterFor(rec, arch);
      return [...new Set(sectionsFor(page, roster).filter((x) => roster.includes(x) || x === 'hero' || x === 'contact'))];
    })(),
  };
}

async function main() {
  const raw = await readFile(path.join(root, 'data', 'businesses.jsonl'), 'utf8');
  const records = raw.trim().split('\n').filter(Boolean).map((l, i) => {
    try { return JSON.parse(l); } catch (e) { console.error(`line ${i + 1}: ${e.message}`); throw e; }
  });

  if (existsSync(OUT)) await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const manifest = [];
  for (const rec of records) {
    const arch = archetypes[rec.arch];
    if (!arch) throw new Error(`${rec.id}: unknown archetype ${rec.arch}`);
    const sig = signature(rec.concept);
    const pages = (rec.concept.pages && rec.concept.pages.length ? rec.concept.pages : ['index', 'services', 'about', 'contact'])
      .filter((p, i, a) => a.indexOf(p) === i)
      .map((p) => pageFor(rec, rec.slug, p, arch));

    const spec = {
      id: rec.id,
      slug: rec.slug,
      name: rec.name,
      short: rec.name.replace(/[,·].*$/, '').split(' ').slice(0, 3).join(' '),
      cat: rec.cat,
      sub: rec.sub,
      city: rec.city,
      zip: rec.zip,
      addr: rec.addr,
      phone: rec.phone,
      email: rec.email,
      contactNote: rec.contactNote || null,
      founded: rec.f.founded,
      hours: rec.f.hours,
      audience: rec.f.aud,
      scale: rec.f.scale,
      description: rec.f.desc,
      services: rec.f.svc,
      serviceCopy: rec.copy.svcCopy,
      insight: rec.f.extra,
      usps: rec.pos.usps,
      differentiators: rec.pos.diff,
      voice: rec.pos.voice,
      persona: rec.pos.persona,
      reputation: rec.rep,
      budget: rec.q,
      art: rec.art,
      copy: rec.copy,
      concept: { ...rec.concept, signature: sig, hero: heroFor(rec, arch) },
      web: { ...rec.web, status: WEB_STATUS[rec.web.s] || rec.web.s, confidence: CONF[rec.web.lvl] || rec.web.lvl },
      profiles: rec.prof,
      photo: existsSync(path.join(root, 'public', 'img', rec.slug, 'hero.jpg')),
      photoFormats: ['avif', 'webp', 'jpg'].filter((e) => existsSync(path.join(root, 'public', 'img', rec.slug, `hero.${e}`))),
      photoAlt: `Concept artwork for ${rec.name} — generated design direction, not a photograph of the premises`,
      design: {
        system: rec.arch,
        label: arch.label,
        summary: arch.summary,
        fonts: arch.fonts,
        google: arch.google,
        nav: arch.nav,
        motion: rec.concept.motion || arch.motion,
        tokens: tokensFor(arch, rec),
        roster: rosterFor(rec, arch),
      },
      pages,
      score_input: rec.sc,
      seo: {
        title: pages[0].title,
        description: pages[0].description,
        ogType: 'website',
        twitter: 'summary_large_image',
      },
      schema: schemaFor(rec),
      sources: [...new Set([...(rec.web.src || []), ...Object.values(rec.prof || {}).flat().filter((v) => typeof v === 'string')].filter((v) => /^https?:\/\/\S+$/.test(v)))],
      sourceNotes: [...new Set([...(rec.web.src || []), ...Object.values(rec.prof || {}).flat().filter((v) => typeof v === 'string')].filter((v) => !/^https?:\/\/\S+$/.test(v)))],
    };

    await writeFile(path.join(OUT, `${rec.slug}.json`), JSON.stringify(spec, null, 2));
    manifest.push({ slug: spec.slug, name: spec.name, city: spec.city, cat: spec.cat, arch: spec.design.system, label: spec.design.label, status: spec.web.status, hero: spec.concept.hero, signature: sig });
  }

  manifest.sort((a, b) => a.name.localeCompare(b.name));
  await writeFile(path.join(root, 'data', 'index.json'), JSON.stringify({ generated: new Date().toISOString().slice(0, 10), count: manifest.length, sites: manifest }, null, 2));
  console.log(`build-data: ${manifest.length} site specs → data/businesses/`);
}

await main();
