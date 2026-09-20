// AD COPY for a short product video.
//
// Structure is the one direct-response ads actually use:
//   hook (a reason to keep watching) -> the thing -> one concrete fact ->
//   price -> one instruction.
//
// Two hard rules:
//   1. Every claim about the product comes from the product page's own words.
//      Hooks are questions and framing, never invented specs or savings.
//   2. Nothing repeats. The name is said once, a fact is used once, and no two
//      lines open the same way.
const pick = (list, seen = null) => {
  const fresh = seen ? list.filter(x => !seen.has(x)) : list;
  const out = (fresh.length ? fresh : list)[Math.floor(Math.random() * (fresh.length ? fresh.length : list.length))];
  seen?.add(out);
  return out;
};

// Acronyms and model codes are read out letter by letter and mean nothing to a
// shopper ("BLDC Motor", "P7"). Familiar ones stay; the rest are dropped from
// anything spoken. The product's real name still appears on screen and in the post.
const KNOWN = new Set(['LED', 'USB', 'HD', 'UHD', '4K', 'TV', 'UV', 'AC', 'DC', 'PVC', 'ABS', 'IP', 'XL', 'XXL', 'SUV', 'RV', 'PC', 'WIFI']);
// The supplier's feed drops degree symbols, leaving "bend up to 180" and
// "(180 flexibility)", which reads and speaks as nonsense. Only applied next to
// words that can only mean an angle — no units are invented anywhere else.
export function fixDegrees(text) {
  return String(text || '')
    .replace(/\b(\d{2,3})\s*(?=(flexibility|rotation|swivel|tilt|angle)\b)/gi, '$1 degree ')
    .replace(/\b(bends?|bending|folds?|rotates?|swivels?|tilts?)(\s+(?:up\s+)?to\s+)(\d{2,3})\b(?!\s*(degree|%|mm|cm|kg|w|v))/gi, '$1$2$3 degrees')
    .replace(/\s{2,}/g, ' ');
}

export function deJargon(text) {
  return String(text || '')
    .split(/\s+/)
    // Model codes keep their digits ("P7", "X500"); letter-only acronyms go.
    .filter(w => {
      const bare = w.replace(/[^A-Za-z0-9]/g, '');
      return !(/^[A-Z]{2,6}$/.test(bare) && !KNOWN.has(bare));
    })
    .join(' ')
    .replace(/\s+([.,:;!?])/g, '$1')
    .replace(/^[\s:;,.-]+/, '')
    .replace(/(^|[.!?]\s+)([a-z])/g, (m, a, b) => a + b.toUpperCase())
    .trim();
}

const FLUFF = /\b(groundbreaking|revolutionary|significant impact|state of the art|cutting[- ]edge|unparalleled|ultimate|premium quality|high quality|perfect for every|amazing|incredible)\b/i;
const STOP = /^(specifications?|description|features?|package (contents|includes)|note|warranty|shipping|delivery)\b/i;

/** Short, concrete sentences from the product's own copy, best first. */
function facts(card) {
  const raw = [...(card.features || []), ...String(card.description || '').split(/\n+/)];
  const out = [];
  for (const line of raw) {
    for (const piece of String(line).split(/(?<=[.!?])\s+/)) {
      // Strip bullets, ticks and any other symbol the voice would read out loud.
      let t = piece.trim().replace(/[✀-➿←-⇿⬀-⯿️•▪●★✔✅❌]/g, '').replace(/^[-*\s]+/, '').trim();
      t = splitHeading(t);
      const words = t.split(/\s+/).length;
      if (!t || STOP.test(t) || words < 4 || words > 26) continue;
      let score = 0;
      if (/\d/.test(t)) score += 3;                       // numbers are the most useful thing in an ad
      if (/\b(cm|mm|m|kg|g|litre|liter|l|w|watt|v|volt|hour|minute|year|pack|piece)\b/i.test(t)) score += 2;
      if (words >= 6 && words <= 18) score += 2;
      if (FLUFF.test(t)) score -= 4;                      // supplier marketing waffle sells nothing
      out.push({ t: t.replace(/[.!?]*$/, ''), score });
    }
  }
  return out.sort((a, b) => b.score - a.score).map(f => f.t);
}

/**
 * Supplier bullets run a heading straight into the sentence — "BLDC Motor Saves
 * energy with 50-minute battery life". A colon makes it read (and speak) properly.
 */
function splitHeading(t) {
  const toks = t.split(/\s+/);
  if (toks.length < 4) return t;
  const upper = w => /^[A-Z0-9]/.test(w);
  for (let i = 1; i < Math.min(5, toks.length - 1); i++) {
    if (upper(toks[i]) && /^[a-z]/.test(toks[i + 1] || '')) {
      const head = toks.slice(0, i).join(' ');
      const rest = toks.slice(i).join(' ');
      return head && /^[A-Z]/.test(rest) ? `${head}: ${rest.replace(/^./, m => m.toLowerCase())}` : t;
    }
  }
  return t;
}

/** Drops the product's own name from the front of a sentence: "The X Vacuum has…" -> "It has…". */
function deName(text, title) {
  if (!text) return text;
  const inTitle = new Set(String(title).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  const toks = text.split(/\s+/);
  const start = /^(the|this|our)$/i.test(toks[0]) ? 1 : 0;
  let end = start;
  while (end < toks.length && inTitle.has(toks[end].toLowerCase().replace(/[^a-z0-9]/g, ''))) end++;
  // Only when a verb continues the sentence ("The X Vacuum has…"). A spec heading
  // like "Flexi Tube Technology: flexible tube…" must be left alone.
  const rest = toks.slice(end).join(' ');
  return end - start >= 2 && /^[a-z]/.test(rest) ? `It ${rest}` : text;
}

/** Words the ad has already used, so the next line can avoid them. */
const keywords = s => new Set(String(s).toLowerCase().match(/[a-z]{5,}/g) || []);
const overlaps = (a, b) => { const A = keywords(a); return [...keywords(b)].some(w => A.has(w)); };

// Never cut a name mid-phrase: "…Screen with Black Wall" is worse than "…Screen".
const shortName = title => {
  const head = String(title).split(/[|,–—]/)[0].trim();
  const words = head.split(/\s+/);
  if (words.length <= 7) return head;
  let cut = words.slice(0, 7);
  // Stop at the first connector: "…Shower Screen", not "…Shower Screen with Black Wall".
  const joint = cut.findIndex((w, i) => i >= 3 && /^(with|and|for|plus|in|on|to|by|of|featuring|including)$/i.test(w));
  if (joint > 0) cut = cut.slice(0, joint);
  while (cut.length > 3 && /^(with|and|for|the|a|in|on|to|plus|by|of)$/i.test(cut[cut.length - 1])) cut.pop();
  return cut.join(' ');
};

const money = cents => (cents % 100 ? `$${(cents / 100).toFixed(2)}` : `$${cents / 100}`);

/** What the product IS, in one or two words: "Stick Vacuum", "Shower Screen". */
function productType(card) {
  const words = deJargon(shortName(card.title)).split(/\s+/).filter(w => !/^\d/.test(w));
  return words.slice(-2).join(' ') || 'one of these';
}

/**
 * The best spec, cut to something sayable in a hook. A hook is read in about a
 * second, so it stays short: brackets dropped, seven words at most.
 */
function promise(card) {
  const best = facts(card)[0];
  if (!best) return null;
  const afterHeading = best.includes(':') ? best.split(':').slice(1).join(':') : best;
  const clean = fixDegrees(deJargon(afterHeading)).replace(/\([^)]*\)/g, ' ').replace(/\s{2,}/g, ' ').trim();
  const words = clean.split(/\s+/).slice(0, 7);
  while (words.length > 3 && /^(and|with|for|the|a|to|of|in|on|that|which)$/i.test(words[words.length - 1])) words.pop();
  return words.join(' ').replace(/[,;:]$/, '').replace(/^./, m => m.toLowerCase()) || null;
}

// Problem first, then the thing that solves it — the order every direct-response
// ad uses. The problem is only ever a question, never a claim, and the solution
// is always a fact from the product's own page.
export function productScript(card, { hook = null } = {}) {
  const seen = new Set();
  const name = deJargon(shortName(card.title));
  const list = facts(card);
  const fact = fixDegrees(deJargon(deName(list[0], card.title)));
  const extra = list.slice(1).find(f => !overlaps(f, list[0] || '')) || null;

  const problem = hook || hookFor(card);
  const turn = pick([
    'Here it is.',
    "Then this is for you.",
    "Here's the fix.",
    'Sorted.',
  ], seen);

  const intro = pick([
    `The ${name}.`,
    `It's the ${name}.`,
    `Meet the ${name}.`,
  ], seen);

  // If the hook already used the first fact, lead with the second one instead —
  // hearing the same spec twice in five seconds is what made the old copy grate.
  const usedByHook = fact && problem && overlaps(fact, problem);
  const lead = usedByHook && extra ? fixDegrees(deJargon(deName(extra, card.title))) : fact;
  const other = usedByHook && extra ? fact : extra && fixDegrees(deJargon(deName(extra, card.title)));

  const plainFact = !lead || lead.includes(':') || /^[A-Z]{2,}/.test(lead);
  const proof = lead ? pick(plainFact ? [`${lead}.`] : [
    `${lead}.`,
    `${lead} — that's the whole point.`,
  ], seen) : null;

  const second = other ? `${other}.` : null;

  const price = card.priceCents ? pick([
    `${money(card.priceCents)}, delivery worked out at checkout.`,
    `All yours for ${money(card.priceCents)}, plus delivery to your place.`,
    `${money(card.priceCents)}.`,
  ], seen) : null;

  // TRUE scarcity only: the shop's own count, and only when it is genuinely low.
  const stock = typeof card.stockQuantity === 'number' && card.stockQuantity > 0 && card.stockQuantity <= 5
    ? pick([`Only ${card.stockQuantity} left.`, `There are ${card.stockQuantity} in stock.`], seen)
    : null;

  const close = pick([
    'Placid Deals dot com.',
    'Get it at Placid Deals dot com.',
    "It's at Placid Deals dot com — go and have a look.",
  ], seen);

  return [problem, turn, intro, proof, second, price, stock, close].filter(Boolean).join(' ');
}

/** The on-screen caption: name and price, nothing that needs reading twice. */
export const productCaption = card => ({
  title: shortName(card.title),
  line: [card.priceLabel, new URL(card.url).host].filter(Boolean).join(' · '),
});

/** The first line: short, spoken and shown. No product claims — those come later. */
// The hook is a QUESTION about the problem, so a viewer recognises themselves in
// the first second. A question asserts nothing, so nothing here can mislead; the
// answer that follows is the product's own fact.
export function hookFor(card) {
  const type = productType(card).toLowerCase();
  const p = promise(card);
  const options = [
    `Still putting up with your old ${type}?`,
    `Shopping for a ${type}?`,
    `Is your ${type} past it?`,
    `Want a ${type} that actually works?`,
  ];
  if (p) options.unshift(`Want a ${type} that ${p}?`, `Tired of a ${type} that can't ${p}?`);
  return pick(options);
}

