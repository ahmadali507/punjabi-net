#!/usr/bin/env node
/**
 * Word-gloss helper.
 *   node scripts/glosses.mjs list <poem-id>   distinct words of a poem (normalised), in order
 *   node scripts/glosses.mjs check [ids…]     report poems whose gloss file misses words
 * Normalisation must match normalise() in src/lib/content.ts.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
const ROOT = new URL('..', import.meta.url).pathname;
const PUNCT = /[\s.,;:!?،؛؟۔"'“”‘’()[\]{}«»\-–—…]+/g;
const HARAKAT = /[ً-ٰٟۖ-ۭ]/g;
export const normalise = (t) => t.replace(PUNCT, '').replace(HARAKAT, '');

export function words(id) {
  const src = readFileSync(`${ROOT}src/content/poems/${id}.md`, 'utf8');
  const texts = [...src.matchAll(/^ {2}- text: (".*")$/gm)].map((m) => JSON.parse(m[1]));
  const seen = new Set();
  for (const t of texts) for (const w of t.split(/\s+/)) { const n = normalise(w); if (n) seen.add(n); }
  return [...seen];
}
const poems = () => readdirSync(`${ROOT}src/content/poems`).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3));

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'list') {
  console.log(words(args[0]).join('\n'));
} else if (cmd === 'check') {
  let bad = 0, total = 0, covered = 0;
  for (const id of args.length ? args : poems()) {
    const ws = words(id); if (!ws.length) continue;
    const f = `${ROOT}src/content/glosses/${id}.json`;
    const g = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')).words : {};
    const missing = ws.filter((w) => !g[w]);
    total += ws.length; covered += ws.length - missing.length;
    if (missing.length) { bad++; console.log(`${id}: ${missing.length}/${ws.length} missing${existsSync(f) ? '' : ' (no file)'}${missing.length < 8 ? ': ' + missing.join(' ') : ''}`); }
  }
  console.log(`${covered}/${total} poem-words glossed; ${bad} poem(s) incomplete`);
  process.exitCode = bad ? 1 : 0;
} else console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0]);
