// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// The production domain. Canonical URLs, hreflang, the sitemap, robots.txt, llms.txt, OG images and JSON-LD all follow it.
export default defineConfig({
  site: 'https://punjabii.net',
  output: 'static',
  // The preview server builds into dist-preview (with layout fixtures); production uses dist.
  outDir: process.env.PN_OUT || './dist',
  trailingSlash: 'never',
  // Inline CSS: the stylesheets are small, and this removes render-blocking requests.
  build: { format: 'file', inlineStylesheets: 'always' },
  i18n: {
    locales: ['en', 'pa'],
    defaultLocale: 'en',
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'en', locales: { en: 'en', pa: 'pnb' } },
      // Only pages meant to rank: not search results, the 404 page or the form's thank-you/error pages (all noindex).
      filter: (page) => !/\/(search|404|contribute\/(thanks|error))$/.test(new URL(page).pathname),
      // One sitemap per section (sitemap-poets-0.xml, …), so Search Console reports indexing per section.
      // Pages in no section (home, lists, about, forms) go to sitemap-pages-0.xml.
      chunks: Object.fromEntries(['poets', 'works', 'poems', 'dictionary', 'proverbs'].map((s) => [s,
        (item) => (new RegExp(`^/(pa/)?${s}/`).test(new URL(item.url).pathname) ? item : undefined)])),
    }),
  ],
  devToolbar: { enabled: false },
  // Lets the dev/preview server answer through a Cloudflare quick tunnel (preview only).
  vite: {
    server: { allowedHosts: ['.trycloudflare.com'] },
    preview: { allowedHosts: ['.trycloudflare.com'] },
  },
});
