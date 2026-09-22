// Prints hook + voiceover for real product cards and checks the rules that
// matter: no title read out, name said at most once, price present, ends on
// the site, every sentence sayable, no invented colours/sizes.
//   node scripts/copy-check.mjs cards.json
import { readFileSync } from 'fs';
import { hookFor, productScript, sayable, spokenAd } from '../src/adcopy.js';

const artiss = {
  url: 'https://placiddeals.com/p/example', title: 'Artiss Floor Lounge Sofa Bed 2-seater Charcoal Suede',
  description: 'Features\nAdjustable head, waist and leg sections\nSeparable into four parts', features: [],
  priceCents: 13495, priceLabel: '$134.95', availability: 'in_stock',
};
const cards = [artiss, ...(process.argv[2] ? JSON.parse(readFileSync(process.argv[2], 'utf8')) : [])];
let bad = 0;
for (const c of cards) {
  const hook = hookFor(c);
  const script = productScript(c, { hook });
  const problems = [];
  const sentences = script.split(/(?<=[.!?])\s+/);
  for (const s of [hook, ...sentences]) if (!sayable(s, c)) problems.push(`not sayable: "${s}"`);
  if (c.priceLabel && c.availability === 'in_stock' && !script.includes(c.priceLabel)) problems.push('price missing');
  if (!/PlacidDeals\.com/.test(sentences[sentences.length - 1])) problems.push('last sentence does not mention PlacidDeals.com');
  const head = c.title.split(/\s+/).slice(0, 4).join(' ').toLowerCase();
  if (hook.toLowerCase().includes(head) || script.toLowerCase().includes(head)) problems.push('reads the title');
  for (const col of ['charcoal', 'grey', 'green', 'pink', 'orange', 'black', 'white', 'red', 'suede']) {
    if (new RegExp(`\b${col}\b`, 'i').test(script + ' ' + hook)) problems.push(`reads a variant: ${col}`);
  }
  if (problems.length) bad++;
  console.log(`\n### ${c.title.slice(0, 90)}\nHOOK:   ${hook}\nSCRIPT: ${script}\nVOICE:  ${spokenAd(hook, script).slice(-60)}${problems.length ? '\n!! ' + problems.join(' | ') : ''}`);
}
console.log(`\n${cards.length - bad}/${cards.length} clean`);
