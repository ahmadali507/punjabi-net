/**
 * Build-time Open Graph images (1200×630 PNG), one per poem, poet, form,
 * proverb and dictionary entry, plus /og/default.png. Rendered from SVG with
 * resvg. Shahmukhi uses Noto Naskh here (resvg cannot shape Nastaliq reliably).
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { Resvg } from '@resvg/resvg-js';
import { join } from 'node:path';
import { SITE } from '~/site.config';
import { ui } from '~/i18n/ui';
import { getEntries, getForms, getPoems, getPoets, getProverbs, lifespan } from '~/lib/content';

interface Card { kicker: string; pa: string; en?: string; sub?: string }

// Resolved from the project root: at build time this module runs from a bundled chunk.
const font = (f: string) => join(process.cwd(), 'src/assets/og-fonts', f);
const FONTS = ['naskh.ttf', 'serif.ttf', 'sans.ttf'].map(font);

export const getStaticPaths = (async () => {
  const [poems, poets, forms, proverbs, entries] = await Promise.all([getPoems(), getPoets(), getForms(), getProverbs(), getEntries()]);
  const poetById = new Map(poets.map((p) => [p.id, p]));
  const formById = new Map(forms.map((f) => [f.id, f]));
  const cards: { path: string; card: Card }[] = [
    { path: 'default', card: { kicker: 'Punjabi poetry archive', pa: ui['home.thesis'].pa, en: ui['home.thesis'].en } },
    ...poems.map((p) => ({
      path: `poems/${p.id}`,
      card: { kicker: formById.get(p.data.form.id)?.data.name.en ?? 'Poem', pa: p.data.title, en: p.data.title_en, sub: poetById.get(p.data.poet.id)?.data.name.en },
    })),
    ...poets.map((p) => ({ path: `poets/${p.id}`, card: { kicker: 'Poet', pa: p.data.name.pa, en: p.data.name.en, sub: lifespan(p.data) } })),
    ...forms.map((f) => ({ path: `forms/${f.id}`, card: { kicker: 'Form', pa: f.data.name.pa, en: f.data.name.en, sub: f.data.description } })),
    ...proverbs.map((p) => ({ path: `proverbs/${p.id}`, card: { kicker: 'Proverb', pa: p.data.text, en: p.data.literal_en.replace(/\n/g, ' ') } })),
    ...entries.map((e) => ({ path: `dictionary/${e.id}`, card: { kicker: 'Dictionary', pa: e.data.headword, en: e.data.romanized, sub: e.data.senses[0] } })),
  ];
  return cards.map(({ path, card }) => ({ params: { path }, props: { card } }));
}) satisfies GetStaticPaths;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Greedy word wrap by an estimated character width. */
function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const w of text.split(/\s+/)) {
    if ((line + ' ' + w).trim().length > maxChars && line) {
      lines.push(line);
      line = w;
    } else line = (line + ' ' + w).trim();
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…';
  }
  return lines;
}

export function svg(card: Card): string {
  const W = 1200, H = 630, PAD = 80;
  const paSize = card.pa.length > 40 ? 58 : card.pa.length > 22 ? 72 : 96;
  const paLines = wrap(card.pa, Math.floor(1040 / (paSize * 0.5)), 2);
  const enLines = card.en ? wrap(card.en, 44, 2) : [];
  const subLines = card.sub ? wrap(card.sub, 70, 1) : [];
  let y = 200;
  const parts: string[] = [];
  for (const l of paLines) {
    parts.push(`<text x="${W - PAD}" y="${y}" font-family="Noto Naskh Arabic" font-size="${paSize}" text-anchor="end" direction="rtl" fill="#23211d">${esc(l)}</text>`);
    y += paSize * 1.45;
  }
  y += 10;
  for (const l of enLines) {
    parts.push(`<text x="${PAD}" y="${y}" font-family="Source Serif 4" font-weight="600" font-size="46" fill="#23211d">${esc(l)}</text>`);
    y += 58;
  }
  for (const l of subLines) {
    parts.push(`<text x="${PAD}" y="${y + 6}" font-family="Inter" font-size="28" fill="#6b665c">${esc(l)}</text>`);
    y += 40;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#f6f3ec"/>
  <rect width="${W}" height="14" fill="#855c00"/>
  <text x="${PAD}" y="${PAD + 26}" font-family="Inter" font-size="24" letter-spacing="3" fill="#855c00">${esc(card.kicker.toUpperCase())}</text>
  ${parts.join('\n  ')}
  <line x1="${PAD}" y1="${H - 110}" x2="${W - PAD}" y2="${H - 110}" stroke="#d9d3c6" stroke-width="2"/>
  <text x="${PAD}" y="${H - 60}" font-family="Source Serif 4" font-weight="600" font-size="34" fill="#23211d">${esc(SITE.name)}</text>
  <text x="${W - PAD}" y="${H - 60}" font-family="Inter" font-size="24" text-anchor="end" fill="#6b665c">Punjabi poetry in Shahmukhi</text>
</svg>`;
}

export const GET: APIRoute = ({ props }) => {
  const png = new Resvg(svg((props as { card: Card }).card), {
    font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: 'Inter' },
  }).render().asPng();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
