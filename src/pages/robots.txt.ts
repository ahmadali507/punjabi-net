/**
 * /robots.txt, built from the site URL so it follows a domain change.
 * Everything is open to search engines and AI assistants: the archive exists to be found, read and cited.
 * Content-Signal (contentsignals.org) states the same for AI use: search, answers (ai-input) and training.
 */
import type { APIRoute } from 'astro';

// AI search and answer crawlers, named so that a host-level default block on them is easy to spot.
const AI_AGENTS = [
  'OAI-SearchBot', 'ChatGPT-User', 'GPTBot',
  'ClaudeBot', 'Claude-SearchBot', 'Claude-User',
  'PerplexityBot', 'Perplexity-User',
  'Google-Extended', 'Applebot', 'Applebot-Extended', 'Bingbot',
  'DuckAssistBot', 'MistralAI-User', 'CCBot',
];
const PRIVATE = ['/api/', '/meanings/', '/contribute/thanks', '/contribute/error', '/pa/contribute/thanks', '/pa/contribute/error'];

export const GET: APIRoute = ({ site }) => {
  const url = (p: string) => new URL(p, site).href;
  const body = [
    `# ${site!.host}: a non-commercial archive of Punjabi poetry in Shahmukhi.`,
    '# Search engines and AI assistants are welcome to read, index and cite every page.',
    `# A guide for language models: ${url('/llms.txt')}`,
    '',
    'User-agent: *',
    'Content-Signal: search=yes, ai-input=yes, ai-train=yes',
    'Allow: /',
    ...PRIVATE.map((p) => `Disallow: ${p}`),
    '',
    ...AI_AGENTS.map((a) => `User-agent: ${a}`),
    'Allow: /',
    ...PRIVATE.map((p) => `Disallow: ${p}`),
    '',
    `Sitemap: ${url('/sitemap-index.xml')}`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
