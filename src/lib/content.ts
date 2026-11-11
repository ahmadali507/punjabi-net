/**
 * Content helpers shared by the poem and poet pages.
 * All matching and lookups happen at build time; the browser gets plain HTML
 * plus a small JSON blob for word meanings.
 */
import { getCollection, getEntry, type CollectionEntry } from 'astro:content';

export type Poet = CollectionEntry<'poets'>;
export type Poem = CollectionEntry<'poems'>;
export type Entry = CollectionEntry<'dictionary'>;

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

export async function getPoets(): Promise<Poet[]> {
  return (await getCollection('poets')).sort((a, b) => a.data.name.en.localeCompare(b.data.name.en));
}

export async function poemsByPoet(poetId: string): Promise<Poem[]> {
  return (await getPoems()).filter((p) => p.data.poet.id === poetId);
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
