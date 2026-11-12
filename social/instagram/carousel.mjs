/**
 * Render a carousel (1080×1350 slides, site palette) from social/instagram/carousels.json.
 * Verse text always comes from the poem files; only the cover/closing lines and English gists are written here.
 *
 *   PLAYWRIGHT_CORE=… node social/instagram/carousel.mjs c001-maan-boli
 * Writes out/<id>/slide-1.jpg … and out/<id>/caption.txt
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const font = (f) => `url(data:font/woff2;base64,${readFileSync(join(ROOT, 'public/fonts', f)).toString('base64')})`;
const { chromium } = await import(process.env.PLAYWRIGHT_CORE ?? 'playwright-core');
const front = (f) => parse(readFileSync(f, 'utf8').split(/^---$/m)[1]);
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const paDigits = (n) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

const id = process.argv[2];
const post = JSON.parse(readFileSync(join(HERE, 'carousels.json'), 'utf8')).carousels.find((c) => c.id === id);
if (!post) throw new Error(`no carousel ${id}`);
const OUT = join(HERE, 'out', id);
mkdirSync(OUT, { recursive: true });

const LOGO = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 64 64"><circle cx="32" cy="32" r="31" fill="#23211d"/><g fill="none" stroke="#c9962a" stroke-width="3.6" stroke-linecap="round"><path d="M18 17 q 3 -4.5 6 0 t 6 0 t 6 0 t 6 0"/><path d="M15 24.5 q 4 -4.5 8 0 t 8 0 t 8 0 t 8 0"/><path d="M12 32 q 5 -4.5 10 0 t 10 0 t 10 0 t 10 0"/><path d="M15 39.5 q 4 -4.5 8 0 t 8 0 t 8 0 t 8 0"/><path d="M18 47 q 3 -4.5 6 0 t 6 0 t 6 0 t 6 0"/></g></svg>`;
const FLOURISH = `<svg width="260" height="24" viewBox="0 0 260 24"><path d="M4 12 H104 M156 12 H256" stroke="rgba(133,92,0,.45)" stroke-width="1.6"/><path d="M130 3 L139 12 L130 21 L121 12 Z" fill="none" stroke="#855c00" stroke-width="1.6"/><circle cx="112" cy="12" r="2.4" fill="#c9962a"/><circle cx="148" cy="12" r="2.4" fill="#c9962a"/></svg>`;

const CSS = `
@font-face{font-family:N;src:${font('nastaliq-core.woff2')}}@font-face{font-family:N;src:${font('nastaliq-ext.woff2')}}
@font-face{font-family:S;src:${font('serif-core.woff2')};font-weight:400 700}@font-face{font-family:S;src:${font('serif-ext.woff2')};font-weight:400 700}
*{margin:0;box-sizing:border-box}
body{width:1080px;height:1350px;overflow:hidden;background:#f6f3ec;color:#23211d;font-family:N;position:relative}
.paper{position:absolute;inset:0;background:radial-gradient(80% 55% at 50% 40%,#fbf9f4,transparent 75%),radial-gradient(120% 60% at 50% 115%,rgba(133,92,0,.08),transparent 60%)}
.grain{position:absolute;inset:0;opacity:.32;mix-blend-mode:multiply}
.border{position:absolute;inset:40px;border:1.5px solid rgba(133,92,0,.3)}
.border::after{content:"";position:absolute;inset:10px;border:1px solid rgba(133,92,0,.14)}
.top{position:absolute;top:84px;left:0;right:0;display:flex;justify-content:center}
.count{position:absolute;bottom:78px;left:0;right:0;text-align:center;direction:ltr;font:600 20px S;letter-spacing:.3em;color:rgba(133,92,0,.6)}
.scene{position:absolute;inset:150px 96px 120px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.kicker{font-size:36px;color:#855c00;opacity:.85}
.l{font-size:var(--fs);line-height:1.95;text-wrap:balance}
.gap{height:18px}
.verse{width:100%;display:flex;flex-direction:column;align-items:center;margin:18px 0 6px}
.gist{direction:ltr;font:italic 400 27px/1.5 S;color:#6d675d;max-width:820px;text-wrap:balance;margin-top:22px}
.pname{font-size:50px;line-height:1.9;color:#855c00;margin-top:18px}
.pen{direction:ltr;font:600 22px S;letter-spacing:.24em;text-transform:uppercase;color:#77736b;margin-top:14px}
.hero{font-size:120px;line-height:1.75;color:#855c00;text-wrap:balance}
.sub{font-size:56px;line-height:1.9;margin-top:10px}
.en{direction:ltr;font:400 34px/1.45 S;color:#6d675d;margin-top:14px;text-wrap:balance}
.swipe{position:absolute;bottom:130px;left:0;right:0;text-align:center;direction:ltr;font:600 22px S;letter-spacing:.28em;color:#855c00}
.close{font-size:54px;line-height:1.9;margin-top:6px}
.name{direction:ltr;font:600 46px S;margin-top:20px}
.soon{margin-top:22px;padding:10px 44px 14px;border:2px solid #855c00;border-radius:40px;color:#855c00;font-size:36px;line-height:1.6;display:flex;flex-direction:column;align-items:center}
.soon span{direction:ltr;font:600 20px S;letter-spacing:.2em}
`;
const BG = `<div class="paper"></div><svg class="grain" width="1080" height="1350"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .45  0 0 0 0 .35  0 0 0 0 .3  0 0 0 .5 0"/></filter><rect width="100%" height="100%" filter="url(#g)"/></svg><div class="border"></div>`;

function verseBlock(s) {
  const poem = front(join(ROOT, 'src/content/poems', `${s.poem}.md`));
  const poet = front(join(ROOT, 'src/content/poets', `${poem.poet}.md`));
  const form = front(join(ROOT, 'src/content/forms', `${poem.form}.md`));
  const stanzas = s.verses.map((vi) => {
    if (!poem.verses[vi]) throw new Error(`${s.poem}: no verse ${vi}`);
    return poem.verses[vi].text.split('\n');
  });
  const lines = stanzas.map((ls) => ls.map((l) => `<p class="l">${esc(l)}</p>`).join('')).join('<div class="gap"></div>');
  return { poem, poet, form, stanzas, html: `<div class="kicker">${esc(form.name.pa)}</div><div class="verse" id="v">${lines}</div>${FLOURISH}<div class="pname">${esc(poet.name.pa)}</div><div class="pen">${esc(poet.name.en)}</div>${s.gist ? `<div class="gist">${esc(s.gist)}</div>` : ''}` };
}

const total = post.slides.length;
const slides = post.slides.map((s, i) => {
  let inner;
  let meta = null;
  if (s.kind === 'cover') {
    inner = `<div class="hero">${esc(s.title)}</div>${FLOURISH}<div class="sub">${esc(s.sub)}</div><div class="en">${esc(s.en)}</div>`;
  } else {
    meta = verseBlock(s);
    inner = meta.html;
    if (s.kind === 'closing') inner += `<div style="height:34px"></div>${FLOURISH}<div class="close">${esc(s.close)}</div><div class="name">punjabi.net</div><div class="soon">جلدی آ رہی اے<span>COMING SOON</span></div>`;
  }
  const extra = s.kind === 'cover' ? `<div class="swipe">SWIPE &nbsp;→</div>` : '';
  return { s, meta, html: `<!doctype html><html lang="pnb" dir="rtl"><head><meta charset="utf-8"><style>${CSS}</style></head><body>${BG}<div class="top">${LOGO(s.kind === 'cover' ? 84 : 56)}</div><div class="scene" id="scene">${inner}</div>${extra}<div class="count">${i + 1} / ${total}</div></body></html>` };
});

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
for (const [i, { s, html }] of slides.entries()) {
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  // Largest verse size that keeps every line on one row and the slide inside its frame.
  await page.evaluate((max) => {
    const sc = document.getElementById('scene');
    const v = document.getElementById('v');
    for (let fs = max; fs >= 34; fs -= 2) {
      document.body.style.setProperty('--fs', `${fs}px`);
      const oneRow = !v || [...v.querySelectorAll('.l')].every((l) => l.getClientRects().length <= 1 && l.scrollWidth <= v.clientWidth + 1 && l.offsetHeight < fs * 2.4);
      if (oneRow && sc.scrollHeight <= sc.clientHeight + 1) return;
    }
  }, s.kind === 'closing' ? 56 : 76);
  await page.screenshot({ path: join(OUT, `slide-${i + 1}.jpg`), type: 'jpeg', quality: 93 });
}
await browser.close();

// caption: the verses as text (from the poem files), credits, mission, tags
const verses = slides.filter((x) => x.meta).map(({ meta, s }) => `${meta.stanzas.map((l) => l.join('\n')).join('\n')}\n— ${meta.poet.name.pa} · ${meta.poet.name.en}${s.gist ? `\n${s.gist}` : ''}`);
const caption = [post.caption_top, '', ...verses.flatMap((v) => [v, '']), post.caption_end, '', post.tags].join('\n');
writeFileSync(join(OUT, 'caption.txt'), caption.trim() + '\n');
console.log(`rendered ${total} slides → ${OUT}`);
