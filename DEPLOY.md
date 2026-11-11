# Deploying to Cloudflare Pages

1. **Create the Pages project** (Cloudflare dashboard → Workers & Pages → Create → Pages → connect the
   GitHub repo `punjabi-net`).
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variable: `NODE_VERSION` = `22` (or newer)
   - The `functions/` folder is picked up automatically: `functions/api/contribute.ts` serves
     `POST /api/contribute`.

2. **Give the contribution form somewhere to put messages.** Pick one:
   - **Workers KV (recommended, no third party):** create a KV namespace (e.g. `punjabi-contributions`)
     and bind it to the Pages project as `CONTRIBUTIONS` (Settings → Bindings). Messages are stored
     under `msg/<time>/<id>`. Photos go to the same namespace under `photo/…`, or to R2 if you also
     bind an R2 bucket as `CONTRIBUTION_FILES`. Read them in the dashboard (KV → View) or with
     `npx wrangler kv key list --binding CONTRIBUTIONS`.
   - **Formspree (fallback):** create a Formspree form and set the environment variable
     `FORMSPREE_ENDPOINT` = `https://formspree.io/f/<id>`. Used only when `CONTRIBUTIONS` is not bound.
     (Formspree's free plan drops file uploads.)
   - Or skip the Function entirely: set `contributeAction` in `src/site.config.ts` to the Formspree URL.

   With neither configured, the form shows an error page that says so.

3. **Domain.** The working name is `punjabi.net`. When the final name is chosen, change `site` in
   `astro.config.mjs` and `name` in `src/site.config.ts` (canonical URLs, sitemap, OG images and
   JSON-LD all follow).

`public/_headers` sets long-lived caching for fonts and hashed assets, and basic security headers.

## Local checks

```sh
npm run build          # astro check + build + Pagefind (production: no layout fixtures)
npm test               # contribution Function tests (node --test)
npm run preview:build  # build with layout fixtures into dist-preview (what the preview tunnel serves)
```
