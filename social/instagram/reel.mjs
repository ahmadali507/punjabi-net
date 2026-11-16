/**
 * Lyric Reel (1080×1920 MP4, 30 fps) in the pushto.net structure, with punjabi.net branding:
 * a singer's recording (song.py: the post's `track`, cut to the sung lines), one line per screen in
 * Shahmukhi with the previous line of the couplet faded above it, a short English gist under each couplet,
 * a "n / N" line counter with a progress rule, and a closing card with the poet's name.
 *
 *   node social/instagram/reel.mjs 002-baba-farid    # -> out/002-baba-farid.mp4 + out/002-baba-farid-reel.txt
 *
 * posts.json item: "kind": "reel", "style": "lyric", "track": {...}, "gists": ["<English for verse 1>", ...],
 * optional "singer" (overrides the track's artist name). The caption is built in the pushto.net format.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
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
if (!id) throw new Error('usage: node social/instagram/reel.mjs <post-id>');
const post = JSON.parse(readFileSync(join(HERE, 'posts.json'), 'utf8')).posts.find((p) => p.id === id);
if (!post) throw new Error(`${id}: not in posts.json`);
if (!post.track) throw new Error(`${id}: a lyric reel needs a "track" (the singer's recording)`);
const DIR = join(HERE, 'out', id);
mkdirSync(DIR, { recursive: true });

const front = (f) => parse(readFileSync(f, 'utf8').split(/^---$/m)[1]);
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const font = (f) => `url(data:font/woff2;base64,${readFileSync(join(ROOT, 'public/fonts', f)).toString('base64')})`;

/* ---------- lines straight from the poem files; each knows its verse (couplet) ---------- */
// One poem (post.poem/verses/gists) or several, in the order sung (post.parts: [{poem, verses, gists}]).
const parts = post.parts ?? [{ poem: post.poem, verses: post.verses, gists: post.gists, lines: post.lines }];
const poems = parts.map((pt) => front(join(ROOT, 'src/content/poems', `${pt.poem}.md`)));
const poem = poems[0];
const poet = front(join(ROOT, 'src/content/poets', `${poem.poet}.md`));
const lines = [], gists = [];
parts.forEach((pt, pi) => {
  if (!pt.gists || pt.gists.length !== pt.verses.length) throw new Error(`${id}: ${pt.poem}: one English "gists" entry per verse`);
  pt.verses.forEach((vi, k) => {
    let ls = poems[pi].verses[vi].text.split('\n');
    if (pt.lines) ls = ls.slice(pt.lines[0], pt.lines[1] + 1);
    gists.push(pt.gists[k]);
    ls.forEach((text, j) => lines.push({ text, verse: gists.length - 1, first: j % 2 === 0 })); // couplets: lines 1–2, 3–4, …
  });
});

/* ---------- audio + line times ---------- */
const FFMPEG = process.env.FFMPEG ?? join(homedir(), '.local/tools/bin/ffmpeg');
if (post.cuts) {
  // Each line sung once: pieces of the singer's recording (track seconds) joined with short crossfades.
  // cuts: [{from, to, lines: [track second where each of its lines starts]}]; post.end_at: track second the
  // last piece's singing ends (closing card from there); post.pad: quiet seconds added after the fade.
  const X = 0.3, src = join(HERE, 'out', 'tracks', `${post.track.id}.m4a`), meta = JSON.parse(readFileSync(join(HERE, 'out', 'tracks', `${post.track.id}.json`), 'utf8'));
  let at = 0;
  const T = { track: { id: post.track.id, title: meta.title, artist: meta.display_artist ?? meta.artist, cuts: post.cuts }, lines: [] };
  post.cuts.forEach((c, k) => {
    c.lines.forEach((t) => T.lines.push({ start: +(at + t - c.from).toFixed(3) }));
    if (k === post.cuts.length - 1) { T.end_card = +(at + post.end_at - c.from).toFixed(3); T.duration = +(at + c.to - c.from + (post.pad ?? 0)).toFixed(3); }
    at += c.to - c.from - X;
  });
  T.intro = T.lines[0].start;
  const f = post.cuts.map((c, k) => `[0:a]atrim=${c.from}:${c.to},asetpts=PTS-STARTPTS${k === 0 ? ',afade=t=in:d=0.4' : ''}[a${k}]`);
  let last = 'a0';
  for (let k = 1; k < post.cuts.length; k++) { f.push(`[${last}][a${k}]acrossfade=d=${X}:c1=tri:c2=tri[x${k}]`); last = `x${k}`; }
  // the last piece fades out at its end; `pad` seconds of quiet hold the closing card a little longer
  const audioEnd = T.duration - (post.pad ?? 0);
  f.push(`[${last}]afade=t=out:st=${(audioEnd - 1.8).toFixed(2)}:d=1.8,apad=whole_dur=${T.duration},aresample=44100[out]`);
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', src, '-filter_complex', f.join(';'), '-map', '[out]', '-ac', '2', join(DIR, 'music.wav')]);
  writeFileSync(join(DIR, 'timing.json'), JSON.stringify(T, null, 1));
} else if (process.argv.includes('--new') || !existsSync(join(DIR, 'timing.json')) || !existsSync(join(DIR, 'music.wav')))
  execFileSync(PY, [join(HERE, 'song.py'), id], { stdio: 'inherit' });
const T = JSON.parse(readFileSync(join(DIR, 'timing.json'), 'utf8'));
if (T.lines.length !== lines.length) throw new Error(`${id}: timing has ${T.lines.length} lines, the post has ${lines.length}`);
const singer = post.singer ?? T.track?.artist;
if (!singer) throw new Error(`${id}: no singer name (track artist or "singer")`);

/* ---------- page ---------- */
const LOGO = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 64 64"><circle cx="32" cy="32" r="31" fill="#23211d"/><g fill="none" stroke="#c9962a" stroke-width="3.6" stroke-linecap="round"><path d="M18 17 q 3 -4.5 6 0 t 6 0 t 6 0 t 6 0"/><path d="M15 24.5 q 4 -4.5 8 0 t 8 0 t 8 0 t 8 0"/><path d="M12 32 q 5 -4.5 10 0 t 10 0 t 10 0 t 10 0"/><path d="M15 39.5 q 4 -4.5 8 0 t 8 0 t 8 0 t 8 0"/><path d="M18 47 q 3 -4.5 6 0 t 6 0 t 6 0 t 6 0"/></g></svg>`;
const N = lines.length;
// one screen per line: the line, the couplet's earlier line faded above it, the couplet's gist below
const screens = lines.map((l, n) => `<section class="sc" data-n="${n}">
  <div class="stack">${!l.first ? `<p class="prev">${esc(lines[n - 1].text)}</p>` : ''}<p class="cur">${esc(l.text)}</p></div>
  <div class="rule"></div>
  <p class="gist">${esc(gists[l.verse])}</p>
</section>`).join('');

let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const motes = Array.from({ length: 22 }, () => `<i class="m" style="left:${(rnd() * 100).toFixed(1)}%;top:${(rnd() * 100).toFixed(1)}%;--s:${(2 + rnd() * 5).toFixed(1)}px;--o:${(0.12 + rnd() * 0.3).toFixed(2)}"></i>`).join('');

const html = `<!doctype html><html lang="pnb"><head><meta charset="utf-8"><style>
@font-face{font-family:N;src:${font('nastaliq-core.woff2')}}@font-face{font-family:N;src:${font('nastaliq-ext.woff2')}}
@font-face{font-family:S;src:${font('serif-core.woff2')};font-weight:400 700}@font-face{font-family:S;src:${font('serif-ext.woff2')};font-weight:400 700}
*{margin:0;box-sizing:border-box}
body{width:1080px;height:1920px;overflow:hidden;background:#f6f3ec;color:#23211d;position:relative}
.paper{position:absolute;inset:0;background:radial-gradient(80% 50% at 50% 35%,#fbf9f4,transparent 75%),radial-gradient(120% 60% at 50% 110%,rgba(133,92,0,.07),transparent 60%)}
.grain{position:absolute;inset:0;opacity:.35;mix-blend-mode:multiply}
.border{position:absolute;inset:44px;border:1.5px solid rgba(133,92,0,.28)}
.m{position:absolute;width:var(--s);height:var(--s);border-radius:50%;background:rgba(133,92,0,var(--o));filter:blur(.6px)}
.loop{position:absolute;left:0;bottom:250px;width:1080px;height:420px}
.loop path{fill:none;stroke:rgba(133,92,0,.32);stroke-width:2.2;stroke-linecap:round}
.brand{position:absolute;top:120px;left:104px;display:flex;align-items:center;gap:18px;font:700 34px S;color:#23211d}
.sc{position:absolute;left:44px;right:44px;top:330px;height:900px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 70px;opacity:0}
.stack{direction:rtl;font-family:N;display:flex;flex-direction:column;align-items:center}
.prev{font-size:var(--pfs);line-height:1.9;color:rgba(133,92,0,.42);margin-bottom:22px}
.cur{font-size:var(--fs);line-height:1.9;color:#855c00;text-wrap:balance}
.rule{width:96px;height:2px;background:rgba(133,92,0,.45);margin:40px auto 38px}
.gist{direction:ltr;font:italic 400 40px/1.5 S;color:#4d4a44;max-width:820px;text-wrap:balance}
.count{position:absolute;left:104px;right:104px;top:1470px;display:flex;align-items:center;gap:22px;direction:ltr;font:400 26px S;color:#77736b;letter-spacing:.12em}
.track{flex:1;height:2px;background:rgba(133,92,0,.18);position:relative}
.bar{position:absolute;left:0;top:-1px;height:4px;width:100%;background:#855c00;transform-origin:left;transform:scaleX(0)}
.end{position:absolute;inset:44px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;opacity:0}
.end .name{font:700 84px S;margin-top:34px}
.end .hook{direction:ltr;font:italic 400 36px S;color:#77736b;margin-top:14px}
.end .pname{font-family:N;font-size:64px;line-height:1.8;color:#855c00;margin-top:40px}
.end .pen{font:600 26px S;letter-spacing:.24em;text-transform:uppercase;color:#77736b}
</style></head><body>
<div class="paper"></div>
<svg class="grain" width="1080" height="1920"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .45  0 0 0 0 .35  0 0 0 0 .3  0 0 0 .5 0"/></filter><rect width="100%" height="100%" filter="url(#g)"/></svg>
<div class="border"></div>
<div>${motes}</div>
<svg class="loop" viewBox="0 0 1080 420"><path id="loop" pathLength="1" d="M-20 300 C 160 260, 260 380, 420 320 S 640 120, 720 210 S 640 380, 560 300 S 700 140, 860 230 S 1000 330, 1110 260"/></svg>
<div class="brand" id="brand">${LOGO(58)}<span>punjabi.net</span></div>
${screens}
<div class="count" id="count"><span id="num">1 / ${N}</span><div class="track"><div class="bar" id="bar"></div></div></div>
<div class="end" id="end">
  ${LOGO(130)}
  <div class="name">punjabi.net</div>
  <div class="hook">Punjabi poetry, in its own script</div>
  <div class="pname">${esc(poet.name.pa)}</div>
  <div class="pen">${esc(poet.name.en)}</div>
</div>
</body></html>`;

/* ---------- animation (Web Animations, seeked frame by frame) ---------- */
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(({ T, N }) => {
  const total = T.duration, ms = (s) => s * 1000, f = (t) => Math.min(1, Math.max(0, t / total));
  const tl = (el, kf) => el.animate(kf, { duration: ms(total), fill: 'both' });

  // every line on one row if it fits at a readable size, else at most two
  const rows = (p) => Math.round(p.getBoundingClientRect().height / (parseFloat(getComputedStyle(p).fontSize) * 1.9));
  for (let fs = 92; fs >= 48; fs -= 2) {
    document.body.style.setProperty('--fs', `${fs}px`);
    document.body.style.setProperty('--pfs', `${Math.round(fs * 0.72)}px`);
    const cur = [...document.querySelectorAll('.sc')].map((s) => { s.style.opacity = 1; const r = rows(s.querySelector('.cur')); s.style.opacity = ''; return r; });
    if (cur.every((r) => r <= 1) || (fs <= 70 && cur.every((r) => r <= 2))) break;
  }

  // ambient
  document.querySelectorAll('.m').forEach((m, i) => m.animate([{ transform: 'none' }, { transform: `translate(${(i % 2 ? 1 : -1) * (20 + i)}px,-${110 + i * 6}px)` }], { duration: ms(total), fill: 'both' }));
  document.querySelector('#loop').animate([{ strokeDasharray: '1 1', strokeDashoffset: 1 }, { strokeDasharray: '1 1', strokeDashoffset: 0 }], { duration: ms(total * 0.85), delay: 300, fill: 'both', easing: 'ease-in-out' });

  // screens: line n is on from its start (the first from 0.3 s) until line n+1 starts; the last until the end card
  const on = T.lines.map((l, n) => (n === 0 ? 0.3 : l.start - 0.25));
  const off = T.lines.map((l, n) => (n + 1 < N ? on[n + 1] : T.end_card));
  document.querySelectorAll('.sc').forEach((s, n) => {
    const a = on[n], b = off[n], sameCouplet = n + 1 < N && document.querySelector(`.sc[data-n="${n + 1}"] .prev`);
    tl(s, [{ opacity: 0, transform: 'translateY(16px)', offset: 0 }, { opacity: 0, transform: 'translateY(16px)', offset: f(a) },
      { opacity: 1, transform: 'none', offset: f(a + 0.6) }, { opacity: 1, transform: 'none', offset: f(b - 0.35) },
      { opacity: 0, transform: sameCouplet ? 'none' : 'translateY(-12px)', offset: f(b + 0.15) }, { opacity: 0, transform: 'none', offset: 1 }]);
  });

  // counter + progress rule
  const num = document.getElementById('num');
  window.counter = (t) => { let n = 0; while (n + 1 < N && t >= on[n + 1]) n++; num.textContent = `${n + 1} / ${N}`; };
  tl(document.getElementById('bar'), [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)', offset: f(T.end_card) }, { transform: 'scaleX(1)' }]);
  for (const id of ['count', 'brand']) tl(document.getElementById(id), [{ opacity: 1, offset: 0 }, { opacity: 1, offset: f(T.end_card - 0.3) }, { opacity: 0, offset: f(T.end_card + 0.4) }, { opacity: 0, offset: 1 }]);

  // closing card
  const end = document.getElementById('end');
  tl(end, [{ opacity: 0, offset: 0 }, { opacity: 0, offset: f(T.end_card + 0.2) }, { opacity: 1, offset: f(T.end_card + 1.0) }, { opacity: 1, offset: 1 }]);

  document.getAnimations().forEach((x) => x.pause());
  window.seek = (t) => { document.getAnimations().forEach((x) => { x.currentTime = t * 1000; }); window.counter(t); };
}, { T, N });

const FR = join(DIR, 'frames');
rmSync(FR, { recursive: true, force: true });
mkdirSync(FR);
const frames = Math.ceil(T.duration * FPS);
for (let fr = 0; fr < frames; fr++) {
  await page.evaluate((t) => window.seek(t), fr / FPS);
  await page.screenshot({ path: join(FR, `${String(fr).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 90 });
  if (fr % 150 === 0) process.stdout.write(`\rframe ${fr}/${frames}`);
}
await browser.close();
process.stdout.write('\n');

const out = join(HERE, 'out', `${id}.mp4`);
execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(FR, '%05d.jpg'), '-i', join(DIR, 'music.wav'),
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k',
  '-movflags', '+faststart', '-shortest', out]);
// cover: the first couplet, complete
const coverAt = T.lines.length > 1 && lines[1] && !lines[1].first ? T.lines[1].start + 1.5 : 2;
execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', join(FR, `${String(Math.min(frames - 1, Math.round(coverAt * FPS))).padStart(5, '0')}.jpg`), '-q:v', '3', join(DIR, 'cover.jpg')]);
rmSync(FR, { recursive: true, force: true });

/* ---------- caption, pushto.net format: title | poet, singer / credit / tags ---------- */
const caption = `${poem.title} | ${poet.name.pa} (${poet.name.en}), sung by ${singer}

Vocals: ${singer}. Poetry: ${poet.name.en}. All credit to the artist.

#punjabi #punjabipoetry #پنجابی #پنجابی_شاعری #poetry`;
writeFileSync(join(HERE, 'out', `${id}-reel.txt`), caption + '\n');
console.log(`${out}  (${T.duration.toFixed(1)}s)\n---\n${caption}`);
