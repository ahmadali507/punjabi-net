/**
 * App icons from the logo mark (public/favicon.svg): icon-192.png, icon-512.png (round mark on
 * transparent), icon-maskable-512.png (mark inside the maskable safe zone on the page colour).
 * Run once after the mark changes:  node scripts/icons.mjs
 */
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';

const svg = readFileSync('public/favicon.svg', 'utf8').replace(/<style>.*?<\/style>/, '');
const mark = svg.replace('<circle', '<circle fill="#23211d"').replace('<g ', '<g stroke="#c9962a" ');
const render = (s, size, out) => writeFileSync(out, new Resvg(s, { fitTo: { mode: 'width', value: size } }).render().asPng());

render(mark, 192, 'public/icon-192.png');
render(mark, 512, 'public/icon-512.png');
// Maskable: the whole square is painted; the mark sits in the central 80% safe zone.
const inner = mark.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
render(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="#23211d"/><g transform="translate(8 8)">${inner}</g></svg>`, 512, 'public/icon-maskable-512.png');
console.log('icons written');
