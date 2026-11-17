/**
 * Word meanings for any Shahmukhi text, resolved at build time.
 *
 * Order of preference for a word:
 *   1. the site's own dictionary (Wilson 1899, each entry has a page),
 *   2. the reading lexicon in src/data/lexicon.json (Platts 1884, Wiktionary…),
 *      first the word as written, then conservative base-form guesses (lemma.ts).
 * Nothing is invented: every card names the source it came from.
 */
import fs from 'node:fs';
import path from 'node:path';
import { getCollection, type CollectionEntry } from 'astro:content';
import { sourcePa } from './pa';
import { candidates, fold } from './lemma';

type Entry = CollectionEntry<'dictionary'>;

/** One sourced meaning, as the meaning card shows it. */
export interface DictMeaning {
  hw: string;
  romanized: string;
  pos: string;
  senses: string[];
  /** Language of the senses (the lexicon is English-only, also on /pa). */
  lang: 'en' | 'pa';
  href?: string;
  source: string;
  /** Set when the word was matched through its base form. */
  base?: string;
  /** true when `base` is a guess from the word's ending. */
  guess?: boolean;
  /** The same spelling in a second source (often a different word: a homograph). */
  also?: { senses: string[]; source: string; href?: string };
}

/** The form two spellings are compared in (shared with the lexicon scripts). */
export { fold };

/** The word cores of a line, as segmentLine() cuts them. */
export function wordsOf(line: string): string[] {
  const out: string[] = [];
  for (const part of line.split(/\s+/)) {
    const core = part.match(/^[^\p{L}\p{M}\p{N}]*(.*?)[^\p{L}\p{M}\p{N}]*$/u)?.[1];
    if (core) out.push(core);
  }
  return out;
}

/* ---------- the site dictionary ---------- */

let dictIndex: Promise<Map<string, Entry | null>> | undefined;
/** Unambiguous headwords (and listed forms) -> entry. */
export function dictionaryIndex() {
  dictIndex ??= (async () => {
    const map = new Map<string, Entry | null>();
    for (const e of await getCollection('dictionary')) {
      for (const sp of [e.data.headword, e.data.forms.plural, e.data.forms.feminine, e.data.forms.oblique]) {
        if (!sp) continue;
        const k = fold(sp);
        map.set(k, map.has(k) && map.get(k) !== e ? null : e);
      }
    }
    return map;
  })();
  return dictIndex;
}

export function fromDictionary(e: Entry, locale: 'en' | 'pa', href: (id: string) => string): DictMeaning {
  const pa = locale === 'pa' && Boolean(e.data.definition_pa);
  const s = e.data.source;
  return {
    hw: e.data.headword,
    romanized: locale === 'pa' ? '' : e.data.romanized,
    pos: e.data.pos,
    senses: pa ? e.data.definition_pa!.split('؛').map((x) => x.trim()).filter(Boolean) : e.data.senses,
    lang: pa ? 'pa' : 'en',
    href: href(e.id),
    source: locale === 'pa' ? sourcePa({ ...s, page: undefined }).text.replace(/ \(.*$/, '') : [s.editor, s.year].filter(Boolean).join(', ') || s.book,
  };
}

/* ---------- the reading lexicon ---------- */

interface LexEntry { hw: string; roman?: string; pos?: string; senses: string[]; src: string; ref?: string }
interface LexSource { title: string; author?: string; year?: number | string; licence?: string; url?: string }
interface Lexicon { sources: Record<string, LexSource>; index: Map<string, LexEntry[]> }

let lexicon: Lexicon | null | undefined;
function loadLexicon(): Lexicon | null {
  if (lexicon !== undefined) return lexicon;
  const file = path.join(process.cwd(), 'src/data/lexicon.json');
  if (!fs.existsSync(file)) return (lexicon = null);
  const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as { sources: Record<string, LexSource>; entries: LexEntry[] };
  const index = new Map<string, LexEntry[]>();
  for (const e of raw.entries) {
    if (!e.hw || !e.senses?.length || e.src === 'wilson') continue; // Wilson comes from the collection, with its page
    const k = fold(e.hw);
    const list = index.get(k);
    if (list) list.push(e);
    else index.set(k, [e]);
  }
  return (lexicon = { sources: raw.sources ?? {}, index });
}

/** How a card credits its source (Wiktionary's licence requires naming it and the licence). */
const LABELS: Record<string, string> = {
  platts: 'Platts, 1884 (DSAL)',
  'wikt-pa': 'Wiktionary (Punjabi), CC BY-SA 4.0',
  'wikt-ur': 'Wiktionary (Urdu), CC BY-SA 4.0',
};
const sourceLabel = (s: LexSource | undefined, key: string) =>
  LABELS[key] ?? (s ? [s.title, s.year].filter(Boolean).join(', ') : key);

const ORDER = ['wikt-pa', 'platts', 'wikt-ur'];
const rank = (src: string) => (ORDER.indexOf(src) + 1 || 99);
/** Drop bare cross-references ("= X") when the entry has real senses. */
const clean = (senses: string[]) => {
  const real = senses.filter((x) => !/^=/.test(x.trim()));
  return real.length ? real : senses;
};

/** The first lexicon match for a word: as written, else through a base form. Up to two sources. */
function fromLexicon(word: string): DictMeaning | undefined {
  const lex = loadLexicon();
  if (!lex) return undefined;
  const folded = fold(word);
  for (const c of candidates(folded)) {
    const hits = lex.index.get(fold(c));
    if (!hits?.length) continue;
    // One entry per source; the Punjabi source leads, Platts next, Urdu Wiktionary last.
    const bySrc = new Map<string, LexEntry>();
    for (const h of [...hits].sort((x, y) => rank(x.src) - rank(y.src))) if (!bySrc.has(h.src)) bySrc.set(h.src, h);
    const [e, other] = [...bySrc.values()];
    const href = (x: LexEntry) => x.ref ?? lex.sources[x.src]?.url;
    const guess = fold(c) !== folded;
    return {
      hw: e.hw,
      romanized: e.roman ?? '',
      pos: e.pos ?? '',
      senses: clean(e.senses).slice(0, 4),
      lang: 'en',
      href: href(e),
      source: sourceLabel(lex.sources[e.src], e.src),
      base: guess ? e.hw : undefined,
      guess: guess || undefined,
      also: other ? { senses: clean(other.senses).slice(0, 2), source: sourceLabel(lex.sources[other.src], other.src), href: href(other) } : undefined,
    };
  }
  return undefined;
}

/** Sources of the lexicon, for the about page and card footers. */
export function lexiconSources(): Record<string, LexSource> {
  return loadLexicon()?.sources ?? {};
}

/* ---------- any text ---------- */

/**
 * Meanings for every word of `lines` that some source knows. Returns card data
 * and `keys`: normalised spelling (see normalise in content.ts) -> card index.
 * `seed` lets a caller put poem-specific cards first.
 */
export async function meaningsFor(
  lines: string[],
  locale: 'en' | 'pa',
  href: (id: string) => string,
  normalise: (w: string) => string,
  seed?: { items: { dict?: DictMeaning }[]; lookup: Map<string, number> },
) {
  const items: { dict?: DictMeaning }[] = seed?.items ?? [];
  const lookup = seed?.lookup ?? new Map<string, number>();
  const dict = await dictionaryIndex();
  const byCard = new Map<string, number>();
  const tried = new Set<string>();
  for (const line of lines) {
    for (const w of wordsOf(line)) {
      const k = normalise(w);
      if (!k || lookup.has(k) || tried.has(k)) continue;
      tried.add(k);
      const e = dict.get(fold(w));
      const m = e ? fromDictionary(e, locale, href) : fromLexicon(w);
      if (!m) continue;
      if (locale === 'pa') m.romanized = ''; // /pa shows no romanisation
      const id = `${m.source}|${m.hw}|${m.base ?? ''}`;
      let i = byCard.get(id);
      if (i === undefined) { i = items.length; items.push({ dict: m }); byCard.set(id, i); }
      lookup.set(k, i);
    }
  }
  return { items, lookup };
}
