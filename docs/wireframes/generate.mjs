/**
 * Usage: node docs/wireframes/generate.mjs docs/wireframes  (needs roughjs, @resvg/resvg-js and
 * the Virgil, Noto Naskh Arabic and Noto Serif Gurmukhi TTFs; paths below point at ~/.local/tools.)
 * This is a design tool, not part of the site build.
 * Wireframe generator: one source → (a) an .excalidraw scene with one frame per
 * screen, (b) a PNG preview per frame rendered with rough.js + resvg.
 * Poem / proverb / dictionary text is drawn as placeholder squiggles, never invented.
 */
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
const require = createRequire('/home/azureuser/.local/tools/');
const rough = require('roughjs');
const { Resvg } = require('@resvg/resvg-js');

const OUT = process.argv[2];
mkdirSync(OUT, { recursive: true });

/* ---------------- palette ---------------- */
const INK = '#1e1e1e', MUTED = '#868e96', FAINT = '#ced4da', OCHRE = '#b07d00', OCHRE_FILL = '#ffe8a3',
  NOTE = '#1971c2', PAPER = '#fdfcf8', WASH = '#f1f3f5';

/* ---------------- element store ---------------- */
let seedN = 1;
const seed = () => (seedN = (seedN * 16807) % 2147483647);
let idN = 0;
const els = [];
let FRAME = null; // current frame {id, x, y}

function base(type, x, y, w, h, o = {}) {
  const el = {
    id: `el${++idN}`, type, x: FRAME.x + x, y: FRAME.y + y, width: w, height: h, angle: 0,
    strokeColor: o.stroke ?? INK, backgroundColor: o.fill ?? 'transparent',
    fillStyle: o.fillStyle ?? 'solid', strokeWidth: o.sw ?? 1, strokeStyle: o.dashed ? 'dashed' : 'solid',
    roughness: o.roughness ?? 1, opacity: 100, groupIds: [], frameId: FRAME.id,
    roundness: o.round ? { type: 3 } : null, seed: seed(), version: 1, versionNonce: seed(),
    isDeleted: false, boundElements: null, updated: 1, link: null, locked: false,
  };
  els.push(el);
  return el;
}
const rect = (x, y, w, h, o = {}) => base('rectangle', x, y, w, h, o);
const ellipse = (x, y, w, h, o = {}) => base('ellipse', x, y, w, h, o);
function line(x, y, pts, o = {}) {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const el = base(o.arrow ? 'arrow' : 'line', x, y, Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), o);
  Object.assign(el, { points: pts, lastCommittedPoint: null, startBinding: null, endBinding: null,
    startArrowhead: null, endArrowhead: o.arrow ? 'arrow' : null });
  return el;
}
const hasArabic = (s) => /[؀-ۿݐ-ݿ]/.test(s);
const hasGurmukhi = (s) => /[਀-੿]/.test(s);
/** Text. align: left|center|right; x is the anchor (left edge, centre or right edge). */
function text(x, y, str, o = {}) {
  const size = o.size ?? 16;
  const lines = String(str).split('\n');
  const factor = hasArabic(str) ? 0.42 : hasGurmukhi(str) ? 0.62 : 0.55;
  const w = Math.max(...lines.map((l) => l.length)) * size * factor;
  const lh = hasArabic(str) ? 1.9 : 1.25;
  const h = size * lh * lines.length;
  const align = o.align ?? 'left';
  const left = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  const el = base('text', left, y, w, h, { stroke: o.color ?? INK, roughness: 0 });
  Object.assign(el, { text: str, fontSize: size, fontFamily: 1, textAlign: align, verticalAlign: 'top',
    containerId: null, originalText: str, lineHeight: lh, autoResize: true, _bold: o.bold, _italic: o.italic });
  return el;
}
/** Placeholder text: wavy grey strokes. rtl right-aligns ragged lines. */
function squiggles(x, y, w, n, o = {}) {
  const gap = o.gap ?? 14;
  for (let i = 0; i < n; i++) {
    const lw = i === n - 1 && n > 1 ? w * (0.45 + ((i * 37) % 30) / 100) : w * (0.85 + ((i * 13) % 15) / 100);
    const sx = o.rtl ? x + w - lw : o.center ? x + (w - lw) / 2 : x;
    const pts = [];
    for (let k = 0; k <= 8; k++) pts.push([(lw * k) / 8, k % 2 ? -1.6 : 1.6]);
    line(sx, y + i * gap, pts, { stroke: o.color ?? FAINT, sw: o.sw ?? 2, roughness: 0.6 });
  }
  return y + n * gap;
}
function button(x, y, label, o = {}) {
  const w = o.w ?? Math.max(60, label.length * (o.size ?? 15) * (hasArabic(label) ? 0.5 : 0.56) + 26);
  const h = o.h ?? 36;
  rect(x, y, w, h, { fill: o.primary ? INK : o.active ? OCHRE_FILL : 'transparent', stroke: o.active ? OCHRE : o.muted ? FAINT : INK, round: true });
  text(x + w / 2, y + (hasArabic(label) ? 2 : 9), label, { size: o.size ?? 15, align: 'center', color: o.primary ? PAPER : INK });
  return w;
}
function tag(x, y, label, o = {}) {
  const w = label.length * 7.4 + 18;
  rect(x, y, w, 24, { stroke: o.accent ? OCHRE : FAINT, fill: o.accent ? OCHRE_FILL : WASH, round: true });
  text(x + w / 2, y + 4, label, { size: 13, align: 'center', color: o.accent ? OCHRE : MUTED });
  return w;
}
function note(x, y, str, toX, toY) {
  text(x, y, str, { size: 14, color: NOTE });
  if (toX != null) line(x - 4, y + 8, [[0, 0], [toX - x + 4, toY - y - 8]], { stroke: NOTE, arrow: true, sw: 1 });
}
function portrait(x, y, w, h) {
  rect(x, y, w, h, { fill: WASH, fillStyle: 'hachure', stroke: MUTED });
  ellipse(x + w * 0.3, y + h * 0.18, w * 0.4, h * 0.38, { stroke: MUTED });
  line(x + w * 0.15, y + h * 0.95, [[0, 0], [w * 0.15, -h * 0.35], [w * 0.55, -h * 0.35], [w * 0.7, 0]], { stroke: MUTED });
}

/* ---------------- frames ---------------- */
const frameList = [];
let nextX = 0;
function frame(name, w, h, build) {
  const el = { id: `frame${frameList.length + 1}`, x: nextX, y: 0 };
  FRAME = el;
  rect(0, 0, w, h, { fill: PAPER, stroke: FAINT, roughness: 0 });
  build(w);
  const f = base('frame', 0, 0, w, h, { roughness: 0, stroke: '#bbb' });
  f.name = name; f.frameId = null;
  els.splice(els.indexOf(f), 1);
  els.unshift(f);
  frameList.push({ id: el.id, name, x: el.x, y: 0, w, h, frameEl: f });
  f.id = el.id;
  nextX += w + 120;
}

/* ---------------- shared chrome ---------------- */
function header(w, o = {}) {
  const pa = o.pa;
  if (o.mobile) {
    text(16, 16, 'punjabi.net', { size: 22, bold: true });
    button(w - 118, 12, 'EN', { w: 40, h: 32, active: !pa });
    text(w - 46, 8, 'پنجابی', { size: 18, align: 'center' });
    text(16, 58, 'Poets   Poems   Dictionary   Proverbs\nForms   Contribute', { size: 15 });
    rect(16, 112, w - 110, 36, { stroke: FAINT, round: true });
    text(26, 121, 'Search poets, poems…', { size: 14, color: MUTED });
    button(w - 90, 112, 'Search', { h: 36, w: 74, size: 14 });
    text(16, 166, 'Script', { size: 14, color: MUTED });
    button(70, 158, 'شاہ مکھی', { w: 84, h: 36, active: o.script !== 'gm', size: 15 });
    button(160, 158, 'ਗੁਰਮੁਖੀ', { w: 80, h: 36, active: o.script === 'gm', size: 14 });
    button(246, 158, 'Roman', { w: 70, h: 36, size: 14, muted: true });
    line(0, 206, [[0, 0], [w, 0]], { stroke: FAINT, roughness: 0 });
    return 206;
  }
  text(40, 26, 'punjabi.net', { size: 24, bold: true });
  const nav = pa ? ['شاعر', 'کلام', 'لغت', 'اکھان', 'صنفاں', 'حصہ پاؤ'] : ['Poets', 'Poems', 'Dictionary', 'Proverbs', 'Forms', 'Contribute'];
  let nx = 200;
  nav.forEach((n, i) => {
    text(nx, 28, n, { size: 16, color: o.active === i ? INK : INK });
    if (o.active === i) line(nx, 50, [[0, 0], [n.length * 8.5, 0]], { stroke: OCHRE, sw: 3, roughness: 0.5 });
    nx += n.length * (hasArabic(n) ? 8 : 9) + 30;
  });
  button(w - 120, 20, 'EN', { w: 40, h: 32, active: !pa });
  text(w - 50, 14, 'پنجابی', { size: 18, align: 'center' });
  rect(40, 70, 300, 36, { stroke: FAINT, round: true });
  text(52, 79, pa ? 'شاعر، کلام، لفظ لبھو…' : 'Search poets, poems, words…', { size: 14, color: MUTED });
  button(340, 70, pa ? 'لبھو' : 'Search', { h: 36, w: 72, size: 14 });
  text(w - 330, 79, pa ? 'لپی' : 'Script', { size: 14, color: MUTED });
  button(w - 280, 70, 'شاہ مکھی', { w: 84, h: 36, active: o.script !== 'gm' && o.script !== 'ro', size: 15 });
  button(w - 190, 70, 'ਗੁਰਮੁਖੀ', { w: 80, h: 36, active: o.script === 'gm', size: 14 });
  button(w - 104, 70, 'Roman', { w: 64, h: 36, size: 14, active: o.script === 'ro' });
  line(0, 122, [[0, 0], [w, 0]], { stroke: FAINT, roughness: 0 });
  return 122;
}
function footer(w, y, o = {}) {
  line(0, y, [[0, 0], [w, 0]], { stroke: FAINT, roughness: 0 });
  const pad = o.mobile ? 16 : 40;
  if (o.couplet) {
    text(w / 2, y + 18, 'closing couplet (from a verified poem)', { size: 12, color: MUTED, align: 'center' });
    squiggles(w / 2 - 160, y + 46, 320, 2, { center: true, color: MUTED, gap: 22 });
    text(w / 2, y + 92, '— Poet name', { size: 14, color: MUTED, align: 'center' });
    line(pad, y + 122, [[0, 0], [w - 2 * pad, 0]], { stroke: FAINT, roughness: 0 });
    y += 122;
  }
  text(pad, y + 22, 'An archive of Punjabi poetry, poets, proverbs and words', { size: o.mobile ? 13 : 15 });
  text(pad, y + 52, 'About    Contribute    Forms    Instagram', { size: 14 });
  text(pad, y + 80, o.mobile ? 'Non-commercial. No ads, no tracking.\nEvery text records its printed source.' : 'Non-commercial. No ads, no tracking. Every text records its printed source.', { size: 12, color: MUTED });
  return y + 120;
}

/* ================= SCREENS ================= */

// 1. Home
frame('01 Home (desktop)', 1000, 1330, (w) => {
  let y = header(w);
  text(w / 2, y + 60, 'پنجابی شاعری، اوہناں ای لفظاں تے لپیاں وچ جنہاں وچ لکھی گئی۔', { size: 30, align: 'center' });
  text(w / 2, y + 128, 'Punjabi poetry, kept in the words and scripts it was written in.', { size: 18, align: 'center', color: MUTED, italic: true });
  squiggles(w / 2 - 230, y + 176, 460, 3, { center: true });
  button(w / 2 - 170, y + 232, 'Explore poems', { primary: true, w: 160, h: 42 });
  button(w / 2 + 10, y + 232, 'Meet the poets', { w: 160, h: 42 });
  note(w - 250, y + 6, 'thesis line: Punjabi (active\nscript) + English beneath', w - 300, y + 60);
  y += 320;
  text(40, y, 'Recommended poets', { size: 24 });
  text(w - 40, y + 6, 'All poets →', { size: 15, align: 'right' });
  const cw = (w - 80 - 3 * 24) / 4;
  ['Bulleh Shah', 'Shah Hussain', 'Baba Farid', 'Waris Shah'].forEach((n, i) => {
    const x = 40 + i * (cw + 24);
    portrait(x, y + 46, cw, 150);
    text(x, y + 206, ['بلھے شاہ', 'شاہ حسین', 'بابا فرید', 'وارث شاہ'][i], { size: 18 });
    text(x, y + 246, n, { size: 16 });
    text(x, y + 268, 'born – died', { size: 13, color: MUTED });
  });
  y += 320;
  text(40, y, 'Selected poems', { size: 24 });
  text(w - 40, y + 6, 'All poems →', { size: 15, align: 'right' });
  for (let i = 0; i < 4; i++) {
    const ry = y + 50 + i * 62;
    line(40, ry, [[0, 0], [w - 80, 0]], { stroke: FAINT, roughness: 0 });
    tag(40, ry + 18, ['KAFI', 'DOHRA', 'BAIT', 'SIHARFI'][i], { accent: true });
    squiggles(w - 420, ry + 30, 380, 1, { rtl: true, color: MUTED });
    text(150, ry + 20, 'poem title (active script) · poet', { size: 14, color: MUTED });
  }
  footer(w, y + 320, { couplet: true });
});

// 2. Poets
frame('02 Poets (desktop)', 1000, 1180, (w) => {
  let y = header(w, { active: 0 });
  text(40, y + 36, 'Poets', { size: 36 });
  text(40, y + 88, '13 poets', { size: 15, color: MUTED });
  rect(w - 360, y + 44, 320, 38, { stroke: FAINT, round: true });
  text(w - 348, y + 54, 'Filter poets by name…', { size: 14, color: MUTED });
  let tx = 40;
  ['All', 'Classical', 'Modern', 'Contemporary'].forEach((t, i) => (tx += button(tx, y + 120, t, { h: 32, size: 14, active: i === 0 }) + 8));
  note(tx + 30, y + 126, 'era filter + search are static-page JS (Pagefind/filter)', null);
  y += 180;
  const cw = (w - 80 - 3 * 24) / 4;
  const names = [['بابا فرید', 'Baba Farid'], ['شاہ حسین', 'Shah Hussain'], ['سلطان باہو', 'Sultan Bahu'], ['بلھے شاہ', 'Bulleh Shah'],
    ['وارث شاہ', 'Waris Shah'], ['ہاشم شاہ', 'Hashim Shah'], ['میاں محمد بخش', 'Mian Muhammad Bakhsh'], ['ਭਾਈ ਵੀਰ ਸਿੰਘ', 'Bhai Vir Singh']];
  names.forEach(([sm, en], i) => {
    const x = 40 + (i % 4) * (cw + 24), cy = y + Math.floor(i / 4) * 410;
    portrait(x, cy, cw, 170);
    text(x, cy + 176, i === 0 ? 'Imagined likeness, no authentic\nportrait survives' : 'caption: source of image', { size: 11, color: MUTED });
    tag(x, cy + 214, i < 7 ? 'classical' : 'modern', { accent: true });
    tag(x + 92, cy + 214, 'sufi');
    text(x, cy + 246, sm, { size: 20 });
    text(x, cy + 290, en, { size: 16 });
    text(x, cy + 312, 'born – died', { size: 13, color: MUTED });
    squiggles(x, cy + 342, cw, 2);
  });
  note(40, y + 372, 'honest caption when portrait_authentic: false', 60, y + 214);
  footer(w, y + 840);
});

// 3. Poem reader (desktop)
frame('03 Poem reader (desktop)', 1000, 1720, (w) => {
  let y = header(w, { active: 1 });
  const cx = 230, cw = 540;
  text(cx, y + 30, 'Poems  /  Bulleh Shah', { size: 13, color: MUTED });
  tag(cx, y + 60, 'KAFI', { accent: true });
  note(cx + 70, y + 62, '→ /forms/kafi', null);
  rect(cx + cw - 300, y + 96, 300, 40, { stroke: FAINT, fill: WASH, fillStyle: 'hachure' });
  text(cx + cw - 150, y + 106, 'poem title (active script)', { size: 14, color: MUTED, align: 'center' });
  text(cx, y + 150, 'by Bulleh Shah', { size: 17 });
  let bx = cx;
  ['A−', 'A+', 'Copy', 'Print', 'Share'].forEach((b) => (bx += button(bx, y + 186, b, { h: 32, size: 14 }) + 8));
  note(bx + 20, y + 192, 'text size persists\n(localStorage)', null);
  let vy = y + 260;
  for (let i = 1; i <= 4; i++) {
    text(cx + cw + 24, vy + 6, String(i), { size: 14, color: MUTED });
    squiggles(cx, vy + 14, cw, 2, { rtl: true, color: INK, sw: 3, gap: 40 });
    if (i === 2) {
      text(cx, vy + 92, 'English translation under the verse (optional)', { size: 14, color: MUTED, italic: true });
      vy += 30;
    }
    if (i === 1) {
      line(cx + 300, vy + 32, [[0, 0], [70, 0]], { stroke: OCHRE, sw: 2, dashed: true, roughness: 0 });
      rect(cx + 250, vy + 46, 250, 118, { fill: PAPER, stroke: INK, round: true, sw: 2 });
      text(cx + 266, vy + 56, 'glossed word (script)', { size: 15 });
      text(cx + 266, vy + 80, 'roman · /IPA/ · noun, m.', { size: 13, color: MUTED });
      squiggles(cx + 266, vy + 110, 210, 1, { color: MUTED });
      text(cx + 266, vy + 130, 'Open in dictionary →', { size: 13, color: OCHRE });
      note(cx + cw + 50, vy + 120, 'tap or Enter on a\nglossed word opens\nthis popover; Esc\ncloses; arrow keys\nmove between words', cx + 504, vy + 110);
    }
    vy += 106;
  }
  rect(cx, vy + 10, cw, 56, { stroke: OCHRE, fill: OCHRE_FILL, round: true });
  text(cx + 16, vy + 20, 'Gurmukhi on this page is a machine draft, not yet reviewed.\n(shown only when Gurmukhi is active and gurmukhi_status: auto)', { size: 13 });
  vy += 96;
  line(cx, vy, [[0, 0], [cw, 0]], { stroke: FAINT, roughness: 0 });
  text(cx, vy + 20, 'Source', { size: 18 });
  text(cx, vy + 50, 'Book title, ed. Editor (Publisher, Year), p. 00  ↗', { size: 14 });
  text(cx, vy + 82, 'Verification', { size: 18 });
  text(cx, vy + 112, 'Checked line by line against the printed edition.', { size: 14, color: MUTED });
  vy += 160;
  rect(cx, vy, cw, 170, { stroke: FAINT, round: true });
  text(cx + 20, vy + 16, 'About the poet', { size: 18 });
  portrait(cx + 20, vy + 50, 90, 100);
  text(cx + 126, vy + 46, 'بلھے شاہ', { size: 18 });
  text(cx + 200, vy + 56, '·  Bulleh Shah', { size: 16 });
  squiggles(cx + 126, vy + 96, cw - 160, 2);
  text(cx + 126, vy + 130, 'Read more →', { size: 14, color: OCHRE });
  vy += 200;
  text(cx, vy, 'More from this poet', { size: 18 });
  for (let i = 0; i < 3; i++) {
    line(cx, vy + 40 + i * 44, [[0, 0], [cw, 0]], { stroke: FAINT, roughness: 0 });
    tag(cx, vy + 50 + i * 44, 'KAFI', { accent: true });
    squiggles(cx + cw - 300, vy + 62 + i * 44, 300, 1, { rtl: true, color: MUTED });
  }
  note(40, y + 300, 'poem text is the\nlargest element;\none reading column', cx - 10, y + 300);
  footer(w, vy + 190);
});

// 4. Poem reader (mobile, Gurmukhi)
frame('04 Poem reader (mobile, Gurmukhi)', 390, 1300, (w) => {
  let y = header(w, { mobile: true, script: 'gm' });
  text(16, y + 24, 'Poems / Bulleh Shah', { size: 12, color: MUTED });
  tag(16, y + 50, 'ਕਾਫ਼ੀ', { accent: true });
  rect(16, y + 86, 260, 36, { stroke: FAINT, fill: WASH, fillStyle: 'hachure' });
  text(26, y + 94, 'poem title (Gurmukhi)', { size: 14, color: MUTED });
  text(16, y + 136, 'by Bulleh Shah', { size: 15 });
  let bx = 16;
  ['A−', 'A+', 'Copy', 'Print', 'Share'].forEach((b) => (bx += button(bx, y + 168, b, { h: 32, size: 13, w: b.length < 3 ? 40 : 62 }) + 6));
  let vy = y + 236;
  for (let i = 1; i <= 4; i++) {
    text(16, vy, String(i), { size: 13, color: MUTED });
    squiggles(40, vy + 10, w - 56, 2, { color: INK, sw: 3, gap: 30 });
    vy += 84;
  }
  rect(16, vy, w - 32, 70, { stroke: OCHRE, fill: OCHRE_FILL, round: true });
  text(28, vy + 10, 'Gurmukhi is a machine draft,\nnot yet reviewed.', { size: 13 });
  vy += 96;
  text(16, vy, 'Source', { size: 16 });
  squiggles(16, vy + 34, w - 32, 2, { color: MUTED });
  text(16, vy + 70, 'Verification', { size: 16 });
  squiggles(16, vy + 104, w - 32, 1, { color: MUTED });
  rect(16, vy + 130, w - 32, 140, { stroke: FAINT, round: true });
  text(30, vy + 144, 'About the poet', { size: 16 });
  portrait(30, vy + 176, 70, 80);
  squiggles(116, vy + 190, w - 150, 3);
  note(200, y + 40, 'no horizontal scroll\nat 360 px', null);
  footer(w, vy + 300, { mobile: true });
});

// 5. Poet page
frame('05 Poet page (desktop)', 1000, 1260, (w) => {
  let y = header(w, { active: 0 });
  portrait(40, y + 40, 260, 320);
  text(40, y + 368, 'Imagined likeness, no authentic portrait survives.\nSource of image: …', { size: 12, color: MUTED });
  const x = 340;
  tag(x, y + 44, 'classical', { accent: true }); tag(x + 92, y + 44, 'sufi'); tag(x + 150, y + 44, 'kafi');
  text(x, y + 82, 'بلھے شاہ', { size: 40 });
  text(x, y + 158, 'Bulleh Shah', { size: 30 });
  text(x, y + 200, 'born – died  ·  region', { size: 15, color: MUTED });
  squiggles(x, y + 244, 600, 6);
  text(x, y + 340, 'Poems (8)', { size: 22 });
  for (let i = 0; i < 4; i++) {
    line(x, y + 380 + i * 46, [[0, 0], [620, 0]], { stroke: FAINT, roughness: 0 });
    tag(x, y + 392 + i * 46, ['KAFI', 'KAFI', 'DOHRA', 'SIHARFI'][i], { accent: true });
    squiggles(x + 340, y + 404 + i * 46, 280, 1, { rtl: true, color: MUTED });
  }
  text(x, y + 590, 'Bibliography', { size: 22 });
  squiggles(x, y + 630, 560, 3, { color: MUTED, gap: 24 });
  rect(x, y + 720, 620, 64, { stroke: FAINT, fill: WASH, round: true });
  text(x + 16, y + 732, 'In-copyright poets (e.g. Amrita Pritam): biography and\nbibliography only, no full poems.', { size: 13, color: MUTED });
  footer(w, y + 830);
});

// 6. Proverbs
frame('06 Proverbs (desktop)', 1000, 1120, (w) => {
  let y = header(w, { active: 3 });
  const cx = 200, cw = 600;
  text(cx, y + 36, 'Proverbs', { size: 36 });
  text(cx, y + 88, '150 proverbs', { size: 15, color: MUTED });
  rect(cx, y + 120, cw, 40, { stroke: FAINT, round: true });
  text(cx + 12, y + 130, 'Search proverbs (any script or English)…', { size: 14, color: MUTED });
  let vy = y + 196;
  for (let i = 1; i <= 5; i++) {
    line(cx, vy, [[0, 0], [cw, 0]], { stroke: FAINT, roughness: 0 });
    text(cx + cw + 16, vy + 18, String(i), { size: 14, color: MUTED });
    squiggles(cx + cw - 420, vy + 32, 420, 1, { rtl: true, color: INK, sw: 3 });
    text(cx, vy + 56, 'Literally: …', { size: 13, color: MUTED, italic: true });
    text(cx, vy + 78, 'Meaning: …', { size: 14 });
    vy += 118;
  }
  note(cx + cw + 50, y + 236, 'each row links to\n/proverbs/{slug}\n(own page: text, literal,\nmeaning, usage note, source)', null);
  footer(w, vy + 30);
});

// 7. Dictionary index
frame('07 Dictionary (desktop)', 1000, 1000, (w) => {
  let y = header(w, { active: 2 });
  const cx = 160, cw = 680;
  text(cx, y + 36, 'Dictionary', { size: 36 });
  text(cx, y + 86, 'Backbone: Bhai Maya Singh, The Panjabi Dictionary (1895)', { size: 14, color: MUTED });
  rect(cx, y + 120, cw, 46, { stroke: INK, round: true, sw: 2 });
  text(cx + 14, y + 132, 'Search a word in Shahmukhi, Gurmukhi, Roman or English…', { size: 15, color: MUTED });
  text(cx, y + 196, 'Browse by letter', { size: 20 });
  const letters = 'ا ب پ ت ٹ ث ج چ ح خ د ڈ ذ ر ڑ ز ژ س ش ص ض ط ظ ع غ ف ق ک گ ل م ن ݨ و ہ ی ے'.split(' ');
  letters.forEach((l, i) => {
    const lx = cx + cw - 46 - (i % 14) * 48, ly = y + 236 + Math.floor(i / 14) * 54;
    rect(lx, ly, 42, 44, { stroke: FAINT, round: true });
    text(lx + 21, ly + 2, l, { size: 20, align: 'center' });
  });
  note(cx - 140, y + 250, '/dictionary/\nletter/{x}\n(alphabet of the\nactive script)', cx + 30, y + 260);
  text(cx, y + 420, 'Common words', { size: 20 });
  for (let i = 0; i < 10; i++) {
    const tx = cx + (i % 5) * 136, ty = y + 460 + Math.floor(i / 5) * 44;
    rect(tx, ty, 124, 34, { stroke: FAINT, round: true });
    squiggles(tx + 20, ty + 17, 84, 1, { color: MUTED });
  }
  footer(w, y + 590);
});

// 8. Dictionary entry
frame('08 Dictionary entry (desktop)', 1000, 1500, (w) => {
  let y = header(w, { active: 2 });
  const cx = 200, cw = 600;
  text(cx, y + 30, 'Dictionary  /  letter', { size: 13, color: MUTED });
  rect(cx + cw - 220, y + 58, 220, 60, { stroke: FAINT, fill: WASH, fillStyle: 'hachure' });
  text(cx + cw - 110, y + 76, 'headword (active script)', { size: 13, color: MUTED, align: 'center' });
  text(cx, y + 130, 'other scripts:  Gurmukhi · Roman', { size: 14, color: MUTED });
  text(cx, y + 158, 'roman  ·  /IPA/  ·  noun, masculine', { size: 15 });
  let tx = cx;
  ['Majhi', 'Doabi'].forEach((d) => (tx += tag(tx, y + 190, d) + 8));
  text(cx, y + 240, 'Senses', { size: 20 });
  for (let i = 1; i <= 3; i++) {
    text(cx, y + 248 + i * 30, `${i}.`, { size: 15 });
    squiggles(cx + 26, y + 260 + i * 30, 400 - i * 40, 1, { color: MUTED });
  }
  text(cx, y + 380, 'Forms', { size: 20 });
  ['plural', 'feminine', 'oblique'].forEach((f, i) => {
    text(cx, y + 418 + i * 32, f, { size: 14, color: MUTED });
    squiggles(cx + 120, y + 428 + i * 32, 160, 1, { color: INK });
  });
  text(cx, y + 530, 'Phrases', { size: 20 });
  squiggles(cx, y + 570, cw, 2, { color: MUTED, gap: 26 });
  text(cx, y + 630, 'Examples', { size: 20 });
  squiggles(cx + cw - 400, y + 672, 400, 1, { rtl: true, color: INK, sw: 2 });
  text(cx, y + 690, 'English rendering…', { size: 13, color: MUTED, italic: true });
  text(cx, y + 740, 'Translations', { size: 20 });
  text(cx, y + 776, 'Urdu  ·  …', { size: 14 });
  text(cx, y + 800, 'Hindi ·  …', { size: 14 });
  text(cx, y + 824, 'English · …', { size: 14 });
  rect(cx, y + 870, cw, 140, { stroke: OCHRE, round: true });
  text(cx + 16, y + 884, 'Appears in poems', { size: 18 });
  for (let i = 0; i < 2; i++) {
    tag(cx + 16, y + 924 + i * 38, 'KAFI', { accent: true });
    squiggles(cx + cw - 300, y + 936 + i * 38, 280, 1, { rtl: true, color: MUTED });
  }
  note(cx + cw + 24, y + 900, 'two-way link:\npoem glossary and\ndictionary entry', cx + cw + 4, y + 920);
  text(cx, y + 1036, 'Source: Maya Singh, The Panjabi Dictionary (1895), p. 00', { size: 13, color: MUTED });
  footer(w, y + 1090);
});

// 9. Form page
frame('09 Form page: Kafi (desktop)', 1000, 1000, (w) => {
  let y = header(w, { active: 4 });
  const cx = 200, cw = 600;
  text(cx, y + 30, 'Forms', { size: 13, color: MUTED });
  text(cx, y + 56, 'Kafi', { size: 40 });
  text(cx, y + 106, 'کافی', { size: 22 });
  text(cx + 70, y + 116, '·   ਕਾਫ਼ੀ', { size: 20 });
  text(cx + 170, y + 116, '·   Kāfī', { size: 20 });
  squiggles(cx, y + 186, cw, 4);
  text(cx, y + 260, 'History and structure', { size: 22 });
  squiggles(cx, y + 300, cw, 6, { color: MUTED });
  text(cx, y + 410, 'Poems in this form', { size: 22 });
  for (let i = 0; i < 3; i++) {
    line(cx, y + 450 + i * 44, [[0, 0], [cw, 0]], { stroke: FAINT, roughness: 0 });
    text(cx, y + 462 + i * 44, ['Bulleh Shah', 'Shah Hussain', 'Sultan Bahu'][i], { size: 14, color: MUTED });
    squiggles(cx + cw - 300, y + 474 + i * 44, 300, 1, { rtl: true, color: MUTED });
  }
  text(cx, y + 600, 'Other forms:  Doha · Bait · Siharfi · Baran Maah · Qissa · Boli · Dohra', { size: 14 });
  footer(w, y + 660);
});

// 10. About / contribute
frame('10 About + Contribute (desktop)', 1000, 1500, (w) => {
  let y = header(w, { active: 5 });
  const cx = 200, cw = 600;
  text(cx, y + 36, 'About', { size: 36 });
  text(cx, y + 96, 'Mission', { size: 22 });
  squiggles(cx, y + 134, cw, 4);
  text(cx, y + 206, 'Sources policy', { size: 22 });
  squiggles(cx, y + 244, cw, 3);
  text(cx, y + 302, 'FAQ', { size: 22 });
  for (let i = 0; i < 4; i++) {
    rect(cx, y + 340 + i * 50, cw, 42, { stroke: FAINT, round: true });
    text(cx + 14, y + 351 + i * 50, '▸  question…', { size: 15 });
  }
  text(cx, y + 560, 'Contribute', { size: 28 });
  text(cx, y + 600, 'Corrections, scans of printed sources, translations.', { size: 14, color: MUTED });
  text(cx, y + 640, 'Message', { size: 15 });
  rect(cx, y + 664, cw, 130, { stroke: INK, round: true });
  text(cx, y + 812, 'Contact (email or phone)', { size: 15 });
  rect(cx, y + 836, cw, 40, { stroke: INK, round: true });
  text(cx, y + 894, 'Website (optional)', { size: 15 });
  rect(cx, y + 918, cw, 40, { stroke: INK, round: true });
  text(cx, y + 976, 'Photo (optional, up to 3.5 MB)', { size: 15 });
  rect(cx, y + 1000, cw, 56, { stroke: FAINT, dashed: true, round: true });
  text(cx + cw / 2, y + 1016, 'Choose file…', { size: 14, color: MUTED, align: 'center' });
  button(cx, y + 1082, 'Send', { primary: true, w: 120, h: 42 });
  note(cx + cw + 30, y + 680, 'POST → Cloudflare Pages\nFunction (Formspree\nfallback); no accounts', cx + cw + 4, y + 700);
  footer(w, y + 1160);
});

/* ---------------- write .excalidraw ---------------- */
const scene = {
  type: 'excalidraw', version: 2, source: 'https://excalidraw.com',
  elements: els.map(({ _bold, _italic, ...e }) => e),
  appState: { viewBackgroundColor: '#ffffff', gridSize: null }, files: {},
};
writeFileSync(`${OUT}/punjabi-net-wireframes.excalidraw`, JSON.stringify(scene, null, 1));

/* ---------------- render PNG per frame ---------------- */
const gen = rough.generator();
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
function roundedPath(x, y, w, h, r = 8) {
  return `M${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} L${x + r},${y + h} Q${x},${y + h} ${x},${y + h - r} L${x},${y + r} Q${x},${y} ${x + r},${y} Z`;
}
function toSvg(f) {
  const parts = [];
  for (const e of els) {
    if (e.frameId !== f.id) continue;
    const x = e.x - f.x, y = e.y - f.y;
    const opts = { seed: e.seed % 2 ** 31, roughness: e.roughness, stroke: e.strokeColor, strokeWidth: e.strokeWidth,
      fill: e.backgroundColor === 'transparent' ? undefined : e.backgroundColor,
      fillStyle: e.fillStyle === 'hachure' ? 'hachure' : 'solid', hachureGap: 8, fillWeight: 0.6,
      strokeLineDash: e.strokeStyle === 'dashed' ? [8, 6] : undefined };
    let d = null;
    if (e.type === 'rectangle') d = e.roundness ? gen.path(roundedPath(x, y, e.width, e.height), opts) : gen.rectangle(x, y, e.width, e.height, opts);
    else if (e.type === 'ellipse') d = gen.ellipse(x + e.width / 2, y + e.height / 2, e.width, e.height, opts);
    else if (e.type === 'line' || e.type === 'arrow') {
      const pts = e.points.map(([px, py]) => [x + px, y + py]);
      d = gen.linearPath(pts, opts);
      if (e.type === 'arrow') {
        const [a, b] = pts.slice(-2); const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
        for (const s of [-1, 1]) parts.push(...gen.toPaths(gen.line(b[0], b[1], b[0] - 10 * Math.cos(ang + s * 0.45), b[1] - 10 * Math.sin(ang + s * 0.45), opts)).map(pathEl));
      }
    } else if (e.type === 'text') {
      const anchor = e.textAlign === 'center' ? 'middle' : e.textAlign === 'right' ? 'end' : 'start';
      const ax = e.textAlign === 'center' ? x + e.width / 2 : e.textAlign === 'right' ? x + e.width : x;
      const fam = hasArabic(e.text) ? "'Noto Naskh Arabic', 'Virgil'" : hasGurmukhi(e.text) ? "'Noto Serif Gurmukhi', 'Virgil'" : "'Virgil', 'Noto Naskh Arabic', 'Noto Serif Gurmukhi'";
      e.text.split('\n').forEach((ln, i) => {
        const by = y + e.fontSize * (hasArabic(e.text) ? 1.35 : 0.95) + i * e.fontSize * e.lineHeight;
        parts.push(`<text x="${ax}" y="${by}" font-family="${fam}" font-size="${e.fontSize}" fill="${e.strokeColor}" text-anchor="${anchor}"${e._bold ? ' font-weight="700"' : ''}${e._italic ? ' font-style="italic"' : ''}>${esc(ln)}</text>`);
      });
      continue;
    }
    if (d) parts.push(...gen.toPaths(d).map(pathEl));
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f.w}" height="${f.h}" viewBox="0 0 ${f.w} ${f.h}"><rect width="100%" height="100%" fill="#ffffff"/>${parts.join('')}</svg>`;
}
function pathEl(p) {
  return `<path d="${p.d}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" fill="${p.fill ?? 'none'}" stroke-linecap="round" stroke-linejoin="round"/>`;
}
const FONTS = ['/home/azureuser/.local/tools/fonts/Virgil.ttf', '/home/azureuser/.local/tools/fonts/Naskh.ttf', '/home/azureuser/.local/tools/fonts/Gurmukhi.ttf'];
for (const f of frameList) {
  const svg = toSvg(f);
  const png = new Resvg(svg, { font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: 'Virgil' }, fitTo: { mode: 'width', value: f.w < 500 ? 780 : 1500 } }).render().asPng();
  const slug = f.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');
  writeFileSync(`${OUT}/${slug}.png`, png);
  console.log(`${slug}.png`);
}
console.log(`${els.length} elements, ${frameList.length} frames`);
