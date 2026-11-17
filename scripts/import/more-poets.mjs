#!/usr/bin/env node
/**
 * Add public-domain Punjabi poets beyond the original eight, with every Shahmukhi text Wikisource
 * (Category:پنجابی) and punjabi-kavita.com's *Shahmukhi.php pages give for them.
 *
 *   node scripts/import/wikisource.mjs fetch             (once) Wikisource wikitext → .cache/wikisource.json
 *   node scripts/import/more-poets-fetch.mjs <Page …>     punjabi-kavita pages → .cache/more-poets/pk/
 *   node scripts/import/more-poets.mjs build [--dry]      write poems and works, print a report
 *   node scripts/import/more-poets.mjs pk <Page>          inspect a cached punjabi-kavita page
 *   node scripts/import/more-poets-check.mjs              validate what was written (schema rules, ids, work numbering)
 *
 * Poet files (src/content/poets) are written by hand from cited sources; the punjabi-kavita pages read
 * are listed in more-poets-pk.mjs.
 *
 * Only these poets' files are written. Every file written is listed in .cache/more-poets/written.json;
 * a re-run first removes the files it wrote last time, so it never touches other poems.
 *
 * Text is copied verbatim: only wiki/HTML markup is removed, plus lines that are wholly an editor's
 * bracketed gloss "(...)" (as wikisource.mjs does). Stanza numbers inside lines ("۔1۔") are kept.
 * Pages are split as their sources number or head them (see PAGES); punjabi-kavita pages fill in poems
 * Wikisource lacks, matched by opening lines as in punjabi-kavita.mjs.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync, mkdirSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url).pathname;
const WS = JSON.parse(readFileSync(`${ROOT}.cache/wikisource.json`, 'utf8'));
const PK = `${ROOT}.cache/more-poets/pk`;
const POEMS = `${ROOT}src/content/poems`;
const WORKS = `${ROOT}src/content/works`;
const MANIFEST = `${ROOT}.cache/more-poets/written.json`;
const PKBASE = 'https://www.punjabi-kavita.com/';

const WS_NOTE = 'Transcribed from Wikisource, where the text is marked public domain (PD-old). Not yet checked against a printed edition.';
const wsNote = (tpl) => (tpl && tpl !== 'PD-old' ? WS_NOTE.replace('(PD-old)', `(${tpl})`) : WS_NOTE);
const PK_NOTE = 'Shahmukhi text from punjabi-kavita.com, a transliteration of its Gurmukhi text. Not yet checked against a printed edition.';

/* ---------- poets ---------- */

/** Wikisource author → poet id and default form. */
const WS_POETS = {
  'سچل سرمست': { id: 'sachal-sarmast', form: 'kafi' },
  'خواجہ غلام فرید': { id: 'khwaja-ghulam-farid', form: 'kafi' },
  'علی حیدر ملتانی': { id: 'ali-haider-multani', form: 'kafi' },
  'شاہ شرف': { id: 'shah-sharaf', form: 'kafi' },
  'قادریار': { id: 'qadir-yar', form: 'qissa' },
  'دمودر': { id: 'damodar', form: 'qissa' },
  'پیلو': { id: 'peelu', form: 'qissa' },
  'حافظ برخوردار': { id: 'hafiz-barkhurdar', form: 'qissa' },
  'فضل شاہ': { id: 'fazal-shah', form: 'qissa' },
  'غلام رسول عالمپوری': { id: 'ghulam-rasool-alampuri', form: 'qissa' },
  'مولوی غلام رسول قلعہ میہاں سنگھ': { id: 'ghulam-rasool-qila-mihan-singh', form: 'nazm' },
  'شاہ محمد': { id: 'shah-muhammad', form: 'jangnama' },
  'خواجہ فرد فقیر': { id: 'fard-faqir', form: 'nazm' },
  'میاں ہدایت اللہ': { id: 'mian-hidayatullah', form: 'baran-maah' },
  'میراں شاہ جالندھری': { id: 'miran-shah-jalandhari', form: 'kafi' },
  'پير مہر علی شاہ': { id: 'pir-mehr-ali-shah', form: 'nazm' },
  'لالا کرپا ساگر': { id: 'lala-kirpa-sagar', form: 'nazm' },
  'سائیں مولٰی شاہ': { id: 'sain-maula-shah', form: 'kafi' },
  'شاہ مراد خانپوری': { id: 'shah-murad', form: 'kafi' },
  'محمد بوٹا گجراتی': { id: 'muhammad-boota-gujrati', form: 'siharfi' },
  'پنڈت مان سنگھ کالیداس': { id: 'kalidas-gujranwalia', form: 'nazm' },
  'سائیں لبھو شاہ': { id: 'sain-labhu-shah', form: 'dohra' },
  'بابا وجید': { id: 'baba-wajid', form: 'shalok' },
  'خوش طبع': { id: 'khush-taba', form: 'siharfi' },
  'سنت ولی رام': { id: 'sant-wali-ram', form: 'kafi' },
  'میاں کریم بخش': { id: 'karim-bakhsh', form: 'qissa' },
  'عاقل محمد جوگی': { id: 'aqil-muhammad-jogi', form: 'kafi' },
  'بابو فیروز دین شرف': { id: 'firoz-din-sharaf', form: 'nazm' },
};

/**
 * Per-page rules. mode:
 *   whole     one poem (default)
 *   numbered  one poem per stanza that opens with a bare number; one-line stanzas are headings (→ chapter)
 *   titled    one poem per "N. title" line; with `sub`, one-line stanzas inside start new poems too
 *   headed    one poem per one-line heading stanza
 *   tailnum   one poem per run of lines ending in a "۔N۔" verse number
 *   subpages  one poem per subpage listed on the index page
 * work: the poems form a work (works/<id>.md), numbered in source order.
 */
const PAGES = {
  'قصہ پورن بھگت': { mode: 'numbered', work: { id: 'puran-bhagat-qadir-yar', title: 'قصہ پورن بھگت', title_en: 'Qissa Puran Bhagat', kind: 'qissa', form: 'qissa' } },
  'ہیر دمودر': { mode: 'numbered', work: { id: 'heer-damodar', title: 'ہیر دمودر', title_en: 'Heer', kind: 'qissa', form: 'qissa' } },
  'مرزا صاحباں (پیلو)': { work: { id: 'mirza-sahiban-peelu', title: 'مرزا صاحباں', title_en: 'Mirza Sahiban', kind: 'qissa', form: 'qissa' }, mode: 'whole' },
  'مرزا صاحباں (حافظ برخوردار)': { mode: 'headed', work: { id: 'mirza-sahiban-hafiz-barkhurdar', title: 'مرزا صاحباں', title_en: 'Mirza Sahiban', kind: 'qissa', form: 'qissa' } },
  'سوہنی مہینوال فضل شاہ': { mode: 'titled', work: { id: 'sohni-mahiwal-fazal-shah', title: 'سوہنی مہینوال', title_en: 'Sohni Mahiwal', kind: 'qissa', form: 'qissa' } },
  'احسن ال کسسن (قصہ یوسف زلیخا)': { mode: 'titled', sub: true, work: { id: 'yusuf-zulaikha-alampuri', title: 'احسن القصص (قصہ یوسف زلیخا)', title_en: 'Ahsan-ul-Qasas (Yusuf Zulaikha)', kind: 'qissa', form: 'qissa' } },
  'سیہرفی سسی پنو': { form: 'siharfi' },
  'باراں ماہاں مالی تے بلبل غلام رسول عالمپوری': { form: 'baran-maah' },
  'چٹھی سید روشن علی دے نام': { form: 'nazm' },
  'سسی وا پنوں': { form: 'qissa' },
  'سیہرفی مولوی غلام رسول قلعہ میہاں سنگھ': { form: 'siharfi' },
  'باراں ماہاں مالی تے بلبل مولوی غلام رسول قلعہ میہاں سنگھ': { form: 'baran-maah' },
  'کجھ ہور رچنا مولوی غلام رسول قلعہ میہاں سنگھ': { form: 'nazm' },
  'جنگ نامہ': { mode: 'numbered', work: { id: 'jangnama-shah-muhammad', title: 'جنگ نامہ', title_en: 'Jangnama', kind: 'book', form: 'jangnama', year: 1846 } },
  'دیوان علی حیدر ملتانی': { mode: 'titled', work: { id: 'diwan-ali-haider', title: 'دیوان علی حیدر ملتانی', title_en: 'Diwan', kind: 'collection', form: 'kafi' } },
  'سیہرفیاں علی حیدر ملتانی': { mode: 'titled', form: 'siharfi', work: { id: 'siharfian-ali-haider', title: 'سیہرفیاں علی حیدر ملتانی', title_en: 'Siharfian', kind: 'collection', form: 'siharfi' } },
  'فٹکل کلام علی حیدر ملتانی': { mode: 'titled', form: 'nazm' },
  'قصہ ہیر و رانجھا': { mode: 'tailnum', work: { id: 'heer-ranjha-ali-haider', title: 'قصہ ہیر و رانجھا', title_en: 'Qissa Heer o Ranjha (unfinished)', kind: 'qissa', form: 'qissa' } },
  'باراں ماہا': { mode: 'subpages', form: 'baran-maah', work: { id: 'baran-maha-fard-faqir', title: 'باراں ماہا', title_en: 'Baran Maha', kind: 'book', form: 'baran-maah' } },
  'سِی حرفی': { form: 'siharfi' },
  'کسب نامہ بفندگاں': { form: 'nazm' },
  'عشق رسول': { form: 'nazm' },
  'کافیاں میراں شاہ': { mode: 'titled' },
  'سیہرفی میراں شاہ': { form: 'siharfi' },
  'باراں ماہاں میراں شاہ': { form: 'baran-maah' },
  'بشن پدا میراں شاہ': { form: 'nazm' },
  'دوہڑا میراں شاہ': { form: 'dohra' },
  'ہفت روز میراں شاہ': { form: 'nazm' },
  'کافیاں سائیں مولٰی شاہ': { mode: 'titled' },
  'بارانماہ سائیں مولٰی شاہ': { form: 'baran-maah' },
  'کافیاں سید شاہ مراد': { mode: 'titled' },
  'باراماہ سید شاہ مراد': { form: 'baran-maah' },
  'بارانماہ-شیریں محمد بوٹا گجراتی': { form: 'baran-maah' },
  'سی ہرفی (محمد بوٹا گجراتی)': { form: 'siharfi' },
  'دوہڑے سائیں لبھو شاہ': { mode: 'numbered', form: 'dohra', work: { id: 'dohre-sain-labhu-shah', title: 'دوہڑے سائیں لبھو شاہ', title_en: 'Dohre', kind: 'collection', form: 'dohra' } },
  'کافی سائیں لبھو شاہ': { form: 'kafi' },
  'سلوک بابا وجید': { mode: 'numbered', work: { id: 'salok-baba-wajid', title: 'سلوک بابا وجید', title_en: 'Saloks', kind: 'collection', form: 'shalok' } },
  'کافیاں سنت ولی رام': { mode: 'titled' },
  'ڈھول سمّی': { mode: 'headed', headings: ['رانی سمی دی کڑمائی ہونی بادشاہ ڈھول نال', 'بادشاہ ڈھول دا رانی سمی نوں ملن دمشق جانا', 'ڈھول بادشاہ کا جواب، طوطے کا اپنے ملک روانہ ہونا', 'شہزادہ ڈھول دا اپنے ملک نوں سنبھالنا'], work: { id: 'dhol-sammi-karim-bakhsh', title: 'ڈھول سمّی', title_en: 'Dhol Sammi', kind: 'qissa', form: 'qissa' } },
  'دوہڑے خواجہ غلام فرید': { mode: 'numbered', form: 'dohra', work: { id: 'dohre-khwaja-ghulam-farid', title: 'دوہڑے خواجہ غلام فرید', title_en: 'Dohre', kind: 'collection', form: 'dohra' } },
  'وار چاند بیبی': { mode: 'numbered', form: 'var', work: { id: 'var-chand-bibi', title: 'وار چاند بیبی', title_en: 'Var Chand Bibi', kind: 'book', form: 'var' } },
  'باراں ماہ': { form: 'baran-maah' },
  'بھورا کلی لے جا شام سنیہڑا': { form: 'nazm' },
  'چرکھا نامہ': { form: 'nazm' },
};
const FORM_BY_TITLE = [
  [/سیہرفی|سی ?حرفی|سی ہرفی/, 'siharfi'],
  [/بارانماہ|باراں ?ماہ|بارہ ?ماہ|بارہ مانہہ|باراماہ/, 'baran-maah'],
  [/دوہڑے|دوہرے/, 'dohra'],
];

/* ---------- parsing (clean() and slug() as in wikisource.mjs) ---------- */

const HARAKAT = /[ً-ٰٟۖ-ۭ]/g;
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
    .replace(/(?<![\p{L}])a(?=[ء-ۿ])/gu, 'اُ').replace(/(?<=[ء-ۿ])a|a(?=[ء-ۿ])/g, 'ؤ').replace(/(?<=[ء-ۿ])e|e(?=[ء-ۿ])/g, 'ئ');
}
/** Lines that are editorial labels rather than verse: "(...)" glosses and "۔۔۔ title ۔۔۔" banners, dotted rules. */
const LABEL = /^\(.*\)$|^۔{2,}.*۔{2,}$|^[.۔…\s-]+$/;
const BARE = /^[\d۰-۹]+\s*\.?$/;
const NUMTITLE = /^[\d۰-۹]+\s*\.\s*(\S.*)$/;
const TAILNUM = /۔\s*[\d۰-۹]+\s*۔\s*$/;

/** Stanzas (arrays of lines) of a page's <poem> blocks. */
function stanzas(wikitext) {
  const blocks = [...wikitext.matchAll(/<poem[^>]*>([\s\S]*?)<\/poem>/g)].map((m) => m[1]);
  const out = [];
  for (const b of blocks)
    for (const chunk of b.split(/\n\s*\n/)) {
      const lines = chunk.split('\n').map(clean).filter((l) => l);
      if (lines.length) out.push(lines);
    }
  return out;
}
const verseLines = (s) => s.filter((l) => !LABEL.test(l));
/** A heading stanza: one line of text (plus, optionally, its bracketed gloss), not numbered. */
const isHeading = (s) => verseLines(s).length === 1 && s.length <= 2 && !BARE.test(s[0]) && !TAILNUM.test(s[0]) && verseLines(s)[0].split(/\s+/).length <= 12;
const tidy = (t) => t.replace(/^\((.*)\)$/, '$1').replace(/[\s،,۔.!؟?؛;:'"-]+$/, '').replace(/^['"]+/, '').trim();

/** Split a page's stanzas into pieces: { title?, chapter?, sts }. */
function split(sts, cfg) {
  const mode = cfg.mode ?? 'whole';
  const out = [];
  if (mode === 'whole') return [{ sts: sts.filter((s) => !BARE.test(s[0]) || s.length > 1).map((s) => (BARE.test(s[0]) ? s.slice(1) : s)) }];
  if (mode === 'numbered') {
    let chapter;
    for (const s of sts) {
      if (BARE.test(s[0])) { out.push({ chapter, sts: s.length > 1 ? [s.slice(1)] : [] }); continue; }
      if (isHeading(s)) { chapter = tidy(verseLines(s)[0]); continue; }
      // A bracketed part label on its own, "(بھاگ-1)", names the chapter.
      if (s.length === 1 && /^\(.*\)$/.test(s[0])) { chapter = s[0].slice(1, -1).trim(); continue; }
      if (out.length) out.at(-1).sts.push(s);
      else out.push({ chapter, sts: [s] });
    }
    return out;
  }
  if (mode === 'titled') {
    let chapter;
    for (const s of sts) {
      const m = s[0].match(NUMTITLE);
      if (m) {
        if (cfg.sub) chapter = tidy(m[1]);
        out.push({ title: tidy(m[1]), chapter, sts: s.length > 1 ? [s.slice(1)] : [] });
        continue;
      }
      if (cfg.sub && isHeading(s)) { out.push({ title: tidy(verseLines(s)[0]), chapter, sts: [] }); continue; }
      if (out.length) out.at(-1).sts.push(s);
    }
    return out;
  }
  if (mode === 'headed') {
    // `headings`: the page's headings, listed, where lone verse lines would look like headings too.
    const heading = cfg.headings ? (s) => verseLines(s).length === 1 && cfg.headings.includes(verseLines(s)[0]) : isHeading;
    for (const s of sts) {
      if (heading(s)) { out.push({ title: tidy(verseLines(s)[0]), sts: [] }); continue; }
      if (out.length) out.at(-1).sts.push(s);
      else out.push({ sts: [s] });
    }
    return out;
  }
  if (mode === 'tailnum') {
    let chapter, cur = null;
    for (const s of sts) {
      if (isHeading(s)) { const h = tidy(verseLines(s)[0]); if (h.split(/\s+/).length > 1 || !cur) chapter = h; continue; }
      if (!cur) out.push((cur = { chapter, sts: [] }));
      cur.sts.push(s);
      if (TAILNUM.test(s.at(-1))) cur = null;
    }
    return out;
  }
  throw new Error(`unknown mode ${mode}`);
}

/**
 * Editorial matter inside the text, as the sources print it in brackets:
 *  - "(word=meaning, …)" glossaries, which may run over several lines: dropped (as punjabi-kavita.mjs drops div#meaning);
 *  - "(پاٹھ بھید=…)" or "(اس بند وچ ایہہ تکاں وی ملدیاں ہن: …)": other readings, kept as notes;
 *  - a stanza wholly in brackets over several lines (an editor's introduction or a stanza found only in some copies): kept as a note;
 *  - a "(پاٹھ بھید)" line: the next stanza is another reading of the one before, kept as a note.
 */
const VARIANT_NOTE = /پاٹھ ?بھید|ملدیاں ہن|ملدی ہے|نسخیاں/;
function editorial(sts) {
  const keep = [], notes = [];
  for (let i = 0; i < sts.length; i++) {
    let t = sts[i].join('\n');
    if (/^\(?پاٹھ بھید\)?$/.test(t.trim())) { if (sts[i + 1]) notes.push(`Another reading: ${sts[i + 1].join(' / ')}`); i++; continue; }
    t = t.replace(/\((?:[^()]|\([^()]*\))*?=(?:[^()]|\([^()]*\))*?\)/g, (m) => {
      if (VARIANT_NOTE.test(m)) notes.push(m.slice(1, -1).replace(/\n/g, ' / '));
      return '';
    });
    const lines = t.split('\n').map((l) => l.trim()).filter((l) => /[ء-ۿ]/.test(l));
    if (!lines.length) continue;
    const whole = lines.join('\n');
    if (lines.length > 1 && /^\([^()]*(?:\([^()]*\)[^()]*)*\)$/.test(whole)) { notes.push(whole.slice(1, -1).replace(/\n/g, ' / ')); continue; }
    keep.push(lines);
  }
  return { sts: keep, notes };
}

function toVerses(sts, form) {
  sts = sts.map(verseLines).filter((s) => s.length);
  if (form === 'dohra') sts = sts.flatMap((s) => (s.length > 2 && s.length % 2 === 0 ? s.flatMap((_, i) => (i % 2 ? [] : [s.slice(i, i + 2)])) : [s]));
  const verses = sts.map((s) => ({ text: s.join('\n') }));
  if (form === 'kafi' && verses.length > 2 && verses[0].text.split('\n').length <= 2) {
    const k = key(verses[0].text);
    const again = verses.slice(1).filter((v) => key(v.text) === k);
    if (again.length) { verses[0].refrain = true; again.forEach((v) => (v.refrain = true)); }
  }
  return verses;
}
const key = (s) => s.replace(HARAKAT, '').replace(/[\s.,;:!?،؛؟۔"'()\-–—\d۰-۹]+/g, '');

const LATIN = {
  'ا': 'a', 'آ': 'a', 'أ': 'a', 'ب': 'b', 'پ': 'p', 'ت': 't', 'ٹ': 't', 'ث': 's', 'ج': 'j', 'چ': 'ch', 'ح': 'h', 'خ': 'kh',
  'د': 'd', 'ڈ': 'd', 'ذ': 'z', 'ر': 'r', 'ڑ': 'r', 'ز': 'z', 'ژ': 'zh', 'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'z', 'ط': 't',
  'ظ': 'z', 'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ک': 'k', 'ك': 'k', 'گ': 'g', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ں': 'n',
  'و': 'o', 'ؤ': 'o', 'ہ': 'h', 'ھ': 'h', 'ۃ': 'h', 'ء': '', 'ی': 'i', 'ي': 'i', 'ئ': 'i', 'ے': 'e', 'ۓ': 'e', 'ݨ': 'n',
};
const slug = (t) => [...t.replace(HARAKAT, '')].map((c) => LATIN[c] ?? (/\s/.test(c) ? '-' : '')).join('')
  .replace(/-+/g, '-').replace(/^-|-$/g, '').split('-').slice(0, 8).join('-') || 'poem';

/* ---------- punjabi-kavita (parsing as in punjabi-kavita.mjs) ---------- */

const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const htext = (html) => decode(html.replace(/\s*\n\s*/g, ' ').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, '')).replace(/[ \t]+/g, ' ');
const carriers = (l) => l.replace(/(^|[\s'"(-])a/g, '$1اُ').replace(/a/g, 'ؤ').replace(/e/g, 'ئ');
// Also the Guru Granth Sahib page reference "(84)" that ends a hymn's last line.
const stripGgs = (l) => l.replace(/(۔۔)(?:[\d۰-۹]+۔۔)+/g, '$1').replace(/۔۔رہاؤ۔۔/g, '۔۔ رہاؤ ۔۔').replace(/\s*\([\d۰-۹]+\)(۔۔)?\s*$/, '');
function pkStanzas(body) {
  return htext(body.replace(/<(style|script)\b[\s\S]*?<\/\1>/gi, '').replace(/<div id="meaning">[\s\S]*?<\/div>/g, ''))
    .split(/\n\s*\n/)
    .map((c) => c.split('\n').map((l) => carriers(stripGgs(l.trim())))
      // Site navigation ("Previous......(1-150)") is the only Latin text inside the poem area.
      .filter((l) => /[ء-ۿ]/.test(l) && !/^[\d۰-۹\s.۔]+$/.test(l) && !/[A-Za-z]{2,}/.test(l)))
    .filter((s) => s.length);
}
const mainContent = (html) => {
  const end = [html.indexOf('</main>'), html.search(/Contact Us/i)].filter((i) => i > 0);
  return html.slice(Math.max(0, html.indexOf('<h1')), end.length ? Math.min(...end) : undefined);
};
const isNote = (st) => /^\([\s\S]*\)$/.test(st.join('\n').trim());
/** One entry per <h3> section: { anchor, heading, sts, notes }. */
function pkSections(html) {
  const parts = mainContent(html).split(/<h3[^>]*>/i).slice(1);
  return parts.map((p) => {
    const [head, ...rest] = p.split(/<\/h3>/i);
    const anchor = head.match(/name="([^"]+)"/)?.[1] ?? null;
    let heading = htext(head).trim().replace(/^[\d۰-۹]+\s*\.\s*/, '').split('\n')[0].trim();
    // "پہلا بھاگ (…) 1. title": a part label run into the first heading of the part.
    const m = heading.match(/^\D+?\s[\d۰-۹]+\s*\.\s*(\S.*)$/);
    if (m) heading = m[1];
    let sts = pkStanzas(rest.join(''));
    const v = sts.findIndex((st) => st.length === 1 && /^\(?پاٹھ بھید\)?$/.test(st[0]));
    if (v >= 0) sts = sts.slice(0, v);
    return { anchor, heading, sts };
  }).filter((s) => s.sts.length);
}

/** Spelling skeleton and fingerprints for matching (punjabi-kavita.mjs). */
const STOP = new Set(['هو', 'نی', 'وو', 'وی', 'دا', 'دی', 'نون', 'تی', 'وچ', 'نه', 'می', 'مین', 'اه', 'جی', 'کی', 'سی']);
function skeleton(s) {
  return s.replace(HARAKAT, '').replace(/[^\p{L}\s]/gu, ' ')
    .replace(/[ھہۃة]/g, 'ه').replace(/[یيےۓئ]/g, 'ی').replace(/[ؤو]/g, 'و').replace(/[آأإ]/g, 'ا')
    .replace(/[شس]/g, 'س').replace(/[صث]/g, 'س').replace(/[ذضظز]/g, 'ز').replace(/[طت]/g, 'ت').replace(/[حه]/g, 'ه')
    .replace(/[عا]/g, 'ا').replace(/[ڑر]/g, 'ر').replace(/[ںن]/g, 'ن').replace(/[قک]/g, 'ک').replace(/ء/g, '')
    .split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w));
}
function fingerprint(lines, full = false) {
  // `full`: an archive poem's words are all its lines, so a section of a long poem is found inside it.
  const ls = (full ? lines : lines.slice(0, 40)).map((l) => l.replace(/^\S{1,5}\s*-\s*/, ''));
  const words = skeleton(ls.join(' '));
  const head = words.join('').slice(0, 40);
  const grams = new Set([...head].map((c, i) => c + (head[i + 1] ?? '')).slice(0, -1));
  return { open: new Set(words.slice(0, 12)), body: new Set(words), grams };
}
const contained = (a, b) => { if (a.size < 4) return 0; let n = 0; for (const w of a) if (b.has(w)) n++; return n / a.size; };
function similar(a, b) {
  const A = new Set(a), B = new Set(b);
  if (!A.size || !B.size) return 0;
  let n = 0; for (const w of A) if (B.has(w)) n++;
  return (2 * n) / (A.size + B.size);
}
const match = (a, b) => Math.max(similar([...a.open], [...b.open]), contained(a.open, b.body), contained(b.open, a.body),
  a.grams.size >= 20 && b.grams.size >= 20 ? similar([...a.grams], [...b.grams]) : 0);

/**
 * punjabi-kavita pages. mode: sections (one poem per <h3>, default) | numbered (bare-number stanzas, no <h3>) | whole.
 * Poems already given by Wikisource (same opening) are skipped unless `all` (then the page is the only source).
 */
const PK_PAGES = (await import('./more-poets-pk.mjs')).PK_PAGES;

/* ---------- build ---------- */

const q = (s) => JSON.stringify(s);
function poemFile(p) {
  const fm = ['---', `poet: ${p.poet}`, `form: ${p.form}`, `title: ${q(p.title)}`];
  if (p.title_en) fm.push(`title_en: ${q(p.title_en)}`);
  fm.push('verses:');
  for (const v of p.verses) { fm.push(`  - text: ${q(v.text)}`); if (v.refrain) fm.push('    refrain: true'); }
  fm.push('source:', `  book: ${q(p.book)}`);
  if (p.year) fm.push(`  year: ${p.year}`);
  fm.push(`  url: ${q(p.url)}`, `verification_note: ${q(p.note)}`);
  if (p.work) {
    fm.push('work:', `  id: ${p.work.id}`, `  n: ${p.work.n}`);
    if (p.work.chapter) fm.push(`  chapter: ${q(p.work.chapter)}`);
  }
  fm.push('---', '');
  if (p.notes?.length) fm.push('Notes printed in brackets in the source (other readings, editorial remarks):', '', ...p.notes.map((n) => `> ${n}`), '');
  return fm.join('\n');
}
function workFile(w) {
  const fm = ['---', `poet: ${w.poet}`, `title: ${q(w.title)}`, `title_en: ${q(w.title_en)}`, `form: ${w.form}`, `kind: ${w.kind}`];
  if (w.year) fm.push(`year: ${w.year}`);
  if (w.order) fm.push(`order: ${w.order}`);
  fm.push('source:', `  book: ${q(w.book)}`, `  url: ${q(w.url)}`, '---', '');
  if (w.intro) fm.push(w.intro, '');
  return fm.join('\n');
}

function collect() {
  const items = []; // { poet, form, title, verses, book, url, note, workCfg?, chapter?, pk? }
  const works = {};
  for (const [title, text] of Object.entries(WS)) {
    if (!text) continue;
    const author = text.match(/\|\s*author\s*=\s*([^\n|]*)/)?.[1]?.trim();
    const poet = WS_POETS[author];
    if (!poet) continue;
    if (title.includes('/')) continue; // subpages are read through their index page
    const cfg = PAGES[title] ?? {};
    const tpl = text.match(/\{\{(PD-[^}|]*)\}\}/)?.[1];
    const url = (t) => `https://wikisource.org/wiki/${encodeURIComponent(t.replace(/ /g, '_'))}`;
    const form = cfg.form ?? cfg.work?.form ?? FORM_BY_TITLE.find(([re]) => re.test(title))?.[1] ?? poet.form;
    let pieces;
    if (cfg.mode === 'subpages') {
      const links = [...text.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1].trim());
      pieces = links.filter((t) => WS[t]).map((t) => ({ title: t.split('/')[1], sts: stanzas(WS[t]), url: url(t), book: t }));
    } else pieces = split(stanzas(text), cfg);
    if (cfg.work) works[cfg.work.id] = { ...cfg.work, poet: poet.id, book: `Wikisource (Punjabi), public-domain transcription: ${title}`, url: url(title) };
    for (const piece of pieces) {
      const ed = editorial(piece.sts);
      const verses = toVerses(ed.sts, form);
      if (!verses.length) { console.warn(`empty piece in ${title}: ${piece.title ?? piece.chapter ?? ''}`); continue; }
      const first = verses[0].text.split('\n').find((l) => !/^\S{1,6}\s*-?$/.test(l)) ?? verses[0].text.split('\n')[0];
      const t = tidy(piece.title ?? (pieces.length === 1 && !cfg.work ? title.replace(/\s*\((I{1,3})\)$/, '') : first));
      items.push({
        poet: poet.id, form, title: t, verses,
        book: `Wikisource (Punjabi), public-domain transcription: ${piece.book ?? title}`,
        url: piece.url ?? url(title), note: wsNote(tpl),
        work: cfg.work?.id, chapter: piece.chapter, notes: ed.notes,
      });
    }
  }
  return { items, works };
}

function collectPk(have) {
  const items = [], works = {}, report = {};
  for (const cfg of PK_PAGES) {
    const file = `${PK}/${cfg.page}.html`;
    if (!existsSync(file)) { console.log(`${cfg.page}: not fetched`); continue; }
    const html = readFileSync(file, 'utf8');
    const r = (report[cfg.page] = { poet: cfg.poet, found: 0, new: 0, matched: 0 });
    const mode = cfg.mode ?? 'sections';
    let secs;
    if (mode === 'sections') secs = pkSections(html);
    else if (mode === 'pnum') {
      // No <h3>: a line holding only a number starts the next poem; blank lines part stanzas.
      const main = mainContent(html);
      const body = htext(main.slice(main.indexOf('</h1>') + 5).replace(/<(style|script)\b[\s\S]*?<\/\1>/gi, ''));
      secs = [];
      let st = [];
      const flush = () => { if (st.length && secs.length) secs.at(-1).sts.push(st); st = []; };
      for (const raw of body.split('\n')) {
        const l = carriers(raw.trim());
        if (/^[\d۰-۹]+$/.test(l)) { flush(); secs.push({ heading: null, anchor: null, sts: [] }); continue; }
        if (!l) { flush(); continue; }
        if (/[ء-ۿ]/.test(l) && !LABEL.test(l)) st.push(l);
      }
      flush();
    }
    else {
      const main = mainContent(html);
      const body = cfg.after ? main.slice(main.indexOf(cfg.after) + cfg.after.length) : main.slice(main.indexOf('</h1>') + 5);
      const sts = pkStanzas(body);
      if (mode === 'whole') secs = [{ heading: cfg.title, sts }];
      else secs = split(sts.map((s) => s), { mode: mode === 'numbered-raw' ? 'numbered' : mode }).map((p) => ({ heading: p.title, chapter: p.chapter, sts: p.sts }));
    }
    const url = (a) => `${PKBASE}${cfg.page}.php${a ? '#' + a : ''}`;
    if (cfg.work) works[cfg.work.id] = { ...cfg.work, poet: cfg.poet, book: `${cfg.book} (punjabi-kavita.com, Shahmukhi)`, url: url() };
    for (const s of secs) {
      if (cfg.skip?.test(s.heading ?? '')) continue;
      r.found++;
      const lines = s.sts.flat();
      const fp = fingerprint(lines);
      if (!cfg.all) {
        const best = Math.max(0, ...(have[cfg.poet] ?? []).map((h) => match(fp, h)));
        if (best >= 0.66) { r.matched++; continue; }
      }
      (have[cfg.poet] ??= []).push(fp);
      const form = cfg.form;
      const ed = editorial(s.sts);
      const verses = toVerses(ed.sts, form);
      if (!verses.length) continue;
      const head = s.heading && !/^[\d۰-۹]+$/.test(s.heading) ? s.heading : null;
      const title = tidy(carriers(cfg.title && secs.length === 1 ? cfg.title : head ?? lines[0]));
      items.push({
        poet: cfg.poet, form, title, verses,
        book: cfg.plainBook ? cfg.book : `${cfg.book} (punjabi-kavita.com, Shahmukhi)`,
        url: url(s.anchor), note: cfg.note ?? PK_NOTE, work: cfg.work?.id, chapter: s.chapter, year: cfg.year, notes: ed.notes,
      });
      r.new++;
    }
  }
  return { items, works, report };
}

function build(dry) {
  const old = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : { poems: [], works: [] };
  const mine = new Set(old.poems);
  const ids = new Set(readdirSync(POEMS).map((f) => f.replace(/\.md$/, '')).filter((id) => !mine.has(id)));
  const workIdsTaken = new Set(readdirSync(WORKS).map((f) => f.replace(/\.md$/, '')).filter((id) => !old.works.includes(id)));

  const ws = collect();
  const have = {};
  for (const it of ws.items) (have[it.poet] ??= []).push(fingerprint(it.verses.flatMap((v) => v.text.split('\n')), true));
  const pk = collectPk(have);
  const items = [...ws.items, ...pk.items];
  const works = { ...ws.works, ...pk.works };

  for (const id of Object.keys(works)) if (workIdsTaken.has(id)) throw new Error(`work id ${id} already exists`);
  const counter = {};
  const out = [];
  const report = {};
  for (const it of items) {
    const r = (report[it.poet] ??= { poems: 0, works: new Set() });
    r.poems++;
    let id;
    if (it.work) {
      const n = (counter[it.work] = (counter[it.work] ?? 0) + 1);
      it.workRef = { id: it.work, n, chapter: it.chapter };
      r.works.add(it.work);
      id = `${it.work}-${String(n).padStart(3, '0')}`;
    } else id = slug(it.title);
    let base = id, k = 2;
    while (ids.has(id)) id = `${base}-${k++}`;
    ids.add(id);
    out.push([id, poemFile({ ...it, work: it.workRef })]);
  }
  for (const [id, w] of Object.entries(works)) if (!counter[id]) { console.warn(`work ${id} has no poems`); delete works[id]; }

  if (!dry) {
    for (const id of old.poems) if (existsSync(`${POEMS}/${id}.md`)) unlinkSync(`${POEMS}/${id}.md`);
    for (const id of old.works) if (existsSync(`${WORKS}/${id}.md`)) unlinkSync(`${WORKS}/${id}.md`);
    for (const [id, s] of out) writeFileSync(`${POEMS}/${id}.md`, s);
    for (const [id, w] of Object.entries(works)) writeFileSync(`${WORKS}/${id}.md`, workFile(w));
    mkdirSync(`${ROOT}.cache/more-poets`, { recursive: true });
    writeFileSync(MANIFEST, JSON.stringify({ poems: out.map(([id]) => id), works: Object.keys(works) }, null, 1));
  }
  console.table(Object.fromEntries(Object.entries(report).map(([k, v]) => [k, { poems: v.poems, works: [...v.works].join(' ') }])));
  console.table(pk.report);
  console.log(`${out.length} poems, ${Object.keys(works).length} works${dry ? ' (dry run, nothing written)' : ''}`);
  if (process.env.DUMP) for (const [id, s] of out) if (s.includes(`poet: ${process.env.DUMP}\n`)) console.log(id, '|', s.match(/^title: (.*)$/m)[1], '|', s.match(/chapter: (.*)/)?.[1] ?? '', '|', (s.match(/- text:/g) || []).length);
}

const [cmd, flag] = process.argv.slice(2);
if (cmd === 'build') build(flag === '--dry');
else if (cmd === 'pk') {
  // Inspect a cached punjabi-kavita page: its <h3> sections, or (no sections) its first stanzas.
  const html = readFileSync(`${PK}/${flag}.html`, 'utf8');
  const secs = pkSections(html);
  for (const s of secs) console.log(s.anchor, '|', s.heading, '|', s.sts.length, 'st', s.sts.flat().length, 'lines |', s.sts[0]?.[0]);
  if (!secs.length) for (const s of pkStanzas(mainContent(html)).slice(0, 25)) console.log(s.length, '|', s.slice(0, 2).join(' // '));
  console.log(secs.length, 'sections');
}
else console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0]);
