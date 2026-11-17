/**
 * Word meanings, for the poem reader and the whole-work reader.
 *
 * Poem pages: every word with a meaning is a <button class="w" data-g="i"> wrapped
 * at build time; the cards' data is inline in #gloss-data.
 * Work pages (thousands of verses): the container has data-meanings-url; the data
 * is fetched once, and lines are wrapped as they come near the viewport.
 *
 * Pointing at a word shows a small "See meaning" chip; clicking the word or the
 * chip opens the meaning dialog right under the word (a bottom sheet on phones).
 * Keyboard: Tab reaches the first word (roving tabindex), arrow keys move between
 * words in reading order (Left = next, the text being right-to-left), Home/End
 * jump, Enter or Space opens, Escape closes. The "Word meanings" toolbar button
 * (poem pages) turns all this on and off, remembered as pn-meanings.
 */
interface Dict { hw: string; romanized: string; pos: string; senses: string[]; lang?: 'en' | 'pa'; href?: string; source: string; base?: string; guess?: boolean; also?: { senses: string[]; source: string; href?: string } }
interface Meaning { en?: string; pos?: string; roman?: string; base?: string; note?: string; draft?: boolean; dict?: Dict }
interface Data { items: Meaning[]; pos: Record<string, string>; base: string; guess?: string; keys?: Record<string, number> }

const KEY = 'pn-meanings';
const PUNCT = /[\s.,;:!?،؛؟۔"'“”‘’()[\]{}«»\-–—…]+/g;
const HARAKAT = /[ً-ٰٟۖ-ۭ]/g;
const normalise = (token: string) => token.replace(PUNCT, '').replace(HARAKAT, '');
const canHover = window.matchMedia('(hover: hover) and (pointer: fine)');
const wide = window.matchMedia('(min-width: 40rem)');

export function initGlossary() {
  const panel = document.querySelector<HTMLElement>('[data-gloss]');
  const chip = document.querySelector<HTMLButtonElement>('[data-gloss-chip]');
  const verses = document.querySelector<HTMLElement>('[data-verses]');
  if (!panel || !verses) return;
  const toggle = document.querySelector<HTMLButtonElement>('[data-meanings]');
  const $ = <T extends HTMLElement>(sel: string) => panel.querySelector<T>(sel)!;
  const inline = document.getElementById('gloss-data');
  let data: Data | null = inline ? JSON.parse(inline.textContent || '{"items":[]}') : null;
  let open: HTMLButtonElement | null = null;
  let hovered: HTMLButtonElement | null = null;
  let chipTimer = 0;
  const words = () => [...verses.querySelectorAll<HTMLButtonElement>('.w')];
  const enabled = () => verses.dataset.glossState !== 'off';

  /* ---------- work pages: fetch once, wrap lines near the viewport ---------- */
  const url = verses.dataset.meaningsUrl;
  if (!data && url) {
    let loading: Promise<void> | null = null;
    const load = () =>
      (loading ??= fetch(url)
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((d: Data) => {
          data = d;
          const io = new IntersectionObserver((entries) => {
            for (const e of entries) if (e.isIntersecting) { wrap(e.target as HTMLElement); io.unobserve(e.target); }
          }, { rootMargin: '800px 0px' });
          verses.querySelectorAll<HTMLElement>('.part__verse').forEach((p) => io.observe(p));
        })
        .catch(() => { loading = null; }));
    verses.addEventListener('pointerover', load, { once: true });
    verses.addEventListener('focusin', load, { once: true });
    verses.addEventListener('touchstart', load, { once: true, passive: true });
    ('requestIdleCallback' in window ? requestIdleCallback : setTimeout)(() => load(), { timeout: 2500 } as never);
  }

  const wrap = (verse: HTMLElement) => {
    if (!data?.keys) return;
    const keys = data.keys;
    for (const line of verse.querySelectorAll<HTMLElement>('.line')) {
      const text = line.textContent ?? '';
      const frag = document.createDocumentFragment();
      let changed = false;
      for (const part of text.split(/(\s+)/)) {
        if (!part) continue;
        const m = part.match(/^([^\p{L}\p{M}\p{N}]*)(.*?)([^\p{L}\p{M}\p{N}]*)$/u);
        const [, pre = '', core = '', post = ''] = m ?? [];
        const g = core ? keys[normalise(core)] : undefined;
        if (g === undefined) { frag.append(part); continue; }
        changed = true;
        if (pre) frag.append(pre);
        const b = document.createElement('button');
        Object.assign(b, { type: 'button', className: 'w', tabIndex: -1, textContent: core });
        b.dataset.g = String(g);
        frag.append(b);
        if (post) frag.append(post);
      }
      if (changed) line.replaceChildren(frag);
    }
    if (!verses.querySelector('.w[tabindex="0"]')) { const first = verses.querySelector<HTMLButtonElement>('.w'); if (first) first.tabIndex = 0; }
  };

  /* ---------- on / off ---------- */
  const setEnabled = (on: boolean, save = false) => {
    verses.dataset.glossState = on ? 'on' : 'off';
    toggle?.setAttribute('aria-pressed', String(on));
    const ws = words();
    for (const w of ws) { w.tabIndex = -1; w.disabled = !on; }
    if (on && ws[0]) ws[0].tabIndex = 0;
    if (!on) { hide(); hideChip(); }
    if (save) try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* not stored */ }
  };
  let stored: string | null = null;
  try { stored = localStorage.getItem(KEY); } catch { /* private mode */ }
  toggle?.addEventListener('click', () => setEnabled(!enabled(), true));

  /* ---------- hover chip ---------- */
  const showChip = (btn: HTMLButtonElement) => {
    if (!chip || open === btn) return;
    hovered = btn;
    chip.hidden = false;
    const r = btn.getBoundingClientRect();
    const w = chip.offsetWidth;
    const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), document.documentElement.clientWidth - w - 8);
    chip.style.inset = `${r.top + window.scrollY - chip.offsetHeight - 6}px auto auto ${left + window.scrollX}px`;
  };
  const hideChip = () => { if (chip) chip.hidden = true; hovered = null; };

  if (chip) {
    verses.addEventListener('pointerover', (e) => {
      if (!canHover.matches || !enabled()) return;
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.w');
      if (!btn) return;
      clearTimeout(chipTimer);
      chipTimer = window.setTimeout(() => showChip(btn), 90);
    });
    verses.addEventListener('pointerout', (e) => {
      if (!(e.target as HTMLElement).closest('.w')) return;
      clearTimeout(chipTimer);
      chipTimer = window.setTimeout(hideChip, 260);
    });
    chip.addEventListener('pointerenter', () => clearTimeout(chipTimer));
    chip.addEventListener('pointerleave', () => { chipTimer = window.setTimeout(hideChip, 200); });
    chip.addEventListener('click', () => { if (hovered) { const b = hovered; hideChip(); select(b); } });
  }

  /* ---------- dialog ---------- */
  const show = (btn: HTMLButtonElement) => {
    const m = data?.items[Number(btn.dataset.g)];
    if (!m || !data) return;
    $('[data-hw]').textContent = btn.textContent;
    const pos = m.pos || m.dict?.pos;
    $('[data-pos]').textContent = pos ? (data.pos[pos] ?? pos) : '';
    $('[data-pos]').hidden = !pos;
    const guessed = !m.base && m.dict?.base;
    const base = m.base ? `${data.base} ${m.base}` : guessed ? `${m.dict!.guess ? data.guess ?? data.base : data.base} ${m.dict!.base}` : '';
    const pron = [m.roman ?? m.dict?.romanized, base].filter(Boolean).join(' · ');
    $('[data-pron]').textContent = pron;
    $('[data-pron]').hidden = !pron;
    $('[data-en]').textContent = m.en ?? '';
    $('[data-en]').hidden = !m.en;
    $('[data-note]').textContent = m.note ?? '';
    $('[data-note]').hidden = !m.note;
    const dict = $('[data-dict]');
    dict.hidden = !m.dict;
    dict.classList.toggle('gloss__dict--only', !m.en);
    if (m.dict) {
      $('[data-dict-source]').textContent = m.dict.source;
      const ol = $('[data-senses]');
      const lang = m.dict.lang ?? 'en';
      ol.lang = lang === 'pa' ? 'pnb' : 'en';
      ol.dir = lang === 'pa' ? 'rtl' : 'ltr';
      ol.replaceChildren(...m.dict.senses.map((s) => Object.assign(document.createElement('li'), { textContent: s })));
      const link = $<HTMLAnchorElement>('[data-gloss-link]');
      link.hidden = !m.dict.href;
      if (m.dict.href) {
        link.href = m.dict.href;
        const external = /^https?:/.test(m.dict.href);
        link.target = external ? '_blank' : '';
        link.rel = external ? 'noopener' : '';
        $('[data-link-dict]').hidden = external;
        $('[data-link-src]').hidden = !external;
      }
      const also = m.dict.also;
      $('[data-also]').hidden = !also?.senses.length;
      if (also) {
        $('[data-also-source]').textContent = also.source;
        const a = $<HTMLAnchorElement>('[data-also-link]');
        if (also.href) a.href = also.href; else a.removeAttribute('href');
        $('[data-also-senses]').replaceChildren(...also.senses.map((s) => Object.assign(document.createElement('li'), { textContent: s })));
      }
    }
    $('[data-draft]').hidden = !m.draft;

    open?.setAttribute('aria-expanded', 'false');
    open?.classList.remove('is-open');
    open = btn;
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-controls', 'gloss');
    btn.classList.add('is-open');
    panel.hidden = false;
    panel.classList.remove('is-in');
    void panel.offsetWidth;
    panel.classList.add('is-in');
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

  // Wide screens: a card under the word (above it when there is no room). Narrow: CSS makes it a bottom sheet.
  const place = (btn: HTMLElement) => {
    if (!wide.matches) { panel.style.removeProperty('inset'); return; }
    const r = btn.getBoundingClientRect();
    const w = panel.offsetWidth;
    const h = panel.offsetHeight;
    const vw = document.documentElement.clientWidth;
    const left = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), vw - w - 12);
    const below = r.bottom + 12 + h < window.innerHeight || r.top < h + 12;
    const top = below ? r.bottom + 12 : r.top - h - 12;
    panel.dataset.side = below ? 'below' : 'above';
    panel.style.inset = `${top + window.scrollY}px auto auto ${left + window.scrollX}px`;
    $('[data-arrow]').style.left = `${Math.min(Math.max(18, r.left + r.width / 2 - left), w - 18)}px`;
  };

  /* ---------- interaction ---------- */
  const select = (btn: HTMLButtonElement) => {
    for (const w of words()) w.tabIndex = w === btn ? 0 : -1;
    show(btn);
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
    if (!btn || btn.disabled) return;
    hideChip();
    if (open === btn) return hide();
    select(btn);
  });

  verses.addEventListener('keydown', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.w');
    if (!btn) return;
    const ws = words();
    const i = ws.indexOf(btn);
    const step: Record<string, number> = { ArrowLeft: 1, ArrowDown: 1, ArrowRight: -1, ArrowUp: -1 };
    if (e.key in step) focusWord(btn, ws[Math.min(ws.length - 1, Math.max(0, i + step[e.key]))]);
    else if (e.key === 'Home') focusWord(btn, ws[0]);
    else if (e.key === 'End') focusWord(btn, ws[ws.length - 1]);
    else if (e.key === 'Escape') hide(true);
    else return;
    e.preventDefault();
  });

  panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(true); });
  $('[data-gloss-close]').addEventListener('click', () => hide(true));
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (open && !panel.contains(target) && !target.closest('.w') && !target.closest('[data-gloss-chip]')) hide();
  });
  window.addEventListener('resize', () => { if (open) place(open); hideChip(); });

  setEnabled(toggle ? stored !== 'off' : true);
}
