#!/usr/bin/env node
/**
 * Download the punjabi-kavita.com Shahmukhi pages used to group Hashim Shah's and Mian Muhammad Bakhsh's
 * complete works (see complete-works.mjs). Pages are cached in .cache/punjabi-kavita/; cached pages are not
 * fetched again. 3 s between requests.
 *
 *   node scripts/import/complete-works-fetch.mjs [Page ...]
 */
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
const ROOT = new URL('../../', import.meta.url).pathname;
const CACHE = `${ROOT}.cache/punjabi-kavita`;
const UA = { 'User-Agent': 'Mozilla/5.0 (punjabi-net archive; non-commercial literary archive; import script)' };
const PAGES = process.argv.slice(2).length ? process.argv.slice(2) : [
  'HashimShahShahmukhi', 'SassiPunnuHashimShahShahmukhi', 'SohniMahiwalHashimShahShahmukhi', 'ShirinFarhadHashimShahShahmukhi',
  'HeerRanjhaHashimShahShahmukhi', 'SiharfianHashimShahShahmukhi', 'DeodhanHashimShahShahmukhi', 'MunajatHashimShahShahmukhi',
  'DohreHashimShahShahmukhi', 'SaifUlMalookShahmukhi', 'PoetryMianMuhammadBakhshShahmukhi', 'DohreMianMuhammadBakhshShahmukhi',
];
mkdirSync(CACHE, { recursive: true });
for (const page of PAGES) {
  const file = `${CACHE}/${page}.html`;
  if (existsSync(file)) { console.log(`${page}: cached`); continue; }
  const r = await fetch(`https://www.punjabi-kavita.com/${page}.php`, { headers: UA });
  console.log(`${page}: HTTP ${r.status}`);
  if (r.ok) writeFileSync(file, await r.text());
  await new Promise((res) => setTimeout(res, 3000));
}
