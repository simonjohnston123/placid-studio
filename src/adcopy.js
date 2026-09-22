// AD COPY for a short Placid Deals product video — written to be SPOKEN.
//
// The old generator stitched catalogue attributes into sentences, which is how
// it produced "Want a bed charcoal that adjustable sections head waist leg?".
// This one works like a person telling a mate about something they found:
//
//   HOOK -> WHY YOU'D WANT IT -> 2-4 KEY BENEFITS -> PRICE
//        -> SPECS/OPTIONS POINTER (if the product has them) -> PLACIDDEALS.COM
//
// The hook and the voiceover are separate (two boxes in the UI); spokenAd()
// joins them for the voice.
//
// Hard rules, all enforced in code rather than hoped for:
//   1. Nothing is invented. Every benefit comes from a line in the product's
//      own copy; the only additions are plain consequences of that line
//      ("separates into four pieces" -> "easier to store"). No colours, sizes,
//      stock, discounts or delivery promises the data doesn't give.
//   2. The title is never read out. The product is named once, briefly
//      ("this Artiss two-seater floor lounge"), then "it" / "this lounge".
//   3. Specs and variant lists are never read. If the product has them, the
//      viewer is pointed at the product page, in varied words.
//   4. Every sentence passes a spoken-language check before it is used:
//      would a real person say this out loud in an ad? If not, it's dropped.
//
// No AI model writes this: the studio runs free in the browser and the CRM's
// AI is tenant-funded. The rules below are the prompt.

const pick = (list, seen = null) => {
  const pool = list.filter(Boolean);
  const fresh = seen ? pool.filter(x => !seen.has(x)) : pool;
  const from = fresh.length ? fresh : pool;
  const out = from[Math.floor(Math.random() * from.length)];
  seen?.add(out);
  return out;
};

const SITE = 'PlacidDeals.com';
const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const w = n => { const i = parseInt(n, 10); return i >= 0 && i < NUM.length ? NUM[i] : String(n); };
const cap = s => String(s || '').replace(/^./, m => m.toUpperCase());
const lower = s => String(s || '').replace(/^./, m => m.toLowerCase());
const money = cents => (cents % 100 ? `$${(cents / 100).toFixed(2)}` : `$${cents / 100}`);

// ---------------------------------------------------------------------------
// Kept from before: small text fixes other modules use.
// ---------------------------------------------------------------------------

// Acronyms and model codes are read letter by letter and mean nothing to a
// shopper. Familiar ones stay; the rest are dropped from anything spoken.
const KNOWN = new Set(['LED', 'USB', 'HD', 'UHD', '4K', 'TV', 'UV', 'UPF', 'AC', 'DC', 'PVC', 'ABS', 'IP', 'XL', 'XXL', 'SUV', 'RV', 'PC', 'WIFI', 'BBQ']);

// Supplier feeds drop degree symbols ("bend up to 180"). Only fixed next to
// words that can only mean an angle — no units are invented elsewhere.
export function fixDegrees(text) {
  return String(text || '')
    .replace(/\b(\d{2,3})\s*(?=(flexibility|rotation|swivel|tilt|angle)\b)/gi, '$1 degree ')
    .replace(/\b(bends?|bending|folds?|rotates?|swivels?|tilts?)(\s+(?:up\s+)?to\s+)(\d{2,3})\b(?!\s*(degree|%|mm|cm|kg|w|v))/gi, '$1$2$3 degrees')
    .replace(/\s{2,}/g, ' ');
}

export function deJargon(text) {
  return String(text || '')
    .split(/\s+/)
    .filter(t => {
      const bare = t.replace(/[^A-Za-z0-9]/g, '');
      return !(/^[A-Z]{2,6}$/.test(bare) && !KNOWN.has(bare));
    })
    .join(' ')
    .replace(/\s+([.,:;!?])/g, '$1')
    .replace(/^[\s:;,.-]+/, '')
    .trim();
}

// ---------------------------------------------------------------------------
// WHAT IS IT? One or two plain words for the thing, and a family that decides
// which hooks and consequences make sense for it.
// ---------------------------------------------------------------------------

// Longest phrases first. [phrase in title, what we call it, family]
const NOUNS = [
  ['floor lounge', 'floor lounge', 'seat'], ['sofa bed', 'sofa bed', 'seat'], ['floor chair', 'floor chair', 'seat'],
  ['bean bag cover', 'bean bag cover', 'seat'], ['beanbag cover', 'bean bag cover', 'seat'], ['bean bag', 'bean bag', 'seat'],
  ['bean bag chair cover', 'bean bag cover', 'seat'], ['chair cover', 'chair cover', 'seat'],
  ['office chair', 'office chair', 'seat'], ['gaming chair', 'gaming chair', 'seat'], ['seat cushion', 'seat cushion', 'cushion'],
  ['recliner', 'recliner', 'seat'], ['armchair', 'armchair', 'seat'], ['ottoman', 'ottoman', 'seat'],
  ['sofa', 'sofa', 'seat'], ['couch', 'couch', 'seat'], ['lounge', 'lounge', 'seat'], ['chair', 'chair', 'seat'],
  ['bed frame', 'bed frame', 'bed'], ['mattress topper', 'mattress topper', 'bed'], ['mattress', 'mattress', 'bed'], ['pillow', 'pillow', 'bed'],
  ['stick vacuum', 'vacuum', 'clean'], ['robot vacuum', 'robot vacuum', 'clean'], ['vacuum', 'vacuum', 'clean'],
  ['steam mop', 'steam mop', 'clean'], ['mop', 'mop', 'clean'], ['glass wipers', 'glass wipers', 'clean'], ['wipers', 'wipers', 'clean'],
  ['pressure washer', 'pressure washer', 'clean'],
  ['beach tent', 'beach tent', 'outdoor'], ['tent', 'tent', 'outdoor'], ['gazebo', 'gazebo', 'outdoor'], ['umbrella', 'umbrella', 'outdoor'],
  ['fountain pump', 'fountain', 'garden'], ['fountain', 'fountain', 'garden'], ['bird bath', 'bird bath', 'garden'], ['planter', 'planter', 'garden'],
  ['dog collar', 'dog collar', 'pet'], ['dog bed', 'dog bed', 'pet'], ['pet bed', 'pet bed', 'pet'], ['cat tree', 'cat tree', 'pet'], ['collar', 'collar', 'pet'],
  ['kitchen timer', 'kitchen timer', 'kitchen'], ['timer', 'timer', 'kitchen'], ['air fryer', 'air fryer', 'kitchen'], ['kettle', 'kettle', 'kitchen'], ['blender', 'blender', 'kitchen'],
  ['headlamp', 'headlamp', 'light'], ['torch', 'torch', 'light'], ['floor lamp', 'floor lamp', 'light'], ['lamp', 'lamp', 'light'],
  ['manicure light', 'nail lamp', 'beauty'], ['nail lamp', 'nail lamp', 'beauty'],
  ['necklace', 'necklace', 'jewellery'], ['bracelet', 'bracelet', 'jewellery'], ['earrings', 'earrings', 'jewellery'],
  ['chalk bag', 'chalk bag', 'sport'], ['treadmill', 'treadmill', 'sport'], ['dumbbells', 'dumbbells', 'sport'],
  ['rug', 'rug', 'home'], ['stickers', 'stickers', 'home'], ['desk', 'desk', 'home'], ['table', 'table', 'home'], ['shelf', 'shelf', 'home'],
  ['fan', 'fan', 'home'], ['heater', 'heater', 'home'],
];

// House brands in the catalogue. A brand is only said when we're sure it is one.
const BRANDS = ['Artiss', 'Devanti', 'Keezi', 'Gardeon', 'Weisshorn', 'Midea', 'Giantz', 'Everfit', 'Bestway', 'Instahut',
  'Mountview', 'Oikiture', 'Levede', 'Cefito', 'Emajin', 'Alfordson', 'Spector', 'i.Pet', 'Giselle', 'Maxkon', 'Rovar', 'Jingle Jollys'];

/** The part of the title before the listing padding: "X with Y, Z | ..." -> "X". */
function titleHead(title) {
  return String(title || '').split(/\s[|–—-]\s|[|,(]|\s(?:with|for|featuring|including|suitable)\s/i)[0].trim();
}

function productNoun(card) {
  const head = ` ${titleHead(card.title).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ')} `;
  let best = null;
  for (const [phrase, say, family] of NOUNS) {
    const m = [...head.matchAll(new RegExp(` ${phrase.replace(/ /g, ' ')}s? `, 'g'))].pop();
    const at = m ? m.index : -1;
    // The thing is the LAST noun in the head: "Bean Bag Chair Cover" is a cover.
    if (at >= 0 && (!best || at + phrase.length > best.end || (at + phrase.length === best.end && phrase.length > best.len))) {
      best = { say, family, end: at + phrase.length, len: phrase.length };
    }
  }
  if (best && best.say === 'sofa bed' && head.includes(' floor lounge ')) best = { ...best, say: 'floor lounge' };
  if (!best) return { noun: 'one', family: 'generic', plural: false, known: false };
  return { noun: best.say, family: best.family, plural: /s$/.test(best.say) && !/ss$/.test(best.say), known: true };
}

function brandOf(card) {
  if (card.brand && String(card.brand).length < 30) return String(card.brand);
  const first = String(card.title || '').trim().split(/\s+/)[0] || '';
  return BRANDS.find(b => b.toLowerCase() === first.toLowerCase()) || null;
}

/** "this Artiss two-seater floor lounge" — said once, then never again. */
function spokenName(card, what) {
  const t = String(card.title || '');
  const bits = [];
  const brand = brandOf(card);
  if (brand) bits.push(brand);
  const seats = t.match(/\b(\d)[\s-]?seat(?:er)?\b/i);
  if (seats && what.family === 'seat') bits.push(`${w(seats[1])}-seater`);
  if (/\b(kids?|toddler|children'?s?)\b/i.test(t) && !/kid/.test(what.noun)) bits.push("kids'");
  bits.push(what.noun === 'one' ? 'find' : what.noun);
  return `${what.plural ? 'these' : 'this'} ${bits.join(' ')}`;
}

// ---------------------------------------------------------------------------
// WHAT DOES THE PRODUCT PAGE ACTUALLY SAY? Split the copy into prose, feature
// bullets and a spec section, the way the supplier lays it out.
// ---------------------------------------------------------------------------

const HEAD = {
  features: /^(key\s+)?features?\s*:?$|^highlights?\s*:?$|^this item stands out for the following characteristics\s*:?$/i,
  specs: /^(specifications?|specs|dimensions?|technical (details|specifications))\s*:?$/i,
  pack: /^(package|packaging)\s+(content|contents|includes?)\s*:?$|^in the box\s*:?$|^what'?s included\s*:?$/i,
  skip: /^(description|note|notes|warranty|shipping|delivery)\s*:?$/i,
};

function parseCopy(card) {
  const lines = String(card.description || '').split(/\n+/).map(l => l.trim()).filter(Boolean);
  if (String(card.description || '').length >= 1190) lines.pop(); // the feed cuts copy mid-line at ~1200 chars
  const out = { prose: [], bullets: [...(card.features || [])], hasSpecs: false };
  let mode = 'prose';
  for (const line of lines) {
    if (HEAD.features.test(line)) { mode = 'features'; continue; }
    if (HEAD.specs.test(line)) { mode = 'specs'; out.hasSpecs = true; continue; }
    if (HEAD.pack.test(line)) { mode = 'pack'; continue; }
    if (HEAD.skip.test(line)) { if (!/description/i.test(line)) mode = 'skip'; continue; }
    if (mode === 'features') out.bullets.push(line.replace(/^[-*•▪●✔✅]\s*/, ''));
    else if (mode === 'prose') out.prose.push(...line.split(/(?<=[.!?])\s+/).filter(s => /[.!]$/.test(s.trim())));
  }
  const all = `${card.title} ${card.description}`;
  // Specs or variants the voice must NOT read: a spec section, measurements,
  // capacities, or a title that lists sizes and colours.
  out.hasOptions = out.hasSpecs
    || /\b\d+(\.\d+)?\s*(cm|mm|m)\s*(x|×)\s*\d/i.test(all)
    || /\b(sizes?|colou?rs?|variants?|options?)\s+(available|to choose)|available in\b|random colou?r/i.test(all)
    || (String(card.title).match(/\|/g) || []).length >= 2;
  return out;
}

// ---------------------------------------------------------------------------
// FROM CATALOGUE LINE TO SPOKEN SENTENCE.
//
// Each rule recognises one kind of claim and says it the way a person would.
// A consequence ("so it's easy to move around") is only added where it follows
// from the line itself. `tag` stops two rules saying the same thing.
// ---------------------------------------------------------------------------

const listWords = s => {
  const parts = String(s).replace(/\s*(&|\band\b)\s*/gi, ',').split(/\s*,\s*/).map(p => p.trim().toLowerCase()).filter(Boolean);
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0] || '';
};

const RULES = [
  { tag: 'adjust', score: 8, re: /\b(\d+)[\s-]*(?:position|angle|level|stage)s?\b.*adjust|adjust\w*\s+(?:to\s+)?(\d+)\s+(?:positions|angles|levels)/i,
    say: (m, x) => `It adjusts to ${w(m[1] || m[2])} different positions${x.family === 'seat' ? ', so you can sit up or lie right back' : ''}.` },
  { tag: 'adjust', score: 8, re: /^adjustable\s+(.+?)(\s+sections?)?\.?$/i,
    say: (m, x) => `You can adjust the ${listWords(m[1])}${m[2] ? ' sections' : ''}${x.family === 'seat' ? ', so it works for sitting back, lounging or stretching right out' : ''}.` },
  { tag: 'store', score: 7, re: /\bsepara\w*\s+into\s+(\w+)\s+(?:parts|pieces|sections)/i,
    say: m => `It even separates into ${/^\d/.test(m[1]) ? w(m[1]) : m[1].toLowerCase()} pieces, which makes storing it much easier.` },
  { tag: 'fold', score: 6, re: /\bfold[- ]?out\b/i, say: (m, x) => (x.family === 'seat' ? 'It folds out flat when you want to stretch out.' : 'It folds out when you need it.') },
  { tag: 'fold', score: 5, re: /\b(foldable|folding|folds? (flat|away|up|down)|collapsible)\b/i, say: () => "It folds away when you're not using it." },
  { tag: 'battery', score: 8, re: /(?:up to\s+)?(\d+)\s*(?:-\s*)?(?:min|mins|minutes?)\b[^.]*?\b(run\s?time|runtime|battery)\b|\b(run\s?time|runtime|battery life)\s+(?:of\s+)?(?:up to\s+)?(\d+)\s*(?:min|minutes)/i,
    say: (m, x) => `You get up to ${m[1] || m[4]} minutes of run time${x.family === 'clean' ? ' on a charge' : ''}.` },
  { tag: 'cordless', score: 7, re: /\bcordless\b/i, say: (m, x) => (x.family === 'clean' ? "It's cordless, so there's no cord dragging behind you." : "It's cordless, so you're not stuck near a power point.") },
  { tag: 'wash', score: 6, re: /removable[^.]*?washable[^.]*?cover|removable[^.]*?cover[^.]*?washable|washable[^.]*?removable[^.]*?cover/i,
    say: (m, line) => (/machine[- ]?wash/i.test(m[0]) ? 'The cover comes off and goes straight in the washing machine.' : 'The cover comes off for a wash, too.') },
  { tag: 'wash', score: 4, re: /\bmachine[- ]?washable\b/i, say: () => "It's machine washable, too." },
  { tag: 'wash', score: 3, re: /\bremovable\b[^.]*\bcover\b/i, say: () => 'The cover comes off, too.' },
  { tag: 'modes', score: 5, re: /\b(\d+)\s*(?:adjustable\s+)?(suction|power|speed|cleaning|heat|heating|light|lighting|brightness|massage)\s+(modes?|settings?|levels?)/i,
    say: m => `There are ${w(m[1])} ${m[2].toLowerCase()} ${m[3].toLowerCase().replace(/s?$/, 's')} to choose from.` },
  { tag: 'modes', score: 4, re: /\b(\d+)\s+(?:different\s+)?(modes|settings)\b/i, say: m => `There are ${w(m[1])} ${m[2].toLowerCase()} to choose from.` },
  { tag: 'bin', score: 5, re: /(\d+(?:\.\d+)?)\s*l(?:itre|iter)?s?\b[^.]*?(dust\s*bin|bin|dust\s*cup|tank)[^.]*?less frequent emptying/i,
    say: m => `The ${m[1]} litre bin means you're emptying it less often.` },
  { tag: 'carry', score: 4, re: /\bcarry(ing)?\s+handle\b/i, say: () => "There's a carry handle, so it's easy to move around." },
  { tag: 'pocket', score: 3, re: /\b(side|rear|toy|storage)\s+pocket(?:\s+for\s+([a-z ]+?))?(?:\s+storage)?\.?$/i,
    say: m => (m[2] ? `There's a handy ${m[1].toLowerCase()} pocket for ${/^\w+$/.test(m[2].trim()) && !/s$/.test(m[2].trim()) ? `${m[2].trim()}s` : m[2].trim()}.` : "There's a handy storage pocket, too.") },
  { tag: 'slip', score: 3, re: /\banti[- ]?slip\s+(base|bottom|feet|backing)\b/i, say: m => `The anti-slip ${m[1].toLowerCase()} helps it stay put.` },
  { tag: 'assembly', score: 4, re: /\bno assembly\b|\bfully assembled\b|\barrives assembled\b/i, say: () => "There's no assembly needed, either." },
  { tag: 'glow', score: 5, re: /\bglow[- ]in[- ]the[- ]dark\b/i, say: () => 'It even glows in the dark.' },
  { tag: 'water', score: 4, re: /\b(waterproof|water[- ]?resistant|splash[- ]?proof|water[- ]?repellent)\b/i, say: m => `It's ${m[1].toLowerCase().replace(/\s+/g, '-')}, too.` },
  { tag: 'sun', score: 5, re: /\bUPF\s*(\d+)\+?/i, say: m => `It's rated UPF ${m[1]} for sun protection.` },
  { tag: 'setup', score: 5, re: /\bpop[- ]?up\b/i, say: () => "It's a pop-up design, so setting it up is quick." },
  { tag: 'people', score: 4, re: /\b(\d)\s*(?:-|–|to)\s*(\d)\s*(?:person|people)\b/i, say: m => `It fits ${w(m[1])} to ${w(m[2])} people.` },
  { tag: 'load', score: 3, re: /\b(?:hold|holds|support|supports|load[- ]bearing|weight capacity)[^.]*?(\d{2,3})\s*kg\b/i, say: m => `It holds up to ${m[1]} kilos.` },
  { tag: 'foam', score: 3, re: /\bmemory foam\b/i, say: () => "There's memory foam in there for extra comfort." },
  // Fitness gear: the claims live inside long catalogue sentences, not bullets.
  { tag: 'incline', score: 7, re: /\b(automatic|auto|power(ed)?|motori[sz]ed)\s+incline\b/i, say: () => "It's got automatic incline, so you can step up the workout without stopping." },
  { tag: 'cushion', score: 6, re: /\b(cushion(ed|ing)?|shock\s?(control|absorb\w*))\b[^.]*\b(belt|deck|running)\b|\b(belt|deck)\b[^.]*\bcushion/i,
    say: (m, x) => (/joint/i.test(m.input || '') ? "The running belt's cushioned, so it's easier on your joints." : "The running belt's cushioned for a more comfortable run.") },
  { tag: 'programs', score: 5, re: /\bprograms?\s+1\s+to\s+(\d+)\b|\b(\d+)\s+(?:preset\s+|built[- ]in\s+|workout\s+)*(?:workout\s+)?programs\b/i,
    say: m => `There are ${w(m[1] || m[2])} workout programs built in.` },
  { tag: 'apps', score: 5, re: /\b(zwift|kinomap|app compatib\w*|compatible with[^.]*app)/i,
    say: (m) => { const apps = [...new Set(((m.input || '').match(/\b(Zwift|Kinomap|FitShow|Kinomap|iFit)\b/gi) || []).map(a => a[0].toUpperCase() + a.slice(1).toLowerCase()))];
      return apps.length ? `It works with apps like ${apps.slice(0, 2).join(' and ')}.` : 'It works with fitness apps, too.'; } },
  { tag: 'motor', score: 3, re: /\bbrushless\s+motor\b/i, say: () => 'It runs on a brushless motor for a smooth run.' },
  { tag: 'light', score: 3, re: /\blightweight\b/i, say: () => "It's nice and lightweight." },
  { tag: 'charge', score: 3, re: /\b(usb[- ]?(c\s+)?rechargeable|rechargeable)\b/i, say: () => "It's rechargeable, too." },
  { tag: 'motion', score: 3, re: /\bmotion sensor\b/i, say: () => "It's got a motion sensor, too." },
  { tag: 'magnet', score: 3, re: /\bmagnetic\s+(base|back|mount)\b/i, say: m => `It's got a magnetic ${m[1].toLowerCase()}.` },
];

// Lines that are never worth saying out loud.
const NOT_SAYABLE = /\b(vacuum[- ]packed|packaging|expan(d|sion)|allow \d+|instruction|manual|x\s?\d+\b|\d+\s?x\b|package|warranty|certified|suitable for|use\b.*,|colou?r|grey|gray|black|white|pink|green|blue|red|beige|charcoal|navy|cream|brown|premium|high[- ]quality|material|fabric|polyester|corduroy|suede|plastic|stainless|steel)\b/i;
const FLUFF = /\b(groundbreaking|revolutionary|significant impact|state of the art|cutting[- ]edge|unparalleled|ultimate|perfect for every|amazing|incredible|elevate|seamless|effortless(ly)?)\b/i;

/** A catalogue line as something a person would say — or null. */
function sayLine(line, x, bullet = true) {
  const clean = fixDegrees(String(line).replace(/[✀-➿←-⇿⬀-⯿️•▪●★✔✅❌]/g, '').replace(/\s+/g, ' ').trim());
  if (!clean) return null;
  for (const r of RULES) {
    if (r.tag === 'fold' && !['seat', 'bed', 'outdoor', 'sport'].includes(x.family) && !/desk|table|shelf/.test(x.noun)) continue;
    if (r.tag === 'wash' && /cover/.test(x.noun)) continue;
    const m = clean.match(r.re);
    if (m) return { text: r.say(m, x), tag: r.tag, score: r.score };
  }
  if (!bullet) return null;
  if (NOT_SAYABLE.test(clean) || FLUFF.test(clean)) return null;
  const words = clean.replace(/[.!]$/, '').split(/\s+/);
  // A short noun phrase ("Wide armrests") becomes "It's got wide armrests."
  if (words.length >= 2 && words.length <= 5 && !/\d/.test(clean) && !/^(it|this|the|you|and|or|for|to)\b/i.test(clean)) {
    const phrase = lower(clean.replace(/[.!]$/, ''));
    const plural = /s$/.test(words[words.length - 1]) && !/ss$/.test(words[words.length - 1]);
    const article = plural ? '' : /^[aeiou]/i.test(phrase) ? 'an ' : 'a ';
    return { text: `It's got ${article}${phrase}.`, tag: `np:${words[words.length - 1].toLowerCase()}`, score: 1 };
  }
  return null;
}

/** A prose sentence from the page, kept only if it already sounds spoken. */
function sayProse(sentence, card, x) {
  let s = fixDegrees(String(sentence).trim());
  if (!s || FLUFF.test(s) || NOT_SAYABLE.test(s) || /\?$/.test(s)) return null;
  const words = s.split(/\s+/);
  if (words.length < 5 || words.length > 14 || (s.match(/,/g) || []).length > 1) return null;
  // It must not carry the title: any 3 title words in a row is the name being read out.
  const t = String(card.title).toLowerCase().split(/\s+/);
  const low = s.toLowerCase();
  for (let i = 0; i + 2 < t.length; i++) if (low.includes(t.slice(i, i + 3).join(' '))) return null;
  if (brandOf(card) && low.includes(brandOf(card).toLowerCase())) return null;
  // Only sentences that talk to the viewer or about what it does.
  if (!/\b(you|your|it|keeps|lets|means|makes|gives|helps)\b/i.test(s)) return null;
  // Verb-first catalogue fragments ("Makes perfectly round snowballs") need a subject.
  if (/^(makes|keeps|lets|gives|helps|holds|fits|works|stays|adds)\b/i.test(s)) s = `It ${lower(s)}`;
  return { text: /[.!?]$/.test(s) ? s : `${s}.`, tag: `prose:${words[0].toLowerCase()}`, score: 2 };
}

/** The 2-4 strongest things to say, best first, no two saying the same thing. */
function benefits(card, x) {
  const copy = parseCopy(card);
  const found = [];
  const tags = new Set();
  const add = b => { if (b && !tags.has(b.tag) && !found.some(f => f.text === b.text)) { tags.add(b.tag); found.push(b); } };
  for (const line of copy.bullets) add(sayLine(line, x));
  // The prose often states the best benefit and has no bullets at all.
  for (const s of copy.prose) {
    const byRule = sayLine(s, x, false);
    if (byRule && byRule.score > 1) add(byRule);
  }
  if (found.filter(f => f.score > 1).length < 2) for (const s of copy.prose) add(sayProse(s, card, x));
  return { list: found.sort((a, b) => b.score - a.score).slice(0, 4), copy };
}

// ---------------------------------------------------------------------------
// THE SPOKEN-LANGUAGE CHECK. Every sentence has to pass this before it is used:
// would a real person say it out loud in an ad? A sentence that fails is
// dropped, not patched — a gap is better than a catalogue line.
// ---------------------------------------------------------------------------

const ROBOTIC = /\b(introducing|this product features|this product|here is the solution|here'?s the fix|the solution is|features include|boasts|comes equipped|is equipped with|ideal for|perfect for|high[- ]quality|premium|state[- ]of[- ]the[- ]art|meet the|sorted\.)\b/i;

export function sayable(sentence, card) {
  const s = String(sentence || '').trim();
  if (!s) return false;
  const words = s.split(/\s+/);
  if (words.length > 22) return false;                        // too long to say in one breath
  if (/[:;|()[\]{}\/\\#*_=<>]/.test(s)) return false;          // catalogue punctuation
  if (/\d+\s*(x|×)\s*\d+/i.test(s)) return false;              // dimensions
  if ((s.match(/\d+(\.\d+)?/g) || []).length > 2) return false; // spec soup
  if (ROBOTIC.test(s) || FLUFF.test(s)) return false;
  if (/\b(\w+)\s+\1\b/i.test(s)) return false;                 // "the the", "bed bed"
  if (/\b[A-Z]{2,}\b/.test(s.replace(/\b(UPF|LED|USB|UV|TV|HD|4K|BBQ)\b/g, ''))) return false; // shouting / codes
  if (card) {
    const t = String(card.title).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
    const low = s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
    for (let i = 0; i + 3 < t.length; i++) if (low.includes(t.slice(i, i + 4).join(' '))) return false; // reading the title
  }
  return true;
}

// ---------------------------------------------------------------------------
// THE HOOK. A question or a nudge an Australian would actually say — problem,
// benefit, curiosity or use — never the product title.
// ---------------------------------------------------------------------------

function hookOptions(card, what, has) {
  const n = what.noun;
  const kids = /\b(kids?|toddler|children)\b/i.test(card.title);
  const f = what.family;
  const out = [];
  if (f === 'seat') {
    if (has.adjust) out.push('Need somewhere to kick back that you can actually adjust to suit you?');
    if (has.store || has.fold) out.push("Need somewhere to kick back that doesn't take up half the room?");
    if (kids) out.push("Want a comfy little spot that's just for the kids?", 'Need somewhere comfy for the little ones to chill out?');
    else out.push('Need a comfy spot to put your feet up?', 'Want a proper spot to kick back after a long day?');
  } else if (f === 'cushion') {
    out.push('Spend most of the day sitting down?', 'Is your chair getting uncomfortable by the afternoon?');
  } else if (f === 'bed') {
    out.push("Not sleeping as well as you'd like?", "Reckon it's time your bed got an upgrade?");
  } else if (f === 'clean') {
    if (/vacuum/.test(n)) {
      if (has.cordless) out.push('Still dragging the big vacuum out just to clean one little mess?', 'Still wrestling with a vacuum cord?');
      if (has.battery) out.push("Want a vacuum that won't give up halfway through the house?");
      out.push('Sick of lugging a heavy vacuum around the house?');
    } else out.push('Want cleaning to be a bit less of a chore?', 'Looking for an easier way to keep things clean?');
  } else if (f === 'outdoor') {
    out.push('Heading to the beach this summer?', 'Want a bit of proper shade when you head out?');
  } else if (f === 'garden') {
    out.push('Want to give the garden a bit of life?', "Okay, this is actually pretty handy if you've got a backyard.");
  } else if (f === 'pet') {
    out.push(/dog/i.test(card.title) ? 'Want something a bit special for your dog?' : 'Got a pet that deserves a treat?');
  } else if (f === 'kitchen') {
    out.push(/timer/.test(n) ? 'Always losing track of time in the kitchen?' : 'Want one less thing to think about in the kitchen?');
  } else if (f === 'light') {
    out.push(/head/.test(n) ? 'Need both hands free when it gets dark?' : 'Need a bit more light where it counts?');
  } else if (f === 'beauty') {
    out.push('Doing your nails at home?', 'Want salon-style nails without leaving the house?');
  } else if (f === 'jewellery') {
    out.push('Looking for a little something special?', 'After a gift that feels a bit different?');
  } else if (f === 'sport') {
    out.push('Getting serious about your training?', 'Want gear that keeps up with you?');
  }
  if (what.known) out.push(what.plural ? `Been after some new ${n}?` : `Been after a new ${n}?`, `Okay, this ${what.plural ? 'is' : 'one is'} actually pretty handy.`);
  else out.push('Found something pretty handy for around the home.', "Here's one worth a look.");
  return out;
}

export function hookFor(card) {
  const what = productNoun(card);
  const has = Object.fromEntries(benefits(card, what).list.map(b => [b.tag, true]));
  const options = hookOptions(card, what, has).filter(h => sayable(h, card) && h.split(/\s+/).length <= 14);
  // The first options are the ones fitted to this product's real benefits; lean on them.
  return Math.random() < 0.7 ? options[0] : pick(options);
}

// ---------------------------------------------------------------------------
// THE VOICEOVER.
// ---------------------------------------------------------------------------

const OPTIONS_POINTERS = [
  `There are a few options available, so check the full details at ${SITE}.`,
  `Have a look at ${SITE} for the available options and full specifications.`,
  `There's more than one option, so pick the right one at ${SITE}.`,
];
const SIZE_POINTERS = [
  `Want to check the sizing and specs? You'll find everything on the product page at ${SITE}.`,
  `Check ${SITE} to make sure the size and options are right for you.`,
  `Check the sizing and full specs on the product page at ${SITE}.`,
];
const SPECS_POINTERS = [
  `Want the full specs? They're all on the product page at ${SITE}.`,
  `You'll find the full details and specs at ${SITE}.`,
  `Check out the full details at ${SITE}.`,
  `For all the details, have a look at ${SITE}.`,
];
const CLOSES = [
  `Check it out at ${SITE}.`,
  `Grab yours at ${SITE}.`,
  `Find it at ${SITE}.`,
  `Have a look at ${SITE}.`,
];

export function productScript(card, { hook = null } = {}) {
  const seen = new Set();
  const what = productNoun(card);
  const name = spokenName(card, what);
  const { list, copy } = benefits(card, what);

  // 1. WHY YOU'D WANT IT — name it once, lightly.
  const intro = pick(what.known
    ? [`Check out ${name}.`, `Have a look at ${name}.`, `Take a look at ${name}.`]
    : ['Check this out.', 'Have a look at this.'], seen);

  // 2. KEY BENEFITS — two to four, strongest first, each one sayable.
  let points = list.map(b => b.text).filter(s => sayable(s, card));
  // A single weak "It's got …" line alone sounds like a feed; keep only if there's company.
  if (points.length > 1) points = points.filter((p, i) => i < 2 || !/^It's got /.test(p));
  // Two lines making the same point ("no scratches" twice) — keep the first.
  const content = s => new Set((s.toLowerCase().match(/[a-z]{5,}/g) || []).filter(x => !['there', 'handy', 'which', 'makes'].includes(x)));
  points = points.filter((p, i) => !points.slice(0, i).some(q => [...content(p)].filter(x => content(q).has(x)).length >= 2));
  points = points.slice(0, 4);
  // "…, too." only makes sense once something has already been said.
  if (points[0]) points[0] = points[0].replace(/,\s*(too|either)\.$/, '.');
  if (what.plural) points = points.map(p => p.replace(/^It's\b/, "They're").replace(/^It\b/, 'They').replace(/^It even\b/, 'They even'));

  // 3. PRICE — only the real current price.
  const priced = card.priceCents && card.availability !== 'out_of_stock' && card.availability !== 'discontinued';
  const price = priced ? pick(what.plural
    ? [`They're ${money(card.priceCents)}.`, `You can grab them for ${money(card.priceCents)}.`]
    : [`This one's ${money(card.priceCents)}.`, `It's ${money(card.priceCents)}.`, `You can grab it for ${money(card.priceCents)}.`], seen) : null;

  // TRUE scarcity only: the shop's own count, and only when it's genuinely low.
  const stock = typeof card.stockQuantity === 'number' && card.stockQuantity > 0 && card.stockQuantity <= 5
    ? `There are only ${w(card.stockQuantity)} left.` : null;

  // 4. SPECS / OPTIONS — never read them; point at the page, in varied words.
  // That pointer already ends on the site, so it doubles as the close.
  const text = `${card.title} ${card.description}`;
  const pointer = !copy.hasOptions ? null : pick(
    /\b(sizes?|sizing|dimensions?)\b/i.test(text) ? SIZE_POINTERS
      : /\b(colou?rs? (available|to choose)|variants?|options? available|available in)\b/i.test(text) ? OPTIONS_POINTERS
        : SPECS_POINTERS, seen);
  const close = pointer || pick(CLOSES, seen);

  const lines = [intro, ...points, price, stock, close].filter(Boolean).filter(s => sayable(s, card) || s === close);
  // If the hook already made a point, don't make it again straight away.
  const hookWords = new Set(String(hook || '').toLowerCase().match(/[a-z]{5,}/g) || []);
  const final = lines.filter((s, i) => {
    if (i === 0 || s === close || s === price || s === stock) return true;
    const words = (s.toLowerCase().match(/[a-z]{5,}/g) || []);
    return !words.length || !words.every(x => hookWords.has(x));
  });
  return final.join(' ').replace(/\s{2,}/g, ' ').trim();
}

/**
 * Is there enough true, sayable material for an honest ad? The hourly engine
 * refuses a product that fails this rather than padding the script: an ad
 * that only says "Check out this chalk bag" sells nothing and says nothing.
 */
export function adReadiness(card) {
  const what = productNoun(card);
  const { list } = benefits(card, what);
  const good = list.filter(b => sayable(b.text, card));
  const reasons = [];
  if (!what.known) reasons.push("can't tell what the product is from its title");
  if (good.length < 2) reasons.push(`only ${good.length} sayable benefit${good.length === 1 ? '' : 's'} in the product copy (need 2)`);
  if (!card.priceCents) reasons.push('no current price');
  return { ok: !reasons.length, noun: what.noun, family: what.family, benefits: good.map(b => b.text), reasons };
}

/**
 * The social caption and hashtags. Short, human, and never the catalogue
 * description: the hook, one real benefit, the price, and the link.
 *
 * Hashtags come from what the product IS and from demand terms we were given —
 * a trend term is only used when it shares a word with the product, so a
 * trending topic never gets bolted onto something it has nothing to do with.
 */
export function productPost(card, hook, { trendTerms = [] } = {}) {
  const what = productNoun(card);
  const best = benefits(card, what).list.map(b => b.text).find(s => sayable(s, card)) || null;
  const priced = card.priceCents && card.availability !== 'out_of_stock' && card.availability !== 'discontinued';
  const lines = [hook, best, priced ? `${money(card.priceCents)} at ${SITE}` : `Have a look at ${SITE}`, card.url].filter(Boolean);

  const tag = s => `#${String(s).toLowerCase().replace(/[^a-z0-9]+/g, '')}`;
  const own = new Set([...what.noun.split(/\s+/), what.noun.replace(/\s+/g, '')].filter(x => x.length > 3 && x !== 'find'));
  const FAMILY = { seat: ['homedecor', 'livingroom'], bed: ['bedroom', 'sleep'], clean: ['cleaninghacks', 'cleantok'], outdoor: ['outdoors', 'summer'],
    garden: ['garden', 'backyard'], pet: ['dogsofinstagram', 'pets'], kitchen: ['kitchen', 'kitchenhacks'], light: ['camping', 'outdoors'],
    beauty: ['nails', 'beauty'], jewellery: ['jewellery', 'giftideas'], sport: ['fitness'], home: ['homehacks'], cushion: ['workfromhome', 'comfort'] };
  const words = new Set([...own, ...String(card.title).toLowerCase().match(/[a-z]{4,}/g) || []]);
  const trends = trendTerms
    .map(t => String(t).toLowerCase().trim())
    .filter(t => t && t.length <= 30 && t.split(/\s+/).some(x => x.length > 3 && words.has(x)))
    .slice(0, 2);
  const hashtags = [...new Set(['#placiddeals', '#australia', ...[...own].map(tag), ...(FAMILY[what.family] || []).map(tag), ...trends.map(tag), '#tiktokmademebuyit'])]
    .filter(h => h.length > 2).slice(0, 8);
  return { caption: `${lines.join('\n')}\n\n${hashtags.join(' ')}`, hashtags };
}

/** Hook + voiceover as one line for the voice, with the site said as words. */
export function spokenAd(hook, script) {
  const h = String(hook || '').trim();
  const s = String(script || '').trim();
  const joined = !h || s.startsWith(h) ? s : `${h}${/[.!?]$/.test(h) ? '' : '.'} ${s}`;
  return forSpeech(joined);
}

/** What the voice should say for things that are written differently. */
export function forSpeech(text) {
  return String(text || '')
    .replace(/\bplaciddeals\.com\b/gi, 'Placid Deals dot com')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** The on-screen caption: short name and price, nothing that needs reading twice. */
export const productCaption = card => ({
  title: titleHead(card.title).split(/\s+/).slice(0, 7).join(' '),
  line: [card.priceLabel, new URL(card.url).host].filter(Boolean).join(' · '),
});
