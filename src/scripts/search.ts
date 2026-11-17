/**
 * Search page, using Pagefind's JS API (no Pagefind UI bundle, to keep the JS small).
 * pagefind.js and its index are generated at build time into /pagefind/.
 *
 * One index serves both languages: only the English pages are indexed (the /pa pages hold the same
 * texts), and /pa search turns each result into its /pa page with the Shahmukhi title (meta "pa").
 * A whole work is indexed as one page; a match inside it links to the part it is in (#p-N).
 */
interface Anchor { element: string; id: string; location: number }
interface PagefindResult {
  data: () => Promise<{ url: string; excerpt: string; content?: string; meta: { title?: string; pa?: string }; filters: Record<string, string[]>; anchors?: Anchor[]; locations?: number[] }>;
}
interface PagefindSearch { results: PagefindResult[]; filters: Record<string, Record<string, number>>; unfilteredResultCount: number }
interface Pagefind {
  options: (o: Record<string, unknown>) => Promise<void>;
  filters: () => Promise<Record<string, Record<string, number>>>;
  search: (q: string, o?: { filters?: Record<string, string> }) => Promise<PagefindSearch | null>;
}

const PAGE = 20;
const TYPES = ['all', 'poem', 'poet', 'word', 'proverb', 'form'];

/**
 * In a whole work (one indexed page), the part (<section id="p-N">) most likely to hold the searched
 * line: most different search words first, then two different words side by side, then most matches.
 * Pagefind gives match positions as word indexes into the page text, which tells which word is where.
 */
function bestPart(d: { content?: string; anchors?: Anchor[]; locations?: number[] }, query: string): Anchor | undefined {
  const parts = (d.anchors ?? []).filter((x) => /^p-\d+$/.test(x.id)).sort((x, y) => x.location - y.location);
  if (!parts.length || !d.locations?.length) return undefined;
  const words = (d.content ?? '').split(/\s+/);
  const bare = (w: string) => w.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
  const terms = query.split(/\s+/).map(bare).filter(Boolean);
  // Which search word a matched word belongs to (Pagefind also matches longer forms: جھوٹھ → جھوٹھا).
  const word = (loc: number) => {
    const w = bare(words[loc] ?? '');
    return terms.find((t) => w.startsWith(t) || t.startsWith(w)) ?? w;
  };
  const score = new Map<Anchor, { terms: Set<string>; pairs: number; hits: number }>();
  const locs = [...d.locations].sort((x, y) => x - y);
  locs.forEach((loc, i) => {
    const at = parts.filter((x) => x.location <= loc).at(-1);
    if (!at) return;
    const s = score.get(at) ?? { terms: new Set<string>(), pairs: 0, hits: 0 };
    s.terms.add(word(loc));
    s.hits++;
    if (i > 0 && loc - locs[i - 1] === 1 && word(loc) !== word(locs[i - 1])) s.pairs++;
    score.set(at, s);
  });
  return [...score].sort(([a, x], [b, y]) => y.terms.size - x.terms.size || y.pairs - x.pairs || y.hits - x.hits || a.location - b.location)[0]?.[0];
}

export async function initSearch() {
  const root = document.querySelector<HTMLElement>('[data-search]');
  if (!root) return;
  const labels: Record<string, string> = JSON.parse(root.dataset.labels ?? '{}');
  const input = root.querySelector<HTMLInputElement>('#search-q')!;
  const form = root.querySelector('form')!;
  const tabs = root.querySelector<HTMLElement>('[data-search-tabs]')!;
  const status = root.querySelector<HTMLElement>('[data-search-status]')!;
  const list = root.querySelector<HTMLOListElement>('[data-search-results]')!;
  const heading = root.querySelector<HTMLElement>('[data-search-heading]')!;
  const params = new URLSearchParams(location.search);
  let type = params.get('type') ?? 'all';
  input.value = params.get('q') ?? '';

  let pf: Pagefind | undefined;
  const load = async () => {
    if (pf) return pf;
    const path = '/pagefind/pagefind.js';
    pf = (await import(/* @vite-ignore */ path)) as Pagefind;
    await pf.options({ excerptLength: 24 });
    await pf.filters(); // loads filter counts so results report them
    return pf;
  };

  let seq = 0;
  const run = async () => {
    const q = input.value.trim();
    const url = new URL(location.href);
    q ? url.searchParams.set('q', q) : url.searchParams.delete('q');
    type !== 'all' ? url.searchParams.set('type', type) : url.searchParams.delete('type');
    history.replaceState(null, '', url);
    list.replaceChildren();
    tabs.hidden = true;
    if (!q) return;
    heading.textContent = (root.dataset.resultsFor ?? '{q}').replace('{q}', q);

    const mine = ++seq;
    let pagefind: Pagefind;
    try { pagefind = await load(); } catch { status.textContent = 'Search index not available.'; return; }
    const all = await pagefind.search(q);
    const res = type === 'all' ? all : await pagefind.search(q, { filters: { type } });
    if (mine !== seq || !all || !res) return;

    const counts = all.filters.type ?? {};
    tabs.replaceChildren(
      ...TYPES.filter((k) => k === 'all' || counts[k]).map((k) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'chip';
        b.setAttribute('aria-pressed', String(k === type));
        b.textContent = `${labels[k] ?? k} ${num(k === 'all' ? all.results.length : counts[k])}`;
        b.addEventListener('click', () => { type = k; run(); });
        return b;
      }),
    );
    tabs.hidden = all.results.length === 0;
    status.textContent = res.results.length ? '' : (root.dataset.none ?? '');

    const items = await Promise.all(res.results.slice(0, PAGE).map((r) => r.data()));
    if (mine !== seq) return;
    list.replaceChildren(
      ...items.map((d) => {
        const li = document.createElement('li');
        li.className = 'result';
        const head = document.createElement('div');
        head.className = 'result__head';
        const kind = d.filters.type?.[0];
        if (kind) {
          const tag = document.createElement('span');
          tag.className = kind === 'poem' ? 'tag tag--accent' : 'tag';
          tag.textContent = labels[kind] ?? kind;
          head.append(tag);
        }
        const a = document.createElement('a');
        a.className = 'result__title';
        const path = d.url.replace(/\.html$/, '').replace(/\/index$/, '') || '/';
        const pa = root.dataset.locale === 'pa';
        const part = bestPart(d, q);
        a.href = `${pa ? (path === '/' ? '/pa' : `/pa${path}`) : path}${part ? `#${part.id}` : ''}`;
        a.textContent = `${(pa ? d.meta.pa : undefined) ?? d.meta.title ?? d.url}${part ? ` · ${num(+part.id.slice(2))}` : ''}`;
        head.append(a);
        const p = document.createElement('p');
        p.className = 'result__excerpt';
        p.innerHTML = d.excerpt; // Pagefind escapes page text and adds only <mark>
        li.append(head, p);
        return li;
      }),
    );
  };

  const num = (n: number) => (root.dataset.locale === 'pa' ? String(n).replace(/\d/g, (x) => '۰۱۲۳۴۵۶۷۸۹'[+x]) : String(n));
  form.addEventListener('submit', (e) => { e.preventDefault(); run(); });
  let timer: number | undefined;
  input.addEventListener('input', () => { clearTimeout(timer); timer = window.setTimeout(run, 250); });
  run();
}
