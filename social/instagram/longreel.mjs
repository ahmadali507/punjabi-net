/**
 * Long-form lyric Reel (1080×1920, 30 fps, up to ~3 min): one or two long continuous passages of a singer's
 * recording (repeats kept, so the music flows), joined by a single slow crossfade; full-screen illustrated
 * scenes (scenes_v.mjs) that crossfade and drift with parallax; each sung line in Shahmukhi with an English
 * line under it and a gold rule that sweeps while it is sung; the singer's spoken asides shown in English.
 *
 *   node social/instagram/longreel.mjs 032-bulleh-yaar-raazi   # -> out/<id>.mp4, out/<id>-reel.txt, out/<id>/cover.jpg
 *   add --resume to keep the frames an interrupted render already wrote
 *
 * posts.json item ("form": "long"):
 *   segments: [{from, to}] track seconds, played in order; xfade: seconds of crossfade between them
 *   lines: {KEY: {pa, en}}; screens: [{at (track s), kind: title|line|spoken|end, line?, prev?, en?, scene}]
 *   movements: [{at, pa, en}] the small label under the brand
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { scene } from './scenes_v.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const FPS = 30;
const FFMPEG = process.env.FFMPEG ?? join(homedir(), '.local/tools/bin/ffmpeg');
const { chromium } = await import(process.env.PLAYWRIGHT_CORE ?? 'playwright-core');

const id = process.argv[2];
const post = JSON.parse(readFileSync(join(HERE, 'posts.json'), 'utf8')).posts.find((p) => p.id === id);
if (!post || post.form !== 'long') throw new Error(`${id}: not a long-form post`);
const DIR = join(HERE, 'out', id);
mkdirSync(DIR, { recursive: true });
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const font = (f) => `url(data:font/woff2;base64,${readFileSync(join(ROOT, 'public/fonts', f)).toString('base64')})`;

/* ---------- audio: continuous passages, one crossfade between each ---------- */
const X = post.xfade ?? 1.5, segs = post.segments;
const offs = [];
let acc = 0;
segs.forEach((g, k) => { offs.push(acc - g.from); acc += g.to - g.from - (k + 1 < segs.length ? X : 0); });
const DUR = +acc.toFixed(3);
const map = (t) => { const k = segs.findIndex((g) => t >= g.from - 0.01 && t <= g.to + 0.01); if (k < 0) throw new Error(`track time ${t} is in no segment`); return +(t + offs[k]).toFixed(3); };
const src = join(HERE, 'out', 'tracks', `${post.track.id}.m4a`);
const fc = segs.map((g, k) => `[0:a]atrim=${g.from}:${g.to},asetpts=PTS-STARTPTS${k === 0 ? ',afade=t=in:d=0.8' : ''}[a${k}]`);
let last = 'a0';
for (let k = 1; k < segs.length; k++) { fc.push(`[${last}][a${k}]acrossfade=d=${X}:c1=qsin:c2=qsin[x${k}]`); last = `x${k}`; }
fc.push(`[${last}]afade=t=out:st=${(DUR - 2.4).toFixed(2)}:d=2.4,aresample=44100[out]`);
execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', src, '-filter_complex', fc.join(';'), '-map', '[out]', '-ac', '2', join(DIR, 'music.wav')]);
const meta = JSON.parse(readFileSync(join(HERE, 'out', 'tracks', `${post.track.id}.json`), 'utf8'));

/* ---------- timeline ---------- */
const scr = post.screens.map((x) => ({ ...x, t: map(x.at) }));
scr.forEach((x, i) => { x.t1 = i + 1 < scr.length ? scr[i + 1].t : DUR; });
const endAt = scr.find((x) => x.kind === 'end').t;
// scene runs: consecutive screens with the same scene share one drawing
const runs = [];
scr.forEach((x) => { if (x.kind === 'end') return; const r = runs.at(-1); if (r && r.name === x.scene) r.t1 = x.t1; else runs.push({ name: x.scene, t0: x.t, t1: x.t1 }); });
runs.at(-1).t1 = endAt;
writeFileSync(join(DIR, 'timing.json'), JSON.stringify({ duration: DUR, end_card: endAt, track: { id: post.track.id, title: meta.title, artist: meta.display_artist, segments: segs }, screens: scr.map(({ t, t1, kind, line, scene: sc }) => ({ t, t1, kind, line, scene: sc })) }, null, 1));

/* ---------- page ---------- */
const L = post.lines;
const brk = (t) => (/[،] /.test(t) ? esc(t).replace(/([،]) /, '$1<br>') : esc(t));
const LOGO = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 64 64"><circle cx="32" cy="32" r="31" fill="#f3e6c8"/><g fill="none" stroke="#8a5d10" stroke-width="3.6" stroke-linecap="round"><path d="M18 17 q 3 -4.5 6 0 t 6 0 t 6 0 t 6 0"/><path d="M15 24.5 q 4 -4.5 8 0 t 8 0 t 8 0 t 8 0"/><path d="M12 32 q 5 -4.5 10 0 t 10 0 t 10 0 t 10 0"/><path d="M15 39.5 q 4 -4.5 8 0 t 8 0 t 8 0 t 8 0"/><path d="M18 47 q 3 -4.5 6 0 t 6 0 t 6 0 t 6 0"/></g></svg>`;
const screenHtml = (x, i) => {
  if (x.kind === 'title') return `<section class="sc title" data-i="${i}"><p class="kicker">${esc(post.kicker.en)}</p><p class="big">${esc(post.kicker.pa)}</p><div class="orn"></div><p class="by">${esc(post.singer)}</p><p class="by2">${esc(post.kicker.src)}</p></section>`;
  if (x.kind === 'spoken') return `<section class="sc spoken" data-i="${i}"><p class="tag">${esc(post.spoken_label ?? 'the qawwal explains')}</p><p class="q">${esc(x.en)}</p></section>`;
  if (x.kind === 'end') return '';
  const l = L[x.line], p = x.prev ? L[x.prev] : null;
  return `<section class="sc line" data-i="${i}">${p ? `<p class="prev">${brk(p.pa)}</p>` : ''}<p class="cur">${brk(l.pa)}</p><div class="sweep"><i></i></div><p class="en">${esc(l.en)}</p></section>`;
};
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:N;src:${font('nastaliq-core.woff2')}}@font-face{font-family:N;src:${font('nastaliq-ext.woff2')}}
@font-face{font-family:S;src:${font('serif-core.woff2')};font-weight:400 700}@font-face{font-family:S;src:${font('serif-ext.woff2')};font-weight:400 700}
*{margin:0;box-sizing:border-box}
body{width:1080px;height:1920px;overflow:hidden;background:#0c0a08;color:#f3ead6;position:relative}
#stage{position:absolute;inset:0;overflow:hidden}
.inst{position:absolute;inset:0;opacity:0;display:none}
.inst svg{position:absolute;inset:0;width:1080px;height:1920px}
.px{transform-box:view-box}
.shade{position:absolute;inset:0;background:linear-gradient(rgba(8,6,4,.55),transparent 12%,transparent 52%,rgba(12,10,8,.82) 63%,#0c0a08 76%)}
.vig{position:absolute;inset:0;background:radial-gradient(120% 80% at 50% 35%,transparent 55%,rgba(0,0,0,.55))}
#grain{position:absolute;inset:0;opacity:.07;mix-blend-mode:overlay}
.brand{position:absolute;top:96px;left:84px;display:flex;align-items:center;gap:16px;font:700 32px S;color:#f6efe0;text-shadow:0 2px 12px rgba(0,0,0,.6)}
.mv{position:absolute;top:104px;right:84px;text-align:right;font:italic 400 28px S;color:#e6d2a6;opacity:0;text-shadow:0 2px 10px rgba(0,0,0,.7)}
.mv b{display:block;font:400 40px N;color:#f0c46a;direction:rtl;line-height:1.7}
.bar{position:absolute;top:70px;left:84px;right:84px;height:2px;background:rgba(240,196,106,.18)}
.bar i{position:absolute;inset:0;background:#f0c46a;transform-origin:left;transform:scaleX(0)}
.sc{position:absolute;left:70px;right:70px;top:1240px;height:560px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;opacity:0}
.line .prev{font:400 48px/1.8 N;direction:rtl;color:rgba(240,214,160,.45);margin-bottom:14px}
.line .cur{font:400 var(--fs,76px)/1.75 N;direction:rtl;color:#f0c46a;text-shadow:0 4px 22px rgba(0,0,0,.6)}
.sweep{width:520px;height:3px;margin:34px auto 30px;background:rgba(240,196,106,.18);position:relative}
.sweep i{position:absolute;inset:0;background:linear-gradient(90deg,#f0c46a,#ffe3a0);transform-origin:right;transform:scaleX(0)}
.line .en{font:italic 400 38px/1.45 S;color:#e2d8c4;max-width:880px;text-wrap:balance}
.spoken .tag{font:600 24px S;letter-spacing:.28em;text-transform:uppercase;color:#b9a27a;margin-bottom:26px}
.spoken .q{font:italic 400 44px/1.5 S;color:#efe4cc;max-width:860px;text-wrap:balance}
.spoken .q::before{content:'“'}.spoken .q::after{content:'”'}
.title .kicker{font:600 26px S;letter-spacing:.3em;text-transform:uppercase;color:#c9b48a}
.title .big{font:400 92px/1.8 N;direction:rtl;color:#f0c46a;margin-top:10px;text-shadow:0 4px 24px rgba(0,0,0,.6)}
.orn{width:180px;height:2px;background:#f0c46a;margin:18px auto 26px;opacity:.7}
.title .by{font:400 40px S;color:#f3ead6}.title .by2{font:italic 400 30px S;color:#b9ae98;margin-top:10px}
.end{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;opacity:0;background:radial-gradient(70% 45% at 50% 45%,#2a2014,#0c0a08)}
.end .name{font:700 84px S;margin-top:34px;color:#f6efe0}
.end .hook{font:italic 400 36px S;color:#b9ae98;margin-top:12px}
.end .pname{font:400 74px/1.8 N;color:#f0c46a;margin-top:44px}
.end .pen{font:600 26px S;letter-spacing:.24em;text-transform:uppercase;color:#b9ae98}
.end .sung{font:italic 400 32px S;color:#e2d8c4;margin-top:40px}
</style></head><body>
<div id="stage">${runs.map((r, k) => `<div class="inst" data-k="${k}"><svg viewBox="0 0 1080 1920" preserveAspectRatio="xMidYMid slice"><g class="cam">${scene(r.name, k)}</g></svg></div>`).join('')}</div>
<div class="shade"></div><div class="vig"></div><canvas id="grain" width="540" height="960"></canvas>
<div class="bar"><i id="bar"></i></div>
<div class="brand" id="brand">${LOGO(54)}<span>punjabii.net</span></div>
${(post.movements ?? []).map((m, i) => `<div class="mv" data-m="${i}"><b>${esc(m.pa)}</b>${esc(m.en)}</div>`).join('')}
${scr.map(screenHtml).join('')}
<div class="end" id="end">${LOGO(140)}<div class="name">punjabii.net</div><div class="hook">Punjabi poetry, in its own script</div>
<div class="pname">${esc(post.credit.pa)}</div><div class="pen">${esc(post.credit.en)}</div><div class="sung">sung by ${esc(post.singer)}</div></div>
</body></html>`;

const browser = await chromium.launch().catch(() => {
  const dir = join(homedir(), '.cache', 'ms-playwright');
  const shell = readdirSync(dir).filter((d) => d.startsWith('chromium_headless_shell-')).sort().at(-1);
  return chromium.launch({ executablePath: join(dir, shell, 'chrome-headless-shell-linux64', 'chrome-headless-shell') });
});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(({ scr, runs, DUR, endAt, movements }) => {
  // film grain, drawn once
  const g = document.getElementById('grain'), c = g.getContext('2d'), im = c.createImageData(540, 960);
  let sd = 3; const rn = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < im.data.length; i += 4) { const v = rn() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  c.putImageData(im, 0, 0);
  // line text: one size that fits every line on at most two rows
  const lines = [...document.querySelectorAll('.line .cur')];
  for (let fs = 80; fs >= 54; fs -= 2) {
    document.body.style.setProperty('--fs', `${fs}px`);
    const ok = lines.every((p) => { const s = p.closest('.sc'); s.style.opacity = 1; const h = p.getBoundingClientRect().height; s.style.opacity = ''; return h <= fs * 1.75 * 2 + 4; });
    if (ok) break;
  }
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const ease = (v) => v * v * (3 - 2 * v);
  const fade = (t, a, b, i = 0.6, o = 0.5) => ease(clamp((t - a) / i)) * ease(clamp((b - t) / o));
  const insts = [...document.querySelectorAll('.inst')].map((el, k) => ({ el, r: runs[k], cam: el.querySelector('.cam'), px: [...el.querySelectorAll('.px')], cls: (q) => [...el.querySelectorAll(q)] }));
  for (const I of insts) {
    const o = (q) => I.cls(q).map((e) => ({ e, cs: getComputedStyle(e), k: parseFloat(getComputedStyle(e).getPropertyValue('--k')) || 0, d: parseFloat(getComputedStyle(e).getPropertyValue('--d')) || 3 }));
    I.tw = o('.tw'); I.fl = o('.fl'); I.mote = o('.mote'); I.petal = o('.petal'); I.sway = o('.sway'); I.bob = o('.bob'); I.shim = o('.shim'); I.orbit = o('.orbit'); I.twirl = I.cls('.twirl'); I.rays = I.cls('.rays');
    I.drift = I.cls('.drift').map((e) => ({ e, x: parseFloat(getComputedStyle(e).getPropertyValue('--x')) || 80 }));
    for (const m of [...I.mote, ...I.petal]) { m.dx = parseFloat(m.cs.getPropertyValue('--dx')) || 0; m.dy = parseFloat(m.cs.getPropertyValue('--dy')) || -150; }
    for (const m of I.orbit) m.o = parseFloat(m.cs.getPropertyValue('--o')) || 0;
  }
  const secs = [...document.querySelectorAll('.sc')].map((el) => ({ el, i: +el.dataset.i, sw: el.querySelector('.sweep i') }));
  const mvs = [...document.querySelectorAll('.mv')];
  const end = document.getElementById('end'), bar = document.getElementById('bar'), brand = document.getElementById('brand');
  const XF = 1.4; // scene crossfade
  window.seek = (t) => {
    const TAU = Math.PI * 2;
    insts.forEach((I, k) => {
      const { t0, t1 } = I.r, a = t0 - XF / 2, b = t1 + XF / 2;
      const vis = t >= a - 0.05 && t <= b + 0.05;
      I.el.style.display = vis ? 'block' : 'none';
      if (!vis) return;
      I.el.style.opacity = k === 0 && t < t0 + 0.01 ? 1 : ease(clamp((t - a) / XF)) * (k === insts.length - 1 ? 1 : ease(clamp((b - t) / XF)));
      const p = clamp((t - a) / (b - a)), dir = k % 2 ? -1 : 1;
      I.cam.setAttribute('transform', `translate(540 760) scale(${(1.02 + 0.09 * p).toFixed(4)}) translate(-540 ${(-760 + 18 * p).toFixed(2)})`);
      for (const L of I.px) { const d = parseFloat(L.dataset.d); L.setAttribute('transform', `translate(${(dir * (d - 0.3) * 70 * (p - 0.5)).toFixed(2)} ${(d * 14 * p).toFixed(2)})`); }
      for (const m of I.tw) m.e.style.opacity = (0.55 + 0.45 * Math.sin(TAU * (t + m.k) / m.d)).toFixed(3);
      for (const m of I.fl) m.e.style.opacity = (0.78 + 0.14 * Math.sin(TAU * (t + m.k) / m.d) + 0.08 * Math.sin(TAU * (t * 3.7 + m.k))).toFixed(3);
      for (const m of I.mote) { const q = ((t + m.k) / m.d) % 1; m.e.style.transform = `translate(${(m.dx * q).toFixed(1)}px,${(m.dy * q).toFixed(1)}px)`; m.e.style.opacity = (Math.sin(Math.PI * q) * 0.8).toFixed(3); }
      for (const m of I.petal) { const q = ((t + m.k) / m.d) % 1; m.e.style.transform = `translate(${(m.dx * Math.sin(TAU * q)).toFixed(1)}px,${(m.dy * q).toFixed(1)}px) rotate(${(q * 720).toFixed(0)}deg)`; m.e.style.transformBox = 'fill-box'; m.e.style.transformOrigin = 'center'; }
      for (const m of I.sway) m.e.style.transform = `rotate(${(2.4 * Math.sin(TAU * (t + m.k) / m.d)).toFixed(3)}deg)`;
      for (const m of I.bob) m.e.style.transform = `translateY(${(-6 * Math.sin(TAU * (t + m.k) / 3.2)).toFixed(2)}px)`;
      for (const m of I.shim) { const q = ((t + m.k) / 3) % 1; m.e.style.opacity = (0.15 + 0.55 * Math.sin(Math.PI * q)).toFixed(3); m.e.style.transform = `translateX(${(28 * q).toFixed(1)}px)`; }
      for (const m of I.orbit) m.e.style.offsetDistance = `${((m.o + (t / m.d) * 100) % 100).toFixed(3)}%`;
      for (const e of I.twirl) e.setAttribute('transform', `translate(${((t * 90) % 40).toFixed(2)} 0)`);
      for (const e of I.rays) e.style.transform = `rotate(${(t * 1.2).toFixed(3)}deg)`;
      for (const m of I.drift) m.e.style.transform = `translateX(${(m.x * p).toFixed(1)}px)`;
    });
    for (const S of secs) {
      const x = scr[S.i], a = x.t, b = x.t1;
      const same = scr[S.i + 1] && scr[S.i + 1].line && scr[S.i + 1].line === x.line;
      S.el.style.opacity = fade(t, a - 0.15, b - (same ? 0 : 0.1), 0.6, 0.45).toFixed(3);
      S.el.style.transform = `translateY(${((1 - ease(clamp((t - a + 0.15) / 0.7))) * 18).toFixed(1)}px)`;
      if (S.sw) S.sw.style.transform = `scaleX(${clamp((t - a) / Math.max(1, b - a - 0.3)).toFixed(4)})`;
    }
    mvs.forEach((el, i) => { const a = movements[i].t, b = i + 1 < mvs.length ? movements[i + 1].t : endAt; el.style.opacity = fade(t, a + 0.4, b - 0.3, 1.2, 0.8).toFixed(3); });
    bar.style.transform = `scaleX(${clamp(t / endAt).toFixed(4)})`;
    const outro = fade(t, endAt + 0.1, DUR + 5, 1.0, 0.1);
    end.style.opacity = outro.toFixed(3);
    brand.style.opacity = bar.parentElement.style.opacity = (1 - outro).toFixed(3);
  };
}, { scr, runs, DUR, endAt, movements: (post.movements ?? []).map((m) => ({ t: map(m.at) })) });

const FR = join(DIR, 'frames');
const RESUME = process.argv.includes('--resume'); // keep frames already rendered by an interrupted run
if (!RESUME) rmSync(FR, { recursive: true, force: true });
mkdirSync(FR, { recursive: true });
const only = process.argv.includes('--frames') ? process.argv[process.argv.indexOf('--frames') + 1].split(',').map(Number) : null;
if (only) { // quick check: a few stills (seconds), no video
  for (const t of only) { await page.evaluate((x) => window.seek(x), t); await page.screenshot({ path: join(DIR, `still-${t}.jpg`), type: 'jpeg', quality: 85 }); }
  await browser.close();
  console.log(`stills in ${DIR}; duration ${DUR}s`);
  process.exit(0);
}
const frames = Math.ceil(DUR * FPS);
for (let fr = 0; fr < frames; fr++) {
  const fp = join(FR, `${String(fr).padStart(5, '0')}.jpg`);
  if (RESUME && existsSync(fp) && statSync(fp).size > 0) continue;
  await page.evaluate((t) => window.seek(t), fr / FPS);
  await page.screenshot({ path: fp, type: 'jpeg', quality: 90 });
  if (fr % 300 === 0) process.stdout.write(`\rframe ${fr}/${frames}`);
}
await browser.close();
process.stdout.write('\n');
const out = join(HERE, 'out', `${id}.mp4`);
execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(FR, '%05d.jpg'), '-i', join(DIR, 'music.wav'),
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', out]);
const coverT = post.cover_at != null ? map(post.cover_at) : scr[1].t + 2;
execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', join(FR, `${String(Math.round(coverT * FPS)).padStart(5, '0')}.jpg`), '-q:v', '3', join(DIR, 'cover.jpg')]);
rmSync(FR, { recursive: true, force: true });
const caption = post.caption ?? `${post.title} | ${post.credit.pa} (${post.credit.en}), sung by ${post.singer}

Vocals: ${post.singer}. Poetry: ${post.credit.en}. All credit to the artist.

#punjabi #punjabipoetry #پنجابی #پنجابی_شاعری #poetry`;
writeFileSync(join(HERE, 'out', `${id}-reel.txt`), caption + '\n');
console.log(`${out}  (${DUR.toFixed(1)}s)\n---\n${caption}`);
