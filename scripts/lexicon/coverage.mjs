#!/usr/bin/env node
// How many words in the poems would get a meaning?
//
//   node scripts/lexicon/coverage.mjs            # src/data/lexicon.json, plus Wilson-only baseline
//   node scripts/lexicon/coverage.mjs --misses 50 # also list the 50 commonest unmatched words
//   node scripts/lexicon/coverage.mjs --fallbacks 50 # …and the 50 commonest words matched only via candidates()
//
// "exact" = fold(token) is a headword (fold: the site's normalise + letter unification);
// "with inflection" = any of candidates(token) from src/lib/lemma.ts is a headword.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fold, candidates } from '../../src/lib/lemma.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const missesN = args.includes('--misses') ? Number(args[args.indexOf('--misses') + 1] || 40) : 0;
const fallbacksN = args.includes('--fallbacks') ? Number(args[args.indexOf('--fallbacks') + 1] || 40) : 0;

/** Token -> count over every verse of every poem. */
export function poemTokens() {
  const dir = path.join(root, 'src/content/poems');
  const counts = new Map();
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.md')) continue;
    const text = readFileSync(path.join(dir, f), 'utf8');
    const fm = text.split(/^---$/m)[1] ?? '';
    for (const m of fm.matchAll(/^\s*- text: (".*")\s*$/gm)) {
      let verse;
      try { verse = JSON.parse(m[1]); } catch { verse = m[1].slice(1, -1).replace(/\\n/g, '\n'); }
      for (const tok of verse.split(/\s+/)) {
        const k = fold(tok);
        if (!k || !/[ؠ-ۿ]/.test(k)) continue;
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
    }
  }
  return counts;
}

function measure(label, headwords, counts) {
  let tokens = 0, types = 0, exT = 0, exY = 0, inT = 0, inY = 0;
  const misses = [];
  for (const [w, n] of counts) {
    tokens += n; types++;
    if (headwords.has(w)) { exT += n; exY++; inT += n; inY++; continue; }
    if (candidates(w).some((c) => headwords.has(c))) { inT += n; inY++; continue; }
    misses.push([w, n]);
  }
  const pct = (a, b) => (100 * a / b).toFixed(1) + '%';
  console.log(`${label} (${headwords.size.toLocaleString()} distinct headword keys)`);
  console.log(`  exact:            ${pct(exT, tokens)} of tokens, ${pct(exY, types)} of types`);
  console.log(`  with inflection:  ${pct(inT, tokens)} of tokens, ${pct(inY, types)} of types`);
  return misses.sort((a, b) => b[1] - a[1]);
}

const counts = poemTokens();
let total = 0; for (const n of counts.values()) total += n;
console.log(`Poems: ${total.toLocaleString()} word tokens, ${counts.size.toLocaleString()} distinct (folded) types\n`);

const wilson = new Set(readdirSync(path.join(root, 'src/content/dictionary'))
  .map((f) => fold(JSON.parse(readFileSync(path.join(root, 'src/content/dictionary', f), 'utf8')).headword)));
measure('Before: Wilson dictionary only', wilson, counts);

const lexPath = path.join(root, 'src/data/lexicon.json');
if (existsSync(lexPath)) {
  const lex = JSON.parse(readFileSync(lexPath, 'utf8'));
  const all = new Set(lex.entries.map((e) => fold(e.hw)));
  console.log();
  const misses = measure('After: src/data/lexicon.json', all, counts);
  const bySrc = {};
  for (const e of lex.entries) (bySrc[e.src] ??= new Set()).add(fold(e.hw));
  console.log('\n  per source alone (with inflection):');
  for (const [s, set] of Object.entries(bySrc)) {
    let t = 0;
    for (const [w, n] of counts) if (set.has(w) || candidates(w).some((c) => set.has(c))) t += n;
    console.log(`    ${s.padEnd(14)} ${(100 * t / total).toFixed(1)}%`);
  }
  if (fallbacksN) {
    const first = new Map();
    for (const e of lex.entries) if (!first.has(fold(e.hw))) first.set(fold(e.hw), e);
    const fb = [...counts].filter(([w]) => !all.has(w)).map(([w, n]) => [w, n, candidates(w).find((c) => all.has(c))])
      .filter((x) => x[2]).sort((a, b) => b[1] - a[1]).slice(0, fallbacksN);
    console.log('\nCommonest inflection-fallback matches:\n' + fb.map(([w, n, c]) => `  ${n}\t${w} → ${c}\t${first.get(c).src}: ${first.get(c).senses[0]}`).join('\n'));
  }
  if (missesN) console.log('\nCommonest unmatched:\n' + misses.slice(0, missesN).map(([w, n]) => `  ${n}\t${w}`).join('\n'));
}
