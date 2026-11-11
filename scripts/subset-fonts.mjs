#!/usr/bin/env node
/**
 * Download the OFL source fonts (once, into .cache/fonts-src) and write
 * subsetted WOFF2 files to public/fonts. Run: npm run fonts
 *
 * Fonts (all SIL Open Font License 1.1, from github.com/google/fonts):
 *   Noto Nastaliq Urdu  – Shahmukhi text (pinned to 400: Nastaliq is not set bold)
 *   Source Serif 4      – English display headings
 *   Inter               – English body text and UI
 */
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import subsetFont from 'subset-font';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, '.cache/fonts-src');
const OUT = join(ROOT, 'public/fonts');
const RAW = 'https://raw.githubusercontent.com/google/fonts/main/ofl';

/** Build a string containing every code point in the given ranges. */
const ranges = (...rs) =>
  rs
    .map(([a, b = a]) => {
      let s = '';
      for (let c = a; c <= b; c++) s += String.fromCodePoint(c);
      return s;
    })
    .join('');

const COMMON = [[0x20, 0x7e], [0xa0], [0x200c, 0x200f], [0x2010, 0x2014], [0x2018, 0x201d], [0x2026], [0x25cc]];

// Basic Latin + punctuation (most English pages need only this file).
const LATIN_CORE = [[0x20, 0x7e], [0xa0, 0xff], [0x131], [0x152, 0x153], [0x2c6], [0x2da], [0x2dc],
  [0x2000, 0x206f], [0x20ac], [0x2122], [0x2190, 0x2193], [0x2212], [0x2215], [0xfeff], [0xfffd]];
// Romanization diacritics (ā ī ū ṛ ṇ ṅ ñ ḍ ṭ ṣ ẖ …), IPA and combining marks.
const LATIN_EXT = [[0x100, 0x17f], [0x250, 0x2af], [0x2b0, 0x2ff], [0x300, 0x36f], [0x1e00, 0x1eff], [0x25cc]];

// Shahmukhi (ٹ ڈ ڑ ں ے ݨ ݪ ھ …). Presentation forms rarely appear in real text, so they go in ext.
const SHAHMUKHI_CORE = [...COMMON, [0x600, 0x6ff], [0x750, 0x77f]];
const SHAHMUKHI_EXT = [[0x8a0, 0x8ff], [0xfb50, 0xfdff], [0xfe70, 0xfeff]];


const NASTALIQ = 'notonastaliqurdu/NotoNastaliqUrdu[wght].ttf';
const SERIF = 'sourceserif4/SourceSerif4[opsz,wght].ttf';
const SANS = 'inter/Inter[opsz,wght].ttf';
const W = { wght: { min: 400, max: 700 } };

const FONTS = [
  { src: NASTALIQ, out: 'nastaliq-core.woff2', r: SHAHMUKHI_CORE, axes: { wght: 400 } },
  { src: NASTALIQ, out: 'nastaliq-ext.woff2', r: SHAHMUKHI_EXT, axes: { wght: 400 } },
  { src: SERIF, out: 'serif-core.woff2', r: LATIN_CORE, axes: { opsz: 32, ...W } },
  { src: SERIF, out: 'serif-ext.woff2', r: LATIN_EXT, axes: { opsz: 32, ...W } },
  { src: SANS, out: 'sans-core.woff2', r: LATIN_CORE, axes: { opsz: 14, ...W } },
  { src: SANS, out: 'sans-ext.woff2', r: LATIN_EXT, axes: { opsz: 14, ...W } },
];

/** CSS unicode-range value for a list of ranges (printed so fonts.css can be kept in sync). */
const cssRange = (rs) =>
  rs.map(([a, b]) => (b ? `U+${a.toString(16)}-${b.toString(16)}` : `U+${a.toString(16)}`)).join(', ');

const localName = (src) => src.split('/').pop();

async function fetchSource(src) {
  const path = join(SRC, localName(src));
  if (existsSync(path) && (await stat(path)).size > 10_000) return path;
  const url = `${RAW}/${src.split('/').map(encodeURIComponent).join('/')}`;
  console.log(`  downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  await writeFile(path, Buffer.from(await res.arrayBuffer()));
  return path;
}

await mkdir(SRC, { recursive: true });
await mkdir(OUT, { recursive: true });

for (const f of FONTS) {
  const path = await fetchSource(f.src);
  const input = await readFile(path);
  const output = await subsetFont(input, ranges(...f.r), { targetFormat: 'woff2', variationAxes: f.axes });
  await writeFile(join(OUT, f.out), output);
  console.log(`${f.out.padEnd(22)} ${(output.length / 1024).toFixed(0).padStart(4)} KB  unicode-range: ${cssRange(f.r)}`);
}
