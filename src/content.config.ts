/**
 * Content schemas. Every collection is a folder of files under src/content;
 * Git history is the editorial record.
 *
 * Script rule: all Punjabi text is Shahmukhi. Romanisation appears only as a
 * pronunciation aid in the dictionary (and optionally for proverbs), never as
 * a way to read the archive.
 */
import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Layout fixtures (src/content/_fixtures) are loaded only when PN_FIXTURES=1,
 * i.e. on the preview dev server. They hold placeholder lines that say they are
 * placeholders, never poetry, and are never part of a production build.
 */
const FIXTURES = process.env.PN_FIXTURES === '1';
function files(collection: string, ext: 'md' | 'json') {
  return glob({
    base: './src/content',
    pattern: [`${collection}/**/*.${ext}`, ...(FIXTURES ? [`_fixtures/${collection}/**/*.${ext}`] : [])],
    // Ids are the file name only, so a fixture and a real file share one namespace.
    generateId: ({ entry }) => entry.replace(/^.*\//, '').replace(/\.(md|json)$/, ''),
  });
}

/* ---------- Shared building blocks ---------- */

/** Shahmukhi text. Must contain Arabic-script letters. */
const SHAHMUKHI = /[؀-ۿݐ-ݿ]/;
const pa = z.string().trim().min(1).regex(SHAHMUKHI, 'Punjabi text must be in Shahmukhi');

/** A name in Shahmukhi plus its usual English spelling. */
const name = z.object({ pa, en: z.string().trim().min(1) });

/**
 * Historic dates as written by scholars. Accepted:
 *   "1542", "c. 1173", "1757?", "c. 1680?", "12th century",
 *   "early 17th century", "mid 18th century", "late 16th century"
 */
export const HISTORIC_DATE = /^(?:(?:c\. )?\d{3,4}\??|(?:(?:early|mid|late) )?\d{1,2}(?:st|nd|rd|th) century)$/;
const historicDate = z
  .string()
  .trim()
  .regex(HISTORIC_DATE, 'Use "1542", "c. 1173", "1757?", "12th century" or "late 16th century"');

/** Where a text comes from. Every text records its source book. */
const source = z.object({
  book: z.string().trim().min(1),
  editor: z.string().trim().optional(),
  publisher: z.string().trim().optional(),
  year: z.union([z.number().int(), z.string().trim()]).optional(),
  page: z.union([z.number().int(), z.string().trim()]).optional(),
  url: z.url().optional(),
});
export type Source = z.infer<typeof source>;

/** Placeholder note for files whose text has not been entered from print yet. */
export const TEXT_NEEDED = 'Text needed from printed source';

/* ---------- Poets ---------- */

export const ERAS = ['classical', 'modern', 'contemporary'] as const;

const poets = defineCollection({
  // Frontmatter holds the fields; the Markdown body is the long bio.
  loader: files('poets', 'md'),
  schema: ({ image }) =>
    z
      .object({
        name,
        born: historicDate.optional(),
        died: historicDate.optional(),
        era: z.enum(ERAS),
        styles: z.array(z.string().trim().min(1)).default([]),
        region: z.string().trim().min(1),
        bio_short: z.string().trim().min(1).max(200, 'Keep the one-line bio under 200 characters'),
        portrait: image().optional(),
        portrait_caption: z.string().trim().optional(),
        portrait_authentic: z.boolean().default(false),
        /** Who made the image and under what licence, e.g. "Amarjit Chandan · CC BY 4.0". */
        portrait_credit: z.string().trim().optional(),
        /** The image's source page (Wikimedia Commons file page). */
        portrait_url: z.url().optional(),
        copyright_status: z.enum(['public_domain', 'in_copyright']),
        bibliography: z
          .array(
            z.object({
              title: z.string().trim().min(1),
              title_pa: pa.optional(),
              year: z.union([z.number().int(), z.string().trim()]).optional(),
              publisher: z.string().trim().optional(),
              note: z.string().trim().optional(),
            }),
          )
          .default([]),
        bio_sources: z.array(source).default([]),
        recommended: z.boolean().default(false),
      })
      .refine((p) => !p.portrait || (p.portrait_credit && p.portrait_url), {
        message: 'A portrait needs portrait_credit (author and licence) and portrait_url (source page)',
        path: ['portrait_credit'],
      })
      .refine((p) => !p.portrait || p.portrait_caption, {
        message: 'A portrait needs a portrait_caption saying what the image is and where it came from',
        path: ['portrait_caption'],
      }),
});

/* ---------- Forms (Kafi, Doha, Bait, Siharfi, Baran Maah, Qissa, Boli, Dohra) ---------- */

const forms = defineCollection({
  // Frontmatter: name + one-paragraph description. Markdown body: history and structure.
  loader: files('forms', 'md'),
  schema: z.object({
    name,
    description: z.string().trim().min(1),
    order: z.number().int().default(100),
    sources: z.array(source).default([]),
  }),
});

/* ---------- Dictionary (backbone: Bhai Maya Singh, The Panjabi Dictionary, 1895) ---------- */

export const DIALECTS = ['Majhi', 'Doabi', 'Malwai', 'Pothohari'] as const;
export const POS = [
  'noun', 'verb', 'adjective', 'adverb', 'pronoun', 'postposition',
  'conjunction', 'interjection', 'particle', 'numeral', 'phrase',
] as const;

const usage = z.object({ text: pa, en: z.string().trim().min(1) });

const dictionary = defineCollection({
  loader: files('dictionary', 'json'),
  schema: z.object({
    headword: pa,
    /** Pronunciation aid: romanised spelling (macrons for long vowels, underdots for retroflexes). */
    romanized: z.string().trim().min(1),
    /** true when the source prints only the romanised form and `headword` is the editors' Shahmukhi transcription. */
    transliterated: z.boolean().default(false),
    ipa: z.string().trim().optional(),
    pos: z.enum(POS),
    gender: z.enum(['masculine', 'feminine']).optional(),
    senses: z.array(z.string().trim().min(1)).min(1, 'At least one English sense'),
    definition_pa: pa.optional(),
    forms: z
      .object({ plural: pa.optional(), feminine: pa.optional(), oblique: pa.optional() })
      .default({}),
    phrases: z.array(usage).default([]),
    examples: z.array(usage.extend({ source: source.optional() })).default([]),
    translations: z
      .object({
        ur: z.array(z.string().trim()).default([]),
        hi: z.array(z.string().trim()).default([]),
        en: z.array(z.string().trim()).default([]),
      })
      .default({ ur: [], hi: [], en: [] }),
    dialects: z.array(z.enum(DIALECTS)).default([]),
    common: z.boolean().default(false),
    source,
  }),
});

/* ---------- Poems ---------- */

/** A couplet or stanza. Lines are separated by "\n". `en` must have the same number of lines. */
const verse = z
  .object({
    text: pa,
    en: z.string().trim().optional(),
    refrain: z.boolean().default(false),
  })
  .refine((v) => !v.en || v.en.split('\n').length === v.text.split('\n').length, {
    message: 'The English translation must have the same number of lines as the verse',
    path: ['en'],
  });

/**
 * Glossed word. Either a dictionary slug, or { entry, match } when the poem
 * uses inflected spellings that differ from the headword, and/or `gloss`
 * when the meaning in this poem differs from the entry's first sense.
 */
const glossItem = z.union([
  reference('dictionary'),
  z.object({
    entry: reference('dictionary'),
    match: z.array(pa).default([]),
    gloss: z.string().trim().optional(),
  }),
]);

const poems = defineCollection({
  // Frontmatter holds the poem; the optional Markdown body holds editorial notes.
  loader: files('poems', 'md'),
  schema: z
    .object({
      poet: reference('poets'),
      form: reference('forms'),
      title: pa,
      title_en: z.string().trim().optional(),
      verses: z.array(verse).default([]),
      translation: z
        .object({ translator: z.string().trim().min(1), source: source.optional() })
        .optional(),
      glossary: z.array(glossItem).default([]),
      source,
      verification_note: z.string().trim().min(1),
      featured: z.boolean().default(false),
    })
    .refine((p) => p.verses.length > 0 || p.verification_note.startsWith(TEXT_NEEDED), {
      message: `A poem with no verses must have verification_note "${TEXT_NEEDED}"`,
      path: ['verification_note'],
    })
    .refine((p) => !p.verses.some((v) => v.en) || p.translation, {
      message: 'Verses carry English translations, so `translation.translator` is required',
      path: ['translation'],
    }),
});

/* ---------- Proverbs ---------- */

const proverbs = defineCollection({
  loader: files('proverbs', 'json'),
  schema: z.object({
    text: pa,
    /** Romanised form; when the source gives only this, `text` is a transliteration of it. */
    romanized: z.string().trim().optional(),
    /** true when `text` was transcribed into Shahmukhi by the editors from `romanized`. */
    transliterated: z.boolean().default(false),
    literal_en: z.string().trim().min(1),
    /** The source's explanation of the sense, when it gives one. */
    meaning_en: z.string().trim().optional(),
    usage_note: z.string().trim().optional(),
    /** The source's section heading (Soils, Cattle, Worldly wisdom…). */
    topic: z.string().trim().optional(),
    source,
  }),
});

export const collections = { poets, poems, forms, dictionary, proverbs };
