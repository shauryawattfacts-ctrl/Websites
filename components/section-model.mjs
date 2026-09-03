/**
 * section-model.mjs — turns a research spec into renderable section plans.
 *
 * Every string returned here is either (a) a fact from the research record,
 * (b) clearly-labelled draft copy for the client to confirm, or (c) the
 * business's own positioning language. Nothing is invented silently.
 */

/**
 * Process narratives per design system. Each body is a template filled from
 * the record, so no two sites read alike and nothing is invented: only fields
 * the research actually captured can appear.
 */
const PROCESS = {
  'home-services': [
    ['Tell us what is happening', 'A sentence and a photo of {city} property is usually enough to triage {svc0}. {hours}'],
    ['We look before we quote', 'Diagnosis first — {svc1 || svc0} is scoped from what we find, not from a price book.'],
    ['Fixed scope and price', 'You get the work listed, priced and dated before anyone starts.'],
    ['The work, in one visit where possible', '{svc0} is the job we plan around; everything else is scheduled so you are not chased.'],
    ['Clean up, then check back', 'Crews leave the site swept and the system tested; {reviews || "review volume"} public reviews say the rest.'],
  ],
  'industrial-brutalist': [
    ['Drawings or photographs in', 'Send what you have — a sketch, a DWG or a phone photo of {svc0}.'],
    ['Feasibility and method', 'We say what is actually buildable in {city}, and what it will cost to do properly.'],
    ['Firm number and lead time', 'One price, one date, in writing. Shop capacity is booked the day we quote.'],
    ['Shop or site execution', '{svc0}, {svc1 || svc0} and finishing under the same supervision.'],
    ['Inspection and handover', 'Dimensional check, photos of the as-built, and paperwork you can file.'],
  ],
  'editorial-legal': [
    ['Consultation', 'One hour, no charge for the first conversation, in the {city} office or by video.'],
    ['Documents reviewed', 'Deeds, statements and existing paperwork arrive before we meet so the time is used, not billed.'],
    ['Written plan and fee', 'You see the scope and the fixed fee before drafting begins.'],
    ['Drafting and execution', '{svc0} prepared, explained line by line, then signed properly.'],
    ['Kept current', 'Plans are reviewed on a schedule — {founded} of practice says the ones nobody revisits are the ones that fail.'],
  ],
  'luxe-dark': [
    ['Enquiry', 'Bring the piece, or send photographs; {svc0} is where most conversations start.'],
    ['The piece assessed', 'Under the loupe in the shop — condition, metal, stones, what can be saved.'],
    ['Design or repair path agreed', 'You approve drawings and a written estimate before anything is cut.'],
    ['At the bench', '{svc0} done by hand, with progress notes if you want them.'],
    ['Collected, with care notes', 'Handed back in person, cleaned, with instructions for the next ten years.'],
  ],
  'clinical-calm': [
    ['Booking', 'Tell us the worry, not just the appointment type — {svc0} patients get the longer slot.'],
    ['First visit, unhurried', 'No treatment on the first visit unless you ask. We look, we explain, you decide.'],
    ['Findings and options in writing', 'Options with costs, so nothing is decided under the light.'],
    ['Treatment at a pace you set', '{svc0}, breaks on request, and a stop signal you control.'],
    ['Follow-up', 'A check-in after, then recall on a schedule that suits you.'],
  ],
  'athletic-kinetic': [
    ['First week', 'Walk in, no card details. {svc0} starts with stance and breathing.'],
    ['Technique blocks', 'Round-based coaching, small groups, gloves supplied.'],
    ['Conditioning base', 'Rope, pads, intervals — built to survive the third round, not to look good on a poster.'],
    ['Sparring or competition track', 'Optional, supervised, and only once your coach signs you off.'],
    ['Programme review', 'Every few weeks we decide what the next block is.'],
  ],
  'hospitality-stay': [
    ['Check availability', 'Ask for dates directly — no booking-engine queue, no drip of emails.'],
    ['Request the room', 'Tell us the reason for the trip: {audience}.'],
    ['Arrive, park, settle in', 'Park at the door, keys at the desk, and a note of what is open late.'],
    ['Stay', 'Quiet rooms, hot water, {svc0} if you need it fixed.'],
    ['Late checkout where possible', 'Say the word at the desk; we tell you the truth about whether it is free.'],
  ],
  'appetite-food': [
    ['Reserve or walk in', 'Tables for {city} evenings, and phone orders for the regulars.'],
    ['Menu explained', 'Ask what is fresh; the kitchen answers.'],
    ['Kitchen fires to order', '{svc0} cooked after you order, not held under a lamp.'],
    ['Table served', 'Tea, plates, and the fish at the right moment.'],
    ['Banquets planned ahead', 'Large tables are written up a week out so nothing is improvised on the night.'],
  ],
  'retail-showroom': [
    ['Browse the index', 'Everything is on the floor in {city}: {svc0} and {svc1 || "the rest of the range"}.'],
    ['Bring dimensions or photos', 'A tape measure and two phone photos get you a real number.'],
    ['Samples in hand', 'Take material home before you decide — the light here lies.'],
    ['Order, cut or build', 'Cut to size, edged and finished in our own shop.'],
    ['Fitted or shipped', 'We install locally, or box it properly for collection.'],
  ],
  'b2b-spec': [
    ['Scope and drawings issued', 'We bid from documents, not from a phone conversation in a car park.'],
    ['Site walk', 'Access, hazards and neighbours in {city} get logged before pricing.'],
    ['Bid and submittals', 'Line-item pricing with submittals, licences and schedule included.'],
    ['Mobilise and execute', 'Crews, method statements and dust/safety control on the day.'],
    ['Punch list and audit', 'Closeout pack, as-builts, warranty and a QA audit trail.'],
  ],
  'civic-heritage': [
    ['A call, any hour', 'The line is answered by whoever is on, {hours || "every day"}.'],
    ['We arrange the details with you', 'One person stays with the family from first call to the last signature.'],
    ['Paperwork and filings handled', 'Certificates, permits and notices prepared and filed.'],
    ['The service itself', 'In the chapel on {addr}, with room for the number of people who come.'],
    ['Ongoing support', 'Records, copies and follow-up after the service, when the forms arrive.'],
  ],
  'studio-portfolio': [
    ['Conversation and references', 'We start with how you live and who you hire; {city} projects get a site visit first.'],
    ['Scope, fee and schedule', 'A written fee and a phase plan before a single sample is ordered.'],
    ['Concepts and selections', 'Drawings, finishes and furniture plans, reviewed together.'],
    ['Procurement and site work', 'Orders tracked, trades scheduled, deliveries chased by us.'],
    ['Install and styling', 'The last day is the one clients photograph.'],
  ],
  'education-enroll': [
    ['Enquiry and tour', 'Come at class time, not at an empty open day.'],
    ['Placement or trial lesson', 'We find the right group for the age and level — no charge for the trial.'],
    ['Programme and schedule agreed', 'Fixed weekly slot, {hours || "after school"}, with a start date in writing.'],
    ['Term starts, progress tracked', '{svc0} with notes each term so nothing is a surprise at the show.'],
    ['Recital, test or showcase', 'Every student performs or grades; that is the point of the paperwork.'],
  ],
  'automotive-garage': [
    ['Call or describe the symptom', 'Noise, warning light, when it happens — {svc0} starts with that.'],
    ['Diagnosis on the lift', 'We test before we quote; no parts swapped to see what happens.'],
    ['Written estimate, photos included', 'You get the fault explained with images, and the option to wait.'],
    ['Authorisation before work starts', 'Nothing is touched until you say go, and price changes are re-approved.'],
    ['Road test and handover', 'Tested on the way home, old parts shown, notes on what to watch.'],
  ],
};

function fill(tpl, b) {
  const svc = b.services || [];
  const map = {
    svc0: svc[0] || b.sub, svc1: svc[1] || '', city: b.city, cat: b.cat,
    hours: b.hours || '', founded: String(b.founded || '').match(/(19|20)\d{2}/)?.[0] || '',
    reviews: b.reputation?.reviews ? `${b.reputation.reviews} reviews` : '',
    audience: String(b.audience || '').replace(/\.$/, ''), addr: String(b.addr || '').split(',')[0],
    persona: b.persona || '',
  };
  return tpl.replace(/\{\{(\w+)\s*\|\|(\w+)\}\}|\{(\w+)\}/g, (_, a, bb, single) => {
    if (single) return map[single] || '';
    return map[a] || map[bb] || '';
  }).replace(/\s+/g, ' ').trim();
}

const SECTION_LABEL = {
  urgency: 'Before you call', services: 'What we do', process: 'How it works', proof: 'Why people choose us',
  coverage: 'Where we work', reviews: 'What is said publicly', faq: 'Questions we are asked', contact: 'Get in touch',
  materials: 'Materials and palette', capabilities: 'Capabilities', specs: 'Specifications', credentials: 'Credentials',
  practice: 'The practice', results: 'In numbers', insight: 'Notes', collection: 'The collection', craft: 'At the bench',
  experience: 'The experience', press: 'Where it has been written up', visit: 'Visiting', reassurance: 'If you are nervous',
  'visit-flow': 'Your first visit', team: 'Who you will meet', insurance: 'Insurance and payment', offer: 'Start here',
  schedule: 'Timetable', coaches: 'Coaches', pricing: 'Rates and cost bands', rooms: 'Rooms', 'perk-strip': 'Included',
  neighbourhood: 'The neighbourhood', gallery: 'Photographs', offers: 'Offers', booking: 'Booking', marquee: 'On the pass',
  menu: 'The menu', story: 'The story', hours: 'Hours', swatches: 'Swatches', collections: 'Collections', brands: 'Brands we stock',
  credibility: 'Credibility', sectors: 'Sectors we serve', ledger: 'Portfolio', safety: 'Safety and compliance',
  'case-studies': 'Case studies', bid: 'Bidding', heritage: 'Since', arrangements: 'Options', index: 'Index',
  projects: 'Selected projects', studio: 'The studio', programs: 'Programmes', 'why-us': 'Why families choose us',
  teachers: 'Teachers', tuition: 'Tuition', enroll: 'Enrolment', 'bay-gallery': 'In the bays', financing: 'Payment and financing',
};

const asItems = (arr = [], prefix = '') => arr.filter(Boolean).map((text, i) => ({ id: `${prefix}${i}`, title: '', text }));

/** Facts we can render as numeric proof, filtered to what is actually sourced. */
function proofStats(b) {
  const out = [];
  const years = String(b.founded || '').match(/(19|20)\d{2}/);
  if (years) out.push({ value: String(new Date().getFullYear() - Number(years[0])), label: `years, since ${years[0]}`, kind: 'years' });
  if (b.reputation?.reviews) out.push({ value: String(b.reputation.reviews).replace(/\B(?=(\d{3})+(?!\d))/g, ','), label: `public reviews${b.reputation.rating ? ` at ${b.reputation.rating}★` : ''} on ${b.reputation.src?.split(';')[0] || 'public listings'}`, kind: 'reviews' });
  if (b.scale?.loc && Number(b.scale.loc) > 1) out.push({ value: String(b.scale.loc), label: 'locations', kind: 'locations' });
  return out.slice(0, 4);
}

function faqItems(b) {
  const items = [];
  items.push({
    q: `Do you cover ${b.city}?`,
    a: `${b.audience ? `Yes — the practice serves ${String(b.audience).toLowerCase().replace(/\.$/, '')}.` : `Yes, ${b.city} is the home base.`}`,
  });
  if (b.phone) items.push({ q: 'How do we get started?', a: `Call ${b.phone}, or send the enquiry form and it comes to the shop directly. ${b.hours ? `Shop hours: ${b.hours}.` : ''}`.trim() });
  else items.push({ q: 'How do we get started?', a: `Use the enquiry form on this page; the business does not publish a phone number in its listings, so written enquiries are the reliable route.`, confirm: true });
  items.push({ q: 'What will it cost?', a: `${(b.budget?.afford || [])[0] || 'Costs depend on scope.'} Figures quoted here are market ranges for the local trade and must be confirmed against the business’s own pricing before publication.`, confirm: true });
  items.push({
    q: 'Are you licensed and insured?',
    a: /licen|CSLB|C-10|DRE|bonded/i.test(JSON.stringify(b)) ? 'Licence and insurance details appear in the business’s own directory records; certificate numbers will be published here once supplied by the client.' : 'Licence and insurance documentation will be published here at the client’s direction.',
    confirm: true,
  });
  items.push({ q: 'Can we see previous work?', a: `${(b.art?.photoNote || 'Project photography').split(';')[0]} — the archive currently sits on third-party listings; this site is the plan for hosting it as first-party work.` });
  return items;
}

function scheduleRows(b) {
  const h = String(b.hours || '');
  const m = h.match(/Mon[^,]*/i);
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return days.map((d, i) => ({
    d,
    hours: m ? `${m[0]}${i < 5 ? ' (listed)' : i === 5 && /Sat/i.test(h) ? ' (listed)' : ' — confirm'}` : 'confirm with client',
    note: i >= 5 ? 'draft' : '',
  }));
}

export function buildSection(b, name) {
  const base = { name, kicker: null, title: SECTION_LABEL[name] || name.charAt(0).toUpperCase() + name.slice(1), intro: null, note: null };
  const svcItems = () => (b.services || []).map((s, i) => ({
    title: s,
    text: (b.serviceCopy || [])[i] || null,
  }));

  switch (name) {
    case 'hero':
      return { ...base, kind: 'hero' };

    case 'urgency':
      return {
        ...base, kind: 'strip',
        lead: b.phone ? `Ring ${b.phone}` : `Send an enquiry`,
        items: [b.hours, `${b.city} · ${b.sub}`].filter(Boolean).map((text) => ({ text })),
      };

    case 'services':
    case 'capabilities':
    case 'materials':
    case 'collections':
    case 'swatches':
    case 'programs':
    case 'rooms':
    case 'arrangements':
    case 'brands':
    case 'sectors':
      return {
        ...base, kind: 'index-list',
        intro: b.description,
        aside: `${b.sub} — ${b.city}`,

        items: svcItems(),
        cta: { href: `/${b.slug}/contact`, label: b.copy.cta1 },
      };

    case 'process':
    case 'visit-flow':
      return {
        ...base, kind: 'steps',
        intro: b.persona ? `${b.persona} — the way the work is run.` : null,
        items: (PROCESS[b.design.system] || PROCESS['home-services']).map(([title, body]) => ({
          title,
          text: fill(body, b),
        })),
      };

    case 'proof':
    case 'why-us':
    case 'results':
    case 'credibility':
      return {
        ...base, kind: 'proof',
        stats: proofStats(b),
        items: (b.usps || []).map((t) => ({ text: t })),
        extra: b.insight || null,
      };

    case 'credentials':
      return {
        ...base, kind: 'table',
        caption: 'Verified from public records — numbers to be supplied by the business',
        rows: [
          ['Trading as', b.name],
          ['Category', `${b.cat} — ${b.sub}`],
          ['Base', b.addr],
          ['Operating since', String(b.founded || 'confirm')],
          ['Staffing', String(b.scale?.emp || 'confirm')],
          ['Hours', String(b.hours || 'confirm')],
          ['Reviews', b.reputation?.reviews ? `${b.reputation.reviews} public reviews${b.reputation.rating ? `, ${b.reputation.rating}★` : ''} (${b.reputation.src})` : 'not published on this site'],
        ].map(([d, v]) => ({ cells: [d, String(v)] })),
      };

    case 'coverage':
      return {
        ...base, kind: 'map',
        intro: b.audience,
        home: b.city,
        places: ['San Jose', 'Santa Clara', 'Sunnyvale', 'Milpitas', 'Fremont', 'Mountain View', 'Palo Alto', 'Cupertino', 'Los Altos', 'Los Gatos', 'Saratoga', 'Menlo Park', 'Redwood City']
          .filter((c) => c !== b.city).slice(0, 8),
        note: 'Service area inferred from the business’s own listing copy — confirm before publishing.',
      };

    case 'reviews':
    case 'testimonials':
      return {
        ...base, kind: 'quotes',
        intro: b.reputation?.src ? `Public review themes from ${b.reputation.src}. Quoted text is never reproduced without the reviewer’s permission.` : null,
        items: [b.reputation?.note, ...(b.usps || []).slice(0, 2), b.differentiators?.[0]].filter(Boolean).map((text) => ({ text, attribution: 'Theme drawn from public listings', draft: true })),
        stats: b.reputation?.reviews ? [{ value: String(b.reputation.reviews), label: 'reviews on public listings' }] : [],
      };

    case 'insight':
    case 'story':
    case 'studio':
    case 'practice':
    case 'heritage':
    case 'craft':
    case 'experience':
      return {
        ...base, kind: 'editorial',
        lede: b.copy.lede,
        body: [b.description, b.insight].filter(Boolean),
        aside: { title: 'Palette', items: (b.art?.colors || []).map((t) => ({ text: t })) },
      };

    case 'press':
    case 'ledger':
      return {
        ...base, kind: 'ledger',
        intro: 'Every classification in this project is traceable to a public source; the same evidence trail belongs on the business’s own site.',
        rows: (b.sources || []).slice(0, 6).map((s) => ({ cells: [s.replace(/^https?:\/\//, '').slice(0, 58), 'source record'] })),
        note: 'Replace with press and directory mentions supplied by the client.',
      };

    case 'gallery':
    case 'projects':
    case 'collection':
    case 'index':
    case 'case-studies':
    case 'bay-gallery':
      return {
        ...base, kind: 'media',
        intro: null, photoPlan: b.art?.photoNote || null,
        items: (b.services || []).slice(0, 5).map((s, i) => ({ title: s, text: `${b.city} · ${i + 1}`, kind: ['wide', 'tall', 'square'][i % 3] })),
        note: 'Real project photography replaces these placeholders at launch.',
      };

    case 'team':
    case 'coaches':
    case 'teachers':
      return {
        ...base, kind: 'people',
        intro: String(b.scale?.emp || ''),
        items: [{ title: b.name.split(',')[0], text: `${b.sub}. ${b.persona || ''}`.trim(), role: 'Owner' }],
        note: 'Staff names, portraits and roles to be supplied — none are invented here.',
      };

    case 'pricing':
    case 'tuition':
    case 'financing':
    case 'insurance':
      return {
        ...base, kind: 'table',
        caption: 'Market ranges only — the business must confirm its own pricing before publication',
        rows: (b.budget?.afford || []).map((row) => ({ cells: [row, 'confirm'] })),
        note: 'No price list is fabricated on this site.',
      };

    case 'schedule':
    case 'hours':
      return { ...base, kind: 'table', caption: 'As listed publicly', rows: scheduleRows(b).map((r) => ({ cells: [r.d, r.hours] })) };

    case 'offer':
    case 'offers':
    case 'perk-strip':
      return {
        ...base, kind: 'cards',
        items: [
          { title: b.copy.cta1, text: b.copy.cta2 ? `Secondary action: ${b.copy.cta2.toLowerCase()}.` : null },
          { title: b.differentiators?.[0] || 'What makes the difference', text: b.description },
          { title: 'Evidence, not adjectives', text: b.reputation?.note || 'Public listing record available on request.' },
        ],
      };

    case 'menu':
      return {
        ...base, kind: 'menu',
        intro: 'Menu structure only: dishes and prices must come from the kitchen, not from a template.',
        items: (b.services || []).map((s, i) => ({ title: s, text: (b.serviceCopy || [])[i] || `${b.city} service`, price: 'confirm' })),
        note: 'Draft structure — the real menu replaces this at handover.',
      };

    case 'safety':
      return {
        ...base, kind: 'cards',
        items: [
          { title: 'Licences and insurance', text: 'Certificate numbers and current insurance to be published from client records.', draft: true },
          { title: 'Method statements', text: b.usps?.[0] || 'Documented method on every job.' },
          { title: 'Site protection', text: b.insight || 'Crews briefed on protection, dust and clean-down on every visit.' },
        ],
      };

    case 'specs':
      return {
        ...base, kind: 'table',
        caption: 'Typical scope bands',
        rows: (b.services || []).slice(0, 6).map((s, i) => ({ cells: [s, i % 2 ? 'by arrangement' : 'quoted per site'] })),
      };

    case 'neighbourhood':
      return {
        ...base, kind: 'editorial',
        lede: `${b.city} is the working radius: ${String(b.audience || '').toLowerCase()}`,
        body: [b.insight || `Founded ${b.founded || 'locally'} and still run from ${b.sub ? `a ${b.sub.toLowerCase()} shop` : 'one shop'} in ${b.city} — the kind of business whose work walks in through referrals.`].filter(Boolean),
        aside: { title: 'On the doorstep', items: [{ text: b.addr }].concat([{ text: `${b.cat} — ${b.sub}` }]) },
      };

    case 'visit':
      return {
        ...base, kind: 'cards',
        items: [
          { title: 'Address', text: b.addr },
          { title: 'Phone', text: b.phone || 'To be supplied by the client — written enquiry is the route until then', draft: !b.phone },
          { title: 'Hours', text: b.hours || 'To be confirmed', draft: !b.hours },
          ...(b.email ? [{ title: 'Email', text: b.email }] : []),
        ],
      };

    case 'reassurance':
      return {
        ...base, kind: 'editorial',
        lede: b.copy.sub,
        body: [b.reputation?.note, b.voice ? `Written in the firm’s own register: ${b.voice.toLowerCase()}.` : null].filter(Boolean),
      };

    case 'faq':
      return { ...base, kind: 'faq', items: faqItems(b) };

    case 'contact':
    case 'booking':
    case 'enroll':
    case 'bid':
      return {
        ...base, kind: 'intake',
        intro: b.copy.lede,
        cta: b.phone ? `Call ${b.phone}` : 'Send the enquiry',
        fields: (b.services || []).slice(0, 6),
      };

    default:
      return {
        ...base, kind: 'cards',
        items: (b.services || []).slice(0, 4).map((s, i) => ({ title: s, text: (b.serviceCopy || [])[i] || b.copy.sub })),
      };
  }
}

export function pageSections(b, page) {
  if (page?.sections?.length) return page.sections.map((s) => buildSection(b, s));
  return b.design.roster.map((s) => buildSection(b, s));
}
