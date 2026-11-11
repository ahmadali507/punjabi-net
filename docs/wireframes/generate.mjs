/**
 * Usage: node docs/wireframes/generate.mjs docs/wireframes  (needs roughjs, @resvg/resvg-js and
 * the Virgil, Noto Naskh Arabic and Noto Serif Gurmukhi TTFs; paths below point at ~/.local/tools.)
 * This is a design tool, not part of the site build.
 * Shahmukhi-only design (2026-11-11). Wireframe generator: one source → (a) an .excalidraw scene with one frame per
 * screen, (b) a PNG preview per frame rendered with rough.js + resvg.
 * Poem / proverb / dictionary text is drawn as placeholder squiggles, never invented.
 */
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
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
// Shahmukhi only. Single slim bar: wordmark · links · Contribute · search icon · EN|پنجابی.
const NAV_EN = ['Poets', 'Poems', 'Dictionary', 'Proverbs', 'Forms'];
const NAV_PA = ['شاعر', 'کلام', 'لغت', 'اکھان', 'صنفاں'];

function searchIcon(x, y, o = {}) {
  if (o.boxed !== false) rect(x, y, 36, 36, { stroke: o.active ? OCHRE : FAINT, fill: o.active ? OCHRE_FILL : 'transparent', round: true });
  ellipse(x + 9, y + 8, 14, 14, { stroke: INK, sw: 1.5 });
  line(x + 21, y + 21, [[0, 0], [7, 7]], { stroke: INK, sw: 1.5 });
}
function menuIcon(x, y, open = false) {
  rect(x, y, 36, 36, { stroke: open ? OCHRE : FAINT, fill: open ? OCHRE_FILL : 'transparent', round: true });
  if (open) {
    line(x + 10, y + 10, [[0, 0], [16, 16]], { sw: 1.5 });
    line(x + 10, y + 26, [[0, 0], [16, -16]], { sw: 1.5 });
  } else for (let i = 0; i < 3; i++) line(x + 9, y + 11 + i * 7, [[0, 0], [18, 0]], { sw: 1.5 });
}
/** Segmented EN | پنجابی toggle. */
function langToggle(x, y, pa) {
  rect(x, y, 112, 34, { stroke: FAINT, round: true });
  rect(pa ? x + 46 : x + 3, y + 3, pa ? 63 : 41, 28, { stroke: OCHRE, fill: OCHRE_FILL, round: true });
  text(x + 24, y + 8, 'EN', { size: 14, align: 'center' });
  text(x + 78, y - 1, 'پنجابی', { size: 16, align: 'center' });
}

function header(w, o = {}) {
  const pa = o.pa;
  if (o.mobile) {
    if (pa) {
      text(w - 16, 18, 'punjabi.net', { size: 20, bold: true, align: 'right' });
      menuIcon(16, 14, o.menu);
      searchIcon(60, 14);
    } else {
      text(16, 18, 'punjabi.net', { size: 20, bold: true });
      searchIcon(w - 96, 14, { active: o.search });
      menuIcon(w - 52, 14, o.menu);
    }
    line(0, 64, [[0, 0], [w, 0]], { stroke: FAINT, roughness: 0 });
    return 64;
  }
  if (o.search) {
    // Search expanded: the field takes the links' place; Esc or × closes it.
    text(40, 20, 'punjabi.net', { size: 22, bold: true });
    rect(200, 14, w - 420, 38, { stroke: INK, round: true, sw: 1.5 });
    searchIcon(206, 15, { boxed: false });
    text(244, 23, o.query ?? 'Search poems, poets, words, proverbs…', { size: 14, color: o.query ? INK : MUTED });
    text(w - 236, 20, '×', { size: 20 });
    langToggle(w - 152, 16, pa);
    line(0, 66, [[0, 0], [w, 0]], { stroke: FAINT, roughness: 0 });
    return 66;
  }
  if (pa) {
    // RTL: everything mirrors.
    text(w - 40, 20, 'punjabi.net', { size: 22, bold: true, align: 'right' });
    let nx = w - 200;
    NAV_PA.forEach((n, i) => {
      const tw = n.length * 9;
      text(nx, 12, n, { size: 18, align: 'right' });
      if (o.active === i) line(nx - tw, 52, [[0, 0], [tw, 0]], { stroke: OCHRE, sw: 3, roughness: 0.5 });
      nx -= tw + 34;
    });
    langToggle(40, 16, true);
    searchIcon(164, 15);
    button(212, 15, 'حصہ پاؤ', { h: 36, w: 86, size: 16 });
  } else {
    text(40, 20, 'punjabi.net', { size: 22, bold: true });
    let nx = 200;
    NAV_EN.forEach((n, i) => {
      text(nx, 22, n, { size: 16 });
      if (o.active === i) line(nx, 50, [[0, 0], [n.length * 8.6, 0]], { stroke: OCHRE, sw: 3, roughness: 0.5 });
      nx += n.length * 9 + 30;
    });
    button(w - 300, 15, 'Contribute', { h: 36, w: 104, size: 14 });
    searchIcon(w - 188, 15);
    langToggle(w - 152, 16, false);
  }
  line(0, 66, [[0, 0], [w, 0]], { stroke: FAINT, roughness: 0 });
  return 66;
}

function footer(w, y, o = {}) {
  line(0, y, [[0, 0], [w, 0]], { stroke: FAINT, roughness: 0 });
  const pad = o.mobile ? 16 : 40;
  if (o.couplet) {
    text(w / 2, y + 18, o.pa ? 'آخری شعر (کسے جانچے کلام توں)' : 'closing couplet (from a verified poem)', { size: 12, color: MUTED, align: 'center' });
    squiggles(w / 2 - 160, y + 50, 320, 2, { center: true, color: MUTED, gap: 22 });
    text(w / 2, y + 96, '— poet', { size: 14, color: MUTED, align: 'center' });
    line(pad, y + 126, [[0, 0], [w - 2 * pad, 0]], { stroke: FAINT, roughness: 0 });
    y += 126;
  }
  if (o.pa) {
    text(w - pad, y + 14, 'پنجابی شاعری، شاعراں، اکھاناں تے لفظاں دی سانبھ', { size: 16, align: 'right' });
    text(w - pad, y + 52, 'ساڈے بارے     حصہ پاؤ     صنفاں     انسٹاگرام', { size: 15, align: 'right' });
    text(pad, y + 92, '© punjabi.net', { size: 12, color: MUTED });
    return y + 120;
  }
  text(pad, y + 22, 'An archive of Punjabi poetry, poets, proverbs and words', { size: o.mobile ? 13 : 15 });
  text(pad, y + 52, 'About    Contribute    Forms    Instagram', { size: 14 });
  text(pad, y + 80, o.mobile ? 'Non-commercial. No ads, no tracking.\nEvery text records its printed source.' : 'Non-commercial. No ads, no tracking. Every text records its printed source.', { size: 12, color: MUTED });
  return y + 120;
}

/** A list row for a poem: Shahmukhi title (right), poet + form (left). */
function poemRow(x, y, w, o = {}) {
  line(x, y, [[0, 0], [w, 0]], { stroke: FAINT, roughness: 0 });
  tag(x, y + 16, o.form ?? 'KAFI', { accent: true });
  text(x + 90, y + 18, o.poet ?? 'poet', { size: 14, color: MUTED });
  if (o.pending) tag(x + 200, y + 16, 'Text pending');
  squiggles(x + w - (o.tw ?? 300), y + 30, o.tw ?? 300, 1, { rtl: true, color: INK, sw: 2.5 });
}
const SM_ALPHABET = 'ا ب پ ت ٹ ث ج چ ح خ د ڈ ذ ر ڑ ز ژ س ش ص ض ط ظ ع غ ف ق ک گ ل م ن ݨ و ہ ی ے'.split(' ');

/* ================= SCREENS ================= */

// 0. Navbar states
frame('00 Navbar states', 1000, 700, (w) => {
  text(40, 20, 'Navbar: one slim bar (64 px). Shahmukhi only, no script switch.', { size: 18 });
  const strip = (y, label, o) => {
    text(40, y, label, { size: 14, color: NOTE });
    const save = FRAME.y; FRAME.y = save + y + 24;
    rect(0, 0, w, 66, { stroke: FAINT, roughness: 0 });
    header(w, o);
    FRAME.y = save;
  };
  strip(60, 'A. Default (English UI) — active page underlined in ochre', { active: 1 });
  strip(180, 'B. Search open — field replaces the links, results page on Enter (Pagefind)', { search: true });
  strip(300, 'C. Punjabi UI (/pa) — whole bar mirrors right-to-left', { pa: true, active: 1 });
  text(40, 420, 'D. Mobile (360 px) — closed, and menu open', { size: 14, color: NOTE });
  const save = FRAME.y;
  FRAME.y = save + 444;
  rect(0, 0, 360, 66, { stroke: FAINT, roughness: 0 });
  header(360, { mobile: true });
  FRAME.y = save;
  FRAME.y = save + 444;
  const mx = 420;
  FRAME.x += mx;
  rect(0, 0, 360, 230, { stroke: FAINT, roughness: 0, fill: PAPER });
  header(360, { mobile: true, menu: true });
  ['Poets', 'Poems', 'Dictionary', 'Proverbs', 'Forms', 'Contribute'].forEach((n, i) => text(16 + (i % 2) * 170, 78 + Math.floor(i / 2) * 30, n, { size: 15 }));
  langToggle(16, 180, false);
  FRAME.x -= mx;
  FRAME.y = save;
  note(820, 470, 'menu is a <details>\nelement: works\nwithout JavaScript', 784, 520);
});

// 1. Home
frame('01 Home (desktop)', 1000, 1360, (w) => {
  let y = header(w);
  text(w / 2, y + 60, 'پنجابی شاعری، اوہناں ای لفظاں وچ جنہاں وچ لکھی گئی۔', { size: 30, align: 'center' });
  text(w / 2, y + 128, 'Punjabi poetry, kept in the words it was written in.', { size: 18, align: 'center', color: MUTED, italic: true });
  squiggles(w / 2 - 230, y + 176, 460, 3, { center: true });
  button(w / 2 - 170, y + 232, 'Explore poems', { primary: true, w: 160, h: 42 });
  button(w / 2 + 10, y + 232, 'Meet the poets', { w: 160, h: 42 });
  note(w - 230, y + 10, 'thesis: Shahmukhi line,\nEnglish beneath', w - 290, y + 60);
  y += 320;
  text(40, y, 'Recommended poets', { size: 24 });
  text(w - 40, y + 6, 'All poets →', { size: 15, align: 'right' });
  const cw = (w - 80 - 3 * 24) / 4;
  [['بلھے شاہ', 'Bulleh Shah'], ['شاہ حسین', 'Shah Hussain'], ['بابا فرید', 'Baba Farid'], ['وارث شاہ', 'Waris Shah']].forEach(([sm, en], i) => {
    const x = 40 + i * (cw + 24);
    portrait(x, y + 46, cw, 150);
    text(x + cw, y + 206, sm, { size: 18, align: 'right' });
    text(x, y + 246, en, { size: 16 });
    text(x, y + 268, 'born – died', { size: 13, color: MUTED });
  });
  y += 320;
  text(40, y, 'Selected poems', { size: 24 });
  text(w - 40, y + 6, 'All poems →', { size: 15, align: 'right' });
  ['KAFI', 'DOHRA', 'BAIT', 'SIHARFI'].forEach((f, i) => poemRow(40, y + 50 + i * 62, w - 80, { form: f, poet: ['Bulleh Shah', 'Baba Farid', 'Sultan Bahu', 'Hashim Shah'][i], tw: 380 }));
  text(40, y + 310, 'Proverb of the day', { size: 20 });
  squiggles(w - 480, y + 350, 440, 1, { rtl: true, color: INK, sw: 3 });
  text(40, y + 340, 'meaning in English…', { size: 14, color: MUTED });
  footer(w, y + 400, { couplet: true });
});

// 2. Home (mobile)
frame('02 Home (mobile)', 390, 1240, (w) => {
  let y = header(w, { mobile: true });
  text(w / 2, y + 40, 'پنجابی شاعری، اوہناں ای\nلفظاں وچ جنہاں وچ لکھی گئی۔', { size: 24, align: 'center' });
  text(w / 2, y + 150, 'Punjabi poetry, kept in the\nwords it was written in.', { size: 15, align: 'center', color: MUTED });
  squiggles(30, y + 210, w - 60, 3, { center: true });
  button(16, y + 268, 'Explore poems', { primary: true, w: w - 32, h: 44 });
  button(16, y + 322, 'Meet the poets', { w: w - 32, h: 44 });
  y += 400;
  text(16, y, 'Recommended poets', { size: 20 });
  [0, 1].forEach((i) => {
    const x = 16 + i * ((w - 44) / 2 + 12), cw = (w - 44) / 2;
    portrait(x, y + 40, cw, 130);
    text(x + cw, y + 178, ['بلھے شاہ', 'شاہ حسین'][i], { size: 16, align: 'right' });
    text(x, y + 214, ['Bulleh Shah', 'Shah Hussain'][i], { size: 14 });
  });
  y += 260;
  text(16, y, 'Selected poems', { size: 20 });
  for (let i = 0; i < 3; i++) poemRow(16, y + 40 + i * 60, w - 32, { tw: 180 });
  footer(w, y + 240, { mobile: true, couplet: true });
});

// 3. Poets index
frame('03 Poets (desktop)', 1000, 1200, (w) => {
  let y = header(w, { active: 0 });
  text(40, y + 36, 'Poets', { size: 36 });
  text(40, y + 88, '13 poets', { size: 15, color: MUTED });
  rect(w - 360, y + 44, 320, 38, { stroke: FAINT, round: true });
  text(w - 348, y + 54, 'Filter by name…', { size: 14, color: MUTED });
  let tx = 40;
  ['All', 'Classical', 'Modern', 'Contemporary'].forEach((t, i) => (tx += button(tx, y + 120, t, { h: 32, size: 14, active: i === 0 }) + 8));
  y += 180;
  const cw = (w - 80 - 3 * 24) / 4;
  const names = [['بابا فرید', 'Baba Farid'], ['شاہ حسین', 'Shah Hussain'], ['سلطان باہو', 'Sultan Bahu'], ['بلھے شاہ', 'Bulleh Shah'],
    ['وارث شاہ', 'Waris Shah'], ['ہاشم شاہ', 'Hashim Shah'], ['میاں محمد بخش', 'Mian Muhammad Bakhsh'], ['بھائی ویر سنگھ', 'Bhai Vir Singh']];
  names.forEach(([sm, en], i) => {
    const x = 40 + (i % 4) * (cw + 24), cy = y + Math.floor(i / 4) * 410;
    if (i % 3 === 0) {
      rect(x, cy, cw, 170, { stroke: FAINT, dashed: true, fill: WASH, round: true });
      text(x + cw / 2, cy + 60, sm.slice(0, 1), { size: 40, align: 'center', color: FAINT });
    } else portrait(x, cy, cw, 170);
    text(x, cy + 176, i % 3 === 0 ? 'No authentic portrait is known.' : 'Imagined likeness · source', { size: 11, color: MUTED });
    tag(x, cy + 210, i < 7 ? 'classical' : 'modern', { accent: true });
    tag(x + 92, cy + 210, 'sufi');
    text(x + cw, cy + 242, sm, { size: 20, align: 'right' });
    text(x, cy + 290, en, { size: 16 });
    text(x, cy + 312, 'born – died', { size: 13, color: MUTED });
    squiggles(x, cy + 342, cw, 2);
  });
  note(40, y + 372, 'no portrait → letter tile + honest caption', 60, y + 180);
  footer(w, y + 840);
});

// 4. Poet page
frame('04 Poet page (desktop)', 1000, 1300, (w) => {
  let y = header(w, { active: 0 });
  portrait(40, y + 40, 220, 280);
  text(40, y + 328, 'Imagined likeness, not a portrait\nfrom life. Source: …', { size: 12, color: MUTED });
  const x = 300;
  tag(x, y + 44, 'classical', { accent: true }); tag(x + 92, y + 44, 'sufi'); tag(x + 150, y + 44, 'kafi');
  text(x, y + 82, 'Bulleh Shah', { size: 36 });
  text(x + 300, y + 76, 'بلھے شاہ', { size: 30 });
  text(x, y + 140, 'c. 1680 – 1757  ·  Kasur, Punjab', { size: 15, color: MUTED });
  text(x, y + 176, 'One-line bio, larger than body text.', { size: 17 });
  squiggles(x, y + 230, 640, 7);
  text(x, y + 350, 'Poems (8)', { size: 22 });
  ['KAFI', 'KAFI', 'DOHRA', 'SIHARFI'].forEach((f, i) => poemRow(x, y + 390 + i * 54, 660, { form: f, poet: '', pending: i === 1 }));
  text(x, y + 630, 'Works', { size: 22 });
  squiggles(x, y + 670, 560, 3, { color: MUTED, gap: 24 });
  text(x, y + 750, 'Sources for this biography', { size: 18 });
  squiggles(x, y + 786, 480, 1, { color: MUTED });
  rect(x, y + 820, 660, 64, { stroke: OCHRE, fill: OCHRE_FILL, round: true });
  text(x + 16, y + 832, 'In-copyright poets (e.g. Amrita Pritam): this box replaces the\npoem list. Biography and works only, no poems.', { size: 13 });
  footer(w, y + 920);
});

// 5. Poems index
frame('05 Poems (desktop)', 1000, 990, (w) => {
  let y = header(w, { active: 1 });
  text(40, y + 36, 'Poems', { size: 36 });
  text(40, y + 88, '64 poems · 8 poets · 8 forms', { size: 15, color: MUTED });
  let tx = 40;
  ['All', 'Kafi', 'Doha', 'Bait', 'Siharfi', 'Baran Maah', 'Qissa', 'Boli', 'Dohra'].forEach((t, i) => (tx += button(tx, y + 124, t, { h: 32, size: 14, active: i === 0 }) + 8));
  rect(w - 260, y + 44, 220, 38, { stroke: FAINT, round: true });
  text(w - 248, y + 54, 'Poet: all  v', { size: 14 });
  note(w - 250, y + 176, 'filters are links (?form=kafi):\nno JS needed', null);
  y += 230;
  text(40, y, 'Bulleh Shah', { size: 18, color: MUTED });
  for (let i = 0; i < 4; i++) poemRow(40, y + 34 + i * 58, w - 80, { form: ['KAFI', 'KAFI', 'SIHARFI', 'BARAN MAAH'][i], poet: '', pending: i === 2, tw: 420 });
  y += 290;
  text(40, y, 'Baba Farid', { size: 18, color: MUTED });
  for (let i = 0; i < 3; i++) poemRow(40, y + 34 + i * 58, w - 80, { form: 'DOHRA', poet: '', tw: 420 });
  footer(w, y + 240);
});

// 6. Poem reader (desktop)
frame('06 Poem reader (desktop)', 1000, 1740, (w) => {
  let y = header(w, { active: 1 });
  const cx = 230, cw = 540;
  text(w / 2, y + 34, 'KAFI', { size: 13, color: OCHRE, align: 'center' });
  text(w / 2, y + 56, 'poem title', { size: 13, color: MUTED, align: 'center' });
  squiggles(w / 2 - 110, y + 86, 220, 1, { center: true, color: INK, sw: 2 });
  text(w / 2, y + 100, 'English title (italic)', { size: 14, color: MUTED, align: 'center', italic: true });
  text(w / 2, y + 128, 'Bulleh Shah · c. 1680 – 1757', { size: 15, align: 'center' });
  let bx = w / 2 - 150;
  ['A−', 'A+', 'Copy', 'Print', 'Share'].forEach((b) => (bx += button(bx, y + 166, b, { h: 32, size: 14 }) + 8));
  note(w / 2 + 200, y + 166, 'text size remembered;\nno script switch', null);
  let vy = y + 240;
  for (let i = 1; i <= 4; i++) {
    text(w / 2, vy, i === 1 ? '1 · Refrain' : String(i), { size: 12, color: i === 1 ? OCHRE : MUTED, align: 'center' });
    squiggles(cx + 40, vy + 30, cw - 80, 2, { center: true, color: INK, sw: 3.5, gap: 46 });
    text(w / 2, vy + 98, 'optional English translation, under the verse', { size: 13, color: MUTED, align: 'center', italic: true });
    if (i === 1) {
      line(cx + 330, vy + 38, [[0, 0], [60, 0]], { stroke: OCHRE, sw: 2, dashed: true, roughness: 0 });
      rect(cx + 280, vy + 52, 260, 126, { fill: PAPER, stroke: INK, round: true, sw: 2 });
      text(cx + 524, vy + 58, 'لفظ', { size: 20, align: 'right' });
      text(cx + 296, vy + 64, '×', { size: 16 });
      text(cx + 296, vy + 100, 'lafz · /ləfz/ · noun, m.', { size: 13, color: MUTED });
      squiggles(cx + 296, vy + 132, 210, 1, { color: MUTED });
      text(cx + 296, vy + 150, 'Open in dictionary →', { size: 13, color: OCHRE });
      note(cx + cw + 30, vy + 120, 'word meaning: tap, or\nTab + arrow keys;\nEsc closes', cx + 544, vy + 110);
    }
    vy += i === 1 ? 200 : 140;
  }
  vy += 10;
  line(cx, vy, [[0, 0], [cw, 0]], { stroke: FAINT, roughness: 0 });
  text(cx, vy + 20, 'Source', { size: 15, color: MUTED });
  text(cx + 110, vy + 20, 'Book, ed. Editor (Publisher, Year), p. 00', { size: 14 });
  text(cx, vy + 52, 'Verification', { size: 15, color: MUTED });
  text(cx + 110, vy + 52, 'Checked against the printed edition.', { size: 14 });
  vy += 100;
  rect(cx, vy, cw, 130, { stroke: FAINT, round: true });
  text(cx + 20, vy + 16, 'ABOUT THE POET', { size: 13, color: OCHRE });
  text(cx + cw - 20, vy + 36, 'بلھے شاہ', { size: 18, align: 'right' });
  text(cx + 20, vy + 46, 'Bulleh Shah · c. 1680 – 1757', { size: 15 });
  squiggles(cx + 20, vy + 92, cw - 40, 2);
  vy += 160;
  text(cx, vy, 'MORE FROM THIS POET', { size: 13, color: OCHRE });
  for (let i = 0; i < 3; i++) poemRow(cx, vy + 30 + i * 54, cw, { poet: '', tw: 260, pending: i === 2 });
  note(40, y + 300, 'poem text is the\nlargest element;\ncentred couplets', cx + 30, y + 280);
  footer(w, vy + 220);
});

// 7. Poem reader (mobile)
frame('07 Poem reader (mobile)', 390, 1120, (w) => {
  let y = header(w, { mobile: true });
  text(w / 2, y + 24, 'KAFI', { size: 12, color: OCHRE, align: 'center' });
  squiggles(w / 2 - 90, y + 62, 180, 1, { center: true, color: INK, sw: 2 });
  text(w / 2, y + 80, 'Bulleh Shah', { size: 14, align: 'center' });
  let bx = 26;
  ['A−', 'A+', 'Copy', 'Print', 'Share'].forEach((b) => (bx += button(bx, y + 114, b, { h: 32, size: 13, w: b.length < 3 ? 42 : 62 }) + 6));
  let vy = y + 180;
  for (let i = 1; i <= 4; i++) {
    text(w / 2, vy, String(i), { size: 12, color: MUTED, align: 'center' });
    squiggles(30, vy + 28, w - 60, 2, { center: true, color: INK, sw: 3, gap: 40 });
    vy += 120;
  }
  // bottom sheet
  rect(0, 1120 - 330, w, 210, { fill: PAPER, stroke: INK, sw: 2 });
  text(w - 20, 1120 - 316, 'لفظ', { size: 22, align: 'right' });
  button(16, 1120 - 314, '×', { w: 36, h: 36 });
  text(20, 1120 - 262, 'lafz · /ləfz/ · noun, m.', { size: 13, color: MUTED });
  squiggles(20, 1120 - 226, w - 60, 2, { color: MUTED, gap: 22 });
  text(20, 1120 - 172, 'Open in dictionary →', { size: 13, color: OCHRE });
  note(20, 1120 - 380, 'on phones the meaning\nopens as a bottom sheet', null);
  footer(w, 1120 - 120, { mobile: true });
});

// 8. Forms index
frame('08 Forms (desktop)', 1000, 1000, (w) => {
  let y = header(w, { active: 4 });
  text(40, y + 36, 'Forms', { size: 36 });
  text(40, y + 88, 'The shapes Punjabi poetry is written in.', { size: 15, color: MUTED });
  y += 140;
  const cw = (w - 80 - 3 * 24) / 4;
  [['کافی', 'Kafi'], ['دوہا', 'Doha'], ['بیت', 'Bait'], ['سی حرفی', 'Siharfi'], ['بارہ ماہ', 'Baran Maah'], ['قصہ', 'Qissa'], ['بولی', 'Boli'], ['دوہڑا', 'Dohra']].forEach(([sm, en], i) => {
    const x = 40 + (i % 4) * (cw + 24), cy = y + Math.floor(i / 4) * 250;
    rect(x, cy, cw, 220, { stroke: FAINT, round: true });
    text(x + cw - 16, cy + 8, sm, { size: 26, align: 'right' });
    text(x + 16, cy + 74, en, { size: 18 });
    squiggles(x + 16, cy + 120, cw - 32, 3, { gap: 16 });
    text(x + 16, cy + 186, `${[12, 6, 5, 3, 2, 4, 0, 6][i]} poems`, { size: 13, color: MUTED });
  });
  footer(w, y + 540);
});

// 9. Form page
frame('09 Form page: Kafi (desktop)', 1000, 1060, (w) => {
  let y = header(w, { active: 4 });
  const cx = 200, cw = 600;
  text(cx, y + 30, 'Forms /', { size: 13, color: MUTED });
  text(cx, y + 56, 'Kafi', { size: 40 });
  text(cx + cw, y + 50, 'کافی', { size: 34, align: 'right' });
  squiggles(cx, y + 140, cw, 3);
  text(cx, y + 210, 'History and structure', { size: 22 });
  squiggles(cx, y + 250, cw, 6, { color: MUTED });
  text(cx, y + 360, 'Poems in this form', { size: 22 });
  for (let i = 0; i < 3; i++) poemRow(cx, y + 400 + i * 54, cw, { poet: ['Bulleh Shah', 'Shah Hussain', 'Sultan Bahu'][i] });
  text(cx, y + 590, 'Other forms:  Doha · Bait · Siharfi · Baran Maah · Qissa · Boli · Dohra', { size: 14 });
  footer(w, y + 660);
});

// 10. Proverbs
frame('10 Proverbs (desktop)', 1000, 1140, (w) => {
  let y = header(w, { active: 3 });
  const cx = 200, cw = 600;
  text(cx, y + 36, 'Proverbs', { size: 36 });
  text(cx, y + 88, '150 proverbs', { size: 15, color: MUTED });
  rect(cx, y + 120, cw, 40, { stroke: FAINT, round: true });
  text(cx + 12, y + 130, 'Search proverbs, in Shahmukhi or English…', { size: 14, color: MUTED });
  let vy = y + 196;
  for (let i = 1; i <= 5; i++) {
    line(cx, vy, [[0, 0], [cw, 0]], { stroke: FAINT, roughness: 0 });
    text(cx + cw + 16, vy + 18, String(i), { size: 14, color: MUTED });
    squiggles(cx + cw - 420, vy + 32, 420, 1, { rtl: true, color: INK, sw: 3 });
    text(cx, vy + 56, 'Literally: …', { size: 13, color: MUTED, italic: true });
    text(cx, vy + 78, 'Meaning: …', { size: 14 });
    vy += 118;
  }
  note(cx + cw + 50, y + 236, 'each row opens\n/proverbs/{slug}', null);
  footer(w, vy + 30);
});

// 11. Proverb page
frame('11 Proverb page (desktop)', 1000, 860, (w) => {
  let y = header(w, { active: 3 });
  const cx = 200, cw = 600;
  text(cx, y + 30, 'Proverbs / 12 of 150', { size: 13, color: MUTED });
  squiggles(cx + 60, y + 110, cw - 120, 1, { center: true, color: INK, sw: 4 });
  let bx = w / 2 - 70;
  ['Copy', 'Share'].forEach((b) => (bx += button(bx, y + 150, b, { h: 32, size: 14 }) + 8));
  text(cx, y + 220, 'Literally', { size: 15, color: MUTED });
  squiggles(cx + 120, y + 230, 380, 1, { color: MUTED });
  text(cx, y + 260, 'Meaning', { size: 15, color: MUTED });
  squiggles(cx + 120, y + 270, 440, 2, { color: INK, gap: 22 });
  text(cx, y + 330, 'Usage', { size: 15, color: MUTED });
  squiggles(cx + 120, y + 340, 420, 2, { color: MUTED, gap: 22 });
  text(cx, y + 400, 'Source', { size: 15, color: MUTED });
  text(cx + 120, y + 400, 'Book (Publisher, Year), p. 00', { size: 14 });
  line(cx, y + 450, [[0, 0], [cw, 0]], { stroke: FAINT, roughness: 0 });
  text(cx, y + 470, '← previous', { size: 14 });
  text(cx + cw, y + 470, 'next →', { size: 14, align: 'right' });
  footer(w, y + 540);
});

// 12. Dictionary home
frame('12 Dictionary (desktop)', 1000, 1000, (w) => {
  let y = header(w, { active: 2 });
  const cx = 160, cw = 680;
  text(cx, y + 36, 'Dictionary', { size: 36 });
  text(cx, y + 86, 'Backbone: Bhai Maya Singh, The Panjabi Dictionary (1895)', { size: 14, color: MUTED });
  rect(cx, y + 120, cw, 46, { stroke: INK, round: true, sw: 2 });
  text(cx + 14, y + 132, 'Search a word in Shahmukhi, romanised, or English…', { size: 15, color: MUTED });
  text(cx, y + 196, 'Browse by letter', { size: 20 });
  SM_ALPHABET.forEach((l, i) => {
    const lx = cx + cw - 46 - (i % 14) * 48, ly = y + 236 + Math.floor(i / 14) * 54;
    rect(lx, ly, 42, 44, { stroke: FAINT, round: true });
    text(lx + 21, ly + 2, l, { size: 20, align: 'center' });
  });
  note(cx - 140, y + 250, 'right-to-left\nletter grid →\n/dictionary/\nletter/{x}', cx + 30, y + 260);
  text(cx, y + 420, 'Common words', { size: 20 });
  for (let i = 0; i < 10; i++) {
    const tx = cx + cw - 124 - (i % 5) * 136, ty = y + 460 + Math.floor(i / 5) * 44;
    rect(tx, ty, 124, 34, { stroke: FAINT, round: true });
    squiggles(tx + 20, ty + 17, 84, 1, { color: INK });
  }
  footer(w, y + 590);
});

// 13. Dictionary letter page
frame('13 Dictionary: letter (desktop)', 1000, 920, (w) => {
  let y = header(w, { active: 2 });
  const cx = 160, cw = 680;
  text(cx, y + 30, 'Dictionary / letter', { size: 13, color: MUTED });
  text(cx + cw, y + 40, 'ب', { size: 64, align: 'right' });
  text(cx, y + 70, '214 words', { size: 15, color: MUTED });
  SM_ALPHABET.slice(0, 16).forEach((l, i) => {
    const lx = cx + cw - 30 - i * 34;
    if (i === 1) rect(lx - 4, y + 160, 30, 34, { stroke: OCHRE, fill: OCHRE_FILL, round: true });
    text(lx + 11, y + 158, l, { size: 17, align: 'center' });
  });
  for (let i = 0; i < 10; i++) {
    const col = i % 2, row = Math.floor(i / 2);
    const x = cx + (1 - col) * (cw / 2 + 10), ry = y + 230 + row * 76;
    line(x, ry, [[0, 0], [cw / 2 - 10, 0]], { stroke: FAINT, roughness: 0 });
    squiggles(x + cw / 2 - 150, ry + 24, 130, 1, { color: INK, sw: 3, rtl: true });
    text(x, ry + 12, 'noun, m.', { size: 12, color: MUTED });
    text(x, ry + 40, 'first sense…', { size: 13 });
  }
  footer(w, y + 640);
});

// 14. Dictionary entry
frame('14 Dictionary entry (desktop)', 1000, 1480, (w) => {
  let y = header(w, { active: 2 });
  const cx = 200, cw = 600;
  text(cx, y + 30, 'Dictionary / ب', { size: 13, color: MUTED });
  rect(cx + cw - 200, y + 58, 200, 64, { stroke: FAINT, fill: WASH, fillStyle: 'hachure' });
  text(cx + cw - 100, y + 78, 'headword', { size: 13, color: MUTED, align: 'center' });
  text(cx, y + 80, 'roman  ·  /IPA/  ·  noun, masculine', { size: 15 });
  let tx = cx;
  ['Majhi', 'Doabi'].forEach((d) => (tx += tag(tx, y + 112, d) + 8));
  note(cx - 170, y + 80, 'romanisation shown\nonly as pronunciation', cx - 10, y + 90);
  text(cx, y + 170, 'Senses', { size: 20 });
  for (let i = 1; i <= 3; i++) {
    text(cx, y + 178 + i * 30, `${i}.`, { size: 15 });
    squiggles(cx + 26, y + 190 + i * 30, 400 - i * 40, 1, { color: MUTED });
  }
  text(cx, y + 310, 'Forms', { size: 20 });
  ['plural', 'feminine', 'oblique'].forEach((f, i) => {
    text(cx, y + 348 + i * 32, f, { size: 14, color: MUTED });
    squiggles(cx + 120, y + 358 + i * 32, 140, 1, { color: INK, rtl: true });
  });
  text(cx, y + 460, 'Phrases', { size: 20 });
  for (let i = 0; i < 2; i++) {
    squiggles(cx + cw - 260, y + 504 + i * 46, 260, 1, { rtl: true, color: INK, sw: 2 });
    text(cx, y + 494 + i * 46, 'English…', { size: 13, color: MUTED });
  }
  text(cx, y + 610, 'Examples', { size: 20 });
  squiggles(cx + cw - 400, y + 652, 400, 1, { rtl: true, color: INK, sw: 2 });
  text(cx, y + 672, 'English rendering… — source', { size: 13, color: MUTED, italic: true });
  text(cx, y + 720, 'Translations', { size: 20 });
  text(cx, y + 756, 'Urdu · …     Hindi · …     English · …', { size: 14 });
  rect(cx, y + 810, cw, 150, { stroke: OCHRE, round: true });
  text(cx + 16, y + 824, 'Appears in poems', { size: 18 });
  for (let i = 0; i < 2; i++) poemRow(cx + 16, y + 862 + i * 44, cw - 32, { tw: 240 });
  note(cx + cw + 24, y + 840, 'two-way link with\nthe poem glossary', cx + cw + 4, y + 860);
  text(cx, y + 990, 'Source: Maya Singh, The Panjabi Dictionary (1895), p. 00', { size: 13, color: MUTED });
  footer(w, y + 1060);
});

// 15. Search results
frame('15 Search results (desktop)', 1000, 850, (w) => {
  let y = header(w, { search: true, query: 'عشق' });
  const cx = 200, cw = 600;
  text(cx, y + 36, 'Results for “عشق”', { size: 28 });
  let tx = cx;
  ['All 23', 'Poems 9', 'Poets 1', 'Words 4', 'Proverbs 9'].forEach((t, i) => (tx += button(tx, y + 96, t, { h: 32, size: 14, active: i === 0 }) + 8));
  let vy = y + 160;
  ['POEM', 'WORD', 'PROVERB', 'POEM'].forEach((k, i) => {
    line(cx, vy, [[0, 0], [cw, 0]], { stroke: FAINT, roughness: 0 });
    tag(cx, vy + 16, k, { accent: k === 'POEM' });
    squiggles(cx + cw - 300, vy + 28, 300, 1, { rtl: true, color: INK, sw: 2.5 });
    squiggles(cx + 60, vy + 62, cw - 60, 1, { rtl: true, color: MUTED });
    rect(cx + 330, vy + 52, 50, 22, { stroke: OCHRE, fill: OCHRE_FILL, round: true });
    vy += 104;
  });
  note(cx + cw + 24, y + 210, 'Pagefind, static\nindex; matched\nword highlighted', cx + 384, y + 222);
  footer(w, vy + 40);
});

// 16. About / contribute
frame('16 About + Contribute (desktop)', 1000, 1500, (w) => {
  let y = header(w);
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

// 17. Punjabi UI home
frame('17 Home, Punjabi UI /pa (desktop)', 1000, 1060, (w) => {
  let y = header(w, { pa: true });
  text(w / 2, y + 60, 'پنجابی شاعری، اوہناں ای لفظاں وچ جنہاں وچ لکھی گئی۔', { size: 30, align: 'center' });
  squiggles(w / 2 - 230, y + 160, 460, 3, { center: true });
  button(w / 2 + 10, y + 220, 'کلام پڑھو', { primary: true, w: 160, h: 44, size: 18 });
  button(w / 2 - 170, y + 220, 'شاعراں نوں ملو', { w: 160, h: 44, size: 18 });
  y += 310;
  text(w - 40, y, 'چونویں شاعر', { size: 24, align: 'right' });
  text(40, y + 6, 'سارے شاعر', { size: 16, color: OCHRE });
  const cw = (w - 80 - 3 * 24) / 4;
  ['بلھے شاہ', 'شاہ حسین', 'بابا فرید', 'وارث شاہ'].forEach((sm, i) => {
    const x = w - 40 - cw - i * (cw + 24);
    portrait(x, y + 50, cw, 150);
    text(x + cw, y + 210, sm, { size: 18, align: 'right' });
  });
  note(40, y + 270, 'everything mirrors right-to-left;\nEnglish only where the content is English', null);
  footer(w, y + 340, { pa: true, couplet: true });
});

// 18. 404
frame('18 Not found (desktop)', 1000, 620, (w) => {
  let y = header(w);
  text(w / 2, y + 80, 'صفحہ نہیں لبھیا', { size: 30, align: 'center' });
  text(w / 2, y + 150, 'Page not found', { size: 22, align: 'center' });
  text(w / 2, y + 186, 'This page does not exist, or has moved.', { size: 15, align: 'center', color: MUTED });
  button(w / 2 - 60, y + 230, 'Home', { primary: true, w: 120, h: 42 });
  footer(w, y + 330);
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
