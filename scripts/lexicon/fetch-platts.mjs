#!/usr/bin/env node
// Download every page of Platts' Dictionary (1884) from the University of Chicago's
// Digital Dictionaries of South Asia, one page at a time, politely (1 request / 1.5 s),
// caching raw HTML in scripts/lexicon/.cache/platts/NNNN.html. Re-runs skip cached pages.
import { mkdir, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(here, '.cache', 'platts');
const FIRST = 1, LAST = Number(process.env.PLATTS_LAST ?? 1259);
const UA = 'punjabi-net-lexicon/1.0';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await mkdir(dir, { recursive: true });

for (let p = FIRST; p <= LAST; p++) {
  const file = path.join(dir, String(p).padStart(4, '0') + '.html');
  try { await access(file); continue; } catch {}
  const url = `https://dsal.uchicago.edu/cgi-bin/app/platts_query.py?page=${p}`;
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      await writeFile(file, html);
      if (!html.includes('<entry')) console.log(`page ${p}: no entries`);
      break;
    } catch (e) {
      console.log(`page ${p} attempt ${attempt}: ${e.message}`);
      if (attempt >= 5) break;
      await sleep(10000 * attempt);
    }
  }
  if (p % 50 === 0) console.log(`fetched up to page ${p}`);
  await sleep(1500);
}
console.log('done');
