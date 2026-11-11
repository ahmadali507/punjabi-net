# Changelog

## Phase 1: foundation (2026-11-11)

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
