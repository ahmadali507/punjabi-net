/**
 * Reel (1080×1920 MP4, 30 fps): title card, then the verse revealed word by word, each word entering on
 * its own santoor note of an original score (music/compose.py), then the "coming soon" end card.
 *
 *   node social/instagram/video.mjs 001-bulleh-shah     # -> out/001-bulleh-shah.mp4 (+ -reel.txt caption)
 *
 * Needs ffmpeg, playwright-core (PLAYWRIGHT_CORE=/path/to/index.mjs) and the Python venv for the score
 * (PN_PY, default ~/.local/tts-venv/bin/python, with numpy + scipy).
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { parse } from 'yaml';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PY = process.env.PN_PY ?? join(homedir(), '.local/tts-venv/bin/python');
const FPS = 30;
const { chromium } = await import(process.env.PLAYWRIGHT_CORE ?? 'playwright-core');

const id = process.argv[2];
if (!id) throw new Error('usage: node social/instagram/video.mjs <post-id>');
const post = JSON.parse(readFileSync(join(HERE, 'posts.json'), 'utf8')).posts.find((p) => p.id === id);
if (post && !post.caption) throw new Error(`${id}: add a short hand-written "caption" to posts.json`);
const DIR = join(HERE, 'out', id);
mkdirSync(DIR, { recursive: true });

const front = (f) => parse(readFileSync(f, 'utf8').split(/^---$/m)[1]);
const poem = front(join(ROOT, 'src/content/poems', `${post.poem}.md`));
const poet = front(join(ROOT, 'src/content/poets', `${poem.poet}.md`));
const form = front(join(ROOT, 'src/content/forms', `${poem.form}.md`));
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const font = (f) => `url(data:font/woff2;base64,${readFileSync(join(ROOT, 'public/fonts', f)).toString('base64')})`;

/* ---------- text: stanzas of lines of words, straight from the poem file ---------- */
const stanzas = post.verses.map((vi) => {
  let lines = poem.verses[vi].text.split('\n');
  if (post.lines) lines = lines.slice(post.lines[0], post.lines[1] + 1);
  return { refrain: Boolean(poem.verses[vi].refrain), lines: lines.map((l) => l.split(/\s+/).filter(Boolean)) };
});

/* ---------- score ---------- */
// A sung recording from Instagram's music library when the post names one (song.py), else the original score.
if (post.track) execFileSync(PY, [join(HERE, 'song.py'), id], { stdio: 'inherit' });
else execFileSync(PY, [join(HERE, 'music/compose.py'), DIR, JSON.stringify(stanzas.map((s) => s.lines.map((l) => l.length))), '--seed', String(post.seed ?? 3)], { stdio: 'inherit' });
const timing = JSON.parse(readFileSync(join(DIR, 'timing.json'), 'utf8'));

/* ---------- page ---------- */
const LOGO = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 64 64"><circle cx="32" cy="32" r="31" fill="#23211d"/><g fill="none" stroke="#c9962a" stroke-width="3.6" stroke-linecap="round"><path d="M18 17 q 3 -4.5 6 0 t 6 0 t 6 0 t 6 0"/><path d="M15 24.5 q 4 -4.5 8 0 t 8 0 t 8 0 t 8 0"/><path d="M12 32 q 5 -4.5 10 0 t 10 0 t 10 0 t 10 0"/><path d="M15 39.5 q 4 -4.5 8 0 t 8 0 t 8 0 t 8 0"/><path d="M18 47 q 3 -4.5 6 0 t 6 0 t 6 0 t 6 0"/></g></svg>`;
let li = 0;
const verseHtml = stanzas.map((s, si) => `${si ? '<div class="gap"></div>' : ''}${s.lines.map((words) => {
  const n = li++;
  return `<p class="l${s.refrain ? ' r' : ''}" data-line="${n}">${words.map((w, wi) => `<span class="w" data-l="${n}" data-w="${wi}">${esc(w)}</span>`).join(' ')}</p>`;
}).join('')}`).join('');

// Dust motes: fixed seeds so every render is identical.
let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const motes = Array.from({ length: 26 }, () => `<i class="m" style="left:${(rnd() * 100).toFixed(1)}%;top:${(rnd() * 100).toFixed(1)}%;--s:${(2 + rnd() * 5).toFixed(1)}px;--o:${(0.15 + rnd() * 0.35).toFixed(2)}"></i>`).join('');

const html = `<!doctype html><html lang="pnb" dir="rtl"><head><meta charset="utf-8"><style>
@font-face{font-family:N;src:${font('nastaliq-core.woff2')}}@font-face{font-family:N;src:${font('nastaliq-ext.woff2')}}
@font-face{font-family:S;src:${font('serif-core.woff2')};font-weight:400 700}@font-face{font-family:S;src:${font('serif-ext.woff2')};font-weight:400 700}
*{margin:0;box-sizing:border-box}
body{width:1080px;height:1920px;overflow:hidden;background:#f6f3ec;color:#23211d;font-family:N;position:relative}
.paper{position:absolute;inset:0;background:radial-gradient(80% 50% at 50% 35%,#fbf9f4,transparent 75%),radial-gradient(120% 60% at 50% 110%,rgba(133,92,0,.07),transparent 60%)}
.grain{position:absolute;inset:0;opacity:.35;mix-blend-mode:multiply}
.border{position:absolute;inset:44px;border:1.5px solid rgba(133,92,0,.28)}
.border::after{content:"";position:absolute;inset:10px;border:1px solid rgba(133,92,0,.14)}
.m{position:absolute;width:var(--s);height:var(--s);border-radius:50%;background:rgba(133,92,0,var(--o));filter:blur(.6px)}
.loop{position:absolute;left:0;right:0;bottom:250px;width:1080px;height:420px}
.loop path{fill:none;stroke:rgba(133,92,0,.38);stroke-width:2.2;stroke-linecap:round}
.scene{position:absolute;inset:44px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.top{position:absolute;top:120px;left:0;right:0;display:flex;justify-content:center}
.kicker{font-size:40px;color:#855c00;opacity:.8}
.title{font-size:96px;line-height:1.7;color:#855c00;padding:0 60px;text-wrap:balance}
.rule{width:150px;height:2px;background:rgba(133,92,0,.5);margin:26px auto 30px}
.pname{font-size:66px;line-height:1.5}
.pen{direction:ltr;font:600 30px S;letter-spacing:.22em;text-transform:uppercase;color:#77736b;margin-top:8px}
#verseScene{position:absolute;inset:0}
.verse{position:absolute;inset:300px 90px 420px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center}
.l{font-size:var(--fs);line-height:1.95;text-wrap:balance}
.l.r{color:#855c00}
.w{display:inline-block;will-change:opacity,filter,transform}
.gap{height:40px}
.vfoot{position:absolute;bottom:170px;left:0;right:0;text-align:center}
.vfoot .pname{font-size:52px;color:#855c00}
.vfoot .pen{font-size:24px}
.end .name{direction:ltr;font:600 80px S;color:#23211d;margin-top:30px}
.end .hook{font-size:60px;line-height:1.9;margin-top:24px}
.end .hen{direction:ltr;font:400 38px S;color:#77736b}
.soon{margin-top:46px;padding:18px 60px 24px;border:2px solid #855c00;border-radius:40px;color:#855c00;font-size:50px;line-height:1.6;display:flex;flex-direction:column;align-items:center}
.soon span{direction:ltr;font:600 28px S;letter-spacing:.18em}
</style></head><body>
<div class="paper"></div>
<svg class="grain" width="1080" height="1920"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .45  0 0 0 0 .35  0 0 0 0 .3  0 0 0 .5 0"/></filter><rect width="100%" height="100%" filter="url(#g)"/></svg>
<div class="border"></div>
<div class="motes">${motes}</div>
<svg class="loop" viewBox="0 0 1080 420"><path id="loop" pathLength="1" d="M-20 300 C 160 260, 260 380, 420 320 S 640 120, 720 210 S 640 380, 560 300 S 700 140, 860 230 S 1000 330, 1110 260"/></svg>
<div class="top" id="toplogo">${LOGO(64)}</div>

<div class="scene" id="title">
  <div class="kicker">${esc(form.name.pa)}</div>
  <div class="title">${esc(poem.title)}</div>
  <div class="rule"></div>
  <div class="pname">${esc(poet.name.pa)}</div>
  <div class="pen">${esc(poet.name.en)}</div>
</div>

<div id="verseScene"><div class="verse" id="v">${verseHtml}</div>
  <div class="vfoot"><div class="pname">${esc(poet.name.pa)}</div><div class="pen">${esc(poet.name.en)}</div></div></div>

<div class="scene end" id="end">
  ${LOGO(110)}
  <div class="name">punjabi.net</div>
  <div class="hook">پنجابی شاعری پڑھن وچ تہاڈا ساتھی</div>
  <div class="hen">to help you read Punjabi poetry</div>
  <div class="soon">جلدی آ رہی اے<span>COMING SOON</span></div>
</div>
</body></html>`;

/* ---------- animation (Web Animations, driven frame by frame) ---------- */
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.evaluate((T) => {
  const ms = (s) => s * 1000;
  const a = (el, kf, start, dur, easing = 'cubic-bezier(.2,.7,.2,1)') => el.animate(kf, { delay: ms(start), duration: ms(dur), fill: 'both', easing });
  const total = T.duration;

  // fit the verse: largest size where every line wraps to at most two lines and the block fits
  const v = document.getElementById('v');
  const rows = (l) => new Set([...l.querySelectorAll('.w')].map((w) => Math.round(w.offsetTop / 10))).size;
  for (let fs = 104; fs >= 40; fs -= 2) {
    document.body.style.setProperty('--fs', `${fs}px`);
    const tall = [...v.querySelectorAll('.l')].some((l) => rows(l) > 2);
    if (!tall && v.scrollHeight <= v.clientHeight) break;
  }

  // ambient: drifting motes, the loop drawing itself
  document.querySelectorAll('.m').forEach((m, i) => a(m, [{ transform: 'translate(0,0)' }, { transform: `translate(${(i % 2 ? 1 : -1) * (20 + i)}px,-${120 + i * 6}px)` }], 0, total, 'linear'));
  a(document.querySelector('#loop'), [{ strokeDasharray: '1 1', strokeDashoffset: 1 }, { strokeDasharray: '1 1', strokeDashoffset: 0 }], 0.4, total * 0.8, 'ease-in-out');

  // title card
  const title = document.getElementById('title');
  [...title.children].forEach((c, i) => a(c, [{ opacity: 0, transform: 'translateY(18px)', filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], 0.5 + i * 0.35, 1.2));
  a(title, [{ opacity: 1 }, { opacity: 0, transform: 'scale(.98)' }], T.intro - 0.9, 0.8, 'ease-in');
  const logo = document.getElementById('toplogo');
  logo.animate([{ opacity: 0 }, { opacity: 0 }, { opacity: 1 }, { opacity: 1 }, { opacity: 0 }],
    { duration: ms(total), fill: 'both', offsets: undefined });
  logo.getAnimations()[0].effect.setKeyframes([
    { opacity: 0, offset: 0 }, { opacity: 0, offset: (T.intro - 0.4) / total }, { opacity: 1, offset: (T.intro + 0.4) / total },
    { opacity: 1, offset: (T.end_card - 0.2) / total }, { opacity: 0, offset: (T.end_card + 0.4) / total }, { opacity: 0, offset: 1 }]);

  // verse: every word enters on its note; earlier lines settle back once the next begins
  const scene = document.getElementById('verseScene');
  scene.animate([
    { opacity: 0, filter: 'blur(0)', offset: 0 }, { opacity: 0, filter: 'blur(0)', offset: (T.intro - 0.3) / total },
    { opacity: 1, filter: 'blur(0)', offset: (T.intro + 0.2) / total }, { opacity: 1, filter: 'blur(0)', offset: (T.end_card - 0.2) / total },
    { opacity: 0, filter: 'blur(4px)', offset: (T.end_card + 0.7) / total }, { opacity: 0, filter: 'blur(4px)', offset: 1 }],
    { duration: ms(total), fill: 'both' });
  a(v, [{ transform: 'scale(1)' }, { transform: 'scale(1.035)' }], T.intro, T.end_card - T.intro, 'linear');
  T.lines.forEach((line, n) => {
    line.words.forEach((t, w) => {
      const el = document.querySelector(`.w[data-l="${n}"][data-w="${w}"]`);
      if (el) a(el, [{ opacity: 0, filter: 'blur(10px)', transform: 'translateY(14px)' }, { opacity: 1, filter: 'blur(0)', transform: 'none' }], t - 0.08, 0.9);
    });
    const next = T.lines[n + 1];
    const p = document.querySelector(`.l[data-line="${n}"]`);
    if (next && p) a(p, [{ opacity: 1 }, { opacity: 0.5 }], next.start, 0.8, 'ease-out');
  });

  // end card
  const end = document.getElementById('end');
  [...end.children].forEach((c, i) => a(c, [{ opacity: 0, transform: 'translateY(18px)', filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], T.end_card + 0.5 + i * 0.3, 1.1));

  document.getAnimations().forEach((x) => x.pause());
  window.seek = (t) => document.getAnimations().forEach((x) => { x.currentTime = t * 1000; });
}, timing);

const FR = join(DIR, 'frames');
rmSync(FR, { recursive: true, force: true });
mkdirSync(FR);
const frames = Math.ceil(timing.duration * FPS);
for (let f = 0; f < frames; f++) {
  await page.evaluate((t) => window.seek(t), f / FPS);
  await page.screenshot({ path: join(FR, `${String(f).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 90 });
  if (f % 150 === 0) process.stdout.write(`\rframe ${f}/${frames}`);
}
await browser.close();
process.stdout.write('\n');

const out = join(HERE, 'out', `${id}.mp4`);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(FR, '%05d.jpg'), '-i', join(DIR, 'music.wav'),
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k',
  '-movflags', '+faststart', '-shortest', out]);
// cover: the verse fully written out
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(FR, `${String(Math.round((timing.end_card - 0.5) * FPS)).padStart(5, '0')}.jpg`), '-q:v', '3', join(DIR, 'cover.jpg')]);
rmSync(FR, { recursive: true, force: true });

/* ---------- caption: short and hand-written (the item's `caption` field); the video already shows the verse ---------- */
const caption = post.caption.trim();
writeFileSync(join(HERE, 'out', `${id}-reel.txt`), caption + '\n');
console.log(`${out}  (${timing.duration.toFixed(1)}s)`);
