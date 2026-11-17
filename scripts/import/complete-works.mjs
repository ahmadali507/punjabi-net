#!/usr/bin/env node
/**
 * Group Waris Shah's, Hashim Shah's and Mian Muhammad Bakhsh's poems into whole works.
 *
 *   node scripts/import/complete-works.mjs [--dry]
 *
 * Writes src/content/works/<id>.md for each work and adds `work: { id, n, chapter? }` to the poem files that
 * belong to it. No poem text is written or changed: every poem already in the archive came verbatim from
 * Wikisource or punjabi-kavita.com, and this script only records where each one sits in its work, in the
 * source's own order:
 *   - Wikisource works with an index page (Heer, Saif ul Malook): the order of the index's links; for Saif ul
 *     Malook the index's section heading becomes `chapter`.
 *   - Wikisource pages that hold several pieces (Siharfian, Deodhan, Munajat, Dohre Mian Muhammad Bakhsh): the
 *     order in which each piece's first line occurs on the page.
 *   - punjabi-kavita's Dohre Hashim Shah: the page's section order (#Hashim1 … #Hashim208). The 14 dohre that
 *     came from single Wikisource pages are placed at the punjabi-kavita section they match (same lines, spelling
 *     differences evened out).
 *   - Whole qissas stored as one poem (Hashim Shah's four qissas, Mehraj Nama) are the single part of their work.
 * Needs .cache/wikisource.json (wikisource.mjs fetch) and .cache/punjabi-kavita/DohreHashimShahmukhi.html.
 * Safe to re-run: an existing `work:` block is replaced.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url).pathname;
const POEMS = `${ROOT}src/content/poems`;
const WORKS_DIR = `${ROOT}src/content/works`;
const pages = JSON.parse(readFileSync(`${ROOT}.cache/wikisource.json`, 'utf8'));
const dry = process.argv.includes('--dry');

const WS = (t) => `https://wikisource.org/wiki/${encodeURIComponent(t.replace(/ /g, '_'))}`;
const WSBOOK = (t) => `Wikisource (Punjabi), public-domain transcription: ${t}`;
const PK = 'https://www.punjabi-kavita.com/';

/* ---------- works ---------- */

const WORKS = {
  'heer-waris-shah': { poet: 'waris-shah', title: 'ہیر وارث شاہ', title_en: 'Heer', form: 'qissa', kind: 'qissa', order: 1,
    source: { book: WSBOOK('ہیر وارث شاہ'), url: WS('ہیر وارث شاہ') } },
  'mehraj-nama-waris-shah': { poet: 'waris-shah', title: 'مہراج نامہ', title_en: 'Mehraj Nama', form: 'nazm', kind: 'book', order: 2,
    source: { book: 'Mehraj Nama (punjabi-kavita.com, Shahmukhi)', url: `${PK}MihrajNamaWarisShahShahmukhi.php` } },

  'sassi-punnun-hashim-shah': { poet: 'hashim-shah', title: 'سسی پنوں', title_en: 'Sassi Punnun', form: 'qissa', kind: 'qissa', order: 1,
    source: { book: WSBOOK('سسی پنوں'), url: WS('سسی پنوں') } },
  'sohni-mahiwal-hashim-shah': { poet: 'hashim-shah', title: 'سوہنی مہینوال', title_en: 'Sohni Mahiwal', form: 'qissa', kind: 'qissa', order: 2,
    source: { book: WSBOOK('سوہنی مہینوال ہاشم شاہ'), url: WS('سوہنی مہینوال ہاشم شاہ') } },
  'shirin-farhad-hashim-shah': { poet: 'hashim-shah', title: 'شیریں فرہاد', title_en: 'Shirin Farhad', form: 'qissa', kind: 'qissa', order: 3,
    source: { book: WSBOOK('شیریں فرہاد'), url: WS('شیریں فرہاد') } },
  'heer-ranjha-hashim-shah': { poet: 'hashim-shah', title: 'ہیر رانجھا', title_en: 'Heer Ranjha', form: 'qissa', kind: 'qissa', order: 4,
    source: { book: WSBOOK('ہیر رانجھا'), url: WS('ہیر رانجھا') } },
  'dohre-hashim-shah': { poet: 'hashim-shah', title: 'دوہڑے ہاشم شاہ', title_en: 'Dohre', form: 'dohra', kind: 'collection', order: 5,
    source: { book: 'Dohre Hashim Shah (punjabi-kavita.com, Shahmukhi)', url: `${PK}DohreHashimShahmukhi.php` } },
  'siharfian-hashim-shah': { poet: 'hashim-shah', title: 'سیہرفیاں ہاشم شاہ', title_en: 'Siharfian', form: 'siharfi', kind: 'collection', order: 6,
    source: { book: WSBOOK('سیہرفیاں ہاشم شاہ'), url: WS('سیہرفیاں ہاشم شاہ') } },
  'deodhan-hashim-shah': { poet: 'hashim-shah', title: 'ڈیوڈھاں ہاشم شاہ', title_en: 'Deodhan', form: 'nazm', kind: 'collection', order: 7,
    source: { book: WSBOOK('ڈیوڈھاں ہاشم شاہ'), url: WS('ڈیوڈھاں ہاشم شاہ') } },
  'munajat-hashim-shah': { poet: 'hashim-shah', title: 'مناجات ہاشم شاہ', title_en: 'Munajat', form: 'nazm', kind: 'collection', order: 8,
    source: { book: WSBOOK('مناجات ہاشم شاہ'), url: WS('مناجات ہاشم شاہ') } },

  'saif-ul-malook': { poet: 'mian-muhammad-bakhsh', title: 'قصہ سیف الملوک', title_en: 'Saif ul Malook', form: 'qissa', kind: 'qissa', order: 1,
    source: { book: WSBOOK('قصہ سیف الملوک'), url: WS('قصہ سیف الملوک') } },
  'dohre-mian-muhammad-bakhsh': { poet: 'mian-muhammad-bakhsh', title: 'دوہڑے میاں محمد بخش', title_en: 'Dohre', form: 'dohra', kind: 'collection', order: 2,
    source: { book: WSBOOK('دوہڑے میاں محمد بخش'), url: WS('دوہڑے میاں محمد بخش') } },
};

/* ---------- poems in the archive ---------- */

const q = (s) => JSON.stringify(s);
const poems = readdirSync(POEMS).filter((f) => f.endsWith('.md')).map((f) => {
  const s = readFileSync(`${POEMS}/${f}`, 'utf8');
  const url = s.match(/^ {2}url: "(.*)"$/m)?.[1] ?? '';
  return {
    file: f, s,
    poet: s.match(/^poet: (.*)$/m)[1].trim(),
    book: JSON.parse(s.match(/^ {2}book: (".*")$/m)?.[1] ?? '""'),
    url: decodeURIComponent(url),
    lines: [...s.matchAll(/^ {2}- text: (".*")$/gm)].flatMap((m) => JSON.parse(m[1]).split('\n')),
  };
});
const wsTitle = (p) => (p.url.startsWith('https://wikisource.org/wiki/') ? p.url.slice(28).replace(/_/g, ' ') : null);

/* ---------- matching helpers ---------- */

const HARAKAT = /[ً-ٰٟۖ-ۭ]/g;
/** Letters only, vowel marks and markup gone: for finding a line inside a page's wikitext. */
const bare = (s) => s.replace(HARAKAT, '').replace(/[^\p{L}]/gu, '');
/** Spelling skeleton across sources (as in punjabi-kavita.mjs). */
const skeleton = (s) => s.replace(HARAKAT, '').replace(/[^\p{L}\s]/gu, ' ')
  .replace(/[ھہۃة]/g, 'ه').replace(/[یيےۓئ]/g, 'ی').replace(/[ؤو]/g, 'و').replace(/[آأإ]/g, 'ا')
  .replace(/[شسصث]/g, 'س').replace(/[ذضظز]/g, 'ز').replace(/[طت]/g, 'ت').replace(/[حه]/g, 'ه')
  .replace(/[عا]/g, 'ا').replace(/[ڑر]/g, 'ر').replace(/[ںن]/g, 'ن').replace(/[قک]/g, 'ک').replace(/ء/g, '')
  .split(/\s+/).filter((w) => w.length > 1);
const jaccard = (a, b) => { const A = new Set(a), B = new Set(b); let n = 0; for (const w of A) if (B.has(w)) n++; return n / (A.size + B.size - n || 1); };

/* ---------- assignments ---------- */

const assign = []; // { file, work, n, chapter? }
const problems = [];

// 1. Wikisource index pages.
function indexed(work, index, withChapter) {
  const text = pages[index];
  const links = [...text.matchAll(/^\*\s*\[\[([^\]|]+)(?:\|[^\]]*)?\]\][ \t]*\.?[ \t]*(.*)$/gm)].map((m) => ({ title: m[1].trim(), heading: m[2].trim() }));
  const byTitle = new Map(poems.filter(wsTitle).map((p) => [wsTitle(p), p]));
  links.forEach((l, i) => {
    const p = byTitle.get(l.title);
    if (!p) { problems.push(`${work}: no poem file for index entry ${i + 1} «${l.title}»`); return; }
    assign.push({ file: p.file, work, n: i + 1, ...(withChapter && l.heading ? { chapter: l.heading } : {}) });
  });
  return links.length;
}
const heerParts = indexed('heer-waris-shah', 'ہیر وارث شاہ', false);
const saifParts = indexed('saif-ul-malook', 'قصہ سیف الملوک', true);

// 2. Wikisource pages holding several pieces: order of first lines on the page.
function onPage(work, title, chapters = []) {
  const page = bare(pages[title]);
  const ps = poems.filter((p) => wsTitle(p) === title);
  const pos = ps.map((p) => {
    const first = p.lines.find((l) => bare(l).length > 8) ?? p.lines[0];
    const i = page.indexOf(bare(first));
    if (i < 0) problems.push(`${work}: first line of ${p.file} not found on the page`);
    return [i, p];
  }).sort((a, b) => a[0] - b[0]);
  pos.forEach(([, p], i) => assign.push({ file: p.file, work, n: i + 1, ...(chapters[i] ? { chapter: chapters[i] } : {}) }));
  return ps.length;
}
const counts = {
  // The page heads each siharfi "پہلی سیہرفی", "دوجی سیہرفی" …: those headings become the chapters.
  'siharfian-hashim-shah': onPage('siharfian-hashim-shah', 'سیہرفیاں ہاشم شاہ',
    (pages['سیہرفیاں ہاشم شاہ'].match(/^\s*\S+ سیہرفی\s*$/gm) ?? []).map((h) => h.trim())),
  'deodhan-hashim-shah': onPage('deodhan-hashim-shah', 'ڈیوڈھاں ہاشم شاہ'),
  'munajat-hashim-shah': onPage('munajat-hashim-shah', 'مناجات ہاشم شاہ'),
  'dohre-mian-muhammad-bakhsh': onPage('dohre-mian-muhammad-bakhsh', 'دوہڑے میاں محمد بخش'),
};

// 3. Whole works stored as one poem.
for (const [work, title] of [['sassi-punnun-hashim-shah', 'سسی پنوں'], ['sohni-mahiwal-hashim-shah', 'سوہنی مہینوال ہاشم شاہ'],
  ['shirin-farhad-hashim-shah', 'شیریں فرہاد'], ['heer-ranjha-hashim-shah', 'ہیر رانجھا']]) {
  const ps = poems.filter((p) => p.poet === 'hashim-shah' && wsTitle(p) === title);
  if (ps.length !== 1) problems.push(`${work}: expected one poem file, found ${ps.length}`);
  else assign.push({ file: ps[0].file, work, n: 1 });
}
{
  const ps = poems.filter((p) => p.poet === 'waris-shah' && p.url.includes('MihrajNamaWarisShah'));
  if (ps.length !== 1) problems.push(`mehraj-nama-waris-shah: expected one poem file, found ${ps.length}`);
  else assign.push({ file: ps[0].file, work: 'mehraj-nama-waris-shah', n: 1 });
}

// 4. Dohre Hashim Shah in punjabi-kavita's section order.
{
  const html = readFileSync(`${ROOT}.cache/punjabi-kavita/DohreHashimShahmukhi.html`, 'utf8');
  const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
  const sections = html.split(/<h3[^>]*>/i).slice(1).map((part) => {
    const anchor = part.match(/name="([^"]+)"/)?.[1];
    const body = decode(part.replace(/<div id="meaning">[\s\S]*?<\/div>/g, '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''));
    const ls = body.split('\n').filter((l) => /[ء-ۿ]/.test(l));
    return { anchor, words: skeleton(ls.slice(0, 8).join(' ')), first: skeleton((ls[0] ?? '').split(/[،,]/)[0]) };
  }).filter((s) => s.anchor?.startsWith('Hashim'));
  const byAnchor = new Map(poems.filter((p) => p.url.includes('DohreHashimShahmukhi.php#')).map((p) => [p.url.split('#')[1], p]));
  const loose = poems.filter((p) => p.poet === 'hashim-shah' && wsTitle(p) && /^form: dohra$/m.test(p.s));
  const taken = new Set();
  sections.forEach((sec, i) => {
    let p = byAnchor.get(sec.anchor);
    if (!p) {
      // Same lines, or (another recension of the same dohra) the same opening line.
      const score = (c) => Math.max(jaccard(sec.words, skeleton(c.lines.slice(0, 8).join(' '))), jaccard(sec.first, skeleton(c.lines[0].split(/[،,]/)[0])) >= 0.6 ? 0.5 : 0);
      const scored = loose.filter((c) => !taken.has(c.file)).map((c) => [score(c), c]).sort((a, b) => b[0] - a[0]);
      if (scored[0]?.[0] >= 0.4) p = scored[0][1];
      else { problems.push(`dohre-hashim-shah: punjabi-kavita section ${sec.anchor} has no poem file (best ${scored[0]?.[0].toFixed(2)})`); return; }
    }
    taken.add(p.file);
    assign.push({ file: p.file, work: 'dohre-hashim-shah', n: i + 1 });
  });
  counts['dohre-hashim-shah'] = sections.length;
  for (const c of loose) if (!taken.has(c.file)) problems.push(`dohre-hashim-shah: Wikisource dohra ${c.file} matched no punjabi-kavita section`);
}

/* ---------- checks ---------- */

const seen = new Map();
for (const a of assign) {
  if (seen.has(a.file)) problems.push(`${a.file} assigned twice (${seen.get(a.file)} and ${a.work})`);
  seen.set(a.file, a.work);
}
const perWork = {};
for (const a of assign) (perWork[a.work] ??= []).push(a.n);
for (const [w, ns] of Object.entries(perWork)) {
  ns.sort((x, y) => x - y);
  if (ns.some((n, i) => n !== i + 1)) problems.push(`${w}: positions not continuous 1..${ns.length}`);
}
const unassigned = poems.filter((p) => ['waris-shah', 'hashim-shah', 'mian-muhammad-bakhsh'].includes(p.poet) && !seen.has(p.file));

/* ---------- write ---------- */

function workFile(w) {
  const lines = ['---', `poet: ${w.poet}`, `title: ${q(w.title)}`, `title_en: ${q(w.title_en)}`, `form: ${w.form}`, `kind: ${w.kind}`];
  if (w.year) lines.push(`year: ${q(w.year)}`);
  lines.push(`order: ${w.order}`, 'source:', `  book: ${q(w.source.book)}`, `  url: ${q(w.source.url)}`, '---', '');
  return lines.join('\n');
}
function withWork(s, a) {
  const end = s.indexOf('\n---', 4);
  let fm = s.slice(0, end).replace(/\nwork:\n(?: {2}.*\n?)*/g, '\n').replace(/\n+$/, '');
  fm += `\nwork:\n  id: ${a.work}\n  n: ${a.n}` + (a.chapter ? `\n  chapter: ${q(a.chapter)}` : '');
  return fm + s.slice(end);
}

if (!dry) {
  mkdirSync(WORKS_DIR, { recursive: true });
  for (const [id, w] of Object.entries(WORKS)) writeFileSync(`${WORKS_DIR}/${id}.md`, workFile(w));
  const byFile = new Map(poems.map((p) => [p.file, p]));
  for (const a of assign) {
    const p = byFile.get(a.file);
    const out = withWork(p.s, a);
    if (out !== p.s) writeFileSync(`${POEMS}/${a.file}`, out);
  }
}

console.table(Object.fromEntries(Object.keys(WORKS).map((w) => [w, { parts: perWork[w]?.length ?? 0 }])));
console.log(`Heer index entries: ${heerParts}; Saif ul Malook index entries: ${saifParts}; dohre sections: ${counts['dohre-hashim-shah']}`);
if (unassigned.length) console.log('Not in any work:', unassigned.map((p) => p.file).join(', '));
if (problems.length) console.log('Problems:\n- ' + problems.join('\n- '));
console.log(dry ? '(dry run, nothing written)' : `${Object.keys(WORKS).length} works, ${assign.length} poems placed`);
