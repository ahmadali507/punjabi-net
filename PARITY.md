# PARITY.md — pushto.net feature parity

Reference: https://www.pushto.net (source of truth for structure, features, tone, minimalism).

> **Status of the reference study (2026-11-11).** Every reference URL
> (`/`, `/poets`, `/poems`, `/poems/kar-da-gulo-kra`, `/proverbs`, `/dictionary`, `/about`, `/ps`)
> on both `www.pushto.net` and `pushto.net` returned **HTTP 402 `DEPLOYMENT_DISABLED`** (Vercel).
> The Wayback Machine has no capture of the current site, only older "domain for sale" parking pages.
> So this list is built from the feature brief, **not** from a first-hand reading of the site.
> Items marked **(unverified)** must be checked against the live site when it is back up. Rerun
> Step 0 then and add anything missing. Nothing below has been confirmed on pushto.net itself.

Legend — Phase: the build phase that delivers it · Status: ☐ todo · ◐ partial · ☑ done · ✗ deliberate gap

## 1. Global chrome (every page)

| # | Feature | Source | Phase | Status |
|---|---------|--------|-------|--------|
| G1 | Header wordmark linking home | brief | 1 | ☑ |
| G2 | Nav: Poets, Poems, Dictionary, Proverbs, Contribute | brief (unverified) | 1 | ☑ |
| G3 | Nav item: Forms (Punjabi addition, replaces pushto's ghazal/nazm explainers) | brief §3 | 1 | ☑ |
| G4 | Search in header: icon in the slim bar opens a field in place of the links; links to `/search` without JS | brief (unverified) | 2 (bar) / 3 (results) | ☑ |
| G5 | EN / native-language switch (pushto `/ps` ↔ ours `/pa`), keeps the same page | brief | 1 | ☑ |
| G6 | ~~Script switch Shahmukhi · Gurmukhi · Roman~~ — **removed 2026-11-11 by owner decision: Shahmukhi only** | brief §1 | — | ✗ deliberate |
| G6b | Single slim navbar (wordmark · links · Contribute · search · EN/پنجابی); phone menu is a `<details>` (no JS) | owner, 2026-11-11 | 2 | ☑ |
| G7 | Footer closing couplet | brief | 1 (slot) / 3 (content) | ◐ (home only, once a verse exists) |
| G8 | Footer Instagram link | brief | 1 (config slot, hidden until set) | ◐ |
| G9 | Skip link, visible focus states | brief design rules | 1 | ☑ |
| G10 | Light + dark theme (follows OS; no toggle, keeping the JS budget) | brief design rules | 1 | ☑ |
| G11 | SEO meta, canonical, hreflang en/pa | brief | 1 (base) / 5 (OG images) | ◐ |
| G12 | Print stylesheet | brief | 1 (base) / 5 (poem on one page) | ◐ |
| G13 | 404 page | inferred (unverified) | 1 | ☑ |

## 2. Home `/` (pushto `/`)

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| H1 | Two-language thesis line (Punjabi + English) | 3 | ☑ |
| H2 | Short intro paragraph | 3 | ☑ |
| H3 | Buttons: "Explore poems", "Meet the poets" | 3 | ☑ |
| H4 | Recommended poets block | 3 | ☑ |
| H5 | Selected poems block (`featured: true`) | 3 | ☑ |
| H6 | Closing couplet in footer | 3 | ◐ (wired: shows when `SITE.footerCouplet` points at a verse that exists; none yet) |
| H7 | Instagram link | 3 | ☐ (needs handle) |

## 3. Poets `/poets` (pushto `/poets`)

| # | Feature / field | Phase | Status |
|---|-----------------|-------|--------|
| P1 | Grid of poet cards | 3 | ☑ |
| P2 | Portrait (or honest placeholder) | 3 | ☑ |
| P3 | Honest caption when no authentic portrait exists (`portrait_authentic: false`) | 2 | ☑ (poet page) |
| P4 | Era tag (classical / modern / contemporary) | 3 | ☑ |
| P5 | Style tags | 3 | ☑ |
| P6 | Native name (Shahmukhi) | 3 | ☑ |
| P7 | English name | 3 | ☑ |
| P8 | Dates, allowing "c." and centuries | 2 | ☑ |
| P9 | One-line bio | 3 | ☑ |
| P10 | Count of poets | 3 | ☑ |
| P11 | Search box filtering poets | 3 | ☑ |
| P12 | Poet page: long bio, poem list, bibliography (in-copyright poets: bio + bibliography only; build fails if they have poems) | 2 | ☑ |

## 4. Poems `/poems` (pushto `/poems`)

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| L1 | List of poems: title, poet, form | 3 | ☑ |
| L2 | Filter or search (unverified) | 3 | ☑ |

## 5. Poem reader `/poems/{slug}` (pushto `/poems/kar-da-gulo-kra`)

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| R1 | Form label (Kafi, Doha…) linking to `/forms/{slug}` | 2 | ☑ |
| R2 | Title | 2 | ☑ |
| R3 | Poet link | 2 | ☑ |
| R4 | Numbered couplets / stanzas | 2 | ☑ |
| R5 | Tap-a-word meanings (popover), full keyboard support | 2 | ☑ |
| R6 | A− / A+ text size (persisted) | 2 | ☑ |
| R7 | Copy (title, verses, poet, link) | 2 | ☑ |
| R8 | Print | 2 | ☑ |
| R9 | Share (Web Share API, fallback copy link) | 2 | ☑ |
| R10 | "About the poet" block | 2 | ☑ |
| R11 | "More from this poet" | 2 | ☑ |
| R12 | Source book with link | 2 | ☑ |
| R13 | Verification note per poem | 2 | ☑ |
| R14 | Poem text is the largest element on the page | 2 | ☑ |
| R15 | Optional English translation under each verse, never replacing it (addition) | 2 | ☑ |
| R16 | ~~`gurmukhi_status: auto` notice~~ — removed with Gurmukhi (Shahmukhi only) | — | ✗ deliberate |
| R17 | Glossed words link to dictionary entries (addition) | 2/4 | ◐ (links in place; entry pages in phase 4) |

## 6. Proverbs `/proverbs` (pushto `/proverbs`)

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| V1 | Numbered list | 3 | ☑ |
| V2 | Original text (Shahmukhi) | 3 | ☑ |
| V3 | English meaning (+ literal translation) | 3 | ☑ |
| V4 | Per-proverb page `/proverbs/{slug}` | 3 | ☑ |
| V5 | Search | 3 | ☑ |
| V6 | Usage note (optional) | 3 | ☑ |

## 7. Dictionary `/dictionary` (pushto `/dictionary`)

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| D1 | Search | 4 | ☐ |
| D2 | Browse by letter `/dictionary/letter/{x}` | 4 | ☐ |
| D3 | Common words list | 4 | ☐ |
| D4 | Entry: headword (Shahmukhi) | 4 | ☐ |
| D5 | Pronunciation: romanized + IPA (romanisation is a pronunciation aid only) | 4 | ☐ |
| D6 | Numbered senses | 4 | ☐ |
| D7 | Forms: plural, feminine, oblique | 4 | ☐ |
| D8 | Phrases | 4 | ☐ |
| D9 | Example sentences | 4 | ☐ |
| D10 | Translations (Urdu, Hindi, English) | 4 | ☐ |
| D11 | Dialect tags: Majhi, Doabi, Malwai, Pothohari (addition) | 4 | ☐ |
| D12 | "Appears in poems" backlinks, two-way with poem glossary (addition) | 4 | ☐ |
| D13 | Source (Maya Singh 1895, page) per entry | 4 | ☐ |

## 8. About `/about` (pushto `/about`)

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| A1 | Mission | 5 | ☐ |
| A2 | Sources policy | 5 | ☐ |
| A3 | FAQ | 5 | ☐ |
| A4 | Contribution form: message, contact, optional website, optional photo ≤ 3.5 MB | 5 | ☐ |
| A5 | Form posts to Cloudflare Pages Function (Formspree as fallback) | 5 | ☐ |

## 9. Native-language UI `/pa` (pushto `/ps`)

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| N1 | Every page mirrored under `/pa/…` with Punjabi UI strings | 1 (chrome) / each phase | ◐ (all pages so far; dictionary and About to come) |
| N2 | `/pa` is Shahmukhi, right-to-left throughout | 1 | ☑ |
| N3 | UI strings in Shahmukhi | 1 | ☑ (needs native review) |

## 10. Punjabi-specific additions (not on pushto.net)

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| X1 | Forms section `/forms/{slug}`: Kafi, Doha, Bait, Siharfi, Baran Maah, Qissa, Boli, Dohra | 3 | ☑ |
| X2 | ~~Shahmukhi→Gurmukhi draft transliterator~~ — dropped with Gurmukhi (written, then removed) | — | ✗ deliberate |
| X3 | All Punjabi stored once, in Shahmukhi; schema rejects non-Arabic-script text | 2 | ☑ |

## Deliberate gaps (so far)

- **Theme toggle.** Light/dark follows `prefers-color-scheme`. A toggle would be a seventh interactive
  feature beyond the allowed list.
- **Anything on pushto.net that is not in the brief.** It can't be seen until the site is back up.
- **Gurmukhi and Roman scripts (owner decision, 2026-11-11).** The site is Shahmukhi only: no script
  switch, no Gurmukhi fields, no `gurmukhi_status`, no transliteration script. Romanisation survives
  only as a pronunciation aid in dictionary entries (and optionally proverbs). Consequence: no
  Gurmukhi readership or Gurmukhi search.
- **Print "one page" is a target, not verified** until real poems with text exist (phase 5 checks it).
