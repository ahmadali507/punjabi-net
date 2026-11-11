/**
 * Content schemas. Every collection is a folder of files under src/content;
 * Git history is the editorial record.
 *
 * Script rule: Shahmukhi (sm), Gurmukhi (gm) and Roman (ro) are stored
 * separately in the content files. Nothing is converted at runtime.
 * Machine-drafted Gurmukhi (scripts/shahmukhi-to-gurmukhi.mjs) must be
 * flagged with gurmukhi_status: "auto" until a person has reviewed it.
 */
import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/* ---------- Shared building blocks ---------- */

/** One piece of Punjabi text, stored separately in each script. */
const scriptText = z.object({
  sm: z.string().trim().min(1, 'Shahmukhi text is required'),
  gm: z.string().trim().min(1, 'Gurmukhi text is required (use the draft script, then mark gurmukhi_status: auto)'),
  ro: z.string().trim().min(1, 'Roman text is required'),
});

/** Script text plus an English rendering (names, form titles). */
const scriptTextEn = scriptText.extend({ en: z.string().trim().min(1) });

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

export const GURMUKHI_STATUS = ['auto', 'reviewed'] as const;
const gurmukhiStatus = z.enum(GURMUKHI_STATUS);

/** Placeholder note for files whose text has not been entered from print yet. */
export const TEXT_NEEDED = 'Text needed from printed source';

/* ---------- Poets ---------- */

export const ERAS = ['classical', 'modern', 'contemporary'] as const;

const poets = defineCollection({
  // Frontmatter holds the fields; the Markdown body is the long bio.
  loader: glob({ pattern: '**/*.md', base: './src/content/poets' }),
  schema: ({ image }) =>
    z
      .object({
        name: scriptTextEn,
        born: historicDate.optional(),
        died: historicDate.optional(),
        era: z.enum(ERAS),
        styles: z.array(z.string().trim().min(1)).default([]),
        region: z.string().trim().min(1),
        bio_short: z.string().trim().min(1).max(200, 'Keep the one-line bio under 200 characters'),
        portrait: image().optional(),
        portrait_caption: z.string().trim().optional(),
        portrait_authentic: z.boolean().default(false),
        copyright_status: z.enum(['public_domain', 'in_copyright']),
        bibliography: z
          .array(
            z.object({
              title: z.string().trim().min(1),
              title_pa: scriptText.partial().optional(),
              year: z.union([z.number().int(), z.string().trim()]).optional(),
              publisher: z.string().trim().optional(),
              note: z.string().trim().optional(),
            }),
          )
          .default([]),
        bio_sources: z.array(source).default([]),
        recommended: z.boolean().default(false),
      })
      .refine((p) => !p.portrait || p.portrait_caption, {
        message: 'A portrait needs a portrait_caption saying what the image is and where it came from',
        path: ['portrait_caption'],
      }),
});

/* ---------- Forms (Kafi, Doha, Bait, Siharfi, Baran Maah, Qissa, Boli, Dohra) ---------- */

const forms = defineCollection({
  // Frontmatter: name + one-paragraph description. Markdown body: history and structure.
  loader: glob({ pattern: '**/*.md', base: './src/content/forms' }),
  schema: z.object({
    name: scriptTextEn,
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

const usage = z.object({ text: scriptText, en: z.string().trim().min(1) });

const dictionary = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/dictionary' }),
  schema: z.object({
    headword: scriptText,
    ipa: z.string().trim().optional(),
    pos: z.enum(POS),
    gender: z.enum(['masculine', 'feminine']).optional(),
    senses: z.array(z.string().trim().min(1)).min(1, 'At least one English sense'),
    definition_pa: scriptText.optional(),
    forms: z
      .object({
        plural: scriptText.optional(),
        feminine: scriptText.optional(),
        oblique: scriptText.optional(),
      })
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
    source: source,
    gurmukhi_status: gurmukhiStatus.default('auto'),
  }),
});

/* ---------- Poems ---------- */

/** A couplet or stanza. Lines are separated by "\n" in each script. */
const verse = z
  .object({
    sm: z.string().trim().min(1),
    gm: z.string().trim().min(1),
    ro: z.string().trim().min(1),
    en: z.string().trim().optional(),
    refrain: z.boolean().default(false),
  })
  .refine((v) => {
    const n = (s: string) => s.split('\n').length;
    return n(v.sm) === n(v.gm) && n(v.sm) === n(v.ro);
  }, 'Shahmukhi, Gurmukhi and Roman must have the same number of lines');

/**
 * Glossed word. Either a dictionary slug, or { entry, match } when the poem
 * uses an inflected spelling that differs from the headword, and/or `gloss`
 * when the meaning in this poem differs from the entry's first sense.
 */
const glossItem = z.union([
  reference('dictionary'),
  z.object({
    entry: reference('dictionary'),
    match: z
      .object({
        sm: z.array(z.string()).default([]),
        gm: z.array(z.string()).default([]),
        ro: z.array(z.string()).default([]),
      })
      .partial()
      .optional(),
    gloss: z.string().trim().optional(),
  }),
]);

const poems = defineCollection({
  // Frontmatter holds the poem; the optional Markdown body holds editorial notes.
  loader: glob({ pattern: '**/*.md', base: './src/content/poems' }),
  schema: z
    .object({
      poet: reference('poets'),
      form: reference('forms'),
      title: scriptText,
      title_en: z.string().trim().optional(),
      verses: z.array(verse).default([]),
      translation: z
        .object({ translator: z.string().trim().min(1), source: source.optional() })
        .optional(),
      glossary: z.array(glossItem).default([]),
      source: source,
      verification_note: z.string().trim().min(1),
      gurmukhi_status: gurmukhiStatus,
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
  loader: glob({ pattern: '**/*.json', base: './src/content/proverbs' }),
  schema: z.object({
    text: scriptText,
    literal_en: z.string().trim().min(1),
    meaning_en: z.string().trim().min(1),
    usage_note: z.string().trim().optional(),
    source: source,
    gurmukhi_status: gurmukhiStatus.default('auto'),
  }),
});

export const collections = { poets, poems, forms, dictionary, proverbs };
