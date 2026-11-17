#!/usr/bin/env node
/**
 * Check the files more-poets.mjs wrote (and the poets they reference) against the rules of
 * src/content.config.ts, without an Astro build:
 *
 *   node scripts/import/more-poets-check.mjs
 *
 * Poems: poet/form/work ids exist, Shahmukhi title and verses, source.book/url, verification_note,
 * work.n 1-based, unique and continuous per work. Works: poet/form exist, kind, Shahmukhi title.
 * Poets: name, era, region, bio_short < 200, HISTORIC_DATE dates, public_domain, portrait fields.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { parse } from 'yaml';

const ROOT = new URL('../../', import.meta.url).pathname;
const C = `${ROOT}src/content`;
const manifest = JSON.parse(readFileSync(`${ROOT}.cache/more-poets/written.json`, 'utf8'));
const poetsWritten = JSON.parse(readFileSync(`${ROOT}.cache/more-poets/poets-written.json`, 'utf8'));

const SHAHMUKHI = /[؀-ۿݐ-ݿ]/;
const HISTORIC_DATE = /^(?:(?:c\. )?\d{3,4}\??|(?:(?:early|mid|late) )?\d{1,2}(?:st|nd|rd|th) century)$/;
const ERAS = ['classical', 'modern', 'contemporary'];
const ids = (dir) => new Set(readdirSync(`${C}/${dir}`).filter((f) => /\.(md|json)$/.test(f)).map((f) => f.replace(/\.(md|json)$/, '')));
const front = (file) => {
  const s = readFileSync(file, 'utf8');
  const m = s.match(/^---\n([\s\S]*?)\n---/);
  if (!m) throw new Error('no frontmatter');
  return parse(m[1]);
};
const isUrl = (u) => { try { new URL(u); return true; } catch { return false; } };

const poets = ids('poets'), forms = ids('forms'), works = ids('works');
const errors = [];
const err = (f, msg) => errors.push(`${f}: ${msg}`);

for (const id of poetsWritten) {
  const f = `poets/${id}.md`;
  if (!existsSync(`${C}/${f}`)) { err(f, 'missing'); continue; }
  const p = front(`${C}/${f}`);
  if (!p.name?.pa || !SHAHMUKHI.test(p.name.pa) || !p.name?.en) err(f, 'name.pa (Shahmukhi) and name.en required');
  for (const k of ['born', 'died']) if (p[k] !== undefined && !HISTORIC_DATE.test(String(p[k]))) err(f, `${k} "${p[k]}" is not a HISTORIC_DATE`);
  if (!ERAS.includes(p.era)) err(f, `era ${p.era}`);
  if (!p.region?.trim()) err(f, 'region required');
  if (!p.bio_short?.trim() || p.bio_short.length > 200) err(f, `bio_short length ${p.bio_short?.length}`);
  if (p.copyright_status !== 'public_domain') err(f, 'copyright_status must be public_domain');
  if (p.portrait && !(p.portrait_credit && p.portrait_url && p.portrait_caption)) err(f, 'portrait fields');
  for (const b of p.bibliography ?? []) { if (!b.title) err(f, 'bibliography title'); if (b.title_pa && !SHAHMUKHI.test(b.title_pa)) err(f, 'bibliography title_pa'); }
  if (!(p.bio_sources ?? []).length) err(f, 'no bio_sources');
  for (const s of p.bio_sources ?? []) if (!s.book || (s.url && !isUrl(s.url))) err(f, 'bio_source book/url');
}

for (const id of manifest.works) {
  const f = `works/${id}.md`;
  const w = front(`${C}/${f}`);
  if (!poets.has(w.poet)) err(f, `poet ${w.poet} missing`);
  if (!forms.has(w.form)) err(f, `form ${w.form} missing`);
  if (!['qissa', 'book', 'collection'].includes(w.kind)) err(f, `kind ${w.kind}`);
  if (!SHAHMUKHI.test(w.title ?? '') || !w.title_en) err(f, 'title / title_en');
  if (!w.source?.book || (w.source.url && !isUrl(w.source.url))) err(f, 'source');
}

const parts = {};
const firstLines = {};
for (const id of manifest.poems) {
  const f = `poems/${id}.md`;
  const p = front(`${C}/${f}`);
  if (!poets.has(p.poet)) err(f, `poet ${p.poet} missing`);
  if (!forms.has(p.form)) err(f, `form ${p.form} missing`);
  if (!SHAHMUKHI.test(p.title ?? '') || /[A-Za-z]{2,}/.test(p.title)) err(f, `title not clean Shahmukhi: ${p.title}`);
  if (!(p.verses ?? []).length) err(f, 'no verses');
  for (const v of p.verses ?? []) {
    if (!SHAHMUKHI.test(v.text ?? '')) err(f, `verse not Shahmukhi: ${v.text}`);
    if (/[A-Za-z]/.test(v.text)) err(f, `Latin letters in verse: ${v.text.slice(0, 60)}`);
    if (/[਀-੿]/.test(v.text)) err(f, 'Gurmukhi in verse');
  }
  if (!p.source?.book || !isUrl(p.source?.url ?? '')) err(f, 'source.book/url');
  if (!p.verification_note?.trim()) err(f, 'verification_note');
  if (p.work) {
    if (!works.has(p.work.id)) err(f, `work ${p.work.id} missing`);
    (parts[p.work.id] ??= []).push(p.work.n);
  }
  const k = `${p.poet}|${(p.verses?.[0]?.text ?? '').replace(/[^\p{L}]/gu, '')}`;
  (firstLines[k] ??= []).push(id);
}
for (const [w, ns] of Object.entries(parts)) {
  const s = [...ns].sort((a, b) => a - b);
  if (s.some((n, i) => n !== i + 1)) err(`works/${w}.md`, `parts not 1..${s.length} (unique, continuous)`);
}
const dups = Object.values(firstLines).filter((l) => l.length > 1);

console.log(`${poetsWritten.length} poets, ${manifest.works.length} works, ${manifest.poems.length} poems checked`);
if (dups.length) console.log(`${dups.length} groups of poems by one poet sharing a first verse (check):`, dups.slice(0, 10).map((d) => d.join(' = ')).join('\n  '));
if (errors.length) { console.log(errors.slice(0, 80).join('\n')); console.log(`${errors.length} errors`); process.exit(1); }
console.log('no errors');
