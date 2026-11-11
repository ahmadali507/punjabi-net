/**
 * Search page, using Pagefind's JS API (no Pagefind UI bundle, to keep the JS small).
 * pagefind.js and its index are generated at build time into /pagefind/.
 */
interface PagefindResult { data: () => Promise<{ url: string; excerpt: string; meta: { title?: string }; filters: Record<string, string[]> }> }
interface PagefindSearch { results: PagefindResult[]; filters: Record<string, Record<string, number>>; unfilteredResultCount: number }
interface Pagefind {
  options: (o: Record<string, unknown>) => Promise<void>;
  filters: () => Promise<Record<string, Record<string, number>>>;
  search: (q: string, o?: { filters?: Record<string, string> }) => Promise<PagefindSearch | null>;
}

const PAGE = 20;
const TYPES = ['all', 'poem', 'poet', 'word', 'proverb', 'form'];

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
        a.href = d.url.replace(/\.html$/, '');
        a.textContent = d.meta.title ?? d.url;
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
