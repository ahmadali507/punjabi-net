/**
 * Render Instagram posts (1080×1350 PNG + caption .txt) from social/instagram/posts.json.
 * The verse text always comes from the poem file, so nothing is retyped.
 *
 * Uses the site's fonts (public/fonts) and playwright-core (PLAYWRIGHT_CORE=/path/to/playwright-core/index.mjs if it isn't installed here).
 *
 *   node social/instagram/render.mjs            # all posts
 *   node social/instagram/render.mjs 001-bulleh-shah
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const OUT = join(HERE, 'out');
// The site's own font files, embedded so the page needs no server.
const font = (f) => `url(data:font/woff2;base64,${readFileSync(join(ROOT, 'public/fonts', f)).toString('base64')})`;
const FONTS = { nc: font('nastaliq-core.woff2'), ne: font('nastaliq-ext.woff2'), sc: font('serif-core.woff2'), se: font('serif-ext.woff2') };
const { chromium } = await import(process.env.PLAYWRIGHT_CORE ?? 'playwright-core');

const front = (file) => parse(readFileSync(file, 'utf8').split(/^---$/m)[1]);
const poemOf = (id) => front(join(ROOT, 'src/content/poems', `${id}.md`));
const poetOf = (id) => front(join(ROOT, 'src/content/poets', `${id}.md`));
const formOf = (id) => front(join(ROOT, 'src/content/forms', `${id}.md`));
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const TAGS = {
  'bulleh-shah': '#BullehShah #بلھے_شاہ', 'baba-farid': '#BabaFarid #بابا_فرید', 'sultan-bahu': '#SultanBahu #سلطان_باہو',
  'waris-shah': '#WarisShah #وارث_شاہ #HeerRanjha', 'shah-hussain': '#ShahHussain #شاہ_حسین',
  'mian-muhammad-bakhsh': '#MianMuhammadBakhsh', 'hashim-shah': '#HashimShah', 'bhai-vir-singh': '#BhaiVirSingh',
};

/** The lines of a post: chosen verses (and optionally a slice of lines within them). */
function linesOf(post, poem) {
  const out = [];
  post.verses.forEach((vi, n) => {
    const v = poem.verses[vi];
    if (!v) throw new Error(`${post.id}: verse ${vi} not in ${post.poem}`);
    let lines = v.text.split('\n');
    if (post.lines) lines = lines.slice(post.lines[0], post.lines[1] + 1);
    if (n > 0) out.push({ gap: true });
    for (const l of lines) out.push({ text: l, refrain: v.refrain });
  });
  return out;
}

function sourceLine(src) {
  if (src.book.startsWith('Wikisource')) return 'Text: public-domain transcription, Wikisource (Punjabi).';
  if (src.book === 'Matak Hulare') return 'Text: Bhai Vir Singh, Matak Hulare (Shahmukhi transliteration).';
  return `Text: ${src.book}${src.year ? ` (${src.year})` : ''}.`;
}

function caption(post, poem, poet, form, lines) {
  const verse = lines.map((l) => (l.gap ? '' : l.text)).join('\n');
  return [
    `${poem.title}`,
    `— ${poet.name.pa} · ${poet.name.en}`,
    '',
    verse,
    '',
    `${form.name.pa} · ${form.name.en}`,
    'پورا کلام، ہر لفظ دے معنی نال، punjabi.net تے (لنک بائیو وچ)۔',
    'Read the full poem, with the meaning of every word, on punjabi.net (link in bio).',
    '',
    sourceLine(poem.source),
    '',
    `#PunjabiPoetry #پنجابی_شاعری #Shahmukhi #شاہ_مکھی #PunjabiSufiPoetry ${TAGS[poem.poet] ?? ''}`.trim(),
  ].join('\n');
}

function html(poem, poet, form, lines) {
  const body = lines
    .map((l) => (l.gap ? '<div class="gap">◆</div>' : `<p class="${l.refrain ? 'l r' : 'l'}">${esc(l.text)}</p>`))
    .join('');
  return `<!doctype html><html lang="pnb" dir="rtl"><head><meta charset="utf-8"><style>
@font-face{font-family:N;src:${FONTS.nc}}@font-face{font-family:N;src:${FONTS.ne}}
@font-face{font-family:S;src:${FONTS.sc};font-weight:400 700}@font-face{font-family:S;src:${FONTS.se};font-weight:400 700}
*{margin:0;box-sizing:border-box}
body{width:1080px;height:1350px;overflow:hidden;background:#17140f;color:#efe7d6;font-family:N;position:relative}
.bg{position:absolute;inset:0;background:
 radial-gradient(60% 40% at 50% 8%,rgba(201,150,42,.16),transparent 70%),
 radial-gradient(50% 35% at 50% 100%,rgba(201,150,42,.10),transparent 70%),
 repeating-linear-gradient(180deg,transparent 0 63px,rgba(239,231,214,.035) 63px 64px)}
.frame{position:absolute;inset:44px;border:1.5px solid rgba(201,150,42,.35);border-radius:6px}
.wrap{position:absolute;inset:44px;display:flex;flex-direction:column;align-items:center;padding:56px 72px 48px}
.top{display:flex;align-items:center;gap:14px;direction:ltr;font:600 30px S;color:#efe7d6;letter-spacing:.01em}
.form{margin-top:30px;color:#d6a640;font-size:36px}
.verse{flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column;justify-content:center;align-items:center;width:100%;text-align:center}
.l{font-size:var(--fs);line-height:2.05;white-space:nowrap}
.wrapok .l{white-space:normal;text-wrap:balance;line-height:1.9;margin-bottom:.35em}
.r{color:#e2b85a}
.gap{color:rgba(201,150,42,.7);font:22px S;margin:10px 0 6px}
.poet{font-size:52px;line-height:1.6;color:#efe7d6}
.poet-en{direction:ltr;font:italic 400 28px S;color:rgba(239,231,214,.66);margin-top:2px}
.rule{width:120px;height:1.5px;background:rgba(201,150,42,.55);margin:28px 0 22px}
.foot{direction:ltr;font:400 24px S;color:rgba(239,231,214,.55);margin-top:26px;letter-spacing:.04em}
</style></head><body><div class="bg"></div><div class="frame"></div><div class="wrap">
<div class="top"><svg width="46" height="46" viewBox="0 0 64 64"><circle cx="32" cy="32" r="31" fill="#efe7d6"/><g fill="none" stroke="#a87717" stroke-width="3.6" stroke-linecap="round"><path d="M18 17 q 3 -4.5 6 0 t 6 0 t 6 0 t 6 0"/><path d="M15 24.5 q 4 -4.5 8 0 t 8 0 t 8 0 t 8 0"/><path d="M12 32 q 5 -4.5 10 0 t 10 0 t 10 0 t 10 0"/><path d="M15 39.5 q 4 -4.5 8 0 t 8 0 t 8 0 t 8 0"/><path d="M18 47 q 3 -4.5 6 0 t 6 0 t 6 0 t 6 0"/></g></svg>punjabi.net</div>
<div class="form">${esc(form.name.pa)}</div>
<div class="verse" id="v">${body}</div>
<div class="rule"></div>
<div class="poet">${esc(poet.name.pa)}</div>
<div class="poet-en">${esc(poet.name.en)}</div>
<div class="foot">FULL POEM WITH WORD MEANINGS · PUNJABI.NET</div>
</div></body></html>`;
}

const queue = JSON.parse(readFileSync(join(HERE, 'posts.json'), 'utf8')).posts;
const only = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
for (const post of queue.filter((p) => !only.length || only.includes(p.id))) {
  const poem = poemOf(post.poem);
  const poet = poetOf(poem.poet);
  const form = formOf(poem.form);
  const lines = linesOf(post, poem);
  await page.setContent(html(poem, poet, form, lines), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  // Largest type size (72px down) at which every line fits the width and the block fits the height.
  await page.evaluate(() => {
    const v = document.getElementById('v');
    // Long lines (a bait's misra) wrap onto two balanced lines rather than shrinking below 54px.
    const fits = () => ![...v.querySelectorAll('.l')].some((l) => l.scrollWidth > v.clientWidth) && v.scrollHeight <= v.clientHeight + 1;
    for (const wrap of [false, true]) {
      v.classList.toggle('wrapok', wrap);
      for (let fs = 72; fs >= (wrap ? 36 : 54); fs -= 2) {
        document.body.style.setProperty('--fs', `${fs}px`);
        if (fits()) return;
      }
    }
  });
  await page.screenshot({ path: join(OUT, `${post.id}.png`) });
  await page.screenshot({ path: join(OUT, `${post.id}.jpg`), type: 'jpeg', quality: 92 }); // what Instagram gets
  writeFileSync(join(OUT, `${post.id}.txt`), caption(post, poem, poet, form, lines) + '\n');
  console.log(`rendered ${post.id}`);
}
await browser.close();
