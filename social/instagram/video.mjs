/**
 * Reel (1080×1920 MP4) for a post: the verse on screen, each line lit up while it is recited
 * (audio from voice/recite.py), then an end card with the "coming soon" hook.
 *
 *   ~/.local/tts-venv/bin/python social/instagram/voice/recite.py 001-bulleh-shah
 *   node social/instagram/video.mjs 001-bulleh-shah      # -> out/001-bulleh-shah.mp4 (+ -reel.txt caption)
 *
 * Needs ffmpeg and playwright-core (PLAYWRIGHT_CORE=/path/to/index.mjs).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { parse } from 'yaml';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const { chromium } = await import(process.env.PLAYWRIGHT_CORE ?? 'playwright-core');
const id = process.argv[2];
if (!id) throw new Error('usage: node social/instagram/video.mjs <post-id>');
const DIR = join(HERE, 'out', id);
const rec = JSON.parse(readFileSync(join(DIR, 'recitation.json'), 'utf8'));

const front = (f) => parse(readFileSync(f, 'utf8').split(/^---$/m)[1]);
const poem = front(join(ROOT, 'src/content/poems', `${rec.poem}.md`));
const poet = front(join(ROOT, 'src/content/poets', `${poem.poet}.md`));
const form = front(join(ROOT, 'src/content/forms', `${poem.form}.md`));
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const font = (f) => `url(data:font/woff2;base64,${readFileSync(join(ROOT, 'public/fonts', f)).toString('base64')})`;

/* ---------- timing ---------- */
const LEAD = 1.2, GAP = 0.55, STANZA_GAP = 0.5, TAIL = 0.8, END = 4.0;
const timeline = []; // {line index | 'intro' | 'end', seconds}
timeline.push({ at: 'intro', sec: LEAD });
rec.lines.forEach((l, i) => timeline.push({ at: i, sec: l.duration + GAP + (rec.lines[i + 1]?.stanza_start ? STANZA_GAP : 0) }));
timeline.push({ at: 'tail', sec: TAIL });
timeline.push({ at: 'end', sec: END });

/* ---------- audio: lead silence, lines with gaps, silence under the end card ---------- */
function readWav(file) {
  const b = readFileSync(file);
  let o = 12; // walk chunks to "data"
  while (b.toString('ascii', o, o + 4) !== 'data') o += 8 + b.readUInt32LE(o + 4);
  return { rate: b.readUInt32LE(24), pcm: b.subarray(o + 8, o + 8 + b.readUInt32LE(o + 4)) };
}
const clips = rec.lines.map((l) => readWav(join(DIR, l.wav)));
const RATE = clips[0].rate;
const silence = (s) => Buffer.alloc(Math.round(s * RATE) * 2);
const parts = [silence(LEAD)];
rec.lines.forEach((l, i) => parts.push(clips[i].pcm, silence(timeline[i + 1].sec - l.duration)));
parts.push(silence(TAIL + END));
const pcm = Buffer.concat(parts);
const head = Buffer.alloc(44);
head.write('RIFF', 0); head.writeUInt32LE(36 + pcm.length, 4); head.write('WAVEfmt ', 8); head.writeUInt32LE(16, 16);
head.writeUInt16LE(1, 20); head.writeUInt16LE(1, 22); head.writeUInt32LE(RATE, 24); head.writeUInt32LE(RATE * 2, 28);
head.writeUInt16LE(2, 32); head.writeUInt16LE(16, 34); head.write('data', 36); head.writeUInt32LE(pcm.length, 40);
writeFileSync(join(DIR, 'audio.wav'), Buffer.concat([head, pcm]));

/* ---------- frames ---------- */
const LOGO = `<svg width="84" height="84" viewBox="0 0 64 64"><circle cx="32" cy="32" r="31" fill="#efe7d6"/><g fill="none" stroke="#a87717" stroke-width="3.6" stroke-linecap="round"><path d="M18 17 q 3 -4.5 6 0 t 6 0 t 6 0 t 6 0"/><path d="M15 24.5 q 4 -4.5 8 0 t 8 0 t 8 0 t 8 0"/><path d="M12 32 q 5 -4.5 10 0 t 10 0 t 10 0 t 10 0"/><path d="M15 39.5 q 4 -4.5 8 0 t 8 0 t 8 0 t 8 0"/><path d="M18 47 q 3 -4.5 6 0 t 6 0 t 6 0 t 6 0"/></g></svg>`;
const STYLE = `
@font-face{font-family:N;src:${font('nastaliq-core.woff2')}}@font-face{font-family:N;src:${font('nastaliq-ext.woff2')}}
@font-face{font-family:S;src:${font('serif-core.woff2')};font-weight:400 700}@font-face{font-family:S;src:${font('serif-ext.woff2')};font-weight:400 700}
*{margin:0;box-sizing:border-box}
body{width:1080px;height:1920px;overflow:hidden;background:#17140f;color:#efe7d6;font-family:N;position:relative}
.bg{position:absolute;inset:0;background:radial-gradient(70% 30% at 50% 6%,rgba(201,150,42,.18),transparent 70%),radial-gradient(60% 25% at 50% 100%,rgba(201,150,42,.12),transparent 70%),repeating-linear-gradient(180deg,transparent 0 71px,rgba(239,231,214,.035) 71px 72px)}
.frame{position:absolute;inset:48px;border:1.5px solid rgba(201,150,42,.35);border-radius:8px}
.wrap{position:absolute;inset:48px;display:flex;flex-direction:column;align-items:center;padding:150px 70px 120px}
.form{color:#d6a640;font-size:44px}
.verse{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:center;align-items:center;width:100%;text-align:center}
.l{font-size:var(--fs);line-height:2;color:rgba(239,231,214,.32);transition:none;text-wrap:balance}
.l.on{color:#f6eedc;text-shadow:0 0 28px rgba(226,184,90,.25)}
.l.r.on{color:#e8bf5f}
.gap{height:34px}
.rule{width:140px;height:2px;background:rgba(201,150,42,.55);margin:30px 0 26px}
.poet{font-size:64px;line-height:1.5}
.poet-en{direction:ltr;font:italic 400 34px S;color:rgba(239,231,214,.66)}
.ai{position:absolute;bottom:78px;left:0;right:0;text-align:center;font-size:26px;color:rgba(239,231,214,.42)}
.end{position:absolute;inset:48px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px;text-align:center}
.name{direction:ltr;font:600 76px S;letter-spacing:.01em}
.hook-pa{font-size:58px;line-height:1.9;color:#efe7d6}
.hook-en{direction:ltr;font:400 38px S;color:rgba(239,231,214,.75)}
.soon{margin-top:20px;padding:18px 56px 22px;border:2px solid #d6a640;border-radius:40px;color:#e8bf5f;font-size:48px;line-height:1.6;display:flex;flex-direction:column;align-items:center}
.soon span{direction:ltr;font:600 28px S;letter-spacing:.16em;margin-top:4px}`;

function verseFrame(active) {
  const body = rec.lines.map((l, i) => `${l.stanza_start ? '<div class="gap"></div>' : ''}<p class="l${l.refrain ? ' r' : ''}${i === active ? ' on' : ''}">${esc(l.text)}</p>`).join('');
  return `<!doctype html><html lang="pnb" dir="rtl"><head><meta charset="utf-8"><style>${STYLE}</style></head><body><div class="bg"></div><div class="frame"></div>
<div class="wrap"><div class="form">${esc(form.name.pa)}</div><div class="verse" id="v">${body}</div><div class="rule"></div>
<div class="poet">${esc(poet.name.pa)}</div><div class="poet-en">${esc(poet.name.en)}</div></div>
<div class="ai">مشینی آواز</div></body></html>`;
}
const endFrame = () => `<!doctype html><html lang="pnb" dir="rtl"><head><meta charset="utf-8"><style>${STYLE}</style></head><body><div class="bg"></div><div class="frame"></div>
<div class="end">${LOGO}<div class="name">punjabi.net</div><div class="hook-pa">پنجابی شاعری پڑھن وچ تہاڈا ساتھی</div>
<div class="hook-en">to help you read Punjabi poetry</div><div class="soon">جلدی آ رہی اے<span>COMING SOON</span></div></div></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
const shot = async (html, name) => {
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => {
    const v = document.getElementById('v');
    if (!v) return;
    for (let fs = 78; fs >= 40; fs -= 2) {
      document.body.style.setProperty('--fs', `${fs}px`);
      // A long line may wrap onto two balanced lines, never three.
      const wide = [...v.querySelectorAll('.l')].some((l) => l.offsetHeight > fs * 2 * 2.2);
      if (!wide && v.scrollHeight <= v.clientHeight + 1) break;
    }
  });
  const file = join(DIR, `${name}.png`);
  await page.screenshot({ path: file });
  return file;
};
const frames = {};
frames.intro = await shot(verseFrame(-1), 'f-intro');
frames.tail = frames.intro;
for (let i = 0; i < rec.lines.length; i++) frames[i] = await shot(verseFrame(i), `f-${i}`);
frames.end = await shot(endFrame(), 'f-end');
await browser.close();

/* ---------- encode ---------- */
const list = timeline.map((t) => `file '${frames[t.at]}'\nduration ${t.sec.toFixed(3)}`).join('\n') + `\nfile '${frames.end}'\n`;
writeFileSync(join(DIR, 'frames.txt'), list);
const total = timeline.reduce((s, t) => s + t.sec, 0);
const out = join(HERE, 'out', `${id}.mp4`);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(DIR, 'frames.txt'), '-i', join(DIR, 'audio.wav'),
  '-vf', `fps=30,format=yuv420p,fade=t=in:st=0:d=0.5,fade=t=out:st=${(total - 0.6).toFixed(2)}:d=0.6`,
  '-af', `afade=t=in:st=0:d=0.3,afade=t=out:st=${(total - 0.6).toFixed(2)}:d=0.6`,
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-movflags', '+faststart', '-t', total.toFixed(2), out]);

/* ---------- caption ---------- */
const TAGS = { 'bulleh-shah': '#BullehShah #بلھے_شاہ', 'baba-farid': '#BabaFarid #بابا_فرید', 'sultan-bahu': '#SultanBahu #سلطان_باہو',
  'waris-shah': '#WarisShah #وارث_شاہ #HeerRanjha', 'shah-hussain': '#ShahHussain #شاہ_حسین' };
const caption = [
  poem.title, `— ${poet.name.pa} · ${poet.name.en}`, '',
  rec.lines.map((l) => (l.stanza_start ? '\n' : '') + l.text).join('\n'), '',
  `${form.name.pa} · ${form.name.en}`, '',
  'punjabi.net — پنجابی شاعری پڑھن وچ تہاڈا ساتھی۔ جلدی آ رہی اے۔',
  'punjabi.net — to help you read Punjabi poetry. Coming soon.', '',
  'آواز مشینی اے (کمپیوٹر دی بنائی ہوئی) · Recited by a machine voice.',
  poem.source.book.startsWith('Wikisource') ? 'Text: public-domain transcription, Wikisource (Punjabi).' : `Text: ${poem.source.book}.`, '',
  `#PunjabiPoetry #پنجابی_شاعری #Shahmukhi #شاہ_مکھی #PunjabiSufiPoetry ${TAGS[poem.poet] ?? ''}`.trim(),
].join('\n');
writeFileSync(join(HERE, 'out', `${id}-reel.txt`), caption + '\n');
console.log(`${out}  (${total.toFixed(1)}s)`);
