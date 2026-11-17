# Launch checklist

Everything needed to put the site live on its own domain, in order. Items marked **[done]** are
already in the code. The rest happen in the Cloudflare dashboard, the registrar or the search
consoles, and need the owner. DEPLOY.md has the Pages setup itself.

The production domain is set in one place: `site` in `astro.config.mjs` (now `https://punjabi.net`).
Canonical URLs, hreflang, the sitemap, robots.txt, llms.txt, OG images and JSON-LD all follow it.

## 0. Blockers: fix before the first deploy

- [ ] **File count.** The build is about 36,000 files (1.5 GB). Cloudflare Pages allows 20,000 files on
      the Free plan and 100,000 on paid plans
      ([limits](https://developers.cloudflare.com/pages/platform/limits/)). Either
      - move to a paid plan and set the Pages environment variable `PAGES_WRANGLER_MAJOR_VERSION=4`
        (needed for the higher limit), or
      - cut files: the per-poem OG images (about 7,000) could fall back to the work's image for poems
        that belong to a work, and the Pagefind index could cover English pages only. Even then the
        site stays above 20,000, so the paid plan is the practical route.
- [ ] **Confirm the domain** in `astro.config.mjs` is the one that was bought. If it is not
      `punjabi.net`, change `site` there and `name` in `src/site.config.ts`, then rebuild.
- [ ] **Cloudflare AI-crawler settings.** On new zones Cloudflare can block AI crawlers and prepend its
      own "managed robots.txt". Both would cancel the AEO work. In *Security → Bots* (AI Crawl
      Control): allow AI crawlers (at least OAI-SearchBot, ChatGPT-User, Claude-SearchBot,
      Claude-User, PerplexityBot, Google-Extended, Applebot); turn **off** "Block AI bots" and the
      managed robots.txt; leave **Bot Fight Mode off**, because it can challenge verified crawlers.
      Then check `https://<domain>/robots.txt` is exactly the file the site builds.

## 1. Domain, DNS and HTTPS

- [ ] Add the domain to the Pages project (*Custom domains*): the bare domain and `www`.
- [ ] One host only: redirect `www` → bare domain with a 301 (*Rules → Redirect Rules*), keeping the
      path and query.
- [ ] Redirect `<project>.pages.dev` to the domain (Bulk Redirects). Preview deployments already send
      `X-Robots-Tag: noindex` **[done]** (`public/_headers`).
- [ ] SSL/TLS mode *Full (strict)*, *Always Use HTTPS* on, minimum TLS 1.2, TLS 1.3 on.
- [ ] HSTS is sent by the site **[done]** (1 year, includeSubDomains). Add `preload` and submit to
      hstspreload.org only once every subdomain is HTTPS for good.
- [ ] No mail is sent from the domain: publish `TXT @ "v=spf1 -all"` and
      `TXT _dmarc "v=DMARC1; p=reject"` so nobody can send mail as the site.
- [ ] Optional: a `/.well-known/security.txt` once there is a contact address.

## 2. Hosting setup (see DEPLOY.md)

- [ ] Pages project: build `npm run build`, output `dist`, `NODE_VERSION` = 22 or newer.
- [ ] Contribution form storage: bind KV as `CONTRIBUTIONS` (or set `FORMSPREE_ENDPOINT`), then send one
      test message.
- [ ] After the first deploy, open a poem, a work, search, the 404 page and the contribution form on the
      real domain, on a phone as well.

## 3. Crawling and indexing

- [x] **[done]** `robots.txt` built from the site URL (`src/pages/robots.txt.ts`): everything open,
      `/api/` and `/meanings/` (JSON for the word cards) closed, Content-Signal
      `search=yes, ai-input=yes, ai-train=yes`, sitemap linked. The `ai-train=yes` signal is the owner's
      call: change it to `no` if the texts should not be used for model training.
- [x] **[done]** `sitemap-index.xml` with every indexable page (about 14,100 URLs) and en/pnb hreflang
      pairs. Search, the 404 page and the form result pages are left out.
- [x] **[done]** Canonical URL on every page, hreflang `en` / `pnb` / `x-default`, no trailing slashes,
      one URL per page.
- [x] **[done]** `noindex, follow` on search, 404, the form thank-you/error pages, and any poem page whose
      text is not yet entered. Other pages say `index, follow, max-snippet:-1, max-image-preview:large`.
- [x] **[done]** A real 404 page (`404.html`, served by Pages with status 404).
- [ ] **Google Search Console:** add a *Domain* property (DNS TXT record), submit
      `https://<domain>/sitemap-index.xml`, then use URL Inspection on the home page, a poet, a poem
      and a work.
- [ ] **Bing Webmaster Tools:** import from Search Console and submit the sitemap. Bing's index feeds
      ChatGPT search, Copilot and DuckDuckGo, so this matters as much for AEO as for SEO.
- [ ] **IndexNow:** turn on *Crawler Hints* in Cloudflare (*Caching → Configuration*). It tells Bing,
      Yandex and others about changed pages automatically.
- [ ] Two weeks after launch: check *Pages* in Search Console for "Crawled – not indexed" or
      "Duplicate" problems, especially between `/poems/x` and `/pa/poems/x`.

## 4. Structured data and AEO (answer engines)

- [x] **[done]** One JSON-LD `@graph` on every page (`src/lib/seo.ts`): Organization (with the Instagram
      profile in `sameAs`), WebSite with a search action (`/search?q=`), the page with breadcrumbs, and
      the page's subject, all joined by stable `@id`s:
      - poem: CreativeWork with the **full text** (first 6,000 characters), English translation where
        there is one, author, the work it belongs to and its position, source edition, public-domain
        licence;
      - poet: ProfilePage + Person (dates, region, Wikipedia `sameAs` from the bio sources);
      - work: Book with its parts in order;
      - dictionary entry and poetic form: DefinedTerm; proverb: Quotation;
      - about page: FAQPage built from the visible FAQ.
- [x] **[done]** `/llms.txt`: what the site is, how its URLs work, how to cite it, every poet, every
      complete work and every form, with links.
- [x] **[done]** Descriptions that answer the query on their own: poem pages give title, form, poet,
      dates and work; poet pages give names in both scripts, dates, the one-line life and what can be
      read; home and list pages give counts and the best-known poets.
- [ ] Check a sample in Google's [Rich Results Test](https://search.google.com/test/rich-results) and the
      [Schema.org validator](https://validator.schema.org/) on the live domain (home, poet, poem, work,
      about).
- [ ] **Romanised titles (biggest remaining gain).** Most people search for these kalams in Latin
      letters ("bulleya ki jaana main kaun", "ilmon bas karin o yaar"). Only some poems have
      `title_en`. A reviewed romanised title for well-known poems (start with the poets' famous kafis
      and the works) would show in titles, descriptions and JSON-LD and match those searches.
      It needs a person to check each one: do not machine-generate.
- [ ] Ask in ChatGPT, Claude, Perplexity and Google a month after launch: "Who wrote 'Ik nukte vich gal
      mukdi'?", "Text of Bulleh Shah's Ilmon bas karin o yaar in Shahmukhi", and see whether the site
      is cited.

## 5. Social sharing (Open Graph)

- [x] **[done]** A 1200×630 OG image for every poem, poet, work, form, proverb and dictionary entry
      (`/og/...png`), plus a default. Each page sets `og:title`, `og:description`, `og:image` (with type,
      size and alt), `og:locale` with its alternate, and the Twitter/X card tags.
- [ ] Check after launch with the [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/),
      the [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/) and a WhatsApp message to
      yourself (a poem and a poet page).
- [ ] Put the site link in the Instagram bio, and turn on `Full poem: <link>` in reel captions
      (social/instagram/SCHEDULE.md).

## 6. Performance (Core Web Vitals)

- [x] **[done]** Static pages, inlined CSS, subset and preloaded fonts, immutable caching for `/_astro/`
      and `/fonts/`, responsive portraits.
- [ ] **Very large pages.** Ten poem pages are over 2 MB of HTML and the `/poems` index is 2.5 MB. On long
      poems the cause is the word-meaning data inlined as JSON (`#gloss-data`, up to 1.5 MB). Whole-work
      pages already fetch the same data lazily from `/meanings/`. Do the same for poem pages, and split
      `/poems` by poet or by letter. Google only reads part of a very large HTML file, so text near the
      end of these pages may not be indexed.
- [ ] Run [PageSpeed Insights](https://pagespeed.web.dev/) on home, a poem, a long work and a poet, on
      mobile, and aim for LCP < 2.5 s, CLS < 0.1, INP < 200 ms.

## 7. Security and privacy

- [x] **[done]** `public/_headers`: HSTS, Content-Security-Policy (same-origin only; inline scripts and
      WebAssembly for search allowed), X-Frame-Options and frame-ancestors, nosniff, Referrer-Policy,
      Permissions-Policy, Cross-Origin-Opener-Policy.
- [ ] After the first deploy, check [securityheaders.com](https://securityheaders.com) and the browser
      console on a poem page, search and the contribution form: nothing should be blocked by the CSP.
- [ ] Analytics: the about page promises no tracking. Use Cloudflare's server-side analytics (zone
      *Analytics*), which adds no script. Cloudflare *Web Analytics* adds a beacon script, which the CSP
      blocks and the promise rules out.

## 8. App icons and browser UI

- [x] **[done]** Favicons (SVG + 32 px PNG), Apple touch icon, `site.webmanifest` with 192/512 icons and a
      maskable icon (`node scripts/icons.mjs` remakes them from `public/favicon.svg`), and `theme-color`
      for light and dark.

## 9. After launch, ongoing

- [ ] Each new batch of poems: rebuild and deploy. The sitemap and llms.txt update themselves, and
      Crawler Hints notifies search engines.
- [ ] Monthly: Search Console coverage and Core Web Vitals reports, Bing Webmaster reports, and
      broken-link checks.
- [ ] Keep one URL per thing forever. If a slug ever changes, add a 301 in `public/_redirects`.
