#!/usr/bin/env node
// Download the kaikki.org (wiktextract) JSONL extracts of English Wiktionary used by build.mjs
// into scripts/lexicon/.cache/. Pass --force to re-download. Platts pages: fetch-platts.mjs.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const cache = path.join(path.dirname(fileURLToPath(import.meta.url)), '.cache');
mkdirSync(cache, { recursive: true });
const force = process.argv.includes('--force');
for (const lang of ['Punjabi', 'Urdu']) {
  const file = path.join(cache, `kaikki-${lang}.jsonl`);
  if (existsSync(file) && !force) { console.log(`cached ${file}`); continue; }
  const url = `https://kaikki.org/dictionary/${lang}/kaikki.org-dictionary-${lang}.jsonl`;
  const res = await fetch(url, { headers: { 'User-Agent': 'punjabi-net-lexicon/1.0' } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  console.log(`downloaded ${url}`);
}
