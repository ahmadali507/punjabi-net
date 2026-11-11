/**
 * Script switch. The inline <head> snippet (Base.astro) applies the stored
 * script before first paint; this module wires up the buttons.
 */
type Script = 'sm' | 'gm' | 'ro';
const KEY = 'pn-script';
const ATTRS: Record<Script, { lang: string; dir: 'rtl' | 'ltr' }> = {
  sm: { lang: 'pnb', dir: 'rtl' },
  gm: { lang: 'pa', dir: 'ltr' },
  ro: { lang: 'pa-Latn', dir: 'ltr' },
};

const isScript = (v: unknown): v is Script => v === 'sm' || v === 'gm' || v === 'ro';

export function currentScript(): Script {
  const s = document.documentElement.dataset.script;
  return isScript(s) ? s : 'sm';
}

export function applyScript(s: Script) {
  const root = document.documentElement;
  root.dataset.script = s;
  // On /pa the whole page is Punjabi, so lang and direction follow the script.
  if (root.dataset.locale === 'pa') {
    root.lang = ATTRS[s].lang;
    root.dir = ATTRS[s].dir;
  }
  for (const el of document.querySelectorAll<HTMLElement>('[data-i18n-attr]')) {
    const value = el.dataset[`i18n${s[0].toUpperCase()}${s[1]}`];
    if (value) el.setAttribute(el.dataset.i18nAttr!, value);
  }
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-set-script]')) {
    b.setAttribute('aria-pressed', String(b.dataset.setScript === s));
  }
  document.dispatchEvent(new CustomEvent('scriptchange', { detail: s }));
}

export function initScriptSwitch() {
  applyScript(currentScript());
  for (const group of document.querySelectorAll<HTMLElement>('[data-script-switch]')) {
    group.hidden = false;
    group.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-set-script]');
      const s = btn?.dataset.setScript;
      if (!isScript(s)) return;
      applyScript(s);
      try {
        localStorage.setItem(KEY, s);
      } catch {
        /* private mode: the choice lasts for this page only */
      }
    });
  }
}
