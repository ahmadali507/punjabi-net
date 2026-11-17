/**
 * Word meanings for a whole work (/works/{slug}), fetched by the reader on the first
 * hover or tap so the long pages stay light. One file per work and language.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { localePath, t } from '~/i18n';
import type { UIKey } from '~/i18n/ui';
import { POS } from '~/content.config';
import { getWorks, normalise, poemsOfWork, type Work } from '~/lib/content';
import { meaningsFor } from '~/lib/meanings';

export const getStaticPaths = (async () => {
  const works = await getWorks();
  return (['en', 'pa'] as const).flatMap((lang) => works.map((work) => ({ params: { lang, slug: work.id }, props: { work, lang } })));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { work, lang } = props as { work: Work; lang: 'en' | 'pa' };
  const parts = await poemsOfWork(work.id);
  const lines = parts.flatMap((p) => p.data.verses.flatMap((v) => v.text.split('\n')));
  const { items, lookup } = await meaningsFor(lines, lang, (id) => localePath(lang, `/dictionary/${id}`), normalise);
  const pos = Object.fromEntries([...POS.map((p) => [p, t(lang, `pos.${p}` as UIKey)]), ['proper noun', t(lang, 'pos.proper')]]);
  return new Response(JSON.stringify({ items, keys: Object.fromEntries(lookup), pos, base: t(lang, 'gloss.base'), guess: t(lang, 'gloss.guess') }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
