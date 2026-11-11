/**
 * Word meanings. Every glossed word is a <button class="w" data-g="i"> wrapped
 * at build time; the cards' data is in #gloss-data.
 *
 * The "Word meanings" toolbar button turns the underlines on and off
 * (remembered as pn-meanings). Keyboard: Tab reaches the first word (roving
 * tabindex), arrow keys move between words in reading order (Left = next,
 * the text being right-to-left), Home/End jump, Enter or Space opens, Escape
 * closes. Focus stays on the word, so an open card follows the arrows.
 */
interface Meaning {
  en?: string;
  pos?: string;
  roman?: string;
  base?: string;
  note?: string;
  draft?: boolean;
  dict?: { hw: string; romanized: string; pos: string; senses: string[]; href: string; source: string };
}
interface Data { items: Meaning[]; pos: Record<string, string>; base: string }

const KEY = 'pn-meanings';

export function initGlossary() {
  const panel = document.querySelector<HTMLElement>('[data-gloss]');
  const json = document.getElementById('gloss-data');
  const verses = document.querySelector<HTMLElement>('[data-verses]');
  if (!panel || !json || !verses) return;
  const data: Data = JSON.parse(json.textContent || '{"items":[]}');
  const words = [...verses.querySelectorAll<HTMLButtonElement>('.w')];
  const toggle = document.querySelector<HTMLButtonElement>('[data-meanings]');
  const $ = <T extends HTMLElement>(sel: string) => panel.querySelector<T>(sel)!;
  let open: HTMLButtonElement | null = null;

  /* ---------- on / off ---------- */
  const setEnabled = (on: boolean, save = false) => {
    verses.dataset.glossState = on ? 'on' : 'off';
    toggle?.setAttribute('aria-pressed', String(on));
    for (const w of words) { w.tabIndex = -1; w.disabled = !on; }
    if (on && words[0]) words[0].tabIndex = 0;
    if (!on) hide();
    if (save) try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* not stored */ }
  };
  let stored: string | null = null;
  try { stored = localStorage.getItem(KEY); } catch { /* private mode */ }
  toggle?.addEventListener('click', () => setEnabled(verses.dataset.glossState !== 'on', true));

  /* ---------- card ---------- */
  const show = (btn: HTMLButtonElement) => {
    const m = data.items[Number(btn.dataset.g)];
    if (!m) return;
    $('[data-hw]').textContent = btn.textContent;
    const pos = m.pos ?? m.dict?.pos;
    $('[data-pos]').textContent = pos ? (data.pos[pos] ?? pos) : '';
    const pron = [m.roman ?? m.dict?.romanized, m.base && `${data.base} ${m.base}`].filter(Boolean).join(' · ');
    $('[data-pron]').textContent = pron;
    $('[data-pron]').hidden = !pron;
    $('[data-en]').textContent = m.en ?? '';
    $('[data-en]').hidden = !m.en;
    $('[data-note]').textContent = m.note ?? '';
    $('[data-note]').hidden = !m.note;
    const dict = $('[data-dict]');
    dict.hidden = !m.dict;
    if (m.dict) {
      $('[data-dict-source]').textContent = m.dict.source;
      $('[data-senses]').replaceChildren(...m.dict.senses.map((s) => Object.assign(document.createElement('li'), { textContent: s })));
      $<HTMLAnchorElement>('[data-gloss-link]').href = m.dict.href;
    }
    $('[data-draft]').hidden = !m.draft;

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

  // Wide screens: a card under the word. Narrow screens: CSS pins it to the bottom.
  const wide = window.matchMedia('(min-width: 40rem)');
  const place = (btn: HTMLElement) => {
    if (!wide.matches) { panel.style.removeProperty('inset'); return; }
    const r = btn.getBoundingClientRect();
    const w = panel.offsetWidth;
    const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), document.documentElement.clientWidth - w - 8);
    panel.style.inset = `${r.bottom + window.scrollY + 8}px auto auto ${left + window.scrollX}px`;
  };

  /* ---------- interaction ---------- */
  const focusWord = (from: HTMLButtonElement, to: HTMLButtonElement | undefined) => {
    if (!to || to === from) return;
    from.tabIndex = -1;
    to.tabIndex = 0;
    to.focus();
    if (open) show(to);
  };

  verses.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.w');
    if (!btn || btn.disabled) return;
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
  $('[data-gloss-close]').addEventListener('click', () => hide(true));
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (open && !panel.contains(target) && !target.closest('.w')) hide();
  });
  window.addEventListener('resize', () => open && place(open));

  setEnabled(stored !== 'off');
}
