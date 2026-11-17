<img src="assets/icon.svg" width="64" height="64" alt="">

# punjabii.net

A non-commercial archive of Punjabi poetry, poets, proverbs and vocabulary, in Shahmukhi.
Modelled on pushto.net. Static Astro site, content in Markdown/JSON,
Git history as the editorial record.

```sh
npm install
npm run dev        # http://localhost:4321
npm run build      # astro check + build + Pagefind index
npm run fonts      # re-subset the self-hosted fonts (and OG image fonts)
npm test           # contribution Function tests
PN_FIXTURES=1 npm run dev   # also load src/content/_fixtures (layout placeholders, never built)
```

- `DEPLOY.md`: Cloudflare Pages setup, contribution form storage
- `PARITY.md`: pushto.net feature parity checklist
- `CHANGELOG.md`: what each phase built and what is left
- `src/content.config.ts`: content schemas
- `docs/wireframes/`: Excalidraw sketches of every screen
