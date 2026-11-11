/**
 * Punjabi pages carry no English: report Latin-script text on built /pa pages.
 * Allowed: the site name (wordmark, titles, footer) and the "EN" language switch.
 * Usage: node scripts/pa-latin.mjs [dist-dir]   (default: dist)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] ?? 'dist';
const ALLOWED = /^(EN|punjabi\.net)$/;
const files = [];
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') && files.push(p); } };
walk(join(root, 'pa'));

let bad = 0;
for (const f of files) {
  const html = readFileSync(f, 'utf8')
    .replace(/<(script|style|template|svg)\b[\s\S]*?<\/\1>/g, ' ')
    .replace(/<head>[\s\S]*?<\/head>/, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/g, ' ');
  const words = (html.match(/[A-Za-z][A-Za-z.]+/g) ?? []).filter((w) => !ALLOWED.test(w));
  if (words.length) { bad++; if (bad <= 20) console.log(`${f}: ${[...new Set(words)].slice(0, 8).join(' ')}`); }
}
console.log(`${files.length} Punjabi pages checked; ${bad} with English text`);
process.exit(bad ? 1 : 0);
