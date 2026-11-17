/** Web app manifest: name, colours and icons for "Add to home screen" and browser UI. */
import type { APIRoute } from 'astro';
import { SITE } from '~/site.config';

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      name: `${SITE.name}: ${SITE.tagline}`,
      short_name: SITE.name,
      description: SITE.description,
      lang: 'en',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#f6f3ec',
      theme_color: '#f6f3ec',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
      ],
    }, null, 2),
    { headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' } },
  );
