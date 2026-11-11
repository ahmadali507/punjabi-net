import { ui, type UIKey } from './ui';

export const LOCALES = ['en', 'pa'] as const;
export type Locale = (typeof LOCALES)[number];

/** Punjabi on this site is always Shahmukhi: Western Punjabi, right-to-left. */
export const PA_LANG = 'pnb';

export function asLocale(value: string | undefined): Locale {
  return value === 'pa' ? 'pa' : 'en';
}

/** A UI string in the page's language. */
export function t(locale: Locale, key: UIKey): string {
  return ui[key][locale];
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
