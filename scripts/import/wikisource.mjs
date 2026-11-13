#!/usr/bin/env node
/**
 * Import public-domain Punjabi (Shahmukhi) poetry from Wikisource (wikisource.org, Category:پنجابی).
 *
 *   node scripts/import/wikisource.mjs fetch          download every page's wikitext to .cache/wikisource.json
 *   node scripts/import/wikisource.mjs build [--dry]  write new poems to src/content/poems, print a report
 *
 * Texts are copied verbatim from <poem> blocks: only wiki markup is removed. Stanzas are split on blank
 * lines; numbered collections (dohras, deodhs) become one poem per number; a kafi's opening line(s) that
 * come back as a stanza are marked as the refrain. Pages already in the archive (same source URL or the
 * same first line) are skipped, so the script is safe to re-run.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url).pathname;
const CACHE = `${ROOT}.cache/wikisource.json`;
const POEMS = `${ROOT}src/content/poems`;
const API = 'https://wikisource.org/w/api.php';
const UA = { 'User-Agent': 'punjabi-net-archive/0.1 (non-commercial literary archive; import script)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Wikisource author name → archive poet id, default form, and per-title form rules. */
const POETS = {
  'وارث شاہ': { id: 'waris-shah', form: 'qissa' },
  'فرید الدین مسعود': { id: 'baba-farid', form: 'shalok' },
  'میاں محمد بخش': { id: 'mian-muhammad-bakhsh', form: 'qissa' },
  'سلطان باہو': { id: 'sultan-bahu', form: 'bait' },
  'بلھے شاہ': { id: 'bulleh-shah', form: 'kafi' },
  'شاہ حسین': { id: 'shah-hussain', form: 'kafi' },
  'سید ہاشم شاہ': { id: 'hashim-shah', form: 'dohra' },
};
const FORM_BY_TITLE = [
  [/سیہرفی|سی ?حرفی/, 'siharfi'],
  [/بارانماہ|باراں ?ماہ|بارہ ?ماہ/, 'baran-maah'],
  [/دوہڑے|دوہرے/, 'dohra'],
  [/قصہ|سسی پنوں|سوہنی|شیریں|ہیر رانجھا/, 'qissa'],
  [/گنڈھاں|اٹھوارا|ڈیوڈھاں|مناجات/, 'nazm'],
];
/** Long works whose subpages or index give an order; their parts get an English section label. */
const WORKS = {
  'ہیر وارث شاہ': 'Heer',
  'قصہ سیف الملوک': 'Saif ul Malook',
};

async function api(params) {
  const u = new URL(API);
  for (const [k, v] of Object.entries({ format: 'json', formatversion: '2', ...params })) u.searchParams.set(k, v);
  for (let t = 0; ; t++) {
    const s = await (await fetch(u, { headers: UA })).text();
    try { return JSON.parse(s); } catch { if (t > 5) throw new Error(s.slice(0, 200)); await sleep(30000 * (t + 1)); }
  }
}

async function fetchAll() {
  const titles = [];
  let cont = {};
  do {
    const j = await api({ action: 'query', list: 'categorymembers', cmtitle: 'Category:پنجابی', cmlimit: '500', cmnamespace: '0', ...cont });
    titles.push(...j.query.categorymembers.map((m) => m.title));
    cont = j.continue ?? null;
    await sleep(3000);
  } while (cont);
  const pages = {};
  for (let i = 0; i < titles.length; i += 50) {
    const j = await api({ action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', titles: titles.slice(i, i + 50).join('|') });
    for (const p of j.query.pages) pages[p.title] = p.revisions?.[0]?.slots?.main?.content ?? null;
    process.stderr.write(`\r${Math.min(i + 50, titles.length)}/${titles.length}`);
    await sleep(3000);
  }
  mkdirSync(`${ROOT}.cache`, { recursive: true });
  writeFileSync(CACHE, JSON.stringify(pages));
  console.log(`\n${titles.length} pages cached in .cache/wikisource.json`);
}

/* ---------- parsing ---------- */

const HARAKAT = /[ً-ٰٟۖ-ۭ]/g;
const key = (s) => s.replace(HARAKAT, '').replace(/[\s.,;:!?،؛؟۔"'()\-–—]+/g, '');
/** Identity of a poem for de-duplication: its first stanza (up to four lines). */
const opening = (text) => key(text.split('\n').slice(0, 4).join(' '));

function clean(line) {
  return line
    .replace(/<ref[\s\S]*?<\/ref>|<ref[^>]*\/>/g, '')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    // Gurmukhi vowel carriers left as Latin letters by an earlier conversion (ੳ → "a", ੲ → "e"), only inside Shahmukhi words.
    .replace(/(?<![\p{L}])a(?=[ء-ۿ])/gu, 'اُ').replace(/(?<=[ء-ۿ])a|a(?=[ء-ۿ])/g, 'ؤ').replace(/(?<=[ء-ۿ])e|e(?=[ء-ۿ])/g, 'ئ');
}

/** Body text of a page: its <poem> blocks, as stanzas (arrays of lines). */
function stanzas(wikitext) {
  const blocks = [...wikitext.matchAll(/<poem[^>]*>([\s\S]*?)<\/poem>/g)].map((m) => m[1]);
  const out = [];
  for (const b of blocks)
    for (const chunk of b.split(/\n\s*\n/)) {
      let lines = [];
      for (const l of chunk.split('\n').map(clean)) {
        if (!l || /^[.۔\s-]+$/.test(l)) continue;
        // A bare number or siharfi heading glued to a stanza labels what follows: give it its own stanza.
        if (BARE.test(l) || SIHARFI_HEAD.test(l)) { if (lines.length) out.push(lines); out.push([l]); lines = []; }
        else lines.push(l);
      }
      if (lines.length) out.push(lines);
    }
  return out;
}

const BARE = /^[\d۰-۹]+\s*\.?$/;
const NUM = /^[\d۰-۹]+\s*[.\-]?\s*(.*)$/;
const isNum = (s) => s.length === 1 && NUM.test(s[0]);
const SIHARFI_HEAD = /سیہرفی\s*$/;
/**
 * Split a page into poems.
 *  qissa:   one poem; number labels and numbered section headings are dropped.
 *  siharfi: one poem per "پہلی سیہرفی / دوجی سیہرفی …" heading; letter-stanza numbers dropped.
 *  others:  "1. title / stanza / 2. title / stanza" collections become one poem per number.
 */
function pieces(sts, form) {
  if (form === 'qissa') {
    // "20. داستان … (Punjabi gloss)" stanzas are chapter rubrics, not verse: keep them as notes.
    const rubric = (s) => /^[\d۰-۹]+\s*\.\s*\S/.test(s[0]);
    const rubrics = sts.filter(rubric).map((s) => s.join(' ').replace(/^[\d۰-۹]+\s*\.\s*/, ''));
    return [{ heading: null, rubrics, sts: sts.filter((s) => !isNum(s) && !rubric(s)) }];
  }
  if (form === 'siharfi') {
    const out = [{ heading: null, sts: [] }];
    for (const s of sts) {
      if (s.length === 1 && SIHARFI_HEAD.test(s[0])) out.push({ heading: null, sts: [] });
      else if (!isNum(s)) out.at(-1).sts.push(s);
    }
    return out.filter((p) => p.sts.length);
  }
  if (sts.filter(isNum).length < 2) return [{ heading: null, sts }];
  const out = [];
  for (const s of sts) {
    if (isNum(s)) out.push({ heading: s[0].match(NUM)[1] || null, sts: [] });
    else if (out.length) out.at(-1).sts.push(s);
    // stanzas before the first number (a page heading) are dropped
  }
  return out.filter((p) => p.sts.length);
}

/** Lines that are editorial labels rather than verse: "(...)" glosses and "۔۔۔ title ۔۔۔" banners. */
const LABEL = /^\(.*\)$|^۔{2,}.*۔{2,}$/;

/** "پاٹھ بھید" (variant reading) labels the next stanza as another reading of the one before it. */
const VARIANT = /^\(?پاٹھ بھید\)?$/;
function variants(sts) {
  const keep = [], notes = [];
  for (let i = 0; i < sts.length; i++) {
    if (sts[i].length === 1 && VARIANT.test(sts[i][0])) {
      if (sts[i + 1]) notes.push({ of: keep.at(-1)?.join(' / ') ?? '', text: sts[i + 1].join(' / ') });
      i++;
    } else keep.push(sts[i]);
  }
  return { keep, notes };
}

function toVerses(sts, form) {
  // A dohra is two couplets; store each couplet as its own verse, as the rest of the archive does.
  if (form === 'dohra') sts = sts.flatMap((s) => (s.length > 2 && s.length % 2 === 0 ? s.flatMap((_, i) => (i % 2 ? [] : [s.slice(i, i + 2)])) : [s]));
  const verses = sts
    .map((s) => s.filter((l) => !LABEL.test(l)))
    .filter((s) => s.length)
    .map((s) => ({ text: s.join('\n') }));
  // Refrain: the opening stanza (1–2 lines) repeated later as its own stanza.
  if (verses.length > 2 && verses[0].text.split('\n').length <= 2) {
    const k = key(verses[0].text);
    const again = verses.slice(1).filter((v) => key(v.text) === k);
    if (again.length) { verses[0].refrain = true; again.forEach((v) => (v.refrain = true)); }
  }
  return verses;
}

/* ---------- slugs ---------- */

const LATIN = {
  'ا': 'a', 'آ': 'a', 'أ': 'a', 'ب': 'b', 'پ': 'p', 'ت': 't', 'ٹ': 't', 'ث': 's', 'ج': 'j', 'چ': 'ch', 'ح': 'h', 'خ': 'kh',
  'د': 'd', 'ڈ': 'd', 'ذ': 'z', 'ر': 'r', 'ڑ': 'r', 'ز': 'z', 'ژ': 'zh', 'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'z', 'ط': 't',
  'ظ': 'z', 'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ک': 'k', 'ك': 'k', 'گ': 'g', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ں': 'n',
  'و': 'o', 'ؤ': 'o', 'ہ': 'h', 'ھ': 'h', 'ۃ': 'h', 'ء': '', 'ی': 'i', 'ي': 'i', 'ئ': 'i', 'ے': 'e', 'ۓ': 'e', 'ݨ': 'n',
};
function slug(title) {
  const s = [...title.replace(HARAKAT, '')].map((c) => LATIN[c] ?? (/\s/.test(c) ? '-' : '')).join('');
  return s.replace(/-+/g, '-').replace(/^-|-$/g, '').split('-').slice(0, 8).join('-') || 'poem';
}

/* ---------- build ---------- */

const q = (s) => JSON.stringify(s);
function frontmatter(p) {
  const lines = ['---', `poet: ${p.poet}`, `form: ${p.form}`, `title: ${q(p.title)}`];
  if (p.title_en) lines.push(`title_en: ${q(p.title_en)}`);
  lines.push('verses:');
  for (const v of p.verses) { lines.push(`  - text: ${q(v.text)}`); if (v.refrain) lines.push('    refrain: true'); }
  lines.push('source:', `  book: ${q(p.book)}`, `  url: ${q(p.url)}`);
  lines.push(`verification_note: ${q(p.note)}`, '---', '');
  if (p.variants?.length) lines.push('Variant readings given in the source:', '', ...p.variants.flatMap((v) => [`- of «${v.of}»:`, `  «${v.text}»`]), '');
  if (p.rubrics?.length) lines.push('Chapter headings in the source (Persian, with a Punjabi gloss in brackets):', '', ...p.rubrics.map((r) => `- ${r}`), '');
  return lines.join('\n');
}

function build(dry) {
  const pages = JSON.parse(readFileSync(CACHE, 'utf8'));
  const existing = readdirSync(POEMS).filter((f) => f.endsWith('.md')).map((f) => readFileSync(`${POEMS}/${f}`, 'utf8'));
  const haveUrl = new Set(existing.map((s) => s.match(/^ {2}url: "(.*)"$/m)?.[1]).filter(Boolean).map((u) => decodeURIComponent(u)));
  const haveFirst = new Set(existing.map((s) => s.match(/^ {2}- text: (".*")$/m)).filter(Boolean).map((m) => opening(JSON.parse(m[1]))));
  const ids = new Set(readdirSync(POEMS).map((f) => f.replace(/\.md$/, '')));

  // Order of parts for long works: index page links, or numbered subpages.
  const order = {};
  for (const [index, label] of Object.entries(WORKS)) {
    const links = [...(pages[index] ?? '').matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1].trim());
    links.forEach((t, i) => (order[t] = { label, n: i + 1 }));
    for (const t of Object.keys(pages)) if (t.startsWith(index + '/')) order[t] = { label, n: Number(t.split('/')[1]) };
  }

  const report = {};
  const written = [];
  for (const [title, text] of Object.entries(pages)) {
    if (!text) continue;
    const author = text.match(/\|\s*author\s*=\s*([^\n|]*)/)?.[1]?.trim();
    const poet = POETS[author];
    if (!poet) continue;
    const r = (report[poet.id] ??= { pages: 0, poems: 0, skipped: 0, empty: 0 });
    r.pages++;
    const sts = stanzas(text);
    if (!sts.length) { r.empty++; continue; }
    const form = FORM_BY_TITLE.find(([re]) => re.test(title))?.[1] ?? poet.form;
    const url = `https://wikisource.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
    const parts = pieces(sts, form);
    for (const part of parts) {
      const { keep, notes: variantNotes } = variants(part.sts);
      const verses = toVerses(keep, form);
      if (!verses.length) continue;
      // Title: the first line of verse, skipping siharfi letter labels such as "علف-".
      const first = verses.flatMap((v) => v.text.split('\n')).find((l) => !/^\S{1,6}\s*-$/.test(l)) ?? verses[0].text.split('\n')[0];
      if ((parts.length === 1 && haveUrl.has(decodeURIComponent(url))) || haveFirst.has(opening(verses[0].text))) { r.skipped++; if (process.env.DEBUG) console.log("skip", poet.id, title, "|", first); continue; }
      if (process.env.DEBUG) (r.src ??= {})[title] = (r.src[title] ?? 0) + 1;
      haveFirst.add(opening(verses[0].text));
      const t = (parts.length > 1 ? (part.heading || first) : title.includes('/') ? first : title).replace(/[\s،,۔.!؟?؛;:]+$/, '')
        // Wikisource tells same-named pages apart with (I), (II): keep the distinction in Punjabi numerals.
        .replace(/\((I{1,3})\)$/, (_, r) => `(${'۱۲۳'[r.length - 1]})`);
      const o = order[title];
      const p = {
        poet: poet.id, form, title: t,
        title_en: o ? `${o.label}, section ${o.n}` : undefined,
        verses,
        rubrics: part.rubrics,
        variants: variantNotes,
        book: `Wikisource (Punjabi), public-domain transcription: ${title}`,
        url,
        note: 'Transcribed from Wikisource, where the text is marked public domain (PD-old). Not yet checked against a printed edition.',
      };
      let id = slug(t), n = 2;
      while (ids.has(id)) id = `${slug(t)}-${n++}`;
      ids.add(id);
      if (!dry) writeFileSync(`${POEMS}/${id}.md`, frontmatter(p));
      written.push(id);
      r.poems++;
    }
  }
  console.table(report);
  console.log(`${written.length} new poems${dry ? ' (dry run, nothing written)' : ''}`);
}

const [cmd, flag] = process.argv.slice(2);
if (cmd === 'fetch') await fetchAll();
else if (cmd === 'build') build(flag === '--dry');
else console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0]);
