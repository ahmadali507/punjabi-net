# src/data

## lexicon.json

A word list for the poem reader's meaning dialog: Shahmukhi headword → short English senses,
every sense taken (trimmed, never rewritten) from a named source.

```json
{
  "sources": { "platts": { "title": "…", "author": "…", "year": 1884, "licence": "Public domain", "url": "…" } },
  "entries": [
    { "hw": "دل", "roman": "dil", "pos": "noun", "senses": ["heart", "mind", "soul"], "src": "wikt-pa", "ref": "https://en.wiktionary.org/wiki/…" }
  ]
}
```

`pos` is one of noun, verb, adjective, adverb, pronoun, postposition, conjunction,
interjection, particle, numeral, phrase (absent when the source gives none). At most 4
senses, each ≤ ~80 characters. The same headword can have several entries (one per
source and part of speech). Entries are sorted by folded headword, then by source in the
order wilson, wikt-pa, platts, wikt-ur — a sensible display order (Punjabi sources first).

### Sources

| key | source | licence | how it is read |
|---|---|---|---|
| `wilson` | J. Wilson, *Grammar and Dictionary of Western Panjabi* (1899) | Public domain | the site's own `src/content/dictionary/*.json`; `ref` is `/dictionary/<id>` |
| `wikt-pa` | English Wiktionary, Punjabi entries, via the [kaikki.org](https://kaikki.org/dictionary/Punjabi/) wiktextract JSONL | CC BY-SA 4.0 | Shahmukhi-headworded entries; Gurmukhi entries through their Shahmukhi spelling; Shahmukhi forms from inflection tables ("f. sg. imperfective participle of ویکھنا: to look") |
| `wikt-ur` | English Wiktionary, Urdu entries, via [kaikki.org](https://kaikki.org/dictionary/Urdu/) | CC BY-SA 4.0 | same as above; labelled Urdu so the UI can say so |
| `platts` | John T. Platts, *A Dictionary of Urdū, Classical Hindī, and English* (1884) | Public domain (the 1884 book) | every page of the University of Chicago [Digital Dictionaries of South Asia](https://dsal.uchicago.edu/dictionaries/platts/) edition; `ref` is the DSAL page |

Notes:

- **Wiktionary is CC BY-SA 4.0**: pages showing those senses need attribution
  ("from Wiktionary, CC BY-SA 4.0", linking `ref`), and the lexicon file as a whole is a
  share-alike adaptation.
- **Platts / DSAL**: the 1884 dictionary is public domain, but DSAL publishes its
  digitisation under CC BY-NC-ND 2.0 (see `sources.platts.note`). Our use extracts short
  factual senses from a public-domain text; if that is judged to need DSAL's permission,
  drop the `platts` source (`build.mjs` → `counts.platts`) and rebuild.
- Platts senses are condensed mechanically: grammar label → part of speech, etymology in
  `[…]` and script-only parentheses removed, phrase lists after ": —" dropped, the rest
  split at ";" and cut to 4 senses of ≤ 80 characters. "= X, q.v." cross-references get
  X's senses after a leading "= X".
- DSAL encodes Urdu with some non-Urdu code points (ٿ ڙ ڐ for ٹ ڑ ڈ, Arabic ي ك, and ه
  for both h and aspiration). The generator maps them, deciding aspiration (ھ) from the
  entry's Devanagari spelling (or its romanisation) — e.g. انچهيلا → انچھیلا.
- Bhai Maya Singh's *Panjabi Dictionary* (1895) is Gurmukhi-only and was not used.

### Matching words in poems

Index entries by `fold(hw)` and look a word up with `candidates(word)`, both from
`src/lib/lemma.ts`:

```ts
import { fold, candidates } from '../lib/lemma';
const index = new Map<string, Entry[]>();
for (const e of lexicon.entries) (index.get(fold(e.hw)) ?? index.set(fold(e.hw), []).get(fold(e.hw))!).push(e);
const key = candidates(word).find((k) => index.has(k));   // first hit wins
```

`fold` = the site's `normalise` (punctuation, vowel marks) plus letter unification
(ي/ى→ی, ك→ک, ه/ۀ/ۃ/ة→ہ, ݨ/ڻ→ن, أ/إ/ٱ→ا, ﷲ→اللہ, honorific/takhallus signs removed),
because the poems use ی ک ہ ن where Wiktionary uses ݨ and DSAL uses ي ك ه.
`candidates` returns the folded word, its final ا/ہ spelling variant, then conservative
base-form guesses (plural/oblique → direct singular, feminine → masculine, participles,
perfectives and futures → infinitive). A key found only through a guess is a guess: the
UI should present it as "probably a form of …".

### Regenerating

```sh
node scripts/lexicon/fetch.mjs          # kaikki.org Punjabi + Urdu JSONL (~77 MB) → scripts/lexicon/.cache/
node scripts/lexicon/fetch-platts.mjs   # 1,254 DSAL pages, 1 request / 1.5 s (~45 min), cached; re-runs skip cached pages
node scripts/lexicon/build.mjs          # → src/data/lexicon.json
node scripts/lexicon/coverage.mjs       # % of poem words matched (add --misses 50 / --fallbacks 50 to inspect)
```

Downloads are cached in `scripts/lexicon/.cache/` (git-ignored). Requests use the
User-Agent `punjabi-net-lexicon/1.0`. kaikki.org regenerates its extracts from Wiktionary
dumps, so counts move a little between runs; the `year` of the Wiktionary sources is the
download year.
