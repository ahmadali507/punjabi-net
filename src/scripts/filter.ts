/**
 * List filtering (poets, poems, proverbs): a text box, chip groups and selects.
 * Without JavaScript the controls stay hidden and the full list shows.
 *
 * Markup:
 *   [data-filter]                       wrapper (controls + list)
 *     [data-filter-controls hidden]     unhidden by this script
 *     input[data-filter-input]          matches item [data-filter-text]
 *     button[data-filter-key][data-filter-value]   chip; value "" = all
 *     select[data-filter-key]           value "" = all
 *     [data-filter-item][data-<key>]    items
 *     [data-filter-group]               hidden when it has no visible items
 *     [data-filter-empty hidden]        shown when nothing matches
 * State is mirrored in the URL (?form=kafi&q=…) so a filtered list can be shared.
 */
export function initFilter() {
  for (const root of document.querySelectorAll<HTMLElement>('[data-filter]')) setup(root);
}

function setup(root: HTMLElement) {
  for (const c of root.querySelectorAll('[data-filter-controls]')) c.removeAttribute('hidden');
  const input = root.querySelector<HTMLInputElement>('[data-filter-input]');
  const chips = [...root.querySelectorAll<HTMLButtonElement>('button[data-filter-key]')];
  const selects = [...root.querySelectorAll<HTMLSelectElement>('select[data-filter-key]')];
  const items = [...root.querySelectorAll<HTMLElement>('[data-filter-item]')];
  const groups = [...root.querySelectorAll<HTMLElement>('[data-filter-group]')];
  const empty = root.querySelector<HTMLElement>('[data-filter-empty]');
  const state: Record<string, string> = {};

  const keys = new Set([...chips.map((c) => c.dataset.filterKey!), ...selects.map((s) => s.dataset.filterKey!)]);
  const params = new URLSearchParams(location.search);
  for (const k of keys) state[k] = params.get(k) ?? '';
  if (input) input.value = params.get('q') ?? '';

  const apply = () => {
    const q = (input?.value ?? '').trim().toLowerCase();
    let shown = 0;
    for (const it of items) {
      const ok =
        [...keys].every((k) => !state[k] || it.dataset[k] === state[k]) &&
        (!q || (it.dataset.filterText ?? it.textContent ?? '').toLowerCase().includes(q));
      it.hidden = !ok;
      if (ok) shown++;
    }
    for (const g of groups) g.hidden = !g.querySelector('[data-filter-item]:not([hidden])');
    if (empty) empty.hidden = shown > 0;
    for (const c of chips) c.setAttribute('aria-pressed', String((state[c.dataset.filterKey!] ?? '') === (c.dataset.filterValue ?? '')));
    for (const s of selects) s.value = state[s.dataset.filterKey!] ?? '';

    const url = new URL(location.href);
    for (const k of keys) state[k] ? url.searchParams.set(k, state[k]) : url.searchParams.delete(k);
    q ? url.searchParams.set('q', q) : url.searchParams.delete('q');
    history.replaceState(null, '', url);
  };

  for (const c of chips) c.addEventListener('click', () => { state[c.dataset.filterKey!] = c.dataset.filterValue ?? ''; apply(); });
  for (const s of selects) s.addEventListener('change', () => { state[s.dataset.filterKey!] = s.value; apply(); });
  input?.addEventListener('input', apply);
  apply();
}
