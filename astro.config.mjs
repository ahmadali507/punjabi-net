// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Working name: punjabi.net. The final domain is not chosen yet; change `site` when it is.
export default defineConfig({
  site: 'https://punjabi.net',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  i18n: {
    locales: ['en', 'pa'],
    defaultLocale: 'en',
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'en', locales: { en: 'en', pa: 'pnb' } },
    }),
  ],
  devToolbar: { enabled: false },
  // Lets the dev server answer through a Cloudflare quick tunnel (preview only).
  vite: { server: { allowedHosts: ['.trycloudflare.com'] } },
});
