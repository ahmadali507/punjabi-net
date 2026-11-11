# Changelog

## Landing page (2026-11-11)

- New hero: large serif headline ("The home of Punjabi poetry" / پنجابی شاعری دا گھر), the Shahmukhi thesis
  in the accent colour, ruled-paper background lines, a faint centred پنجابی watermark, soft diamonds and a
  warm glow. Pure CSS, works in dark mode and right-to-left, hidden in print. Lighthouse home 95, /pa 94.
- The preview build no longer includes the layout fixtures.

## Portraits (2026-11-11)

- 11 of 13 poets now have an image, all from **Wikimedia Commons** with a reusable licence: public domain,
  CC0, CC BY or CC BY-SA. Google Images results are mostly copyrighted and unlicensed, so they were not
  used. Each image carries a caption, a credit (author · licence · Wikimedia Commons) and a link to its
  Commons page; the schema now requires all three.
- Classical poets have no portraits from life. They are shown with later depictions, captioned as such:
  Bulleh Shah (19th-century lithograph), Waris Shah (Lahore, about 1859), Baba Farid (Guler painting),
  Shah Hussain (painting, about 1770). Sultan Bahu and Mian Muhammad Bakhsh are shown by their shrines.
  Hashim Shah is shown by the cover of a printed Sassi Punnun (public domain); Ustad Daman by Shah Hussain's
  shrine in Lahore, where he is buried (CC BY-SA 3.0). No portrait of either is freely licensed: Commons,
  Wikidata, the en/ur/pnb/pa Wikipedias and Openverse were searched. All 13 poets now have an image.
- Modern poets have photographs: Bhai Vir Singh, Amrita Pritam, Shiv Kumar Batalvi, Munir Niazi and Surjit Patar.
- Portraits also appear on the poets grid, home page cards, and as a round thumbnail in each poem's
  "About the poet" box. Sources were resized to 640 px; Astro serves responsive WebP (200/320/420 px).
  The poets grid is two columns on phones.
- Performance: CSS is now inlined, and only the first card's image loads eagerly. Lighthouse mobile:
  home 95, proverbs 96, poet pages 95–96, poems 98; `/poets` 90, because it shows 14 images at once.
- The era is no longer repeated as a style tag ("Modern · Modern").

## Content: data gathering (2026-11-11)

### Poems: 82 texts, all public domain
| Poet | Poems | Source |
|---|---|---|
| Bulleh Shah | 10 kafis | Wikisource (PD-old) |
| Shah Hussain | 10 kafis | Wikisource |
| Sultan Bahu | 10 abyat | Wikisource |
| Baba Farid | 10 shaloks (new form: Shalok) | Wikisource |
| Hashim Shah | 10 dohras + the whole of Sassi Punnun | Wikisource |
| Waris Shah | Heer, sections 1–10 (of 630) | Wikisource |
| Mian Muhammad Bakhsh | 10 dohras + Saif ul Malook, section 1 | Wikisource |
| Bhai Vir Singh | 10 poems from Matak Hulare (1922) (new form: Nazm) | punjabi-kavita.com Shahmukhi transliteration of the Gurmukhi original |

- Texts were imported verbatim by script (`<poem>` blocks), split into stanzas, with kafi refrains detected
  and labelled (refrains are not counted as numbered stanzas). Every poem links its source page and says
  "Not yet checked against a printed edition."
- "Ilmon bas karin o yar" (Bulleh Shah) is still a stub: no public-domain online text was found.

### Proverbs: 159
- From J. Wilson, *Grammar and Dictionary of Western Panjabi, as spoken in the Shahpur District, with
  Proverbs, Sayings and Verses* (Punjab Government Press, Lahore, 1899; archive.org 12034371bsb), with
  Wilson's English translations and explanations, topic and page. Wilson printed Punjabi in Roman letters,
  so the Shahmukhi is an editorial transcription; each proverb shows the romanised original and a notice.
- Skipped: slurs against castes and communities, garbled OCR, near-duplicate variants.

### Dictionary: 553 entries
- From the same Wilson book (Dictionary pp. 1–69), headwords transcribed into Shahmukhi (marked on each
  entry), Wilson's English senses verbatim. Replaces the Maya Singh plan: the only online edition of
  Maya Singh (DSAL) is under a Creative Commons licence and in Gurmukhi.
- Entries from pages where the OCR separated headwords from definitions were paired by order and meaning;
  they are the least certain (A–H pages 4–9, 13, 15, 17, 19–21, 23 and most P–Z pages).
- 55 poems now have tap-a-word meanings (136 links), matched automatically to unambiguous noun/adjective
  headwords; ambiguous words (پیر، مول، وچھا، کیہا) were removed by hand.

### Poets: all 13 fact-checked
- Dates, places, bios and bibliographies checked against Wikipedia, the Encyclopaedia of Sikhism, Dawn,
  The Tribune, Rekhta and others; each poet lists its sources with URLs. Notable corrections: Munir Niazi's
  birth year (1923?, not 1928), Shiv Kumar Batalvi's birthplace, Hashim Shah's village (Jagdev Kalan).

### Needs a native speaker
Shahmukhi transcriptions of proverbs and dictionary headwords; Bhai Vir Singh transliterations; `title_pa`
spellings of some book titles; UI strings.

## Phase 5: About, contribute, SEO, OG images, print, Lighthouse (2026-11-11)

### Built
- **About** `/about` (+ `/pa/about`): mission, sources policy, FAQ (`<details>`, no JS), and the
  **contribution form**: message, contact, optional website, optional photo or scan up to 3.5 MB,
  a honeypot against spam. It is a plain form post, so it works without JavaScript.
- **Cloudflare Pages Function** `functions/api/contribute.ts`: validates (empty message, bad URL,
  file over 3.5 MB or of the wrong type), stores in Workers KV (photos in R2 if bound, else KV),
  or forwards to Formspree when `FORMSPREE_ENDPOINT` is set instead; redirects to
  `/contribute/thanks` or `/contribute/error` in the right language. Setup in `DEPLOY.md`.
- **OG images**: 1200×630 PNGs built for the site and every poem, poet, form, proverb and dictionary
  entry (resvg; Shahmukhi in Noto Naskh, since resvg cannot shape Nastaliq). Plus `og:image`
  size/alt meta, and JSON-LD (WebSite, CreativeWork for poems, Person for poets).
- **Print**: a poem prints on one A4 page up to about 12 stanzas with translation; poems over 6
  stanzas are set in two right-to-left columns. Notes, tools and links are dropped from print.
- `public/_headers`: immutable caching for fonts and hashed assets; basic security headers.

### Fixed
- Verse text had shrunk to body size on English pages since phase 3 (a size rule for Punjabi
  snippets was more specific than the reader's). Now zero-specificity via `:where()`.
- The honeypot field caused horizontal scroll on `/pa/about` (RTL); hidden with clipping instead.

### Verified
- `npm run build`: 0 errors / 0 warnings / 0 hints. `npm test`: 10/10 Function tests (storage,
  redirects per language, empty message, bad URL, photo exactly 3.5 MB accepted, 3.5 MB + 1 byte
  rejected, wrong type, honeypot, not configured, Formspree forwarding).
- **Lighthouse (mobile)**: home 97/100/100/100, poem 98/100/100/100, `/pa` poet 97/100/100/100,
  dictionary entry 96/100/100/100, About 97/100/100/100 (performance/accessibility/best
  practices/SEO). `/search` scores SEO 66 because it is deliberately `noindex`.
- Print: 4- and 12-stanza poems are one A4 page in both languages (PDF page count).
- All 47 browser checks from phases 2–4 pass again; no horizontal scroll on any page tested.

### Left / open
- Deploy: create the Pages project and a KV namespace (see `DEPLOY.md`). Not done: it needs your
  Cloudflare account.
- The Function was tested with Node's test runner against an in-memory KV, not on Cloudflare itself.

## Phase 4: dictionary (2026-11-11)

### Built
- **Dictionary home** `/dictionary`: search (goes to `/search?type=word`), a right-to-left letter grid
  (letters with no words yet are dashed), common words (`common: true`), the Maya Singh credit.
- **Letter pages** `/dictionary/letter/{x}` for all 36 letters (آ files under ا): every headword with
  part of speech, gender and first sense, and a letter strip to move between letters.
- **Entry pages** `/dictionary/{slug}`: headword; romanisation, IPA, part of speech and gender (labels
  translated on `/pa`); dialect tags; numbered senses; Punjabi definition; plural/feminine/oblique
  forms; phrases; examples with sources; Urdu/Hindi/English translations; **Appears in poems**
  (the reverse of each poem's glossary, so the link runs both ways); source and page.
- Search indexes entries as type `word`.

### Verified
- `npm run build`: 0 errors / 0 warnings / 0 hints. 20 screenshots, no overflow. Browser checks: poem
  word → entry → back to the poem; dictionary search returns words only; letter grid → letter page.

### Left / open
- **No real entries yet.** Meanings are not to be invented: entries need typing in from Bhai Maya
  Singh's *The Panjabi Dictionary* (1895). The schema, pages and cross-links are ready for them.

## Phase 3: lists, home, forms, proverbs, search (2026-11-11)

### Built
- **Poets** `/poets`: chronological grid (by birth); letter tile with an honest caption when no portrait
  exists; era and style tags; one-line bio; count; name filter (English or Shahmukhi) and era chips.
- **Poems** `/poems`: grouped by poet; form chips and a poet select; filters mirror into the URL
  (`?form=qissa&poet=waris-shah`) so a filtered list can be shared. "Text pending" badges.
- **Home**: thesis, intro, buttons; recommended poets (`recommended: true`); selected poems (featured
  first); a proverb that changes with each build day; closing couplet slot (shown only once
  `SITE.footerCouplet` points at a verse that exists).
- **Forms** `/forms` + `/forms/{slug}`: all eight forms with Shahmukhi and English names, a short
  description, history and structure, poems in the form, links to the others.
- **Proverbs** `/proverbs` + `/proverbs/{slug}`: numbered list with search (Shahmukhi, romanised or
  English), per-proverb page with literal meaning, meaning, usage, source, copy/share and
  previous/next. With no proverbs yet, the list shows an honest empty state.
- **Search** `/search`: Pagefind's static index through its JS API (not its UI bundle), type tabs with
  counts (poems, poets, words, proverbs, forms), highlighted excerpts, results in the page's language
  (separate English and Shahmukhi indexes). The header search submits here.
- **Content**: the other seven launch poets and five in-copyright poets (bio and works only), each
  with an EDITORIAL note to check facts against print; seven more forms; title-only stubs for Heer,
  Saif ul Malook and Sassi Punnun (no verses; edition to be chosen). **No proverbs yet**: none are
  added until there is a printed source to take them from.
- **Preview** now serves a production-style build (`npm run preview:build`, with fixtures) so search
  works on the tunnel.

### Fixed
- On `/pa`, every heading had fallen back to body size: the Nastaliq size rule matched every element
  and beat the heading sizes. The bump now applies once to Punjabi inside English pages; `/pa` raises
  its base size instead. English passages on `/pa` keep English type and line spacing.

### Verified
- `npm run build`: 0 errors / 0 warnings / 0 hints; 65 pages; Pagefind indexed 52 (production).
- 64 screenshots (16 pages × light/dark × 1280/360): no horizontal scroll (one search-page overflow fixed).
- 17 browser checks: era/name filters (English and Shahmukhi), URL-driven poem filters, empty state,
  search (English and Shahmukhi queries, type tabs, clean links), header search → results, `/pa`
  search, proverb copy. No page errors.

### Left / open
- Proverbs and all poem texts need printed sources from you.
- All new poet bios, dates and book titles are drafted from general knowledge and flagged for checking.

## Phase 2: poem and poet pages, Shahmukhi-only redesign (2026-11-11)

### Scope change (owner decision)
- **Shahmukhi only.** The Gurmukhi/Roman script switch is gone. Content, UI strings and schemas now
  hold Punjabi once, in Shahmukhi; the schema rejects Punjabi fields with no Arabic-script letters.
  `gurmukhi_status`, the Gurmukhi font and the Shahmukhi→Gurmukhi draft script (written, tested, then
  dropped) are removed. Romanisation stays only as a dictionary pronunciation aid.
- **New navbar** as approved in the wireframes: one slim bar — wordmark, links, Contribute, search
  icon, EN | پنجابی toggle. Search opens in the bar (Escape closes); without JS the icon links to
  `/search`. Phones get search + a `<details>` menu that works without JS. `/pa` mirrors right-to-left.
- **Wireframes v2:** 19 Excalidraw screens in `docs/wireframes/` (approved).

### Built
- **Poem reader** `/poems/{slug}` and `/pa/poems/{slug}`: form label → `/forms/{slug}`, title, poet
  and dates, numbered stanzas with refrain marker, optional English under each verse, translator
  credit, editorial notes (Markdown body), source and verification note, About the poet, More from
  this poet. Poems with no text yet show "Text not yet entered" and a Contribute link.
- **Tap-a-word meanings:** glossed words are wrapped at build time (vowel marks and punctuation
  ignored; inflected spellings via `match`). Card under the word on wide screens, bottom sheet on
  phones. Keyboard: one Tab stop, arrow keys in reading order (Left = next), Home/End, Enter, Escape.
- **Reading tools:** A−/A+ (7 steps, remembered as `pn-size`, applied before paint), Copy (title,
  verses, poet, link), Print, Share (Web Share API, falls back to copying the link).
- **Poet page** `/poets/{slug}`: portrait or letter tile with an honest caption, era/style tags,
  English and Shahmukhi names, dates and region, one-line bio, long bio, poems (with "Text pending"
  badges), works, biography sources. In-copyright poets show a notice instead of poems, and the build
  **fails** if an in-copyright poet has any poem file (verified with a throwaway test file).
- **Content:** Bulleh Shah (bio drafted from general reference; check against Lajwanti Rama Krishna,
  *Panjabi Sufi Poets* (1938) before launch), the Kafi form (short description; full page in phase 3),
  two kafis with titles only: verses empty, "Text needed from printed source", source edition not chosen.
- **Layout fixtures** (`src/content/_fixtures`): placeholder lines that say they are placeholders,
  loaded only when `PN_FIXTURES=1` (the preview server). Production builds exclude them.
- **404** redesigned to the sketch.

### Verified
- `npm run build`: astro check 0 errors / 0 warnings / 0 hints; 9 pages; Pagefind indexed 9 pages.
- 32 screenshots (8 pages × light/dark × 1280/360): no horizontal scroll at 360 px; `lang`/`dir`
  correct (en/ltr, pnb/rtl); no console errors.
- 26 scripted browser checks pass: meanings (click, Enter, arrows, Escape, focus return, click-outside,
  poem-specific gloss first, bottom sheet on phones), A+ enlarges and persists across reload, verse text
  (32 px) larger than the title (26 px), Copy content, search open/close in the bar, phone menu, skip link
  first in Tab order.
- JS: at most 4.5 KB inline per page (poem page); 0.8 KB elsewhere.

### Left / open
- Real poem text: needs your chosen printed edition(s).
- Print-on-one-page can only be checked once real poems exist (phase 5).
- Punjabi UI strings still need a native speaker's review.
- `/search`, `/forms/*`, `/dictionary/*`, list pages, About: later phases (404 for now).

## Phase 1: foundation (2026-11-11)

> Superseded in part by Phase 2: the script switch and Gurmukhi/Roman storage described below were removed.

### Reference study
- pushto.net could not be read: every reference URL returns **HTTP 402 `DEPLOYMENT_DISABLED`** (Vercel),
  and the Wayback Machine holds only old domain-parking pages. `PARITY.md` is built from the brief and
  marks each item *unverified*. Rerun Step 0 when the site is back.

### Built
- **Scaffold:** Astro 7.4 (static, `build.format: file`, no trailing slash), TypeScript strict,
  `@astrojs/check`, `@astrojs/sitemap` with en/pnb alternates, Pagefind installed (indexing comes in phase 3).
- **Schemas** (`src/content.config.ts`, Zod 4): poets, poems, forms, dictionary, proverbs.
  - Every Punjabi text is stored three times (`sm`/`gm`/`ro`). Nothing is converted at runtime.
  - Historic dates validated: `1542`, `c. 1173`, `1757?`, `12th century`, `late 16th century`.
  - Poems: the three scripts must have equal line counts; empty `verses` only allowed when
    `verification_note` is "Text needed from printed source"; English translations require a named translator.
  - A portrait requires a caption; `portrait_authentic` defaults to false.
  - Glossary items are dictionary references, optionally with inflected spellings (`match`) and a poem-specific `gloss`.
  - Dialect tags are limited to Majhi, Doabi, Malwai, Pothohari.
  - Tested with throwaway fixtures: valid data passes, and the rules above reject bad data with readable messages.
- **Fonts:** self-hosted and subset by `npm run fonts` (HarfBuzz via `subset-font`), split by `unicode-range`:
  Nastaliq 149 KB core (regular weight only), Gurmukhi 30 KB, Source Serif 4 57 KB, Inter 45 KB (+ ext files
  for diacritics/IPA, loaded only when used). All SIL OFL 1.1.
- **Layout:** header (wordmark, nav, EN/پنجابی switch, search form, script switch), footer (couplet slot,
  Instagram slot hidden until set, non-commercial note), skip link, focus rings, light/dark via OS
  preference, base print styles, canonical + hreflang + OG meta.
- **Script switch:** Shahmukhi (default) / Gurmukhi / Roman. Applied before first paint from localStorage
  `pn-script`; on `/pa` it also switches `lang` and `dir` (pnb/RTL ↔ pa/LTR ↔ pa-Latn/LTR) and swaps
  translated attributes (placeholders, aria-labels). Hidden without JS (Shahmukhi shows).
- **i18n:** English at `/`, Punjabi at `/pa`. UI strings are stored per script in `src/i18n/ui.ts`.
- **Pages:** home (thesis, intro, two buttons), `/pa` mirror, 404.
- **Wireframes:** `docs/wireframes/punjabi-net-wireframes.excalidraw` (10 frames, opens in excalidraw.com)
  + PNG previews.

### Verified
- `astro check`: 0 errors, 0 warnings, 0 hints. `astro build` passes.
- 24 screenshots (home + /pa × light/dark × sm/gm/ro × 1280/360 px): no horizontal overflow at 360 px,
  correct `lang`/`dir` in every combination.
- Switch persists across reloads, and the first Tab focuses the skip link.
- JS shipped: ~2 KB, all inline (head snippet + switch module). Contrast (WCAG): body 14.5:1, muted 6.0:1,
  accent 5.4:1 (light); 14.3 / 6.5 / 8.3 (dark).

### Left / open
- Nav links to /poets, /poems, /dictionary, /proverbs, /forms, /about and /search are 404 until their phases.
- **Punjabi UI strings need native-speaker review** (Shahmukhi, Gurmukhi and Roman), especially the
  dictionary and forms labels, which differ by script community (لغت / ਸ਼ਬਦਕੋਸ਼, صنفاں / ਕਾਵਿ-ਰੂਪ).
- Site name `punjabi.net` is a working name (`src/site.config.ts`, `astro.config.mjs`).
- Instagram handle not set. Default OG image (`/og/default.png`) comes in phase 5.
- No theme toggle (deliberate, see PARITY.md).
