#!/usr/bin/env node
/**
 * Fill gaps from punjabi-kavita.com's Shahmukhi pages (public-domain classical poets only).
 *
 *   node scripts/import/punjabi-kavita.mjs fetch          download the pages listed in PAGES to .cache/punjabi-kavita/
 *   node scripts/import/punjabi-kavita.mjs build [--dry]  write poems not already in the archive, print a report
 *
 * punjabi-kavita's Shahmukhi is a transliteration of its Gurmukhi text, so spellings differ from Wikisource's and
 * every poem says so. Poems are matched against the archive by their opening lines with spelling differences
 * evened out (see `skeleton`), and only new ones are written. The site's word notes (div#meaning) are not copied.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url).pathname;
const CACHE = `${ROOT}.cache/punjabi-kavita`;
const POEMS = `${ROOT}src/content/poems`;
const BASE = 'https://www.punjabi-kavita.com/';
const UA = { 'User-Agent': 'Mozilla/5.0 (punjabi-net archive; non-commercial; import script)' };

const PK_NOTE = 'Shahmukhi text from punjabi-kavita.com, a transliteration of its Gurmukhi text. Not yet checked against a printed edition.';
const PAGES = [
  { page: 'KafianBabaBullheShahShahmukhi', poet: 'bulleh-shah', form: 'kafi', book: 'Kafian Baba Bulleh Shah' },
  { page: 'KafianShahHussainShahmukhi', poet: 'shah-hussain', form: 'kafi', book: 'Kafian Shah Hussain' },
  { page: 'PunjabiPoetryHazratSultanBahuShahmukhi', poet: 'sultan-bahu', form: 'bait', book: 'Abyat Sultan Bahu' },
  { page: 'DohreHashimShahmukhi', poet: 'hashim-shah', form: 'dohra', book: 'Dohre Hashim Shah' },
  { page: 'ShabadBabaSheikhFaridShahmukhi', poet: 'baba-farid', form: 'nazm', book: 'Shabads of Baba Farid in the Guru Granth Sahib',
    note: 'Shabad of Baba Farid in the Guru Granth Sahib. ' + PK_NOTE },
  { page: 'ShlokBabaFaridShahmukhi', poet: 'baba-farid', form: 'shalok', book: 'Shaloks attributed to Baba Farid outside the Guru Granth Sahib',
    note: 'Attributed to Baba Farid; this shalok is not in the Guru Granth Sahib, and its authorship is uncertain. ' + PK_NOTE },
  { page: 'MihrajNamaWarisShahShahmukhi', poet: 'waris-shah', form: 'nazm', book: 'Mehraj Nama', whole: 'مہراج نامہ',
    note: 'Attributed to Waris Shah; scholars disagree on whether he wrote it. ' + PK_NOTE },
  // Bhai Vir Singh (1872–1957): public domain. Sources name the book itself, as the earlier Matak Hulare poems do.
  { page: 'MatakHulareBhaiVirSinghShahmukhi', poet: 'bhai-vir-singh', form: 'nazm', book: 'Matak Hulare', plainBook: true, year: 1922,
    note: "Shahmukhi text from punjabi-kavita.com, a transliteration of Bhai Vir Singh's Gurmukhi original (Matak Hulare, 1922). Not yet checked against a printed edition." },
  { page: 'TrelTupkeBhaiVirSinghShahmukhi', poet: 'bhai-vir-singh', form: 'nazm', book: 'Trel Tupke', plainBook: true,
    note: "Shahmukhi text from punjabi-kavita.com, a transliteration of Bhai Vir Singh's Gurmukhi original (Trel Tupke). Not yet checked against a printed edition." },
  { page: 'BijlianDeHarBhaiVirSinghShahmukhi', poet: 'bhai-vir-singh', form: 'nazm', book: 'Bijlian de Har', plainBook: true,
    note: "Shahmukhi text from punjabi-kavita.com, a transliteration of Bhai Vir Singh's Gurmukhi original (Bijlian de Har). Not yet checked against a printed edition." },
  { page: 'DilTarangBhaiVirSinghShahmukhi', poet: 'bhai-vir-singh', form: 'nazm', book: 'Dil Tarang', plainBook: true,
    note: "Shahmukhi text from punjabi-kavita.com, a transliteration of Bhai Vir Singh's Gurmukhi original (Dil Tarang). Not yet checked against a printed edition." },
  { page: 'KambdiKalaiBhaiVirSinghShahmukhi', poet: 'bhai-vir-singh', form: 'nazm', book: 'Kambdi Kalai', plainBook: true,
    note: "Shahmukhi text from punjabi-kavita.com, a transliteration of Bhai Vir Singh's Gurmukhi original (Kambdi Kalai). Not yet checked against a printed edition." },
  { page: 'KantMaheliBhaiVirSinghShahmukhi', poet: 'bhai-vir-singh', form: 'baran-maah', book: 'Kant Maheli', plainBook: true,
    note: "Shahmukhi text from punjabi-kavita.com, a transliteration of Bhai Vir Singh's Gurmukhi original (Kant Maheli). Not yet checked against a printed edition." },
];

async function fetchAll() {
  mkdirSync(CACHE, { recursive: true });
  for (const { page } of PAGES) {
    const r = await fetch(`${BASE}${page}.php`, { headers: UA });
    if (!r.ok) { console.log(`${page}: HTTP ${r.status}`); continue; }
    writeFileSync(`${CACHE}/${page}.html`, await r.text());
    console.log(`${page}: ok`);
    await new Promise((res) => setTimeout(res, 3000));
  }
}

/* ---------- parsing ---------- */

const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const text = (html) => decode(html.replace(/\s*\n\s*/g, ' ').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')).replace(/[ \t]+/g, ' ');
/**
 * The site's converter sometimes leaves Gurmukhi's vowel carriers as Latin letters: ੳ as "a", ੲ as "e".
 * Word-initially ੳ is اُ, inside a word ؤ; ੲ is ئ.
 */
const carriers = (l) => l.replace(/(^|[\s'"(-])a/g, '$1اُ').replace(/a/g, 'ؤ').replace(/e/g, 'ئ');
/** GGS-style verse numbers ("۔۔3۔۔", "۔۔4۔۔1۔۔488۔۔") are editorial; the double danda itself stays. */
const stripNumbers = (l) => l.replace(/(۔۔)(?:[\d۰-۹]+۔۔)+/g, '$1').replace(/۔۔رہاؤ۔۔/g, '۔۔ رہاؤ ۔۔');

function stanzas(body) {
  return text(body.replace(/<(style|script)\b[\s\S]*?<\/\1>/gi, '').replace(/<div id="meaning">[\s\S]*?<\/div>/g, ''))
    .split(/\n\s*\n/)
    .map((c) => c.split('\n').map((l) => carriers(stripNumbers(l.trim()))).filter((l) => /[ء-ۿ]/.test(l) && !/^[\d۰-۹\s.۔]+$/.test(l)))
    .filter((s) => s.length);
}

/** The poem area of a page: from its <h1> to the end of <main> (the footer and menus are not poetry). */
const mainContent = (html) => {
  const end = [html.indexOf('</main>'), html.search(/Contact Us/i)].filter((i) => i > 0);
  return html.slice(Math.max(0, html.indexOf('<h1')), end.length ? Math.min(...end) : undefined);
};

/** A stanza that is wholly in brackets is an editor's note ("this poem translates …"), not verse. */
const isNote = (st) => /^\([\s\S]*\)$/.test(st.join('\n').trim());

/** One entry per <h3> section: [anchor, heading, stanzas]. */
function sections(html) {
  const parts = mainContent(html).split(/<h3[^>]*>/i).slice(1);
  return parts.map((p) => {
    const [head, ...rest] = p.split(/<\/h3>/i);
    const anchor = head.match(/name="([^"]+)"/)?.[1] ?? null;
    const heading = text(head).trim().replace(/^[\d۰-۹]+\s*\.\s*/, '').split('\n')[0].trim();
    let sts = stanzas(rest.join(''));
    // "(پاٹھ بھید)": everything after it is another reading of the whole poem; keep it as a note.
    const v = sts.findIndex((st) => st.length === 1 && /^\(?پاٹھ بھید\)?$/.test(st[0]));
    const variant = v >= 0 ? sts.slice(v + 1).map((st) => st.join(' / ')) : [];
    if (v >= 0) sts = sts.slice(0, v);
    return [anchor, heading, sts.filter((st) => !isNote(st)), sts.filter(isNote).map((st) => st.join(' ')), variant];
  });
}

/* ---------- matching ---------- */

/**
 * Spelling skeleton for matching across sources: no vowel marks or punctuation, and the letters that
 * Gurmukhi→Shahmukhi transliteration renders differently folded together.
 */
function skeleton(s) {
  return s
    .replace(/[ً-ٰٟۖ-ۭ]/g, '')
    .replace(/[^\p{L}\s]/gu, ' ')
    .replace(/[ھہۃة]/g, 'ه').replace(/[یيےۓئ]/g, 'ی').replace(/[ؤو]/g, 'و').replace(/[آأإ]/g, 'ا')
    .replace(/[شس]/g, 'س').replace(/[صث]/g, 'س').replace(/[ذضظز]/g, 'ز').replace(/[طت]/g, 'ت').replace(/[حه]/g, 'ه')
    .replace(/[عا]/g, 'ا').replace(/[ڑر]/g, 'ر').replace(/[ںن]/g, 'ن').replace(/[قک]/g, 'ک').replace(/ء/g, '')
    .split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w));
}
/** Words too common to tell poems apart (after folding), and the poets' signatures. */
const STOP = new Set(['هو', 'نی', 'وو', 'وی', 'دا', 'دی', 'دی', 'نون', 'تی', 'وچ', 'نه', 'می', 'مین', 'اه', 'جی', 'کی', 'سی', 'فریدا', 'فریده', 'فرید', 'باهو', 'بلها', 'بلهیا', 'حسین', 'هاسم', 'محمد']);
/** A poem for matching: its first 12 words, and the words of its first 40 lines. Letter labels ("دال-") are dropped. */
function fingerprint(lines) {
  const ls = lines.slice(0, 40).map((l) => l.replace(/^\S{1,5}\s*-\s*/, ''));
  const words = skeleton(ls.join(' '));
  const head = words.join('').slice(0, 40);
  const grams = new Set([...head].map((c, i) => c + (head[i + 1] ?? '')).slice(0, -1));
  return { open: new Set(words.slice(0, 12)), body: new Set(words), grams };
}
const contained = (a, b) => { if (a.size < 4) return 0; let n = 0; for (const w of a) if (b.has(w)) n++; return n / a.size; };
/**
 * Same poem? Openings agree word for word or letter for letter (spelling variants), or one opening sits inside
 * the other's text (kafis that start at the refrain).
 */
const match = (a, b) => Math.max(similar([...a.open], [...b.open]), contained(a.open, b.body), contained(b.open, a.body),
  a.grams.size >= 20 && b.grams.size >= 20 ? similar([...a.grams], [...b.grams]) : 0);
function similar(a, b) {
  const A = new Set(a), B = new Set(b);
  if (!A.size || !B.size) return 0;
  let n = 0; for (const w of A) if (B.has(w)) n++;
  return (2 * n) / (A.size + B.size);
}


/* ---------- slugs and files (same conventions as wikisource.mjs) ---------- */

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

function refrains(verses) {
  if (verses.length > 2 && verses[0].text.split('\n').length <= 2) {
    const k = skeleton(verses[0].text).join(' ');
    const again = verses.slice(1).filter((v) => skeleton(v.text).join(' ') === k);
    if (again.length) { verses[0].refrain = true; again.forEach((v) => (v.refrain = true)); }
  }
  return verses;
}

function build(dry) {
  const files = readdirSync(POEMS).filter((f) => f.endsWith('.md'));
  const ids = new Set(files.map((f) => f.slice(0, -3)));
  const have = {}; const haveT = {}; // poet → openings already in the archive
  for (const f of files) {
    const s = readFileSync(`${POEMS}/${f}`, 'utf8');
    const poet = s.match(/^poet: (.*)$/m)[1];
    const lines = [...s.matchAll(/^ {2}- text: (".*")$/gm)].flatMap((m) => JSON.parse(m[1]).split('\n'));
    (have[poet] ??= []).push(fingerprint(lines)); (haveT[poet] ??= []).push(lines[0]);
  }
  const report = {};
  for (const cfg of PAGES) {
    const file = `${CACHE}/${cfg.page}.html`;
    if (!existsSync(file)) { console.log(`${cfg.page}: not fetched`); continue; }
    const html = readFileSync(file, 'utf8');
    const r = (report[cfg.page] = { poet: cfg.poet, found: 0, new: 0, matched: 0 });
    let items;
    if (cfg.whole) {
      const main = mainContent(html);
      const body = main.slice(main.indexOf('</h2>', main.indexOf('<h2')) + 5);
      items = [[null, cfg.whole, stanzas(body).filter((s) => !/^\(.*\)$/.test(s.join(' ')))]];
    } else items = sections(html);
    for (const [anchor, heading, sts, notes = [], variant = []] of items) {
      if (!sts.length) continue;
      r.found++;
      const lines = sts.flat();
      const o = fingerprint(lines);
      const best = (have[cfg.poet] ?? []).map((h, i) => [match(o, h), i]).sort((a, b) => b[0] - a[0])[0];
      if (process.env.NEAR && best && best[0] >= 0.5 && best[0] < 0.66) console.log('near', best[0].toFixed(2), '|', lines[0], '||', haveT[cfg.poet][best[1]]);
      if (best && best[0] >= 0.66) { r.matched++; if (process.env.DEBUG === cfg.poet) console.log(best[0].toFixed(2), '|', lines[0], '||', haveT[cfg.poet][best[1]]); continue; }
      (have[cfg.poet] ??= []).push(o); (haveT[cfg.poet] ??= []).push(lines[0]);
      let verses = sts.map((s) => ({ text: s.join('\n') }));
      if (cfg.form === 'dohra') verses = sts.flatMap((s) => (s.length === 4 ? [s.slice(0, 2), s.slice(2)] : [s])).map((s) => ({ text: s.join('\n') }));
      if (cfg.form === 'kafi') verses = refrains(verses);
      const title = tidyTitle(cfg.whole ?? (heading && !/^[\d۰-۹]+$/.test(heading) ? heading : lines[0]));
      let id = slug(title), n = 2;
      while (ids.has(id)) id = `${slug(title)}-${n++}`;
      ids.add(id);
      const fm = ['---', `poet: ${cfg.poet}`, `form: ${cfg.form}`, `title: ${q(title)}`, 'verses:'];
      for (const v of verses) { fm.push(`  - text: ${q(v.text)}`); if (v.refrain) fm.push('    refrain: true'); }
      fm.push('source:', `  book: ${q(cfg.plainBook ? cfg.book : `${cfg.book} (punjabi-kavita.com, Shahmukhi)`)}`, ...(cfg.year ? [`  year: ${cfg.year}`] : []), `  url: ${q(`${BASE}${cfg.page}.php${anchor ? '#' + anchor : ''}`)}`);
      fm.push(`verification_note: ${q(cfg.note ?? PK_NOTE)}`, '---', '');
      if (variant.length) fm.push('Another reading of this poem given by punjabi-kavita.com:', '', ...variant.map((l) => `> ${l}  `), '');
      if (notes.length) fm.push("Editor's note on punjabi-kavita.com (in Punjabi):", '', ...notes.map((n) => `> ${n}`), '');
      if (!dry) writeFileSync(`${POEMS}/${id}.md`, fm.join('\n'));
      r.new++;
    }
  }
  console.table(report);
  const total = Object.values(report).reduce((a, r) => a + r.new, 0);
  console.log(`${total} new poems${dry ? ' (dry run, nothing written)' : ''}`);
}

const [cmd, flag] = process.argv.slice(2);
if (cmd === 'fetch') await fetchAll();
else if (cmd === 'build') build(flag === '--dry');
else console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0]);
