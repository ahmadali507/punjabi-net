/**
 * Tap-a-word meanings. Glossed words are <button class="w" data-g="i"> elements
 * wrapped at build time; meanings come from #gloss-data.
 *
 * Keyboard: Tab reaches the first word (roving tabindex), arrow keys move
 * between words in reading order (Left = next, since the text is right-to-left),
 * Home/End jump, Enter or Space opens, Escape closes. Focus stays on the word,
 * so moving with the arrows updates an open panel.
 */
interface Gloss {
  hw: string;
  romanized: string;
  ipa?: string;
  pos: string;
  gender?: string;
  senses: string[];
  href: string;
}

export function initGlossary() {
  const panel = document.querySelector<HTMLElement>('[data-gloss]');
  const json = document.getElementById('gloss-data');
  const verses = document.querySelector<HTMLElement>('[data-verses]');
  if (!panel || !json || !verses) return;
  const data: Gloss[] = JSON.parse(json.textContent || '[]');
  const words = [...verses.querySelectorAll<HTMLButtonElement>('.w')];
  if (words[0]) words[0].tabIndex = 0;
  let open: HTMLButtonElement | null = null;

  const show = (btn: HTMLButtonElement) => {
    const g = data[Number(btn.dataset.g)];
    if (!g) return;
    panel.querySelector('[data-hw]')!.textContent = g.hw;
    const pron = [g.romanized, g.ipa && `/${g.ipa}/`, [g.pos, g.gender].filter(Boolean).join(', ')].filter(Boolean);
    panel.querySelector('[data-pron]')!.textContent = pron.join(' · ');
    panel.querySelector('[data-senses]')!.replaceChildren(
      ...g.senses.map((s) => Object.assign(document.createElement('li'), { textContent: s })),
    );
    panel.querySelector<HTMLAnchorElement>('[data-gloss-link]')!.href = g.href;

    open?.setAttribute('aria-expanded', 'false');
    open?.classList.remove('is-open');
    open = btn;
    btn.setAttribute('aria-expanded', 'true');
    btn.classList.add('is-open');
    panel.hidden = false;
    place(btn);
  };

  const hide = (refocus = false) => {
    if (!open) return;
    panel.hidden = true;
    open.setAttribute('aria-expanded', 'false');
    open.classList.remove('is-open');
    if (refocus) open.focus();
    open = null;
  };

  // Wide screens: a small card under the word. Narrow screens: CSS pins it to the bottom.
  const wide = window.matchMedia('(min-width: 40rem)');
  const place = (btn: HTMLElement) => {
    if (!wide.matches) { panel.style.removeProperty('inset'); return; }
    const r = btn.getBoundingClientRect();
    const w = panel.offsetWidth;
    const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), document.documentElement.clientWidth - w - 8);
    panel.style.inset = `${r.bottom + window.scrollY + 6}px auto auto ${left + window.scrollX}px`;
  };

  const focusWord = (from: HTMLButtonElement, to: HTMLButtonElement | undefined) => {
    if (!to || to === from) return;
    from.tabIndex = -1;
    to.tabIndex = 0;
    to.focus();
    if (open) show(to);
  };

  verses.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.w');
    if (!btn) return;
    if (open === btn) return hide();
    for (const w of words) w.tabIndex = w === btn ? 0 : -1;
    show(btn);
  });

  verses.addEventListener('keydown', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.w');
    if (!btn) return;
    const i = words.indexOf(btn);
    const step: Record<string, number> = { ArrowLeft: 1, ArrowDown: 1, ArrowRight: -1, ArrowUp: -1 };
    if (e.key in step) focusWord(btn, words[Math.min(words.length - 1, Math.max(0, i + step[e.key]))]);
    else if (e.key === 'Home') focusWord(btn, words[0]);
    else if (e.key === 'End') focusWord(btn, words[words.length - 1]);
    else if (e.key === 'Escape') hide(true);
    else return;
    e.preventDefault();
  });

  panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(true); });
  panel.querySelector('[data-gloss-close]')!.addEventListener('click', () => hide(true));
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (open && !panel.contains(target) && !target.closest('.w')) hide();
  });
  window.addEventListener('resize', () => open && place(open));
}
