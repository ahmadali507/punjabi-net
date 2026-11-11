# Changelog

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
