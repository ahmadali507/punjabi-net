#!/usr/bin/env node
/**
 * Complete works, grouped as works, for five poets: Bulleh Shah, Sultan Bahu, Baba Farid, Shah Hussain, Bhai Vir Singh.
 *
 *   node scripts/import/works-five-poets.mjs fetch          download the punjabi-kavita pages in SOURCES to .cache/punjabi-kavita/
 *   node scripts/import/works-five-poets.mjs report         match every source piece against the archive, print what is new
 *   node scripts/import/works-five-poets.mjs build [--dry]  write missing poems, add `work:` to poems, write src/content/works/*.md
 *
 * Every work follows one source page's order (punjabi-kavita.com or Wikisource). Each piece of that page is matched to
 * an archive poem (first by its source URL, then by its opening words with spelling differences evened out, the same
 * way punjabi-kavita.mjs does); a piece with no match is written as a new poem, copied verbatim from the page (only
 * markup removed). Existing poems keep their slug and fields; only a `work:` block is added or replaced.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url).pathname;
const CACHE = `${ROOT}.cache/punjabi-kavita`;
const WS_CACHE = `${ROOT}.cache/wikisource.json`;
const POEMS = `${ROOT}src/content/poems`;
const WORKS = `${ROOT}src/content/works`;
const BASE = 'https://www.punjabi-kavita.com/';
const UA = { 'User-Agent': 'punjabi-net-archive/0.1 (non-commercial literary archive; import script)' };
const PK_NOTE = 'Shahmukhi text from punjabi-kavita.com, a transliteration of its Gurmukhi text. Not yet checked against a printed edition.';
const WS_NOTE = 'Transcribed from Wikisource, where the text is marked public domain (PD-old). Not yet checked against a printed edition.';
const bvsNote = (book) => `Shahmukhi text from punjabi-kavita.com, a transliteration of Bhai Vir Singh's Gurmukhi original (${book}). Not yet checked against a printed edition.`;

/** GGS Farid shaloks by the Sikh Gurus, as punjabi-kavita.com's note lists them. */
const GURUS = { 'Guru Nanak': [32, 113, 120, 124], 'Guru Amar Das': [13, 52, 104, 122, 123], 'Guru Ram Das': [121], 'Guru Arjan': [75, 82, 83, 105, 108, 109, 110, 111] };
const GURU_OF = Object.fromEntries(Object.entries(GURUS).flatMap(([g, ns]) => ns.map((n) => [n, g])));
const GURU_SHALOKS = new Set(Object.keys(GURU_OF).map(Number));
const GURU_LIST = Object.entries(GURUS).map(([g, ns]) => `${g} ${ns.join(', ')}`).join('; ');

/**
 * One entry per work. `pages`: the punjabi-kavita page(s) whose pieces, in page order, make up the work.
 * `ws`: a Wikisource page whose text is preferred for new poems when the same piece is there.
 */
const SOURCES = [
  /* ---- Bulleh Shah ---- */
  { work: 'kafian-bulleh-shah', poet: 'bulleh-shah', form: 'kafi', kind: 'collection', order: 1,
    title: 'کافیاں بلھے شاہ', title_en: 'Kafian (Bulleh Shah)', page: 'KafianBabaBullheShahShahmukhi', book: 'Kafian Baba Bulleh Shah (punjabi-kavita.com, Shahmukhi)',
    intro: 'The kafis of Bulleh Shah in the order of punjabi-kavita.com\'s Shahmukhi collection (two kafis it prints twice are counted once). Each kafi is also a poem of its own.',
    extra: true },
  { work: 'dohre-bulleh-shah', poet: 'bulleh-shah', form: 'dohra', kind: 'collection', order: 2,
    title: 'دوہڑے بلھے شاہ', title_en: 'Dohre (Bulleh Shah)', ws: 'دوہڑے بلھے شاہ', wsOrder: true,
    intro: 'The dohre of Bulleh Shah in the order of the Wikisource page دوہڑے بلھے شاہ (56 dohre; punjabi-kavita.com gives 50 of them in the same order).', page: 'DohreBabaBullheShahShahmukhi', book: 'Dohre Baba Bulleh Shah (punjabi-kavita.com, Shahmukhi)', numbered: true },
  { work: 'siharfian-bulleh-shah', poet: 'bulleh-shah', form: 'siharfi', kind: 'collection', order: 3,
    title: 'سیہرفیاں بلھے شاہ', title_en: 'Siharfian (Bulleh Shah)', ws: 'سیہرفیاں بلھے شاہ', page: 'SiharfianBabaBullheShahShahmukhi', book: 'Siharfian Baba Bulleh Shah (punjabi-kavita.com, Shahmukhi)', siharfi: true },
  { work: 'baran-maah-bulleh-shah', poet: 'bulleh-shah', form: 'baran-maah', kind: 'book', order: 4,
    title: 'بارانماہ بلھے شاہ', title_en: 'Baran Maah (Bulleh Shah)', ws: 'بارانماہ بلھے شاہ', page: 'BaranmahBabaBullheShahShahmukhi', book: 'Baranmah Baba Bulleh Shah (punjabi-kavita.com, Shahmukhi)', single: true },
  { work: 'athwara-bulleh-shah', poet: 'bulleh-shah', form: 'nazm', kind: 'book', order: 5,
    title: 'اٹھوارا بلھے شاہ', title_en: 'Athwara (Bulleh Shah)', ws: 'اٹھوارا بلھے شاہ', page: 'AthwaraBabaBullheShahShahmukhi', book: 'Athwara Baba Bulleh Shah (punjabi-kavita.com, Shahmukhi)', single: true },
  { work: 'gandhan-bulleh-shah', poet: 'bulleh-shah', form: 'nazm', kind: 'book', order: 6,
    title: 'گنڈھاں بلھے شاہ', title_en: 'Gandhan (Bulleh Shah)', ws: 'گنڈھاں بلھے شاہ', page: 'GandhanBabaBullheShahShahmukhi', book: 'Gandhan Baba Bulleh Shah (punjabi-kavita.com, Shahmukhi)', single: true },
  /* ---- Sultan Bahu ---- */
  { work: 'abyat-sultan-bahu', poet: 'sultan-bahu', form: 'bait', kind: 'collection', order: 1,
    title: 'ابیات سلطان باہو', title_en: 'Abyat (Sultan Bahu)', page: 'PunjabiPoetryHazratSultanBahuShahmukhi', book: 'Abyat Sultan Bahu (punjabi-kavita.com, Shahmukhi)',
    intro: 'The Punjabi abyat (baits) of Sultan Bahu, arranged by the letters of the alphabet as punjabi-kavita.com\'s Shahmukhi collection gives them.' },
  /* ---- Baba Farid ---- */
  { work: 'shalok-baba-farid', poet: 'baba-farid', form: 'shalok', kind: 'collection', order: 1,
    title: 'سلوک شیخ فرید', title_en: 'Shaloks of Sheikh Farid (Guru Granth Sahib)', page: 'SalokBabaSheikhFaridSahibShahmukhi', book: 'Salok Baba Sheikh Farid, Guru Granth Sahib (punjabi-kavita.com, Shahmukhi)',
    note: 'Shalok of Baba Farid in the Guru Granth Sahib (Salok Sheikh Farid ke). ' + PK_NOTE, ggs: true, priority: 0,
    intro: 'The shaloks of Sheikh Farid as they stand in the Guru Granth Sahib, in that order. Of the 130 shaloks in this section, 18 are by the Sikh Gurus (4 by Guru Nanak, 5 by Guru Amar Das, 1 by Guru Ram Das, 8 by Guru Arjan), as punjabi-kavita.com notes; they are kept in their places so that the numbers here are the Guru Granth Sahib\'s: ' + GURU_LIST + '.' },
  { work: 'shabad-baba-farid', poet: 'baba-farid', form: 'nazm', kind: 'collection', order: 2,
    title: 'شبد بابا شیخ فرید', title_en: 'Shabads of Sheikh Farid (Guru Granth Sahib)', page: 'ShabadBabaSheikhFaridShahmukhi', book: 'Shabads of Baba Farid in the Guru Granth Sahib (punjabi-kavita.com, Shahmukhi)', priority: 0, headingChapter: true,
    note: 'Shabad of Baba Farid in the Guru Granth Sahib. ' + PK_NOTE,
    intro: 'The four shabads of Sheikh Farid in the Guru Granth Sahib (two in Raag Asa, two in Raag Suhi).' },
  { work: 'shalok-baba-farid-mutfarriq', poet: 'baba-farid', form: 'shalok', kind: 'collection', order: 3,
    title: 'سلوک بابا شیخ فرید (متفرق)', title_en: 'Shaloks attributed to Baba Farid outside the Guru Granth Sahib', page: 'ShlokBabaFaridShahmukhi', book: 'Shaloks attributed to Baba Farid outside the Guru Granth Sahib (punjabi-kavita.com, Shahmukhi)',
    note: 'Attributed to Baba Farid; this shalok is not in the Guru Granth Sahib, and its authorship is uncertain. ' + PK_NOTE,
    intro: 'Shaloks attributed to Baba Farid that are not in the Guru Granth Sahib. Their authorship is uncertain.' },
  { work: 'fatkal-kalam-baba-farid', poet: 'baba-farid', form: 'nazm', kind: 'collection', order: 4,
    title: 'فٹکل کلام بابا شیخ فرید', title_en: 'Miscellaneous poems attributed to Baba Farid', page: 'MiscPoetryBabaFaridShahmukhi', book: 'Misc Poetry Baba Sheikh Farid (punjabi-kavita.com, Shahmukhi)',
    note: 'Attributed to Baba Farid; this poem is not in the Guru Granth Sahib, and its authorship is uncertain. ' + PK_NOTE, headingChapter: true,
    intro: 'Other poems attributed to Baba Farid outside the Guru Granth Sahib (a kafi, an Asa, a nasihat nama), as punjabi-kavita.com gives them. Their authorship is uncertain.' },
  /* ---- Shah Hussain ---- */
  { work: 'kafian-shah-hussain', poet: 'shah-hussain', form: 'kafi', kind: 'collection', order: 1,
    title: 'کافیاں شاہ حسین', title_en: 'Kafian (Shah Hussain)', page: 'KafianShahHussainShahmukhi', book: 'Kafian Shah Hussain (punjabi-kavita.com, Shahmukhi)',
    intro: 'The kafis of Shah Hussain in the order of punjabi-kavita.com\'s Shahmukhi collection (which prints a run of fifteen kafis twice; they are counted once), followed by kafis from Wikisource that the page does not have. Each kafi is also a poem of its own.', extra: true },
  /* ---- Bhai Vir Singh ---- */
  ...[
    ['matak-hulare', 'مٹک ہلارے', 'Matak Hulare', 'MatakHulareBhaiVirSinghShahmukhi', 1922, 'nazm'],
    ['trel-tupke', 'تریل تپکے', 'Trel Tupke', 'TrelTupkeBhaiVirSinghShahmukhi', undefined, 'nazm'],
    ['bijlian-de-har', 'بجلیاں دے ہار', 'Bijlian de Har', 'BijlianDeHarBhaiVirSinghShahmukhi', undefined, 'nazm'],
    ['kambdi-kalai', 'کمبدی کلائی', 'Kambdi Kalai', 'KambdiKalaiBhaiVirSinghShahmukhi', undefined, 'nazm'],
    ['dil-tarang', 'دل ترنگ', 'Dil Tarang', 'DilTarangBhaiVirSinghShahmukhi', undefined, 'nazm'],
    ['kant-maheli', 'کنت مہیلی', 'Kant Maheli', 'KantMaheliBhaiVirSinghShahmukhi', undefined, 'baran-maah'],
  ].map(([work, title, en, page, year, form], i) => ({
    work, poet: 'bhai-vir-singh', form, kind: 'book', order: i + 1, title, title_en: en, page, book: en, plainBook: true, year, note: bvsNote(year ? `${en}, ${year}` : en),
  })),
];

async function fetchAll() {
  mkdirSync(CACHE, { recursive: true });
  for (const { page } of SOURCES) {
    if (existsSync(`${CACHE}/${page}.html`)) continue;
    const r = await fetch(`${BASE}${page}.php`, { headers: UA });
    if (!r.ok) { console.log(`${page}: HTTP ${r.status}`); continue; }
    writeFileSync(`${CACHE}/${page}.html`, await r.text());
    console.log(`${page}: ok`);
    await new Promise((res) => setTimeout(res, 3000));
  }
}

/* ---------- parsing (from punjabi-kavita.mjs) ---------- */

const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const text = (html) => decode(html.replace(/\s*\n\s*/g, ' ').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, '')).replace(/[ \t]+/g, ' ');
const carriers = (l) => l.replace(/(^|[\s'"(-])a/g, '$1اُ').replace(/a/g, 'ؤ').replace(/e/g, 'ئ');
const stripNumbers = (l) => l.replace(/(۔۔)(?:[\d۰-۹]+۔۔)+/g, '$1').replace(/۔۔رہاؤ۔۔/g, '۔۔ رہاؤ ۔۔');

function stanzas(body) {
  return text(body.replace(/<(style|script)\b[\s\S]*?<\/\1>/gi, '').replace(/<div id="meaning">[\s\S]*?<\/div>/g, ''))
    .split(/\n\s*\n/)
    .map((c) => c.split('\n').map((l) => carriers(stripNumbers(l.trim()))).filter((l) => /[ء-ۿ]/.test(l) && !/^[\d۰-۹\s.۔]+$/.test(l)))
    .filter((s) => s.length);
}
const mainContent = (html) => {
  const end = [html.indexOf('</main>'), html.search(/Contact Us/i)].filter((i) => i > 0);
  return html.slice(Math.max(0, html.indexOf('<h1')), end.length ? Math.min(...end) : undefined);
};
const isNote = (st) => /^\([\s\S]*\)$/.test(st.join('\n').trim());
/** A trailing "نوٹ=" paragraph (editor's note at the end of a page) is not verse. */
const dropNote = (sts) => { const i = sts.findIndex((s) => /^نوٹ\s*[=:-]/.test(s[0])); return i >= 0 ? sts.slice(0, i) : sts; };

/** One entry per <h2>/<h3> section: { anchor, heading, level, sts, notes, variant }. */
function sections(html) {
  const parts = mainContent(html).split(/<h([23])[^>]*>/i).slice(1);
  const out = [];
  for (let i = 0; i < parts.length; i += 2) {
    const level = Number(parts[i]); const p = parts[i + 1];
    const [head, ...rest] = p.split(/<\/h[23]>/i);
    const anchor = head.match(/name="([^"]+)"/)?.[1] ?? null;
    const headLines = text(head).split('\n').map((l) => l.trim()).filter(Boolean);
    const heading = (headLines[0] ?? '').replace(/^[\d۰-۹]+\s*\.\s*/, '').trim();
    let sts = dropNote(stanzas(rest.join('')));
    const v = sts.findIndex((st) => st.length === 1 && /^\(?پاٹھ بھید\)?$/.test(st[0]));
    const variant = v >= 0 ? sts.slice(v + 1).map((st) => st.join(' / ')) : [];
    if (v >= 0) sts = sts.slice(0, v);
    out.push({ anchor, heading, headLines, level, sts: sts.filter((st) => !isNote(st)), notes: sts.filter(isNote).map((st) => st.join(' ')), variant });
  }
  return out;
}

/** A page of "1 / stanza / 2 / stanza" without headings (Bulleh Shah's dohre). */
function numberedPieces(html) {
  const raw = text(mainContent(html).replace(/<h1[\s\S]*?<\/h1>/i, '').replace(/<div id="meaning">[\s\S]*?<\/div>/g, ''));
  const out = []; let cur = null;
  for (const chunk of raw.split(/\n\s*\n/)) {
    const ls = chunk.split('\n').map((l) => l.trim()).filter(Boolean);
    for (const l of ls) {
      if (/^[\d۰-۹]+$/.test(l)) { cur = { anchor: null, heading: l, sts: [[]] }; out.push(cur); continue; }
      if (!cur || !/[ء-ۿ]/.test(l)) continue;
      cur.sts.at(-1).push(carriers(l));
    }
    if (cur && cur.sts.at(-1).length) cur.sts.push([]);
  }
  for (const p of out) p.sts = p.sts.filter((s) => s.length);
  return out.filter((p) => p.sts.length);
}

/* ---------- Wikisource (from wikisource.mjs) ---------- */

function wsClean(line) {
  return line
    .replace(/<ref[\s\S]*?<\/ref>|<ref[^>]*\/>/g, '').replace(/\{\{[^{}]*\}\}/g, '').replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/'{2,}/g, '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/(?<![\p{L}])a(?=[ء-ۿ])/gu, 'اُ').replace(/(?<=[ء-ۿ])a|a(?=[ء-ۿ])/g, 'ؤ').replace(/(?<=[ء-ۿ])e|e(?=[ء-ۿ])/g, 'ئ');
}
/** A numbered Wikisource collection ("1 / stanza / 2 / stanza"), one piece per number, in page order. */
function wsNumbered(title) {
  const pages = JSON.parse(readFileSync(WS_CACHE, 'utf8'));
  const wt = pages[title];
  if (!wt) return null;
  const url = `https://wikisource.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
  const out = []; let cur = null;
  for (const b of [...wt.matchAll(/<poem[^>]*>([\s\S]*?)<\/poem>/g)].map((m) => m[1]))
    for (const chunk of b.split(/\n\s*\n/)) {
      for (const l of chunk.split('\n').map(wsClean)) {
        if (!l || /^[.۔\s-]+$/.test(l)) continue;
        if (/^[\d۰-۹]+\s*\.?$/.test(l)) { cur = { anchor: null, heading: l, sts: [[]], url }; out.push(cur); continue; }
        if (cur) cur.sts.at(-1).push(l);
      }
      if (cur && cur.sts.at(-1).length) cur.sts.push([]);
    }
  for (const p of out) p.sts = p.sts.filter((st) => st.length);
  return out.filter((p) => p.sts.length);
}

/* ---------- matching (from punjabi-kavita.mjs) ---------- */

function skeleton(s) {
  return s
    .replace(/[ً-ٰٟۖ-ۭ]/g, '')
    .replace(/[^\p{L}\s]/gu, ' ')
    .replace(/[ھہۃة]/g, 'ه').replace(/[یيےۓئ]/g, 'ی').replace(/[ؤو]/g, 'و').replace(/[آأإ]/g, 'ا')
    .replace(/[شس]/g, 'س').replace(/[صث]/g, 'س').replace(/[ذضظز]/g, 'ز').replace(/[طت]/g, 'ت').replace(/[حه]/g, 'ه')
    .replace(/[عا]/g, 'ا').replace(/[ڑر]/g, 'ر').replace(/[ںن]/g, 'ن').replace(/[قک]/g, 'ک').replace(/ء/g, '')
    .split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w));
}
const STOP = new Set(['هو', 'نی', 'وو', 'وی', 'دا', 'دی', 'نون', 'تی', 'وچ', 'نه', 'می', 'مین', 'اه', 'جی', 'کی', 'سی', 'فریدا', 'فریده', 'فرید', 'باهو', 'بلها', 'بلهیا', 'حسین', 'هاسم', 'محمد']);
function fingerprint(lines) {
  const ls = lines.slice(0, 40).map((l) => l.replace(/^\S{1,5}\s*-\s*/, ''));
  const words = skeleton(ls.join(' '));
  const head = words.join('').slice(0, 40);
  const grams = new Set([...head].map((c, i) => c + (head[i + 1] ?? '')).slice(0, -1));
  return { open: new Set(words.slice(0, 12)), body: new Set(words), grams };
}
const contained = (a, b) => { if (a.size < 4) return 0; let n = 0; for (const w of a) if (b.has(w)) n++; return n / a.size; };
const match = (a, b) => Math.max(similar([...a.open], [...b.open]), contained(a.open, b.body), contained(b.open, a.body),
  a.grams.size >= 20 && b.grams.size >= 20 ? similar([...a.grams], [...b.grams]) : 0);
function similar(a, b) {
  const A = new Set(a), B = new Set(b);
  if (!A.size || !B.size) return 0;
  let n = 0; for (const w of A) if (B.has(w)) n++;
  return (2 * n) / (A.size + B.size);
}

/* ---------- archive ---------- */

const LATIN = {
  'ا': 'a', 'آ': 'a', 'أ': 'a', 'ب': 'b', 'پ': 'p', 'ت': 't', 'ٹ': 't', 'ث': 's', 'ج': 'j', 'چ': 'ch', 'ح': 'h', 'خ': 'kh',
  'د': 'd', 'ڈ': 'd', 'ذ': 'z', 'ر': 'r', 'ڑ': 'r', 'ز': 'z', 'ژ': 'zh', 'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'z', 'ط': 't',
  'ظ': 'z', 'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ک': 'k', 'ك': 'k', 'گ': 'g', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ں': 'n',
  'و': 'o', 'ؤ': 'o', 'ہ': 'h', 'ھ': 'h', 'ۃ': 'h', 'ء': '', 'ی': 'i', 'ي': 'i', 'ئ': 'i', 'ے': 'e', 'ۓ': 'e', 'ݨ': 'n',
};
const slug = (t) => [...t.replace(/[ً-ٰٟۖ-ۭ]/g, '')].map((c) => LATIN[c] ?? (/\s/.test(c) ? '-' : '')).join('')
  .replace(/-+/g, '-').replace(/^-|-$/g, '').split('-').slice(0, 8).join('-') || 'poem';
const q = (s) => JSON.stringify(s);
const tidyTitle = (t) => carriers(t).replace(/[\s،,۔.!؟?؛;:'"-]+$/, '').replace(/^['"]+/, '');

function loadArchive() {
  const out = [];
  for (const f of readdirSync(POEMS).filter((f) => f.endsWith('.md'))) {
    const s = readFileSync(`${POEMS}/${f}`, 'utf8');
    const poet = s.match(/^poet: (.*)$/m)?.[1];
    const lines = [...s.matchAll(/^ {2}- text: (".*")$/gm)].flatMap((m) => JSON.parse(m[1]).split('\n'));
    const url = s.match(/^ {2}url: "?(.*?)"?$/m)?.[1] ?? null;
    out.push({ id: f.slice(0, -3), poet, lines, url: url && decodeURI(url), fp: fingerprint(lines), src: s });
  }
  return out;
}

/* ---------- pieces of each source ---------- */

function piecesOf(cfg) {
  if (cfg.wsOrder) {
    // Wikisource gives the fuller collection: its order first, then pieces only punjabi-kavita has.
    const ws = wsNumbered(cfg.ws) ?? [];
    const pk = piecesOf({ ...cfg, wsOrder: false }) ?? [];
    const wf = ws.map((p) => fingerprint(p.sts.flat()));
    return [...ws, ...pk.filter((p) => { const f = fingerprint(p.sts.flat()); return !wf.some((w) => match(f, w) >= 0.66); })];
  }
  const file = `${CACHE}/${cfg.page}.html`;
  if (!existsSync(file)) return null;
  const html = readFileSync(file, 'utf8');
  const url = `${BASE}${cfg.page}.php`;
  if (cfg.numbered) return numberedPieces(html).map((p) => ({ ...p, url }));
  if (cfg.single) {
    // The whole page is one poem; its <h3> headings (months, days) are the poem's section heads, kept as one-line stanzas.
    const secs = sections(html);
    const intro = stanzas(mainContent(html).replace(/<h1[\s\S]*?<\/h1>/i, '').split(/<h[23][^>]*>/i)[0]);
    const sts = [...dropNote(intro), ...secs.flatMap((s) => [...(s.heading ? [[s.heading]] : []), ...s.sts])];
    return [{ anchor: null, heading: cfg.title, sts, url }];
  }
  if (cfg.siharfi) {
    // <h2> "پہلی سیہرفی" starts a siharfi; its <h3> letter headings ("علف-") label the stanzas that follow.
    const out = [];
    for (const s of sections(html)) {
      if (/سیہرفی$/.test(s.heading)) out.push({ anchor: s.anchor, heading: s.heading, sts: [...s.sts], url });
      else if (out.length) out.at(-1).sts.push(...s.sts.map((st, i) => (i === 0 && s.heading ? [`${s.heading}${st[0]}`.replace(/-(?=\S)/, '-'), ...st.slice(1)] : st)));
    }
    return out.filter((p) => p.sts.length);
  }
  // A later <h2> with no verse of its own ("بھاگ پہلا: رس رنگ چھوہ") is a part heading for the pieces after it.
  const out = []; let chapter; let seenH2 = false;
  for (const s of sections(html)) {
    if (s.level === 2 && !s.sts.length) { if (seenH2 && /[ء-ۿ]/.test(s.heading)) chapter = s.heading; if (/[ء-ۿ]/.test(s.heading)) seenH2 = true; continue; }
    if (s.level === 2) seenH2 = true;
    if (s.sts.length) out.push({ ...s, chapter, url: `${url}${s.anchor ? '#' + s.anchor : ''}` });
  }
  return out;
}

/** GGS Farid shaloks by the Sikh Gurus, as punjabi-kavita.com's note lists them. */

/**
 * Hand-checked pairings where spellings differ too much for the matcher: "work:piece number" → archive poem id,
 * or null to force a new poem. Each was read side by side before it was added here.
 */
const OVERRIDES = {
  // Wikisource's GGS shaloks in fuller spelling: same two lines as punjabi-kavita's.
  'shalok-baba-farid:18': 'jan-lobh-tan-nihnh-kia',
  'shalok-baba-farid:68': 'bhni-ghri-sonoi',
  'shalok-baba-farid:95': 'ap-snoarin-min-mlin',
  // Wikisource's "مائیں نی میں کیہنوں آکھاں … دھواں دھکے" is this version (no. 83); no. 27 is a shorter version on the same page.
  'kafian-shah-hussain:83': 'main-ni-min-kihnon-akhan',
};
/**
 * Archive poems that belong to no piece: the empty placeholder; Wikisource's "شبد بابا شیخ فرید", which holds all
 * four shabads in one file (each shabad is written as its own poem instead); and Wikisource's "تِیوں ہر کا بھو",
 * only the last lines of shalok 52 (Guru Amar Das), which is written whole from the page instead.
 */
const EXCLUDE = new Set(['ilmon-bas-karin-o-yar', 'shbd-baba-shikh-frid', 'tion-hr-ka-bho']);

function plan() {
  const archive = loadArchive();
  const byId = new Map(archive.map((a) => [a.id, a]));
  const results = [];
  const claimed = new Map(); // archive id → work
  const all = [];
  for (const cfg of SOURCES) {
    const pieces = piecesOf(cfg);
    if (!pieces) { results.push({ cfg, missing: true, items: [] }); continue; }
    const items = pieces.map((p, k) => ({ p, i: k + 1, cfg, fp: fingerprint(p.sts.flat()), guru: !!(cfg.ggs && GURU_SHALOKS.has(k + 1)), hit: null }));
    // A piece the page prints twice word for word (KafianShahHussain repeats a block of 15 kafis) is left out the second time.
    // So is one printed again with only spelling changes: same number of lines, nearly all the same words.
    for (const x of items) {
      const w = skeleton(x.p.sts.flat().join(' ')), n = x.p.sts.flat().length;
      const twin = items.slice(0, x.i - 1).find((y) => !y.dup && y.p.sts.flat().length === n && similar(w, skeleton(y.p.sts.flat().join(' '))) >= 0.85);
      if (twin) x.dup = twin.i;
    }
    results.push({ cfg, items });
    all.push(...items.filter((x) => !x.dup));
  }
  const take = (x, id, score, how) => { x.hit = { id, score, how }; claimed.set(id, x.cfg.work); if (process.env.WHO === id) console.log('WHO', x.cfg.work, x.i, how, score, x.p.sts[0][0]); };
  // 1. hand-checked pairings, 2. same source URL (anchor), 3. best text matches first, across all of a poet's works.
  for (const x of all) {
    const k = `${x.cfg.work}:${x.i}`;
    if (k in OVERRIDES) { if (OVERRIDES[k]) take(x, OVERRIDES[k], 1, 'hand'); else x.forceNew = true; }
  }
  // Some pages repeat anchors (KafianShahHussain has Hussain021–035 twice): those are matched by text only.
  const urlCount = {};
  for (const x of all) urlCount[x.p.url] = (urlCount[x.p.url] ?? 0) + 1;
  for (const x of all) {
    if (x.hit || x.forceNew || !x.p.url.includes('#') || urlCount[x.p.url] > 1) continue;
    const a = archive.find((a) => a.poet === x.cfg.poet && a.url === decodeURI(x.p.url) && !claimed.has(a.id) && !EXCLUDE.has(a.id));
    if (a && match(x.fp, a.fp) >= 0.3) take(x, a.id, 1, 'url');
  }
  const pairs = [];
  for (const x of all) {
    if (x.hit || x.forceNew) continue;
    for (const a of archive) if (a.poet === x.cfg.poet && !claimed.has(a.id) && !EXCLUDE.has(a.id)) { const sc = match(x.fp, a.fp); if (sc >= 0.3) pairs.push([sc, x, a]); }
  }
  // Farid's Guru Granth Sahib shaloks are matched first: Wikisource's Farid pages are GGS shaloks, and the
  // "outside the GGS" page repeats several of them in other readings, which become poems of their own.
  pairs.sort((p, q) => (p[1].cfg.priority ?? 1) - (q[1].cfg.priority ?? 1) || q[0] - p[0]);
  for (const [sc, x, a] of pairs) if (sc >= 0.66 && !x.hit && !claimed.has(a.id)) take(x, a.id, sc, 'text');
  for (const [sc, x, a] of pairs) if (!x.hit && !claimed.has(a.id)) (x.near ??= []).length < 2 && x.near.push([sc, a]);
  return { archive, byId, results, claimed };
}

const whoHas = (results, id) => results.flatMap((r) => r.items.filter((x) => x.hit?.id === id).map((x) => `${r.cfg.work}:${x.i} (${x.hit.score.toFixed(2)}) ${x.p.sts[0][0]}`)).join('; ');
function report() {
  const { results, archive, claimed } = plan();
  for (const { cfg, items, missing } of results) {
    if (missing) { console.log(`${cfg.work}: page not fetched`); continue; }
    const newOnes = items.filter((x) => !x.hit && !x.guru && !x.dup);
    const dups = items.filter((x) => x.dup);
    console.log(`\n== ${cfg.work}: ${items.length} pieces, ${items.filter((x) => x.hit && !x.guru).length} in archive, ${newOnes.length} new, ${items.filter((x) => x.guru).length} by Gurus`);
    for (const x of newOnes) {
      console.log('  new', x.i, '|', x.p.heading, '|', x.p.sts[0]?.[0]);
      for (const [sc, a] of x.near ?? []) console.log('      ?', sc.toFixed(2), a.id, '|', a.lines.slice(0, 2).join(' / '));
      if (process.env.CLAIMED) {
        const b = archive.filter((a) => a.poet === cfg.poet).map((a) => [match(x.fp, a.fp), a]).sort((p, q) => q[0] - p[0])[0];
        if (b && b[0] >= 0.5) console.log('      taken', b[0].toFixed(2), b[1].id, '→', claimed.get(b[1].id), whoHas(results, b[1].id), '|', b[1].lines.slice(0, 2).join(' / '));
      }
    }
    if (dups.length) console.log('  printed twice on the page (left out):', dups.map((x) => `${x.i}=${x.dup}`).join(' '));
    for (const x of items.filter((x) => x.guru && x.hit)) console.log('  GURU shalok', x.i, 'is in the archive as', x.hit.id);
    if (process.env.SHORT) for (const x of items.filter((x) => x.hit)) { const a = archive.find((a) => a.id === x.hit.id); const w = a.lines.join(' ').split(/\s+/).length, v = x.p.sts.flat().join(' ').split(/\s+/).length; if (w < v * 0.8 || w > v * 1.25) console.log('  length', x.i, x.hit.id, `archive ${w} words, page ${v}`); }
    if (process.env.WEAK) for (const x of items.filter((x) => x.hit?.how === 'text' && x.hit.score < 0.8)) console.log('  weak', x.i, x.hit.score.toFixed(2), x.p.sts[0][0], '||', x.hit.id);
    if (process.env.ALL) for (const x of items.filter((x) => x.hit)) console.log('  ', x.i, x.hit.id, x.hit.how, x.hit.score.toFixed(2), x.guru ? 'GURU' : '');
  }
  for (const poet of new Set(SOURCES.map((s) => s.poet))) {
    const loose = archive.filter((a) => a.poet === poet && !claimed.has(a.id) && !EXCLUDE.has(a.id));
    console.log(`\n${poet}: ${loose.length} archive poems in no work`);
    for (const a of loose) console.log('  ', a.id, '|', a.lines[0], '|', a.url?.slice(0, 80));
  }
}

/* ---------- build ---------- */

function setWork(src, work) {
  const end = src.indexOf('\n---', 4);
  let fm = src.slice(0, end), rest = src.slice(end);
  fm = fm.replace(/\nwork:\n(?: {2}.*\n?)*/g, '\n').replace(/\n+$/, '');
  const block = [`work:`, `  id: ${work.id}`, `  n: ${work.n}`, ...(work.chapter ? [`  chapter: ${q(work.chapter)}`] : [])].join('\n');
  return `${fm}\n${block}${rest}`;
}

/** The heading lines a piece stands under, when they are a raag or section name rather than a number. */
const chapterOf = (cfg, p) => p.chapter ?? (cfg.headingChapter && p.headLines?.length
  ? p.headLines.map((l) => l.replace(/^[\d۰-۹]+\s*\.\s*/, '')).filter((l) => !/^[\d۰-۹]*$/.test(l)).join(' / ') || undefined
  : undefined);

function newPoem(cfg, x, ids) {
  const p = x.p;
  const form = p.heading === 'کافی' ? 'kafi' : cfg.form;
  const lines = p.sts.flat();
  let verses = p.sts.map((s) => ({ text: s.join('\n') }));
  if (form === 'dohra') verses = p.sts.flatMap((s) => (s.length === 4 ? [s.slice(0, 2), s.slice(2)] : [s])).map((s) => ({ text: s.join('\n') }));
  if (form === 'kafi' && verses.length > 2 && verses[0].text.split('\n').length <= 2) {
    const k = skeleton(verses[0].text).join(' ');
    const again = verses.slice(1).filter((v) => skeleton(v.text).join(' ') === k);
    if (again.length) { verses[0].refrain = true; again.forEach((v) => (v.refrain = true)); }
  }
  const useHeading = p.heading && !/^[\d۰-۹]+$/.test(p.heading) && !/^نوٹ/.test(p.heading) && !cfg.ggs && !cfg.numbered && !cfg.headingChapter;
  const title = tidyTitle(cfg.single ? cfg.title : useHeading ? p.heading : lines.find((l) => !/^\S{1,6}\s*-$/.test(l)) ?? lines[0]);
  let id = slug(title), n = 2;
  while (ids.has(id)) id = `${slug(title)}-${n++}`;
  ids.add(id);
  const note = x.guru
    ? `By ${GURU_OF[x.i]}, not Baba Farid: it stands as shalok ${x.i} among Sheikh Farid's shaloks in the Guru Granth Sahib, as punjabi-kavita.com notes. ${PK_NOTE}`
    : cfg.note ?? PK_NOTE;
  const fm = ['---', `poet: ${cfg.poet}`, `form: ${form}`, `title: ${q(title)}`, 'verses:'];
  for (const v of verses) { fm.push(`  - text: ${q(v.text)}`); if (v.refrain) fm.push('    refrain: true'); }
  fm.push('source:', `  book: ${q(cfg.book)}`, ...(cfg.year ? [`  year: ${cfg.year}`] : []), `  url: ${q(p.url)}`);
  fm.push(`verification_note: ${q(note)}`, '---', '');
  if (p.variant?.length) fm.push('Another reading of this poem given by punjabi-kavita.com:', '', ...p.variant.map((l) => `> ${l}  `), '');
  if (p.notes?.length) fm.push("Editor's note on punjabi-kavita.com (in Punjabi):", '', ...p.notes.map((n) => `> ${n}`), '');
  return { id, src: fm.join('\n') };
}

function workFile(cfg) {
  const fm = ['---', `poet: ${cfg.poet}`, `title: ${q(cfg.title)}`, `title_en: ${q(cfg.title_en)}`, `form: ${cfg.form}`, `kind: ${cfg.kind}`];
  if (cfg.year) fm.push(`year: ${cfg.year}`);
  const [book, url] = cfg.wsOrder
    ? [`Wikisource (Punjabi), public-domain transcription: ${cfg.ws}`, `https://wikisource.org/wiki/${encodeURIComponent(cfg.ws.replace(/ /g, '_'))}`]
    : [cfg.book, `${BASE}${cfg.page}.php`];
  fm.push(`order: ${cfg.order}`, 'source:', `  book: ${q(book)}`, `  url: ${q(url)}`, '---', '');
  if (cfg.intro) fm.push(cfg.intro, '');
  return fm.join('\n');
}

function build(dry) {
  const { results, byId, archive, claimed } = plan();
  const ids = new Set(byId.keys());
  const stat = {};
  const written = [];
  mkdirSync(WORKS, { recursive: true });
  for (const { cfg, items, missing } of results) {
    if (missing) continue;
    const r = (stat[cfg.work] = { attached: 0, written: 0, extra: 0, dups: 0, gurus: 0 });
    let n = 0;
    const attach = (a, chapter) => {
      const out = setWork(a.src, { id: cfg.work, n, chapter });
      if (!dry && out !== a.src) writeFileSync(`${POEMS}/${a.id}.md`, out);
    };
    for (const x of items) {
      if (x.dup) { r.dups++; continue; }
      n++;
      if (x.guru) r.gurus++;
      const chapter = chapterOf(cfg, x.p);
      if (x.hit) { attach(byId.get(x.hit.id), chapter); r.attached++; }
      else {
        const np = newPoem(cfg, x, ids);
        if (!dry) writeFileSync(`${POEMS}/${np.id}.md`, setWork(np.src, { id: cfg.work, n, chapter }));
        written.push(`${cfg.work} ${n} ${np.id}`);
        r.written++;
      }
    }
    if (cfg.extra) {
      // Kafis in the archive from other sources (Wikisource) that this page does not have: after the page's own, by title.
      const loose = archive.filter((a) => a.poet === cfg.poet && !claimed.has(a.id) && !EXCLUDE.has(a.id) && a.lines.length && /^form: kafi$/m.test(a.src))
        .sort((a, b) => a.src.match(/^title: (.*)$/m)[1].localeCompare(b.src.match(/^title: (.*)$/m)[1], 'ur'));
      for (const a of loose) { n++; claimed.set(a.id, cfg.work); attach(a); r.extra++; }
    }
    if (!dry) writeFileSync(`${WORKS}/${cfg.work}.md`, workFile(cfg));
  }
  console.table(stat);
  if (process.env.LIST) console.log(written.join('\n'));
}

const [cmd, flag] = process.argv.slice(2);
if (cmd === 'fetch') await fetchAll();
else if (cmd === 'report') report();
else if (cmd === 'show') { // show work:n … — print source pieces for checking by eye
  const { results } = plan();
  for (const k of process.argv.slice(3)) { const [w, i] = k.split(':'); const x = results.find((r) => r.cfg.work === w)?.items[Number(i) - 1]; console.log(`--- ${k} ${x?.hit?.id ?? 'new'}\n${x?.p.sts.map((s) => s.join('\n')).join('\n\n')}`); }
}
else if (cmd === 'build') build(flag === '--dry');
else console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0]);
