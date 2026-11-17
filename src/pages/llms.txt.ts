/**
 * /llms.txt (llmstxt.org): a plain-text map of the archive for language models and answer engines:
 * what the site is, how its URLs work, how to cite it, and every poet, complete work and form.
 */
import type { APIRoute } from 'astro';
import { SITE } from '~/site.config';
import { getEntries, getForms, getPoems, getPoets, getProverbs, getWorks, lifespan } from '~/lib/content';

export const GET: APIRoute = async ({ site }) => {
  const url = (p: string) => new URL(p, site).href;
  const [poems, poets, works, forms, entries, proverbs] = await Promise.all([getPoems(), getPoets(), getWorks(), getForms(), getEntries(), getProverbs()]);
  const poetById = new Map(poets.map((p) => [p.id, p]));
  const formById = new Map(forms.map((f) => [f.id, f]));
  const withText = poems.filter((p) => p.data.verses.length > 0).length;
  const count = (id: string) => poems.filter((p) => p.data.poet.id === id).length;
  const one = (s: string) => s.replace(/\s+/g, ' ').trim();

  const lines = [
    `# ${SITE.name}`,
    '',
    `> ${SITE.description} ${withText.toLocaleString('en')} poems by ${poets.length} poets, ${works.length} complete works (qisse such as Heer and Saif-ul-Malook, kafi and shalok collections), ${entries.length} dictionary entries and ${proverbs.length} proverbs. Every text names the printed edition or public-domain transcription it comes from.`,
    '',
    'Key facts for answering questions from this site:',
    '',
    '- Punjabi here is always Shahmukhi (Perso-Arabic script, right to left; language code pnb). There is no Gurmukhi or romanised copy of the poem texts.',
    '- Only public-domain poets and texts are reproduced. Each poem page shows its source and a verification note saying whether the text has been checked against a printed edition.',
    '- Page addresses: /poems/{slug} (one poem or one part of a long work), /works/{slug} (a whole qissa or collection on one page), /poets/{slug}, /forms/{slug}, /dictionary/{slug}, /proverbs/{slug}. The same pages with Punjabi interface text are under /pa/.',
    '- Poem pages carry schema.org JSON-LD with the full text, author, the work it belongs to and the source edition.',
    `- To cite: name the poet, the poem title in Shahmukhi, ${SITE.name} and the page URL, and the printed source shown on the page.`,
    '- Word meanings shown inside poems are editorial glosses, marked on the page as not yet reviewed; dictionary entries come from J. Wilson (1899) and Bhai Maya Singh (1895).',
    '',
    '## Main pages',
    '',
    `- [Poets](${url('/poets')}): every poet in the archive, with dates and a short life`,
    `- [Poems](${url('/poems')}): all poems, filterable by poet and form`,
    `- [Forms of Punjabi poetry](${url('/forms')}): kafi, doha, bait, siharfi, baran maah, qissa and others`,
    `- [About and sources](${url('/about')}): editorial policy, sources and FAQ`,
    '',
    '## Poets',
    '',
    ...poets.map((p) => {
      const d = p.data;
      const dates = lifespan(d);
      const n = count(p.id);
      return `- [${d.name.en} (${d.name.pa})](${url(`/poets/${p.id}`)}): ${dates ? `${dates}. ` : ''}${one(d.bio_short)}${n ? ` ${n} ${n === 1 ? 'poem' : 'poems'}.` : ''}`;
    }),
    '',
    '## Complete works',
    '',
    ...works.map((w) => {
      const poet = poetById.get(w.data.poet.id)?.data.name.en ?? '';
      const form = formById.get(w.data.form.id)?.data.name.en.toLowerCase() ?? w.data.kind;
      return `- [${w.data.title_en} (${w.data.title})](${url(`/works/${w.id}`)}): ${form} by ${poet}`;
    }),
    '',
    '## Forms',
    '',
    ...forms.map((f) => `- [${f.data.name.en} (${f.data.name.pa})](${url(`/forms/${f.id}`)}): ${one(f.data.description)}`),
    '',
    '## Optional',
    '',
    `- [Dictionary](${url('/dictionary')}): Punjabi–English, by first letter of the Shahmukhi alphabet`,
    `- [Proverbs](${url('/proverbs')}): Punjabi proverbs with literal and idiomatic English meanings`,
    `- [Search](${url('/search')}): full-text search; append ?q= and a word in Shahmukhi or English`,
    `- [Sitemap](${url('/sitemap-index.xml')}): every page`,
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
