/**
 * Launch announcement reel (1080×1920 MP4, 30 fps) over an original orchestral score (music/announce.py).
 * Scenes sit on the score's bar lines: welcome (0), the poets (6.4), the numbers (12.8), what the site does
 * (19.2), "now live" with the domain (22.4) until the music rings out (29 s).
 *
 *   node social/instagram/announce.mjs [id]      # default a001-launch -> out/<id>.mp4 + out/<id>-reel.txt
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { parse } from 'yaml';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PY = process.env.PN_PY ?? join(homedir(), '.local/tts-venv/bin/python');
const FFMPEG = process.env.FFMPEG ?? join(homedir(), '.local/tools/bin/ffmpeg');
const FPS = 30;
const { chromium } = await import(process.env.PLAYWRIGHT_CORE ?? 'playwright-core');

const id = process.argv[2] ?? 'a001-launch';
const DIR = join(HERE, 'out', id);
mkdirSync(DIR, { recursive: true });

execFileSync(PY, [join(HERE, 'music', 'announce.py'), join(DIR, 'music.wav')], { stdio: 'inherit' });
const DUR = 29.0;

/* ---------- facts, counted from the content (never typed) ---------- */
const C = join(ROOT, 'src/content');
const md = (d) => readdirSync(join(C, d)).filter((f) => f.endsWith('.md'));
const nPoems = md('poems').length, nPoets = md('poets').length, nWorks = readdirSync(join(C, 'works')).length;
const front = (f) => parse(readFileSync(f, 'utf8').split(/^---$/m)[1]);
const POETS = ['baba-farid', 'shah-hussain', 'sultan-bahu', 'bulleh-shah', 'waris-shah', 'mian-muhammad-bakhsh']
  .map((p) => front(join(C, 'poets', `${p}.md`)).name);
const fmt = (n) => n.toLocaleString('en-US');

const font = (f) => `url(data:font/woff2;base64,${readFileSync(join(ROOT, 'public/fonts', f)).toString('base64')})`;
const LOGO = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 64 64"><circle cx="32" cy="32" r="31" fill="#23211d"/><g fill="none" stroke="#c9962a" stroke-width="3.6" stroke-linecap="round"><path class="w" pathLength="1" d="M18 17 q 3 -4.5 6 0 t 6 0 t 6 0 t 6 0"/><path class="w" pathLength="1" d="M15 24.5 q 4 -4.5 8 0 t 8 0 t 8 0 t 8 0"/><path class="w" pathLength="1" d="M12 32 q 5 -4.5 10 0 t 10 0 t 10 0 t 10 0"/><path class="w" pathLength="1" d="M15 39.5 q 4 -4.5 8 0 t 8 0 t 8 0 t 8 0"/><path class="w" pathLength="1" d="M18 47 q 3 -4.5 6 0 t 6 0 t 6 0 t 6 0"/></g></svg>`;

let seed = 5;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const motes = Array.from({ length: 30 }, () => `<i class="m" style="left:${(rnd() * 100).toFixed(1)}%;top:${(rnd() * 100).toFixed(1)}%;--s:${(2 + rnd() * 6).toFixed(1)}px;--o:${(0.12 + rnd() * 0.32).toFixed(2)}"></i>`).join('');

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
@font-face{font-family:N;src:${font('nastaliq-core.woff2')}}@font-face{font-family:N;src:${font('nastaliq-ext.woff2')}}
@font-face{font-family:S;src:${font('serif-core.woff2')};font-weight:400 700}@font-face{font-family:S;src:${font('serif-ext.woff2')};font-weight:400 700}
*{margin:0;box-sizing:border-box}
body{width:1080px;height:1920px;overflow:hidden;background:#f6f3ec;color:#23211d;position:relative;font-family:S}
.paper{position:absolute;inset:0;background:radial-gradient(80% 50% at 50% 38%,#fbf9f4,transparent 75%),radial-gradient(120% 60% at 50% 110%,rgba(133,92,0,.08),transparent 60%)}
.glow{position:absolute;left:50%;top:44%;width:1400px;height:1400px;margin:-700px;border-radius:50%;background:radial-gradient(circle,rgba(201,150,42,.22),transparent 60%);opacity:0}
.grain{position:absolute;inset:0;opacity:.35;mix-blend-mode:multiply}
.border{position:absolute;inset:44px;border:1.5px solid rgba(133,92,0,.28)}
.border2{position:absolute;inset:58px;border:1px solid rgba(133,92,0,.16)}
.m{position:absolute;width:var(--s);height:var(--s);border-radius:50%;background:rgba(133,92,0,var(--o));filter:blur(.6px)}
.loop{position:absolute;left:0;bottom:200px;width:1080px;height:420px}
.loop path{fill:none;stroke:rgba(133,92,0,.3);stroke-width:2.2;stroke-linecap:round}
.sc{position:absolute;inset:44px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 90px;opacity:0}
.k{font:600 30px S;letter-spacing:.32em;text-transform:uppercase;color:#855c00}
.rule{width:110px;height:2px;background:rgba(133,92,0,.45);margin:44px auto}
.pa{font-family:N;direction:rtl;color:#855c00;line-height:1.9}
.en{font:italic 400 44px/1.45 S;color:#4d4a44}
.w{stroke-dasharray:1 1;stroke-dashoffset:1}
/* 1 welcome */
#s1 .logo{margin-top:64px}
#s1 .name{font:700 124px S;margin-top:40px;letter-spacing:-.01em}
#s1 .hook{font:italic 400 44px S;color:#77736b;margin-top:16px}
#s1 .pa{font-size:120px;margin-top:50px}
.brand{position:absolute;top:120px;left:0;right:0;display:flex;align-items:center;justify-content:center;gap:18px;font:700 40px S;color:#23211d;opacity:0}
/* 2 poets */
#s2 .grid{display:grid;grid-template-columns:1fr 1fr;gap:70px 30px;margin-top:80px;width:100%}
#s2 .p{opacity:0}
#s2 .p .pa{font-size:86px;line-height:1.7;white-space:nowrap}
#s2 .p .pe{margin-top:22px;font:600 24px S;letter-spacing:.22em;text-transform:uppercase;color:#77736b}
#s2 .more{font:italic 400 44px S;color:#4d4a44;margin-top:90px;opacity:0}
/* 3 numbers */
#s3 .row{display:flex;flex-direction:column;gap:64px;margin-top:70px}
#s3 .n{opacity:0}
#s3 .v{font:700 150px/1 S;color:#23211d;font-variant-numeric:tabular-nums}
#s3 .l{font:600 28px S;letter-spacing:.3em;text-transform:uppercase;color:#855c00;margin-top:18px}
/* 4 what it does */
#s4 .f{opacity:0;margin:40px 0;display:flex;flex-direction:column;align-items:center}
#s4 .f .pa{font-size:96px;line-height:1.75}
#s4 .f .en{font-size:42px;margin-top:26px}
/* 5 live */
.live{display:inline-flex;align-items:center;gap:18px;font:700 32px S;letter-spacing:.34em;color:#855c00;text-transform:uppercase}
.dot{width:18px;height:18px;border-radius:50%;background:#c0392b;box-shadow:0 0 0 0 rgba(192,57,43,.5)}
#s5 .logo{margin-top:70px}
#s5 .name{font:700 112px S;margin-top:40px;letter-spacing:-.01em}
#s5 .hook{font:italic 400 42px S;color:#77736b;margin-top:16px}
#s5 .pa{font-size:76px;margin-top:40px}
#s5 .cta{margin-top:70px;font:600 30px S;letter-spacing:.18em;text-transform:uppercase;color:#f6f3ec;background:#23211d;border-radius:999px;padding:24px 56px}
</style></head><body>
<div class="paper"></div><div class="glow" id="glow"></div>
<svg class="grain" width="1080" height="1920"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .45  0 0 0 0 .35  0 0 0 0 .3  0 0 0 .5 0"/></filter><rect width="100%" height="100%" filter="url(#g)"/></svg>
<div class="border"></div><div class="border2"></div>
<div class="brand" id="brand">${LOGO(64)}<span>punjabii.net</span></div>
<div>${motes}</div>
<svg class="loop" viewBox="0 0 1080 420"><path id="loop" pathLength="1" d="M-20 300 C 160 260, 260 380, 420 320 S 640 120, 720 210 S 640 380, 560 300 S 700 140, 860 230 S 1000 330, 1110 260"/></svg>

<section class="sc" id="s1">
  <div class="live"><span class="dot"></span>Now live</div>
  <div class="logo">${LOGO(170)}</div>
  <div class="name">punjabii.net</div>
  <div class="hook">Punjabi poetry, in its own script</div>
  <div class="pa">جی آیاں نوں</div>
</section>

<section class="sc" id="s2">
  <div class="k">The poets of Punjab</div>
  <div class="grid">${POETS.map((p) => `<div class="p"><div class="pa">${p.pa}</div><div class="pe">${p.en}</div></div>`).join('')}</div>
  <div class="more">and ${nPoets - POETS.length} more</div>
</section>

<section class="sc" id="s3">
  <div class="k">Gathered in one place</div>
  <div class="row">
    <div class="n"><div class="v" data-to="${nPoems}">0</div><div class="l">poems</div></div>
    <div class="n"><div class="v" data-to="${nPoets}">0</div><div class="l">poets</div></div>
    <div class="n"><div class="v" data-to="${nWorks}">0</div><div class="l">complete works</div></div>
  </div>
</section>

<section class="sc" id="s4">
  <div class="f"><div class="pa">شاہ مکھی وچ</div><div class="en">In Shahmukhi, its own script</div></div>
  <div class="f"><div class="pa">ہر لفظ دے معنی</div><div class="en">The meaning of every word</div></div>
  <div class="f"><div class="pa">پورا کلام، اصل ماخذ</div><div class="en">Complete works, with sources</div></div>
</section>

<section class="sc" id="s5">
  <div class="live"><span class="dot"></span>Now live</div>
  <div class="logo">${LOGO(150)}</div>
  <div class="name">punjabii.net</div>
  <div class="hook">Punjabi poetry, in its own script</div>
  <div class="pa">پنجابی شاعری دا گھر</div>
  <div class="cta">Link in bio</div>
</section>
</body></html>`;

const browser = await chromium.launch().catch(() => {
  const dir = join(homedir(), '.cache', 'ms-playwright');
  const shell = readdirSync(dir).filter((d) => d.startsWith('chromium_headless_shell-')).sort().at(-1);
  return chromium.launch({ executablePath: join(dir, shell, 'chrome-headless-shell-linux64', 'chrome-headless-shell') });
});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.evaluate((DUR) => {
  const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
  const clamp = (x) => Math.min(1, Math.max(0, x));
  const ease = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2; };
  const out = (x) => 1 - (1 - clamp(x)) ** 3;
  // a scene: fades and rises in at a, holds, fades out by b
  const scene = (el, t, a, b) => {
    const i = out((t - a) / 0.7), o = b == null ? 0 : ease((t - (b - 0.5)) / 0.5);
    el.style.opacity = i * (1 - o);
    el.style.transform = `translateY(${(1 - i) * 30 - o * 20}px) scale(${1 + (1 - i) * 0.02})`;
  };
  const rise = (el, t, a, d = 0.6) => { const i = out((t - a) / d); el.style.opacity = i; el.style.transform = `translateY(${(1 - i) * 26}px)`; };
  const draw = (root, t, a, d = 1.6) => root.querySelectorAll('.w').forEach((p, k) => { p.style.strokeDashoffset = 1 - ease((t - a - k * 0.12) / d); });

  window.seek = (t) => {
    // ambient: motes drift up, the gold loop draws across the whole reel, a glow blooms at the finale
    $$('.m').forEach((m, i) => { m.style.transform = `translate(${(i % 2 ? 1 : -1) * (t / DUR) * (20 + i)}px,${-(t / DUR) * (110 + i * 6)}px)`; });
    const lp = $('#loop'); lp.style.strokeDasharray = '1 1'; lp.style.strokeDashoffset = 1 - ease(t / (DUR * 0.8));
    $('#glow').style.opacity = 0.9 * out((t - 22.2) / 1.2);
    $('#glow').style.transform = `scale(${0.85 + 0.15 * out((t - 22.2) / 2)})`;

    // the site first: most viewers never reach the end
    scene($('#s1'), t, 0, 6.4); draw($('#s1'), t, 0.1, 1.2);
    $$('#s1 > *').forEach((e, k) => rise(e, t, [0, 0.1, 0.3, 1.2, 2.4][k], 0.6));
    // the domain stays at the top through the middle scenes
    $('#brand').style.opacity = out((t - 6.2) / 0.6) * (1 - ease((t - 21.9) / 0.5));
    draw($('#brand'), t, 6.0, 0.8);

    scene($('#s2'), t, 6.3, 12.8);
    $$('#s2 .p').forEach((p, k) => rise(p, t, 6.9 + k * 0.55, 0.7));
    rise($('#s2 .more'), t, 10.6, 0.7);

    scene($('#s3'), t, 12.7, 19.2);
    $$('#s3 .n').forEach((n, k) => {
      rise(n, t, 13.2 + k * 0.8, 0.6);
      const v = n.querySelector('.v'), to = +v.dataset.to;
      v.textContent = Math.round(to * ease((t - 13.2 - k * 0.8) / 1.8)).toLocaleString('en-US');
    });

    scene($('#s4'), t, 19.1, 22.4);
    $$('#s4 .f').forEach((f, k) => rise(f, t, 19.3 + k * 0.7, 0.6));

    scene($('#s5'), t, 22.4, null); draw($('#s5'), t, 22.7, 1.4);
    const s5 = $$('#s5 > *');
    s5.forEach((e, k) => rise(e, t, 22.5 + k * 0.35, 0.7));
    const pulse = (t % 1.4) / 1.4;
    $$('.dot').forEach((d) => { d.style.boxShadow = `0 0 0 ${pulse * 16}px rgba(192,57,43,${0.45 * (1 - pulse)})`; });
  };
}, DUR);

const FR = join(DIR, 'frames');
rmSync(FR, { recursive: true, force: true });
mkdirSync(FR);
const frames = Math.ceil(DUR * FPS);
for (let fr = 0; fr < frames; fr++) {
  await page.evaluate((t) => window.seek(t), fr / FPS);
  await page.screenshot({ path: join(FR, `${String(fr).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 90 });
  if (fr % 150 === 0) process.stdout.write(`\rframe ${fr}/${frames}`);
}
await browser.close();
process.stdout.write('\n');

const mp4 = join(HERE, 'out', `${id}.mp4`);
execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(FR, '%05d.jpg'), '-i', join(DIR, 'music.wav'),
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', mp4]);
execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', join(FR, `${String(Math.round(25 * FPS)).padStart(5, '0')}.jpg`), '-q:v', '3', join(DIR, 'cover.jpg')]);
rmSync(FR, { recursive: true, force: true });

const caption = `punjabii.net is live 🤍

${fmt(nPoems)} Punjabi poems by ${nPoets} poets, from Baba Farid and Bulleh Shah to Waris Shah and Mian Muhammad Bakhsh, in Shahmukhi, with the meaning of every word. Link in bio.

#punjabi #punjabipoetry #پنجابی #پنجابی_شاعری #shahmukhi`;
writeFileSync(join(HERE, 'out', `${id}-reel.txt`), caption);
console.log(`${mp4}  (${DUR}s)\n---\n${caption}`);
