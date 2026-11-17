/**
 * Structured data (schema.org JSON-LD) shared by every page.
 *
 * Each page emits one @graph: the publisher (Organization), the site (WebSite, with
 * its search), the page itself (WebPage, with breadcrumbs), and the page's subject
 * (a poem, poet, book, word…). Nodes refer to each other by stable @id URLs, so
 * search engines and answer engines can join a poem to its poet and its book.
 */
import { SITE } from '~/site.config';

export type Node = Record<string, unknown>;
export interface Crumb { name: string; path: string }

/** Absolute URL on the site. */
export const abs = (site: URL | string, path: string) => new URL(path, site).href;

/** Stable @id values: one URL per thing, the same on every page that mentions it. */
export const ids = {
  org: (site: URL | string) => abs(site, '/#org'),
  website: (site: URL | string) => abs(site, '/#website'),
  page: (url: string) => `${url}#webpage`,
  poet: (site: URL | string, id: string) => abs(site, `/poets/${id}#person`),
  work: (site: URL | string, id: string) => abs(site, `/works/${id}#work`),
  poem: (site: URL | string, id: string) => abs(site, `/poems/${id}#poem`),
  dictionary: (site: URL | string) => abs(site, '/dictionary#termset'),
};

/** A year schema.org can read ("1542"), or nothing for "c. 1173", "1757?" or "12th century". */
export const plainYear = (d?: string) => (d && /^\d{3,4}$/.test(d) ? d : undefined);

/** Drop undefined, null, empty strings and empty arrays, so the JSON stays clean. */
export function clean<T>(v: T): T {
  if (Array.isArray(v)) return v.map(clean).filter((x) => x !== undefined) as T;
  if (v && typeof v === 'object') {
    const out: Node = {};
    for (const [k, x] of Object.entries(v as Node)) {
      const c = clean(x);
      if (c === undefined || c === null || c === '' || (Array.isArray(c) && c.length === 0)) continue;
      out[k] = c;
    }
    return out as T;
  }
  return v;
}

export function graph(opts: {
  site: URL;
  url: string;
  title: string;
  description: string;
  lang: string;
  image: string;
  crumbs?: Crumb[];
  homeName: string;
  nodes: Node[];
  /** WebPage by default; ProfilePage for a poet, CollectionPage for a list… */
  pageType?: string;
}): Node {
  const { site, url } = opts;
  const org: Node = {
    '@type': 'Organization',
    '@id': ids.org(site),
    name: SITE.name,
    url: abs(site, '/'),
    logo: { '@type': 'ImageObject', url: abs(site, '/icon-512.png'), width: 512, height: 512 },
    description: SITE.description,
    sameAs: SITE.sameAs,
  };
  const website: Node = {
    '@type': 'WebSite',
    '@id': ids.website(site),
    name: SITE.name,
    url: abs(site, '/'),
    description: SITE.description,
    inLanguage: ['en', 'pnb'],
    publisher: { '@id': ids.org(site) },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${abs(site, '/search')}?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
  const crumbs = opts.crumbs?.length
    ? {
        '@type': 'BreadcrumbList',
        itemListElement: [{ name: opts.homeName, path: '/' }, ...opts.crumbs].map((c, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: c.name,
          item: abs(site, c.path),
        })),
      }
    : undefined;
  const main = opts.nodes[0];
  const page: Node = {
    '@type': opts.pageType ?? 'WebPage',
    '@id': ids.page(url),
    url,
    name: opts.title,
    description: opts.description,
    inLanguage: opts.lang,
    isPartOf: { '@id': ids.website(site) },
    publisher: { '@id': ids.org(site) },
    primaryImageOfPage: { '@type': 'ImageObject', url: opts.image, width: 512, height: 512 },
    breadcrumb: crumbs,
    mainEntity: main?.['@id'] ? { '@id': main['@id'] } : undefined,
  };
  return clean({ '@context': 'https://schema.org', '@graph': [org, website, page, ...opts.nodes] });
}
