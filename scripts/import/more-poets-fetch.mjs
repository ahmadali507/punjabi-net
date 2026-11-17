#!/usr/bin/env node
/**
 * Download punjabi-kavita.com Shahmukhi pages for the poets added by more-poets.mjs (poets outside the
 * original eight). Pages are cached in .cache/more-poets/pk/; cached pages are not fetched again.
 * 3 s between requests. Wikisource pages come from .cache/wikisource.json (wikisource.mjs fetch).
 *
 *   node scripts/import/more-poets-fetch.mjs Page [Page ...]     (page names without ".php")
 *   node scripts/import/more-poets-fetch.mjs --links Page         list the *Shahmukhi.php links on a cached page
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url).pathname;
const CACHE = `${ROOT}.cache/more-poets/pk`;
const UA = { 'User-Agent': 'Mozilla/5.0 (punjabi-net archive; non-commercial literary archive; import script)' };
mkdirSync(CACHE, { recursive: true });

const args = process.argv.slice(2);
if (args[0] === '--links') {
  const html = readFileSync(`${CACHE}/${args[1]}.html`, 'utf8');
  const seen = new Set();
  for (const m of html.matchAll(/<a[^>]+href="(?:https:\/\/www\.punjabi-kavita\.com\/)?([A-Za-z0-9]+Shahmukhi\d*)\.php"[^>]*>([\s\S]*?)<\/a>/g)) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    console.log(m[1], '\t', m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
  }
} else {
  for (const page of args) {
    const file = `${CACHE}/${page}.html`;
    if (existsSync(file)) { console.log(`${page}: cached`); continue; }
    const r = await fetch(`https://www.punjabi-kavita.com/${page}.php`, { headers: UA });
    console.log(`${page}: HTTP ${r.status}`);
    if (r.ok) writeFileSync(file, await r.text());
    await new Promise((res) => setTimeout(res, 3000));
  }
}
