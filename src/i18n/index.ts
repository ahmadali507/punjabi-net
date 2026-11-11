import { ui, type UIKey, type ScriptText } from './ui';

export const LOCALES = ['en', 'pa'] as const;
export type Locale = (typeof LOCALES)[number];
export const SCRIPTS = ['sm', 'gm', 'ro'] as const;
export type Script = (typeof SCRIPTS)[number];
export const DEFAULT_SCRIPT: Script = 'sm';

/** lang / dir for each Punjabi script. */
export const SCRIPT_ATTRS: Record<Script, { lang: string; dir: 'rtl' | 'ltr' }> = {
  sm: { lang: 'pnb', dir: 'rtl' },
  gm: { lang: 'pa', dir: 'ltr' },
  ro: { lang: 'pa-Latn', dir: 'ltr' },
};

export function asLocale(value: string | undefined): Locale {
  return value === 'pa' ? 'pa' : 'en';
}

/** A UI string: plain English, or per-script Punjabi. */
export function t(locale: Locale, key: UIKey): string | ScriptText {
  return ui[key][locale];
}

/** Plain string for attributes, where per-script markup is impossible. Punjabi falls back to the given script. */
export function tAttr(locale: Locale, key: UIKey, script: Script = DEFAULT_SCRIPT): string {
  const v = ui[key][locale];
  return typeof v === 'string' ? v : v[script];
}

/** Strip any locale prefix: "/pa/poems/x" -> "/poems/x". */
export function stripLocale(pathname: string): string {
  const p = pathname.replace(/^\/pa(?=\/|$)/, '');
  return p === '' ? '/' : p;
}

/** Path for a locale: localePath("pa", "/poems") -> "/pa/poems". */
export function localePath(locale: Locale, path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (locale === 'en') return clean;
  return clean === '/' ? '/pa' : `/pa${clean}`;
}

/** The same page in the other locale. */
export function alternatePath(pathname: string, to: Locale): string {
  return localePath(to, stripLocale(pathname.replace(/\.html$/, '')));
}

/**
 * Attributes for an element whose attribute (placeholder, aria-label…) is a UI
 * string. On /pa the script switch swaps the value from data-i18n-{sm,gm,ro}.
 *   <input {...i18nAttr(locale, 'search.placeholder', 'placeholder')} />
 */
export function i18nAttr(locale: Locale, key: UIKey, attr: string): Record<string, string> {
  const v = ui[key][locale];
  if (typeof v === 'string') return { [attr]: v };
  return {
    [attr]: v[DEFAULT_SCRIPT],
    'data-i18n-attr': attr,
    'data-i18n-sm': v.sm,
    'data-i18n-gm': v.gm,
    'data-i18n-ro': v.ro,
  };
}
