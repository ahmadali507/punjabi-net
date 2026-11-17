/**
 * Content helpers shared by the poem and poet pages.
 * All matching and lookups happen at build time; the browser gets plain HTML
 * plus a small JSON blob for word meanings.
 */
import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { dictionaryIndex, fold, fromDictionary, meaningsFor, type DictMeaning } from './meanings';

export type Poet = CollectionEntry<'poets'>;
export type Poem = CollectionEntry<'poems'>;
export type Entry = CollectionEntry<'dictionary'>;
export type Form = CollectionEntry<'forms'>;
export type Proverb = CollectionEntry<'proverbs'>;

let checked: Promise<Poem[]> | undefined;

/**
 * All poems, after an integrity check: poets marked in_copyright must have no
 * poems in the archive (bio and bibliography only). The build fails otherwise.
 */
export function getPoems(): Promise<Poem[]> {
  checked ??= (async () => {
    const [poems, poets] = await Promise.all([getCollection('poems'), getCollection('poets')]);
    const byId = new Map(poets.map((p) => [p.id, p]));
    const bad = poems.filter((p) => byId.get(p.data.poet.id)?.data.copyright_status === 'in_copyright');
    if (bad.length) {
      throw new Error(
        `In-copyright poets may not have poems in the archive. Remove: ${bad.map((p) => `${p.id} (${p.data.poet.id})`).join(', ')}`,
      );
    }
    return poems.sort(byTitle);
  })();
  return checked;
}

/** Approximate year for sorting: "c. 1680" -> 1680, "early 17th century" -> 1620, unknown -> 9999. */
export function sortYear(date: string | undefined): number {
  if (!date) return 9999;
  const c = date.match(/(early|mid|late)? ?(\d{1,2})(?:st|nd|rd|th) century/);
  if (c) return (Number(c[2]) - 1) * 100 + ({ early: 20, mid: 50, late: 80 }[c[1] ?? 'mid'] ?? 50);
  return Number(date.match(/\d{3,4}/)?.[0] ?? 9999);
}

/** Poets in chronological order of birth. */
export async function getPoets(): Promise<Poet[]> {
  return (await getCollection('poets')).sort(
    (a, b) => sortYear(a.data.born ?? a.data.died) - sortYear(b.data.born ?? b.data.died) || a.data.name.en.localeCompare(b.data.name.en),
  );
}

export async function poemsByPoet(poetId: string): Promise<Poem[]> {
  return (await getPoems()).filter((p) => p.data.poet.id === poetId);
}

export async function getForms(): Promise<Form[]> {
  return (await getCollection('forms')).sort((a, b) => a.data.order - b.data.order || a.data.name.en.localeCompare(b.data.name.en));
}

/** Proverbs in a stable order (Shahmukhi alphabetical), so numbers and prev/next stay put. */
export async function getProverbs(): Promise<Proverb[]> {
  return (await getCollection('proverbs')).sort((a, b) => a.data.text.localeCompare(b.data.text, 'pnb') || a.id.localeCompare(b.id));
}

/* ---------- Dictionary ---------- */

/** Shahmukhi alphabet for browsing. Words starting with آ file under ا. */
export const ALPHABET = ['ا', 'ب', 'پ', 'ت', 'ٹ', 'ث', 'ج', 'چ', 'ح', 'خ', 'د', 'ڈ', 'ذ', 'ر', 'ڑ', 'ز', 'ژ', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ک', 'گ', 'ل', 'م', 'ن', 'ݨ', 'و', 'ہ', 'ی'] as const;
const LETTER_ALIASES: Record<string, string> = { 'آ': 'ا', 'أ': 'ا', 'إ': 'ا', 'ك': 'ک', 'ي': 'ی', 'ى': 'ی', 'ه': 'ہ', 'ۃ': 'ہ', 'ڻ': 'ݨ' };
export function firstLetter(word: string): string {
  const c = [...normalise(word)][0] ?? '';
  return LETTER_ALIASES[c] ?? c;
}

export async function getEntries(): Promise<Entry[]> {
  return (await getCollection('dictionary')).sort((a, b) => a.data.headword.localeCompare(b.data.headword, 'pnb'));
}

/** Poems whose glossary points at this entry (the dictionary → poem half of the two-way link). */
export async function poemsUsingEntry(id: string): Promise<Poem[]> {
  return (await getPoems()).filter((p) => p.data.glossary.some((g) => ('entry' in g ? g.entry.id : g.id) === id));
}

const byTitle = (a: Poem, b: Poem) => a.data.title.localeCompare(b.data.title, 'pnb');

/** "c. 1680 – 1757", "– 1757", "c. 1680 –", or "" */
export function lifespan(p: Poet['data']): string {
  if (!p.born && !p.died) return '';
  return `${p.born ?? ''} – ${p.died ?? ''}`.trim();
}

/* ---------- Word meanings ---------- */

export interface GlossData {
  hw: string;
  romanized: string;
  ipa?: string;
  pos: string;
  gender?: string;
  /** Poem-specific gloss first, then the entry's senses */
  senses: string[];
  href: string;
}

/** Strip punctuation and vowel marks (zer, zabar, pesh…) so a token can be compared with a headword. */
const PUNCT = /[\s.,;:!?،؛؟۔"'“”‘’()[\]{}«»\-–—…]+/g;
const HARAKAT = /[ً-ٰٟۖ-ۭ]/g;
export const normalise = (token: string) => token.replace(PUNCT, '').replace(HARAKAT, '');

/** Resolve a poem's glossary: data for the meaning panel, and normalised spelling -> glossary index. */
export async function resolveGlossary(poem: Poem, dictionaryHref: (id: string) => string) {
  const items: GlossData[] = [];
  const lookup = new Map<string, number>();

  for (const g of poem.data.glossary) {
    const ref = 'entry' in g ? g.entry : g;
    const entry = await getEntry(ref);
    if (!entry) throw new Error(`Poem ${poem.id}: glossary entry "${ref.id}" is not in the dictionary`);
    const d = entry.data;
    const custom = 'entry' in g ? g : undefined;
    const index = items.length;
    items.push({
      hw: d.headword,
      romanized: d.romanized,
      ipa: d.ipa,
      pos: d.pos,
      gender: d.gender,
      senses: custom?.gloss ? [custom.gloss, ...d.senses.filter((s) => s !== custom.gloss)] : d.senses,
      href: dictionaryHref(entry.id),
    });
    const spellings = [d.headword, d.forms.plural, d.forms.feminine, d.forms.oblique, ...(custom?.match ?? [])];
    for (const sp of spellings) if (sp) lookup.set(normalise(sp), index);
  }
  return { items, lookup };
}

/** What the reader's meaning card shows for one word of a poem. */
export interface WordMeaning {
  /** Contextual meaning in this poem (editorial gloss). */
  en?: string;
  pos?: string;
  roman?: string;
  base?: string;
  note?: string;
  /** true while the gloss is an unreviewed editorial draft. */
  draft?: boolean;
  /** A sourced dictionary or lexicon meaning for the same word, when one exists. */
  dict?: DictMeaning;
}

/**
 * Meanings for every word of a poem: the poem's gloss file (contextual,
 * editorial) merged with sourced dictionary entries (explicit glossary links
 * first), then every other word some dictionary or lexicon knows. Returns card
 * data and a lookup from normalised spelling to card index, for segmentLine().
 */
export async function wordMeanings(poem: Poem, dictionaryHref: (id: string) => string, locale: 'en' | 'pa' = 'en') {
  const pa = locale === 'pa';
  const gloss = await getEntry('glosses', poem.id);
  const entries = await getCollection('dictionary');
  const byWord = await dictionaryIndex();
  const explicit = new Map<string, Entry>();
  for (const g of poem.data.glossary) {
    const ref = 'entry' in g ? g.entry : g;
    const e = entries.find((x) => x.id === ref.id);
    if (!e) continue;
    const spellings = [e.data.headword, e.data.forms.plural, e.data.forms.feminine, e.data.forms.oblique, ...('entry' in g ? (g.match ?? []) : [])];
    for (const sp of spellings) if (sp) explicit.set(normalise(sp), e);
  }
  const dictFor = (k: string): DictMeaning | undefined => {
    const e = explicit.get(k) ?? byWord.get(fold(k)) ?? undefined;
    return e ? fromDictionary(e, locale, dictionaryHref) : undefined;
  };

  const items: WordMeaning[] = [];
  const lookup = new Map<string, number>();
  const words = gloss?.data.words ?? {};
  for (const [k, w] of Object.entries(words)) {
    lookup.set(k, items.length);
    const draft = gloss!.data.status === 'draft';
    items.push(
      pa
        ? { en: w.pa, pos: w.pos, base: w.base, note: w.note_pa, draft, dict: dictFor(k) }
        : { en: w.en, pos: w.pos, roman: w.roman, base: w.base, note: w.note, draft, dict: dictFor(k) },
    );
  }
  for (const k of explicit.keys()) {
    if (lookup.has(k)) continue;
    const dict = dictFor(k);
    if (dict) { lookup.set(k, items.length); items.push({ dict }); }
  }
  // Every other word: the dictionary, then the reading lexicon.
  const lines = poem.data.verses.flatMap((v) => v.text.split('\n'));
  return meaningsFor(lines, locale, dictionaryHref, normalise, { items, lookup }) as Promise<{ items: WordMeaning[]; lookup: Map<string, number> }>;
}

export type Segment = { text: string; g?: number };

/** Split one line into plain text and glossed words. Whitespace and punctuation stay outside the buttons. */
export function segmentLine(line: string, lookup: Map<string, number>): Segment[] {
  if (lookup.size === 0) return [{ text: line }];
  const out: Segment[] = [];
  for (const part of line.split(/(\s+)/)) {
    if (!part) continue;
    const m = part.match(/^([^\p{L}\p{M}\p{N}]*)(.*?)([^\p{L}\p{M}\p{N}]*)$/u);
    const [, pre = '', core = '', post = ''] = m ?? [];
    const g = core ? lookup.get(normalise(core)) : undefined;
    if (g === undefined) push(out, part);
    else {
      if (pre) push(out, pre);
      out.push({ text: core, g });
      if (post) push(out, post);
    }
  }
  return out;
}
function push(out: Segment[], text: string) {
  const last = out[out.length - 1];
  if (last && last.g === undefined) last.text += text;
  else out.push({ text });
}

/** Extended Arabic-Indic digits, for numbers on /pa. */
export const paDigits = (n: number | string) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);

/* ---------- Works (a qissa, book or collection read as one text) ---------- */

export type Work = CollectionEntry<'works'>;

/** All works, by poet then `order` then English title. */
export async function getWorks(): Promise<Work[]> {
  return (await getCollection('works')).sort(
    (a, b) => a.data.poet.id.localeCompare(b.data.poet.id) || a.data.order - b.data.order || a.data.title_en.localeCompare(b.data.title_en),
  );
}

export async function worksByPoet(poetId: string): Promise<Work[]> {
  return (await getWorks()).filter((w) => w.data.poet.id === poetId);
}

let byWork: Promise<Map<string, Poem[]>> | undefined;
/** The poems of a work, in the work's order (work.n). */
export async function poemsOfWork(workId: string): Promise<Poem[]> {
  byWork ??= (async () => {
    const m = new Map<string, Poem[]>();
    for (const p of await getPoems()) {
      const w = p.data.work;
      if (!w) continue;
      if (!m.has(w.id.id)) m.set(w.id.id, []);
      m.get(w.id.id)!.push(p);
    }
    for (const list of m.values()) list.sort((a, b) => a.data.work!.n - b.data.work!.n);
    return m;
  })();
  return (await byWork).get(workId) ?? [];
}

/** Chapters of a work: consecutive runs of the same `work.chapter`, with their first and last part numbers. */
export function chaptersOf(parts: Poem[]): { title: string; from: number; to: number; id: string }[] {
  const out: { title: string; from: number; to: number; id: string }[] = [];
  for (const p of parts) {
    const w = p.data.work!;
    const last = out.at(-1);
    if (w.chapter && (!last || last.title !== w.chapter)) out.push({ title: w.chapter, from: w.n, to: w.n, id: `ch-${out.length + 1}` });
    else if (last) last.to = w.n;
  }
  return out;
}
