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

/** Numbers in the page's digits: Western on English pages, Extended Arabic-Indic on /pa. */
export function num(locale: Locale, n: number | string): string {
  return locale === 'pa' ? String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]) : String(n);
}

/** A UI string with {placeholders}; numbers are written in the page's digits. */
export function tf(locale: Locale, key: UIKey, vars: Record<string, string | number>): string {
  return t(locale, key).replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = vars[k];
    return typeof v === 'number' ? num(locale, v) : (v ?? '');
  });
}

/**
 * The public path of a page: no ".html", and no trailing "/index"
 * ("/index.html" -> "/", "/pa/index.html" -> "/pa", "/poems/heer.html" -> "/poems/heer").
 * With build.format "file", Astro.url.pathname is the file path, so pages must use this.
 */
export function cleanPath(pathname: string): string {
  const p = pathname.replace(/\.html$/, '').replace(/\/index$/, '').replace(/\/+$/, '');
  return p === '' ? '/' : p;
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
  const path = stripLocale(cleanPath(pathname));
  // The 404 page has no counterpart: send the reader to the other language's home.
  return localePath(to, path === '/404' ? '/' : path);
}
