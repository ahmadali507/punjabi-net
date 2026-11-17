#!/usr/bin/env node
// Build src/data/lexicon.json from
//   wilson   src/content/dictionary/*.json (Wilson 1899, already on the site)
//   wikt-pa  Wiktionary Punjabi via kaikki.org JSONL  (scripts/lexicon/.cache/kaikki-Punjabi.jsonl)
//   wikt-ur  Wiktionary Urdu via kaikki.org JSONL     (scripts/lexicon/.cache/kaikki-Urdu.jsonl)
//   platts   Platts 1884 via DSAL page HTML           (scripts/lexicon/.cache/platts/*.html, see fetch-platts.mjs)
// Every sense is text taken from the source (trimmed/condensed, never written by us).
// Run: node scripts/lexicon/fetch.mjs && node scripts/lexicon/build.mjs
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fold } from '../../src/lib/lemma.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const cache = path.join(here, '.cache');
const MAX_SENSES = 4, MAX_LEN = 80;

const SOURCES = {
  wilson: {
    title: 'Grammar and Dictionary of Western Panjabi, as spoken in the Shahpur District',
    author: 'J. Wilson', year: 1899, licence: 'Public domain',
    url: 'https://archive.org/details/12034371bsb',
  },
  'wikt-pa': {
    title: 'Wiktionary, Punjabi entries (machine-readable extract by kaikki.org / wiktextract)',
    author: 'Wiktionary contributors', year: 2026, licence: 'CC BY-SA 4.0',
    url: 'https://kaikki.org/dictionary/Punjabi/',
  },
  'wikt-ur': {
    title: 'Wiktionary, Urdu entries (machine-readable extract by kaikki.org / wiktextract)',
    author: 'Wiktionary contributors', year: 2026, licence: 'CC BY-SA 4.0',
    url: 'https://kaikki.org/dictionary/Urdu/',
  },
  platts: {
    title: 'A Dictionary of Urdū, Classical Hindī, and English',
    author: 'John T. Platts', year: 1884, licence: 'Public domain',
    url: 'https://dsal.uchicago.edu/dictionaries/platts/',
    note: 'Text from the Digital Dictionaries of South Asia (University of Chicago) online edition; DSAL offers its digitisation under CC BY-NC-ND 2.0. The 1884 dictionary itself is public domain.',
  },
};
const ORDER = ['wilson', 'wikt-pa', 'platts', 'wikt-ur'];

// ---------------------------------------------------------------- helpers
const ARABIC = /[؀-ۿݐ-ݿ]/;
const stripMarks = (s) => s.replace(/[ً-ٰٟۖ-ۭ]/g, '').normalize('NFC');

/** Shorten one sense to ≤ MAX_LEN chars, cutting at a comma or word boundary. */
function trimSense(s) {
  s = s.replace(/\s+/g, ' ').replace(/\s+([,;:.])/g, '$1').trim().replace(/[.;:,\s—-]+$/, '');
  if (s.length > MAX_LEN) {
    const cut = s.slice(0, MAX_LEN);
    const c = cut.lastIndexOf(',');
    if (c > MAX_LEN * 0.4) s = cut.slice(0, c);
    else { const w = cut.lastIndexOf(' '); s = (w > 20 ? cut.slice(0, w) : cut) + '…'; }
  }
  // never leave a parenthesis open
  const open = s.lastIndexOf('(');
  if (open > s.lastIndexOf(')')) s = s.slice(0, open).replace(/[\s,;:]+$/, '');
  return s;
}
/** Split on ";" outside parentheses. */
function splitTop(s) {
  const out = []; let depth = 0, cur = '';
  for (const c of s) {
    if (c === '(') depth++;
    if (c === ')') depth = Math.max(0, depth - 1);
    if (c === ';' && !depth) { out.push(cur); cur = ''; } else cur += c;
  }
  out.push(cur);
  return out;
}
function pushSenses(list, more) {
  for (const s0 of more) {
    if (!s0) continue;
    const s = trimSense(s0);
    if (s && !list.some((x) => x.toLowerCase() === s.toLowerCase())) list.push(s);
  }
  return list;
}

/** Entries keyed by fold(hw)|src|pos so repeated headwords merge their senses. */
const entries = new Map();
function add({ hw, roman, pos, senses, src, ref }) {
  hw = stripMarks(hw).trim();
  if (!hw || !ARABIC.test(hw) || /\s/.test(hw)) return;
  const key = `${fold(hw)}|${src}|${pos ?? ''}`;
  let e = entries.get(key);
  if (!e) {
    e = { hw, ...(roman ? { roman } : {}), ...(pos ? { pos } : {}), senses: [], src, ...(ref ? { ref } : {}) };
    entries.set(key, e);
  }
  pushSenses(e.senses, senses);
}

// ---------------------------------------------------------------- Wilson
function wilson() {
  const dir = path.join(root, 'src/content/dictionary');
  let n = 0;
  for (const f of readdirSync(dir).sort()) {
    const d = JSON.parse(readFileSync(path.join(dir, f), 'utf8'));
    add({ hw: d.headword, roman: d.romanized, pos: d.pos, senses: d.senses, src: 'wilson', ref: `/dictionary/${f.replace(/\.json$/, '')}` });
    n++;
  }
  return n;
}

// ---------------------------------------------------------------- Wiktionary (kaikki)
const WPOS = {
  noun: 'noun', name: 'noun', verb: 'verb', adj: 'adjective', adv: 'adverb', pron: 'pronoun',
  postp: 'postposition', prep: 'postposition', conj: 'conjunction', intj: 'interjection',
  particle: 'particle', num: 'numeral', phrase: 'phrase', proverb: 'phrase', det: undefined,
};
const SKIP_POS = new Set(['character', 'symbol', 'punct', 'infix', 'circumfix', 'interfix']);
const META_TAGS = new Set(['table-tags', 'inflection-template', 'canonical', 'romanization', 'Gurmukhi', 'Shahmukhi',
  'Hindi', 'Devanagari', 'error-unrecognized-form', 'class', 'Urdu', 'Arabic', 'Perso-Arabic', 'transliteration']);
const ABBR = { masculine: 'm.', feminine: 'f.', singular: 'sg.', plural: 'pl.' };
const tagText = (tags) => tags.filter((t) => !META_TAGS.has(t)).map((t) => ABBR[t] ?? t).join(' ');

function readJsonl(file) {
  return readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}
function glossesOf(d) {
  const out = [];
  for (const s of d.senses ?? []) {
    if (!s.glosses?.length || (s.tags ?? []).includes('no-gloss')) continue;
    out.push(s.glosses[s.glosses.length - 1]);
  }
  return out;
}
const isFormOf = (s) => (s.tags ?? []).some((t) => t === 'form-of' || t === 'alt-of');

function wiktionary(lang, src) {
  const file = path.join(cache, `kaikki-${lang}.jsonl`);
  if (!existsSync(file)) { console.warn(`missing ${file}; run fetch.mjs`); return 0; }
  const rows = readJsonl(file);
  const before = entries.size;
  const wurl = (w) => `https://en.wiktionary.org/wiki/${encodeURIComponent(w)}#${lang}`;
  // lemma (folded) -> first real gloss, to explain inflected forms
  const lemmaGloss = new Map();
  for (const d of rows) {
    const g = (d.senses ?? []).filter((s) => !isFormOf(s) && s.glosses?.length).map((s) => s.glosses.at(-1));
    if (!g.length) continue;
    const names = [d.word, ...(d.forms ?? []).filter((f) => f.tags?.some((t) => t === 'canonical' || t === 'Shahmukhi')).map((f) => f.form)];
    for (const w of names) if (ARABIC.test(w) && !lemmaGloss.has(fold(w))) lemmaGloss.set(fold(w), g[0]);
  }
  // Gurmukhi spelling -> Shahmukhi, so form-of senses can name the lemma in Shahmukhi
  const g2s = new Map();
  for (const d of rows) {
    if (ARABIC.test(d.word)) continue;
    const sh = d.forms?.find((f) => f.tags?.includes('Shahmukhi') && ARABIC.test(f.form))?.form;
    if (sh && !g2s.has(d.word)) g2s.set(d.word, sh);
  }
  const toShahmukhi = (s) => s.replace(/[\u0A00-\u0A7F]+/g, (g) => g2s.get(g) ?? g);
  const tableForms = [];
  for (const d of rows) {
    if (SKIP_POS.has(d.pos)) continue;
    // affixes only when they are also free words (والا، دار), never hyphenated ones
    if ((d.pos === 'suffix' || d.pos === 'prefix') && /-/.test(d.word)) continue;
    const pos = WPOS[d.pos];
    const roman = d.forms?.find((f) => f.tags?.includes('romanization'))?.form;
    const shahmukhi = ARABIC.test(d.word) ? [d.word]
      : (d.forms ?? []).filter((f) => f.tags?.includes('Shahmukhi') && ARABIC.test(f.form)).map((f) => f.form);
    if (!shahmukhi.length) continue;
    // senses
    const senses = [];
    for (const s of d.senses ?? []) {
      if (!s.glosses?.length || (s.tags ?? []).includes('no-gloss')) continue;
      if (isFormOf(s)) {
        let g = s.glosses.join(' ').replace(/:\s*$/, '').replace(/\s*:\s+/, ': ');
        g = g.replace(/\b(masculine|feminine|singular|plural)\b/g, (m) => ABBR[m]);
        const lemma0 = s.form_of?.[0]?.word ?? s.alt_of?.[0]?.word;
        const lemma = lemma0 && toShahmukhi(lemma0);
        g = toShahmukhi(g);
        const lg = lemma && lemmaGloss.get(fold(lemma));
        if (lg && !g.includes('“') && !g.includes(lg)) g += ` — ${lg}`;
        senses.push(g);
      } else senses.push(s.glosses.at(-1));
    }
    if (!senses.length) continue;
    for (const hw of shahmukhi) add({ hw, roman, pos, senses, src, ref: wurl(d.word) });
    // inflection-table forms in Shahmukhi
    if (!ARABIC.test(d.word)) continue;
    const lemmaG = glossesOf(d).find(Boolean);
    const plain = stripMarks(d.word);
    for (const f of d.forms ?? []) {
      if (!f.form || !ARABIC.test(f.form) || /[\sA-Za-z]/.test(f.form)) continue;
      if (f.tags?.some((t) => t === 'canonical' || t === 'Shahmukhi')) continue;
      if (fold(f.form) === fold(d.word)) continue;
      const desc = tagText(f.tags ?? []);
      if (!desc) continue; // table headers (pronouns etc.) carry no grammatical tags
      tableForms.push({
        hw: f.form, roman: f.roman, pos,
        senses: [`${desc} of ${plain}${roman ? ` (${roman})` : ''}${lemmaG && !/^inflection of|form of/.test(lemmaG) ? ': ' + lemmaG : ''}`],
        src, ref: wurl(d.word),
      });
    }
  }
  // table-derived forms only where Wiktionary has no entry of its own for that spelling
  const own = new Set([...entries.values()].filter((e) => e.src === src).map((e) => fold(e.hw)));
  for (const t of tableForms) if (!own.has(fold(t.hw))) add(t);
  return entries.size - before;
}

// ---------------------------------------------------------------- Platts (DSAL HTML)
const PPOS = [
  [/^s\.\s?[mf]\.|^s\.|^n\.|^prop\. n\./, 'noun'], [/^v\.\s?[nti]\./, 'verb'], [/^part\. adj\.|^adj\./, 'adjective'],
  [/^adv\./, 'adverb'], [/^pron\./, 'pronoun'], [/^postpos\.|^prep\./, 'postposition'], [/^conj\./, 'conjunction'],
  [/^intj\.|^interj\./, 'interjection'], [/^part\./, 'adjective'], [/^num\./, 'numeral'],
];
const LABEL = /(?:^|[\s,(])((?:s\.\s?[mf]\.|s\.|adj\.|adv\.|v\.\s?[nti]\.|part\.(?:\s(?:adj|act|pass)\.)?|perf\.\spart\.|pron\.|conj\.|intj\.|interj\.|postpos\.|prep\.|num\.|prop\.\sn\.|n\.)(?:[\s,&]+(?:s\.\s?[mf]\.|adj\.|adv\.|v\.\s?[nti]\.|pl\.|sing\.|compar\.|superl\.|dimin\.|fem\.|masc\.|&|and|intens\.|caus\.|or|corr\.|pron\.|conj\.|n\.))*)[\s,]*/;

const DEVA_ASP = /[खघछझठढथधफभ]|ढ़|[नमलरव]्ह/g;
/** DSAL codes retroflex letters with Sindhi code points and writes aspiration as ه; fix to Urdu/Punjabi usage. */
function plattsSpelling(pa, deva, roman, origin) {
  let w = pa.replace(/ٿ/g, 'ٹ').replace(/ڙ/g, 'ڑ').replace(/ڐ/g, 'ڈ').replace(/ي/g, 'ی').replace(/ك/g, 'ک');
  const ASPIRABLE = 'بپتٹجچدڈڑکگلمنرو';
  const hs = [...w].map((c, i, a) => (c === 'ه' || c === 'ہ') && i > 0 && i < a.length - 1 && ASPIRABLE.includes(a[i - 1]) ? i : -1).filter((i) => i >= 0);
  if (hs.length && /^[HS]/.test(origin)) {
    let k = 0;
    if (deva) k = (deva.match(DEVA_ASP) ?? []).length;
    else k = (roman.match(/(?:bh|ph|th|ṭh|jh|ćh|dh|ḍh|ṛh|kh|gh|lh|mh|nh|rh|wh)/g) ?? []).length;
    if (k > 0) {
      const chars = [...w];
      // aspiration events appear left to right; mark the first k candidates
      hs.slice(0, k).forEach((i) => { chars[i] = 'ھ'; });
      w = chars.join('');
    }
  }
  w = w.replace(/ه/g, 'ہ'); // remaining ه are plain h (DSAL does not use ہ consistently)
  if (/[eé]$|ai$/.test(roman) && w.endsWith('ی')) w = w.slice(0, -1) + 'ے';
  if (/[ṅṉ]$/.test(roman) && w.endsWith('ن')) w = w.slice(0, -1) + 'ں';
  return w;
}

const unhtml = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"');
function dropBrackets(s) {
  let out = '', depth = 0;
  for (const c of s) {
    if (c === '[') depth++;
    else if (c === ']') depth = Math.max(0, depth - 1);
    else if (!depth) out += c;
  }
  return out;
}

function platts() {
  const dir = path.join(cache, 'platts');
  if (!existsSync(dir)) { console.warn('no Platts cache; run fetch-platts.mjs'); return 0; }
  const raw = [];
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.html')).sort()) {
    const page = Number(f.slice(0, 4));
    const html = readFileSync(path.join(dir, f), 'utf8');
    for (const m of html.matchAll(/<entry>\s*<span class="new_p">([\s\S]*?)<\/span>\s*(?=<\/div>|<entry>|$)/g)) {
      const body = m[1].replace(/<pb[^>]*\/>/g, '');
      const hm = body.match(/^\s*([A-Z][A-Za-z]*(?:\s*[&,]\s*[A-Z][A-Za-z]*)*)?\s*<hw>([\s\S]*?)<\/hw>([\s\S]*)$/);
      if (!hm) continue;
      const [, origin = '', hwHtml, rest0] = hm;
      const pa = hwHtml.match(/<pa>([^<]*)<\/pa>/)?.[1]?.trim();
      if (!pa) continue;
      const deva = hwHtml.match(/<d>([^<]*)<\/d>/)?.[1] ?? '';
      const roman = unhtml(hwHtml.match(/<i>([\s\S]*?)<\/i>/)?.[1] ?? '').trim();
      // definition text: drop equivalent-headword spans, etymology brackets, parentheses that carry script
      let rest = rest0.replace(/<span class\s*=\s*"equivalentHW">[\s\S]*?<\/span>/g, ' ');
      rest = rest.replace(/\([^()]*<(?:pa|d)>[^()]*\)/g, ' ');
      rest = dropBrackets(unhtml(rest)).replace(/\(\s*(?:see|fr\.|for|of|pl\. of|dimin\. of|v\.s\.v\.)[^()]*\)/g, ' ');
      rest = rest.replace(/\s+/g, ' ').replace(/^[\s,]+/, '');
      raw.push({ origin, pa, deva, roman, rest, page });
    }
  }
  // roman -> parsed definition, to resolve "= X, q.v." cross-references
  const parsed = raw.map((r) => {
    // a leading parenthesis is etymology or a gloss of the parts: "(bāg, 'rein'+ṭūṭ …), adv."
    const rest = r.rest.replace(/^\([^()]*(?:\([^()]*\)[^()]*)*\)[\s,]*/, '');
    const lm = rest.match(LABEL);
    let label = '', def = rest;
    if (lm && lm.index < 40) { label = lm[1].trim(); def = rest.slice(lm.index + lm[0].length); }
    const pos = PPOS.find(([re]) => re.test(label))?.[1];
    let xref;
    const xm = def.match(/^=\s*([^,;:.]+?),?\s*q\.\s?v\./) ?? r.rest.match(/^=\s*([^,;:.]+?),?\s*q\.\s?v\./);
    if (xm) xref = xm[1].trim();
    // senses: up to the first phrase list (": —"), split on ";"
    let body = def.split(/:\s*—/)[0].replace(/\s—\s/g, '; ').replace(/\bq\.\s?v\./g, '');
    const senses = splitTop(body).map((s) => s.replace(/^[\s—=,:]+/, '').replace(/^\((?:f|m|pl|fem|masc)\.[^)]*\),?\s*/, '').replace(/^[\s—=,:]+/, '').trim())
      .filter((s) => s && /[a-z]{2}/.test(s) && !/^(?:see|fr\.|cf\.|v\.s\.v\.)/i.test(s))
      .map((s) => (/^[A-Z](?:[a-z]|\s[a-z])/.test(s) && !/^(?:God|Hindu|Muhammad|Muslim|Musalman|Arab|Persian|Sanskrit|English|India|Hind)/.test(s) ? s[0].toLowerCase() + s.slice(1) : s));
    return { ...r, pos, senses, xref };
  });
  const byRoman = new Map();
  for (const p of parsed) if (p.senses.length && !p.xref) {
    for (const k of [p.roman, p.roman.replace(/-/g, '')]) if (!byRoman.has(k)) byRoman.set(k, p);
  }
  const before = entries.size;
  for (const p of parsed) {
    let senses = p.senses;
    if (p.xref) {
      const t = byRoman.get(p.xref) ?? byRoman.get(p.xref.replace(/-/g, ''));
      senses = t ? [`= ${p.xref}`, ...t.senses] : [`= ${p.xref}`];
    }
    if (!senses.length) continue;
    const hw = plattsSpelling(p.pa, p.deva, p.roman, p.origin);
    if ([...fold(hw)].length < 2) continue; // letters of the alphabet
    add({ hw, roman: p.roman, pos: p.pos, senses: senses.slice(0, MAX_SENSES), src: 'platts',
      ref: `https://dsal.uchicago.edu/cgi-bin/app/platts_query.py?page=${p.page}` });
  }
  return entries.size - before;
}

// ---------------------------------------------------------------- main
const counts = {
  wilson: wilson(),
  'wikt-pa': wiktionary('Punjabi', 'wikt-pa'),
  platts: platts(),
  'wikt-ur': wiktionary('Urdu', 'wikt-ur'),
};
const list = [...entries.values()]
  .map((e) => ({ ...e, senses: e.senses.slice(0, MAX_SENSES) }))
  .filter((e) => e.senses.length)
  .sort((a, b) => fold(a.hw).localeCompare(fold(b.hw), 'ur') || ORDER.indexOf(a.src) - ORDER.indexOf(b.src));
const used = new Set(list.map((e) => e.src));
const out = { sources: Object.fromEntries(Object.entries(SOURCES).filter(([k]) => used.has(k))), entries: list };
mkdirSync(path.join(root, 'src/data'), { recursive: true });
const json = '{"sources":' + JSON.stringify(out.sources, null, 1) + ',\n"entries":[\n' + list.map((e) => JSON.stringify(e)).join(',\n') + '\n]}\n';
writeFileSync(path.join(root, 'src/data/lexicon.json'), json);
const per = {}; for (const e of list) per[e.src] = (per[e.src] ?? 0) + 1;
console.log('entries per source:', per, 'total', list.length, `size ${(json.length / 1e6).toFixed(1)} MB (chars)`);
